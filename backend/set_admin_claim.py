"""
C-SEC Sentinel - Administrative Custom Claims Provisioning Script
Usage:
    python set_admin_claim.py --email admin@csec.local --admin true
    python set_admin_claim.py --uid <FIREBASE_UID> --admin true
    python set_admin_claim.py --email user@csec.local --admin false
"""

import argparse
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
except ImportError:
    print("[ERROR] 'firebase-admin' is not installed.")
    print("Please install it via: pip install firebase-admin")
    sys.exit(1)


def init_firebase_admin():
    """Initializes Firebase Admin SDK using service account credentials."""
    if firebase_admin._apps:
        return

    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"[INFO] Initialized Firebase Admin from file: {cred_path}")
    else:
        # Attempt default application credentials
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            print("[INFO] Initialized Firebase Admin using Application Default Credentials.")
        except Exception as e:
            print(f"[ERROR] Could not initialize Firebase Admin SDK: {e}")
            print("Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable to the path of your serviceAccountKey.json.")
            sys.exit(1)


def set_admin_claim(identifier, is_admin=True, by_email=False):
    """Sets or revokes the admin custom claim on a Firebase Auth user."""
    init_firebase_admin()

    try:
        if by_email:
            user = auth.get_user_by_email(identifier)
        else:
            user = auth.get_user(identifier)
    except Exception as e:
        print(f"[ERROR] Failed to locate user '{identifier}': {e}")
        return False

    uid = user.uid
    current_claims = user.custom_claims or {}
    
    # Update custom user claims
    new_claims = dict(current_claims)
    if is_admin:
        new_claims['admin'] = True
    else:
        new_claims.pop('admin', None)

    auth.set_custom_user_claims(uid, new_claims)
    print(f"[SUCCESS] Custom claims updated for user {uid} ({user.email}): {new_claims}")

    # Synchronize Firestore user document if available
    try:
        db = firestore.client()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        if user_doc.exists:
            new_role = 'admin' if is_admin else 'agent'
            user_ref.update({'role': new_role})
            print(f"[SUCCESS] Firestore 'users/{uid}' document synchronized: role = '{new_role}'.")
    except Exception as fe:
        print(f"[WARN] Could not update Firestore user doc: {fe}")

    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Assign or revoke Firebase Admin Custom Claims for C-SEC Sentinel.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", type=str, help="Target user email address")
    group.add_argument("--uid", type=str, help="Target Firebase Auth UID")
    
    parser.add_argument(
        "--admin",
        type=lambda x: (str(x).lower() in ['true', '1', 'yes']),
        default=True,
        help="Whether to grant (true) or revoke (false) admin privileges (default: true)"
    )

    args = parser.parse_args()

    target = args.email if args.email else args.uid
    is_by_email = bool(args.email)
    
    action_str = "Granting" if args.admin else "Revoking"
    print(f"[INFO] {action_str} admin custom claim for {'email' if is_by_email else 'uid'}: {target}")
    
    success = set_admin_claim(target, is_admin=args.admin, by_email=is_by_email)
    if success:
        print("[DONE] Operation completed successfully. The user must refresh their ID token (or re-login) for changes to take effect.")
    else:
        sys.exit(1)
