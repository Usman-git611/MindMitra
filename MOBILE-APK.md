# MindMitra Android APK

The Android app bundles the MindMitra interface, games, family activities, and on-device progress storage. It does not require localhost or ngrok after installation.

## Build

The first build needs the local Android toolchain:

```powershell
npm run android:setup
```

Build a fresh debug-signed APK:

```powershell
npm run android:apk
```

The output is written to:

```text
releases/MindMitra-1.0-debug.apk
```

## Install on a phone

1. Transfer the APK to an Android 7 or newer phone.
2. Open the file on the phone.
3. If Android asks, allow installation from the Files or browser app used to open it.
4. Tap **Install**, then open **MindMitra** from the home screen.

This APK uses a development/debug signature for direct testing. A Play Store submission requires a private release signing key and an Android App Bundle (`.aab`).
