export type Language = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa' | 'as';
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
  level?: number;
  replay?: boolean;
}

export interface GameProgress {
  gameId: number;
  currentLevel: number;
  unlockedLevel: number;
  completedLevels: number[];
  attempts: number;
  replayCount: number;
  completionCount: number;
  inProgress?: SavedGameRound;
  updatedAt: string;
}

export type FamilyGameType = 'who' | 'match' | 'remember';

export interface FamilyGameProgress {
  type: FamilyGameType;
  currentLevel: number;
  unlockedLevel: number;
  completedLevels: number[];
  attempts: number;
  replayCount: number;
  completionCount: number;
  inProgress?: SavedGameRound;
  updatedAt: string;
}

export interface SavedGameRound {
  level: number;
  selectedAnswer?: string;
  startedAt: string;
  phase?: 'question' | 'feedback';
  replay?: boolean;
  order?: number[];
  answeredLevels?: number[];
  state?: {
    prompt: string;
    promptValues?: Record<string, string>;
    options: string[];
    answer: string;
    memberId?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface AssistantContext {
  lastIntent?: string;
  lastReply?: string;
  updatedAt: string;
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
  schemaVersion: number;
  profile: Profile | null;
  family: FamilyMember[];
  results: GameResult[];
  reminders: Reminder[];
  routine: RoutineItem[];
  hydration: HydrationState;
  favorites: number[];
  myGames: number[];
  sessions: SessionSummary[];
  gameProgress: Record<string, GameProgress>;
  familyGameProgress: Record<string, FamilyGameProgress>;
  conversations: ChatMessage[];
  assistantContext: AssistantContext;
  caregiverConnected: boolean;
  updatedAt: string;
}

export interface GameDefinition {
  id: number;
  name: string;
  category: Category;
  icon: string;
  instruction: string;
  levels: GameLevel[];
}

export interface GameLevel {
  level: number;
  prompt: string;
  promptValues?: Record<string, string>;
  options: string[];
  answer: string;
  instruction?: string;
  memoryItems?: string[];
}

export interface PlayableGame extends Omit<GameDefinition, 'levels' | 'instruction'>, GameLevel {
  instruction: string;
  replay?: boolean;
  familyType?: FamilyGameType;
}
