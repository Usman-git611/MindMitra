import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FAMILY_GAME_META, FAMILY_PROMPT_TEMPLATES } from '../lib/family-games';
import { CATEGORIES, GAME_LIBRARY } from '../lib/games';
import { UI_STRINGS } from '../lib/i18n';
import type { FamilyGameType, Language } from '../lib/types';

const LANGUAGES: Exclude<Language, 'en'>[] = ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'as'];
const scriptChecks: Record<Exclude<Language, 'en'>, RegExp> = {
  hi: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  ta: /\p{Script=Tamil}/u,
  te: /\p{Script=Telugu}/u,
  mr: /\p{Script=Devanagari}/u,
  gu: /\p{Script=Gujarati}/u,
  kn: /\p{Script=Kannada}/u,
  ml: /\p{Script=Malayalam}/u,
  pa: /\p{Script=Gurmukhi}/u,
  as: /\p{Script=Bengali}/u,
};

const sources = new Set<string>(UI_STRINGS);
for (const category of CATEGORIES) sources.add(category);
for (const value of ['Easy', 'Medium', 'Hard']) sources.add(value);
for (const game of GAME_LIBRARY) {
  sources.add(game.name);
  sources.add(game.instruction);
  for (const gameLevel of game.levels) {
    sources.add(gameLevel.prompt);
    sources.add(gameLevel.answer);
    gameLevel.options.forEach((option) => sources.add(option));
  }
}
for (const type of Object.keys(FAMILY_GAME_META) as FamilyGameType[]) {
  sources.add(FAMILY_GAME_META[type].name);
  sources.add(FAMILY_GAME_META[type].description);
  FAMILY_PROMPT_TEMPLATES[type].forEach((prompt) => sources.add(prompt));
}
const catalog = [...sources].filter(Boolean);

const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[0]).sort();

for (const language of LANGUAGES) {
  const dictionary = JSON.parse(await readFile(new URL(`../public/locales/${language}.json`, import.meta.url), 'utf8')) as Record<string, string>;
  assert.equal(Object.keys(dictionary).length, catalog.length, `${language} must contain the exact ${catalog.length}-string catalog`);
  let changed = 0;
  let writtenInSelectedScript = 0;
  for (const source of catalog) {
    const translated = dictionary[source];
    assert.equal(typeof translated, 'string', `${language} is missing: ${source}`);
    assert.ok(translated.trim(), `${language} has an empty translation: ${source}`);
    assert.deepEqual(placeholders(translated), placeholders(source), `${language} changed a placeholder in: ${source}`);
    assert.ok(!translated.includes('undefined') && !translated.includes('ZXQVAR'), `${language} contains a generation marker in: ${source}`);
    if (translated !== source) changed += 1;
    if (scriptChecks[language].test(translated)) writtenInSelectedScript += 1;
  }
  assert.ok(changed / catalog.length >= 0.75, `${language} must localize the content rather than mirror English`);
  assert.ok(writtenInSelectedScript / catalog.length >= 0.55, `${language} must predominantly use its expected writing system`);
  for (const game of GAME_LIBRARY) {
    assert.notEqual(dictionary[game.name], game.name, `${language} must localize the name of ${game.name}`);
    assert.notEqual(dictionary[game.instruction], game.instruction, `${language} must localize the instruction for ${game.name}`);
    assert.ok(game.levels.filter((gameLevel) => dictionary[gameLevel.prompt] !== gameLevel.prompt).length >= 8, `${language} must localize the questions for ${game.name}`);
  }
  for (const type of Object.keys(FAMILY_GAME_META) as FamilyGameType[]) {
    assert.notEqual(dictionary[FAMILY_GAME_META[type].name], FAMILY_GAME_META[type].name, `${language} must localize the ${type} family game`);
    assert.ok(FAMILY_PROMPT_TEMPLATES[type].every((prompt) => dictionary[prompt] !== prompt), `${language} must localize all ${type} family prompts`);
  }
  console.log(`${language}: ${catalog.length} complete strings, ${changed} localized`);
}

console.log(`Verified all ${LANGUAGES.length} language packs across 40 games, 400 levels, family games, UI, placeholders, and writing systems.`);

