export type Language = 'en' | 'hi' | 'as';
export type Role = 'elder' | 'caregiver';
export type Category = 'Memory' | 'Attention' | 'Pattern' | 'Recognition' | 'Language' | 'Routine' | 'Emotion' | 'Cultural';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ReminderStatus = 'pending' | 'taken' | 'missed' | 'snoozed';

export interface Profile {
  id: string;
  name: string;
  dateOfBirth: string;
  gender?: string;
  phone: string;
  email?: string;
  language: Language;
  role: Role;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  textSize: 'normal' | 'large' | 'extra';
  highContrast: boolean;
  voice: boolean;
  sound: boolean;
  reducedMotion: boolean;
  sessionPreference: number;
  caregiverCode: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  nickname?: string;
  photo?: string;
  photoKey?: string;
  createdAt: string;
}

export interface GameResult {
  id: string;
  gameId: number;
  game: string;
  category: Category;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  responseTime: number;
  mistakes: number;
  date: string;
  sessionId?: string;
}

export interface Reminder {
  id: string;
  type: 'medicine' | 'hydration' | 'appointment' | 'routine' | 'session';
  title: string;
  time: string;
  date?: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  notes?: string;
  status: ReminderStatus;
  createdAt: string;
}

export interface RoutineItem {
  id: string;
  time: string;
  activity: string;
  done: boolean;
}

export interface HydrationState {
  interval: number;
  wakeTime: string;
  sleepTime: string;
  target: number;
  glasses: number;
  date: string;
}

export interface SessionSummary {
  id: string;
  plannedMinutes: number;
  startedAt: string;
  endedAt: string;
  gamesCompleted: number;
  accuracy: number;
}

export interface AppData {
  profile: Profile | null;
  family: FamilyMember[];
  results: GameResult[];
  reminders: Reminder[];
  routine: RoutineItem[];
  hydration: HydrationState;
  favorites: number[];
  myGames: number[];
  sessions: SessionSummary[];
  caregiverConnected: boolean;
  updatedAt: string;
}

export interface GameDefinition {
  id: number;
  name: string;
  category: Category;
  icon: string;
  instruction: string;
  prompt: string;
  options: string[];
  answer: string;
  memoryItems?: string[];
}
