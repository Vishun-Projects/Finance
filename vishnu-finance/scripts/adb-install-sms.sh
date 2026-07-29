#!/usr/bin/env bash
# Install debug APK via ADB and grant SMS permissions.
# Prefer this over file-manager sideload on Android 13+ / HyperOS.
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
  echo "adb not found. Install Android platform-tools and connect your phone with USB debugging."
  exit 1
fi

echo "Installing $APK ..."
adb install -r "$APK"

echo "Granting SMS permissions..."
adb shell pm grant "$PKG" android.permission.READ_SMS || true
adb shell pm grant "$PKG" android.permission.RECEIVE_SMS || true
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true

echo "Permission dump:"
adb shell dumpsys package "$PKG" | grep -E "READ_SMS|RECEIVE_SMS|granted=true" | head -20 || true

echo ""
echo "If pm grant failed: on the phone go to"
echo "  Settings → Apps → Vishnu Finance → ⋮ → Allow restricted settings"
echo "then Permissions → SMS → Allow"
echo "Done."
