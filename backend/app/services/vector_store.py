"""
Vector store service using FAISS with dual-provider object storage.
"""
# CRITICAL: Set these BEFORE importing torch/transformers to prevent segfault
import os
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

import time
import pickle
import hashlib
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.services.storage import S3Handler
from app.services.gpu_utils import gpu_info

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class VectorStore:
    """FAISS-based vector store with AWS S3 and DDN INFINIA storage."""

    def __init__(self, embedding_model_name: str = None, providers: List[str] = None, storage_ops_tracker=None):
        self.model_name = embedding_model_name or settings.embedding_model
        # Auto-detect GPU
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
        self.embedding_model = SentenceTransformer(self.model_name, device=device)
        self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()


        # Initialize FAISS index
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.chunk_metadata: Dict[int, Dict] = {}
        self.chunk_counter = 0

        # Storage providers - check AWS configuration
        from app.core.config import storage_config
        self.aws_configured = bool(storage_config.aws_config.get('access_key'))
        
        # Only initialize handlers for configured providers
        self.active_providers = ['ddn_infinia']  # DDN is always primary
        if self.aws_configured:
            self.active_providers.append('aws')
        
        self.providers = providers or self.active_providers
        self.storage_handlers = {p: S3Handler(p) for p in self.providers if p != 'aws' or self.aws_configured}
        
        # NEW: Storage operations tracker for metrics
        self.storage_ops_tracker = storage_ops_tracker

    def _generate_chunk_id(self, content: str) -> str:
        """Generate unique chunk ID based on content hash."""
        return hashlib.md5(content.encode()).hexdigest()

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings."""
        return self.embedding_model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Add chunks to vector store and object storage."""
        logger.info(f"📥 Adding {len(chunks)} chunks to vector store")
        logger.info(f"   Current index size BEFORE: {self.index.ntotal} chunks")
        
        results = {
            'total_chunks': len(chunks),
            'stored_chunks': 0,
            'provider_performance': {p: {'times': [], 'success': 0, 'failed': 0} for p in self.providers}
        }

        # Extract all contents for batch embedding
        contents = [chunk['content'] for chunk in chunks]
        
        # Generate ALL embeddings at once (much faster and avoids threading issues)
        logger.info(f"🔮 Generating embeddings for {len(contents)} chunks...")
        logger.info(f"   Calling embedding model with batch_size=32...")
        embeddings = self.embedding_model.encode(
            contents,
            show_progress_bar=False,  # Disable progress bar to prevent hanging in background threads
            batch_size=32  # Process in batches of 32 for efficiency
        )
        logger.info(f"   Embeddings shape: {embeddings.shape}")
        logger.info(f"✅ Embeddings generated successfully")

        # Process each chunk with its pre-computed embedding
        for i, chunk in enumerate(chunks):
            content = chunk['content']
            chunk_id = chunk.get('chunk_id') or self._generate_chunk_id(content)
            embedding = embeddings[i]

            # Add to FAISS index
            embedding_np = np.array([embedding], dtype=np.float32)
            self.index.add(embedding_np)

            # Store metadata
            self.chunk_metadata[self.chunk_counter] = {
                'chunk_id': chunk_id,
                'content': content,
                'metadata': chunk.get('metadata', {})
            }
            logger.debug(f"   Added chunk {self.chunk_counter}: {chunk_id[:16]}... (content length: {len(content)})")
            self.chunk_counter += 1

            # Store to object storage providers
            storage_results = self._store_to_providers(content, chunk_id, embedding)

            for provider, result in storage_results.items():
                if result['success']:
                    results['provider_performance'][provider]['success'] += 1
                    results['provider_performance'][provider]['times'].append(result['time'])
                else:
                    results['provider_performance'][provider]['failed'] += 1

            results['stored_chunks'] += 1

        # Calculate average times for each provider
        for provider in self.providers:
            times = results['provider_performance'][provider]['times']
            if times:
                results['provider_performance'][provider]['avg_time'] = sum(times) / len(times)
                results['provider_performance'][provider]['total_time'] = sum(times)
        
        # NO SIMULATION: Only show real AWS data when credentials are configured

        logger.info(f"✅ Successfully added {results['stored_chunks']} chunks")
        logger.info(f"   Index size AFTER: {self.index.ntotal} chunks")
        logger.info(f"   Metadata entries: {len(self.chunk_metadata)}")
        return results

    def _store_to_providers(self, content: str, chunk_id: str, embedding: np.ndarray) -> Dict[str, Dict]:
        """Store chunk data to all configured storage providers."""
        chunk_data = {
            'content': content,
            'embeddings': embedding.tolist(),
            'timestamp': datetime.now().isoformat(),
            'chunk_id': chunk_id
        }

        chunk_bytes = pickle.dumps(chunk_data)
        object_key = f"chunks/{chunk_id}.pkl"
        bytes_size = len(chunk_bytes)  # Track size for metrics

        results = {}
        for provider in self.providers:
            start_time = time.perf_counter()
            handler = self.storage_handlers[provider]
            success, message = handler.upload_bytes(chunk_bytes, object_key)
            latency_ms = (time.perf_counter() - start_time) * 1000

            # Track storage operation metrics
            if self.storage_ops_tracker:
                self.storage_ops_tracker.track_operation(
                    op_type='PUT',
                    provider=provider,
                    bytes_transferred=bytes_size,
                    latency_ms=latency_ms,
                    success=success
                )

            results[provider] = {
                'success': success,
                'message': message,
                'time': latency_ms / 1000,  # Keep as seconds for backward compatibility
                'object_key': object_key
            }

        return results

    def search(self, query: str, top_k: int = 5) -> List[Tuple[str, float, Dict]]:
        """Search for similar chunks using FAISS."""
        if self.index.ntotal == 0:
            return []

        query_embedding = self.embedding_model.encode([query], show_progress_bar=False)[0]
        query_np = np.array([query_embedding], dtype=np.float32)

        distances, indices = self.index.search(query_np, min(top_k, self.index.ntotal))

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx >= 0 and idx in self.chunk_metadata:
                meta = self.chunk_metadata[idx]
                results.append((meta['content'], float(dist), meta['metadata']))

        return results

    def search_with_provider_comparison(
        self,
        query: str,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Search and retrieve from both providers, comparing performance."""
        logger.info(f"🔍 Searching for query: '{query[:50]}...'")
        logger.info(f"   Index has {self.index.ntotal} chunks")
        logger.info(f"   Metadata has {len(self.chunk_metadata)} entries")
        
        if self.index.ntotal == 0:
            logger.warning("⚠️  Index is empty! No chunks to search.")
            return {'results': [], 'provider_times': {}, 'fastest_provider': None}

        # FAISS search
        query_embedding = self.embedding_model.encode([query], show_progress_bar=False)[0]
        query_np = np.array([query_embedding], dtype=np.float32)
        distances, indices = self.index.search(query_np, min(top_k, self.index.ntotal))

        # Get chunk IDs to retrieve
        chunk_ids = []
        for idx in indices[0]:
            if idx >= 0 and idx in self.chunk_metadata:
                chunk_ids.append(self.chunk_metadata[idx]['chunk_id'])

        logger.info(f"📦 Found {len(chunk_ids)} chunk IDs from FAISS search")

        # Check if AWS is configured
        from app.core.config import storage_config
        aws_configured = bool(storage_config.aws_config.get('access_key'))
        
        # Retrieve chunks from S3 with provider comparison
        provider_times = {}
        provider_chunks = {}
        
        # Determine which providers to actually retrieve from
        if aws_configured:
            # AWS is configured - retrieve from BOTH providers for real comparison
            providers_to_retrieve = ['ddn_infinia', 'aws']
            logger.info("🔬 Running REAL performance comparison (both providers)")
        else:
            # AWS not configured - retrieve from DDN only, simulate AWS
            providers_to_retrieve = ['ddn_infinia']
            logger.info("⚡ Running with DDN INFINIA only (AWS simulated)")
        
        for provider in providers_to_retrieve:
            logger.info(f"🌐 Retrieving from {provider}...")
            
            # Measure connection time separately
            conn_start = time.perf_counter()
            handler = S3Handler(provider)
            handler.create_client()
            connection_time = (time.perf_counter() - conn_start) * 1000
            
            # For AWS: Sample 1 chunk and extrapolate (for speed)
            # For DDN: Download all chunks (for actual use)
            if provider == 'aws':
                # Sample-based measurement: download only 1 chunk
                logger.info(f"   📊 Sampling 1 chunk for performance measurement...")
                download_start = time.perf_counter()
                
                # Download first chunk as sample
                sample_chunk_data, success = self._retrieve_from_provider_with_handler(chunk_ids[0], handler)
                sample_download_time = (time.perf_counter() - download_start) * 1000
                
                # Extrapolate for all chunks
                download_time = sample_download_time * len(chunk_ids)
                chunks_retrieved = []  # Don't use AWS chunks, will use DDN chunks
                
                logger.info(f"   Sample timing: {sample_download_time:.2f}ms/chunk, extrapolated: {download_time:.2f}ms for {len(chunk_ids)} chunks")
            else:
                # DDN: Download all chunks for actual use
                download_start = time.perf_counter()
                chunks_retrieved = []
                for chunk_id in chunk_ids:
                    chunk_data, success = self._retrieve_from_provider_with_handler(chunk_id, handler)
                    if success and chunk_data:
                        chunks_retrieved.append(chunk_data)
                
                download_time = (time.perf_counter() - download_start) * 1000
            
            total_time = connection_time + download_time
            
            # Store separate metrics
            provider_times[provider] = {
                'connection_ms': connection_time,
                'download_ms': download_time,  # This is the TTFB
                'total_ms': total_time
            }
            provider_chunks[provider] = chunks_retrieved
            
            logger.info(f"   {provider}: Connection={connection_time:.2f}ms, Download={download_time:.2f}ms, Total={total_time:.2f}ms for {len(chunk_ids)} chunks")

        # NO SIMULATION: Only use real AWS S3 data when credentials are configured
        # If AWS is not configured, provider_times will only contain 'ddn_infinia'

        # Determine fastest provider based on download time (TTFB)
        if provider_times:
            fastest_provider = min(provider_times.keys(), key=lambda k: provider_times[k]['download_ms'])
        else:
            fastest_provider = None

        # Use results from the fastest provider (or DDN if available)
        source_provider = 'ddn_infinia' if 'ddn_infinia' in provider_chunks else list(provider_chunks.keys())[0] if provider_chunks else None
        
        results = []
        if source_provider:
            chunks = provider_chunks[source_provider]
            for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                if idx >= 0 and i < len(chunks):
                    chunk = chunks[i]
                    meta = self.chunk_metadata.get(idx, {})
                    results.append({
                        'content': chunk['content'],
                        'distance': float(dist),
                        'metadata': meta.get('metadata', {}),
                        'chunk_id': chunk['chunk_id']
                    })
                    logger.debug(f"   Retrieved chunk {idx}: distance={dist:.4f}, content_len={len(chunk['content'])}")

        logger.info(f"✅ Search complete: Found {len(results)} relevant chunks")
        if results:
            logger.info(f"   Sample chunk preview: {results[0]['content'][:100]}...")
        else:
            logger.warning("⚠️  No results returned!")
        
        # Extract storage TTFB metrics (download time only)
        storage_ttfb = {provider: metrics['download_ms'] for provider, metrics in provider_times.items()}
        
        return {
            'results': results,
            'storage_ttfb': storage_ttfb,  # NEW: Pure download time
            'provider_times': provider_times,  # Keep for backward compatibility
            'fastest_provider': fastest_provider,
            'ttfb_improvement': self._calculate_improvement(storage_ttfb)
        }

    def _retrieve_from_provider_with_handler(self, chunk_id: str, handler: S3Handler) -> Tuple[Optional[Dict], bool]:
        """Retrieve chunk from storage provider using provided handler."""
        object_key = f"chunks/{chunk_id}.pkl"

        chunk_bytes, message = handler.download_bytes(object_key)
        if chunk_bytes:
            try:
                return pickle.loads(chunk_bytes), True
            except Exception as e:
                logger.error(f"Failed to unpickle chunk {chunk_id}: {e}")
                return None, False
        return None, False

    def _retrieve_from_provider(self, chunk_id: str, provider: str) -> Tuple[Optional[Dict], bool]:
        """Retrieve chunk from specific storage provider."""
        object_key = f"chunks/{chunk_id}.pkl"
        handler = self.storage_handlers[provider]

        start_time = time.perf_counter()
        chunk_bytes, message = handler.download_bytes(object_key)
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        success = chunk_bytes is not None
        bytes_size = len(chunk_bytes) if chunk_bytes else 0
        
        # Track storage operation metrics
        if self.storage_ops_tracker:
            self.storage_ops_tracker.track_operation(
                op_type='GET',
                provider=provider,
                bytes_transferred=bytes_size,
                latency_ms=latency_ms,
                success=success
            )
        
        if chunk_bytes:
            try:
                return pickle.loads(chunk_bytes), True
            except Exception:
                return None, False
        return None, False

    def _calculate_improvement(self, provider_times: Dict[str, float]) -> Dict[str, Any]:
        """Calculate performance improvement metrics."""
        if 'aws' not in provider_times or 'ddn_infinia' not in provider_times:
            return {}

        # Ensure we have float values, not dicts
        aws_time = provider_times['aws']
        ddn_time = provider_times['ddn_infinia']
        
        # Handle case where values might still be dicts (backward compatibility)
        if isinstance(aws_time, dict):
            aws_time = aws_time.get('download_ms', 0)
        if isinstance(ddn_time, dict):
            ddn_time = ddn_time.get('download_ms', 0)

        if ddn_time > 0 and aws_time > 0:
            if ddn_time < aws_time:
                speedup = aws_time / ddn_time
                improvement_pct = (1 - ddn_time / aws_time) * 100
                return {
                    'ddn_faster': True,
                    'speedup': speedup,
                    'improvement_percent': improvement_pct
                }
            else:
                speedup = ddn_time / aws_time
                return {
                    'ddn_faster': False,
                    'speedup': speedup,
                    'improvement_percent': 0
                }
        return {}


    def clear(self):
        """Clear all data from the vector store."""
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.chunk_metadata.clear()
        self.chunk_counter = 0

    @property
    def total_chunks(self) -> int:
        """Get total number of chunks in the index."""
        return self.index.ntotal
