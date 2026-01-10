#!/usr/bin/env python3
"""
Firebase Credentials Base64 Encoder

This script reads your serviceAccountKey.json file and outputs the base64-encoded
string that you can use in your .env file as FIREBASE_CRED_BASE64.

Usage:
    python setup_firebase.py
    
The script will:
1. Read serviceAccountKey.json from the current directory
2. Encode it to base64
3. Output the encoded string for your .env file
"""

import base64
import json
import os
from pathlib import Path


def encode_firebase_credentials():
    """
    Encode Firebase service account key to base64 for environment variable usage.
    """
    # Look for serviceAccountKey.json in current directory
    key_file = Path("serviceAccountKey.json")
    
    if not key_file.exists():
        print("\n" + "="*60)
        print("ERROR: serviceAccountKey.json not found!")
        print("="*60)
        print("\nPlease ensure serviceAccountKey.json is in the same directory")
        print("as this script (admin-backend/).")
        print("\nYou can download it from Firebase Console:")
        print("  1. Go to Firebase Console > Project Settings")
        print("  2. Navigate to Service Accounts tab")
        print("  3. Click 'Generate new private key'")
        print("  4. Save as 'serviceAccountKey.json' in admin-backend/")
        print("="*60)
        return
    
    try:
        # Read the JSON file
        with open(key_file, 'r') as f:
            cred_data = json.load(f)
        
        # Validate it's a proper service account key
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in cred_data]
        
        if missing_fields:
            print(f"\n[ERROR] Invalid service account key. Missing fields: {', '.join(missing_fields)}")
            return
        
        # Convert back to JSON string (minified)
        json_str = json.dumps(cred_data, separators=(',', ':'))
        
        # Encode to base64
        base64_encoded = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        
        # Output results
        print("\n" + "="*60)
        print("SUCCESS! Firebase Credentials Encoded")
        print("="*60)
        print(f"\nProject ID: {cred_data.get('project_id')}")
        print(f"Service Account: {cred_data.get('client_email')}")
        print("\n" + "-"*60)
        print("Add this line to your .env file:")
        print("-"*60)
        print(f"\nFIREBASE_CRED_BASE64={base64_encoded}\n")
        print("-"*60)
        print("\nNOTE: Keep this value secret! Do not commit it to git.")
        print("="*60)
        
        # Optionally save to a .env.example or show in file
        print("\n[TIP] The serviceAccountKey.json is already in .gitignore")
        print("      and should never be committed to version control.")
        
    except json.JSONDecodeError as e:
        print(f"\n[ERROR] Invalid JSON file: {e}")
    except Exception as e:
        print(f"\n[ERROR] Failed to encode credentials: {e}")


if __name__ == "__main__":
    encode_firebase_credentials()
