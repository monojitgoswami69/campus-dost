import dropbox
from dropbox import DropboxOAuth2FlowNoRedirect

# ==========================================
# 1. FILL YOUR CREDENTIALS HERE
# ==========================================
APP_KEY = ""
APP_SECRET = ""

def get_refresh_token():
    """
    Runs the OAuth flow to get a permanent REFRESH TOKEN.
    """
    # 'token_access_type="offline"' is the magic switch for permanent tokens
    auth_flow = DropboxOAuth2FlowNoRedirect(
        APP_KEY, 
        APP_SECRET, 
        token_access_type='offline'
    )

    authorize_url = auth_flow.start()
    
    print("\n" + "="*60)
    print("DROPBOX PERMANENT AUTH FLOW")
    print("="*60)
    print("1. Go to this URL in your browser:")
    print(f"\n{authorize_url}\n")
    print("2. Click 'Allow' (Log in if needed).")
    print("3. Copy the Authorization Code displayed.")
    print("-" * 60)
    
    auth_code = input("Enter the authorization code here: ").strip()

    try:
        oauth_result = auth_flow.finish(auth_code)
        
        print("\n" + "="*60)
        print("SUCCESS! Here are your PERMANENT credentials:")
        print("="*60)
        print(f"DROPBOX_APP_KEY={APP_KEY}")
        print(f"DROPBOX_APP_SECRET={APP_SECRET}")
        print(f"DROPBOX_REFRESH_TOKEN={oauth_result.refresh_token}")
        print("-" * 60)
        print("SAVE THESE in your .env file or use them in the next script.")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    get_refresh_token()
