import { mkdir, writeFile } from 'node:fs/promises';
import { FAMILY_GAME_META, FAMILY_PROMPT_TEMPLATES } from '../lib/family-games';
import { CATEGORIES, GAME_LIBRARY } from '../lib/games';
import { UI_STRINGS } from '../lib/i18n';
import type { FamilyGameType } from '../lib/types';

/**
 * Export the canonical English message catalog for human, offline translation.
 * This script deliberately performs no network requests and never sends health,
 * family, or game copy to an external translation service.
 */
const sources = new Set<string>(UI_STRINGS);
for (const category of CATEGORIES) sources.add(category);
for (const value of ['Easy', 'Medium', 'Hard']) sources.add(value);
for (const game of GAME_LIBRARY) {
  sources.add(game.name);
  sources.add(game.instruction);
  for (const level of game.levels) {
    sources.add(level.prompt);
    sources.add(level.answer);
    level.options.forEach((option) => sources.add(option));
  }
}
for (const type of Object.keys(FAMILY_GAME_META) as FamilyGameType[]) {
  const meta = FAMILY_GAME_META[type];
  sources.add(meta.name);
  sources.add(meta.description);
  FAMILY_PROMPT_TEMPLATES[type].forEach((prompt) => sources.add(prompt));
}

const catalog = [...sources].filter(Boolean);
await mkdir('work', { recursive: true });
await writeFile(
  'work/locale-source.json',
  `${JSON.stringify(Object.fromEntries(catalog.map((source) => [source, source])), null, 2)}\n`,
  'utf8',
);
console.log(`Exported ${catalog.length} canonical strings to work/locale-source.json for offline translation.`);
