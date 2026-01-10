#!/usr/bin/env python3
"""
Gemini API Key Tester (Embeddings)
Tests multiple Gemini API keys with a single sentence embedding using text-embedding-004.
"""

import httpx
import time

# ============================================================
# PUT YOUR GEMINI API KEYS HERE (comma-separated or one per line)
# ============================================================
GEMINI_API_KEYS = [
    "AIzaSy_YOUR_KEY_1_HERE",
    "AIzaSy_YOUR_KEY_2_HERE",
    # Add more keys as needed...
]
# ============================================================

TEST_MODEL = "gemini-embedding-001"
TEST_TEXT = "This is a test sentence for embedding generation."


def get_api_url(api_key: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/models/{TEST_MODEL}:embedContent?key={api_key}"


def mask_key(key: str) -> str:
    """Show only last 4 characters of the key."""
    if len(key) <= 4:
        return "****"
    return f"...{key[-4:]}"


def test_gemini_embedding_key(api_key: str) -> tuple[bool, str, str | None]:
    """
    Test a single Gemini API key with embedding generation.
    Returns: (success, response_or_error, error_category)
    """
    url = get_api_url(api_key)
    
    payload = {
        "model": f"models/{TEST_MODEL}",
        "content": {
            "parts": [{"text": TEST_TEXT}]
        }
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                embedding = data.get("embedding", {}).get("values", [])
                dims = len(embedding)
                # Show first few values as preview
                preview = embedding[:5] if embedding else []
                preview_str = ", ".join(f"{v:.4f}" for v in preview)
                return True, f"Embedding generated: {dims} dimensions [{preview_str}, ...]", None
            
            # Parse error response
            try:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", response.text)
                error_status = error_data.get("error", {}).get("status", "")
            except:
                error_msg = response.text
                error_status = ""
            
            # Categorize errors
            if response.status_code == 400:
                if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
                    return False, error_msg, "INVALID_KEY"
                return False, error_msg, "BAD_REQUEST"
            elif response.status_code == 403:
                if "leaked" in error_msg.lower():
                    return False, error_msg, "LEAKED_KEY"
                elif "PERMISSION_DENIED" in error_status or "permission" in error_msg.lower():
                    return False, error_msg, "PERMISSION_DENIED"
                return False, error_msg, "FORBIDDEN"
            elif response.status_code == 429:
                if "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_status:
                    return False, error_msg, "QUOTA_EXHAUSTED"
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
    print("GEMINI API KEY TESTER (Embeddings)")
    print(f"Model: {TEST_MODEL}")
    print(f"Test text: \"{TEST_TEXT}\"")
    print("=" * 60)
    print()
    
    results = {
        "working": [],
        "INVALID_KEY": [],
        "LEAKED_KEY": [],
        "PERMISSION_DENIED": [],
        "QUOTA_EXHAUSTED": [],
        "RATE_LIMITED": [],
        "FORBIDDEN": [],
        "BAD_REQUEST": [],
        "NOT_FOUND": [],
        "TIMEOUT": [],
        "CONNECTION_ERROR": [],
        "OTHER_ERROR": [],
        "UNEXPECTED_ERROR": [],
    }
    
    for i, key in enumerate(GEMINI_API_KEYS, 1):
        key = key.strip()
        if not key or key.startswith("#"):
            continue
            
        masked = mask_key(key)
        print(f"[{i}/{len(GEMINI_API_KEYS)}] Testing key: {masked}")
        
        success, response, category = test_gemini_embedding_key(key)
        
        if success:
            print(f"    ✅ SUCCESS")
            print(f"    {response}")
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
        ("PERMISSION_DENIED", "Permission Denied"),
        ("QUOTA_EXHAUSTED", "Quota Exhausted"),
        ("RATE_LIMITED", "Rate Limited Keys"),
        ("FORBIDDEN", "Forbidden Keys"),
        ("BAD_REQUEST", "Bad Request"),
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
