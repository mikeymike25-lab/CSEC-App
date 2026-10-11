@echo off
REM ==============================================================================
REM C-SEC Sentinel - Production Keystore Generation Script (Windows)
REM Generates a secure, 4096-bit RSA release signing key (PKCS12 standard)
REM WARNING: Store the generated keystore and passwords securely!
REM ==============================================================================

set OUTPUT_DIR=%~dp0..\android\app
set KEYSTORE_FILE=%OUTPUT_DIR%\csec-release.keystore
set KEY_ALIAS=csec-release-key

if exist "%KEYSTORE_FILE%" (
    echo [ERROR] Keystore already exists at "%KEYSTORE_FILE%".
    echo Aborting to prevent accidental key overwrite.
    exit /b 1
)

echo [INFO] Generating 4096-bit RSA Production Keystore...
echo [INFO] Keystore Destination: %KEYSTORE_FILE%
echo [INFO] Key Alias: %KEY_ALIAS%
echo.

keytool -genkeypair -v -storetype PKCS12 -keystore "%KEYSTORE_FILE%" -alias %KEY_ALIAS% -keyalg RSA -keysize 4096 -validity 10000

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] Release keystore successfully generated!
    echo.
    echo Configure your environment variables for release builds:
    echo   RELEASE_STORE_FILE=%KEYSTORE_FILE%
    echo   RELEASE_KEY_ALIAS=%KEY_ALIAS%
    echo   RELEASE_STORE_PASSWORD=^<your-chosen-password^>
    echo   RELEASE_KEY_PASSWORD=^<your-chosen-password^>
    echo.
    echo Keystore files (*.keystore, *.jks) are protected in .gitignore.
    echo NEVER commit signing credentials or keystores to git!
    echo ==============================================================================
) else (
    echo [ERROR] Failed to generate keystore. Ensure Java keytool is in your PATH.
    exit /b %ERRORLEVEL%
)
