'use client';
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element -- Client hydration restores local-first data; private family photos may be data URLs or authenticated object URLs. */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_INSTRUCTIONS, CATEGORIES, createBalancedSession, createLevelOrder, difficultyFor, GAME_LIBRARY, getPlayableGame } from '../lib/games';
import { createFamilyGame, FAMILY_GAME_META } from '../lib/family-games';
import { loadLanguagePack, translateText, type TranslationDictionary, type TranslationValues } from '../lib/i18n';
import { advanceMemoryChain, createMemoryChain, failMemoryChain, isMemoryChainState, memoryChainWord, MEMORY_CHAIN_GAME_ID, validateMemoryChainAnswer } from '../lib/memory-chain';
import { LANGUAGE_LOCALES, LANGUAGE_OPTIONS } from '../lib/mitra';
import type { MitraCapabilityId } from '../lib/mitra-capabilities';
import { mitraCapabilityCount, mitraMessage, understandMitraRequest, type MitraParameters, type SupportedMitraLanguage } from '../lib/mitra-intent';
import { recordAnsweredLevel, recordMemoryChainTurn } from '../lib/progression';
import { clearLocalData, demoData, emptyData, hasPendingAccountDeletion, loadLocalData, markPendingAccountDeletion, normalizeData, saveLocalData } from '../lib/storage';
import type { AppData, Category, FamilyGameProgress, FamilyGameType, FamilyMember, GameDefinition, GameProgress, GameResult, Language, MemoryChainCategory, MemoryChainState, PlayableGame, Reminder, RoutineItem, SessionSummary } from '../lib/types';

type Screen = 'welcome' | 'onboarding' | 'greeting' | 'home' | 'games' | 'game-detail' | 'session' | 'game' | 'family' | 'medicines' | 'hydration' | 'routine' | 'appointments' | 'progress' | 'assistant' | 'settings' | 'caregiver' | 'summary';
type AuthUser = { userId: string; displayName: string; email: string; fullName: string | null };
type ActiveSession = { id: string; minutes: number; games: GameDefinition[]; index: number; startedAt: string; resultIds: string[] };
type VoiceStatus = 'idle' | 'requesting' | 'listening' | 'processing' | 'error';
type NativeSpeechDetail = { type: 'state' | 'partial' | 'result' | 'error'; value: string };
type NativeMitraBridge = { isAvailable: () => boolean; startListening: (language: string) => void; cancelListening: () => void; speak: (text: string, language: string) => void; stopSpeaking: () => void };
type MitraExecution = { ok: boolean; reply: string; replyLanguage?: Language; skipSpeech?: boolean; suggestedCapability?: MitraCapabilityId; suggestedParameters?: MitraParameters };

const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().slice(0, 10);
const relationshipOptions = ['Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Caregiver', 'Friend', 'Other'];
const newGameProgress = (gameId: number): GameProgress => ({ gameId, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, completionCount: 0, updatedAt: new Date().toISOString() });
const newFamilyProgress = (type: FamilyGameType): FamilyGameProgress => ({ type, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, completionCount: 0, updatedAt: new Date().toISOString() });
const isMindMitraNative = () => typeof navigator !== 'undefined' && navigator.userAgent.includes('MindMitraAndroid');

export default function MindMitraApp() {
  const isNativeApp = isMindMitraNative();
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('welcome');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced'>('local');
  const [toast, setToast] = useState('');
  const [showSos, setShowSos] = useState(false);
  const [selectedGame, setSelectedGame] = useState<PlayableGame | null>(null);
  const [focusedGame, setFocusedGame] = useState<GameDefinition | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSaved, setAnswerSaved] = useState(false);
  const [gameStartedAt, setGameStartedAt] = useState(0);
  const [gameSpeechPlaying, setGameSpeechPlaying] = useState(false);
  const [memoryChain, setMemoryChain] = useState<MemoryChainState | null>(null);
  const [memoryChainInput, setMemoryChainInput] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [gameCategory, setGameCategory] = useState<'All' | Category>('All');
  const [gameSearch, setGameSearch] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantReply, setAssistantReply] = useState('Hello! I’m Mitra. I’m here with you. What would you like to do?');
  const [assistantOrigin, setAssistantOrigin] = useState<Screen>('home');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [recognizedSpeech, setRecognizedSpeech] = useState('');
  const [familyQuiz, setFamilyQuiz] = useState<FamilyMember | null>(null);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [translations, setTranslations] = useState<TranslationDictionary>({});
  const [setupLanguage, setSetupLanguage] = useState<Language>('en');
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translationsRef = useRef<TranslationDictionary>({});
  const pendingVoiceResult = useRef<((value: string) => void) | null>(null);
  const gameSpeechTimer = useRef<number | null>(null);

  const language: Language = data.profile?.language ?? 'en';
  const tx = useCallback((source: string, values: TranslationValues = {}) => translateText(translations, source, values), [translations]);
  const completedGames = useMemo(() => Object.values(data.gameProgress).reduce((sum, progress) => sum + (progress.completionCount ?? 0), 0) + Object.values(data.familyGameProgress).reduce((sum, progress) => sum + (progress.completionCount ?? 0), 0), [data.gameProgress, data.familyGameProgress]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    let active = true;
    document.documentElement.lang = language;
    loadLanguagePack(language).then((pack) => {
      if (active) {
        translationsRef.current = pack;
        setTranslations(pack);
      }
    }).catch(() => {
      if (active) {
        translationsRef.current = {};
        setTranslations({});
        notify('I’m sorry, this language pack could not load. English is shown while your progress remains safe.');
      }
    });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    if (!data.assistantContext.lastReply) setAssistantReply(mitraMessage(language, 'greeting', { name: data.profile?.name.split(' ')[0] ?? '' }));
  }, [data.assistantContext.lastReply, data.profile?.name, language]);

  useEffect(() => {
    const handleNativeSpeech = (event: Event) => {
      const detail = (event as CustomEvent<NativeSpeechDetail>).detail;
      if (!detail) return;
      if (detail.type === 'state') {
        setVoiceStatus(detail.value === 'processing' ? 'processing' : detail.value === 'requesting_permission' ? 'requesting' : 'listening');
        return;
      }
      if (detail.type === 'partial') {
        setVoiceStatus('listening');
        setRecognizedSpeech(detail.value);
        return;
      }
      if (detail.type === 'result') {
        setRecognizedSpeech(detail.value);
        setVoiceStatus('processing');
        const callback = pendingVoiceResult.current;
        pendingVoiceResult.current = null;
        callback?.(detail.value);
        window.setTimeout(() => setVoiceStatus('idle'), 450);
        return;
      }
      pendingVoiceResult.current = null;
      setVoiceStatus('error');
      const message = mitraMessage(language, detail.value === 'permission_denied' ? 'microphoneDenied' : 'voiceUnavailable');
      setToast(message);
      window.setTimeout(() => { setToast(''); setVoiceStatus('idle'); }, 4200);
    };
    window.addEventListener('mindmitra:native-speech', handleNativeSpeech);
    return () => window.removeEventListener('mindmitra:native-speech', handleNativeSpeech);
  }, [language]);

  useEffect(() => {
    if (!gameSpeechTimer.current) return;
    window.clearTimeout(gameSpeechTimer.current);
    gameSpeechTimer.current = null;
    (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative?.stopSpeaking();
    window.speechSynthesis?.cancel();
    setGameSpeechPlaying(false);
  }, [language, screen, selectedGame?.id]);

  useEffect(() => {
    let active = true;
    setOnline(navigator.onLine);
    if (!isNativeApp && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);

    const goOnline = () => setOnline(true);
    const goOffline = () => {
      setOnline(false);
      setSyncStatus('local');
      setToast(translateText(translationsRef.current, 'You’re offline. Your progress is saved and will sync later.'));
      window.setTimeout(() => setToast(''), 3200);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const bootstrap = async () => {
      let user: AuthUser | null = null;
      if (!isNativeApp) {
        try {
          const authResponse = await fetch('/api/auth/me');
          if (authResponse.ok) ({ user } = await authResponse.json() as { user: AuthUser | null });
        } catch { /* an offline web session safely uses guest-local data */ }
      }
      let loaded = loadLocalData(user?.userId);
      if (user) {
        let deletionPending = hasPendingAccountDeletion(user.userId);
        if (deletionPending) {
          try {
            const deleted = await Promise.all([
              fetch('/api/sync', { method: 'DELETE' }),
              fetch('/api/family-photo', { method: 'DELETE' }),
            ]);
            if (deleted.every((response) => response.ok)) {
              markPendingAccountDeletion(user.userId, false);
              deletionPending = false;
            }
          } catch { /* retry this account deletion the next time it is online */ }
          loaded = emptyData;
        }
        try {
          const response = deletionPending ? null : await fetch('/api/sync');
          if (response?.ok) {
            const remote = await response.json() as { data: AppData | null; updatedAt?: string };
            if (remote.data && (!loaded.profile || (remote.updatedAt ?? '') > (loaded.updatedAt ?? ''))) loaded = normalizeData(remote.data);
          }
        } catch { /* account-scoped local data remains authoritative offline */ }
      }
      if (!active) return;
      setAuthUser(user);
      setData(loaded);
      const quick = new URLSearchParams(window.location.search).get('open');
      if (quick === 'sos') setShowSos(true);
      if (loaded.profile) setScreen(quick === 'games' || quick === 'routine' ? quick : loaded.profile.role === 'caregiver' ? 'caregiver' : 'home');
      setReady(true);
    };
    void bootstrap();

    return () => {
      active = false;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [isNativeApp]);

  useEffect(() => {
    if (!ready) return;
    saveLocalData(data, authUser?.userId);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (!authUser || !data.profile || data.profile.id.startsWith('demo') || !online) return;
    setSyncStatus('syncing');
    syncTimer.current = setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      try {
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { ...data, updatedAt }, updatedAt }) });
        if (!response.ok) { setSyncStatus('local'); return; }
        const saved = await response.json() as { saved?: boolean };
        if (saved.saved !== false) { setSyncStatus('synced'); return; }
        const latestResponse = await fetch('/api/sync');
        const latest = latestResponse.ok ? await latestResponse.json() as { data: AppData | null } : null;
        if (latest?.data) setData(normalizeData(latest.data));
        setSyncStatus(latest?.data ? 'synced' : 'local');
      } catch { setSyncStatus('local'); }
    }, 700);
  }, [data, ready, authUser, online]);

  useEffect(() => {
    if (!ready) return;
    const checkReminders = () => {
      const time = new Date().toTimeString().slice(0, 5);
      const due = data.reminders.find((item) => item.status === 'pending' && item.time === time && (!item.date || item.date === today()));
      if (!due) return;
      setNotificationMessage(due.title);
      if ('Notification' in window && Notification.permission === 'granted') new Notification(tx('MindMitra reminder'), { body: tx(due.title), icon: '/icon-192.png' });
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [data.reminders, ready, tx]);

  const updateData = (updater: (current: AppData) => AppData) => setData((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: data.profile?.reducedMotion ? 'auto' : 'smooth' }); };

  const startDemo = (preferredLanguage: Language) => {
    const localizedDemo = structuredClone(demoData);
    if (localizedDemo.profile) localizedDemo.profile.language = preferredLanguage;
    window.localStorage.setItem('mindmitra-preferred-language', preferredLanguage);
    setData(localizedDemo);
    setScreen('home');
    void loadLanguagePack(preferredLanguage).then((pack) => notify(translateText(pack, 'Demo account opened. Changes stay separate on this device.')));
  };

  const beginOnboarding = (role: 'elder' | 'caregiver' = 'elder', preferredLanguage: Language = language) => {
    setSetupLanguage(preferredLanguage);
    setData((current) => ({ ...current, profile: current.profile ? { ...current.profile, role } : null }));
    setScreen('onboarding');
  };

  const completeOnboarding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') ?? '').trim();
    const emergencyPhone = String(form.get('emergencyPhone') ?? '').trim();
    if (phone.replace(/\D/g, '') === emergencyPhone.replace(/\D/g, '')) {
      notify(tx('Personal and emergency phone numbers must be different.'));
      return;
    }
    const name = String(form.get('name') ?? '').trim();
    const role = String(form.get('role') ?? 'elder') as 'elder' | 'caregiver';
    const previous = data.profile;
    const profile = {
      id: previous?.id ?? authUser?.userId ?? uid('local-user'), name, dateOfBirth: String(form.get('dateOfBirth') ?? ''), gender: String(form.get('gender') ?? ''),
      phone, email: String(form.get('email') ?? ''), language: String(form.get('language') ?? 'en') as Language, role,
      emergencyName: String(form.get('emergencyName') ?? ''), emergencyPhone, emergencyRelationship: String(form.get('relationship') ?? ''),
      textSize: previous?.textSize ?? 'normal' as const, highContrast: previous?.highContrast ?? false, voice: previous?.voice ?? true, sound: previous?.sound ?? true, reducedMotion: previous?.reducedMotion ?? false, sessionPreference: previous?.sessionPreference ?? 15,
      caregiverCode: previous?.caregiverCode ?? `${name.split(' ')[0].toUpperCase().slice(0, 5)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    window.localStorage.setItem('mindmitra-preferred-language', profile.language);
    updateData((current) => ({ ...current, profile }));
    setScreen(role === 'caregiver' ? 'caregiver' : 'greeting');
  };

  const speak = (text: string, voiceLanguage: Language = language) => {
    if (!data.profile?.voice) return;
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    if (isNativeApp && nativeBridge) {
      nativeBridge.speak(text, LANGUAGE_LOCALES[voiceLanguage]);
      return;
    }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_LOCALES[voiceLanguage];
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    nativeBridge?.stopSpeaking();
    window.speechSynthesis?.cancel();
  };

  const stopGameSpeech = () => {
    if (gameSpeechTimer.current) window.clearTimeout(gameSpeechTimer.current);
    gameSpeechTimer.current = null;
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    nativeBridge?.stopSpeaking();
    window.speechSynthesis?.cancel();
    setGameSpeechPlaying(false);
  };

  const speakGameText = (text: string) => {
    stopGameSpeech();
    const spokenText = text.trim();
    if (!spokenText) return;
    const locale = LANGUAGE_LOCALES[language];
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    setGameSpeechPlaying(true);
    if (isNativeApp && nativeBridge) {
      nativeBridge.speak(spokenText, locale);
      gameSpeechTimer.current = window.setTimeout(() => setGameSpeechPlaying(false), Math.max(1800, Math.min(14000, spokenText.length * 72)));
      return;
    }
    if (!('speechSynthesis' in window)) {
      setGameSpeechPlaying(false);
      notify(tx('Audio is not available on this device.'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = locale;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()))
      ?? voices.find((voice) => voice.default)
      ?? null;
    utterance.onend = () => setGameSpeechPlaying(false);
    utterance.onerror = () => { setGameSpeechPlaying(false); notify(tx('Audio is not available on this device.')); };
    window.speechSynthesis.speak(utterance);
  };

  const cancelListening = () => {
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    nativeBridge?.cancelListening();
    pendingVoiceResult.current = null;
    setVoiceStatus('idle');
  };

  const listen = (onResult: (value: string) => void) => {
    setRecognizedSpeech('');
    setVoiceStatus('requesting');
    const nativeBridge = (window as unknown as { MindMitraNative?: NativeMitraBridge }).MindMitraNative;
    if (isNativeApp && nativeBridge) {
      if (!nativeBridge.isAvailable()) {
        setVoiceStatus('error');
        notify(mitraMessage(language, 'voiceUnavailable'));
        return;
      }
      pendingVoiceResult.current = onResult;
      nativeBridge.startListening(LANGUAGE_LOCALES[language]);
      return;
    }
    const browser = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) { setVoiceStatus('error'); notify(mitraMessage(language, 'voiceUnavailable')); return; }
    const recognition = new Recognition();
    recognition.lang = LANGUAGE_LOCALES[language];
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceStatus('listening');
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedSpeech(transcript);
      setVoiceStatus('processing');
      onResult(transcript);
    };
    recognition.onerror = () => { setVoiceStatus('error'); notify(tx('I couldn’t hear that. Please try again or type instead.')); };
    recognition.onend = () => window.setTimeout(() => setVoiceStatus('idle'), 350);
    recognition.start();
  };

  const openAssistant = () => {
    const origin = screen === 'assistant' ? assistantOrigin : screen;
    setAssistantOrigin(origin);
    const greeting = mitraMessage(language, 'greeting', { name: data.profile?.name.split(' ')[0] ?? '' });
    const timestamp = new Date().toISOString();
    updateData((current) => ({
      ...current,
      conversations: [...current.conversations, { id: uid('message'), role: 'assistant' as const, text: greeting, timestamp }].slice(-20),
      assistantContext: { ...current.assistantContext, lastReply: greeting, currentScreen: origin, updatedAt: timestamp },
    }));
    setAssistantReply(greeting);
    go('assistant');
    window.setTimeout(() => speak(greeting), 120);
  };

  const gameProgressFor = (gameId: number) => data.gameProgress[String(gameId)] ?? newGameProgress(gameId);
  const familyProgressFor = (type: FamilyGameType) => data.familyGameProgress[type] ?? newFamilyProgress(type);

  const openGame = (game: GameDefinition) => launchGame(game);

  const launchGame = (game: GameDefinition, requestedLevel?: number, replay = false, freshAttempt = false, orderOverride?: number[], answeredOverride?: number[]) => {
    const progress = gameProgressFor(game.id);
    const level = requestedLevel ?? progress.inProgress?.level ?? progress.currentLevel;
    const savedRound = progress.inProgress;
    const resumingRound = !freshAttempt && savedRound?.level === level;
    const continuingRun = Boolean(savedRound && requestedLevel === savedRound.level + 1);
    const replayRun = orderOverride ? replay : (resumingRound || continuingRun) ? Boolean(savedRound?.replay) : replay;
    const order = orderOverride ?? ((resumingRound || continuingRun) ? savedRound?.order : undefined) ?? createLevelOrder(replayRun);
    const answeredLevels = answeredOverride ?? ((resumingRound || continuingRun) ? savedRound?.answeredLevels : undefined) ?? progress.completedLevels.filter((completedLevel) => completedLevel < level);
    const generated = getPlayableGame(game, level, replayRun, order[level - 1] ?? level);
    const savedState = resumingRound ? savedRound?.state : undefined;
    const playable = savedState ? { ...generated, ...savedState } : generated;
    const restoredMemoryChain = game.id === MEMORY_CHAIN_GAME_ID && isMemoryChainState(savedState?.memoryChain) ? savedState.memoryChain : null;
    const restoredAnswer = resumingRound ? savedRound?.selectedAnswer ?? '' : '';
    const startedAt = resumingRound ? savedRound?.startedAt ?? new Date().toISOString() : new Date().toISOString();
    setFocusedGame(game);
    setFamilyQuiz(null);
    setSelectedGame(playable);
    setMemoryChain(restoredMemoryChain);
    setMemoryChainInput(restoredMemoryChain?.lastInput ?? '');
    setSelectedAnswer(restoredAnswer);
    setAnswerSaved(Boolean(resumingRound && savedRound?.phase === 'feedback'));
    setGameStartedAt(new Date(startedAt).getTime() || Date.now());
    updateData((current) => ({
      ...current,
      gameProgress: {
        ...current.gameProgress,
        [String(game.id)]: { ...(current.gameProgress[String(game.id)] ?? newGameProgress(game.id)), currentLevel: level, inProgress: { level, selectedAnswer: restoredAnswer, startedAt, phase: resumingRound ? savedRound?.phase ?? 'question' : 'question', replay: replayRun, order, answeredLevels, state: { prompt: playable.prompt, promptValues: playable.promptValues, options: playable.options, answer: playable.answer, memoryChain: restoredMemoryChain ?? undefined } }, updatedAt: new Date().toISOString() },
      },
    }));
    go('game');
  };

  const startSession = (minutes: number) => {
    const games = createBalancedSession(minutes);
    const session = { id: uid('session'), minutes, games, index: 0, startedAt: new Date().toISOString(), resultIds: [] };
    setActiveSession(session);
    const progress = gameProgressFor(games[0].id);
    launchGame(games[0], progress.currentLevel);
  };

  const saveGameAnswer = (answer: string) => {
    if (!selectedGame || !answer || answerSaved) return;
    setSelectedAnswer(answer);
    const correct = answer === selectedGame.answer;
    const difficulty = difficultyFor(selectedGame.category, data.results);
    const result: GameResult = {
      id: uid('result'), gameId: selectedGame.id, game: selectedGame.name, category: selectedGame.category, difficulty,
      score: correct ? (difficulty === 'Hard' ? 120 : difficulty === 'Medium' ? 110 : 100) : 25,
      accuracy: correct ? 100 : 0, responseTime: Math.max(1, Math.round((Date.now() - gameStartedAt) / 1000)), mistakes: correct ? 0 : 1,
      date: new Date().toISOString(), sessionId: activeSession?.id, level: selectedGame.level, replay: selectedGame.replay,
    };
    updateData((current) => {
      if (selectedGame.familyType) {
        const old = current.familyGameProgress[selectedGame.familyType] ?? newFamilyProgress(selectedGame.familyType);
        return {
          ...current,
          results: [...current.results, result],
          familyGameProgress: {
            ...current.familyGameProgress,
            [selectedGame.familyType]: recordAnsweredLevel(old, { level: selectedGame.level, selectedAnswer: answer, startedAt: new Date(gameStartedAt).toISOString(), replay: selectedGame.replay, state: { prompt: selectedGame.prompt, promptValues: selectedGame.promptValues, options: selectedGame.options, answer: selectedGame.answer, memberId: familyQuiz?.id } }),
          },
        };
      }
      const old = current.gameProgress[String(selectedGame.id)] ?? newGameProgress(selectedGame.id);
      return {
        ...current,
        results: [...current.results, result],
        gameProgress: {
          ...current.gameProgress,
          [String(selectedGame.id)]: recordAnsweredLevel(old, { level: selectedGame.level, selectedAnswer: answer, startedAt: new Date(gameStartedAt).toISOString(), replay: selectedGame.replay, state: { prompt: selectedGame.prompt, promptValues: selectedGame.promptValues, options: selectedGame.options, answer: selectedGame.answer } }),
        },
      };
    });
    if (activeSession) setActiveSession({ ...activeSession, resultIds: [...activeSession.resultIds, result.id] });
    setAnswerSaved(true);
    if (data.profile?.sound) speak(correct ? tx('Well done — level complete!') : tx('The correct answer is {answer}.', { answer: tx(selectedGame.answer) }));
  };

  const memoryChainRoundState = (round: MemoryChainState, game: PlayableGame) => ({
    prompt: game.prompt,
    promptValues: game.promptValues,
    options: game.options,
    answer: game.answer,
    memoryChain: round,
  });

  const saveMemoryChainState = (round: MemoryChainState, game: PlayableGame) => {
    const level = Math.min(10, round.score + 1);
    const startedAt = new Date(gameStartedAt || Date.now()).toISOString();
    updateData((current) => {
      const old = current.gameProgress[String(MEMORY_CHAIN_GAME_ID)] ?? newGameProgress(MEMORY_CHAIN_GAME_ID);
      return {
        ...current,
        gameProgress: {
          ...current.gameProgress,
          [String(MEMORY_CHAIN_GAME_ID)]: {
            ...old,
            currentLevel: level,
            inProgress: {
              ...(old.inProgress ?? { level, startedAt }),
              level,
              startedAt,
              phase: round.phase === 'show' || round.phase === 'recall' ? 'question' : 'feedback',
              selectedAnswer: round.lastInput,
              state: memoryChainRoundState(round, game),
            },
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const startMemoryChainCategory = (category: MemoryChainCategory) => {
    const definition = focusedGame ?? GAME_LIBRARY.find((game) => game.id === MEMORY_CHAIN_GAME_ID);
    if (!definition) return;
    const progress = gameProgressFor(MEMORY_CHAIN_GAME_ID);
    const round = createMemoryChain(category, Math.random, progress.currentLevel - 1);
    const game = getPlayableGame(definition, progress.currentLevel, Boolean(progress.inProgress?.replay));
    setSelectedGame(game);
    setMemoryChain(round);
    setMemoryChainInput('');
    setSelectedAnswer('');
    setAnswerSaved(false);
    setGameStartedAt(Date.now());
    saveMemoryChainState(round, game);
  };

  const prepareMemoryChainRecall = () => {
    if (!memoryChain || !selectedGame || memoryChain.phase !== 'show') return;
    const next = { ...memoryChain, phase: 'recall' as const };
    setMemoryChain(next);
    setMemoryChainInput('');
    saveMemoryChainState(next, selectedGame);
  };

  const submitMemoryChainAnswer = (provided = memoryChainInput) => {
    if (!memoryChain || !selectedGame || memoryChain.phase !== 'recall' || !provided.trim()) return;
    const checked = validateMemoryChainAnswer(memoryChain, provided);
    const difficulty = difficultyFor('Memory', data.results);
    const result: GameResult = {
      id: uid('result'), gameId: MEMORY_CHAIN_GAME_ID, game: selectedGame.name, category: 'Memory', difficulty,
      score: checked.correct ? (difficulty === 'Hard' ? 120 : difficulty === 'Medium' ? 110 : 100) : 25,
      accuracy: checked.correct ? 100 : 0, responseTime: Math.max(1, Math.round((Date.now() - gameStartedAt) / 1000)), mistakes: checked.correct ? 0 : 1,
      date: new Date().toISOString(), sessionId: activeSession?.id, level: selectedGame.level, replay: selectedGame.replay,
    };
    const round = checked.correct
      ? advanceMemoryChain(memoryChain, checked.userWordId!)
      : failMemoryChain(memoryChain, provided, checked.reason ?? 'sequence');
    const nextLevel = checked.correct ? Math.min(10, selectedGame.level + 1) : selectedGame.level;
    const nextGame = { ...selectedGame, level: nextLevel };
    const startedAt = new Date(gameStartedAt || Date.now()).toISOString();
    updateData((current) => {
      const old = current.gameProgress[String(MEMORY_CHAIN_GAME_ID)] ?? newGameProgress(MEMORY_CHAIN_GAME_ID);
      return {
        ...current,
        results: [...current.results, result],
        gameProgress: {
          ...current.gameProgress,
          [String(MEMORY_CHAIN_GAME_ID)]: recordMemoryChainTurn(old, {
            level: selectedGame.level,
            selectedAnswer: provided,
            startedAt,
            replay: selectedGame.replay,
            state: memoryChainRoundState(round, nextGame),
          }, checked.correct),
        },
      };
    });
    if (activeSession) setActiveSession({ ...activeSession, resultIds: [...activeSession.resultIds, result.id] });
    setSelectedGame(nextGame);
    setMemoryChain(round);
    setMemoryChainInput('');
    setAnswerSaved(round.phase === 'complete' || round.phase === 'failed');
    setGameStartedAt(Date.now());
    if (data.profile?.sound) speakGameText(tx(checked.correct ? 'Correct — the chain is growing!' : 'That sequence was not quite right.'));
  };

  const restartMemoryChain = () => {
    if (memoryChain) startMemoryChainCategory(memoryChain.category);
  };

  const continueAfterGame = () => {
    if (!selectedGame) return;
    if (!activeSession) {
      if (selectedGame.level < 10) {
        if (selectedGame.familyType) startFamilyGame(selectedGame.familyType, selectedGame.level + 1, Boolean(selectedGame.replay));
        else {
          const game = focusedGame ?? GAME_LIBRARY.find((item) => item.id === selectedGame.id);
          if (game) launchGame(game, selectedGame.level + 1, Boolean(selectedGame.replay));
        }
        return;
      }
      updateData((current) => selectedGame.familyType ? ({
        ...current,
        familyGameProgress: {
          ...current.familyGameProgress,
          [selectedGame.familyType]: { ...(current.familyGameProgress[selectedGame.familyType] ?? newFamilyProgress(selectedGame.familyType)), inProgress: undefined, currentLevel: 10, updatedAt: new Date().toISOString() },
        },
      }) : ({
        ...current,
        gameProgress: {
          ...current.gameProgress,
          [String(selectedGame.id)]: { ...(current.gameProgress[String(selectedGame.id)] ?? newGameProgress(selectedGame.id)), inProgress: undefined, currentLevel: 10, updatedAt: new Date().toISOString() },
        },
      }));
      go(selectedGame.familyType ? 'family' : 'game-detail');
      return;
    }
    const closeCurrentRound = (current: AppData): AppData => selectedGame.familyType ? ({
      ...current,
      familyGameProgress: {
        ...current.familyGameProgress,
        [selectedGame.familyType]: { ...(current.familyGameProgress[selectedGame.familyType] ?? newFamilyProgress(selectedGame.familyType)), inProgress: undefined, updatedAt: new Date().toISOString() },
      },
    }) : ({
      ...current,
      gameProgress: {
        ...current.gameProgress,
        [String(selectedGame.id)]: { ...(current.gameProgress[String(selectedGame.id)] ?? newGameProgress(selectedGame.id)), inProgress: undefined, updatedAt: new Date().toISOString() },
      },
    });
    const nextIndex = activeSession.index + 1;
    if (nextIndex < activeSession.games.length) {
      updateData(closeCurrentRound);
      const nextSession = { ...activeSession, index: nextIndex };
      setActiveSession(nextSession);
      const nextGame = nextSession.games[nextIndex];
      launchGame(nextGame, gameProgressFor(nextGame.id).currentLevel);
      return;
    }
    const sessionResults = data.results.filter((result) => activeSession.resultIds.includes(result.id));
    const accuracy = sessionResults.length ? Math.round(sessionResults.reduce((sum, result) => sum + result.accuracy, 0) / sessionResults.length) : 0;
    const summary: SessionSummary = { id: activeSession.id, plannedMinutes: activeSession.minutes, startedAt: activeSession.startedAt, endedAt: new Date().toISOString(), gamesCompleted: activeSession.games.length, accuracy };
    updateData((current) => {
      const closed = closeCurrentRound(current);
      return { ...closed, sessions: [...closed.sessions, summary] };
    });
    setLastSummary(summary);
    setActiveSession(null);
    go('summary');
  };

  const startFamilyGame = (type: FamilyGameType = 'who', requestedLevel?: number, replay = false, freshAttempt = false, orderOverride?: number[], answeredOverride?: number[]) => {
    if (!data.family.length) { notify(tx('Add at least one family member first.')); return; }
    const progress = familyProgressFor(type);
    const level = requestedLevel ?? progress.inProgress?.level ?? progress.currentLevel;
    const savedRound = progress.inProgress;
    const resumingRound = !freshAttempt && savedRound?.level === level;
    const continuingRun = Boolean(savedRound && requestedLevel === savedRound.level + 1);
    const replayRun = orderOverride ? replay : (resumingRound || continuingRun) ? Boolean(savedRound?.replay) : replay;
    const order = orderOverride ?? ((resumingRound || continuingRun) ? savedRound?.order : undefined) ?? createLevelOrder(replayRun);
    const answeredLevels = answeredOverride ?? ((resumingRound || continuingRun) ? savedRound?.answeredLevels : undefined) ?? progress.completedLevels.filter((completedLevel) => completedLevel < level);
    const restoredAnswer = resumingRound ? savedRound?.selectedAnswer ?? '' : '';
    const generated = createFamilyGame(type, level, data.family, order[level - 1] ?? level);
    const savedState = resumingRound ? savedRound?.state : undefined;
    const member = savedState?.memberId ? data.family.find((item) => item.id === savedState.memberId) ?? generated.member : generated.member;
    const game = savedState ? { ...generated.game, ...savedState } : generated.game;
    game.replay = replayRun;
    const startedAt = resumingRound ? savedRound?.startedAt ?? new Date().toISOString() : new Date().toISOString();
    setFocusedGame(null);
    setSelectedGame(game);
    setMemoryChain(null);
    setMemoryChainInput('');
    setFamilyQuiz(member);
    setSelectedAnswer(restoredAnswer);
    setAnswerSaved(Boolean(resumingRound && savedRound?.phase === 'feedback'));
    setGameStartedAt(new Date(startedAt).getTime() || Date.now());
    updateData((current) => ({
      ...current,
      familyGameProgress: {
        ...current.familyGameProgress,
        [type]: { ...(current.familyGameProgress[type] ?? newFamilyProgress(type)), currentLevel: level, inProgress: { level, selectedAnswer: restoredAnswer, startedAt, phase: resumingRound ? savedRound?.phase ?? 'question' : 'question', replay: replayRun, order, answeredLevels, state: { prompt: game.prompt, promptValues: game.promptValues, options: game.options, answer: game.answer, memberId: member.id } }, updatedAt: new Date().toISOString() },
      },
    }));
    go('game');
  };

  const beginGameReplay = (game: GameDefinition) => {
    const order = createLevelOrder(true);
    updateData((current) => {
      const old = current.gameProgress[String(game.id)] ?? newGameProgress(game.id);
      return { ...current, gameProgress: { ...current.gameProgress, [String(game.id)]: { ...old, currentLevel: 1, unlockedLevel: 1, completedLevels: [], replayCount: old.replayCount + 1, inProgress: undefined, updatedAt: new Date().toISOString() } } };
    });
    launchGame(game, 1, true, true, order, []);
  };

  const beginFamilyReplay = (type: FamilyGameType) => {
    const order = createLevelOrder(true);
    updateData((current) => {
      const old = current.familyGameProgress[type] ?? newFamilyProgress(type);
      return { ...current, familyGameProgress: { ...current.familyGameProgress, [type]: { ...old, currentLevel: 1, unlockedLevel: 1, completedLevels: [], replayCount: old.replayCount + 1, inProgress: undefined, updatedAt: new Date().toISOString() } } };
    });
    startFamilyGame(type, 1, true, true, order, []);
  };

  const exitCurrentGame = () => {
    setActiveSession(null);
    go(selectedGame?.familyType ? 'family' : 'game-detail');
  };

  const storeFamilyMember = (member: Omit<FamilyMember, 'id' | 'createdAt'>) => {
    const stored: FamilyMember = { ...member, id: uid('family'), createdAt: new Date().toISOString() };
    updateData((current) => ({ ...current, family: [...current.family, stored] }));
    return stored;
  };

  const addFamilyMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('photo');
    let photo = '';
    let photoKey = '';
    if (file instanceof File && file.size) {
      if (file.size > 5 * 1024 * 1024) { notify(tx('Please choose a photo smaller than 5 MB.')); return; }
      photo = await fileToDataUrl(file);
      if (authUser && online && !data.profile?.id.startsWith('demo')) {
        try {
          const upload = new FormData(); upload.set('photo', file);
          const response = await fetch('/api/family-photo', { method: 'POST', body: upload });
          if (response.ok) { const stored = await response.json() as { id: string; url: string }; photo = stored.url; photoKey = stored.id; }
        } catch { notify(tx('The photo is safely stored on this device and will be uploaded later.')); }
      }
    }
    const member = storeFamilyMember({ name: String(form.get('name') ?? ''), relationship: String(form.get('relationship') ?? ''), nickname: String(form.get('nickname') ?? ''), photo, photoKey });
    formElement.reset();
    notify(tx('{name} was added to My Family.', { name: member.name }));
  };

  const removeFamilyMember = async (member: FamilyMember) => {
    if (member.photoKey && authUser && online) await fetch(`/api/family-photo?id=${encodeURIComponent(member.photoKey)}`, { method: 'DELETE' }).catch(() => undefined);
    updateData((current) => ({
      ...current,
      family: current.family.filter((item) => item.id !== member.id),
      familyGameProgress: Object.fromEntries(Object.entries(current.familyGameProgress).map(([type, progress]) => [type, progress.inProgress?.state?.memberId === member.id ? { ...progress, inProgress: undefined } : progress])),
    }));
  };

  const createReminderRecord = (type: Reminder['type'], title: string, time: string, details: Partial<Omit<Reminder, 'id' | 'type' | 'title' | 'time' | 'status' | 'createdAt'>> = {}) => {
    const reminder: Reminder = { id: uid(type), type, title: title.trim(), time, status: 'pending', createdAt: new Date().toISOString(), ...details };
    updateData((current) => ({ ...current, reminders: [...current.reminders, reminder] }));
    return reminder;
  };

  const addReminder = (event: FormEvent<HTMLFormElement>, type: Reminder['type']) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    createReminderRecord(type, String(form.get('title') ?? ''), String(form.get('time') ?? ''), { date: String(form.get('date') ?? ''), dosage: String(form.get('dosage') ?? ''), frequency: String(form.get('frequency') ?? ''), startDate: String(form.get('startDate') ?? ''), endDate: String(form.get('endDate') ?? ''), location: String(form.get('location') ?? ''), notes: String(form.get('notes') ?? '') });
    formElement.reset();
    notify(tx('Reminder saved.'));
  };

  const setReminderStatus = (id: string, status: Reminder['status']) => updateData((current) => ({ ...current, reminders: current.reminders.map((item) => item.id === id ? { ...item, status } : item) }));

  const createRoutineRecord = (activity: string, time: string) => {
    const item: RoutineItem = { id: uid('routine'), time, activity: activity.trim(), done: false };
    updateData((current) => ({ ...current, routine: [...current.routine, item].sort((a, b) => a.time.localeCompare(b.time)) }));
    return item;
  };

  const setRoutineCompletion = (id: string, done: boolean) => updateData((current) => ({ ...current, routine: current.routine.map((item) => item.id === id ? { ...item, done } : item) }));
  const setRoutineTime = (id: string, time: string) => updateData((current) => ({ ...current, routine: current.routine.map((item) => item.id === id ? { ...item, time } : item).sort((a, b) => a.time.localeCompare(b.time)) }));
  const recordHydrationGlass = () => {
    const glasses = Math.min(data.hydration.target, data.hydration.glasses + 1);
    updateData((current) => ({ ...current, hydration: { ...current.hydration, glasses, date: today() } }));
    return glasses;
  };
  const updateHydrationPlan = (plan: Partial<Pick<AppData['hydration'], 'interval' | 'wakeTime' | 'sleepTime' | 'target'>>) => updateData((current) => ({ ...current, hydration: { ...current.hydration, ...plan } }));

  const addRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    createRoutineRecord(String(form.get('activity') ?? ''), String(form.get('time') ?? ''));
    formElement.reset();
  };

  const chooseAssistantGame = (category?: Category, query = '') => {
    const candidates = GAME_LIBRARY.filter((game) => !category || game.category === category);
    const ignored = new Set(['start', 'open', 'show', 'play', 'game', 'games', 'please', 'mitra', 'memory', 'easy', 'medium', 'hard']);
    const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word));
    return candidates.slice().sort((a, b) => {
      const score = (game: GameDefinition) => words.reduce((total, word) => total + (game.name.toLowerCase().includes(word) ? 2 : game.instruction.toLowerCase().includes(word) ? 1 : 0), 0)
        + (data.gameProgress[String(game.id)]?.inProgress ? 4 : 0)
        - (data.gameProgress[String(game.id)]?.completedLevels.length ?? 0) / 20;
      return score(b) - score(a) || a.id - b.id;
    })[0];
  };

  const executeMitraCapability = (capabilityId: MitraCapabilityId, parameters: MitraParameters): MitraExecution => {
    const success = (reply: string, extra: Partial<MitraExecution> = {}): MitraExecution => ({ ok: true, reply, ...extra });
    const failure = (reply: string): MitraExecution => ({ ok: false, reply });
    const named = <T extends { name?: string; title?: string; activity?: string }>(items: T[], query: string) => {
      const sought = query.trim().toLocaleLowerCase();
      return items.find((item) => [item.name, item.title, item.activity].some((value) => value?.toLocaleLowerCase() === sought))
        ?? items.find((item) => [item.name, item.title, item.activity].some((value) => value?.toLocaleLowerCase().includes(sought) || sought.includes(value?.toLocaleLowerCase() ?? '\0')));
    };
    const screenReply = (target: Screen, label: string) => { go(target); return success(mitraMessage(language, 'screenOpened', { screen: tx(label) })); };
    const readMedicine = () => data.reminders.filter((item) => item.type === 'medicine' && item.status === 'pending').sort((a, b) => a.time.localeCompare(b.time))[0];
    const readAppointment = () => data.reminders.filter((item) => item.type === 'appointment' && item.status === 'pending').sort((a, b) => `${a.date ?? ''}${a.time}`.localeCompare(`${b.date ?? ''}${b.time}`))[0];

    // The type makes the build fail whenever a static capability is added
    // without a validated executor over the existing application functions.
    const runtimeCapabilityRegistry: Record<MitraCapabilityId, () => MitraExecution> = {
      'navigation.home': () => screenReply('home', 'Home'),
      'navigation.back': () => screenReply(assistantOrigin === 'assistant' ? 'home' : assistantOrigin, 'previous page'),
      'games.open': () => { const category = parameters.category as Category | undefined; setGameCategory(category ?? 'All'); go('games'); return success(mitraMessage(language, 'gamesOpened', { category: category ? tx(category) : tx('available') })); },
      'games.start': () => { const game = chooseAssistantGame(parameters.category as Category | undefined, String(parameters.gameQuery ?? '')); if (!game) return failure(mitraMessage(language, 'noGame')); launchGame(game); return success(mitraMessage(language, 'gameStarted', { game: tx(game.name) })); },
      'games.resume': () => { const saved = GAME_LIBRARY.find((game) => data.gameProgress[String(game.id)]?.inProgress); if (!saved) return failure(mitraMessage(language, 'noGame')); launchGame(saved); return success(mitraMessage(language, 'gameResumed', { game: tx(saved.name) })); },
      'games.explain': () => selectedGame ? success(mitraMessage(language, 'gameInstructions', { instruction: tx(selectedGame.instruction) })) : failure(mitraMessage(language, 'noGame')),
      'games.favorite.add': () => { const gameId = selectedGame?.id ?? focusedGame?.id; if (!gameId) return failure(mitraMessage(language, 'noGame')); updateData((current) => ({ ...current, favorites: Array.from(new Set([...current.favorites, gameId])) })); return success(mitraMessage(language, 'favoriteAdded')); },
      'games.favorite.remove': () => { const gameId = selectedGame?.id ?? focusedGame?.id; if (!gameId) return failure(mitraMessage(language, 'noGame')); updateData((current) => ({ ...current, favorites: current.favorites.filter((id) => id !== gameId) })); return success(mitraMessage(language, 'favoriteRemoved')); },
      'games.favorites.open': () => { setGameCategory('All'); setGameSearch(''); go('games'); return success(mitraMessage(language, 'favoritesOpened')); },
      'games.my.add': () => { const gameId = selectedGame?.id ?? focusedGame?.id; if (!gameId) return failure(mitraMessage(language, 'noGame')); updateData((current) => ({ ...current, myGames: Array.from(new Set([...current.myGames, gameId])) })); return success(mitraMessage(language, 'myGamesAdded')); },
      'games.my.remove': () => { const gameId = selectedGame?.id ?? focusedGame?.id; if (!gameId) return failure(mitraMessage(language, 'noGame')); updateData((current) => ({ ...current, myGames: current.myGames.filter((id) => id !== gameId) })); return success(mitraMessage(language, 'myGamesRemoved')); },
      'games.my.open': () => { setGameCategory('All'); setGameSearch(''); go('games'); return success(mitraMessage(language, 'myGamesOpened')); },
      'session.open': () => screenReply('session', 'Start Session'),
      'session.start': () => { const minutes = Number(parameters.minutes); if (!Number.isFinite(minutes) || minutes < 1) return failure(mitraMessage(language, 'actionFailed')); startSession(minutes); return success(mitraMessage(language, 'sessionStarted', { minutes })); },
      'session.pause': () => { if (!activeSession) return failure(mitraMessage(language, 'noSession')); go('home'); return success(mitraMessage(language, 'sessionPaused')); },
      'session.resume': () => { if (!activeSession || !selectedGame) return failure(mitraMessage(language, 'noSession')); go('game'); return success(mitraMessage(language, 'sessionResumed')); },
      'session.finish': () => { if (!activeSession) return failure(mitraMessage(language, 'noSession')); const results = data.results.filter((item) => item.sessionId === activeSession.id); const accuracy = results.length ? Math.round(results.reduce((sum, item) => sum + item.accuracy, 0) / results.length) : 0; const summary: SessionSummary = { id: activeSession.id, plannedMinutes: activeSession.minutes, startedAt: activeSession.startedAt, endedAt: new Date().toISOString(), gamesCompleted: results.length, accuracy }; updateData((current) => ({ ...current, sessions: [...current.sessions, summary] })); setLastSummary(summary); setActiveSession(null); go('summary'); return success(mitraMessage(language, 'sessionFinished')); },
      'family.open': () => { go('family'); return success(mitraMessage(language, 'familyOpened', { count: data.family.length })); },
      'family.add': () => { const name = String(parameters.memberName ?? '').trim(); const relationship = String(parameters.relationship ?? '').trim(); if (!name || !relationship) return failure(mitraMessage(language, 'actionFailed')); storeFamilyMember({ name, relationship, photo: '' }); return success(mitraMessage(language, 'familyAdded', { name })); },
      'family.remove': () => { const member = named(data.family, String(parameters.memberName ?? '')); if (!member) return failure(mitraMessage(language, 'notFound')); void removeFamilyMember(member); return success(mitraMessage(language, 'familyRemoved', { name: member.name })); },
      'family.game.start': () => { if (!data.family.length) { go('family'); return failure(mitraMessage(language, 'noFamily')); } startFamilyGame(String(parameters.familyGameType ?? 'who') as FamilyGameType); return success(mitraMessage(language, 'familyGameStarted')); },
      'medicine.open': () => screenReply('medicines', 'Medicines'),
      'medicine.read': () => { const medicine = readMedicine(); return medicine ? success(mitraMessage(language, 'medicineNext', { detail: `${tx(medicine.title)} · ${medicine.time}` })) : failure(mitraMessage(language, 'medicineNone')); },
      'medicine.create': () => { const title = String(parameters.title); const time = String(parameters.time); createReminderRecord('medicine', title, time); return success(mitraMessage(language, 'medicineCreated', { title, time })); },
      'medicine.status': () => { const reminder = readMedicine(); if (!reminder) return failure(mitraMessage(language, 'medicineNone')); setReminderStatus(reminder.id, 'taken'); return success(mitraMessage(language, 'reminderStatusUpdated', { title: tx(reminder.title), status: tx('taken') })); },
      'reminder.create': () => { const kind = String(parameters.reminderKind) as Reminder['type']; const title = String(parameters.title); const time = String(parameters.time); createReminderRecord(['medicine', 'hydration', 'appointment', 'routine', 'session'].includes(kind) ? kind : 'routine', title, time); return success(mitraMessage(language, 'reminderCreated', { title, time })); },
      'reminder.status': () => { const reminder = data.reminders.find((item) => item.status === 'pending'); const status = String(parameters.status) as Reminder['status']; if (!reminder || !['taken', 'missed', 'snoozed'].includes(status)) return failure(mitraMessage(language, 'notFound')); setReminderStatus(reminder.id, status); return success(mitraMessage(language, 'reminderStatusUpdated', { title: tx(reminder.title), status: tx(status) })); },
      'appointment.open': () => screenReply('appointments', 'Appointments'),
      'appointment.read': () => { const appointment = readAppointment(); return appointment ? success(mitraMessage(language, 'appointmentNext', { detail: `${tx(appointment.title)} · ${appointment.date ?? today()} · ${appointment.time}${appointment.location ? ` · ${appointment.location}` : ''}` })) : failure(mitraMessage(language, 'appointmentNone')); },
      'appointment.create': () => { const title = String(parameters.title); const date = String(parameters.date); const time = String(parameters.time); createReminderRecord('appointment', title, time, { date }); return success(mitraMessage(language, 'appointmentCreated', { title, date, time })); },
      'routine.open': () => screenReply('routine', 'My Routine'),
      'routine.read': () => { const item = data.routine.find((entry) => !entry.done); return item ? success(mitraMessage(language, 'routineNext', { detail: `${tx(item.activity)} · ${item.time}` })) : failure(mitraMessage(language, 'routineNone')); },
      'routine.create': () => { const activity = String(parameters.activity); const time = String(parameters.time); createRoutineRecord(activity, time); return success(mitraMessage(language, 'routineCreated', { activity, time })); },
      'routine.complete': () => { const item = parameters.activity ? named(data.routine, String(parameters.activity)) : data.routine.find((entry) => !entry.done); if (!item) return failure(mitraMessage(language, 'notFound')); setRoutineCompletion(item.id, true); return success(mitraMessage(language, 'routineCompleted', { activity: tx(item.activity) })); },
      'routine.modify': () => { const item = named(data.routine, String(parameters.activity)); const time = String(parameters.time); if (!item) return failure(mitraMessage(language, 'notFound')); setRoutineTime(item.id, time); return success(mitraMessage(language, 'routineModified', { activity: tx(item.activity), time })); },
      'hydration.open': () => screenReply('hydration', 'Hydration'),
      'hydration.read': () => success(mitraMessage(language, 'hydrationProgress', { current: data.hydration.glasses, target: data.hydration.target })),
      'hydration.record': () => { const current = recordHydrationGlass(); return success(mitraMessage(language, 'hydrationRecorded', { current, target: data.hydration.target })); },
      'hydration.reminder': () => { const time = String(parameters.time); createReminderRecord('hydration', 'Drink a glass of water', time); return success(mitraMessage(language, 'waterReminder', { time })); },
      'hydration.plan': () => { const target = parameters.target === undefined ? data.hydration.target : Math.max(1, Math.min(20, Number(parameters.target))); const interval = parameters.interval === undefined ? data.hydration.interval : Math.max(30, Math.min(360, Number(parameters.interval))); updateHydrationPlan({ target, interval }); return success(mitraMessage(language, 'hydrationPlanUpdated')); },
      'progress.open': () => screenReply('progress', 'Your Progress'),
      'progress.read': () => { const average = data.results.length ? Math.round(data.results.reduce((sum, item) => sum + item.accuracy, 0) / data.results.length) : 0; return success(mitraMessage(language, 'progress', { count: data.results.length, accuracy: average })); },
      'settings.open': () => screenReply('settings', 'Settings'),
      'settings.language': () => { const nextLanguage = String(parameters.language) as SupportedMitraLanguage; if (!['en', 'hi', 'bn', 'as'].includes(nextLanguage)) return failure(mitraMessage(language, 'actionFailed')); updateProfile('language', nextLanguage); return success(mitraMessage(nextLanguage, 'languageChanged'), { replyLanguage: nextLanguage }); },
      'settings.text': () => { const value = String(parameters.textSize) as 'normal' | 'large' | 'extra'; updateProfile('textSize', value); return success(mitraMessage(language, 'settingChanged', { setting: tx('Text size'), value: tx(value) })); },
      'settings.contrast': () => { const value = Boolean(parameters.enabled); updateProfile('highContrast', value); return success(mitraMessage(language, 'settingChanged', { setting: tx('High contrast'), value: tx(value ? 'enabled' : 'disabled') })); },
      'settings.voice': () => { const value = Boolean(parameters.enabled); updateProfile('voice', value); return success(mitraMessage(language, 'settingChanged', { setting: tx('Voice responses'), value: tx(value ? 'enabled' : 'disabled') }), { skipSpeech: !value }); },
      'settings.sound': () => { const value = Boolean(parameters.enabled); updateProfile('sound', value); return success(mitraMessage(language, 'settingChanged', { setting: tx('Sound effects'), value: tx(value ? 'enabled' : 'disabled') })); },
      'settings.motion': () => { const value = Boolean(parameters.enabled); updateProfile('reducedMotion', value); return success(mitraMessage(language, 'settingChanged', { setting: tx('Reduced motion'), value: tx(value ? 'enabled' : 'disabled') })); },
      'settings.notifications': () => { void requestNotifications(); return success(mitraMessage(language, 'screenOpened', { screen: tx('Notifications') })); },
      'profile.edit': () => screenReply('onboarding', 'Edit profile'),
      'caregiver.open': () => screenReply('caregiver', 'Caregiver Dashboard'),
      'sos.open': () => { setShowSos(true); return success(mitraMessage(language, 'sos', { contact: data.profile?.emergencyName || tx('your emergency contact') })); },
      'assistant.help': () => success(mitraMessage(language, 'help', { count: mitraCapabilityCount })),
      'assistant.repeat': () => success(data.assistantContext.lastReply || assistantReply),
      'assistant.stop': () => { stopSpeaking(); return success(mitraMessage(language, 'stopped'), { skipSpeech: true }); },
      'assistant.greeting': () => success(mitraMessage(language, 'greeting', { name: data.profile?.name.split(' ')[0] ?? '' })),
      'assistant.wellbeing': () => success(mitraMessage(language, 'wellbeing'), { suggestedCapability: 'games.start', suggestedParameters: { category: 'Memory', difficulty: 'Easy', gameQuery: 'easy memory game' } }),
      'assistant.medical-boundary': () => success(mitraMessage(language, 'medicalBoundary')),
      'account.logout': () => { window.setTimeout(() => { if (authUser) window.location.href = '/signout-with-chatgpt?return_to=%2F'; else setScreen('welcome'); }, 350); return success(mitraMessage(language, 'screenOpened', { screen: tx('Log out') })); },
      'account.delete': () => { window.setTimeout(() => void deleteAccount(true), 350); return success(mitraMessage(language, 'screenOpened', { screen: tx('Delete my account and data') })); },
    };
    return runtimeCapabilityRegistry[capabilityId]();
  };

  const runAssistant = (value = assistantInput, displayedValue = value) => {
    const command = value.trim();
    if (!command) return;
    const contextScreen = screen === 'assistant' ? assistantOrigin : screen;
    const understood = understandMitraRequest(command, {
      lastIntent: data.assistantContext.lastIntent,
      lastCapability: data.assistantContext.lastCapability,
      pendingCapability: data.assistantContext.pendingCapability,
      missingParameters: data.assistantContext.missingParameters,
      collectedParameters: data.assistantContext.collectedParameters,
      awaitingConfirmation: data.assistantContext.awaitingConfirmation,
      lastCategory: data.assistantContext.lastCategory,
      currentScreen: contextScreen,
      currentUser: data.profile?.id,
      currentLanguage: language,
      currentGameName: contextScreen === 'game' ? selectedGame?.name : undefined,
      currentSessionMinutes: activeSession?.minutes,
      knownRoutineActivities: data.routine.map((item) => item.activity),
      knownFamilyNames: data.family.map((item) => item.name),
    });
    let execution: MitraExecution;
    if (understood.state === 'ambiguous') execution = { ok: false, reply: mitraMessage(language, 'unknown') };
    else if (understood.state === 'cancelled') execution = { ok: true, reply: mitraMessage(language, 'cancelled') };
    else if (understood.state === 'needs-parameter') execution = { ok: true, reply: mitraMessage(language, understood.promptKey ?? 'unknown') };
    else if (understood.state === 'needs-confirmation') {
      const action = language === 'hi' ? 'यह कार्रवाई करूँ' : language === 'bn' ? 'এই কাজটি করব' : language === 'as' ? 'এই কামটো' : 'continue with this action';
      execution = { ok: true, reply: mitraMessage(language, 'confirmAction', { action }) };
    }
    else if (!understood.capabilityId || !understood.capability) execution = { ok: false, reply: mitraMessage(language, 'unknown') };
    else if (!online && !understood.capability.canExecuteOffline) execution = { ok: false, reply: mitraMessage(language, 'offlineUnavailable') };
    else {
      try { execution = executeMitraCapability(understood.capabilityId, understood.parameters); }
      catch { execution = { ok: false, reply: mitraMessage(language, 'actionFailed') }; }
    }

    const pending = understood.state === 'needs-parameter' || understood.state === 'needs-confirmation';
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      conversations: [...current.conversations, { id: uid('message'), role: 'user' as const, text: displayedValue, timestamp: now }, { id: uid('message'), role: 'assistant' as const, text: execution.reply, timestamp: now }].slice(-20),
      assistantContext: {
        lastIntent: understood.intent,
        lastCapability: understood.capabilityId ?? current.assistantContext.lastCapability,
        lastReply: execution.reply,
        pendingCapability: execution.suggestedCapability ?? (pending ? understood.capabilityId : undefined),
        missingParameters: pending ? understood.missingParameters : undefined,
        collectedParameters: execution.suggestedParameters ?? (pending ? understood.parameters : undefined),
        awaitingConfirmation: Boolean(execution.suggestedCapability) || understood.state === 'needs-confirmation',
        lastActionResult: understood.state === 'cancelled' ? 'cancelled' : execution.ok ? 'success' : 'failed',
        lastCategory: understood.category ?? current.assistantContext.lastCategory,
        currentScreen: contextScreen,
        currentUser: data.profile?.id,
        currentLanguage: execution.replyLanguage ?? language,
        currentGame: selectedGame?.name,
        currentSessionMinutes: activeSession?.minutes,
        updatedAt: now,
      },
    }));
    setAssistantReply(execution.reply);
    setAssistantInput('');
    if (!execution.skipSpeech) speak(execution.reply, execution.replyLanguage ?? language);
  };

  if (!ready) return <main className="app-loading" aria-live="polite">{tx('Preparing MindMitra…')}</main>;
  if (screen === 'onboarding') return <Onboarding authUser={authUser} profile={data.profile} initialRole={data.profile?.role ?? 'elder'} initialLanguage={data.profile?.language ?? setupLanguage} onSubmit={completeOnboarding} onBack={() => setScreen('welcome')} />;
  if (screen === 'welcome' || !data.profile) return <Welcome authUser={authUser} nativeApp={isNativeApp} profileName={data.profile?.name ?? ''} language={language} onContinue={() => setScreen(data.profile?.role === 'caregiver' ? 'caregiver' : 'home')} onDemo={startDemo} onCreate={(preferredLanguage) => beginOnboarding('elder', preferredLanguage)} onCaregiver={(preferredLanguage) => beginOnboarding('caregiver', preferredLanguage)} />;
  if (screen === 'greeting') return <Greeting name={data.profile.name} language={language} onName={(name) => updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, name } }) : current)} onListen={listen} onContinue={() => go('home')} />;

  const page = (() => {
    if (screen === 'home') return renderHome();
    if (screen === 'games') return renderGames();
    if (screen === 'game-detail') return renderGameDetail();
    if (screen === 'session') return renderSession();
    if (screen === 'game') return renderGame();
    if (screen === 'family') return renderFamily();
    if (screen === 'medicines') return renderReminderPage('medicine');
    if (screen === 'appointments') return renderReminderPage('appointment');
    if (screen === 'hydration') return renderHydration();
    if (screen === 'routine') return renderRoutine();
    if (screen === 'progress') return renderProgress();
    if (screen === 'assistant') return renderAssistant();
    if (screen === 'settings') return renderSettings();
    if (screen === 'caregiver') return renderCaregiver();
    if (screen === 'summary') return renderSummary();
    return renderHome();
  })();

  return (
    <div className={`mindcare-app text-${data.profile.textSize} ${data.profile.highContrast ? 'high-contrast' : ''} ${data.profile.reducedMotion ? 'reduced-motion' : ''} ${screen === 'assistant' ? 'assistant-active' : ''}`}>
      <aside className="side-nav" aria-label={tx('Main navigation')}>
        <button className="brand app-brand" onClick={() => go('home')}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button>
        <NavButton icon="⌂" label={tx('Home')} active={screen === 'home'} onClick={() => go('home')} />
        <NavButton icon="✦" label={tx('Games')} active={['games', 'game-detail', 'session', 'game'].includes(screen)} onClick={() => go('games')} />
        <NavButton icon="♡" label={tx('Family')} active={screen === 'family'} onClick={() => go('family')} />
        <NavButton icon="↗" label={tx('Progress')} active={screen === 'progress'} onClick={() => go('progress')} />
        <NavButton icon="⚙" label={tx('Settings')} active={screen === 'settings'} onClick={() => go('settings')} />
        <div className="side-nav-spacer" />
        <button className="nav-user" onClick={() => go(data.profile?.role === 'caregiver' ? 'caregiver' : 'settings')}><span>{initials(data.profile.name)}</span><small>{data.profile.name}<b>{tx(data.profile.role === 'caregiver' ? 'Caregiver' : 'Elderly user')}</b></small></button>
      </aside>
      <div className="app-column">
        <header className="top-bar">
          <button className="mobile-brand brand" onClick={() => go('home')}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button>
          <div className={`connection ${online && !isNativeApp ? '' : 'is-offline'}`}><i />{isNativeApp ? tx('Saved on this phone') : !online ? tx('Offline · saved here') : syncStatus === 'syncing' ? tx('Saving…') : syncStatus === 'synced' ? tx('Everything saved') : tx('Online · saved')}</div>
          <label className="dashboard-language"><span className="sr-only">{tx('Choose language')}</span><select aria-label={tx('Choose language')} value={language} onChange={(event) => updateProfile('language', event.target.value as Language)}><LanguageOptionList /></select></label>
          <button className="mitra-quick" onClick={openAssistant} aria-label={tx('Talk to Mitra')}><span className="mitra-logo-small">m</span>{tx('Talk to Mitra')}</button>
          <button className="sos-quick" onClick={() => setShowSos(true)}>! <span>{tx('SOS')}</span></button>
        </header>
        {notificationMessage && <div className="due-banner" role="alert"><span>🔔</span><b>{tx(notificationMessage)}</b><button onClick={() => setNotificationMessage('')}>{tx('Dismiss')}</button></div>}
        <main className="app-content">{page}</main>
        <nav className="bottom-nav" aria-label={tx('Mobile navigation')}>
          <NavButton icon="⌂" label={tx('Home')} active={screen === 'home'} onClick={() => go('home')} />
          <NavButton icon="✦" label={tx('Games')} active={['games', 'game-detail', 'session', 'game'].includes(screen)} onClick={() => go('games')} />
          <NavButton icon="♡" label={tx('Family')} active={screen === 'family'} onClick={() => go('family')} />
          <NavButton icon="m" label={tx('Mitra')} active={screen === 'assistant'} onClick={openAssistant} />
          <NavButton icon="⚙" label={tx('Settings')} active={screen === 'settings'} onClick={() => go('settings')} />
        </nav>
      </div>
      {screen !== 'assistant' && <button className="mitra-fab" onClick={openAssistant} aria-label={tx('Open Mitra assistant')}><span>m</span><b>{tx('Ask Mitra')}</b></button>}
      {showSos && <SosModal profile={data.profile} tx={tx} onClose={() => setShowSos(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );

  function renderHome() {
    const pending = data.reminders.filter((item) => item.status === 'pending' && (!item.date || item.date === today()));
    const nextRoutine = data.routine.find((item) => !item.done);
    const cards: { icon: string; title: string; subtitle: string; screen: Screen; tone: string }[] = [
      { icon: '✦', title: tx('Play Games'), subtitle: tx('Gentle activities for your mind'), screen: 'games', tone: 'green' },
      { icon: '◷', title: tx('Start Session'), subtitle: tx('{minutes} minutes · balanced practice', { minutes: data.profile?.sessionPreference ?? 15 }), screen: 'session', tone: 'peach' },
      { icon: '☀', title: tx('My Routine'), subtitle: nextRoutine ? tx('Next: {activity}', { activity: tx(nextRoutine.activity) }) : tx('All done for today'), screen: 'routine', tone: 'yellow' },
      { icon: '✚', title: tx('Medicines'), subtitle: tx('{count} pending today', { count: pending.filter((item) => item.type === 'medicine').length }), screen: 'medicines', tone: 'blue' },
      { icon: '💧', title: tx('Hydration'), subtitle: tx('{current} of {target} glasses', { current: data.hydration.glasses, target: data.hydration.target }), screen: 'hydration', tone: 'aqua' },
      { icon: '▣', title: tx('Appointments'), subtitle: tx('{count} coming up', { count: pending.filter((item) => item.type === 'appointment').length }), screen: 'appointments', tone: 'lavender' },
      { icon: '♡', title: tx('My Family'), subtitle: tx('{count} people in your memories', { count: data.family.length }), screen: 'family', tone: 'rose' },
      { icon: '↗', title: tx('My Progress'), subtitle: tx('{count} completed games', { count: completedGames }), screen: 'progress', tone: 'mint' },
    ];
    return <>
      <section className="greeting-panel">
        <div><span className="section-kicker">{tx('Today')} · {new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><h1>{tx('Good morning')}, <em>{data.profile?.name.split(' ')[0]}</em> <span>👋</span></h1><p>{tx('You have {activities} activities and {reminders} reminders today.', { activities: data.routine.filter((item) => !item.done).length, reminders: pending.length })}</p></div>
        <button className="session-cta" onClick={() => startSession(data.profile?.sessionPreference ?? 15)}><span>✦</span><div><small>{tx('Recommended')}</small><b>{tx('Start a gentle session')}</b></div><i>→</i></button>
      </section>
      <section className="today-strip">
        <div className="today-strip-title"><span>☀</span><div><small>{tx('Coming up')}</small><b>{nextRoutine ? `${nextRoutine.time} · ${tx(nextRoutine.activity)}` : tx('Your routine is complete')}</b></div></div>
        <div className="today-divider" />
        <div className="today-strip-title"><span>🔔</span><div><small>{tx('Next reminder')}</small><b>{pending[0] ? `${pending[0].time} · ${tx(pending[0].title)}` : tx('Nothing pending')}</b></div></div>
        <button onClick={() => go('routine')}>{tx('View today')} →</button>
      </section>
      <div className="section-heading"><div><span className="section-kicker">{tx('Everything in one place')}</span><h2>{tx('How can we help today?')}</h2></div><button onClick={() => go('caregiver')}>{tx('Caregiver view')} <span>→</span></button></div>
      <section className="dashboard-grid">{cards.map((card) => <button className={`dashboard-card ${card.tone}`} key={card.title} onClick={() => go(card.screen)}><span className="dashboard-icon">{card.icon}</span><div><h3>{card.title}</h3><p>{card.subtitle}</p></div><i>→</i></button>)}</section>
      <section className="gentle-note"><span>❀</span><div><b>{tx('A little practice goes a long way')}</b><p>{tx('There is no perfect score here. Take your time, enjoy the activity, and pause whenever you need.')}</p></div></section>
    </>;
  }

  function renderGames() {
    const filtered = GAME_LIBRARY.filter((game) => (gameCategory === 'All' || game.category === gameCategory) && tx(game.name).toLowerCase().includes(gameSearch.toLowerCase()));
    const recommended = [...CATEGORIES].sort((a, b) => difficultyRank(difficultyFor(a, data.results)) - difficultyRank(difficultyFor(b, data.results))).slice(0, 3).map((category) => GAME_LIBRARY.find((game) => game.category === category)!).filter(Boolean);
    const card = (game: GameDefinition) => {
      const progress = gameProgressFor(game.id);
      const finished = progress.completedLevels.length === 10 && !progress.inProgress;
      return <GameCard key={game.id} game={game} difficulty={difficultyFor(game.category, data.results)} progress={progress} favorite={data.favorites.includes(game.id)} mine={data.myGames.includes(game.id)} tx={tx} onPlay={() => finished ? beginGameReplay(game) : openGame(game)} onFavorite={() => toggleNumber('favorites', game.id)} onMine={() => toggleNumber('myGames', game.id)} />;
    };
    return <>
      <PageHeader kicker={tx('Game center')} title={tx('Choose a gentle activity')} text={tx('Every game has 10 meaningful levels. Your exact place is saved automatically.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="game-actions"><button className="primary-action" onClick={() => go('session')}>◷ {tx('Start a balanced session')}</button><label className="search-box">⌕<input value={gameSearch} onChange={(event) => setGameSearch(event.target.value)} placeholder={tx('Find a game')} /></label></div>
      <section><div className="section-heading compact"><div><span className="section-kicker">{tx('Recommended for you')}</span><h2>{tx('Good choices for today')}</h2></div></div><div className="recommended-row">{recommended.map(card)}</div></section>
      <section><div className="section-heading compact"><div><span className="section-kicker">{tx('{count} games · {levels} levels', { count: GAME_LIBRARY.length, levels: GAME_LIBRARY.reduce((sum, game) => sum + game.levels.length, 0) })}</span><h2>{tx('Explore every activity')}</h2></div></div><div className="category-tabs"><button className={gameCategory === 'All' ? 'active' : ''} onClick={() => setGameCategory('All')}>{tx('All')}</button>{CATEGORIES.map((category) => <button className={gameCategory === category ? 'active' : ''} key={category} onClick={() => setGameCategory(category)}>{tx(category)}</button>)}</div><div className="game-grid">{filtered.map(card)}</div></section>
    </>;
  }

  function toggleNumber(field: 'favorites' | 'myGames', id: number) {
    updateData((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] }));
  }

  function renderGameDetail() {
    if (!focusedGame) return null;
    const progress = gameProgressFor(focusedGame.id);
    const finished = progress.completedLevels.length === 10 && !progress.inProgress;
    return <>
      <PageHeader kicker={`${tx(focusedGame.category)} · 10 ${tx('levels')}`} title={tx(focusedGame.name)} text={tx(focusedGame.instruction)} backLabel={tx('Back')} onBack={() => go('games')} />
      <section className="level-overview card-panel">
        <div className="level-overview-head"><GameVisual visual={focusedGame.visual} label={tx(focusedGame.name)} compact /><div><span>{tx('{count} of 10 completed', { count: progress.completedLevels.length })}</span><h2>{finished ? tx('All levels complete!') : progress.inProgress ? tx('Ready to resume Level {level}', { level: progress.inProgress.level }) : tx('Level {level} is ready', { level: progress.currentLevel })}</h2><p>{tx('Your progress is saved on this device and synced with your account when signed in.')}</p><small>{progress.completionCount === 1 ? tx('Completed {count} time', { count: progress.completionCount }) : tx('Completed {count} times', { count: progress.completionCount })}</small></div></div>
        <div className="level-progress-track"><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></div>
        <div className="level-actions">{finished ? <button className="primary-action" onClick={() => beginGameReplay(focusedGame)}>↻ {tx('Replay with a fresh shuffle')}</button> : <button className="primary-action" onClick={() => launchGame(focusedGame)}>{progress.inProgress ? tx('Continue') : tx('Play')} →</button>}<button className="secondary-action" onClick={() => go('games')}>{tx('Exit')}</button></div>
      </section>
    </>;
  }

  function renderSession() {
    return <><PageHeader kicker={tx('Balanced practice')} title={tx('Choose session duration')} text={tx('We’ll distribute games evenly across memory, attention, reasoning, recognition, language, routine, emotion, and cultural categories.')} backLabel={tx('Back')} onBack={() => go('games')} />
      <div className="duration-grid">{[5, 15, 30].map((minutes) => <button key={minutes} onClick={() => startSession(minutes)}><b>{minutes}</b><span>{tx('minutes')}</span><small>{tx('{count} gentle games', { count: createBalancedSession(minutes).length })}</small></button>)}<div className="custom-duration"><b>{tx('Custom')}</b><label><span>{customMinutes} {tx('minutes')}</span><input type="range" min="1" max="60" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value))} /></label><button onClick={() => startSession(customMinutes)}>{tx('Start custom session')}</button></div></div>
      <div className="distribution-preview"><span>◎</span><div><b>{tx('Fair and balanced')}</b><p>{tx('The session rotates through all eight cognitive activity categories. Your difficulty level is adapted per category, never treated as a medical measurement.')}</p></div></div></>;
  }

  function renderMemoryChain() {
    if (!selectedGame) return null;
    const difficulty = difficultyFor('Memory', data.results);
    const level = memoryChain ? Math.min(10, memoryChain.score + 1) : selectedGame.level;
    const categoryLabel = memoryChain ? tx(memoryChain.category === 'fruits' ? 'Fruits' : 'Vegetables') : '';
    const itemLabel = memoryChain ? tx(memoryChain.category === 'fruits' ? 'fruit' : 'vegetable') : '';
    const sequence = memoryChain?.sequence.map((entry) => memoryChainWord(memoryChain.category, entry.wordId, language)) ?? [];
    const instruction = tx(selectedGame.instruction);
    const prompt = !memoryChain
      ? tx('Choose Fruits or Vegetables to begin your memory chain.')
      : memoryChain.phase === 'show'
        ? tx('Remember the complete chain. Then hide it and repeat every item in order, adding one new {category}.', { category: itemLabel })
        : memoryChain.phase === 'recall'
          ? tx('Repeat the full chain in order, then add one new {category}.', { category: itemLabel })
          : memoryChain.phase === 'complete'
            ? tx('Wonderful — you completed the full Memory Chain!')
            : tx(memoryChain.failureReason === 'category' ? 'That answer was not a recognized item from this category.' : memoryChain.failureReason === 'duplicate' ? 'That item was already in the chain.' : 'That sequence was not quite right.');
    const narration = [instruction, prompt, memoryChain?.phase === 'show' ? sequence.join(', ') : ''].filter(Boolean).join(' ');
    return <div className="game-stage memory-chain-stage">
      <div className="game-top"><button className="back-button" onClick={exitCurrentGame}>← {tx('Save & Exit')}</button>{activeSession ? <div className="session-progress"><span style={{ width: `${((activeSession.index + 1) / activeSession.games.length) * 100}%` }} /><b>{tx('{current} of {total}', { current: activeSession.index + 1, total: activeSession.games.length })}</b></div> : <div className="session-progress level-session-progress"><span style={{ width: `${level * 10}%` }} /><b>{tx('Level {level} of 10', { level })}</b></div>}<button className="mini-sos" onClick={() => setShowSos(true)}>! {tx('SOS')}</button></div>
      <section className="play-card memory-chain-card">
        <div className="play-meta game-play-meta"><GameVisual visual={selectedGame.visual} label={tx(selectedGame.name)} compact /><div><small>{tx('Memory')} · {tx(difficulty)} · {tx('Level {level} of 10', { level })}</small><h1>{tx('Memory Chain')}</h1></div></div>
        <div className="game-question-panel memory-chain-question"><div><p className="instruction">{instruction}</p><h2 className="game-prompt">{prompt}</h2></div><GameSpeakerButton playing={gameSpeechPlaying} label={tx('Listen to question')} speakingLabel={tx('Speaking…')} onClick={() => speakGameText(narration)} /></div>
        {!memoryChain && <div className="memory-chain-categories" aria-label={tx('Choose a category')}>
          <button onClick={() => startMemoryChainCategory('vegetables')}><GameVisual visual={['🥕', '🥦', '🥬']} label={tx('Vegetables')} /><span><b>{tx('Vegetables')}</b><small>{tx('Build a chain using vegetable names.')}</small></span><i>→</i></button>
          <button onClick={() => startMemoryChainCategory('fruits')}><GameVisual visual={['🍎', '🥭', '🍌']} label={tx('Fruits')} /><span><b>{tx('Fruits')}</b><small>{tx('Build a chain using fruit names.')}</small></span><i>→</i></button>
        </div>}
        {memoryChain && <>
          <div className="memory-chain-status"><span>{categoryLabel}</span><b>{tx('{count} links remembered', { count: memoryChain.sequence.length })}</b></div>
          {memoryChain.phase === 'recall' ? <div className="memory-chain-hidden" aria-label={tx('The chain is hidden')}><div>{memoryChain.sequence.map((entry, index) => <span key={`${entry.wordId}-${index}`}>?</span>)}<span className="new-link">+</span></div><p>{tx('The chain is hidden. Recall it in order and add one new item.')}</p></div> : <div className={`memory-chain-sequence chain-${memoryChain.phase}`} aria-label={tx('Memory chain sequence')}>
            {memoryChain.sequence.map((entry, index) => <div className={`memory-link ${entry.source}`} key={`${entry.wordId}-${index}`}><small>{tx(entry.source === 'system' ? 'System' : 'You')}</small><b>{memoryChainWord(memoryChain.category, entry.wordId, language)}</b></div>)}
          </div>}
          {memoryChain.phase === 'show' && <button className="primary-action memory-chain-ready" onClick={prepareMemoryChainRecall}>✓ {tx('I remember — hide the chain')}</button>}
          {memoryChain.phase === 'recall' && <div className="memory-chain-answer"><label><span>{tx('Type or speak the whole chain')}</span><input autoComplete="off" autoCapitalize="none" value={memoryChainInput} onChange={(event) => setMemoryChainInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitMemoryChainAnswer(); }} placeholder={tx('Example: Apple, Mango')} /></label><button className={`memory-chain-mic ${voiceStatus === 'listening' ? 'is-listening' : ''}`} disabled={voiceStatus === 'processing'} onClick={() => voiceStatus === 'listening' || voiceStatus === 'requesting' ? cancelListening() : listen((value) => { setMemoryChainInput(value); submitMemoryChainAnswer(value); })} aria-label={voiceStatus === 'listening' ? tx('Stop listening') : tx('Speak my answer')} aria-pressed={voiceStatus === 'listening'}>{voiceStatus === 'listening' ? '■' : '🎤'}<span>{voiceStatus === 'listening' ? tx('Listening…') : tx('Speak')}</span></button><button className="primary-action" disabled={!memoryChainInput.trim()} onClick={() => submitMemoryChainAnswer()}>{tx('Check my chain')} →</button></div>}
          {memoryChain.phase === 'failed' && <div className="memory-chain-result gentle" role="status" aria-live="polite"><span>♡</span><div><b>{tx('Good try — here is the chain to practise.')}</b><p>{sequence.join(' → ')}</p></div><div className="memory-chain-result-actions"><button className="primary-action" onClick={restartMemoryChain}>↻ {tx('Try this category again')}</button>{activeSession && <button className="secondary-action" onClick={() => continueAfterGame()}>{tx('Continue session')} →</button>}</div></div>}
          {memoryChain.phase === 'complete' && <div className="memory-chain-result complete" role="status" aria-live="polite"><span>✦</span><div><b>{tx('Memory Chain complete!')}</b><p>{tx('You remembered the complete sequence and finished all 10 levels.')}</p></div><button className="primary-action" onClick={() => continueAfterGame()}>{activeSession ? tx('Continue session') : tx('Finish')} →</button></div>}
        </>}
        <button className="exit-game-button" onClick={exitCurrentGame}>{tx('Save & Exit')}</button>
      </section>
    </div>;
  }

  function renderGame() {
    if (!selectedGame) return null;
    if (selectedGame.id === MEMORY_CHAIN_GAME_ID) return renderMemoryChain();
    const difficulty = difficultyFor(selectedGame.category, data.results);
    const correct = selectedAnswer === selectedGame.answer;
    const prompt = tx(selectedGame.prompt, Object.fromEntries(Object.entries(selectedGame.promptValues ?? {}).map(([key, value]) => [key, selectedGame.familyType && key === 'relationship' ? tx(value) : value])));
    const instruction = tx(selectedGame.instruction || CATEGORY_INSTRUCTIONS.en![selectedGame.category]);
    return <div className="game-stage">
      <div className="game-top"><button className="back-button" onClick={exitCurrentGame}>← {tx('Save & Exit')}</button>{activeSession ? <div className="session-progress"><span style={{ width: `${((activeSession.index + 1) / activeSession.games.length) * 100}%` }} /><b>{tx('{current} of {total}', { current: activeSession.index + 1, total: activeSession.games.length })}</b></div> : <div className="session-progress level-session-progress"><span style={{ width: `${selectedGame.level * 10}%` }} /><b>{tx('Level {level} of 10', { level: selectedGame.level })}</b></div>}<button className="mini-sos" onClick={() => setShowSos(true)}>! {tx('SOS')}</button></div>
      <section className="play-card game-play-card"><div className="play-meta game-play-meta"><GameVisual visual={selectedGame.visual} label={tx(selectedGame.name)} compact /><div><small>{tx(selectedGame.category)} · {tx(difficulty)} · {tx('Level {level} of 10', { level: selectedGame.level })}</small><h1>{tx(selectedGame.name)}</h1></div></div>
        {familyQuiz && <FamilyPortrait member={familyQuiz} large />}
        <div className="game-question-panel"><div><p className="instruction">{instruction}</p><h2 className="game-prompt">{prompt}</h2></div><GameSpeakerButton playing={gameSpeechPlaying} label={tx('Listen to question')} speakingLabel={tx('Speaking…')} onClick={() => speakGameText(`${instruction} ${prompt}`)} /></div>
        <div className="answer-grid">{selectedGame.options.map((option) => <button disabled={answerSaved} className={`${selectedAnswer === option ? 'selected' : ''} ${answerSaved && option === selectedGame.answer ? 'correct' : ''} ${answerSaved && selectedAnswer === option && option !== selectedGame.answer ? 'wrong' : ''}`} key={option} onClick={() => saveGameAnswer(option)}><span>{tx(option)}</span><i>{selectedAnswer === option ? '✓' : ''}</i></button>)}</div>
        {answerSaved && <div className={`answer-feedback ${correct ? 'correct' : 'gentle'}`} role="status" aria-live="polite"><span>{correct ? '✓' : '♡'}</span><div><b>{correct ? tx('Correct') : tx('Incorrect')}</b><p>{correct ? `${tx('Well done — level complete!')} ${selectedGame.level === 10 ? tx('You completed all 10 levels!') : tx('Your next level is ready.')}` : `${tx('Good try — practice helps.')} ${tx('The correct answer is {answer}.', { answer: tx(selectedGame.answer) })}`} {selectedGame.level < 10 && tx('Press Next when you are ready.')}</p></div><button onClick={continueAfterGame}>{activeSession ? tx('Continue session') : selectedGame.level === 10 ? tx('Finish') : tx('Next')} →</button></div>}
        <button className="exit-game-button" onClick={exitCurrentGame}>{tx('Save & Exit')}</button>
      </section>
    </div>;
  }

  function renderFamily() {
    const whoProgress = familyProgressFor('who');
    const whoFinished = whoProgress.completedLevels.length === 10 && !whoProgress.inProgress;
    return <><PageHeader kicker={tx('Personal memories')} title={tx('My Family')} text={tx('Add people who matter to you. Photos stay private and are used only to create your personal memory activities.')} backLabel={tx('Back')} onBack={() => go('home')} action={<button className="primary-action" onClick={() => whoFinished ? beginFamilyReplay('who') : startFamilyGame('who')}>♡ {tx('Play family game')}</button>} />
      <div className="family-layout"><section className="family-list card-panel"><div className="panel-title"><div><span className="section-kicker">{tx('Your circle')}</span><h2>{tx('{count} family members', { count: data.family.length })}</h2></div></div>{data.family.length ? <div className="family-grid">{data.family.map((member) => <article key={member.id}><FamilyPortrait member={member} /><div><h3>{member.name}</h3><p>{tx(member.relationship)}{member.nickname ? ` · “${member.nickname}”` : ''}</p></div><button aria-label={`${tx('Remove')} ${member.name}`} onClick={() => void removeFamilyMember(member)}>×</button></article>)}</div> : <EmptyState icon="♡" title={tx('Add your first family memory')} text={tx('A name, relationship, and optional photo are enough to begin.')} />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">{tx('Add someone')}</span><h2>{tx('Create a family profile')}</h2><form onSubmit={addFamilyMember} className="stack-form"><label>{tx('Full name')}<input name="name" required placeholder={tx('e.g. Raj Das')} /></label><div className="two-fields"><label>{tx('Relationship')}<select name="relationship" required defaultValue=""><option value="" disabled>{tx('Choose')}</option>{relationshipOptions.map((item) => <option key={item} value={item}>{tx(item)}</option>)}</select></label><label>{tx('Nickname (optional)')}<input name="nickname" placeholder={tx('e.g. Raju')} /></label></div><label className="upload-field">{tx('Photo (optional)')}<input type="file" name="photo" accept="image/*" capture="user" /><small>{tx('Take a photo or choose one from your phone. Maximum 5 MB.')}</small></label><button className="primary-action wide" type="submit">{tx('Add to My Family')}</button></form></section></div>
      <section className="memory-modes family-game-modes">{(Object.keys(FAMILY_GAME_META) as FamilyGameType[]).map((type) => { const meta = FAMILY_GAME_META[type]; const progress = familyProgressFor(type); const finished = progress.completedLevels.length === 10 && !progress.inProgress; return <article key={type}><GameVisual visual={meta.visual} label={tx(meta.name)} /><h3>{tx(meta.name)}</h3><p>{tx(meta.description)}</p><div className="mini-level-track"><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></div><small>{tx('{count}/10 levels', { count: progress.completedLevels.length })} · {progress.completionCount === 1 ? tx('Completed {count} time', { count: progress.completionCount }) : tx('Completed {count} times', { count: progress.completionCount })}</small><button onClick={() => finished ? beginFamilyReplay(type) : startFamilyGame(type)}>{finished ? tx('Replay') : progress.inProgress ? tx('Continue') : tx('Play')} →</button></article>; })}</section>
    </>;
  }

  function renderReminderPage(type: 'medicine' | 'appointment') {
    const isMedicine = type === 'medicine';
    const items = data.reminders.filter((item) => item.type === type);
    return <><PageHeader kicker={tx('Daily support')} title={tx(isMedicine ? 'Medicine reminders' : 'Appointments')} text={tx(isMedicine ? 'Record reminders only for medicines already prescribed to you. MindMitra does not recommend medication.' : 'Keep doctor visits, times, locations, and notes together.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="two-column"><section className="card-panel"><div className="panel-title"><h2>{tx(isMedicine ? 'Your medicines' : 'Upcoming appointments')}</h2></div>{items.length ? <div className="reminder-list">{items.map((item) => <ReminderRow key={item.id} item={item} tx={tx} onStatus={setReminderStatus} />)}</div> : <EmptyState icon={isMedicine ? '✚' : '▣'} title={tx('Nothing added yet')} text={tx('Use the form to create your first reminder.')} />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">{tx(isMedicine ? 'New medicine' : 'New appointment')}</span><h2>{tx('Add a reminder')}</h2><form className="stack-form" onSubmit={(event) => addReminder(event, type)}><label>{tx(isMedicine ? 'Medicine name' : 'Doctor name')}<input name="title" required /></label><div className="two-fields"><label>{tx('Date')}<input type="date" name="date" required={!isMedicine} /></label><label>{tx('Time')}<input type="time" name="time" required /></label></div>{isMedicine ? <><div className="two-fields"><label>{tx('Dosage description')}<input name="dosage" placeholder={tx('e.g. 1 tablet')} /></label><label>{tx('Frequency')}<select name="frequency"><option value="Daily">{tx('Daily')}</option><option value="Twice daily">{tx('Twice daily')}</option><option value="Weekly">{tx('Weekly')}</option><option value="As prescribed">{tx('As prescribed')}</option></select></label></div><div className="two-fields"><label>{tx('Start date')}<input type="date" name="startDate" /></label><label>{tx('End date')}<input type="date" name="endDate" /></label></div></> : <label>{tx('Location')}<input name="location" /></label>}<label>{tx('Notes')}<textarea name="notes" rows={3} /></label><button className="primary-action wide" type="submit">{tx('Save reminder')}</button></form></section></div>
    </>;
  }

  function renderHydration() {
    const progress = Math.min(100, Math.round((data.hydration.glasses / Math.max(1, data.hydration.target)) * 100));
    return <><PageHeader kicker={tx('Daily support')} title={tx('Hydration')} text={tx('A gentle nudge to drink water during your waking hours.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="hydration-layout"><section className="water-card"><div className="water-orb"><span>💧</span><b>{data.hydration.glasses}</b><small>{tx('of {target} glasses', { target: data.hydration.target })}</small></div><div className="water-progress"><span style={{ width: `${progress}%` }} /></div><h2>{tx(progress >= 100 ? 'Target reached — well done!' : 'It is time to drink some water.')}</h2><button className="primary-action" onClick={() => updateData((current) => ({ ...current, hydration: { ...current.hydration, glasses: Math.min(current.hydration.target, current.hydration.glasses + 1), date: today() } }))}>✓ {tx('I drank a glass')}</button><button className="secondary-action" onClick={() => { const later = new Date(Date.now() + 20 * 60000).toTimeString().slice(0, 5); updateData((current) => ({ ...current, reminders: [...current.reminders, { id: uid('water'), type: 'hydration', title: 'Drink a glass of water', time: later, status: 'pending', createdAt: new Date().toISOString() }] })); notify(tx('We’ll remind you again in 20 minutes.')); }}>{tx('Remind me later')}</button></section>
      <section className="card-panel form-panel"><span className="section-kicker">{tx('Your plan')}</span><h2>{tx('Hydration settings')}</h2><form className="stack-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateData((current) => ({ ...current, hydration: { ...current.hydration, interval: Number(form.get('interval')), wakeTime: String(form.get('wakeTime')), sleepTime: String(form.get('sleepTime')), target: Number(form.get('target')) } })); notify(tx('Hydration plan saved.')); }}><label>{tx('Reminder interval')}<select name="interval" defaultValue={data.hydration.interval}><option value="60">{tx('Every hour')}</option><option value="90">{tx('Every 90 minutes')}</option><option value="120">{tx('Every 2 hours')}</option><option value="180">{tx('Every 3 hours')}</option></select></label><div className="two-fields"><label>{tx('Wake time')}<input type="time" name="wakeTime" defaultValue={data.hydration.wakeTime} /></label><label>{tx('Sleep time')}<input type="time" name="sleepTime" defaultValue={data.hydration.sleepTime} /></label></div><label>{tx('Daily target')}<input type="number" min="1" max="20" name="target" defaultValue={data.hydration.target} /></label><button className="primary-action wide">{tx('Save plan')}</button></form></section></div>
    </>;
  }

  function renderRoutine() {
    return <><PageHeader kicker={tx('Today’s timeline')} title={tx('My Routine')} text={tx('A clear, reassuring plan for the day. Tap an activity when it is complete.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="two-column"><section className="card-panel"><div className="routine-list">{data.routine.map((item) => <button key={item.id} className={item.done ? 'done' : ''} onClick={() => updateData((current) => ({ ...current, routine: current.routine.map((routine) => routine.id === item.id ? { ...routine, done: !routine.done } : routine) }))}><time>{item.time}</time><i /><span>{tx(item.activity)}</span><b>{item.done ? '✓' : '○'}</b></button>)}</div>{!data.routine.length && <EmptyState icon="☀" title={tx('Your day is open')} text={tx('Add the first activity using the form.')} />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">{tx('New activity')}</span><h2>{tx('Add to today')}</h2><form className="stack-form" onSubmit={addRoutine}><label>{tx('Time')}<input name="time" type="time" required /></label><label>{tx('Activity')}<input name="activity" placeholder={tx('e.g. Morning walk')} required /></label><button className="primary-action wide">{tx('Add activity')}</button></form></section></div>
    </>;
  }

  function renderProgress() {
    const totals = CATEGORIES.map((category) => { const results = data.results.filter((result) => result.category === category); return { category, count: results.length, accuracy: results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0 }; });
    const last7 = data.results.filter((result) => Date.now() - new Date(result.date).getTime() < 7 * 86400000);
    return <><PageHeader kicker={tx('Cognitive activity')} title={tx('Your Progress')} text={tx('These scores show game practice only. They are not medical measurements or a diagnosis.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="stat-grid"><article><span>✦</span><small>{tx('Games completed')}</small><b>{completedGames}</b></article><article><span>◷</span><small>{tx('This week')}</small><b>{last7.length}</b></article><article><span>◎</span><small>{tx('Average accuracy')}</small><b>{data.results.length ? Math.round(data.results.reduce((sum, result) => sum + result.accuracy, 0) / data.results.length) : 0}%</b></article><article><span>↗</span><small>{tx('Sessions')}</small><b>{data.sessions.length}</b></article></div>
      <section className="card-panel progress-card"><div className="panel-title"><div><span className="section-kicker">{tx('By activity category')}</span><h2>{tx('Game performance')}</h2></div></div><div className="bar-chart">{totals.map((item) => <div key={item.category}><span>{tx(item.category)}</span><div><i style={{ width: `${item.accuracy}%` }} /></div><b>{item.count ? `${item.accuracy}%` : tx('New')}</b></div>)}</div></section>
      <section className="card-panel"><div className="panel-title"><h2>{tx('Recent activity')}</h2></div><div className="history-list">{data.results.slice().reverse().slice(0, 8).map((result) => <article key={result.id}><span>{GAME_LIBRARY.find((game) => game.id === result.gameId)?.icon ?? '♡'}</span><div><b>{tx(result.game)}</b><small>{new Date(result.date).toLocaleDateString(LANGUAGE_LOCALES[language])} · {tx(result.difficulty)} · {tx('{count} sec', { count: result.responseTime })}</small></div><strong>{result.accuracy}%</strong></article>)}{!data.results.length && <EmptyState icon="↗" title={tx('Your progress starts with one game')} text={tx('Complete a gentle activity and your result will appear here.')} />}</div></section>
    </>;
  }

  function renderAssistant() {
    const examples = ['Start a game', 'Start a 15 minute session', 'Remind me to drink water', 'When is my medicine?', 'What should I do next?', 'Open my family'];
    const conversation = data.conversations.slice(-12);
    const greeting = mitraMessage(language, 'greeting', { name: data.profile?.name.split(' ')[0] ?? '' });
    const voiceLabel = voiceStatus === 'requesting' ? tx('Requesting microphone permission…') : voiceStatus === 'listening' ? tx('Listening…') : voiceStatus === 'processing' ? tx('Understanding…') : voiceStatus === 'error' ? tx('Voice unavailable — type instead') : tx('Tap the microphone and speak naturally');
    const contextLabel = assistantOrigin === 'game' && selectedGame ? tx('Helping with {game}', { game: tx(selectedGame.name) }) : tx('Ready to help across MindMitra');
    return <div className="assistant-page"><PageHeader kicker={tx('Your voice companion')} title={tx('Talk to Mitra')} text={tx('Speak or type naturally. Mitra remembers the recent conversation and responds in {language}.', { language: LANGUAGE_OPTIONS.find((item) => item.value === language)?.label ?? 'English' })} backLabel={tx('Back')} onBack={() => go(assistantOrigin === 'assistant' ? 'home' : assistantOrigin)} />
      <section className={`assistant-card voice-${voiceStatus}`}><div className="mitra-avatar"><span>m</span><i /></div><div className="assistant-context"><i />{contextLabel}</div><div className="voice-live" role="status" aria-live="polite"><span className="voice-pulse"><i /><i /><i /></span><b>{voiceLabel}</b>{recognizedSpeech && <p>“{recognizedSpeech}”</p>}</div><div className="conversation" aria-live="polite">{conversation.length ? conversation.map((message) => <div key={message.id} className={`chat-bubble ${message.role === 'user' ? 'user' : ''}`}><small>{message.role === 'user' ? tx('You') : tx('Mitra')}</small><p>{message.text}</p>{message.role === 'assistant' && <button onClick={() => speak(message.text)}>🔊 {tx('Hear this')}</button>}</div>) : <div className="chat-bubble"><small>{tx('Mitra')}</small><p>{greeting}</p><button onClick={() => speak(greeting)}>🔊 {tx('Hear this')}</button></div>}</div><div className="assistant-compose"><input aria-label={tx('Message Mitra')} value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runAssistant(); }} placeholder={tx('Type a message or request…')} /><button className={`voice-button ${voiceStatus === 'listening' ? 'is-listening' : ''}`} disabled={voiceStatus === 'processing'} onClick={() => voiceStatus === 'listening' || voiceStatus === 'requesting' ? cancelListening() : listen((heard) => { setAssistantInput(heard); runAssistant(heard); })} aria-label={voiceStatus === 'listening' ? tx('Stop listening') : tx('Speak to Mitra')} aria-pressed={voiceStatus === 'listening'}>{voiceStatus === 'listening' ? '■' : '🎤'}</button><button className="send-button" onClick={() => runAssistant()}>{tx('Send')}</button></div><div className="command-chips">{examples.map((example) => <button key={example} onClick={() => runAssistant(example, tx(example))}>{tx(example)}</button>)}</div></section>
      <p className="privacy-note">{tx('Mitra keeps recent conversation context in your saved MindMitra data. Its built-in companion features do not send the conversation to an external AI service.')}</p>
    </div>;
  }

  function renderSettings() {
    return <><PageHeader kicker={tx('Make MindMitra yours')} title={tx('Settings & Profile')} text={tx('Changes apply immediately and are saved for this account.')} backLabel={tx('Back')} onBack={() => go('home')} />
      <div className="settings-layout"><section className="card-panel"><div className="setting-row"><div><b>{tx('Text size')}</b><p>{tx('Choose the most comfortable reading size.')}</p></div><div className="segmented">{(['normal', 'large', 'extra'] as const).map((size) => <button className={data.profile?.textSize === size ? 'active' : ''} key={size} onClick={() => updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, textSize: size } }) : current)}>{tx(size === 'extra' ? 'Extra large' : titleCase(size))}</button>)}</div></div>
        <Toggle label={tx('High contrast')} text={tx('Stronger colors and borders.')} checked={data.profile?.highContrast ?? false} onChange={(checked) => updateProfile('highContrast', checked)} />
        <Toggle label={tx('Voice responses')} text={tx('Let Mitra read helpful responses aloud.')} checked={data.profile?.voice ?? false} onChange={(checked) => updateProfile('voice', checked)} />
        <Toggle label={tx('Sound effects')} text={tx('Play gentle success feedback.')} checked={data.profile?.sound ?? false} onChange={(checked) => updateProfile('sound', checked)} />
        <Toggle label={tx('Reduced motion')} text={tx('Turn off movement and transitions.')} checked={data.profile?.reducedMotion ?? false} onChange={(checked) => updateProfile('reducedMotion', checked)} />
        <div className="setting-row"><div><b>{tx('Mitra language')}</b><p>{tx('Mitra’s text, games, and voice use your selected language.')}</p></div><select value={language} onChange={(event) => updateProfile('language', event.target.value as Language)}><LanguageOptionList /></select></div>
        <div className="setting-row"><div><b>{tx('Notifications')}</b><p>{tx('Allow medicine, hydration, appointment, and routine alerts.')}</p></div><button className="secondary-action" onClick={requestNotifications}>{tx('Enable')}</button></div></section>
      <section className="card-panel profile-settings"><span className="section-kicker">{tx('Profile')}</span><h2>{data.profile?.name}</h2><p>{data.profile?.phone}<br />{data.profile?.email}</p><div className="emergency-box"><small>{tx('Emergency contact')}</small><b>{data.profile?.emergencyName}</b><span>{tx(data.profile?.emergencyRelationship ?? '')} · {data.profile?.emergencyPhone}</span></div><div className="code-box"><small>{tx('Caregiver connection code')}</small><b>{data.profile?.caregiverCode}</b><p>{tx('Share only with a caregiver you trust.')}</p></div><button className="secondary-action wide" onClick={() => setScreen('onboarding')}>{tx('Edit profile')}</button><button className="secondary-action wide profile-logout" onClick={() => { if (authUser) window.location.href = '/signout-with-chatgpt?return_to=%2F'; else setScreen('welcome'); }}>{tx('Log out')}</button><button className="danger-link" onClick={() => void deleteAccount()}>{tx('Delete my account and data')}</button></section></div>
      <details className="disclaimer"><summary>{tx('Important medical disclaimer')}</summary><p>{tx('MindMitra is designed for cognitive engagement, memory assistance, and daily activity support. It is not a medical diagnostic or treatment device. Game performance should not be interpreted as a diagnosis of dementia or any other medical condition. Please consult a qualified healthcare professional for medical concerns.')}</p></details>
    </>;
  }

  function updateProfile<K extends keyof NonNullable<AppData['profile']>>(key: K, value: NonNullable<AppData['profile']>[K]) {
    if (key === 'language') window.localStorage.setItem('mindmitra-preferred-language', String(value));
    updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, [key]: value } }) : current);
  }

  async function requestNotifications() {
    if (!('Notification' in window)) { notify(tx('Notifications are unavailable. You can still view reminders inside the app.')); return; }
    const permission = await Notification.requestPermission();
    notify(tx(permission === 'granted' ? 'Notifications enabled.' : 'Notifications are disabled. You can still view reminders inside the app.'));
  }

  async function deleteAccount(confirmed = false) {
    if (!confirmed && !window.confirm(tx('Delete your profile, family records, reminders, and game history from this device and synced account?'))) return;
    if (authUser) {
      markPendingAccountDeletion(authUser.userId, true);
      if (online) {
        const responses = await Promise.all([
          fetch('/api/sync', { method: 'DELETE' }),
          fetch('/api/family-photo', { method: 'DELETE' }),
        ]).catch(() => []);
        if (responses.length === 2 && responses.every((response) => response.ok)) markPendingAccountDeletion(authUser.userId, false);
      }
    }
    clearLocalData(authUser?.userId); setData(emptyData); setScreen('welcome');
  }

  function renderCaregiver() {
    const missed = data.reminders.filter((item) => item.status === 'missed').length;
    return <><PageHeader kicker={tx('Authorized family support')} title={tx('Caregiver Dashboard')} text={tx('View cognitive activity and help manage reminders, routines, and family memories. This is not a diagnostic dashboard.')} backLabel={tx('Back')} onBack={() => go('home')} />
      {!data.caregiverConnected ? <section className="connect-card"><span>🔗</span><h2>{tx('Connect with an elderly user')}</h2><p>{tx('Ask the person to share the connection code shown in their Settings. Connection requires their explicit authorization.')}</p><form onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('code') ?? '').toUpperCase(); if (value === data.profile?.caregiverCode) { updateData((current) => ({ ...current, caregiverConnected: true })); notify(tx('Caregiver access connected.')); } else notify(tx('That code does not match this profile.')); }}><input name="code" placeholder={tx('Enter connection code')} required /><button className="primary-action">{tx('Connect')}</button></form></section> : <>
        <div className="care-recipient"><span>{initials(data.profile?.name ?? '')}</span><div><small>{tx('Connected account')}</small><b>{data.profile?.name}</b></div><i>{tx('Authorized')} ✓</i></div>
        <div className="stat-grid caregiver-stats"><article><span>✦</span><small>{tx('Games completed')}</small><b>{completedGames}</b></article><article><span>◷</span><small>{tx('Session minutes')}</small><b>{data.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0)}</b></article><article><span>✓</span><small>{tx('Reminders completed')}</small><b>{data.reminders.filter((item) => item.status === 'taken').length}</b></article><article><span>!</span><small>{tx('Reminders missed')}</small><b>{missed}</b></article></div>
        <section className="caregiver-actions"><button onClick={() => go('medicines')}><span>✚</span><b>{tx('Add medicine reminder')}</b><small>{tx('Record prescribed medicine times')}</small></button><button onClick={() => go('routine')}><span>☀</span><b>{tx('Manage routine')}</b><small>{tx('Add or complete daily activities')}</small></button><button onClick={() => go('family')}><span>♡</span><b>{tx('Add family memory')}</b><small>{tx('Upload a private familiar photo')}</small></button><button onClick={() => go('progress')}><span>↗</span><b>{tx('View game performance')}</b><small>{tx('See activity trends by category')}</small></button></section>
        <section className="card-panel"><div className="panel-title"><h2>{tx('Recent activity')}</h2></div><div className="history-list">{data.results.slice().reverse().slice(0, 5).map((result) => <article key={result.id}><span>✦</span><div><b>{tx(result.game)}</b><small>{tx(result.category)} · {new Date(result.date).toLocaleString(LANGUAGE_LOCALES[language])}</small></div><strong>{result.accuracy}%</strong></article>)}</div></section>
      </>}
    </>;
  }

  function renderSummary() {
    if (!lastSummary) return null;
    return <section className="summary-card"><div className="celebration">✦ <span>🎉</span> ✦</div><span className="section-kicker">{tx('Session complete')}</span><h1>{tx('You did it, {name}!', { name: data.profile?.name.split(' ')[0] ?? '' })}</h1><p>{tx('Thank you for taking this gentle time for yourself.')}</p><div className="summary-stats"><article><small>{tx('Planned time')}</small><b>{lastSummary.plannedMinutes} {tx('min')}</b></article><article><small>{tx('Games completed')}</small><b>{lastSummary.gamesCompleted}</b></article><article><small>{tx('Accuracy')}</small><b>{lastSummary.accuracy}%</b></article></div><div className="summary-note">{tx('These are game-practice scores, not medical measurements.')}</div><div className="summary-actions"><button className="primary-action" onClick={() => startSession(lastSummary.plannedMinutes)}>{tx('Play another session')}</button><button className="secondary-action" onClick={() => go('home')}>{tx('Return home')}</button></div></section>;
  }
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

function useLocaleTranslator(language: Language) {
  const [dictionary, setDictionary] = useState<TranslationDictionary>({});
  useEffect(() => {
    let active = true;
    document.documentElement.lang = language;
    void loadLanguagePack(language).then((pack) => { if (active) setDictionary(pack); }).catch(() => { if (active) setDictionary({}); });
    return () => { active = false; };
  }, [language]);
  return useCallback((source: string, values: TranslationValues = {}) => translateText(dictionary, source, values), [dictionary]);
}

function Welcome({ authUser, nativeApp, profileName, language, onContinue, onDemo, onCreate, onCaregiver }: { authUser: AuthUser | null; nativeApp: boolean; profileName: string; language: Language; onContinue: () => void; onDemo: (language: Language) => void; onCreate: (language: Language) => void; onCaregiver: (language: Language) => void }) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return language;
    const preferred = window.localStorage.getItem('mindmitra-preferred-language') as Language | null;
    return LANGUAGE_OPTIONS.some((item) => item.value === preferred) ? preferred! : language;
  });
  const tx = useLocaleTranslator(selectedLanguage);
  const displayName = profileName || authUser?.displayName || '';
  const signIn = displayName ? tx('Continue as {name}', { name: displayName }) : tx('Sign in securely');
  return <main className="welcome-page"><nav className="welcome-nav"><span className="brand"><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></span><label className="language-picker"><span className="sr-only">{tx('Choose language')}</span><select aria-label={tx('Choose language')} value={selectedLanguage} onChange={(event) => { const next = event.target.value as Language; setSelectedLanguage(next); window.localStorage.setItem('mindmitra-preferred-language', next); }}><LanguageOptionList /></select></label></nav>
    <section className="welcome-hero"><div className="hero-copy"><span className="eyebrow"><i />{tx('A calmer day, one small step at a time')}</span><h1>{tx('Welcome to MindMitra')}</h1><p className="hero-intro">{tx('A simple way to keep your mind active, remember your daily routine, and stay connected.')}</p><div className="welcome-actions">{profileName ? <button className="button button-primary" onClick={onContinue}>{signIn}<span>→</span></button> : authUser || nativeApp ? <button className="button button-primary" onClick={() => onCreate(selectedLanguage)}>{nativeApp ? tx('Create on this device') : signIn}<span>→</span></button> : <a className="button button-primary" href="/signin-with-chatgpt?return_to=%2F">{signIn}<span>→</span></a>}{!nativeApp && <button className="button button-secondary" onClick={() => onCreate(selectedLanguage)}>{tx('Create on this device')}</button>}<button className="button button-quiet" onClick={() => onDemo(selectedLanguage)}>{tx('Try demo account')}<span>↗</span></button></div><button className="caregiver-entry" onClick={() => onCaregiver(selectedLanguage)}>{tx('I’m a caregiver')} <span>→</span></button><p className="trust-note"><span>✓</span>{tx('Cognitive engagement and daily support — never a medical diagnosis.')}</p></div>
      <div className="hero-art" aria-label={tx('A gentle illustration representing care, memory, and daily wellbeing')}><div className="sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="care-card"><div className="portrait"><span>👵🏽</span></div><div><p>{tx('Good morning, Maya')}</p><small>{tx('You have 2 gentle activities today.')}</small></div></div><div className="floating-pill pill-memory"><span>✦</span><b>{tx('Mind active')}</b></div><div className="floating-pill pill-routine"><span>✓</span><b>{tx('Routine ready')}</b></div></div></section>
    <section className="welcome-benefits"><article><span>✦</span><div><h2>{tx('Gentle brain games')}</h2><p>{tx('40 short activities that adapt to you.')}</p></div></article><article><span>☀</span><div><h2>{tx('Daily support')}</h2><p>{tx('Friendly reminders for routines, water, and medicine.')}</p></div></article><article><span>⌂</span><div><h2>{tx('Family connection')}</h2><p>{tx('Meaningful games made from your own memories.')}</p></div></article></section></main>;
}

function Onboarding({ authUser, profile, initialRole, initialLanguage, onSubmit, onBack }: { authUser: AuthUser | null; profile: AppData['profile']; initialRole: 'elder' | 'caregiver'; initialLanguage: Language; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  const [language, setLanguage] = useState(initialLanguage);
  const tx = useLocaleTranslator(language);
  return <main className="onboarding-page"><header><button className="brand" onClick={onBack}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button><span>{tx('Private · elderly-friendly setup')}</span></header><section className="onboarding-card"><div className="onboarding-heading"><span className="section-kicker">{tx('Let’s set up your support')}</span><h1>{tx(profile ? 'Edit your MindMitra profile' : 'Create your MindMitra profile')}</h1><p>{tx('Large, simple fields. You can change these details later.')}</p></div><form onSubmit={onSubmit} className="onboarding-form"><fieldset><legend><span>1</span> {tx('Personal information')}</legend><div className="form-grid"><label className="span-two">{tx('Full name')}<input name="name" required defaultValue={profile?.name ?? authUser?.fullName ?? ''} placeholder={tx('Your full name')} /></label><label>{tx('Date of birth')}<input type="date" name="dateOfBirth" required defaultValue={profile?.dateOfBirth ?? ''} /></label><label>{tx('Gender (optional)')}<select name="gender" defaultValue={profile?.gender ?? ''}><option value="">{tx('Prefer not to say')}</option><option value="Female">{tx('Female')}</option><option value="Male">{tx('Male')}</option><option value="Non-binary">{tx('Non-binary')}</option><option value="Other">{tx('Other')}</option></select></label><label>{tx('Personal phone')}<input name="phone" type="tel" required placeholder={tx('Your phone number')} defaultValue={profile?.phone ?? ''} /></label><label>{tx('Email (optional)')}<input name="email" type="email" defaultValue={profile?.email ?? authUser?.email ?? ''} /></label><label>{tx('Preferred MindMitra language')}<select name="language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}><LanguageOptionList /></select></label><label>{tx('Profile type')}<select name="role" defaultValue={initialRole}><option value="elder">{tx('Elderly user')}</option><option value="caregiver">{tx('Caregiver')}</option></select></label></div></fieldset><fieldset><legend><span>2</span> {tx('SOS emergency contact')}</legend><p>{tx('This number will be used as your emergency contact and must be different from your personal phone.')}</p><div className="form-grid"><label>{tx('Contact name')}<input name="emergencyName" required defaultValue={profile?.emergencyName ?? ''} /></label><label>{tx('Emergency phone')}<input name="emergencyPhone" type="tel" required defaultValue={profile?.emergencyPhone ?? ''} /></label><label className="span-two">{tx('Relationship')}<select name="relationship" required defaultValue={profile?.emergencyRelationship ?? ''}><option value="" disabled>{tx('Choose relationship')}</option>{relationshipOptions.map((item) => <option key={item} value={item}>{tx(item)}</option>)}</select></label></div></fieldset><label className="consent-check"><input type="checkbox" required defaultChecked={Boolean(profile)} /><span>{tx('I understand that MindMitra supports cognitive engagement and daily activity. It is not a medical diagnostic or treatment device.')}</span></label><div className="form-actions"><button type="button" className="secondary-action" onClick={onBack}>{tx('Back')}</button><button className="primary-action" type="submit">{tx(profile ? 'Save profile' : 'Create profile')} →</button></div></form></section></main>;
}

function Greeting({ name, language, onName, onListen, onContinue }: { name: string; language: Language; onName: (name: string) => void; onListen: (onResult: (value: string) => void) => void; onContinue: () => void }) {
  const [value, setValue] = useState(name);
  const tx = useLocaleTranslator(language);
  return <main className="greeting-page"><section><span className="brand-mark">m</span><span className="section-kicker">{tx('A personal welcome')}</span><h1>{tx('Welcome to MindMitra!')}</h1><p>{tx('What is your full name?')}</p><div className="name-entry"><input value={value} onChange={(event) => setValue(event.target.value)} aria-label={tx('Full name')} /><button onClick={() => onListen((heard) => setValue(heard))} aria-label={tx('Speak your name')}>🎤<small>{tx('Speak')}</small></button></div><div className="meet-message">♡ {tx('Nice to meet you, {name}!', { name: value })}</div><button className="primary-action wide" onClick={() => { onName(value); onContinue(); }} disabled={!value.trim()}>{tx('Go to my home')} →</button></section></main>;
}

function PageHeader({ kicker, title, text, onBack, action, backLabel = 'Back' }: { kicker: string; title: string; text: string; onBack: () => void; action?: React.ReactNode; backLabel?: string }) {
  return <header className="page-header"><button className="back-button" onClick={onBack}>← {backLabel}</button><div><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{action && <div>{action}</div>}</header>;
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span><small>{label}</small></button>;
}

function GameCard({ game, difficulty, progress, favorite, mine, tx, onPlay, onFavorite, onMine }: { game: GameDefinition; difficulty: string; progress: GameProgress; favorite: boolean; mine: boolean; tx: (source: string, values?: TranslationValues) => string; onPlay: () => void; onFavorite: () => void; onMine: () => void }) {
  const finished = progress.completedLevels.length === 10 && !progress.inProgress;
  return <article className={`game-card game-library-card game-card-${game.category.toLowerCase()}`}><GameVisual visual={game.visual} label={tx(game.name)} /><div className="game-card-copy"><span>{tx(game.category)} · {tx(difficulty)}</span><h3>{tx(game.name)}</h3><p>{tx(game.instruction)}</p><div className="game-card-progress"><i><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></i><small>{tx('{count}/10 levels', { count: progress.completedLevels.length })} · {progress.completionCount === 1 ? tx('Completed {count} time', { count: progress.completionCount }) : tx('Completed {count} times', { count: progress.completionCount })}</small></div></div><div className="game-card-actions"><button className="play-game" onClick={onPlay}>{finished ? tx('Replay') : progress.inProgress || progress.currentLevel > 1 ? tx('Continue') : tx('Play')} →</button><button className={favorite ? 'marked' : ''} onClick={onFavorite} aria-label={favorite ? tx('Remove favorite') : tx('Add favorite')}>{favorite ? '★' : '☆'}</button><button className={mine ? 'marked' : ''} onClick={onMine} aria-label={mine ? tx('Remove from My Games') : tx('Add to My Games')}>{mine ? '✓' : '+'}</button></div></article>;
}

function GameVisual({ visual, label, compact = false }: { visual: string[]; label: string; compact?: boolean }) {
  return <div className={`game-visual ${compact ? 'compact' : ''}`} role="img" aria-label={label}>{visual.map((item, index) => <span aria-hidden="true" key={`${item}-${index}`}>{item}</span>)}</div>;
}

function GameSpeakerButton({ playing, label, speakingLabel, onClick }: { playing: boolean; label: string; speakingLabel: string; onClick: () => void }) {
  return <button className={`game-speaker ${playing ? 'is-speaking' : ''}`} onClick={onClick} aria-label={playing ? speakingLabel : label} aria-pressed={playing}><span aria-hidden="true">{playing ? '◼' : '🔊'}</span><b>{playing ? speakingLabel : label}</b></button>;
}

function FamilyPortrait({ member, large = false }: { member: FamilyMember; large?: boolean }) {
  return <div className={`family-portrait ${large ? 'large' : ''}`}>{member.photo ? <img src={member.photo} alt={member.name} /> : <span>{initials(member.name)}</span>}</div>;
}

function ReminderRow({ item, tx, onStatus }: { item: Reminder; tx: (source: string, values?: TranslationValues) => string; onStatus: (id: string, status: Reminder['status']) => void }) {
  const typeLabel: Record<Reminder['type'], string> = { medicine: 'Medicine reminders', hydration: 'Hydration', appointment: 'Appointment', routine: 'Routine', session: 'Sessions' };
  const statusLabel: Record<Reminder['status'], string> = { pending: 'Coming up', taken: 'Taken', missed: 'Missed', snoozed: 'Later' };
  const details = [item.dosage, item.location, item.date].filter(Boolean).map((value) => tx(String(value))).join(' · ');
  return <article className={`reminder-row status-${item.status}`}><time>{item.time}</time><div><b>{tx(item.title)}</b><small>{details || tx(typeLabel[item.type])}</small><em>{tx(statusLabel[item.status])}</em></div>{item.status === 'pending' ? <div className="reminder-actions"><button onClick={() => onStatus(item.id, 'taken')}>✓ {tx('Taken')}</button><button onClick={() => onStatus(item.id, 'snoozed')}>◷ {tx('Later')}</button><button onClick={() => onStatus(item.id, 'missed')}>× {tx('Missed')}</button></div> : <button className="reset-status" onClick={() => onStatus(item.id, 'pending')}>{tx('Reset')}</button>}</article>;
}

function Toggle({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="setting-row toggle-row"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></label>;
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p></div>;
}

function SosModal({ profile, tx, onClose }: { profile: AppData['profile']; tx: (source: string, values?: TranslationValues) => string; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sos-title"><section className="sos-modal"><button className="modal-close" onClick={onClose} aria-label={tx('Close')}>×</button><span className="sos-symbol">!</span><small>{tx('Emergency contact')}</small><h2 id="sos-title">{profile?.emergencyName}</h2><p>{tx(profile?.emergencyRelationship ?? '')}</p><strong>{profile?.emergencyPhone}</strong><a href={`tel:${profile?.emergencyPhone?.replace(/[^+\d]/g, '')}`}>📞 {tx('Call emergency contact')}</a><button className="secondary-action wide" onClick={onClose}>{tx('Cancel')}</button><em>{tx('MindMitra does not provide emergency services. For immediate danger or a medical emergency, contact your local emergency service.')}</em></section></div>;
}

function LanguageOptionList() { return <>{LANGUAGE_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</>; }

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function difficultyRank(value: string) { return value === 'Easy' ? 0 : value === 'Medium' ? 1 : 2; }
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); }
