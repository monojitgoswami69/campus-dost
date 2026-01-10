#!/usr/bin/env python3
"""
Groq API Key Tester
Tests multiple Groq API keys with a simple "hello" message.
"""

import httpx
import time

# ============================================================
# PUT YOUR GROQ API KEYS HERE (comma-separated or one per line)
# ============================================================
GROQ_API_KEYS = []
# ============================================================

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
TEST_MODEL = "groq/compound-mini"
TEST_MESSAGE = "hello"


def mask_key(key: str) -> str:
    """Show only last 4 characters of the key."""
    if len(key) <= 4:
        return "****"
    return f"...{key[-4:]}"


def test_groq_key(api_key: str) -> tuple[bool, str, str | None]:
    """
    Test a single Groq API key.
    Returns: (success, response_or_error, error_category)
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": TEST_MODEL,
        "messages": [{"role": "user", "content": TEST_MESSAGE}],
        "max_tokens": 50,
        "temperature": 0.7,
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(GROQ_API_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return True, content.strip(), None
            
            # Parse error response
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", response.text)
            except:
                error_msg = response.text
            
            # Categorize errors
            if response.status_code == 401:
                return False, error_msg, "INVALID_KEY"
            elif response.status_code == 403:
                if "leaked" in error_msg.lower():
                    return False, error_msg, "LEAKED_KEY"
                return False, error_msg, "FORBIDDEN"
            elif response.status_code == 429:
                return False, error_msg, "RATE_LIMITED"
            elif response.status_code == 404:
                return False, error_msg, "NOT_FOUND"
            else:
                return False, f"HTTP {response.status_code}: {error_msg}", "OTHER_ERROR"
                
    except httpx.TimeoutException:
        return False, "Request timed out", "TIMEOUT"
    except httpx.ConnectError as e:
        return False, f"Connection error: {e}", "CONNECTION_ERROR"
    except Exception as e:
        return False, f"Unexpected error: {e}", "UNEXPECTED_ERROR"


def main():
    print("=" * 60)
    print("GROQ API KEY TESTER")
    print(f"Model: {TEST_MODEL}")
    print(f"Test message: \"{TEST_MESSAGE}\"")
    print("=" * 60)
    print()
    
    results = {
        "working": [],
        "INVALID_KEY": [],
        "LEAKED_KEY": [],
        "RATE_LIMITED": [],
        "FORBIDDEN": [],
        "NOT_FOUND": [],
        "TIMEOUT": [],
        "CONNECTION_ERROR": [],
        "OTHER_ERROR": [],
        "UNEXPECTED_ERROR": [],
    }
    
    for i, key in enumerate(GROQ_API_KEYS, 1):
        key = key.strip()
        if not key or key.startswith("#"):
            continue
            
        masked = mask_key(key)
        print(f"[{i}/{len(GROQ_API_KEYS)}] Testing key: {masked}")
        
        success, response, category = test_groq_key(key)
        
        if success:
            print(f"    ✅ SUCCESS")
            print(f"    Response: {response[:100]}{'...' if len(response) > 100 else ''}")
            results["working"].append(key)
        else:
            print(f"    ❌ FAILED ({category})")
            print(f"    Error: {response[:150]}{'...' if len(response) > 150 else ''}")
            results[category].append(key)
        
        print()
        time.sleep(0.5)  # Small delay between tests
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    print(f"\n✅ WORKING KEYS ({len(results['working'])}):")
    if results["working"]:
        for key in results["working"]:
            print(f"    {mask_key(key)} -> {key}")
    else:
        print("    None")
    
    # Failed categories
    failed_categories = [
        ("INVALID_KEY", "Invalid/Non-existent Keys"),
        ("LEAKED_KEY", "Leaked Keys (Reported)"),
        ("RATE_LIMITED", "Rate Limited Keys"),
        ("FORBIDDEN", "Forbidden Keys"),
        ("NOT_FOUND", "Not Found"),
        ("TIMEOUT", "Timed Out"),
        ("CONNECTION_ERROR", "Connection Errors"),
        ("OTHER_ERROR", "Other HTTP Errors"),
        ("UNEXPECTED_ERROR", "Unexpected Errors"),
    ]
    
    for category, label in failed_categories:
        if results[category]:
            print(f"\n❌ {label} ({len(results[category])}):")
            for key in results[category]:
                print(f"    {mask_key(key)} -> {key}")
    
    # Final counts
    total_working = len(results["working"])
    total_failed = sum(len(v) for k, v in results.items() if k != "working")
    print(f"\n{'=' * 60}")
    print(f"TOTAL: {total_working} working, {total_failed} failed out of {total_working + total_failed} keys")
    print("=" * 60)


if __name__ == "__main__":
    main()
