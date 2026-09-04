import type { Category, Difficulty, GameDefinition, GameResult, Language } from './types';

const g = (id: number, name: string, category: Category, icon: string, prompt: string, options: string[], answer: string, instruction = 'Choose the best answer.'):
  GameDefinition => ({ id, name, category, icon, instruction, prompt, options, answer });

export const CATEGORIES: Category[] = ['Memory', 'Attention', 'Pattern', 'Recognition', 'Language', 'Routine', 'Emotion', 'Cultural'];

export const GAME_LIBRARY: GameDefinition[] = [
  g(1, 'Remember the Objects', 'Memory', '🧺', 'Which item was in the basket: apple, key, cup?', ['Key', 'Book', 'Shoe', 'Clock'], 'Key', 'Remember the three items, then choose one you saw.'),
  g(2, 'Card Memory Match', 'Memory', '🃏', 'The card with a sun was paired with which card?', ['Moon', 'Leaf', 'Cup', 'Bell'], 'Moon'),
  g(3, 'Remember the Sequence', 'Memory', '🔢', 'What comes after 2 in this sequence: 4, 2, 7?', ['7', '4', '9', '1'], '7'),
  g(4, 'What Changed?', 'Memory', '🔍', 'A table had a cup and a book. Now it has only a book. What changed?', ['The cup is gone', 'The book is gone', 'A clock appeared', 'Nothing changed'], 'The cup is gone'),
  g(5, 'Story Recall', 'Memory', '📖', 'Mina visited the market on Tuesday and bought oranges. What did she buy?', ['Oranges', 'Rice', 'Flowers', 'Tea'], 'Oranges'),
  g(6, 'Daily Life Recall', 'Memory', '🗓️', 'You put your keys beside the blue vase. Where are the keys?', ['Beside the blue vase', 'In the fridge', 'Under the bed', 'At the gate'], 'Beside the blue vase'),
  g(7, 'Face & Name Memory', 'Memory', '🙂', 'The smiling person was introduced as Asha. What was her name?', ['Asha', 'Mina', 'Rita', 'Tara'], 'Asha'),
  g(8, 'Remember the Picture', 'Memory', '🖼️', 'The picture showed a red boat on a lake. What color was the boat?', ['Red', 'Blue', 'Green', 'White'], 'Red'),

  g(9, 'Find the Different Object', 'Attention', '👀', 'Which item is different?', ['Apple', 'Apple', 'Orange', 'Apple'], 'Orange'),
  g(10, 'Number Hunt', 'Attention', '🔎', 'Find the number 8.', ['3', '6', '8', '9'], '8'),
  g(11, 'Color Attention', 'Attention', '🎨', 'Tap the color of grass.', ['Green', 'Purple', 'Orange', 'Pink'], 'Green'),
  g(12, 'Follow the Rule', 'Attention', '☝️', 'Rule: choose an animal. Which should you choose?', ['Cat', 'Chair', 'Spoon', 'Bus'], 'Cat'),
  g(13, 'Target Tap', 'Attention', '🎯', 'Tap the target word: STAR', ['MOON', 'STAR', 'SUN', 'CLOUD'], 'STAR'),

  g(14, 'Complete the Pattern', 'Pattern', '🔷', 'Complete the pattern: circle, square, circle, square, …', ['Circle', 'Triangle', 'Star', 'Square'], 'Circle'),
  g(15, 'Shape Sequence', 'Pattern', '🔺', 'What comes next: ▲ ● ▲ ● ?', ['▲', '■', '◆', '●'], '▲'),
  g(16, 'Which Comes Next?', 'Pattern', '➡️', 'What comes next: 2, 4, 6, …', ['8', '7', '9', '10'], '8'),
  g(17, 'Sort the Objects', 'Pattern', '↕️', 'Which is the smallest?', ['Seed', 'Tree', 'House', 'Bus'], 'Seed'),
  g(18, 'Simple Everyday Puzzles', 'Pattern', '🧩', 'A cup is used for drinking. What is a plate used for?', ['Holding food', 'Opening doors', 'Writing', 'Sweeping'], 'Holding food'),

  g(19, 'Identify the Object', 'Recognition', '☂️', 'Which object keeps you dry in rain?', ['Umbrella', 'Pillow', 'Plate', 'Comb'], 'Umbrella'),
  g(20, 'Object & Purpose', 'Recognition', '🔑', 'What do we use a key for?', ['Opening a lock', 'Cooking rice', 'Washing clothes', 'Writing'], 'Opening a lock'),
  g(21, 'Familiar Place Recognition', 'Recognition', '🏥', 'Where would you usually meet a doctor?', ['Clinic', 'Post office', 'Garden', 'Bakery'], 'Clinic'),
  g(22, 'Food Recognition', 'Recognition', '🍚', 'Which one is a food?', ['Rice', 'Soap', 'Pencil', 'Shoe'], 'Rice'),
  g(23, 'Household Object Recognition', 'Recognition', '🪑', 'Which item do you sit on?', ['Chair', 'Clock', 'Cup', 'Lamp'], 'Chair'),

  g(24, 'Complete the Word', 'Language', '🔤', 'Complete the word: W _ T E R', ['A', 'E', 'I', 'O'], 'A'),
  g(25, 'Word Association', 'Language', '💬', 'Which word goes best with “tea”?', ['Cup', 'Shoe', 'Road', 'Door'], 'Cup'),
  g(26, 'Familiar Names', 'Language', '📝', 'Which is commonly a person’s name?', ['Anita', 'Table', 'Window', 'Bottle'], 'Anita'),
  g(27, 'Complete the Proverb', 'Language', '🗣️', 'Complete: Better late than …', ['Never', 'Blue', 'Quickly', 'Yesterday'], 'Never'),
  g(28, 'Simple Sentence Completion', 'Language', '✍️', 'Complete: I drink water when I am …', ['Thirsty', 'Closed', 'Round', 'Quiet'], 'Thirsty'),

  g(29, 'Morning Routine', 'Routine', '🌅', 'What usually comes after waking up?', ['Freshen up', 'Go to sleep', 'Eat dinner', 'Turn off all lights'], 'Freshen up'),
  g(30, 'What Should I Do Next?', 'Routine', '➡️', 'You have washed your hands before lunch. What is next?', ['Eat lunch', 'Go back to bed', 'Wear shoes', 'Water the road'], 'Eat lunch'),
  g(31, 'Daily Schedule Recall', 'Routine', '🕙', 'Your walk is at 10:00. What is planned at 10:00?', ['Walk', 'Sleep', 'Dinner', 'Medicine'], 'Walk'),
  g(32, 'Everyday Task Ordering', 'Routine', '📋', 'What is the first step before making tea?', ['Boil water', 'Wash the cup after tea', 'Serve the tea', 'Put the kettle away'], 'Boil water'),

  g(33, 'Identify the Emotion', 'Emotion', '😊', 'A person is smiling and laughing. How might they feel?', ['Happy', 'Angry', 'Worried', 'Tired'], 'Happy'),
  g(34, 'Mood Recognition', 'Emotion', '😌', 'You feel calm and your body is relaxed. Which mood fits?', ['Peaceful', 'Furious', 'Frightened', 'Confused'], 'Peaceful'),
  g(35, 'Positive Memory Prompts', 'Emotion', '💛', 'Which activity may help you recall a warm family memory?', ['Looking at a family photo', 'Hiding every photo', 'Skipping meals', 'Losing sleep'], 'Looking at a family photo'),

  g(36, 'NER Memory Match', 'Cultural', '🧶', 'Which pair belongs together?', ['Bamboo & craft', 'Tea & shoe', 'River & cupboard', 'Drum & pillow'], 'Bamboo & craft'),
  g(37, 'Landmark Memory', 'Cultural', '⛰️', 'Kaziranga National Park is especially known for which animal?', ['One-horned rhinoceros', 'Polar bear', 'Kangaroo', 'Penguin'], 'One-horned rhinoceros'),
  g(38, 'Festival Memory', 'Cultural', '🪔', 'Bihu is celebrated prominently in which state?', ['Assam', 'Goa', 'Punjab', 'Kerala'], 'Assam'),
  g(39, 'Traditional Object Recognition', 'Cultural', '🧣', 'A gamosa is best recognized as what kind of item?', ['Woven cloth', 'Metal pot', 'Wooden chair', 'Clay lamp'], 'Woven cloth'),
  g(40, 'Local Sound Memory', 'Cultural', '🥁', 'Which sound would most likely come from a dhol?', ['A drumbeat', 'A whistle', 'A bell ring', 'Running water'], 'A drumbeat'),
];

export const CATEGORY_INSTRUCTIONS: Record<Language, Record<Category, string>> = {
  en: { Memory: 'Remember carefully, then choose.', Attention: 'Look closely and choose the target.', Pattern: 'Find the rule and complete it.', Recognition: 'Identify the familiar object or place.', Language: 'Choose the word that fits.', Routine: 'Choose the most helpful next step.', Emotion: 'Choose the feeling that fits.', Cultural: 'Choose the familiar North-Eastern connection.' },
  hi: { Memory: 'ध्यान से याद करें, फिर उत्तर चुनें।', Attention: 'ध्यान से देखें और सही लक्ष्य चुनें।', Pattern: 'नियम पहचानकर क्रम पूरा करें।', Recognition: 'जानी-पहचानी वस्तु या जगह पहचानें।', Language: 'सही शब्द चुनें।', Routine: 'सबसे उपयोगी अगला कदम चुनें।', Emotion: 'सही भावना चुनें।', Cultural: 'उत्तर-पूर्व से जुड़ा सही विकल्प चुनें।' },
  as: { Memory: 'মনোযোগেৰে মনত ৰাখি উত্তৰ বাছক।', Attention: 'ভালদৰে চাই সঠিক লক্ষ্য বাছক।', Pattern: 'নিয়মটো চিনাক্ত কৰি ক্ৰম সম্পূৰ্ণ কৰক।', Recognition: 'চিনাকি বস্তু বা ঠাই চিনাক্ত কৰক।', Language: 'খাপ খোৱা শব্দটো বাছক।', Routine: 'পৰৱৰ্তী উপযোগী কামটো বাছক।', Emotion: 'খাপ খোৱা অনুভৱটো বাছক।', Cultural: 'উত্তৰ-পূবৰ সৈতে জড়িত সঠিক বিকল্প বাছক।' },
};

export function difficultyFor(category: Category, results: GameResult[]): Difficulty {
  const recent = results.filter((r) => r.category === category).slice(-5);
  if (recent.length < 2) return 'Easy';
  const average = recent.reduce((sum, r) => sum + r.accuracy, 0) / recent.length;
  if (average >= 85) return 'Hard';
  if (average <= 55) return 'Easy';
  return 'Medium';
}

export function createBalancedSession(minutes: number): GameDefinition[] {
  const gameCount = Math.max(2, Math.min(16, Math.ceil(minutes / 2.5)));
  const pools = CATEGORIES.map((category) => GAME_LIBRARY.filter((game) => game.category === category));
  const chosen: GameDefinition[] = [];
  let round = 0;
  while (chosen.length < gameCount) {
    pools.forEach((pool) => {
      if (chosen.length < gameCount) chosen.push(pool[round % pool.length]);
    });
    round += 1;
  }
  return chosen;
}
