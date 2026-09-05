'use client';
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element -- Client hydration restores local-first data; private family photos may be data URLs or authenticated object URLs. */

import { FormEvent, useEffect, useRef, useState } from 'react';
import { CATEGORY_INSTRUCTIONS, CATEGORIES, createBalancedSession, difficultyFor, GAME_LIBRARY, getPlayableGame } from '../lib/games';
import { createFamilyGame, FAMILY_GAME_META } from '../lib/family-games';
import { detectMitraIntent, LANGUAGE_LOCALES, LANGUAGE_OPTIONS, mitraReply } from '../lib/mitra';
import { clearLocalData, demoData, emptyData, loadLocalData, normalizeData, saveLocalData } from '../lib/storage';
import type { AppData, Category, FamilyGameProgress, FamilyGameType, FamilyMember, GameDefinition, GameProgress, GameResult, Language, PlayableGame, Reminder, RoutineItem, SessionSummary } from '../lib/types';

type Screen = 'welcome' | 'onboarding' | 'greeting' | 'home' | 'games' | 'game-detail' | 'session' | 'game' | 'family' | 'medicines' | 'hydration' | 'routine' | 'appointments' | 'progress' | 'assistant' | 'settings' | 'caregiver' | 'summary';
type AuthUser = { userId: string; displayName: string; email: string; fullName: string | null };
type ActiveSession = { id: string; minutes: number; games: GameDefinition[]; index: number; startedAt: string; resultIds: string[] };

const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().slice(0, 10);
const relationshipOptions = ['Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Caregiver', 'Friend', 'Other'];
const newGameProgress = (gameId: number): GameProgress => ({ gameId, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, updatedAt: new Date().toISOString() });
const newFamilyProgress = (type: FamilyGameType): FamilyGameProgress => ({ type, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, updatedAt: new Date().toISOString() });
const isMindMitraNative = () => typeof navigator !== 'undefined' && navigator.userAgent.includes('MindMitraAndroid');

const COPY = {
  en: { home: 'Home', games: 'Games', family: 'Family', progress: 'Progress', settings: 'Settings', greeting: 'Good morning', today: 'Today', activities: 'activities', reminder: 'reminder', back: 'Back', save: 'Save', cancel: 'Cancel', start: 'Start', done: 'Done', next: 'Next', allGames: 'All games', recommended: 'Recommended for you', online: 'Online · saved', offline: 'Offline · saved here', syncing: 'Saving…', synced: 'Everything saved', assistant: 'Talk to Mitra', sos: 'SOS' },
  hi: { home: 'होम', games: 'खेल', family: 'परिवार', progress: 'प्रगति', settings: 'सेटिंग्स', greeting: 'सुप्रभात', today: 'आज', activities: 'गतिविधियाँ', reminder: 'रिमाइंडर', back: 'वापस', save: 'सहेजें', cancel: 'रद्द करें', start: 'शुरू करें', done: 'हो गया', next: 'आगे', allGames: 'सभी खेल', recommended: 'आपके लिए सुझाव', online: 'ऑनलाइन · सुरक्षित', offline: 'ऑफ़लाइन · यहाँ सुरक्षित', syncing: 'सहेज रहे हैं…', synced: 'सब कुछ सुरक्षित है', assistant: 'मित्रा से बात करें', sos: 'SOS' },
  as: { home: 'মূল পৃষ্ঠা', games: 'খেল', family: 'পৰিয়াল', progress: 'অগ্ৰগতি', settings: 'ছেটিংছ', greeting: 'সুপ্ৰভাত', today: 'আজি', activities: 'কাম', reminder: 'সোঁৱৰাই দিয়া', back: 'পিছলৈ', save: 'সংৰক্ষণ', cancel: 'বাতিল', start: 'আৰম্ভ', done: 'সম্পূৰ্ণ', next: 'পৰৱৰ্তী', allGames: 'সকলো খেল', recommended: 'আপোনাৰ বাবে', online: 'অনলাইন · সংৰক্ষিত', offline: 'অফলাইন · ইয়াতে সংৰক্ষিত', syncing: 'সংৰক্ষণ হৈ আছে…', synced: 'সকলো সংৰক্ষিত', assistant: 'মিত্ৰাৰ সৈতে কথা পাতক', sos: 'SOS' },
};

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
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [gameCategory, setGameCategory] = useState<'All' | Category>('All');
  const [gameSearch, setGameSearch] = useState('');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantReply, setAssistantReply] = useState('Hello! I’m Mitra. I’m here with you. What would you like to do?');
  const [familyQuiz, setFamilyQuiz] = useState<FamilyMember | null>(null);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [notificationMessage, setNotificationMessage] = useState('');
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const language: Language = data.profile?.language ?? 'en';
  const t = COPY[language as keyof typeof COPY] ?? COPY.en;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    const local = loadLocalData();
    setData(local);
    if (local.profile) {
      const quick = new URLSearchParams(window.location.search).get('open');
      if (quick === 'sos') setShowSos(true);
      setScreen(quick === 'games' || quick === 'routine' ? quick : local.profile.role === 'caregiver' ? 'caregiver' : 'home');
    }
    setOnline(navigator.onLine);
    setReady(true);
    if (!isNativeApp && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);

    const goOnline = () => setOnline(true);
    const goOffline = () => { setOnline(false); setSyncStatus('local'); notify('You’re offline. Your progress is saved and will sync later.'); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    if (!isNativeApp) fetch('/api/auth/me').then((response) => response.json()).then(async (payload) => {
      const { user } = payload as { user: AuthUser | null };
      setAuthUser(user);
      if (!user) return;
      try {
        const response = await fetch('/api/sync');
        if (!response.ok) return;
        const remote = await response.json() as { data: AppData | null; updatedAt?: string };
        if (remote.data && (!local.profile || (remote.updatedAt ?? '') > (local.updatedAt ?? ''))) {
          setData(normalizeData(remote.data));
          setScreen(remote.data.profile?.role === 'caregiver' ? 'caregiver' : 'home');
        }
      } catch { /* local data remains authoritative while offline */ }
    }).catch(() => undefined);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [isNativeApp]);

  useEffect(() => {
    if (!ready) return;
    saveLocalData(data);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (!authUser || !data.profile || data.profile.id.startsWith('demo') || !online) return;
    setSyncStatus('syncing');
    syncTimer.current = setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      try {
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { ...data, updatedAt }, updatedAt }) });
        setSyncStatus(response.ok ? 'synced' : 'local');
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
      if ('Notification' in window && Notification.permission === 'granted') new Notification('MindMitra reminder', { body: due.title, icon: '/icon-192.png' });
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [data.reminders, ready]);

  const updateData = (updater: (current: AppData) => AppData) => setData((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: data.profile?.reducedMotion ? 'auto' : 'smooth' }); };

  const startDemo = () => {
    setData(structuredClone(demoData));
    setScreen('home');
    notify('Demo account opened. Changes stay separate on this device.');
  };

  const beginOnboarding = (role: 'elder' | 'caregiver' = 'elder') => {
    setData((current) => ({ ...current, profile: current.profile ? { ...current.profile, role } : null }));
    setScreen('onboarding');
  };

  const completeOnboarding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') ?? '').trim();
    const emergencyPhone = String(form.get('emergencyPhone') ?? '').trim();
    if (phone.replace(/\D/g, '') === emergencyPhone.replace(/\D/g, '')) {
      notify('Personal and emergency phone numbers must be different.');
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
    updateData((current) => ({ ...current, profile }));
    setScreen(role === 'caregiver' ? 'caregiver' : 'greeting');
  };

  const speak = (text: string) => {
    if (!data.profile?.voice || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_LOCALES[language];
    window.speechSynthesis.speak(utterance);
  };

  const listen = (onResult: (value: string) => void) => {
    const browser = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) { notify('Voice input isn’t available. You can type instead.'); return; }
    const recognition = new Recognition();
    recognition.lang = LANGUAGE_LOCALES[language];
    recognition.interimResults = false;
    recognition.onresult = (event) => onResult(event.results[0][0].transcript);
    recognition.onerror = () => notify('I couldn’t hear that. Please try again or type instead.');
    recognition.start();
  };

  const gameProgressFor = (gameId: number) => data.gameProgress[String(gameId)] ?? newGameProgress(gameId);
  const familyProgressFor = (type: FamilyGameType) => data.familyGameProgress[type] ?? newFamilyProgress(type);

  const openGame = (game: GameDefinition) => {
    setFocusedGame(game);
    setFamilyQuiz(null);
    go('game-detail');
  };

  const launchGame = (game: GameDefinition, requestedLevel?: number, replay = false, freshAttempt = false) => {
    const progress = gameProgressFor(game.id);
    const level = requestedLevel ?? progress.inProgress?.level ?? progress.currentLevel;
    const generated = getPlayableGame(game, level, replay);
    const savedState = !freshAttempt && progress.inProgress?.level === level ? progress.inProgress.state : undefined;
    const playable = savedState ? { ...generated, ...savedState } : generated;
    const restoredAnswer = progress.inProgress?.level === level ? progress.inProgress.selectedAnswer ?? '' : '';
    setFocusedGame(game);
    setFamilyQuiz(null);
    setSelectedGame(playable);
    setSelectedAnswer(restoredAnswer);
    setAnswerSaved(false);
    setGameStartedAt(Date.now());
    updateData((current) => ({
      ...current,
      gameProgress: {
        ...current.gameProgress,
        [String(game.id)]: { ...(current.gameProgress[String(game.id)] ?? newGameProgress(game.id)), currentLevel: level, inProgress: { level, selectedAnswer: restoredAnswer, startedAt: new Date().toISOString(), state: { prompt: playable.prompt, options: playable.options, answer: playable.answer } }, updatedAt: new Date().toISOString() },
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

  const selectAnswer = (answer: string) => {
    if (!selectedGame) return;
    setSelectedAnswer(answer);
    updateData((current) => selectedGame.familyType ? ({
      ...current,
      familyGameProgress: {
        ...current.familyGameProgress,
        [selectedGame.familyType]: { ...(current.familyGameProgress[selectedGame.familyType] ?? newFamilyProgress(selectedGame.familyType)), inProgress: { ...(current.familyGameProgress[selectedGame.familyType]?.inProgress ?? { level: selectedGame.level, startedAt: new Date(gameStartedAt).toISOString() }), level: selectedGame.level, selectedAnswer: answer }, updatedAt: new Date().toISOString() },
      },
    }) : ({
      ...current,
      gameProgress: {
        ...current.gameProgress,
        [String(selectedGame.id)]: { ...(current.gameProgress[String(selectedGame.id)] ?? newGameProgress(selectedGame.id)), inProgress: { ...(current.gameProgress[String(selectedGame.id)]?.inProgress ?? { level: selectedGame.level, startedAt: new Date(gameStartedAt).toISOString() }), level: selectedGame.level, selectedAnswer: answer }, updatedAt: new Date().toISOString() },
      },
    }));
  };

  const saveGameAnswer = () => {
    if (!selectedGame || !selectedAnswer || answerSaved) return;
    const correct = selectedAnswer === selectedGame.answer;
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
        const completed = correct ? Array.from(new Set([...old.completedLevels, selectedGame.level])).sort((a, b) => a - b) : old.completedLevels;
        return {
          ...current,
          results: [...current.results, result],
          familyGameProgress: {
            ...current.familyGameProgress,
            [selectedGame.familyType]: { ...old, attempts: old.attempts + 1, completedLevels: completed, unlockedLevel: correct ? Math.min(10, Math.max(old.unlockedLevel, selectedGame.level + 1)) : old.unlockedLevel, currentLevel: correct ? Math.min(10, selectedGame.level + 1) : selectedGame.level, inProgress: correct ? undefined : old.inProgress, updatedAt: new Date().toISOString() },
          },
        };
      }
      const old = current.gameProgress[String(selectedGame.id)] ?? newGameProgress(selectedGame.id);
      const completed = correct ? Array.from(new Set([...old.completedLevels, selectedGame.level])).sort((a, b) => a - b) : old.completedLevels;
      return {
        ...current,
        results: [...current.results, result],
        gameProgress: {
          ...current.gameProgress,
          [String(selectedGame.id)]: { ...old, attempts: old.attempts + 1, completedLevels: completed, unlockedLevel: correct ? Math.min(10, Math.max(old.unlockedLevel, selectedGame.level + 1)) : old.unlockedLevel, currentLevel: correct ? Math.min(10, selectedGame.level + 1) : selectedGame.level, inProgress: correct ? undefined : old.inProgress, updatedAt: new Date().toISOString() },
        },
      };
    });
    if (activeSession) setActiveSession({ ...activeSession, resultIds: [...activeSession.resultIds, result.id] });
    setAnswerSaved(true);
    if (data.profile?.sound) speak(correct ? 'Well done!' : `The answer is ${selectedGame.answer}. You are doing well by practicing.`);
  };

  const continueAfterGame = () => {
    if (!activeSession) { go(selectedGame?.familyType ? 'family' : 'game-detail'); return; }
    const nextIndex = activeSession.index + 1;
    if (nextIndex < activeSession.games.length) {
      const nextSession = { ...activeSession, index: nextIndex };
      setActiveSession(nextSession);
      const nextGame = nextSession.games[nextIndex];
      launchGame(nextGame, gameProgressFor(nextGame.id).currentLevel);
      return;
    }
    const sessionResults = data.results.filter((result) => result.sessionId === activeSession.id);
    const accuracy = Math.round(([...sessionResults, { accuracy: selectedAnswer === selectedGame?.answer ? 100 : 0 }] as { accuracy: number }[]).reduce((sum, result) => sum + result.accuracy, 0) / activeSession.games.length);
    const summary: SessionSummary = { id: activeSession.id, plannedMinutes: activeSession.minutes, startedAt: activeSession.startedAt, endedAt: new Date().toISOString(), gamesCompleted: activeSession.games.length, accuracy };
    updateData((current) => ({ ...current, sessions: [...current.sessions, summary] }));
    setLastSummary(summary);
    setActiveSession(null);
    go('summary');
  };

  const startFamilyGame = (type: FamilyGameType = 'who', requestedLevel?: number, replay = false, freshAttempt = false) => {
    if (!data.family.length) { notify('Add at least one family member first.'); return; }
    const progress = familyProgressFor(type);
    const level = requestedLevel ?? progress.inProgress?.level ?? progress.currentLevel;
    const restoredAnswer = progress.inProgress?.level === level ? progress.inProgress.selectedAnswer ?? '' : '';
    const generated = createFamilyGame(type, level, data.family);
    const savedState = !freshAttempt && progress.inProgress?.level === level ? progress.inProgress.state : undefined;
    const member = savedState?.memberId ? data.family.find((item) => item.id === savedState.memberId) ?? generated.member : generated.member;
    const game = savedState ? { ...generated.game, ...savedState } : generated.game;
    game.replay = replay;
    setFocusedGame(null);
    setSelectedGame(game);
    setFamilyQuiz(member);
    setSelectedAnswer(restoredAnswer);
    setAnswerSaved(false);
    setGameStartedAt(Date.now());
    updateData((current) => ({
      ...current,
      familyGameProgress: {
        ...current.familyGameProgress,
        [type]: { ...(current.familyGameProgress[type] ?? newFamilyProgress(type)), currentLevel: level, inProgress: { level, selectedAnswer: restoredAnswer, startedAt: new Date().toISOString(), state: { prompt: game.prompt, options: game.options, answer: game.answer, memberId: member.id } }, updatedAt: new Date().toISOString() },
      },
    }));
    go('game');
  };

  const retryCurrentLevel = () => {
    if (!selectedGame) return;
    if (selectedGame.familyType) startFamilyGame(selectedGame.familyType, selectedGame.level, selectedGame.replay, true);
    else if (focusedGame) launchGame(focusedGame, selectedGame.level, selectedGame.replay, true);
  };

  const exitCurrentGame = () => {
    setActiveSession(null);
    go(selectedGame?.familyType ? 'family' : 'game-detail');
  };

  const addFamilyMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('photo');
    let photo = '';
    let photoKey = '';
    if (file instanceof File && file.size) {
      if (file.size > 5 * 1024 * 1024) { notify('Please choose a photo smaller than 5 MB.'); return; }
      photo = await fileToDataUrl(file);
      if (authUser && online && !data.profile?.id.startsWith('demo')) {
        try {
          const upload = new FormData(); upload.set('photo', file);
          const response = await fetch('/api/family-photo', { method: 'POST', body: upload });
          if (response.ok) { const stored = await response.json() as { id: string; url: string }; photo = stored.url; photoKey = stored.id; }
        } catch { notify('The photo is safely stored on this device and will be uploaded later.'); }
      }
    }
    const member: FamilyMember = { id: uid('family'), name: String(form.get('name') ?? ''), relationship: String(form.get('relationship') ?? ''), nickname: String(form.get('nickname') ?? ''), photo, photoKey, createdAt: new Date().toISOString() };
    updateData((current) => ({ ...current, family: [...current.family, member] }));
    formElement.reset();
    notify(`${member.name} was added to My Family.`);
  };

  const addReminder = (event: FormEvent<HTMLFormElement>, type: Reminder['type']) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const reminder: Reminder = { id: uid(type), type, title: String(form.get('title') ?? ''), time: String(form.get('time') ?? ''), date: String(form.get('date') ?? ''), dosage: String(form.get('dosage') ?? ''), frequency: String(form.get('frequency') ?? ''), startDate: String(form.get('startDate') ?? ''), endDate: String(form.get('endDate') ?? ''), location: String(form.get('location') ?? ''), notes: String(form.get('notes') ?? ''), status: 'pending', createdAt: new Date().toISOString() };
    updateData((current) => ({ ...current, reminders: [...current.reminders, reminder] }));
    formElement.reset();
    notify('Reminder saved.');
  };

  const setReminderStatus = (id: string, status: Reminder['status']) => updateData((current) => ({ ...current, reminders: current.reminders.map((item) => item.id === id ? { ...item, status } : item) }));

  const addRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const item: RoutineItem = { id: uid('routine'), time: String(form.get('time') ?? ''), activity: String(form.get('activity') ?? ''), done: false };
    updateData((current) => ({ ...current, routine: [...current.routine, item].sort((a, b) => a.time.localeCompare(b.time)) }));
    formElement.reset();
  };

  const runAssistant = (value = assistantInput) => {
    const command = value.trim();
    if (!command) return;
    const intent = detectMitraIntent(command, data.assistantContext.lastIntent);
    let reply = '';
    if (intent === 'session') { reply = mitraReply(language, intent); startSession(15); }
    else if (intent === 'game') {
      reply = mitraReply(language, intent);
      const resumable = GAME_LIBRARY.find((game) => Boolean(data.gameProgress[String(game.id)]?.inProgress));
      if (/continue|resume|जारी|চালিয়ে|தொடர|కొనసాగ|पुढे|ચાલુ|ಮುಂದುವರಿ|തുടര|ਜਾਰੀ|আগবঢ়/.test(command.toLowerCase()) && resumable) openGame(resumable);
      else go('games');
    }
    else if (intent === 'water') {
      const reminder: Reminder = { id: uid('hydration'), type: 'hydration', title: 'Drink a glass of water', time: new Date(Date.now() + 30 * 60000).toTimeString().slice(0, 5), status: 'pending', createdAt: new Date().toISOString() };
      updateData((current) => ({ ...current, reminders: [...current.reminders, reminder] })); reply = mitraReply(language, intent);
    }
    else if (intent === 'medicine') { const medicine = data.reminders.find((item) => item.type === 'medicine' && item.status === 'pending'); reply = mitraReply(language, intent, { detail: medicine ? `${medicine.title} · ${medicine.time}` : 'not currently scheduled' }); go('medicines'); }
    else if (intent === 'routine') { const next = data.routine.find((item) => !item.done); reply = mitraReply(language, intent, { detail: next ? `${next.activity} · ${next.time}` : 'complete for today' }); go('routine'); }
    else if (intent === 'progress') { const average = data.results.length ? Math.round(data.results.reduce((sum, item) => sum + item.accuracy, 0) / data.results.length) : 0; reply = mitraReply(language, intent, { count: data.results.length, accuracy: average }); go('progress'); }
    else if (intent === 'sos') { reply = mitraReply(language, intent); setShowSos(true); }
    else if (intent === 'family') { reply = mitraReply(language, intent, { count: data.family.length }); go('family'); }
    else if (intent === 'language') { reply = mitraReply(language, intent); go('settings'); }
    else if (intent === 'large') { updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, textSize: 'extra' } }) : current); reply = mitraReply(language, intent); }
    else if (intent === 'repeat') { reply = data.assistantContext.lastReply || assistantReply; speak(reply); }
    else if (intent === 'stop') { window.speechSynthesis?.cancel(); reply = mitraReply(language, intent); }
    else reply = mitraReply(language, intent);
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      conversations: [...current.conversations, { id: uid('message'), role: 'user', text: command, timestamp: now }, { id: uid('message'), role: 'assistant', text: reply, timestamp: now }].slice(-60),
      assistantContext: { lastIntent: intent, lastReply: reply, updatedAt: now },
    }));
    setAssistantReply(reply);
    setAssistantInput('');
    if (intent !== 'repeat') speak(reply);
  };

  if (!ready) return <main className="app-loading" aria-live="polite">Preparing MindMitra…</main>;
  if (screen === 'onboarding') return <Onboarding authUser={authUser} profile={data.profile} initialRole={data.profile?.role ?? 'elder'} onSubmit={completeOnboarding} onBack={() => setScreen('welcome')} />;
  if (screen === 'welcome' || !data.profile) return <Welcome authUser={authUser} nativeApp={isNativeApp} profileName={data.profile?.name ?? ''} language={language} onContinue={() => setScreen(data.profile?.role === 'caregiver' ? 'caregiver' : 'home')} onDemo={startDemo} onCreate={() => beginOnboarding('elder')} onCaregiver={() => beginOnboarding('caregiver')} />;
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
    <div className={`mindcare-app text-${data.profile.textSize} ${data.profile.highContrast ? 'high-contrast' : ''} ${data.profile.reducedMotion ? 'reduced-motion' : ''}`}>
      <aside className="side-nav" aria-label="Main navigation">
        <button className="brand app-brand" onClick={() => go('home')}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button>
        <NavButton icon="⌂" label={t.home} active={screen === 'home'} onClick={() => go('home')} />
        <NavButton icon="✦" label={t.games} active={['games', 'game-detail', 'session', 'game'].includes(screen)} onClick={() => go('games')} />
        <NavButton icon="♡" label={t.family} active={screen === 'family'} onClick={() => go('family')} />
        <NavButton icon="↗" label={t.progress} active={screen === 'progress'} onClick={() => go('progress')} />
        <NavButton icon="⚙" label={t.settings} active={screen === 'settings'} onClick={() => go('settings')} />
        <div className="side-nav-spacer" />
        <button className="nav-user" onClick={() => go(data.profile?.role === 'caregiver' ? 'caregiver' : 'settings')}><span>{initials(data.profile.name)}</span><small>{data.profile.name}<b>{data.profile.role}</b></small></button>
      </aside>
      <div className="app-column">
        <header className="top-bar">
          <button className="mobile-brand brand" onClick={() => go('home')}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button>
          <div className={`connection ${online && !isNativeApp ? '' : 'is-offline'}`}><i />{isNativeApp ? 'Saved on this phone' : !online ? t.offline : syncStatus === 'syncing' ? t.syncing : syncStatus === 'synced' ? t.synced : t.online}</div>
          <button className="mitra-quick" onClick={() => go('assistant')}><span>◉</span>{t.assistant}</button>
          <button className="sos-quick" onClick={() => setShowSos(true)}>! <span>{t.sos}</span></button>
        </header>
        {notificationMessage && <div className="due-banner" role="alert"><span>🔔</span><b>{notificationMessage}</b><button onClick={() => setNotificationMessage('')}>Dismiss</button></div>}
        <main className="app-content">{page}</main>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          <NavButton icon="⌂" label={t.home} active={screen === 'home'} onClick={() => go('home')} />
          <NavButton icon="✦" label={t.games} active={['games', 'game-detail', 'session', 'game'].includes(screen)} onClick={() => go('games')} />
          <NavButton icon="♡" label={t.family} active={screen === 'family'} onClick={() => go('family')} />
          <NavButton icon="◉" label="Mitra" active={screen === 'assistant'} onClick={() => go('assistant')} />
          <NavButton icon="⚙" label={t.settings} active={screen === 'settings'} onClick={() => go('settings')} />
        </nav>
      </div>
      {showSos && <SosModal profile={data.profile} onClose={() => setShowSos(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );

  function renderHome() {
    const pending = data.reminders.filter((item) => item.status === 'pending' && (!item.date || item.date === today()));
    const nextRoutine = data.routine.find((item) => !item.done);
    const cards: { icon: string; title: string; subtitle: string; screen: Screen; tone: string }[] = [
      { icon: '✦', title: 'Play Games', subtitle: 'Gentle activities for your mind', screen: 'games', tone: 'green' },
      { icon: '◷', title: 'Start Session', subtitle: `${data.profile?.sessionPreference ?? 15} minutes · balanced practice`, screen: 'session', tone: 'peach' },
      { icon: '☀', title: 'My Routine', subtitle: nextRoutine ? `Next: ${nextRoutine.activity}` : 'All done for today', screen: 'routine', tone: 'yellow' },
      { icon: '✚', title: 'Medicines', subtitle: `${pending.filter((item) => item.type === 'medicine').length} pending today`, screen: 'medicines', tone: 'blue' },
      { icon: '💧', title: 'Hydration', subtitle: `${data.hydration.glasses} of ${data.hydration.target} glasses`, screen: 'hydration', tone: 'aqua' },
      { icon: '▣', title: 'Appointments', subtitle: `${pending.filter((item) => item.type === 'appointment').length} coming up`, screen: 'appointments', tone: 'lavender' },
      { icon: '♡', title: 'My Family', subtitle: `${data.family.length} people in your memories`, screen: 'family', tone: 'rose' },
      { icon: '↗', title: 'My Progress', subtitle: `${data.results.length} games completed`, screen: 'progress', tone: 'mint' },
    ];
    return <>
      <section className="greeting-panel">
        <div><span className="section-kicker">{t.today} · {new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><h1>{t.greeting}, <em>{data.profile?.name.split(' ')[0]}</em> <span>👋</span></h1><p>You have <b>{data.routine.filter((item) => !item.done).length} {t.activities}</b> and <b>{pending.length} {t.reminder}</b> today.</p></div>
        <button className="session-cta" onClick={() => startSession(data.profile?.sessionPreference ?? 15)}><span>✦</span><div><small>Recommended</small><b>Start a gentle session</b></div><i>→</i></button>
      </section>
      <section className="today-strip">
        <div className="today-strip-title"><span>☀</span><div><small>Coming up</small><b>{nextRoutine ? `${nextRoutine.time} · ${nextRoutine.activity}` : 'Your routine is complete'}</b></div></div>
        <div className="today-divider" />
        <div className="today-strip-title"><span>🔔</span><div><small>Next reminder</small><b>{pending[0] ? `${pending[0].time} · ${pending[0].title}` : 'Nothing pending'}</b></div></div>
        <button onClick={() => go('routine')}>View today →</button>
      </section>
      <div className="section-heading"><div><span className="section-kicker">Everything in one place</span><h2>How can we help today?</h2></div><button onClick={() => go('caregiver')}>Caregiver view <span>→</span></button></div>
      <section className="dashboard-grid">{cards.map((card) => <button className={`dashboard-card ${card.tone}`} key={card.title} onClick={() => go(card.screen)}><span className="dashboard-icon">{card.icon}</span><div><h3>{card.title}</h3><p>{card.subtitle}</p></div><i>→</i></button>)}</section>
      <section className="gentle-note"><span>❀</span><div><b>A little practice goes a long way</b><p>There is no perfect score here. Take your time, enjoy the activity, and pause whenever you need.</p></div></section>
    </>;
  }

  function renderGames() {
    const filtered = GAME_LIBRARY.filter((game) => (gameCategory === 'All' || game.category === gameCategory) && game.name.toLowerCase().includes(gameSearch.toLowerCase()));
    const recommended = [...CATEGORIES].sort((a, b) => difficultyRank(difficultyFor(a, data.results)) - difficultyRank(difficultyFor(b, data.results))).slice(0, 3).map((category) => GAME_LIBRARY.find((game) => game.category === category)!).filter(Boolean);
    return <>
      <PageHeader kicker="Game center" title="Choose a gentle activity" text="Every game has 10 meaningful levels. Your exact place is saved automatically." onBack={() => go('home')} />
      <div className="game-actions"><button className="primary-action" onClick={() => go('session')}>◷ Start a balanced session</button><label className="search-box">⌕<input value={gameSearch} onChange={(event) => setGameSearch(event.target.value)} placeholder="Find a game" /></label></div>
      <section><div className="section-heading compact"><div><span className="section-kicker">{t.recommended}</span><h2>Good choices for today</h2></div></div><div className="recommended-row">{recommended.map((game) => <GameCard key={game.id} game={game} difficulty={difficultyFor(game.category, data.results)} progress={gameProgressFor(game.id)} favorite={data.favorites.includes(game.id)} mine={data.myGames.includes(game.id)} onPlay={() => openGame(game)} onFavorite={() => toggleNumber('favorites', game.id)} onMine={() => toggleNumber('myGames', game.id)} />)}</div></section>
      <section><div className="section-heading compact"><div><span className="section-kicker">{t.allGames} · {GAME_LIBRARY.length} · 400 levels</span><h2>Explore every activity</h2></div></div><div className="category-tabs"><button className={gameCategory === 'All' ? 'active' : ''} onClick={() => setGameCategory('All')}>All</button>{CATEGORIES.map((category) => <button className={gameCategory === category ? 'active' : ''} key={category} onClick={() => setGameCategory(category)}>{category}</button>)}</div><div className="game-grid">{filtered.map((game) => <GameCard key={game.id} game={game} difficulty={difficultyFor(game.category, data.results)} progress={gameProgressFor(game.id)} favorite={data.favorites.includes(game.id)} mine={data.myGames.includes(game.id)} onPlay={() => openGame(game)} onFavorite={() => toggleNumber('favorites', game.id)} onMine={() => toggleNumber('myGames', game.id)} />)}</div></section>
    </>;
  }

  function toggleNumber(field: 'favorites' | 'myGames', id: number) {
    updateData((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] }));
  }

  function renderGameDetail() {
    if (!focusedGame) return null;
    const progress = gameProgressFor(focusedGame.id);
    const finished = progress.completedLevels.length === 10;
    return <>
      <PageHeader kicker={`${focusedGame.category} · 10 levels`} title={focusedGame.name} text={focusedGame.instruction} onBack={() => go('games')} />
      <section className="level-overview card-panel">
        <div className="level-overview-head"><div className={`game-icon game-${focusedGame.category.toLowerCase()}`}>{focusedGame.icon}</div><div><span>{progress.completedLevels.length} of 10 completed</span><h2>{finished ? 'All levels complete!' : progress.inProgress ? `Ready to resume Level ${progress.inProgress.level}` : `Level ${progress.currentLevel} is ready`}</h2><p>Your progress is saved on this device and synced with your account when signed in.</p></div></div>
        <div className="level-progress-track"><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></div>
        <div className="level-grid" aria-label="Game levels">{Array.from({ length: 10 }, (_, index) => index + 1).map((level) => { const complete = progress.completedLevels.includes(level); const unlocked = level <= progress.unlockedLevel; return <button key={level} disabled={!unlocked} className={`${complete ? 'complete' : ''} ${progress.inProgress?.level === level ? 'current' : ''}`} onClick={() => launchGame(focusedGame, level, finished)}><small>{complete ? '✓' : unlocked ? 'Level' : 'Locked'}</small><b>{level}</b></button>; })}</div>
        <div className="level-actions">{finished ? <button className="primary-action" onClick={() => { updateData((current) => { const old = current.gameProgress[String(focusedGame.id)] ?? newGameProgress(focusedGame.id); return { ...current, gameProgress: { ...current.gameProgress, [String(focusedGame.id)]: { ...old, currentLevel: 1, replayCount: old.replayCount + 1, updatedAt: new Date().toISOString() } } }; }); launchGame(focusedGame, 1, true); }}>↻ Replay game with a fresh shuffle</button> : <button className="primary-action" onClick={() => launchGame(focusedGame, progress.inProgress?.level ?? progress.currentLevel)}>{progress.inProgress ? 'Continue game' : 'Start level'} →</button>}<button className="secondary-action" onClick={() => go('games')}>Exit</button></div>
      </section>
    </>;
  }

  function renderSession() {
    return <><PageHeader kicker="Balanced practice" title="Choose session duration" text="We’ll distribute games evenly across memory, attention, reasoning, recognition, language, routine, emotion, and cultural categories." onBack={() => go('games')} />
      <div className="duration-grid">{[5, 15, 30].map((minutes) => <button key={minutes} onClick={() => startSession(minutes)}><b>{minutes}</b><span>minutes</span><small>{createBalancedSession(minutes).length} gentle games</small></button>)}<div className="custom-duration"><b>Custom</b><label><span>{customMinutes} minutes</span><input type="range" min="1" max="60" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value))} /></label><button onClick={() => startSession(customMinutes)}>Start custom session</button></div></div>
      <div className="distribution-preview"><span>◎</span><div><b>Fair and balanced</b><p>The session rotates through all eight cognitive activity categories. Your difficulty level is adapted per category, never treated as a medical measurement.</p></div></div></>;
  }

  function renderGame() {
    if (!selectedGame) return null;
    const difficulty = difficultyFor(selectedGame.category, data.results);
    return <div className="game-stage">
      <div className="game-top"><button className="back-button" onClick={exitCurrentGame}>← Exit game</button>{activeSession ? <div className="session-progress"><span style={{ width: `${((activeSession.index + 1) / activeSession.games.length) * 100}%` }} /><b>{activeSession.index + 1} of {activeSession.games.length}</b></div> : <div className="session-progress level-session-progress"><span style={{ width: `${selectedGame.level * 10}%` }} /><b>Level {selectedGame.level} of 10</b></div>}<button className="mini-sos" onClick={() => setShowSos(true)}>! SOS</button></div>
      <section className="play-card"><div className="play-meta"><span>{selectedGame.icon}</span><div><small>{selectedGame.category} · {difficulty} · Level {selectedGame.level}</small><h1>{selectedGame.name}</h1></div></div><p className="instruction">{selectedGame.instruction || CATEGORY_INSTRUCTIONS[language]?.[selectedGame.category] || CATEGORY_INSTRUCTIONS.en![selectedGame.category]}</p>
        {familyQuiz && <FamilyPortrait member={familyQuiz} large />}
        <h2 className="game-prompt">{selectedGame.prompt}</h2>
        <div className="answer-grid">{selectedGame.options.map((option) => <button disabled={answerSaved} className={`${selectedAnswer === option ? 'selected' : ''} ${answerSaved && option === selectedGame.answer ? 'correct' : ''} ${answerSaved && selectedAnswer === option && option !== selectedGame.answer ? 'wrong' : ''}`} key={option} onClick={() => selectAnswer(option)}><span>{option}</span><i>{selectedAnswer === option ? '✓' : ''}</i></button>)}</div>
        {!answerSaved ? <button className="primary-action wide" disabled={!selectedAnswer} onClick={saveGameAnswer}>Check my answer</button> : <div className={`answer-feedback ${selectedAnswer === selectedGame.answer ? 'correct' : 'gentle'}`}><span>{selectedAnswer === selectedGame.answer ? '✓' : '♡'}</span><div><b>{selectedAnswer === selectedGame.answer ? 'Well done — level complete!' : 'Good try — practice helps.'}</b><p>{selectedAnswer === selectedGame.answer ? (selectedGame.level === 10 ? 'You completed the final level.' : `Level ${Math.min(10, selectedGame.level + 1)} is now unlocked.`) : `The answer is ${selectedGame.answer}. Try this level again when you are ready.`}</p></div>{selectedAnswer === selectedGame.answer || activeSession ? <button onClick={continueAfterGame}>{activeSession ? 'Continue session' : selectedGame.familyType ? 'Back to family games' : 'View levels'} →</button> : <button onClick={retryCurrentLevel}>Try again ↻</button>}</div>}
        <button className="exit-game-button" onClick={exitCurrentGame}>Save and exit game</button>
      </section>
    </div>;
  }

  function renderFamily() {
    return <><PageHeader kicker="Personal memories" title="My Family" text="Add people who matter to you. Photos stay private and are used only to create your personal memory activities." onBack={() => go('home')} action={<button className="primary-action" onClick={() => startFamilyGame('who')}>♡ Play family game</button>} />
      <div className="family-layout"><section className="family-list card-panel"><div className="panel-title"><div><span className="section-kicker">Your circle</span><h2>{data.family.length} family members</h2></div></div>{data.family.length ? <div className="family-grid">{data.family.map((member) => <article key={member.id}><FamilyPortrait member={member} /><div><h3>{member.name}</h3><p>{member.relationship}{member.nickname ? ` · “${member.nickname}”` : ''}</p></div><button aria-label={`Remove ${member.name}`} onClick={() => updateData((current) => ({ ...current, family: current.family.filter((item) => item.id !== member.id) }))}>×</button></article>)}</div> : <EmptyState icon="♡" title="Add your first family memory" text="A name, relationship, and optional photo are enough to begin." />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">Add someone</span><h2>Create a family profile</h2><form onSubmit={addFamilyMember} className="stack-form"><label>Full name<input name="name" required placeholder="e.g. Raj Das" /></label><div className="two-fields"><label>Relationship<select name="relationship" required defaultValue=""><option value="" disabled>Choose</option>{relationshipOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Nickname (optional)<input name="nickname" placeholder="e.g. Raju" /></label></div><label className="upload-field">Photo (optional)<input type="file" name="photo" accept="image/*" capture="user" /><small>Take a photo or choose one from your phone. Maximum 5 MB.</small></label><button className="primary-action wide" type="submit">Add to My Family</button></form></section></div>
      <section className="memory-modes">{(Object.keys(FAMILY_GAME_META) as FamilyGameType[]).map((type) => { const meta = FAMILY_GAME_META[type]; const progress = familyProgressFor(type); const finished = progress.completedLevels.length === 10; return <article key={type}><span>{meta.icon}</span><h3>{meta.name}</h3><p>{meta.description}</p><div className="mini-level-track"><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></div><small>{progress.completedLevels.length}/10 levels complete</small><div className="family-levels">{Array.from({ length: 10 }, (_, index) => index + 1).map((level) => <button key={level} disabled={level > progress.unlockedLevel} className={progress.completedLevels.includes(level) ? 'complete' : ''} onClick={() => startFamilyGame(type, level, finished)}>{progress.completedLevels.includes(level) ? '✓' : level}</button>)}</div><button onClick={() => { if (finished) updateData((current) => { const old = current.familyGameProgress[type] ?? newFamilyProgress(type); return { ...current, familyGameProgress: { ...current.familyGameProgress, [type]: { ...old, currentLevel: 1, replayCount: old.replayCount + 1, updatedAt: new Date().toISOString() } } }; }); startFamilyGame(type, finished ? 1 : progress.inProgress?.level ?? progress.currentLevel, finished); }}>{finished ? 'Replay with fresh questions' : progress.inProgress ? `Continue Level ${progress.inProgress.level}` : `Play Level ${progress.currentLevel}`}</button></article>; })}</section>
    </>;
  }

  function renderReminderPage(type: 'medicine' | 'appointment') {
    const isMedicine = type === 'medicine';
    const items = data.reminders.filter((item) => item.type === type);
    return <><PageHeader kicker="Daily support" title={isMedicine ? 'Medicine reminders' : 'Appointments'} text={isMedicine ? 'Record reminders only for medicines already prescribed to you. MindMitra does not recommend medication.' : 'Keep doctor visits, times, locations, and notes together.'} onBack={() => go('home')} />
      <div className="two-column"><section className="card-panel"><div className="panel-title"><h2>{isMedicine ? 'Your medicines' : 'Upcoming appointments'}</h2></div>{items.length ? <div className="reminder-list">{items.map((item) => <ReminderRow key={item.id} item={item} onStatus={setReminderStatus} />)}</div> : <EmptyState icon={isMedicine ? '✚' : '▣'} title="Nothing added yet" text="Use the form to create your first reminder." />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">New {isMedicine ? 'medicine' : 'appointment'}</span><h2>Add a reminder</h2><form className="stack-form" onSubmit={(event) => addReminder(event, type)}><label>{isMedicine ? 'Medicine name' : 'Doctor name'}<input name="title" required /></label><div className="two-fields"><label>Date<input type="date" name="date" required={!isMedicine} /></label><label>Time<input type="time" name="time" required /></label></div>{isMedicine ? <><div className="two-fields"><label>Dosage description<input name="dosage" placeholder="e.g. 1 tablet" /></label><label>Frequency<select name="frequency"><option>Daily</option><option>Twice daily</option><option>Weekly</option><option>As prescribed</option></select></label></div><div className="two-fields"><label>Start date<input type="date" name="startDate" /></label><label>End date<input type="date" name="endDate" /></label></div></> : <label>Location<input name="location" /></label>}<label>Notes<textarea name="notes" rows={3} /></label><button className="primary-action wide" type="submit">{t.save} reminder</button></form></section></div>
    </>;
  }

  function renderHydration() {
    const progress = Math.min(100, Math.round((data.hydration.glasses / Math.max(1, data.hydration.target)) * 100));
    return <><PageHeader kicker="Daily support" title="Hydration" text="A gentle nudge to drink water during your waking hours." onBack={() => go('home')} />
      <div className="hydration-layout"><section className="water-card"><div className="water-orb"><span>💧</span><b>{data.hydration.glasses}</b><small>of {data.hydration.target} glasses</small></div><div className="water-progress"><span style={{ width: `${progress}%` }} /></div><h2>{progress >= 100 ? 'Target reached — well done!' : 'It is time to drink some water.'}</h2><button className="primary-action" onClick={() => updateData((current) => ({ ...current, hydration: { ...current.hydration, glasses: Math.min(current.hydration.target, current.hydration.glasses + 1), date: today() } }))}>✓ I drank a glass</button><button className="secondary-action" onClick={() => { const later = new Date(Date.now() + 20 * 60000).toTimeString().slice(0, 5); updateData((current) => ({ ...current, reminders: [...current.reminders, { id: uid('water'), type: 'hydration', title: 'Drink a glass of water', time: later, status: 'pending', createdAt: new Date().toISOString() }] })); notify('We’ll remind you again in 20 minutes.'); }}>Remind me later</button></section>
      <section className="card-panel form-panel"><span className="section-kicker">Your plan</span><h2>Hydration settings</h2><form className="stack-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateData((current) => ({ ...current, hydration: { ...current.hydration, interval: Number(form.get('interval')), wakeTime: String(form.get('wakeTime')), sleepTime: String(form.get('sleepTime')), target: Number(form.get('target')) } })); notify('Hydration plan saved.'); }}><label>Reminder interval<select name="interval" defaultValue={data.hydration.interval}><option value="60">Every hour</option><option value="90">Every 90 minutes</option><option value="120">Every 2 hours</option><option value="180">Every 3 hours</option></select></label><div className="two-fields"><label>Wake time<input type="time" name="wakeTime" defaultValue={data.hydration.wakeTime} /></label><label>Sleep time<input type="time" name="sleepTime" defaultValue={data.hydration.sleepTime} /></label></div><label>Daily target<input type="number" min="1" max="20" name="target" defaultValue={data.hydration.target} /></label><button className="primary-action wide">Save plan</button></form></section></div>
    </>;
  }

  function renderRoutine() {
    return <><PageHeader kicker="Today’s timeline" title="My Routine" text="A clear, reassuring plan for the day. Tap an activity when it is complete." onBack={() => go('home')} />
      <div className="two-column"><section className="card-panel"><div className="routine-list">{data.routine.map((item) => <button key={item.id} className={item.done ? 'done' : ''} onClick={() => updateData((current) => ({ ...current, routine: current.routine.map((routine) => routine.id === item.id ? { ...routine, done: !routine.done } : routine) }))}><time>{item.time}</time><i /><span>{item.activity}</span><b>{item.done ? '✓' : '○'}</b></button>)}</div>{!data.routine.length && <EmptyState icon="☀" title="Your day is open" text="Add the first activity using the form." />}</section>
      <section className="card-panel form-panel"><span className="section-kicker">New activity</span><h2>Add to today</h2><form className="stack-form" onSubmit={addRoutine}><label>Time<input name="time" type="time" required /></label><label>Activity<input name="activity" placeholder="e.g. Morning walk" required /></label><button className="primary-action wide">Add activity</button></form></section></div>
    </>;
  }

  function renderProgress() {
    const totals = CATEGORIES.map((category) => { const results = data.results.filter((result) => result.category === category); return { category, count: results.length, accuracy: results.length ? Math.round(results.reduce((sum, result) => sum + result.accuracy, 0) / results.length) : 0 }; });
    const last7 = data.results.filter((result) => Date.now() - new Date(result.date).getTime() < 7 * 86400000);
    return <><PageHeader kicker="Cognitive activity" title="Your Progress" text="These scores show game practice only. They are not medical measurements or a diagnosis." onBack={() => go('home')} />
      <div className="stat-grid"><article><span>✦</span><small>Games today</small><b>{data.results.filter((result) => result.date.slice(0, 10) === today()).length}</b></article><article><span>◷</span><small>This week</small><b>{last7.length}</b></article><article><span>◎</span><small>Average accuracy</small><b>{data.results.length ? Math.round(data.results.reduce((sum, result) => sum + result.accuracy, 0) / data.results.length) : 0}%</b></article><article><span>↗</span><small>Sessions</small><b>{data.sessions.length}</b></article></div>
      <section className="card-panel progress-card"><div className="panel-title"><div><span className="section-kicker">By activity category</span><h2>Game performance</h2></div></div><div className="bar-chart">{totals.map((item) => <div key={item.category}><span>{item.category}</span><div><i style={{ width: `${item.accuracy}%` }} /></div><b>{item.count ? `${item.accuracy}%` : 'New'}</b></div>)}</div></section>
      <section className="card-panel"><div className="panel-title"><h2>Recent activity</h2></div><div className="history-list">{data.results.slice().reverse().slice(0, 8).map((result) => <article key={result.id}><span>{GAME_LIBRARY.find((game) => game.id === result.gameId)?.icon ?? '♡'}</span><div><b>{result.game}</b><small>{new Date(result.date).toLocaleDateString()} · {result.difficulty} · {result.responseTime}s</small></div><strong>{result.accuracy}%</strong></article>)}{!data.results.length && <EmptyState icon="↗" title="Your progress starts with one game" text="Complete a gentle activity and your result will appear here." />}</div></section>
    </>;
  }

  function renderAssistant() {
    const examples = ['Start a game', 'Start a 15 minute session', 'Remind me to drink water', 'When is my medicine?', 'What should I do next?', 'Open my family'];
    const conversation = data.conversations.slice(-12);
    return <><PageHeader kicker="Your voice companion" title="Talk to Mitra" text={`Speak or type naturally. Mitra remembers the recent conversation and responds in ${LANGUAGE_OPTIONS.find((item) => item.value === language)?.label}.`} onBack={() => go('home')} />
      <section className="assistant-card"><div className="mitra-avatar"><span>◉</span><i /></div><div className="conversation" aria-live="polite">{conversation.length ? conversation.map((message) => <div key={message.id} className={`chat-bubble ${message.role === 'user' ? 'user' : ''}`}><small>{message.role === 'user' ? 'You' : 'Mitra'}</small><p>{message.text}</p>{message.role === 'assistant' && <button onClick={() => speak(message.text)}>🔊 Hear this</button>}</div>) : <div className="chat-bubble"><small>Mitra</small><p>{mitraReply(language, 'greeting')}</p><button onClick={() => speak(mitraReply(language, 'greeting'))}>🔊 Hear this</button></div>}</div><div className="assistant-compose"><input aria-label="Message Mitra" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') runAssistant(); }} placeholder="Type a message or request…" /><button className="voice-button" onClick={() => listen((value) => { setAssistantInput(value); runAssistant(value); })} aria-label="Speak to Mitra">🎤</button><button className="send-button" onClick={() => runAssistant()}>Send</button></div><div className="command-chips">{examples.map((example) => <button key={example} onClick={() => runAssistant(example)}>{example}</button>)}</div></section>
      <p className="privacy-note">Mitra keeps recent conversation context in your saved MindMitra data. Its built-in companion features do not send the conversation to an external AI service.</p>
    </>;
  }

  function renderSettings() {
    return <><PageHeader kicker="Make MindMitra yours" title="Settings & Profile" text="Changes apply immediately and are saved for this account." onBack={() => go('home')} />
      <div className="settings-layout"><section className="card-panel"><div className="setting-row"><div><b>Text size</b><p>Choose the most comfortable reading size.</p></div><div className="segmented">{(['normal', 'large', 'extra'] as const).map((size) => <button className={data.profile?.textSize === size ? 'active' : ''} key={size} onClick={() => updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, textSize: size } }) : current)}>{size === 'extra' ? 'Extra large' : titleCase(size)}</button>)}</div></div>
        <Toggle label="High contrast" text="Stronger colors and borders." checked={data.profile?.highContrast ?? false} onChange={(checked) => updateProfile('highContrast', checked)} />
        <Toggle label="Voice responses" text="Let Mitra read helpful responses aloud." checked={data.profile?.voice ?? false} onChange={(checked) => updateProfile('voice', checked)} />
        <Toggle label="Sound effects" text="Play gentle success feedback." checked={data.profile?.sound ?? false} onChange={(checked) => updateProfile('sound', checked)} />
        <Toggle label="Reduced motion" text="Turn off movement and transitions." checked={data.profile?.reducedMotion ?? false} onChange={(checked) => updateProfile('reducedMotion', checked)} />
        <div className="setting-row"><div><b>Mitra language</b><p>Mitra’s text and voice use your selected language. Core navigation falls back to English where a translation is not yet available.</p></div><select value={language} onChange={(event) => updateProfile('language', event.target.value as Language)}><LanguageOptionList /></select></div>
        <div className="setting-row"><div><b>Notifications</b><p>Allow medicine, hydration, appointment, and routine alerts.</p></div><button className="secondary-action" onClick={requestNotifications}>Enable</button></div></section>
      <section className="card-panel profile-settings"><span className="section-kicker">Profile</span><h2>{data.profile?.name}</h2><p>{data.profile?.phone}<br />{data.profile?.email}</p><div className="emergency-box"><small>Emergency contact</small><b>{data.profile?.emergencyName}</b><span>{data.profile?.emergencyRelationship} · {data.profile?.emergencyPhone}</span></div><div className="code-box"><small>Caregiver connection code</small><b>{data.profile?.caregiverCode}</b><p>Share only with a caregiver you trust.</p></div><button className="secondary-action wide" onClick={() => setScreen('onboarding')}>Edit profile</button><button className="secondary-action wide profile-logout" onClick={() => { if (authUser) window.location.href = '/signout-with-chatgpt?return_to=%2F'; else setScreen('welcome'); }}>Log out</button><button className="danger-link" onClick={deleteAccount}>Delete my account and data</button></section></div>
      <details className="disclaimer"><summary>Important medical disclaimer</summary><p>MindMitra is designed for cognitive engagement, memory assistance, and daily activity support. It is not a medical diagnostic or treatment device. Game performance should not be interpreted as a diagnosis of dementia or any other medical condition. Please consult a qualified healthcare professional for medical concerns.</p></details>
    </>;
  }

  function updateProfile<K extends keyof NonNullable<AppData['profile']>>(key: K, value: NonNullable<AppData['profile']>[K]) {
    updateData((current) => current.profile ? ({ ...current, profile: { ...current.profile, [key]: value } }) : current);
  }

  async function requestNotifications() {
    if (!('Notification' in window)) { notify('Notifications are unavailable. You can still view reminders inside the app.'); return; }
    const permission = await Notification.requestPermission();
    notify(permission === 'granted' ? 'Notifications enabled.' : 'Notifications are disabled. You can still view reminders inside the app.');
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your profile, family records, reminders, and game history from this device and synced account?')) return;
    if (authUser && online) await fetch('/api/sync', { method: 'DELETE' }).catch(() => undefined);
    clearLocalData(); setData(emptyData); setScreen('welcome');
  }

  function renderCaregiver() {
    const missed = data.reminders.filter((item) => item.status === 'missed').length;
    return <><PageHeader kicker="Authorized family support" title="Caregiver Dashboard" text="View cognitive activity and help manage reminders, routines, and family memories. This is not a diagnostic dashboard." onBack={() => go('home')} />
      {!data.caregiverConnected ? <section className="connect-card"><span>🔗</span><h2>Connect with an elderly user</h2><p>Ask the person to share the connection code shown in their Settings. Connection requires their explicit authorization.</p><form onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('code') ?? '').toUpperCase(); if (value === data.profile?.caregiverCode) { updateData((current) => ({ ...current, caregiverConnected: true })); notify('Caregiver access connected.'); } else notify('That code does not match this profile.'); }}><input name="code" placeholder="Enter connection code" required /><button className="primary-action">Connect</button></form></section> : <>
        <div className="care-recipient"><span>{initials(data.profile?.name ?? '')}</span><div><small>Connected account</small><b>{data.profile?.name}</b></div><i>Authorized ✓</i></div>
        <div className="stat-grid caregiver-stats"><article><span>✦</span><small>Games completed</small><b>{data.results.length}</b></article><article><span>◷</span><small>Session minutes</small><b>{data.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0)}</b></article><article><span>✓</span><small>Reminders completed</small><b>{data.reminders.filter((item) => item.status === 'taken').length}</b></article><article><span>!</span><small>Reminders missed</small><b>{missed}</b></article></div>
        <section className="caregiver-actions"><button onClick={() => go('medicines')}><span>✚</span><b>Add medicine reminder</b><small>Record prescribed medicine times</small></button><button onClick={() => go('routine')}><span>☀</span><b>Manage routine</b><small>Add or complete daily activities</small></button><button onClick={() => go('family')}><span>♡</span><b>Add family memory</b><small>Upload a private familiar photo</small></button><button onClick={() => go('progress')}><span>↗</span><b>View game performance</b><small>See activity trends by category</small></button></section>
        <section className="card-panel"><div className="panel-title"><h2>Recent activity</h2></div><div className="history-list">{data.results.slice().reverse().slice(0, 5).map((result) => <article key={result.id}><span>✦</span><div><b>{result.game}</b><small>{result.category} · {new Date(result.date).toLocaleString()}</small></div><strong>{result.accuracy}%</strong></article>)}</div></section>
      </>}
    </>;
  }

  function renderSummary() {
    if (!lastSummary) return null;
    return <section className="summary-card"><div className="celebration">✦ <span>🎉</span> ✦</div><span className="section-kicker">Session complete</span><h1>You did it, {data.profile?.name.split(' ')[0]}!</h1><p>Thank you for taking this gentle time for yourself.</p><div className="summary-stats"><article><small>Planned time</small><b>{lastSummary.plannedMinutes} min</b></article><article><small>Games completed</small><b>{lastSummary.gamesCompleted}</b></article><article><small>Accuracy</small><b>{lastSummary.accuracy}%</b></article></div><div className="summary-note">These are game-practice scores, not medical measurements.</div><div className="summary-actions"><button className="primary-action" onClick={() => startSession(lastSummary.plannedMinutes)}>Play another session</button><button className="secondary-action" onClick={() => go('home')}>Return home</button></div></section>;
  }
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onerror: () => void;
  start: () => void;
}

function Welcome({ authUser, nativeApp, profileName, language, onContinue, onDemo, onCreate, onCaregiver }: { authUser: AuthUser | null; nativeApp: boolean; profileName: string; language: Language; onContinue: () => void; onDemo: () => void; onCreate: () => void; onCaregiver: () => void }) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const welcomeCopy = {
    en: { eyebrow: 'A calmer day, one small step at a time', title: 'Welcome to MindMitra', intro: 'A simple way to keep your mind active, remember your daily routine, and stay connected.', signIn: profileName ? `Continue as ${profileName}` : authUser ? `Continue as ${authUser.displayName}` : 'Sign in securely', create: 'Create on this device', demo: 'Try demo account', note: 'Cognitive engagement and daily support — never a medical diagnosis.' },
    hi: { eyebrow: 'हर दिन, एक छोटा और सरल कदम', title: 'MindMitra में आपका स्वागत है', intro: 'मन को सक्रिय रखने, दिनचर्या याद रखने और अपनों से जुड़े रहने का आसान तरीका।', signIn: profileName ? `${profileName} के रूप में जारी रखें` : authUser ? `${authUser.displayName} के रूप में जारी रखें` : 'सुरक्षित साइन इन', create: 'इस डिवाइस पर खाता बनाएँ', demo: 'डेमो खाता आज़माएँ', note: 'मानसिक सक्रियता और दैनिक सहायता — चिकित्सीय निदान नहीं।' },
    as: { eyebrow: 'প্ৰতিদিন, এটা সৰু আৰু সহজ পদক্ষেপ', title: 'MindMitra-লৈ স্বাগতম', intro: 'মন সক্ৰিয় ৰাখিবলৈ, দৈনিক কাম মনত ৰাখিবলৈ আৰু আপোনজনৰ সৈতে সংযুক্ত হৈ থাকিবলৈ এটা সহজ উপায়।', signIn: profileName ? `${profileName} হিচাপে আগবাঢ়ক` : authUser ? `${authUser.displayName} হিচাপে আগবাঢ়ক` : 'সুৰক্ষিতভাৱে ছাইন ইন', create: 'এই ডিভাইচত একাউণ্ট খোলক', demo: 'ডেমʼ একাউণ্ট ব্যৱহাৰ কৰক', note: 'মানসিক সক্ৰিয়তা আৰু দৈনিক সহায় — চিকিৎসাগত নিৰ্ণয় নহয়।' },
  };
  const copy = welcomeCopy[selectedLanguage as keyof typeof welcomeCopy] ?? welcomeCopy.en;
  return <main className="welcome-page"><nav className="welcome-nav"><span className="brand"><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></span><label className="language-picker"><span className="sr-only">Choose language</span><select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value as Language)}><LanguageOptionList /></select></label></nav>
    <section className="welcome-hero"><div className="hero-copy"><span className="eyebrow"><i />{copy.eyebrow}</span><h1>{copy.title}</h1><p className="hero-intro">{copy.intro}</p><div className="welcome-actions">{profileName ? <button className="button button-primary" onClick={onContinue}>{copy.signIn}<span>→</span></button> : authUser || nativeApp ? <button className="button button-primary" onClick={onCreate}>{nativeApp ? copy.create : copy.signIn}<span>→</span></button> : <a className="button button-primary" href="/signin-with-chatgpt?return_to=%2F">{copy.signIn}<span>→</span></a>}{!nativeApp && <button className="button button-secondary" onClick={onCreate}>{copy.create}</button>}<button className="button button-quiet" onClick={onDemo}>{copy.demo}<span>↗</span></button></div><button className="caregiver-entry" onClick={onCaregiver}>I’m a caregiver <span>→</span></button><p className="trust-note"><span>✓</span>{copy.note}</p></div>
      <div className="hero-art" aria-label="A gentle illustration representing care, memory, and daily wellbeing"><div className="sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="care-card"><div className="portrait"><span>👵🏽</span></div><div><p>Good morning, Maya</p><small>You have 2 gentle activities today.</small></div></div><div className="floating-pill pill-memory"><span>✦</span><b>Mind active</b></div><div className="floating-pill pill-routine"><span>✓</span><b>Routine ready</b></div></div></section>
    <section className="welcome-benefits"><article><span>✦</span><div><h2>Gentle brain games</h2><p>40 short activities that adapt to you.</p></div></article><article><span>☀</span><div><h2>Daily support</h2><p>Friendly reminders for routines, water, and medicine.</p></div></article><article><span>⌂</span><div><h2>Family connection</h2><p>Meaningful games made from your own memories.</p></div></article></section></main>;
}

function Onboarding({ authUser, profile, initialRole, onSubmit, onBack }: { authUser: AuthUser | null; profile: AppData['profile']; initialRole: 'elder' | 'caregiver'; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void }) {
  return <main className="onboarding-page"><header><button className="brand" onClick={onBack}><span className="brand-mark">m</span><span>Mind<b>Mitra</b></span></button><span>Private · elderly-friendly setup</span></header><section className="onboarding-card"><div className="onboarding-heading"><span className="section-kicker">Let’s set up your support</span><h1>{profile ? 'Edit your MindMitra profile' : 'Create your MindMitra profile'}</h1><p>Large, simple fields. You can change these details later.</p></div><form onSubmit={onSubmit} className="onboarding-form"><fieldset><legend><span>1</span> Personal information</legend><div className="form-grid"><label className="span-two">Full name<input name="name" required defaultValue={profile?.name ?? authUser?.fullName ?? ''} placeholder="Your full name" /></label><label>Date of birth<input type="date" name="dateOfBirth" required defaultValue={profile?.dateOfBirth ?? ''} /></label><label>Gender (optional)<select name="gender" defaultValue={profile?.gender ?? ''}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label><label>Personal phone<input name="phone" type="tel" required placeholder="Your phone number" defaultValue={profile?.phone ?? ''} /></label><label>Email (optional)<input name="email" type="email" defaultValue={profile?.email ?? authUser?.email ?? ''} /></label><label>Preferred Mitra language<select name="language" defaultValue={profile?.language ?? 'en'}><LanguageOptionList /></select></label><label>Profile type<select name="role" defaultValue={initialRole}><option value="elder">Elderly user</option><option value="caregiver">Caregiver</option></select></label></div></fieldset><fieldset><legend><span>2</span> SOS emergency contact</legend><p>This number will be used as your emergency contact and must be different from your personal phone.</p><div className="form-grid"><label>Contact name<input name="emergencyName" required defaultValue={profile?.emergencyName ?? ''} /></label><label>Emergency phone<input name="emergencyPhone" type="tel" required defaultValue={profile?.emergencyPhone ?? ''} /></label><label className="span-two">Relationship<select name="relationship" required defaultValue={profile?.emergencyRelationship ?? ''}><option value="" disabled>Choose relationship</option>{relationshipOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div></fieldset><label className="consent-check"><input type="checkbox" required defaultChecked={Boolean(profile)} /><span>I understand that MindMitra supports cognitive engagement and daily activity. It is not a medical diagnostic or treatment device.</span></label><div className="form-actions"><button type="button" className="secondary-action" onClick={onBack}>Back</button><button className="primary-action" type="submit">{profile ? 'Save profile' : 'Create profile'} →</button></div></form></section></main>;
}

function Greeting({ name, language, onName, onListen, onContinue }: { name: string; language: Language; onName: (name: string) => void; onListen: (onResult: (value: string) => void) => void; onContinue: () => void }) {
  const [value, setValue] = useState(name);
  const text = language === 'hi' ? { title: 'MindMitra में आपका स्वागत है!', ask: 'आपका पूरा नाम क्या है?', meet: `आपसे मिलकर खुशी हुई, ${value}!`, go: 'मेरे होम पर जाएँ' } : language === 'as' ? { title: 'MindMitra-লৈ স্বাগতম!', ask: 'আপোনাৰ সম্পূৰ্ণ নাম কি?', meet: `আপোনাক লগ পাই ভাল লাগিল, ${value}!`, go: 'মূল পৃষ্ঠালৈ যাওক' } : { title: 'Welcome to MindMitra!', ask: 'What is your full name?', meet: `Nice to meet you, ${value}!`, go: 'Go to my home' };
  return <main className="greeting-page"><section><span className="brand-mark">m</span><span className="section-kicker">A personal welcome</span><h1>{text.title}</h1><p>{text.ask}</p><div className="name-entry"><input value={value} onChange={(event) => setValue(event.target.value)} aria-label="Full name" /><button onClick={() => onListen((heard) => setValue(heard))} aria-label="Speak your name">🎤<small>Speak</small></button></div><div className="meet-message">♡ {text.meet}</div><button className="primary-action wide" onClick={() => { onName(value); onContinue(); }} disabled={!value.trim()}>{text.go} →</button></section></main>;
}

function PageHeader({ kicker, title, text, onBack, action }: { kicker: string; title: string; text: string; onBack: () => void; action?: React.ReactNode }) {
  return <header className="page-header"><button className="back-button" onClick={onBack}>← Back</button><div><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{action && <div>{action}</div>}</header>;
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span><small>{label}</small></button>;
}

function GameCard({ game, difficulty, progress, favorite, mine, onPlay, onFavorite, onMine }: { game: GameDefinition; difficulty: string; progress: GameProgress; favorite: boolean; mine: boolean; onPlay: () => void; onFavorite: () => void; onMine: () => void }) {
  return <article className="game-card"><div className={`game-icon game-${game.category.toLowerCase()}`}>{game.icon}</div><div className="game-card-copy"><span>{game.category} · {difficulty}</span><h3>{game.name}</h3><p>{game.instruction}</p><div className="game-card-progress"><i><span style={{ width: `${progress.completedLevels.length * 10}%` }} /></i><small>{progress.completedLevels.length}/10 levels</small></div></div><div className="game-card-actions"><button className="play-game" onClick={onPlay}>{progress.completedLevels.length === 10 ? 'Replay' : progress.inProgress || progress.currentLevel > 1 ? 'Continue' : 'Play'} →</button><button className={favorite ? 'marked' : ''} onClick={onFavorite} aria-label={favorite ? 'Remove favorite' : 'Add favorite'}>{favorite ? '★' : '☆'}</button><button className={mine ? 'marked' : ''} onClick={onMine} aria-label={mine ? 'Remove from My Games' : 'Add to My Games'}>{mine ? '✓' : '+'}</button></div></article>;
}

function FamilyPortrait({ member, large = false }: { member: FamilyMember; large?: boolean }) {
  return <div className={`family-portrait ${large ? 'large' : ''}`}>{member.photo ? <img src={member.photo} alt={member.name} /> : <span>{initials(member.name)}</span>}</div>;
}

function ReminderRow({ item, onStatus }: { item: Reminder; onStatus: (id: string, status: Reminder['status']) => void }) {
  return <article className={`reminder-row status-${item.status}`}><time>{item.time}</time><div><b>{item.title}</b><small>{[item.dosage, item.location, item.date].filter(Boolean).join(' · ') || titleCase(item.type)}</small><em>{titleCase(item.status)}</em></div>{item.status === 'pending' ? <div className="reminder-actions"><button onClick={() => onStatus(item.id, 'taken')}>✓ Taken</button><button onClick={() => onStatus(item.id, 'snoozed')}>◷ Later</button><button onClick={() => onStatus(item.id, 'missed')}>× Missed</button></div> : <button className="reset-status" onClick={() => onStatus(item.id, 'pending')}>Reset</button>}</article>;
}

function Toggle({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="setting-row toggle-row"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></label>;
}

function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p></div>;
}

function SosModal({ profile, onClose }: { profile: AppData['profile']; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sos-title"><section className="sos-modal"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span className="sos-symbol">!</span><small>Emergency contact</small><h2 id="sos-title">{profile?.emergencyName}</h2><p>{profile?.emergencyRelationship}</p><strong>{profile?.emergencyPhone}</strong><a href={`tel:${profile?.emergencyPhone?.replace(/[^+\d]/g, '')}`}>📞 Call emergency contact</a><button className="secondary-action wide" onClick={onClose}>Cancel</button><em>MindMitra does not provide emergency services. For immediate danger or a medical emergency, contact your local emergency service.</em></section></div>;
}

function LanguageOptionList() { return <>{LANGUAGE_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</>; }

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function difficultyRank(value: string) { return value === 'Easy' ? 0 : value === 'Medium' ? 1 : 2; }
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); }
