# MindMitra

MindMitra is an elderly-friendly, multilingual cognitive-engagement and daily-support app. It includes 40 games with 10 playable levels each, three family-memory games, routines, reminders, progress, accessibility settings, and a zero-cost local-first Mitra voice companion. Mitra uses a typed registry of real application capabilities and does not require a paid LLM API or API key.

## Run on localhost

Use Node.js 22.13 or newer, then run:

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Vinext (normally `http://localhost:3000`). Keep that terminal open while using the app.

## Open through ngrok

With the local server still running, open a second PowerShell window and run:

```powershell
ngrok http 3000
```

Open the HTTPS forwarding address shown by ngrok. The Vite configuration already permits `*.ngrok-free.dev`, so no temporary environment variable is needed.

## Verify and build

```powershell
npm run verify
npm run verify:mitra
npm run lint
npm run build
```

The local assistant capability mapping is documented in [MITRA-CAPABILITY-AUDIT.md](./MITRA-CAPABILITY-AUDIT.md).

## Android APK

Build the installable debug APK with:

```powershell
npm run android:apk
```

The result is `releases/MindMitra-1.3-debug.apk`. It contains the web interface, local Mitra capability engine, language packs, and native Android voice bridge, so it does not need localhost or ngrok after installation. Grant microphone permission when prompted to use Mitra voice input. See [MOBILE-APK.md](./MOBILE-APK.md) for phone installation instructions.

## Data and privacy

- Signed-in web progress is saved per authenticated user and synchronizes when online.
- Local-only and native-app data stays on that device.
- Family photos are private and served only to their authenticated owner.
- MindMitra supports cognitive engagement and daily activity; it is not a diagnostic or treatment device.
