import type { FamilyGameType, FamilyMember, PlayableGame } from './types';

export const FAMILY_GAME_META: Record<FamilyGameType, { id: number; name: string; icon: string; description: string }> = {
  who: { id: 101, name: 'Who Is This?', icon: '👤', description: 'Recognize a person and recall their relationship.' },
  match: { id: 102, name: 'Match Name to Face', icon: '▦', description: 'Match a saved family photo with the right name.' },
  remember: { id: 103, name: 'Remember the Family', icon: '↔', description: 'Recall names, nicknames, and relationships.' },
};

export const FAMILY_PROMPT_TEMPLATES: Record<FamilyGameType, string[]> = {
  who: [
    'What is {name}’s relationship to you?', 'Look at this familiar person. How is {name} connected to you?',
    '{name} is saved in My Family. Which relationship is correct?', 'Choose the relationship that belongs to {name}.',
    'Who is {name} in your family circle?', 'Recall {name}’s family profile. What is the relationship?',
    'Which connection did you save for {name}?', 'Think of {name}. How do you know this person?',
    'Complete the memory: {name} is my …', 'One final recall: what is {name}’s relationship to you?',
  ],
  match: [
    'Which saved name belongs to this face?', 'Look carefully. What is this family member’s name?',
    'Match this familiar face to the correct name.', 'Which name did you save with this photo?',
    'Choose the person shown in the family portrait.', 'Who is pictured here?',
    'Recall the name connected to this familiar face.', 'Which family profile matches this portrait?',
    'Complete the match: this face belongs to …', 'One final match: choose the correct saved name.',
  ],
  remember: [
    'Which name belongs to your {relationship}?', 'What relationship did you save for {name}?',
    'What nickname did you save for {name}?', 'Complete the memory: {name} is my …',
    'Which family member is connected with the name {name}?', '{nickname} is the nickname of which family member?',
    'Recall the profile: which relationship goes with {name}?', 'Which saved person matches the relationship “{relationship}”?',
    'Choose the saved nickname for {name}.', 'Final family recall: {name} is connected to you as what?',
  ],
};

const fallbackNames = ['Anita', 'Rohan', 'Meera', 'Kabir', 'Lata', 'Arun'];
const fallbackRelations = ['Friend', 'Cousin', 'Neighbour', 'Caregiver', 'Aunt', 'Uncle'];

function shuffled<T>(items: T[]): T[] {
  const values = [...items];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function choices(answer: string, pool: string[]): string[] {
  const distractors = Array.from(new Set([...pool, ...fallbackNames, ...fallbackRelations])).filter((value) => value && value !== answer);
  return shuffled([answer, ...shuffled(distractors).slice(0, 3)]);
}

export function createFamilyGame(type: FamilyGameType, level: number, members: FamilyMember[], contentLevel = level): { game: PlayableGame; member: FamilyMember } {
  const meta = FAMILY_GAME_META[type];
  const safeLevel = Math.max(1, Math.min(10, level));
  const safeContentLevel = Math.max(1, Math.min(10, contentLevel));
  const member = members[Math.floor(Math.random() * members.length)];
  const names = members.filter((item) => item.id !== member.id).map((item) => item.name);
  const relations = members.filter((item) => item.id !== member.id).map((item) => item.relationship);
  let prompt = '';
  let answer = '';
  let options: string[] = [];

  if (type === 'who') {
    prompt = FAMILY_PROMPT_TEMPLATES.who[safeContentLevel - 1]; answer = member.relationship;
    options = choices(answer, [...relations, ...fallbackRelations]);
  } else if (type === 'match') {
    prompt = FAMILY_PROMPT_TEMPLATES.match[safeContentLevel - 1]; answer = member.name;
    options = choices(answer, [...names, ...fallbackNames]);
  } else {
    const hasNickname = Boolean(member.nickname?.trim());
    const prompts = [...FAMILY_PROMPT_TEMPLATES.remember];
    if (!hasNickname) {
      prompts[2] = 'Which name is saved as your {relationship}?';
      prompts[5] = 'Who in your saved circle is your {relationship}?';
      prompts[8] = 'Choose the saved name for your {relationship}.';
    }
    const answerModes: Array<'name' | 'relationship' | 'nickname'> = ['name', 'relationship', hasNickname ? 'nickname' : 'name', 'relationship', 'relationship', hasNickname ? 'name' : 'name', 'relationship', 'name', hasNickname ? 'nickname' : 'name', 'relationship'];
    const mode = answerModes[safeContentLevel - 1];
    prompt = prompts[safeContentLevel - 1];
    answer = mode === 'name' ? member.name : mode === 'nickname' ? member.nickname! : member.relationship;
    options = mode === 'relationship' ? choices(answer, [...relations, ...fallbackRelations]) : choices(answer, [...names, ...members.map((item) => item.nickname ?? ''), ...fallbackNames]);
  }

  return {
    member,
    game: {
      id: meta.id,
      name: meta.name,
      category: 'Recognition',
      icon: meta.icon,
      instruction: meta.description,
      level: safeLevel,
      prompt,
      promptValues: { name: member.name, relationship: member.relationship, nickname: member.nickname ?? member.name },
      answer,
      options,
      familyType: type,
    },
  };
}
