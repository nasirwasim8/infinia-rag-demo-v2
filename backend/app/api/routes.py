"""
FastAPI routes for DDN RAG application.
"""
import os
import time
import asyncio
import tempfile
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from app.core.config import settings, storage_config
from app.models.schemas import (
    AWSConfigRequest,
    DDNConfigRequest,
    StorageConfigResponse,
    ConnectionTestResponse,
    DocumentUploadResponse,
    QueryRequest,
    QueryResponse,
    RetrievedChunk,
    MetricsResponse,
    HealthResponse,
    ErrorResponse
)
from app.services.storage import S3Handler
from app.services.vector_store import VectorStore
from app.services.document import DocumentProcessor
from app.services.nvidia import NvidiaLLMClient, NvidiaReranker, NvidiaGuardrails
from app.services.metrics import TTFBMonitor
from app.services.bucket_monitor import BucketMonitor

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize services
ttfb_monitor = TTFBMonitor()
vector_store = VectorStore(storage_ops_tracker=ttfb_monitor.storage_ops)
document_processor = DocumentProcessor()
nvidia_llm = NvidiaLLMClient()
nvidia_reranker = NvidiaReranker()
nvidia_guardrails = NvidiaGuardrails()
bucket_monitor = BucketMonitor(vector_store, document_processor, ttfb_monitor)

logger.info(f"🚀 Vector store initialized: {id(vector_store)}")
logger.info(f"📂 Bucket monitor initialized")

# Routers
config_router = APIRouter(prefix="/config", tags=["Configuration"])
documents_router = APIRouter(prefix="/documents", tags=["Documents"])
rag_router = APIRouter(prefix="/rag", tags=["RAG"])
metrics_router = APIRouter(prefix="/metrics", tags=["Metrics"])
ingestion_router = APIRouter(prefix="/ingestion", tags=["Continuous Ingestion"])
benchmarks_router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])
health_router = APIRouter(tags=["Health"])


# ============== Configuration Routes ==============

@config_router.post("/aws", response_model=StorageConfigResponse)
async def configure_aws(config: AWSConfigRequest):
    """Configure AWS S3 / S3-Compatible storage."""
    storage_config.update_aws_config(
        access_key=config.access_key,
        secret_key=config.secret_key,
        bucket_name=config.bucket_name,
        region=config.region,
        endpoint_url=config.endpoint_url or ''
    )
    provider_label = "S3-Compatible" if config.endpoint_url else "AWS S3"
    return StorageConfigResponse(
        success=True,
        message=f"{provider_label} configuration updated",
        aws_configured=True,
        ddn_configured=bool(storage_config.ddn_infinia_config.get('access_key'))
    )


@config_router.post("/ddn", response_model=StorageConfigResponse)
async def configure_ddn(config: DDNConfigRequest):
    """Configure DDN INFINIA storage."""
    storage_config.update_ddn_config(
        access_key=config.access_key,
        secret_key=config.secret_key,
        bucket_name=config.bucket_name,
        endpoint_url=config.endpoint_url,
        region=config.region
    )
    return StorageConfigResponse(
        success=True,
        message="DDN INFINIA configuration updated",
        aws_configured=bool(storage_config.aws_config.get('access_key')),
        ddn_configured=True
    )


@config_router.get("/current")
async def get_current_config():
    """Get current configuration status (without exposing sensitive credentials)."""
    return {
        "aws": {
            "configured": bool(storage_config.aws_config.get('access_key')),
            "bucket_name": storage_config.aws_config.get('bucket_name', ''),
            "region": storage_config.aws_config.get('region', 'us-east-1'),
            "endpoint_url": storage_config.aws_config.get('endpoint_url', '')
        },
        "ddn": {
            "configured": bool(storage_config.ddn_infinia_config.get('access_key')),
            "bucket_name": storage_config.ddn_infinia_config.get('bucket_name', ''),
            "endpoint_url": storage_config.ddn_infinia_config.get('endpoint_url', ''),
            "region": storage_config.ddn_infinia_config.get('region', 'us-east-1')
        }
    }


@config_router.get("/test/{provider}", response_model=ConnectionTestResponse)
async def test_connection(provider: str):
    """Test connection to storage provider."""
    if provider not in ['aws', 'ddn_infinia']:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

    handler = S3Handler(provider)
    start_time = time.perf_counter()
    success, message = handler.test_connection()
    latency = (time.perf_counter() - start_time) * 1000

    return ConnectionTestResponse(
        provider=provider,
        success=success,
        message=message,
        latency_ms=latency if success else None
    )


@config_router.delete("/reset/{provider}")
async def reset_configuration(provider: str):
    """Reset configuration for specified provider or all providers.
    
    Args:
        provider: 'aws', 'ddn_infinia', or 'all'
    """
    if provider not in ['aws', 'ddn_infinia', 'all']:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    
    success, message = storage_config.reset_config(provider)
    
    if not success:
        raise HTTPException(status_code=500, detail=message)
    
    return {
        "success": True,
        "message": message,
        "provider": provider
    }



# ============== Document Routes ==============

@documents_router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document."""
    logger.info(f"📄 Upload request for: {file.filename}")
    logger.info(f"   Vector store instance: {id(vector_store)}")
    logger.info(f"   Current chunks in index: {vector_store.total_chunks}")
    
    if not document_processor.is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {document_processor.SUPPORTED_EXTENSIONS}"
        )

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Process document
        chunks = document_processor.process_file(tmp_path)

        # Cap chunks for demo environments (prevents 4000+ S3 calls for very large files)
        MAX_CHUNKS = 500
        if len(chunks) > MAX_CHUNKS:
            logger.warning(f"⚠️  Large file: {len(chunks)} chunks — capped at {MAX_CHUNKS} for demo")
            chunks = chunks[:MAX_CHUNKS]

        # Run add_chunks in a thread pool so uvicorn event loop stays
        # responsive to health checks during long S3 storage operations
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, vector_store.add_chunks, chunks)
        
        logger.info(f"✅ Upload complete: {file.filename}")
        logger.info(f"   Total chunks after upload: {vector_store.total_chunks}")

        # Track metrics
        ttfb_monitor.add_storage_comparison(results['provider_performance'], 'document_upload')

        return DocumentUploadResponse(
            success=True,
            message=f"Successfully processed {file.filename}",
            filename=file.filename,
            total_chunks=results['total_chunks'],
            provider_performance=results['provider_performance'],
            embedding_time_ms=results.get('embedding_time_ms'),
            embedding_device=results.get('embedding_device')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)


@documents_router.post("/upload-multiple")
async def upload_multiple_documents(files: List[UploadFile] = File(...)):
    """Upload and process multiple documents."""
    results = []

    for file in files:
        try:
            result = await upload_document(file)
            results.append({
                "filename": file.filename,
                "success": True,
                "chunks": result.total_chunks,
                "provider_performance": result.provider_performance,
                "aws_simulated": result.provider_performance.get('aws', {}).get('simulated', False) if result.provider_performance else False,
                "embedding_time_ms": result.embedding_time_ms,
                "embedding_device": result.embedding_device
            })
        except HTTPException as e:
            results.append({"filename": file.filename, "success": False, "error": e.detail})
        except Exception as e:
            results.append({"filename": file.filename, "success": False, "error": str(e)})

    return {
        "total_files": len(files),
        "successful": sum(1 for r in results if r["success"]),
        "results": results
    }


@documents_router.delete("/clear")
async def clear_documents():
    """Clear all documents from vector store."""
    vector_store.clear()
    return {"success": True, "message": "Vector store cleared"}


@documents_router.get("/count")
async def get_document_count():
    """Get total chunk count."""
    return {"total_chunks": vector_store.total_chunks}


# ============== RAG Routes ==============

@rag_router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Execute RAG query."""
    try:
        logger.info(f"💬 RAG query request: '{request.query[:50]}...'")
        logger.info(f"   Vector store instance: {id(vector_store)}")
        logger.info(f"   Chunks available in index: {vector_store.total_chunks}")
        
        start_time = time.perf_counter()

        # Check input safety if guardrails enabled
        guardrails_check = None
        if request.use_guardrails and nvidia_guardrails.is_configured:
            guardrails_check = nvidia_guardrails.check_input(request.query)
            if not guardrails_check.get('safe', True):
                return QueryResponse(
                    success=False,
                    query=request.query,
                    response="Query blocked by content safety guardrails.",
                    model_used=request.model,
                    retrieved_chunks=[],
                    storage_ttfb={},
                    total_query_time={},
                    provider_times={},
                    fastest_provider=None,
                    ttfb_improvement={},
                    guardrails_check=guardrails_check,
                    total_time_ms=(time.perf_counter() - start_time) * 1000
                )

        # Search vector store with provider comparison
        logger.info(f"🔎 Performing vector search with top_k={request.top_k}")
        search_results = vector_store.search_with_provider_comparison(request.query, request.top_k)
        logger.info(f"   Search returned {len(search_results.get('results', []))} results")

        if not search_results['results']:
            return QueryResponse(
                success=True,
                query=request.query,
                response="No relevant documents found. Please upload some documents first.",
                model_used=request.model,
                retrieved_chunks=[],
                storage_ttfb=search_results.get('storage_ttfb', {}),
                total_query_time={},
                provider_times=search_results['provider_times'],
                fastest_provider=search_results['fastest_provider'],
                ttfb_improvement=search_results.get('ttfb_improvement', {}),
                guardrails_check=guardrails_check,
                total_time_ms=(time.perf_counter() - start_time) * 1000
            )

        # Track retrieval metrics (use storage_ttfb which has float values)
        ttfb_monitor.add_retrieval_comparison(
            search_results.get('storage_ttfb', {}),
            {'query': request.query[:100], 'top_k': request.top_k}
        )

        # Prepare retrieved chunks
        retrieved_chunks = []
        documents = []

        for result in search_results['results']:
            documents.append(result['content'])
            retrieved_chunks.append(RetrievedChunk(
                content=result['content'],
                distance=result['distance'],
                metadata=result['metadata']
            ))

        # Rerank if enabled
        if request.use_reranking and nvidia_reranker.is_configured and len(documents) > 1:
            reranked = nvidia_reranker.rerank(request.query, documents, request.top_k)
            # Update chunks with rerank scores
            for i, item in enumerate(reranked):
                if i < len(retrieved_chunks):
                    retrieved_chunks[i].rerank_score = item.get('score')
            documents = [item['text'] for item in reranked]

        # Build context
        context = "\n\n---\n\n".join(documents[:request.top_k])

        # Generate response using NVIDIA LLM
        if not nvidia_llm.is_configured:
            return QueryResponse(
                success=False,
                query=request.query,
                response="NVIDIA API key not configured.",
                model_used=request.model,
                retrieved_chunks=retrieved_chunks,
                storage_ttfb=search_results.get('storage_ttfb', {}),
                total_query_time={},
                provider_times=search_results['provider_times'],
                fastest_provider=search_results['fastest_provider'],
                ttfb_improvement=search_results.get('ttfb_improvement', {}),
                guardrails_check=guardrails_check,
                total_time_ms=(time.perf_counter() - start_time) * 1000
            )

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant. Answer questions based on the provided context. If the context doesn't contain relevant information, say so."
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {request.query}"
            }
        ]

        try:
            # Measure LLM generation time
            llm_start = time.perf_counter()
            llm_response = nvidia_llm.chat_completion(messages, model=request.model)
            llm_time_ms = (time.perf_counter() - llm_start) * 1000
            response_text = llm_response['choices'][0]['message']['content']

            # Check output safety if guardrails enabled
            if request.use_guardrails and nvidia_guardrails.is_configured:
                output_check = nvidia_guardrails.check_output(response_text)
                if not output_check.get('safe', True):
                    response_text = "Response blocked by content safety guardrails."
            
            # Calculate total query time per provider (storage TTFB + LLM time)
            storage_ttfb = search_results.get('storage_ttfb', {})
            total_query_time = {}
            for provider, ttfb in storage_ttfb.items():
                total_query_time[provider] = ttfb + llm_time_ms

            return QueryResponse(
                success=True,
                query=request.query,
                response=response_text,
                model_used=request.model,
                retrieved_chunks=retrieved_chunks,
                storage_ttfb=storage_ttfb,
                total_query_time=total_query_time,
                provider_times=search_results['provider_times'],
                fastest_provider=search_results['fastest_provider'],
                ttfb_improvement=search_results.get('ttfb_improvement', {}),
                guardrails_check=guardrails_check,
                total_time_ms=(time.perf_counter() - start_time) * 1000
            )

        except Exception as llm_error:
            logger.error(f"❌ LLM error: {str(llm_error)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"LLM error: {str(llm_error)}")
            
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"❌ Query endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


@rag_router.get("/models")
async def get_available_models():
    """Get list of available LLM models."""
    return {"models": nvidia_llm.available_models()}


# ============== Metrics Routes ==============

@metrics_router.get("/", response_model=MetricsResponse)
async def get_metrics():
    """Get all performance metrics."""
    try:
        logger.info("📊 Fetching all metrics...")
        metrics = ttfb_monitor.get_all_metrics()
        logger.info(f"   Metrics retrieved successfully: {len(metrics)} keys")
        return metrics
    except Exception as e:
        logger.error(f"❌ Metrics endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")


@metrics_router.get("/storage")
async def get_storage_metrics():
    """Get storage performance metrics."""
    return ttfb_monitor.get_storage_summary()


@metrics_router.get("/retrieval")
async def get_retrieval_metrics():
    """Get retrieval performance metrics."""
    return ttfb_monitor.get_retrieval_summary()


@metrics_router.get("/llm/")
async def get_llm_metrics():
    """Get LLM performance metrics (TTFT, ITL, tokens/sec)."""
    return ttfb_monitor.llm_metrics.get_summary()

@metrics_router.get("/storage-ops/")
async def get_storage_operation_metrics():
    """Get storage operation metrics (PUT/GET ops/sec, throughput)."""
    return ttfb_monitor.storage_ops.get_summary()

@metrics_router.delete("/clear")
async def clear_metrics():
    """Clear all metrics."""
    ttfb_monitor.clear()
    return {"success": True, "message": "Metrics cleared"}


# ============== Health Routes ==============

@health_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    from app.services.gpu_utils import gpu_info
    
    return HealthResponse(
        status="healthy",
        nvidia_configured=nvidia_llm.is_configured,
        aws_configured=bool(storage_config.aws_config.get('access_key')),
        ddn_configured=bool(storage_config.ddn_infinia_config.get('access_key')),
        vector_store_chunks=vector_store.total_chunks,
        embedding_model=settings.embedding_model,
        gpu_available=gpu_info.is_available,
        gpu_device=gpu_info.device_name,
        gpu_count=gpu_info.gpu_count,
        gpu_names=gpu_info.gpu_names,
        cuda_version=gpu_info.cuda_version
    )


# ============== Continuous Ingestion Routes ==============

@ingestion_router.post("/start")
async def start_bucket_monitoring(bucket_name: str):
    """Start monitoring S3 bucket for new files in auto_ingest folder."""
    logger.info(f"📡 Starting bucket monitoring for: {bucket_name}")
    try:
        message = bucket_monitor.start_monitoring(bucket_name)
        return {"success": True, "message": message, "bucket_name": bucket_name}
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@ingestion_router.post("/stop")
async def stop_bucket_monitoring():
    """Stop bucket monitoring."""
    logger.info("🛑 Stopping bucket monitoring")
    try:
        message = bucket_monitor.stop_monitoring()
        return {"success": True, "message": message}
    except Exception as e:
        logger.error(f"Failed to stop monitoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@ingestion_router.get("/status")
async def get_monitoring_status():
    """Get current bucket monitoring status."""
    try:
        status = bucket_monitor.get_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@ingestion_router.get("/processed-files")
async def get_processed_files():
    """Get list of processed files."""
    try:
        return {
            "processed_files": list(bucket_monitor.processed_files),
            "count": len(bucket_monitor.processed_files)
        }
    except Exception as e:
        logger.error(f"Failed to get processed files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@ingestion_router.get("/summary")
async def get_ingestion_summary():
    """Get comprehensive ingestion summary with file stats, chunk counts, and performance metrics."""
    try:
        detailed_stats = ttfb_monitor.get_detailed_statistics()
        
        return {
            "success": True,
            "files": detailed_stats.get('files', {}),
            "chunks": detailed_stats.get('chunks', {}),
            "timings": detailed_stats.get('timings', {}),
            "throughput": detailed_stats.get('throughput', {}),
            "total_files_processed": detailed_stats.get('files', {}).get('total_processed', 0)
        }
    except Exception as e:
        logger.error(f"Failed to get ingestion summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@ingestion_router.get("/directory-listing")
async def get_directory_listing():
    """Get directory listing of all processed files with detailed metadata."""
    try:
        # Get recent file operations from metrics
        file_stats = ttfb_monitor.file_stats
        
        # Format for display
        files_list = []
        for stat in file_stats[-20:]:  # Last 20 files
            files_list.append({
                "filename": stat.get('filename', 'Unknown'),
                "timestamp": stat.get('timestamp'),
                "file_size_mb": round(stat.get('file_size_mb', 0), 2),
                "chunks_created": stat.get('chunks_created', 0),
                "total_time_ms": round(stat.get('total_time_ms', 0), 1),
                "download_time_ms": round(stat.get('download_time_ms', 0), 1),
                "parsing_time_ms": round(stat.get('parsing_time_ms', 0), 1),
                "embedding_time_ms": round(stat.get('embedding_time_ms', 0), 1)
            })
        
        return {
            "success": True,
            "files": files_list,
            "total_count": len(file_stats)
        }
    except Exception as e:
        logger.error(f"Failed to get directory listing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@ingestion_router.get("/stream")
async def stream_processing_events():
    """Stream real-time processing events via SSE."""
    logger.info("📡 Client connected to SSE stream")
    return StreamingResponse(
        bucket_monitor.stream_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


# ============== Benchmark Routes ==============

@benchmarks_router.post("/basic")
async def run_basic_benchmark():
    """Run basic storage benchmark test with real uploads and retrievals."""
    try:
        logger.info("🧪 Starting basic benchmark test...")
        
        # Generate test chunks
        test_iterations = 10
        test_content = "This is a benchmark test chunk. " * 100  # ~3KB chunk
        
        ddn_upload_times = []
        aws_upload_times = []
        ddn_retrieval_times = []
        aws_retrieval_times = []
        
        # Check if AWS is configured
        from app.core.config import storage_config
        aws_configured = bool(storage_config.aws_config.get('access_key'))
        
        for i in range(test_iterations):
            content = f"{test_content} [Iteration {i}]"
            chunk_id = f"benchmark_test_{i}_{int(time.perf_counter() * 1000)}"
            
            # Generate embedding
            embedding = vector_store.encode([content])[0]
            
            # Test upload to DDN
            ddn_handler = S3Handler('ddn_infinia')
            object_key = f"benchmarks/{chunk_id}.txt"
            
            ddn_start = time.perf_counter()
            ddn_handler.upload_bytes(content.encode('utf-8'), object_key)
            ddn_upload_time = (time.perf_counter() - ddn_start) * 1000
            ddn_upload_times.append(ddn_upload_time)
            
            # Test retrieval from DDN
            ddn_start = time.perf_counter()
            ddn_handler.download_bytes(object_key)
            ddn_retrieval_time = (time.perf_counter() - ddn_start) * 1000
            ddn_retrieval_times.append(ddn_retrieval_time)
            
            # Test AWS (real or simulated)
            if aws_configured:
                aws_handler = S3Handler('aws')
                
                aws_start = time.perf_counter()
                aws_handler.upload_bytes(content.encode('utf-8'), object_key)
                aws_upload_time = (time.perf_counter() - aws_start) * 1000
                aws_upload_times.append(aws_upload_time)
                
                aws_start = time.perf_counter()
                aws_handler.download_bytes(object_key)
                aws_retrieval_time = (time.perf_counter() - aws_start) * 1000
                aws_retrieval_times.append(aws_retrieval_time)
            else:
                # Simulate AWS at 35x slower
                aws_upload_times.append(ddn_upload_time * 35)
                aws_retrieval_times.append(ddn_retrieval_time * 35)
        
        # Calculate averages
        avg_ddn_upload = sum(ddn_upload_times) / len(ddn_upload_times)
        avg_aws_upload = sum(aws_upload_times) / len(aws_upload_times)
        avg_ddn_retrieval = sum(ddn_retrieval_times) / len(ddn_retrieval_times)
        avg_aws_retrieval = sum(aws_retrieval_times) / len(aws_retrieval_times)
        
        logger.info(f"✅ Benchmark complete: DDN upload={avg_ddn_upload:.2f}ms, AWS upload={avg_aws_upload:.2f}ms")
        
        return {
            "success": True,
            "iterations": test_iterations,
            "ddn_upload_time": avg_ddn_upload,
            "aws_upload_time": avg_aws_upload,
            "ddn_ttfb": avg_ddn_retrieval,
            "aws_ttfb": avg_aws_retrieval,
            "aws_simulated": not aws_configured
        }
    except Exception as e:
        logger.error(f"❌ Benchmark failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@benchmarks_router.post("/multi-size")
async def run_multi_size_benchmark():
    """Run multi-size storage benchmark test with different chunk sizes."""
    try:
        logger.info("🧪 Starting multi-size benchmark test...")
        
        # Define test sizes
        sizes_config = [
            ("1KB", 1024),
            ("10KB", 10240),
            ("100KB", 102400),
            ("1MB", 1048576)
        ]
        
        ddn_results = []
        aws_results = []
        
        # Check if AWS is configured
        from app.core.config import storage_config
        aws_configured = bool(storage_config.aws_config.get('access_key'))
        
        for size_label, size_bytes in sizes_config:
            logger.info(f"  Testing {size_label}...")
            
            # Generate test content of specific size
            test_content = "X" * size_bytes
            chunk_id = f"benchmark_multisize_{size_label}_{int(time.perf_counter() * 1000)}"
            object_key = f"benchmarks/{chunk_id}.bin"
            
            # Test DDN upload
            ddn_handler = S3Handler('ddn_infinia')
            ddn_start = time.perf_counter()
            ddn_handler.upload_bytes(test_content.encode('utf-8'), object_key)
            ddn_time = (time.perf_counter() - ddn_start) * 1000
            ddn_results.append(round(ddn_time, 2))
            
            # Test AWS (real or simulated)
            if aws_configured:
                aws_handler = S3Handler('aws')
                aws_start = time.perf_counter()
                aws_handler.upload_bytes(test_content.encode('utf-8'), object_key)
                aws_time = (time.perf_counter() - aws_start) * 1000
                aws_results.append(round(aws_time, 2))
            else:
                # Simulate AWS at 35x slower
                aws_results.append(round(ddn_time * 35, 2))
        
        logger.info(f"✅ Multi-size benchmark complete")
        
        return {
            "success": True,
            "sizes": [s[0] for s in sizes_config],
            "ddn_results": ddn_results,
            "aws_results": aws_results,
            "aws_simulated": not aws_configured
        }
    except Exception as e:
        logger.error(f"❌ Multi-size benchmark failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

