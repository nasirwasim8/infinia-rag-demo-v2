#!/usr/bin/env python3
"""
Test NVIDIA API response times to diagnose slowness.
"""
import os
import time
from dotenv import load_dotenv

load_dotenv()

NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY')
if not NVIDIA_API_KEY:
    print("❌ NVIDIA_API_KEY not found in .env file")
    exit(1)

print("Testing NVIDIA API speeds...")
print("=" * 60)

# Test 1: LLM Inference (nano model)
print("\n1. Testing LLM Inference (nano-9b model)...")
try:
    import requests
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "nvidia/nvidia-nemotron-nano-9b-v2",
        "messages": [{"role": "user", "content": "Say 'test' and nothing else"}],
        "max_tokens": 10,
        "temperature": 0.1
    }
    
    start = time.time()
    response = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=60
    )
    elapsed = time.time() - start
    
    if response.status_code == 200:
        print(f"   ✅ LLM Response time: {elapsed:.2f}s")
    else:
        print(f"   ❌ LLM Failed: {response.status_code} - {response.text[:200]}")
        
except Exception as e:
    print(f"   ❌ LLM Error: {e}")

# Test 2: Reranking
print("\n2. Testing Reranking API...")
try:
    payload = {
        "model": "nvidia/nv-rerankqa-mistral-4b-v3",
        "query": {"text": "test query"},
        "passages": [
            {"text": "document 1"},
            {"text": "document 2"},
            {"text": "document 3"}
        ],
        "top_n": 3
    }
    
    start = time.time()
    response = requests.post(
        "https://integrate.api.nvidia.com/v1/ranking",
        headers=headers,
        json=payload,
        timeout=60
    )
    elapsed = time.time() - start
    
    if response.status_code == 200:
        print(f"   ✅ Reranking Response time: {elapsed:.2f}s")
    else:
        print(f"   ❌ Reranking Failed: {response.status_code} - {response.text[:200]}")
        
except Exception as e:
    print(f"   ❌ Reranking Error: {e}")

# Test 3: Guardrails
print("\n3. Testing Guardrails API...")
try:
    payload = {
        "model": "nvidia/aegis-ai-content-safety-1b",
        "messages": [{"role": "user", "content": "test content"}],
        "max_tokens": 50
    }
    
    start = time.time()
    response = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    elapsed = time.time() - start
    
    if response.status_code == 200:
        print(f"   ✅ Guardrails Response time: {elapsed:.2f}s")
    else:
        print(f"   ❌ Guardrails Failed: {response.status_code} - {response.text[:200]}")
        
except Exception as e:
    print(f"   ❌ Guardrails Error: {e}")

print("\n" + "=" * 60)
print("Summary:")
print("- If LLM > 30s: NVIDIA API is slow or overloaded")
print("- If Reranking > 30s: Reranking service is slow")
print("- If Guardrails > 15s: Guardrails service is slow")
print("\nExpected on CPU: LLM=5-15s, Reranking=3-10s, Guardrails=2-5s")
print("Total with all enabled: ~10-30s")
print("If seeing 120s+: API is throttled or experiencing issues")
