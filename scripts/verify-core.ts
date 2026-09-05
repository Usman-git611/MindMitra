import assert from 'node:assert/strict';
import { CATEGORIES, createBalancedSession, difficultyFor, GAME_LIBRARY } from '../lib/games';
import { createFamilyGame } from '../lib/family-games';
import { LANGUAGE_OPTIONS, mitraReply } from '../lib/mitra';
import { demoData } from '../lib/storage';
import type { FamilyGameType, GameResult } from '../lib/types';

assert.equal(GAME_LIBRARY.length, 40, 'The complete 40-game library must be present');
assert.equal(new Set(GAME_LIBRARY.map((game) => game.id)).size, 40, 'Game IDs must be unique');
for (const game of GAME_LIBRARY) {
  assert.equal(game.levels.length, 10, `${game.name} must have exactly 10 levels`);
  assert.equal(new Set(game.levels.map((level) => level.prompt)).size, 10, `${game.name} levels must have distinct prompts`);
  for (const level of game.levels) {
    assert.ok(level.options.includes(level.answer), `${game.name} level ${level.level} must contain its answer`);
    assert.equal(new Set(level.options).size, 4, `${game.name} level ${level.level} must offer four distinct choices`);
  }
}
assert.equal(GAME_LIBRARY.reduce((sum, game) => sum + game.levels.length, 0), 400, 'The library must contain 400 meaningful levels');
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
assert.ok(LANGUAGE_OPTIONS.length >= 10, 'Mitra must support at least 10 prioritized Indian languages');
for (const language of LANGUAGE_OPTIONS) assert.ok(mitraReply(language.value, 'greeting').length > 10, `${language.label} needs a useful Mitra greeting`);

console.log('Verified 40 games, 400 distinct levels, 30 family levels, multilingual Mitra, balanced sessions, adaptive difficulty, SOS separation, and demo data.');
