#!/usr/bin/env python3
"""
Groq Model Latency Tester
Tests multiple Groq models with the same message, runs 3 times each for average latency.
"""

import httpx
import time
from statistics import mean, stdev

# ============================================================
# PUT YOUR GROQ API KEY HERE
# ============================================================
GROQ_API_KEY = ""
# ============================================================

# ============================================================
# PUT YOUR MODELS HERE (comma-separated)
# ============================================================
GROQ_MODELS = [
    "groq/compound",
    "groq/compound-mini",
    "meta-llama/llama-4-scout-17b-16e-instruct"
]
# ============================================================

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
TEST_MESSAGE = "Hello, who are you?"
RUNS_PER_MODEL = 3
MAX_TOKENS = 100


def test_model(model: str) -> tuple[bool, float, str, dict | None]:
    """
    Test a single model once.
    Returns: (success, latency_ms, response_or_error, usage_info)
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": TEST_MESSAGE}],
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
    }
    
    try:
        start_time = time.perf_counter()
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(GROQ_API_URL, headers=headers, json=payload)
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return True, latency_ms, content.strip(), usage
        
        # Parse error
        try:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", response.text)
        except:
            error_msg = response.text
        
        return False, latency_ms, f"HTTP {response.status_code}: {error_msg}", None
        
    except httpx.TimeoutException:
        return False, 0, "Request timed out", None
    except Exception as e:
        return False, 0, f"Error: {e}", None


def run_model_benchmark(model: str) -> dict:
    """
    Run benchmark for a single model (multiple runs).
    """
    results = {
        "model": model,
        "runs": [],
        "success_count": 0,
        "fail_count": 0,
        "latencies": [],
        "avg_latency": None,
        "min_latency": None,
        "max_latency": None,
        "std_dev": None,
        "last_response": None,
        "last_error": None,
        "total_tokens": 0,
    }
    
    for run in range(1, RUNS_PER_MODEL + 1):
        print(f"      Run {run}/{RUNS_PER_MODEL}...", end=" ", flush=True)
        
        success, latency, response, usage = test_model(model)
        
        run_result = {
            "run": run,
            "success": success,
            "latency_ms": latency,
        }
        
        if success:
            results["success_count"] += 1
            results["latencies"].append(latency)
            results["last_response"] = response
            if usage:
                results["total_tokens"] += usage.get("total_tokens", 0)
            print(f"✅ {latency:.0f}ms")
        else:
            results["fail_count"] += 1
            results["last_error"] = response
            print(f"❌ {response[:50]}...")
        
        results["runs"].append(run_result)
        
        # Small delay between runs
        if run < RUNS_PER_MODEL:
            time.sleep(0.3)
    
    # Calculate stats
    if results["latencies"]:
        results["avg_latency"] = mean(results["latencies"])
        results["min_latency"] = min(results["latencies"])
        results["max_latency"] = max(results["latencies"])
        if len(results["latencies"]) > 1:
            results["std_dev"] = stdev(results["latencies"])
    
    return results


def main():
    print("=" * 70)
    print("GROQ MODEL LATENCY TESTER")
    print(f"Test message: \"{TEST_MESSAGE}\"")
    print(f"Runs per model: {RUNS_PER_MODEL}")
    print(f"Max tokens: {MAX_TOKENS}")
    print("=" * 70)
    print()
    
    # Validate API key
    if not GROQ_API_KEY or GROQ_API_KEY == "gsk_YOUR_KEY_HERE":
        print("❌ ERROR: Please set your GROQ_API_KEY in the script!")
        return
    
    all_results = []
    
    for i, model in enumerate(GROQ_MODELS, 1):
        model = model.strip()
        if not model or model.startswith("#"):
            continue
        
        print(f"[{i}/{len(GROQ_MODELS)}] Testing: {model}")
        
        result = run_model_benchmark(model)
        all_results.append(result)
        
        # Print quick summary for this model
        if result["avg_latency"]:
            print(f"      → Avg: {result['avg_latency']:.0f}ms | "
                  f"Min: {result['min_latency']:.0f}ms | "
                  f"Max: {result['max_latency']:.0f}ms")
        print()
        
        # Delay between models
        if i < len(GROQ_MODELS):
            time.sleep(0.5)
    
    # Final Summary Table
    print("=" * 70)
    print("SUMMARY - AVERAGE LATENCY BY MODEL")
    print("=" * 70)
    print()
    
    # Sort by average latency (fastest first), failures at the end
    working = [r for r in all_results if r["avg_latency"] is not None]
    failed = [r for r in all_results if r["avg_latency"] is None]
    
    working.sort(key=lambda x: x["avg_latency"])
    
    # Print table header
    print(f"{'Model':<35} {'Avg (ms)':<10} {'Min':<10} {'Max':<10} {'StdDev':<10} {'Success'}")
    print("-" * 95)
    
    for r in working:
        std_str = f"{r['std_dev']:.0f}" if r["std_dev"] else "N/A"
        print(f"{r['model']:<35} {r['avg_latency']:<10.0f} {r['min_latency']:<10.0f} "
              f"{r['max_latency']:<10.0f} {std_str:<10} {r['success_count']}/{RUNS_PER_MODEL}")
    
    if failed:
        print()
        print("FAILED MODELS:")
        for r in failed:
            print(f"  ❌ {r['model']}: {r['last_error'][:60]}...")
    
    # Ranking
    print()
    print("=" * 70)
    print("RANKING (Fastest to Slowest)")
    print("=" * 70)
    
    for i, r in enumerate(working, 1):
        emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
        print(f"  {emoji} {r['model']}: {r['avg_latency']:.0f}ms avg")
    
    print()
    print("=" * 70)
    print(f"Tested {len(working)} working models, {len(failed)} failed")
    print("=" * 70)


if __name__ == "__main__":
    main()
