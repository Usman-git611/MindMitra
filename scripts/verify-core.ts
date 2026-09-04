import assert from 'node:assert/strict';
import { CATEGORIES, createBalancedSession, difficultyFor, GAME_LIBRARY } from '../lib/games';
import { demoData } from '../lib/storage';
import type { GameResult } from '../lib/types';

assert.equal(GAME_LIBRARY.length, 40, 'The complete 40-game library must be present');
assert.equal(new Set(GAME_LIBRARY.map((game) => game.id)).size, 40, 'Game IDs must be unique');
for (const game of GAME_LIBRARY) {
  assert.ok(game.options.includes(game.answer), `${game.name} must contain its answer`);
  assert.ok(game.options.length >= 4, `${game.name} must offer at least four choices`);
}
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

console.log(`Verified ${GAME_LIBRARY.length} playable games, balanced sessions, adaptive difficulty, SOS separation, and demo data.`);
