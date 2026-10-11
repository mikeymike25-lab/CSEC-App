#!/bin/bash
# ==============================================================================
# C-SEC Sentinel - Production Keystore Generation Script (Unix/macOS/Linux)
# Generates a secure, 4096-bit RSA release signing key (PKCS12 standard)
# WARNING: Store the generated keystore and passwords securely!
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../android/app"
KEYSTORE_FILE="$OUTPUT_DIR/csec-release.keystore"
KEY_ALIAS="csec-release-key"

if [ -f "$KEYSTORE_FILE" ]; then
    echo "[ERROR] Keystore already exists at '$KEYSTORE_FILE'."
    echo "Aborting to prevent accidental key overwrite."
    exit 1
fi

echo "[INFO] Generating 4096-bit RSA Production Keystore..."
echo "[INFO] Keystore Destination: $KEYSTORE_FILE"
echo "[INFO] Key Alias: $KEY_ALIAS"
echo ""

keytool -genkeypair -v -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000

echo ""
echo "=============================================================================="
echo "[SUCCESS] Release keystore successfully generated!"
echo ""
echo "Configure your environment variables for release builds:"
echo "  export RELEASE_STORE_FILE=\"$KEYSTORE_FILE\""
echo "  export RELEASE_KEY_ALIAS=\"$KEY_ALIAS\""
echo "  export RELEASE_STORE_PASSWORD=\"<your-chosen-password>\""
echo "  export RELEASE_KEY_PASSWORD=\"<your-chosen-password>\""
echo ""
echo "Keystore files (*.keystore, *.jks) are protected in .gitignore."
echo "NEVER commit signing credentials or keystores to git!"
echo "=============================================================================="
