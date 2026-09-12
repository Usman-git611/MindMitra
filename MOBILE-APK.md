# MindMitra Android APK

The Android app bundles the MindMitra interface, games, family activities, on-device progress storage, and the local Mitra capability engine. It does not require localhost, ngrok, an LLM API key, or paid AI credits after installation.

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
releases/MindMitra-1.3-debug.apk
```

## Install on a phone

1. Transfer the APK to an Android 7 or newer phone.
2. Open the file on the phone.
3. If Android asks, allow installation from the Files or browser app used to open it.
4. Tap **Install**, then open **MindMitra** from the home screen.
5. When using Mitra voice input for the first time, allow microphone access. You can change this later under **Android Settings > Apps > MindMitra > Permissions > Microphone**.

Version 1.3 uses Android's native speech recognizer and text-to-speech service plus the zero-cost local capability engine for the Mitra companion. Typed Mitra commands, games, and local data continue to work if speech recognition is unavailable.

This APK uses a development/debug signature for direct testing. A Play Store submission requires a private release signing key and an Android App Bundle (`.aab`).
