import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FAMILY_GAME_META, FAMILY_PROMPT_TEMPLATES } from '../lib/family-games';
import { GAME_LIBRARY } from '../lib/games';
import { createMemoryChain, memoryChainWord, parseMemoryChainAnswer, validateMemoryChainAnswer } from '../lib/memory-chain';
import type { FamilyGameType, Language } from '../lib/types';

const LANGUAGES = ['hi', 'bn', 'as'] as const satisfies readonly Exclude<Language, 'en'>[];
const scripts: Record<(typeof LANGUAGES)[number], RegExp> = {
  hi: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  as: /\p{Script=Bengali}/u,
};

const gameStrings = new Set<string>();
for (const game of GAME_LIBRARY) {
  gameStrings.add(game.name);
  gameStrings.add(game.instruction);
  for (const level of game.levels) {
    gameStrings.add(level.prompt);
    gameStrings.add(level.answer);
    level.options.forEach((option) => gameStrings.add(option));
  }
}

for (const type of Object.keys(FAMILY_GAME_META) as FamilyGameType[]) {
  gameStrings.add(FAMILY_GAME_META[type].name);
  gameStrings.add(FAMILY_GAME_META[type].description);
  FAMILY_PROMPT_TEMPLATES[type].forEach((prompt) => gameStrings.add(prompt));
}

for (const fallback of [
  'Which name is saved as your {relationship}?',
  'Who in your saved circle is your {relationship}?',
  'Choose the saved name for your {relationship}.',
]) gameStrings.add(fallback);

const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[0]).sort();

assert.deepEqual(GAME_LIBRARY.slice(0, 40).map((game) => game.id), Array.from({ length: 40 }, (_, index) => index + 1), 'The original 40 games must remain intact');
assert.equal(GAME_LIBRARY.length, 41, 'The library must contain the original 40 games plus Memory Chain');
assert.ok(GAME_LIBRARY.every((game) => game.visual.length >= 3), 'Every game needs a meaningful visual set');
assert.ok(GAME_LIBRARY.every((game) => game.levels.length === 10), 'Every game needs all 10 progression levels');

for (const language of LANGUAGES) {
  const dictionary = JSON.parse(await readFile(new URL(`../public/locales/${language}.json`, import.meta.url), 'utf8')) as Record<string, string>;
  let translatedCount = 0;
  let scriptCount = 0;
  for (const source of gameStrings) {
    const translated = dictionary[source];
    assert.equal(typeof translated, 'string', `${language} is missing game text: ${source}`);
    assert.ok(translated.trim(), `${language} has empty game text: ${source}`);
    assert.deepEqual(placeholders(translated), placeholders(source), `${language} changed placeholders in: ${source}`);
    if (translated !== source) translatedCount += 1;
    if (scripts[language].test(translated)) scriptCount += 1;
  }
  assert.ok(translatedCount / gameStrings.size >= 0.75, `${language} must localize the games instead of mirroring English`);
  assert.ok(scriptCount / gameStrings.size >= 0.55, `${language} game text must predominantly use the expected script`);
  for (const game of GAME_LIBRARY) {
    assert.notEqual(dictionary[game.name], game.name, `${language} must localize ${game.name}`);
    assert.notEqual(dictionary[game.instruction], game.instruction, `${language} must localize the instructions for ${game.name}`);
    assert.ok(game.levels.filter((level) => dictionary[level.prompt] !== level.prompt).length >= 8, `${language} must localize at least 8 prompts for ${game.name}`);
  }
  for (const type of Object.keys(FAMILY_GAME_META) as FamilyGameType[]) {
    assert.notEqual(dictionary[FAMILY_GAME_META[type].name], FAMILY_GAME_META[type].name, `${language} must localize the ${type} family game`);
    assert.ok(FAMILY_PROMPT_TEMPLATES[type].every((prompt) => dictionary[prompt] !== prompt), `${language} must localize all ${type} family prompts`);
  }
  console.log(`${language}: verified ${gameStrings.size} localized game strings`);
}

for (const [language, input] of [
  ['en', 'Apple, Mango'],
  ['hi', 'सेब और आम'],
  ['bn', 'আপেল ও আম'],
  ['as', 'আপেল আৰু আম'],
] as const satisfies readonly [Language, string][]) {
  const state = createMemoryChain('fruits', () => 0);
  assert.equal(memoryChainWord('fruits', state.sequence[0].wordId, language).length > 0, true);
  assert.deepEqual(parseMemoryChainAnswer('fruits', input), ['apple', 'mango']);
  assert.equal(validateMemoryChainAnswer(state, input).correct, true);
}

console.log('Verified 40 original games, Memory Chain, 3 family games, visuals, progression, and Hindi/Bengali/Assamese game language coverage.');
