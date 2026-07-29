#!/usr/bin/env bash
# Session-based install (adb) so HyperOS usually allows Notification access without
# "Allow restricted settings". Uninstall the old SMS-permission APK first.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
PKG="com.vishnu.finance"

if [[ ! -f "$APK" ]]; then
  echo "APK not found: $APK"
  echo "Build first: cd android && ./gradlew assembleDebug"
  exit 1
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android platform-tools and enable USB debugging."
  exit 1
fi

echo "Uninstalling previous build (clears restricted-settings flag)..."
adb uninstall "$PKG" 2>/dev/null || true

echo "Installing via adb session installer: $APK"
adb install -r "$APK"

echo ""
echo "Next on the phone:"
echo "  1. Open Vishnu Finance → Settings → Bank SMS"
echo "  2. Tap Open Notification access"
echo "  3. Enable Vishnu Finance"
echo "  4. Turn on Enable sync"
echo ""
echo "No READ_SMS permission is requested anymore."
echo "Done."
