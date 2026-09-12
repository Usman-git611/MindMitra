# Mitra local capability audit

This audit records the application surface inspected for the local-first Mitra controller. `lib/mitra-capabilities.ts` is the source of truth for capability metadata. The runtime registry in `components/MindCareApp.tsx` is typed as `Record<MitraCapabilityId, ...>`, so TypeScript fails if a registered capability has no executor.

Mitra does not use an OpenAI, Gemini, Claude, speech, or text-to-speech API. Requests are interpreted locally. Web voice uses the browser speech facilities when present; Android voice uses the device `SpeechRecognizer` and `TextToSpeech` bridge.

| Existing application area | Registered Mitra capabilities | Existing implementation reused | Offline |
| --- | --- | --- | --- |
| Navigation | Home, Back | Existing `go()` navigation | Yes |
| Games | Open/filter, start/recommend, resume saved round, explain instructions, add/remove/open favorites | Existing game library, progression state and `launchGame()` | Yes |
| Sessions | Open picker, start with duration, pause, resume, finish | Existing balanced-session builder, active session and summary state | Yes |
| Family and memories | Open, add member, confirmed removal, start three family game types | Existing family store, removal workflow and family game engine | Yes; remote photo cleanup retries online |
| Medicine reminders | Open, read actual next reminder, add prescribed-medicine reminder | Existing reminder store and medicine screen | Yes |
| General reminders | Multi-turn creation and status update | Existing reminder store and status function | Yes |
| Appointments | Open, read actual next appointment, multi-turn creation | Existing appointment reminder store | Yes |
| Routine | Open, read next, multi-turn add, complete, modify time | Existing routine store and sorting rules | Yes |
| Hydration | Open, read actual progress, record a glass, add reminder, update target/interval | Existing hydration and reminder state | Yes |
| Progress | Open, summarize actual results with medical disclaimer | Existing result and session history | Yes |
| Accessibility/settings | Language, text size, contrast, voice, sound, reduced motion, notifications | Existing profile settings and notification permission workflow | Yes |
| Profile/account | Edit profile, confirmed logout, confirmed account deletion | Existing onboarding, logout and deletion workflows | Local profile actions work offline; remote deletion retries online |
| Caregiver | Open caregiver dashboard | Existing authorized caregiver screen | Yes for stored data |
| Safety | Open SOS without automatically calling; refuse diagnosis/prescribing/dosage changes | Existing SOS confirmation UI and medical disclaimer | Yes |
| Assistant | Personalized greeting, help, repeat, stop speech, wellbeing suggestion | Existing profile, conversation and speech state | Yes |

## Multi-turn and verification coverage

- Required parameters are declared by each capability rather than hardcoded in the chat UI.
- The local engine collects missing duration, time, date, title, activity, family relationship, reminder type, hydration target and other parameters across turns.
- Consequential capabilities keep an awaiting-confirmation state and accept an explicit yes/no response.
- Execution responses are produced only after the runtime handler validates the current state and invokes the existing application function.
- Missing games, sessions, family records, reminders, appointments or routine items produce a failure/no-data response instead of fabricated information.
- Only the most recent 20 messages are retained in account-scoped local application data.

Run the automated registry and regression checks with:

```powershell
npm run verify:mitra
npm run verify
npm run lint
npx tsc --noEmit
```
