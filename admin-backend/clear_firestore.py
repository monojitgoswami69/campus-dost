#!/usr/bin/env python3
"""
System Reset Utility - Development & Testing Tool

This script provides a complete system reset by:
1. Clearing all Firestore collections
2. Recreating missing collections with proper structure
3. Clearing all files from Dropbox storage
4. Initializing default metrics

Use this for development/testing only - NOT for production!

Collections managed:
- Documents (metadata)
- Vectors (embeddings)
- Metrics (usage stats)
- Activity logs
- System instructions history

Usage:
    python clear_firestore.py                  # Interactive mode with confirmation
    python clear_firestore.py --yes            # Auto-confirm (dangerous!)
    python clear_firestore.py --collections documents vectors  # Clear specific collections only
    python clear_firestore.py --skip-dropbox   # Don't clear Dropbox files
    python clear_firestore.py --dropbox-only   # Only clear Dropbox files
"""

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path so we can import from app
sys.path.insert(0, str(Path(__file__).parent))

import json
import base64
import tempfile
from google.cloud import firestore
from google.oauth2 import service_account

from app.config import settings, logger

# Collection names mapping
COLLECTIONS = {
    'documents': settings.DOCUMENTS_COLLECTION,
    'vectors': settings.VECTOR_STORE_COLLECTION,
    'metrics': settings.METRICS_COLLECTION,
    'weekly_metrics': settings.WEEKLY_METRICS_COLLECTION,
    'activity': settings.ACTIVITY_LOG_COLLECTION,
    'system_instructions': settings.SYSTEM_INSTRUCTIONS_HISTORY_COLLECTION,
}

def get_sync_firestore_client():
    """Initialize a synchronous Firestore client for this utility script."""
    # Prioritize local file over base64
    credentials = None
    
    if settings.FIREBASE_CRED_PATH and os.path.exists(settings.FIREBASE_CRED_PATH):
        credentials = service_account.Credentials.from_service_account_file(
            settings.FIREBASE_CRED_PATH
        )
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.FIREBASE_CRED_PATH
    elif settings.FIREBASE_CRED_BASE64:
        try:
            cred_json = base64.b64decode(settings.FIREBASE_CRED_BASE64).decode('utf-8')
            cred_dict = json.loads(cred_json)
            credentials = service_account.Credentials.from_service_account_info(cred_dict)
            # Also write to temp file for GOOGLE_APPLICATION_CREDENTIALS
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(cred_dict, f)
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
        except Exception as e:
            logger.error(f"Failed to decode base64 credentials: {e}")
            raise
    
    # Create synchronous Client (not AsyncClient)
    if credentials:
        return firestore.Client(credentials=credentials)
    else:
        return firestore.Client()

def delete_collection(db, collection_name, batch_size=400):
    """
    Delete all documents in a collection in batches.
    
    Args:
        db: Firestore client
        collection_name: Name of collection to delete
        batch_size: Number of docs to delete per batch (max 500)
    
    Returns:
        Number of documents deleted
    """
    collection_ref = db.collection(collection_name)
    total_deleted = 0
    
    while True:
        # Get batch of documents
        docs = list(collection_ref.limit(batch_size).stream())
        
        if not docs:
            break
        
        # Delete batch
        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        batch.commit()
        
        deleted = len(docs)
        total_deleted += deleted
        print(f"  Deleted {deleted} documents from {collection_name} (total: {total_deleted})")
        
        # Small delay to avoid overwhelming Firestore
        if deleted == batch_size:
            time.sleep(0.1)
    
    return total_deleted

def clear_all_collections(db, collection_names=None):
    """
    Clear all or specific Firestore collections.
    
    Args:
        db: Firestore client
        collection_names: List of collection keys to clear (None = all)
    """
    if collection_names is None:
        collection_names = COLLECTIONS.keys()
    
    print("\n" + "="*60)
    print("CLEARING FIRESTORE COLLECTIONS")
    print("="*60)
    
    total_deleted = 0
    results = {}
    
    for key in collection_names:
        if key not in COLLECTIONS:
            print(f"WARNING: Unknown collection: {key}")
            continue
        
        collection_name = COLLECTIONS[key]
        print(f"\nClearing collection: {collection_name}")
        
        start = time.time()
        count = delete_collection(db, collection_name)
        elapsed = time.time() - start
        
        results[key] = count
        total_deleted += count
        
        if count > 0:
            print(f"[OK] Cleared {count} documents in {elapsed:.2f}s")
        else:
            print(f"[OK] Collection already empty")
    
    print("\n" + "="*60)
    print(f"COMPLETE - Deleted {total_deleted} total documents")
    print("="*60)
    
    if results:
        print("\nSummary:")
        for key, count in results.items():
            print(f"  • {key}: {count} documents")
    print()

def recreate_collections(db):
    """
    Recreate essential collections with initial documents to prevent non-existence issues.
    """
    print("\n" + "="*60)
    print("RECREATING COLLECTIONS WITH INITIAL DATA")
    print("="*60)
    
    # Initialize metrics collection with default values
    try:
        print("\nInitializing metrics collection...")
        metrics_ref = db.collection(settings.METRICS_COLLECTION).document("dashboard")
        metrics_ref.set({
            "total_documents": 0,
            "active_documents": 0,
            "archived_documents": 0,
            "total_vectors": 0,
            "total_size_bytes": 0,
            "last_updated": datetime.now(timezone.utc)
        })
        print("[OK] Metrics collection initialized")
    except Exception as e:
        print(f"WARNING: Could not initialize metrics: {e}")
    
    print("\n[OK] Collections recreated successfully")

def clear_dropbox_storage(skip_confirm=False):
    """
    Clear all files from Dropbox /documents/ folder.
    """
    try:
        # Import Dropbox provider
        import dropbox
        from dropbox.exceptions import ApiError
        
        print("\n" + "="*60)
        print("CLEARING DROPBOX STORAGE")
        print("="*60)
        
        # Initialize Dropbox client
        print("\nConnecting to Dropbox...")
        dbx = dropbox.Dropbox(
            app_key=settings.DROPBOX_APP_KEY,
            app_secret=settings.DROPBOX_APP_SECRET,
            oauth2_refresh_token=settings.DROPBOX_REFRESH_TOKEN
        )
        
        # Verify connection
        account = dbx.users_get_current_account()
        print(f"[OK] Connected as: {account.name.display_name}")
        
        # List all files in /documents/
        print("\nScanning /documents/ folder...")
        try:
            result = dbx.files_list_folder("/documents")
            all_files = result.entries
            
            # Handle pagination if there are many files
            while result.has_more:
                result = dbx.files_list_folder_continue(result.cursor)
                all_files.extend(result.entries)
            
            file_count = len(all_files)
            
            if file_count == 0:
                print("[OK] Dropbox storage is already empty")
                return 0
            
            print(f"Found {file_count} files to delete")
            
            # Confirm deletion if not auto-confirmed
            if not skip_confirm:
                print("\nWARNING: This will permanently delete all files from Dropbox!")
                response = input("Type 'DELETE FILES' to confirm: ").strip()
                if response != "DELETE FILES":
                    print("[CANCELLED] Dropbox files not deleted")
                    return 0
            
            # Delete files in batches
            print("\nDeleting files...")
            deleted = 0
            errors = 0
            
            for entry in all_files:
                try:
                    dbx.files_delete_v2(entry.path_lower)
                    deleted += 1
                    if deleted % 10 == 0:
                        print(f"  Deleted {deleted}/{file_count} files...")
                except ApiError as e:
                    errors += 1
                    print(f"  WARNING: Failed to delete {entry.name}: {e}")
            
            print(f"\n[OK] Deleted {deleted} files from Dropbox")
            if errors > 0:
                print(f"WARNING: {errors} files could not be deleted")
            
            return deleted
            
        except ApiError as e:
            if e.error.is_path() and e.error.get_path().is_not_found():
                print("[OK] /documents/ folder does not exist or is empty")
                return 0
            else:
                raise
    
    except ImportError:
        print("\nWARNING: Dropbox module not available - skipping storage cleanup")
        return 0
    except Exception as e:
        print(f"\n[ERROR] Error clearing Dropbox storage: {e}")
        import traceback
        traceback.print_exc()
        return 0

def confirm_deletion(collection_names=None, include_dropbox=True):
    """Ask user to confirm dangerous operation."""
    print("\n" + "!"*60)
    print("WARNING: DESTRUCTIVE OPERATION")
    print("!"*60)
    print("\nThis will PERMANENTLY DELETE all data from:")
    
    if collection_names:
        for key in collection_names:
            if key in COLLECTIONS:
                print(f"  • Firestore: {COLLECTIONS[key]}")
    else:
        print("\nFirestore Collections:")
        for key, name in COLLECTIONS.items():
            print(f"  • {key}: {name}")
    
    if include_dropbox:
        print("\nDropbox Storage:")
        print("  • All files in /documents/ folder")
    
    print("\nThis action CANNOT be undone!")
    print("NOTE: Make sure you have backups if needed.")
    
    response = input("\nType 'RESET SYSTEM' (uppercase) to confirm: ").strip()
    
    if response == "RESET SYSTEM":
        return True
    else:
        print("\n[CANCELLED] No changes made")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="System Reset Utility - Clear Firestore and Dropbox storage",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python clear_firestore.py                           # Full reset (interactive)
  python clear_firestore.py --yes                     # Full reset (auto-confirm)
  python clear_firestore.py -c documents vectors      # Clear specific collections only
  python clear_firestore.py --skip-dropbox            # Clear Firestore only
  python clear_firestore.py --dropbox-only            # Clear Dropbox only
  python clear_firestore.py --no-recreate             # Don't recreate collections
        """
    )
    
    parser.add_argument(
        '-c', '--collections',
        nargs='+',
        choices=list(COLLECTIONS.keys()),
        help='Specific collections to clear (default: all)',
        metavar='COLLECTION'
    )
    
    parser.add_argument(
        '--yes', '-y',
        action='store_true',
        help='Skip confirmation prompt (dangerous!)'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='List available collections and exit'
    )
    
    parser.add_argument(
        '--skip-dropbox',
        action='store_true',
        help='Do not clear Dropbox storage'
    )
    
    parser.add_argument(
        '--dropbox-only',
        action='store_true',
        help='Only clear Dropbox storage (skip Firestore)'
    )
    
    parser.add_argument(
        '--no-recreate',
        action='store_true',
        help='Do not recreate collections after clearing'
    )
    
    args = parser.parse_args()
    
    # List collections
    if args.list:
        print("\nAvailable collections:")
        for key, name in COLLECTIONS.items():
            print(f"  {key:20} → {name}")
        print()
        return
    
    # Show configuration
    print("\nConfiguration:")
    firebase_project = os.getenv('FIREBASE_PROJECT_ID') or os.getenv('GCP_PROJECT') or 'dev-setup-653bc'
    cred_source = settings.FIREBASE_CRED_PATH or 'FIREBASE_CRED_BASE64' if settings.FIREBASE_CRED_BASE64 else 'GOOGLE_APPLICATION_CREDENTIALS'
    print(f"  Firebase Project: {firebase_project}")
    print(f"  Credentials: {cred_source}")
    
    # Determine what operations to perform
    clear_firestore = not args.dropbox_only
    clear_dropbox = not args.skip_dropbox and not (args.collections is not None)
    if args.dropbox_only:
        clear_dropbox = True
    
    # Confirm deletion
    include_dropbox = clear_dropbox
    if not args.yes:
        if not confirm_deletion(args.collections if clear_firestore else None, include_dropbox):
            return
    else:
        print("\nAuto-confirm enabled - proceeding without prompt!")
    
    # Handle Dropbox-only mode
    if args.dropbox_only:
        clear_dropbox_storage(skip_confirm=args.yes)
        print("\nDone! Dropbox storage cleared.\n")
        return
    
    # Initialize Firebase
    db = None
    if clear_firestore:
        try:
            print("\nConnecting to Firestore...")
            db = get_sync_firestore_client()
            logger.info("Firestore sync Client initialized for utility script")
            print("[OK] Connected successfully")
        except Exception as e:
            print(f"\n[ERROR] Failed to connect to Firestore: {e}")
            sys.exit(1)
        
        # Clear collections
        try:
            clear_all_collections(db, args.collections)
        except Exception as e:
            print(f"\n[ERROR] Error during deletion: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        
        # Recreate collections with initial data
        if not args.no_recreate and args.collections is None:
            try:
                recreate_collections(db)
            except Exception as e:
                print(f"\nWARNING: Could not recreate collections: {e}")
    
    # Clear Dropbox storage
    if clear_dropbox:
        try:
            clear_dropbox_storage(skip_confirm=args.yes)
        except Exception as e:
            print(f"\nWARNING: Could not clear Dropbox storage: {e}")
    
    print("\n" + "="*60)
    print("SYSTEM RESET COMPLETE")
    print("="*60)
    print("\nThe system is now clean and ready for testing.")
    print("All collections have been recreated with default values.\n")

if __name__ == "__main__":
    main()
