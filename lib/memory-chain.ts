import type { Language, MemoryChainCategory, MemoryChainEntry, MemoryChainState } from './types';

type GameLanguage = 'en' | 'hi' | 'bn' | 'as';
type MemoryWord = { id: string; names: Record<GameLanguage, string>; aliases?: string[] };

export const MEMORY_CHAIN_GAME_ID = 41;
export const MEMORY_CHAIN_MAX_LEVEL = 10;

const FRUITS: MemoryWord[] = [
  { id: 'apple', names: { en: 'Apple', hi: 'सेब', bn: 'আপেল', as: 'আপেল' } },
  { id: 'mango', names: { en: 'Mango', hi: 'आम', bn: 'আম', as: 'আম' } },
  { id: 'banana', names: { en: 'Banana', hi: 'केला', bn: 'কলা', as: 'কল' }, aliases: ['কলা'] },
  { id: 'orange', names: { en: 'Orange', hi: 'संतरा', bn: 'কমলা', as: 'কমলা' } },
  { id: 'papaya', names: { en: 'Papaya', hi: 'पपीता', bn: 'পেঁপে', as: 'অমিতা' } },
  { id: 'guava', names: { en: 'Guava', hi: 'अमरूद', bn: 'পেয়ারা', as: 'মধুৰিআম' }, aliases: ['পেয়ারা'] },
  { id: 'grape', names: { en: 'Grapes', hi: 'अंगूर', bn: 'আঙুর', as: 'আঙুৰ' }, aliases: ['grape'] },
  { id: 'lychee', names: { en: 'Lychee', hi: 'लीची', bn: 'লিচু', as: 'লিচু' }, aliases: ['litchi'] },
  { id: 'pear', names: { en: 'Pear', hi: 'नाशपाती', bn: 'নাশপাতি', as: 'নাচপতি' } },
  { id: 'watermelon', names: { en: 'Watermelon', hi: 'तरबूज', bn: 'তরমুজ', as: 'তৰমুজ' } },
  { id: 'pineapple', names: { en: 'Pineapple', hi: 'अनानास', bn: 'আনারস', as: 'মাটিকঁঠাল' } },
  { id: 'pomegranate', names: { en: 'Pomegranate', hi: 'अनार', bn: 'ডালিম', as: 'ডালিম' } },
  { id: 'coconut', names: { en: 'Coconut', hi: 'नारियल', bn: 'নারকেল', as: 'নাৰিকল' } },
  { id: 'lemon', names: { en: 'Lemon', hi: 'नींबू', bn: 'লেবু', as: 'নেমু' }, aliases: ['lime'] },
  { id: 'jackfruit', names: { en: 'Jackfruit', hi: 'कटहल', bn: 'কাঁঠাল', as: 'কঁঠাল' } },
  { id: 'peach', names: { en: 'Peach', hi: 'आड़ू', bn: 'পীচ', as: 'পীচ' } },
  { id: 'plum', names: { en: 'Plum', hi: 'आलूबुखारा', bn: 'আলুবোখারা', as: 'আলুবোখৰা' } },
  { id: 'fig', names: { en: 'Fig', hi: 'अंजीर', bn: 'ডুমুর', as: 'ডিমৰু' } },
  { id: 'date', names: { en: 'Date', hi: 'खजूर', bn: 'খেজুর', as: 'খেজুৰ' } },
  { id: 'sweet-lime', names: { en: 'Sweet lime', hi: 'मौसमी', bn: 'মোসাম্বি', as: 'মৌচুমী' }, aliases: ['mosambi', 'sweetlime'] },
  { id: 'star-fruit', names: { en: 'Star fruit', hi: 'कमरख', bn: 'কামরাঙা', as: 'কৰ্দৈ' }, aliases: ['starfruit'] },
  { id: 'ber', names: { en: 'Jujube', hi: 'बेर', bn: 'কুল', as: 'বগৰী' }, aliases: ['ber'] },
  { id: 'mulberry', names: { en: 'Mulberry', hi: 'शहतूत', bn: 'তুঁত', as: 'নুনী' } },
  { id: 'custard-apple', names: { en: 'Custard apple', hi: 'सीताफल', bn: 'আতা', as: 'কঠালগুটি' }, aliases: ['custardapple'] },
];

const VEGETABLES: MemoryWord[] = [
  { id: 'carrot', names: { en: 'Carrot', hi: 'गाजर', bn: 'গাজর', as: 'গাজৰ' } },
  { id: 'potato', names: { en: 'Potato', hi: 'आलू', bn: 'আলু', as: 'আলু' } },
  { id: 'spinach', names: { en: 'Spinach', hi: 'पालक', bn: 'পালং', as: 'পালেং' } },
  { id: 'tomato', names: { en: 'Tomato', hi: 'टमाटर', bn: 'টমেটো', as: 'বিলাহী' } },
  { id: 'cabbage', names: { en: 'Cabbage', hi: 'पत्तागोभी', bn: 'বাঁধাকপি', as: 'বন্ধাকবি' }, aliases: ['पत्ता गोभी'] },
  { id: 'onion', names: { en: 'Onion', hi: 'प्याज', bn: 'পেঁয়াজ', as: 'পিয়াঁজ' }, aliases: ['प्याज़', 'পেয়াজ'] },
  { id: 'cauliflower', names: { en: 'Cauliflower', hi: 'फूलगोभी', bn: 'ফুলকপি', as: 'ফুলকবি' }, aliases: ['फूल गोभी'] },
  { id: 'peas', names: { en: 'Peas', hi: 'मटर', bn: 'মটর', as: 'মটৰ' }, aliases: ['pea'] },
  { id: 'okra', names: { en: 'Okra', hi: 'भिंडी', bn: 'ঢেঁড়স', as: 'ভেণ্ডি' }, aliases: ['ladyfinger', 'lady finger'] },
  { id: 'eggplant', names: { en: 'Eggplant', hi: 'बैंगन', bn: 'বেগুন', as: 'বেঙেনা' }, aliases: ['brinjal', 'aubergine'] },
  { id: 'radish', names: { en: 'Radish', hi: 'मूली', bn: 'মুলো', as: 'মূলা' } },
  { id: 'pumpkin', names: { en: 'Pumpkin', hi: 'कद्दू', bn: 'কুমড়া', as: 'ৰঙালাও' } },
  { id: 'cucumber', names: { en: 'Cucumber', hi: 'खीरा', bn: 'শসা', as: 'তিয়ঁহ' } },
  { id: 'beetroot', names: { en: 'Beetroot', hi: 'चुकंदर', bn: 'বিট', as: 'বীট' }, aliases: ['beet'] },
  { id: 'turnip', names: { en: 'Turnip', hi: 'शलजम', bn: 'শালগম', as: 'চালগোম' } },
  { id: 'capsicum', names: { en: 'Capsicum', hi: 'शिमला मिर्च', bn: 'ক্যাপসিকাম', as: 'কেপচিকাম' }, aliases: ['bell pepper', 'शिमलामिर्च'] },
  { id: 'beans', names: { en: 'Beans', hi: 'सेम', bn: 'শিম', as: 'উৰহী' }, aliases: ['bean'] },
  { id: 'bottle-gourd', names: { en: 'Bottle gourd', hi: 'लौकी', bn: 'লাউ', as: 'লাও' }, aliases: ['bottlegourd'] },
  { id: 'bitter-gourd', names: { en: 'Bitter gourd', hi: 'करेला', bn: 'করলা', as: 'কেৰেলা' }, aliases: ['bittergourd'] },
  { id: 'garlic', names: { en: 'Garlic', hi: 'लहसुन', bn: 'রসুন', as: 'নহৰু' } },
  { id: 'ginger', names: { en: 'Ginger', hi: 'अदरक', bn: 'আদা', as: 'আদা' } },
  { id: 'corn', names: { en: 'Corn', hi: 'मक्का', bn: 'ভুট্টা', as: 'মাকৈ' }, aliases: ['maize'] },
  { id: 'broccoli', names: { en: 'Broccoli', hi: 'ब्रोकली', bn: 'ব্রোকলি', as: 'ব্ৰকলি' } },
  { id: 'mushroom', names: { en: 'Mushroom', hi: 'मशरूम', bn: 'মাশরুম', as: 'কাঠফুলা' } },
];

const WORDS: Record<MemoryChainCategory, MemoryWord[]> = { fruits: FRUITS, vegetables: VEGETABLES };
const CONNECTORS = new Set(['and', 'then', 'next', 'और', 'फिर', 'ও', 'তারপর', 'এবং', 'আৰু', 'তাৰপিছত']);

function gameLanguage(language: Language): GameLanguage {
  return language === 'hi' || language === 'bn' || language === 'as' ? language : 'en';
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[.,!?;:()[\]{}'"“”‘’/\\|+_=—–-]|[।॥]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function vocabulary(category: MemoryChainCategory) {
  return WORDS[category];
}

function randomAvailableWord(category: MemoryChainCategory, used: string[], random = Math.random): MemoryWord {
  const words = vocabulary(category);
  const available = words.filter((word) => !used.includes(word.id));
  const pool = available.length ? available : words.filter((word) => word.id !== used.at(-1));
  return pool[Math.floor(random() * pool.length)] ?? words[0];
}

export function memoryChainWord(category: MemoryChainCategory, wordId: string, language: Language): string {
  const word = vocabulary(category).find((item) => item.id === wordId);
  return word?.names[gameLanguage(language)] ?? word?.names.en ?? wordId;
}

export function createMemoryChain(category: MemoryChainCategory, random = Math.random, score = 0): MemoryChainState {
  const first = randomAvailableWord(category, [], random);
  return { category, sequence: [{ wordId: first.id, source: 'system' }], phase: 'show', score: Math.max(0, Math.min(MEMORY_CHAIN_MAX_LEVEL - 1, score)) };
}

export function parseMemoryChainAnswer(category: MemoryChainCategory, input: string): string[] {
  const tokens = normalized(input).split(' ').filter(Boolean);
  const aliases = vocabulary(category).flatMap((word) => {
    const values = [...Object.values(word.names), ...(word.aliases ?? []), word.id];
    return values.map((value) => ({ id: word.id, tokens: normalized(value).split(' ').filter(Boolean) }));
  }).sort((a, b) => b.tokens.length - a.tokens.length);
  const result: string[] = [];
  for (let index = 0; index < tokens.length;) {
    if (CONNECTORS.has(tokens[index])) { index += 1; continue; }
    const match = aliases.find((alias) => alias.tokens.every((token, offset) => tokens[index + offset] === token));
    if (!match) { index += 1; continue; }
    result.push(match.id);
    index += match.tokens.length;
  }
  return result;
}

export function validateMemoryChainAnswer(state: MemoryChainState, input: string): { correct: boolean; reason?: MemoryChainState['failureReason']; userWordId?: string; heard: string[] } {
  const heard = parseMemoryChainAnswer(state.category, input);
  const expected = state.sequence.map((entry) => entry.wordId);
  if (heard.length !== expected.length + 1) return { correct: false, reason: heard.length ? 'sequence' : 'category', heard };
  if (!expected.every((wordId, index) => heard[index] === wordId)) return { correct: false, reason: 'sequence', heard };
  const userWordId = heard.at(-1)!;
  if (expected.includes(userWordId)) return { correct: false, reason: 'duplicate', heard };
  return { correct: true, userWordId, heard };
}

export function advanceMemoryChain(state: MemoryChainState, userWordId: string, random = Math.random): MemoryChainState {
  const withUser: MemoryChainEntry[] = [...state.sequence, { wordId: userWordId, source: 'user' }];
  const score = state.score + 1;
  if (score >= MEMORY_CHAIN_MAX_LEVEL) return { ...state, sequence: withUser, phase: 'complete', score, lastInput: undefined, failureReason: undefined };
  const systemWord = randomAvailableWord(state.category, withUser.map((entry) => entry.wordId), random);
  return { ...state, sequence: [...withUser, { wordId: systemWord.id, source: 'system' }], phase: 'show', score, lastInput: undefined, failureReason: undefined };
}

export function failMemoryChain(state: MemoryChainState, input: string, reason: NonNullable<MemoryChainState['failureReason']>): MemoryChainState {
  return { ...state, phase: 'failed', lastInput: input, failureReason: reason };
}

export function isMemoryChainState(value: unknown): value is MemoryChainState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<MemoryChainState>;
  return (state.category === 'fruits' || state.category === 'vegetables')
    && ['show', 'recall', 'failed', 'complete'].includes(String(state.phase))
    && Number.isInteger(state.score) && Number(state.score) >= 0 && Number(state.score) <= MEMORY_CHAIN_MAX_LEVEL
    && Array.isArray(state.sequence)
    && state.sequence.every((entry) => entry && typeof entry.wordId === 'string' && (entry.source === 'system' || entry.source === 'user'));
}
