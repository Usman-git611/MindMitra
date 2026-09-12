import type { AppData, FamilyGameProgress, GameProgress, Language, Profile, SavedGameRound } from './types';
import { isMemoryChainState } from './memory-chain';

export const STORAGE_KEY = 'mindmitra-v3';
const PREVIOUS_STORAGE_KEY = 'mindmitra-v2';
const LEGACY_STORAGE_KEY = 'mindcare-ner-v1';

const today = () => new Date().toISOString().slice(0, 10);

export const emptyData: AppData = {
  schemaVersion: 3,
  profile: null,
  family: [],
  results: [],
  reminders: [],
  routine: [],
  hydration: { interval: 120, wakeTime: '07:00', sleepTime: '22:00', target: 8, glasses: 0, date: today() },
  favorites: [],
  myGames: [],
  sessions: [],
  gameProgress: {},
  familyGameProgress: {},
  conversations: [],
  assistantContext: { updatedAt: new Date().toISOString() },
  caregiverConnected: false,
  updatedAt: new Date().toISOString(),
};

const demoProfile: Profile = {
  id: 'demo-maya', name: 'Maya Das', dateOfBirth: '1953-04-12', gender: 'Female', phone: '+91 98765 43210',
  email: 'maya.demo@mindmitra.local', language: 'en', role: 'elder', emergencyName: 'Raj Das', emergencyPhone: '+91 98765 40001',
  emergencyRelationship: 'Son', textSize: 'normal', highContrast: false, voice: true, sound: true, reducedMotion: false,
  sessionPreference: 15, caregiverCode: 'MAYA-2741',
};

export const demoData: AppData = {
  ...emptyData,
  profile: demoProfile,
  family: [
    { id: 'fam-raj', name: 'Raj Das', relationship: 'Son', nickname: 'Raju', photo: '', createdAt: new Date().toISOString() },
    { id: 'fam-priya', name: 'Priya Das', relationship: 'Daughter', nickname: 'Pihu', photo: '', createdAt: new Date().toISOString() },
    { id: 'fam-anil', name: 'Anil Bora', relationship: 'Brother', photo: '', createdAt: new Date().toISOString() },
  ],
  reminders: [
    { id: 'med-1', type: 'medicine', title: 'Blood pressure medicine', dosage: '1 tablet', time: '08:00', frequency: 'Daily', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'water-1', type: 'hydration', title: 'Drink a glass of water', time: '10:00', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'appointment-1', type: 'appointment', title: 'Dr. Sharma', date: today(), time: '16:30', location: 'City Clinic', status: 'pending', createdAt: new Date().toISOString() },
  ],
  routine: [
    { id: 'routine-1', time: '07:00', activity: 'Wake up and freshen up', done: true },
    { id: 'routine-2', time: '07:30', activity: 'Breakfast', done: true },
    { id: 'routine-3', time: '10:00', activity: 'Morning walk', done: false },
    { id: 'routine-4', time: '13:00', activity: 'Lunch', done: false },
    { id: 'routine-5', time: '17:00', activity: 'Family time', done: false },
  ],
  results: [
    { id: 'result-1', gameId: 1, game: 'Remember the Objects', category: 'Memory', difficulty: 'Easy', score: 80, accuracy: 80, responseTime: 8, mistakes: 1, date: new Date().toISOString() },
    { id: 'result-2', gameId: 9, game: 'Find the Different Object', category: 'Attention', difficulty: 'Medium', score: 100, accuracy: 100, responseTime: 5, mistakes: 0, date: new Date().toISOString() },
    { id: 'result-3', gameId: 14, game: 'Complete the Pattern', category: 'Pattern', difficulty: 'Medium', score: 75, accuracy: 75, responseTime: 11, mistakes: 1, date: new Date(Date.now() - 86400000).toISOString() },
  ],
  sessions: [{ id: 'session-demo', plannedMinutes: 15, startedAt: new Date(Date.now() - 1200000).toISOString(), endedAt: new Date(Date.now() - 300000).toISOString(), gamesCompleted: 3, accuracy: 85 }],
  caregiverConnected: true,
  updatedAt: new Date().toISOString(),
};

const LANGUAGES: Language[] = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'as'];
const level = (value: unknown, fallback = 1) => Math.max(1, Math.min(10, Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback));
const levels = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : []).map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 10))).sort((a, b) => a - b);

function savedRound(value: unknown): SavedGameRound | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<SavedGameRound>;
  const order = levels(source.order);
  const state = source.state && typeof source.state.prompt === 'string' && typeof source.state.answer === 'string' && Array.isArray(source.state.options)
    ? { prompt: source.state.prompt, promptValues: source.state.promptValues, options: source.state.options.filter((item): item is string => typeof item === 'string'), answer: source.state.answer, memberId: source.state.memberId, memoryChain: isMemoryChainState(source.state.memoryChain) ? source.state.memoryChain : undefined }
    : undefined;
  return {
    level: level(source.level),
    selectedAnswer: typeof source.selectedAnswer === 'string' ? source.selectedAnswer : undefined,
    startedAt: typeof source.startedAt === 'string' && Number.isFinite(Date.parse(source.startedAt)) ? source.startedAt : new Date().toISOString(),
    phase: source.phase === 'feedback' ? 'feedback' : 'question',
    replay: Boolean(source.replay),
    order: order.length === 10 ? order : undefined,
    answeredLevels: levels(source.answeredLevels),
    state,
  };
}

export function normalizeData(value: Partial<AppData> | null | undefined): AppData {
  const rawProfile = value?.profile?.email === 'maya.demo@mindcare.local' ? { ...value.profile, email: 'maya.demo@mindmitra.local' } : value?.profile ?? null;
  const profile = rawProfile ? { ...rawProfile, language: LANGUAGES.includes(rawProfile.language) ? rawProfile.language : 'en' as Language } : null;
  const gameProgress = Object.fromEntries(Object.entries(value?.gameProgress ?? {}).map(([key, progress]) => {
    const gameId = Number(key);
    const current = progress as Partial<GameProgress>;
    const completedLevels = levels(current.completedLevels);
    const inProgress = savedRound(current.inProgress);
    const currentLevel = inProgress?.level ?? level(current.currentLevel);
    return [key, {
      gameId,
      currentLevel,
      unlockedLevel: Math.max(currentLevel, level(current.unlockedLevel)),
      completedLevels,
      attempts: Math.max(0, current.attempts ?? 0),
      replayCount: Math.max(0, current.replayCount ?? 0),
      completionCount: Math.max(0, current.completionCount ?? (completedLevels.length === 10 ? 1 : 0)),
      inProgress,
      updatedAt: current.updatedAt ?? new Date().toISOString(),
    } satisfies GameProgress];
  }));
  const familyGameProgress = Object.fromEntries(Object.entries(value?.familyGameProgress ?? {}).map(([key, progress]) => {
    const current = progress as Partial<FamilyGameProgress>;
    const completedLevels = levels(current.completedLevels);
    const inProgress = savedRound(current.inProgress);
    const currentLevel = inProgress?.level ?? level(current.currentLevel);
    return [key, {
      type: current.type ?? key as FamilyGameProgress['type'],
      currentLevel,
      unlockedLevel: Math.max(currentLevel, level(current.unlockedLevel)),
      completedLevels,
      attempts: Math.max(0, current.attempts ?? 0),
      replayCount: Math.max(0, current.replayCount ?? 0),
      completionCount: Math.max(0, current.completionCount ?? (completedLevels.length === 10 ? 1 : 0)),
      inProgress,
      updatedAt: current.updatedAt ?? new Date().toISOString(),
    } satisfies FamilyGameProgress];
  }));
  const context = value?.assistantContext && typeof value.assistantContext === 'object' ? value.assistantContext : emptyData.assistantContext;
  const assistantContext = {
    ...emptyData.assistantContext,
    ...context,
    missingParameters: Array.isArray(context.missingParameters) ? context.missingParameters.filter((item): item is string => typeof item === 'string').slice(0, 12) : undefined,
    collectedParameters: context.collectedParameters && typeof context.collectedParameters === 'object' ? Object.fromEntries(Object.entries(context.collectedParameters).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item)).slice(0, 20)) : undefined,
  };
  return {
    ...emptyData,
    ...(value ?? {}),
    schemaVersion: 3,
    profile,
    family: Array.isArray(value?.family) ? value.family : [],
    results: Array.isArray(value?.results) ? value.results : [],
    reminders: Array.isArray(value?.reminders) ? value.reminders : [],
    routine: Array.isArray(value?.routine) ? value.routine : [],
    favorites: Array.isArray(value?.favorites) ? value.favorites : [],
    myGames: Array.isArray(value?.myGames) ? value.myGames : [],
    sessions: Array.isArray(value?.sessions) ? value.sessions : [],
    hydration: { ...emptyData.hydration, ...(value?.hydration && typeof value.hydration === 'object' ? value.hydration : {}) },
    gameProgress,
    familyGameProgress,
    conversations: Array.isArray(value?.conversations) ? value.conversations : [],
    assistantContext,
  } as AppData;
}

const scopedStorageKey = (ownerId?: string | null) => `${STORAGE_KEY}:${ownerId ? `user:${encodeURIComponent(ownerId)}` : 'guest'}`;
const pendingDeleteKey = (ownerId: string) => `${STORAGE_KEY}:pending-delete:${encodeURIComponent(ownerId)}`;

export function hasPendingAccountDeletion(ownerId: string): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(pendingDeleteKey(ownerId)) === 'true';
}

export function markPendingAccountDeletion(ownerId: string, pending: boolean) {
  if (pending) window.localStorage.setItem(pendingDeleteKey(ownerId), 'true');
  else window.localStorage.removeItem(pendingDeleteKey(ownerId));
}

export function loadLocalData(ownerId?: string | null): AppData {
  if (typeof window === 'undefined') return emptyData;
  try {
    const scoped = window.localStorage.getItem(scopedStorageKey(ownerId));
    if (scoped) return normalizeData(JSON.parse(scoped) as Partial<AppData>);

    // Old versions used one device-wide key. Only migrate that value into an
    // authenticated account when its profile already belongs to that account.
    for (const key of [PREVIOUS_STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      const saved = window.localStorage.getItem(key);
      if (!saved) continue;
      const parsed = normalizeData(JSON.parse(saved) as Partial<AppData>);
      if (ownerId && parsed.profile?.id !== ownerId) continue;
      return parsed;
    }
    return emptyData;
  } catch {
    return emptyData;
  }
}

export function saveLocalData(data: AppData, ownerId?: string | null) {
  window.localStorage.setItem(scopedStorageKey(ownerId), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

export function clearLocalData(ownerId?: string | null) {
  window.localStorage.removeItem(scopedStorageKey(ownerId));
  if (!ownerId) {
    window.localStorage.removeItem(PREVIOUS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  for (const key of [PREVIOUS_STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved && (JSON.parse(saved) as Partial<AppData>).profile?.id === ownerId) window.localStorage.removeItem(key);
    } catch { /* leave an unrelated or unreadable legacy value untouched */ }
  }
}
