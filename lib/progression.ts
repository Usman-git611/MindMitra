import type { FamilyGameProgress, GameProgress, SavedGameRound } from './types';

type Progress = GameProgress | FamilyGameProgress;

export interface AnsweredLevel {
  level: number;
  selectedAnswer: string;
  startedAt: string;
  replay?: boolean;
  state: NonNullable<SavedGameRound['state']>;
}

export function recordAnsweredLevel<T extends Progress>(progress: T, answer: AnsweredLevel): T {
  const completedLevels = Array.from(new Set([...progress.completedLevels, answer.level])).sort((a, b) => a - b);
  const answeredLevels = Array.from(new Set([...(progress.inProgress?.answeredLevels ?? []), answer.level])).sort((a, b) => a - b);
  const completedRun = answer.level === 10 && answeredLevels.length === 10;
  return {
    ...progress,
    attempts: progress.attempts + 1,
    completedLevels,
    unlockedLevel: Math.min(10, Math.max(progress.unlockedLevel, answer.level + 1)),
    currentLevel: Math.min(10, answer.level + 1),
    completionCount: progress.completionCount + (completedRun ? 1 : 0),
    inProgress: {
      ...(progress.inProgress ?? { level: answer.level, startedAt: answer.startedAt }),
      level: answer.level,
      selectedAnswer: answer.selectedAnswer,
      phase: 'feedback',
      replay: answer.replay,
      answeredLevels,
      state: answer.state,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function recordMemoryChainTurn(progress: GameProgress, answer: AnsweredLevel, correct: boolean): GameProgress {
  const completedLevels = correct ? Array.from(new Set([...progress.completedLevels, answer.level])).sort((a, b) => a - b) : progress.completedLevels;
  const answeredLevels = correct ? Array.from(new Set([...(progress.inProgress?.answeredLevels ?? progress.completedLevels), answer.level])).sort((a, b) => a - b) : progress.inProgress?.answeredLevels ?? progress.completedLevels;
  const completedRun = correct && answer.level === 10 && answeredLevels.length === 10;
  const nextLevel = correct ? Math.min(10, answer.level + 1) : answer.level;
  return {
    ...progress,
    attempts: progress.attempts + 1,
    completedLevels,
    unlockedLevel: correct ? Math.min(10, Math.max(progress.unlockedLevel, answer.level + 1)) : progress.unlockedLevel,
    currentLevel: nextLevel,
    completionCount: progress.completionCount + (completedRun ? 1 : 0),
    inProgress: {
      ...(progress.inProgress ?? { level: nextLevel, startedAt: answer.startedAt }),
      level: nextLevel,
      selectedAnswer: answer.selectedAnswer,
      phase: answer.state.memoryChain?.phase === 'show' ? 'question' : 'feedback',
      replay: answer.replay,
      answeredLevels,
      state: answer.state,
    },
    updatedAt: new Date().toISOString(),
  };
}
