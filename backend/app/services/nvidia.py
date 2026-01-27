"""
NVIDIA API integrations for LLM, Reranking, and Guardrails.
"""
import requests
import time
from typing import List, Dict, Any, Optional

from app.core.config import settings


class NvidiaLLMClient:
    """NVIDIA LLM API Client for RAG applications."""

    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or settings.nvidia_api_key
        self.base_url = base_url or settings.nvidia_base_url
        self.default_model = "meta/llama-3.1-8b-instruct"  # Fast model for better UX

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Send chat completion request to NVIDIA API."""
        if not self.api_key:
            raise Exception("NVIDIA API key not configured")

        model_name = model or self.default_model
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "top_p": 1.0,
            "max_tokens": max_tokens,
            "stream": stream
        }

        # Retry logic for flaky API
        max_retries = 2
        for attempt in range(max_retries):
            try:
                timeout = 120  # Increased timeout from 30s to 120s
                response = requests.post(url, headers=headers, json=payload, timeout=timeout)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.ReadTimeout as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s
                    print(f"NVIDIA API timeout on attempt {attempt + 1}/{max_retries}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"NVIDIA API timed out after {max_retries} attempts. The model may be overloaded. Try again in a few moments.") from e
            except Exception as e:
                raise

    def available_models(self) -> List[str]:
        """Get list of available NVIDIA models."""
        return [
            # Fast models (~8-15s per query)
            "meta/llama-3.1-8b-instruct",
            "mistralai/mistral-7b-instruct-v0.3",
            "google/gemma-2-9b-it",
            
            # High quality models (~35-40s per query)
            "nvidia/nvidia-nemotron-nano-9b-v2",
            "mistralai/mixtral-8x7b-instruct-v0.1"
        ]


class NvidiaReranker:
    """NVIDIA NeMo Retriever Reranking Service."""

    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or settings.nvidia_api_key
        self.base_url = base_url or settings.nvidia_base_url
        self.model = "nvidia/nv-rerankqa-mistral-4b-v3"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Rerank documents using NVIDIA NeMo Retriever."""
        if not self.api_key or not documents:
            return [{"text": doc, "index": i, "score": 1.0} for i, doc in enumerate(documents[:top_k])]

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            payload = {
                "model": self.model,
                "query": {"text": query},
                "passages": [{"text": doc} for doc in documents],
                "top_n": min(top_k, len(documents))
            }

            response = requests.post(
                f"{self.base_url}/ranking",
                headers=headers,
                json=payload,
                timeout=10  # Reduced from 60s - fail fast if endpoint broken
            )

            # If endpoint doesn't exist (404), skip reranking immediately
            if response.status_code == 404:
                print(f"⚠️ Reranking endpoint not available (404) - skipping reranking")
                return [{"text": doc, "index": i, "score": 1.0} for i, doc in enumerate(documents[:top_k])]
            
            if response.status_code == 200:
                result = response.json()
                rankings = result.get("rankings", [])
                return [
                    {
                        "text": documents[item["index"]],
                        "index": item["index"],
                        "score": item.get("logit", 1.0)
                    }
                    for item in rankings[:top_k]
                ]
            else:
                print(f"Reranking failed with status {response.status_code}")
                return [{"text": doc, "index": i, "score": 1.0} for i, doc in enumerate(documents[:top_k])]

        except Exception as e:
            print(f"Reranking error: {e}")
            return [{"text": doc, "index": i, "score": 1.0} for i, doc in enumerate(documents[:top_k])]


class NvidiaGuardrails:
    """NVIDIA NeMo Guardrails for Content Safety."""

    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or settings.nvidia_api_key
        self.base_url = base_url or settings.nvidia_base_url
        self.model = "nvidia/aegis-ai-content-safety-1b"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def check_safety(self, text: str) -> Dict[str, Any]:
        """Check text for safety issues."""
        if not self.api_key:
            return {"safe": True, "reason": "Guardrails disabled", "confidence": 1.0}

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": text}],
                "max_tokens": 100
            }

            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=5  # Reduced from 15s - fail fast if endpoint broken
            )

            # If endpoint doesn't exist (404), skip guardrails immediately
            if response.status_code == 404:
                print(f"⚠️ Guardrails endpoint not available (404) - allowing content by default")
                return {"safe": True, "reason": "Guardrails endpoint not available", "confidence": 0.5}
            
            if response.status_code == 200:
                result = response.json()
                safety_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                is_safe = "unsafe" not in safety_response.lower() and "harmful" not in safety_response.lower()

                return {
                    "safe": is_safe,
                    "reason": safety_response if not is_safe else "Content appears safe",
                    "confidence": 0.8
                }
            else:
                return {"safe": True, "reason": "Guardrail check failed, allowing by default", "confidence": 0.5}

        except Exception as e:
            print(f"Guardrail check error: {e}")
            return {"safe": True, "reason": "Guardrail check failed, allowing by default", "confidence": 0.5}

    def check_input(self, text: str) -> Dict[str, Any]:
        """Check input text for safety issues."""
        return self.check_safety(text)

    def check_output(self, text: str) -> Dict[str, Any]:
        """Check output text for safety issues."""
        return self.check_safety(text)
