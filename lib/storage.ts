import type { AppData, Profile } from './types';

export const STORAGE_KEY = 'mindcare-ner-v1';

const today = () => new Date().toISOString().slice(0, 10);

export const emptyData: AppData = {
  profile: null,
  family: [],
  results: [],
  reminders: [],
  routine: [],
  hydration: { interval: 120, wakeTime: '07:00', sleepTime: '22:00', target: 8, glasses: 0, date: today() },
  favorites: [],
  myGames: [],
  sessions: [],
  caregiverConnected: false,
  updatedAt: new Date().toISOString(),
};

const demoProfile: Profile = {
  id: 'demo-maya', name: 'Maya Das', dateOfBirth: '1953-04-12', gender: 'Female', phone: '+91 98765 43210',
  email: 'maya.demo@mindcare.local', language: 'en', role: 'elder', emergencyName: 'Raj Das', emergencyPhone: '+91 98765 40001',
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

export function loadLocalData(): AppData {
  if (typeof window === 'undefined') return emptyData;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyData;
    return { ...emptyData, ...JSON.parse(saved) } as AppData;
  } catch {
    return emptyData;
  }
}

export function saveLocalData(data: AppData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

export function clearLocalData() {
  window.localStorage.removeItem(STORAGE_KEY);
}
