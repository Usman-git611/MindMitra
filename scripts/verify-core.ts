import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, createBalancedSession, createLevelOrder, difficultyFor, GAME_LIBRARY, getPlayableGame } from '../lib/games';
import { createFamilyGame } from '../lib/family-games';
import { LANGUAGE_OPTIONS, mitraReply } from '../lib/mitra';
import { advanceMemoryChain, createMemoryChain, memoryChainWord, MEMORY_CHAIN_GAME_ID, parseMemoryChainAnswer, validateMemoryChainAnswer } from '../lib/memory-chain';
import { recordAnsweredLevel } from '../lib/progression';
import { demoData, normalizeData } from '../lib/storage';
import type { FamilyGameType, GameProgress, GameResult } from '../lib/types';

assert.equal(GAME_LIBRARY.filter((game) => game.id <= 40).length, 40, 'All original 40 games must remain present');
assert.equal(GAME_LIBRARY.length, 41, 'The original 40 games plus Memory Chain must be present');
assert.equal(new Set(GAME_LIBRARY.map((game) => game.id)).size, 41, 'Game IDs must be unique');
for (const game of GAME_LIBRARY) {
  assert.ok(game.visual.length >= 3, `${game.name} must have a relevant multi-item visual`);
  assert.equal(game.levels.length, 10, `${game.name} must have exactly 10 levels`);
  assert.equal(new Set(game.levels.map((level) => level.prompt)).size, 10, `${game.name} levels must have distinct prompts`);
  for (const level of game.levels) {
    assert.ok(level.options.includes(level.answer), `${game.name} level ${level.level} must contain its answer`);
    assert.equal(new Set(level.options).size, 4, `${game.name} level ${level.level} must offer four distinct choices`);
  }
}
assert.equal(GAME_LIBRARY.reduce((sum, game) => sum + game.levels.length, 0), 410, 'The library must preserve 400 original levels and add 10 Memory Chain progression levels');
assert.equal(GAME_LIBRARY.find((game) => game.id === MEMORY_CHAIN_GAME_ID)?.name, 'Memory Chain', 'Memory Chain must use its required name and game registry ID');
assert.deepEqual(createLevelOrder(false), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'A first playthrough must remain sequential');
for (let attempt = 0; attempt < 20; attempt += 1) {
  const replayOrder = createLevelOrder(true);
  assert.deepEqual([...replayOrder].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'Replay order must remain a complete ten-level permutation');
  assert.notDeepEqual(replayOrder, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'Replay order must actually be shuffled');
}
const replayed = getPlayableGame(GAME_LIBRARY[0], 1, true, 7);
assert.equal(replayed.level, 1, 'Replay must display Level 1 even when it draws a different content level');
assert.equal(replayed.prompt, GAME_LIBRARY[0].levels[6].prompt, 'Replay must draw content using the shuffled order');
assert.ok(replayed.options.includes(replayed.answer), 'Replay shuffling must preserve the correct answer');
for (const minutes of [5, 15, 30, 60]) {
  const session = createBalancedSession(minutes);
  const counts = CATEGORIES.map((category) => session.filter((game) => game.category === category).length);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${minutes}-minute sessions must be evenly distributed`);
}
const result = (accuracy: number): GameResult => ({ id: String(accuracy), gameId: 1, game: 'Test', category: 'Memory', difficulty: 'Easy', score: accuracy, accuracy, responseTime: 3, mistakes: 0, date: new Date().toISOString() });
assert.equal(difficultyFor('Memory', [result(100), result(90)]), 'Hard');
assert.equal(difficultyFor('Memory', [result(30), result(50)]), 'Easy');
assert.notEqual(demoData.profile?.phone.replace(/\D/g, ''), demoData.profile?.emergencyPhone.replace(/\D/g, ''), 'Demo SOS number must differ from personal number');
assert.ok(demoData.family.length >= 3 && demoData.reminders.length >= 3 && demoData.routine.length >= 3, 'Demo account must have representative data');
for (const type of ['who', 'match', 'remember'] as FamilyGameType[]) {
  for (let level = 1; level <= 10; level += 1) {
    const familyGame = createFamilyGame(type, level, demoData.family).game;
    assert.equal(familyGame.level, level, `${type} must support level ${level}`);
    assert.ok(familyGame.options.includes(familyGame.answer), `${type} level ${level} must include its answer`);
    assert.equal(new Set(familyGame.options).size, 4, `${type} level ${level} must have four distinct choices`);
  }
}

for (const category of ['fruits', 'vegetables'] as const) {
  let chain = createMemoryChain(category, () => 0);
  for (let turn = 0; turn < 3; turn += 1) {
    const expected = chain.sequence.map((entry) => memoryChainWord(category, entry.wordId, 'en'));
    const candidates = category === 'fruits' ? ['Mango', 'Banana', 'Orange', 'Papaya', 'Guava'] : ['Potato', 'Spinach', 'Tomato', 'Cabbage', 'Onion'];
    const used = new Set(chain.sequence.map((entry) => entry.wordId));
    const availableAnswer = candidates.find((candidate) => !used.has(parseMemoryChainAnswer(category, candidate)[0]))!;
    const answer = [...expected, availableAnswer].join(', ');
    const checked = validateMemoryChainAnswer(chain, answer);
    assert.equal(checked.correct, true, `${category} must accept an ordered chain and one new valid item`);
    chain = advanceMemoryChain(chain, checked.userWordId!, () => 0);
  }
  assert.equal(validateMemoryChainAnswer(chain, 'unrelated word').correct, false, `${category} must reject unrelated input`);
}
assert.deepEqual(parseMemoryChainAnswer('fruits', 'सेब, आम'), ['apple', 'mango'], 'Hindi Memory Chain speech text must map to canonical fruit IDs');
assert.deepEqual(parseMemoryChainAnswer('fruits', 'আপেল ও আম'), ['apple', 'mango'], 'Bengali Memory Chain speech text must map to canonical fruit IDs');
assert.deepEqual(parseMemoryChainAnswer('vegetables', 'গাজৰ আৰু আলু'), ['carrot', 'potato'], 'Assamese Memory Chain speech text must map to canonical vegetable IDs');
assert.deepEqual(LANGUAGE_OPTIONS.map((item) => item.value), ['en', 'hi', 'bn', 'as'], 'Mitra must expose the four prioritized languages');
for (const language of LANGUAGE_OPTIONS) assert.ok(mitraReply(language.value, 'greeting').length > 10, `${language.label} needs a useful Mitra greeting`);

const legacy = normalizeData({
  gameProgress: {
    '1': { gameId: 1, currentLevel: 11, unlockedLevel: -2, completedLevels: [1, 1, 2, 99], attempts: -4, replayCount: -1, updatedAt: '' },
    '2': { gameId: 2, currentLevel: 10, unlockedLevel: 10, completedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], attempts: 10, replayCount: 0, updatedAt: '' },
  },
} as never);
assert.deepEqual(legacy.gameProgress['1'].completedLevels, [1, 2], 'Legacy levels must be deduplicated and range-checked');
assert.equal(legacy.gameProgress['1'].currentLevel, 10, 'Legacy current level must be clamped');
assert.equal(legacy.gameProgress['1'].unlockedLevel, 10, 'Unlocked level must never trail the current level');
assert.equal(legacy.gameProgress['1'].attempts, 0, 'Negative counters must normalize to zero');
assert.equal(legacy.gameProgress['2'].completionCount, 1, 'A legacy ten-level completion must migrate without losing its completion');

let progression: GameProgress = { gameId: 1, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, completionCount: 0, updatedAt: new Date().toISOString() };
for (let gameLevel = 1; gameLevel <= 10; gameLevel += 1) {
  const playable = getPlayableGame(GAME_LIBRARY[0], gameLevel);
  progression = recordAnsweredLevel(progression, { level: gameLevel, selectedAnswer: playable.answer, startedAt: new Date().toISOString(), state: { prompt: playable.prompt, options: playable.options, answer: playable.answer } });
  assert.equal(progression.inProgress?.phase, 'feedback', 'The feedback phase must be persisted before Next');
  assert.equal(progression.inProgress?.state?.prompt, playable.prompt, 'The exact question must survive Save & Exit');
  assert.equal(progression.completionCount, gameLevel === 10 ? 1 : 0, 'Completion increments only at the end of a full 1–10 run');
}
progression = { ...progression, currentLevel: 1, unlockedLevel: 1, completedLevels: [], replayCount: progression.replayCount + 1, inProgress: undefined };
const secondRunOrder = createLevelOrder(true);
for (let gameLevel = 1; gameLevel <= 10; gameLevel += 1) {
  const playable = getPlayableGame(GAME_LIBRARY[0], gameLevel, true, secondRunOrder[gameLevel - 1]);
  progression = recordAnsweredLevel(progression, { level: gameLevel, selectedAnswer: playable.options.find((option) => option !== playable.answer)!, startedAt: new Date().toISOString(), replay: true, state: { prompt: playable.prompt, options: playable.options, answer: playable.answer } });
}
assert.equal(progression.completionCount, 2, 'Replay completion must preserve and increment the lifetime counter');
assert.equal(progression.replayCount, 1, 'Replay count must remain independent from completion count');

for (const game of GAME_LIBRARY) {
  let progress: GameProgress = { gameId: game.id, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, completionCount: 0, updatedAt: new Date().toISOString() };
  for (let gameLevel = 1; gameLevel <= 10; gameLevel += 1) {
    const playable = getPlayableGame(game, gameLevel);
    const selectedAnswer = gameLevel % 2 ? playable.answer : playable.options.find((option) => option !== playable.answer)!;
    progress = recordAnsweredLevel(progress, { level: gameLevel, selectedAnswer, startedAt: new Date().toISOString(), state: { prompt: playable.prompt, options: playable.options, answer: playable.answer } });
    assert.equal(progress.inProgress?.level, gameLevel, `${game.name} must save the exact current level`);
  }
  assert.equal(progress.completedLevels.length, 10, `${game.name} must progress through all ten levels`);
  assert.equal(progress.completionCount, 1, `${game.name} must count one complete ten-level run`);
}

for (const type of ['who', 'match', 'remember'] as FamilyGameType[]) {
  let progress = { type, currentLevel: 1, unlockedLevel: 1, completedLevels: [], attempts: 0, replayCount: 0, completionCount: 0, updatedAt: new Date().toISOString() };
  for (let gameLevel = 1; gameLevel <= 10; gameLevel += 1) {
    const playable = createFamilyGame(type, gameLevel, demoData.family).game;
    progress = recordAnsweredLevel(progress, { level: gameLevel, selectedAnswer: playable.answer, startedAt: new Date().toISOString(), state: { prompt: playable.prompt, promptValues: playable.promptValues, options: playable.options, answer: playable.answer } });
  }
  assert.equal(progress.completedLevels.length, 10, `${type} must progress automatically through all ten levels`);
  assert.equal(progress.completionCount, 1, `${type} must count one complete family-game run`);
}

const appSource = readFileSync(new URL('../components/MindCareApp.tsx', import.meta.url), 'utf8');
assert.ok(!appSource.includes('className="level-grid"'), 'The app must not render a manual game-level picker');
assert.ok(!appSource.includes('className="family-levels"'), 'Family games must not render a manual level picker');
assert.ok(!appSource.includes('Check my answer</button>'), 'An answer tap must give feedback immediately without a second submit step');

console.log('Verified all original 40 games, 410 total levels, relevant visuals, Memory Chain typing/speech parsing, shuffled replay, direct answer flow, 30 family levels, backward-compatible progress, multilingual Mitra, balanced sessions, adaptive difficulty, SOS separation, and demo data.');
