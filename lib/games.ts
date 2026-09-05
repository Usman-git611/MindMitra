import type { Category, Difficulty, GameDefinition, GameLevel, GameResult, Language, PlayableGame } from './types';

type LevelSeed = readonly [prompt: string, answer: string];
type GameMeta = readonly [id: number, name: string, category: Category, icon: string, instruction: string];

export const CATEGORIES: Category[] = ['Memory', 'Attention', 'Pattern', 'Recognition', 'Language', 'Routine', 'Emotion', 'Cultural'];

const GAME_META: GameMeta[] = [
  [1, 'Remember the Objects', 'Memory', '🧺', 'Remember the objects, then choose the one requested.'],
  [2, 'Card Memory Match', 'Memory', '🃏', 'Remember each pair, then choose its matching card.'],
  [3, 'Remember the Sequence', 'Memory', '🔢', 'Hold the short sequence in mind and choose the requested item.'],
  [4, 'What Changed?', 'Memory', '🔍', 'Compare the two scenes and identify the change.'],
  [5, 'Story Recall', 'Memory', '📖', 'Read the short story carefully, then recall one detail.'],
  [6, 'Daily Life Recall', 'Memory', '🗓️', 'Remember where an everyday item was placed.'],
  [7, 'Face & Name Memory', 'Memory', '🙂', 'Remember the introduction and choose the correct name.'],
  [8, 'Remember the Picture', 'Memory', '🖼️', 'Picture the scene and recall one visible detail.'],
  [9, 'Find the Different Object', 'Attention', '👀', 'Look closely and find the item that is different.'],
  [10, 'Number Hunt', 'Attention', '🔎', 'Scan the choices and find the target number.'],
  [11, 'Color Attention', 'Attention', '🎨', 'Focus on the clue and choose the matching color.'],
  [12, 'Follow the Rule', 'Attention', '☝️', 'Keep the rule in mind and choose the item that follows it.'],
  [13, 'Target Tap', 'Attention', '🎯', 'Find the exact target word without rushing.'],
  [14, 'Complete the Pattern', 'Pattern', '🔷', 'Find the repeating rule and complete the pattern.'],
  [15, 'Shape Sequence', 'Pattern', '🔺', 'Follow the visual sequence and choose the next shape.'],
  [16, 'Which Comes Next?', 'Pattern', '➡️', 'Notice how the numbers change and choose the next one.'],
  [17, 'Sort the Objects', 'Pattern', '↕️', 'Compare the objects by size, length, or order.'],
  [18, 'Simple Everyday Puzzles', 'Pattern', '🧩', 'Use everyday reasoning to choose the helpful answer.'],
  [19, 'Identify the Object', 'Recognition', '☂️', 'Use the clue to identify the familiar object.'],
  [20, 'Object & Purpose', 'Recognition', '🔑', 'Match the everyday object with what it is used for.'],
  [21, 'Familiar Place Recognition', 'Recognition', '🏥', 'Use the clue to recognize a familiar place.'],
  [22, 'Food Recognition', 'Recognition', '🍚', 'Recognize the food described in the clue.'],
  [23, 'Household Object Recognition', 'Recognition', '🪑', 'Identify the household object by its purpose.'],
  [24, 'Complete the Word', 'Language', '🔤', 'Choose the missing letter to complete the word.'],
  [25, 'Word Association', 'Language', '💬', 'Choose the word most closely connected to the clue.'],
  [26, 'Familiar Names', 'Language', '📝', 'Choose the person’s name among the everyday words.'],
  [27, 'Complete the Proverb', 'Language', '🗣️', 'Choose the familiar word that completes the saying.'],
  [28, 'Simple Sentence Completion', 'Language', '✍️', 'Choose the word that makes the sentence meaningful.'],
  [29, 'Morning Routine', 'Routine', '🌅', 'Choose a sensible next step in a morning routine.'],
  [30, 'What Should I Do Next?', 'Routine', '➡️', 'Choose the safe and helpful next action.'],
  [31, 'Daily Schedule Recall', 'Routine', '🕙', 'Read the schedule clue and choose the planned activity.'],
  [32, 'Everyday Task Ordering', 'Routine', '📋', 'Put an everyday task in a sensible order.'],
  [33, 'Identify the Emotion', 'Emotion', '😊', 'Use the expression or situation to identify the feeling.'],
  [34, 'Mood Recognition', 'Emotion', '😌', 'Choose the mood that best fits the body and situation.'],
  [35, 'Positive Memory Prompts', 'Emotion', '💛', 'Choose a gentle activity that can support a warm memory.'],
  [36, 'NER Memory Match', 'Cultural', '🧶', 'Match two items with a meaningful North-Eastern connection.'],
  [37, 'Landmark Memory', 'Cultural', '⛰️', 'Recall a well-known North-Eastern landmark or place.'],
  [38, 'Festival Memory', 'Cultural', '🪔', 'Recall a festival and its North-Eastern connection.'],
  [39, 'Traditional Object Recognition', 'Cultural', '🧣', 'Recognize a traditional North-Eastern object or craft.'],
  [40, 'Local Sound Memory', 'Cultural', '🥁', 'Connect a familiar local instrument or setting with its sound.'],
];

const LEVEL_BANKS: Record<number, LevelSeed[]> = {
  1: [
    ['Remember: apple, key, cup. Which item opens a lock?', 'Key'], ['Remember: scarf, spoon, clock. Which item tells time?', 'Clock'],
    ['Remember: book, mango, comb. Which item is used for reading?', 'Book'], ['Remember: bell, plate, flower. Which item can ring?', 'Bell'],
    ['Remember: shoe, pen, banana. Which item is used for writing?', 'Pen'], ['Remember: umbrella, bowl, soap. Which item keeps rain off you?', 'Umbrella'],
    ['Remember: glasses, lemon, bag. Which item helps some people see?', 'Glasses'], ['Remember: towel, coin, bottle. Which item dries your hands?', 'Towel'],
    ['Remember: candle, chair, orange. Which item gives light?', 'Candle'], ['Remember: brush, radio, rice. Which item can play sound?', 'Radio'],
  ],
  2: [
    ['Remember the pair: Sun — Moon. What matched the Sun card?', 'Moon'], ['Remember the pair: Cup — Saucer. What matched the Cup card?', 'Saucer'],
    ['Remember the pair: Lock — Key. What matched the Lock card?', 'Key'], ['Remember the pair: Needle — Thread. What matched the Needle card?', 'Thread'],
    ['Remember the pair: Shoe — Sock. What matched the Shoe card?', 'Sock'], ['Remember the pair: Pen — Paper. What matched the Pen card?', 'Paper'],
    ['Remember the pair: Flower — Vase. What matched the Flower card?', 'Vase'], ['Remember the pair: Rain — Umbrella. What matched the Rain card?', 'Umbrella'],
    ['Remember the pair: Tea — Kettle. What matched the Tea card?', 'Kettle'], ['Remember the pair: Door — Bell. What matched the Door card?', 'Bell'],
  ],
  3: [
    ['Remember: 4, 2, 7. Which number came after 2?', '7'], ['Remember: 9, 3, 6. Which number came first?', '9'],
    ['Remember: 1, 8, 5. Which number was in the middle?', '8'], ['Remember: 7, 4, 2, 9. Which number came after 2?', '9'],
    ['Remember: 6, 1, 3, 8. Which number came before 3?', '1'], ['Remember: 5, 9, 2, 4. Which number came last?', '4'],
    ['Remember: 8, 6, 1, 7. Which number came after 8?', '6'], ['Remember: 3, 7, 5, 2, 9. Which number was third?', '5'],
    ['Remember: 2, 4, 8, 1, 6. Which number came before 6?', '1'], ['Remember: 9, 1, 5, 7, 3. Which number came after 5?', '7'],
  ],
  4: [
    ['First: a cup and a book. Now: only a book. What changed?', 'The cup is gone'], ['First: a red flower. Now: a yellow flower. What changed?', 'The flower changed color'],
    ['First: two chairs. Now: three chairs. What changed?', 'A chair was added'], ['First: the lamp was off. Now: it is on. What changed?', 'The lamp was switched on'],
    ['First: the door was open. Now: it is closed. What changed?', 'The door was closed'], ['First: a plate held rice. Now: it is empty. What changed?', 'The rice is gone'],
    ['First: the book was on the table. Now: it is under the table. What changed?', 'The book moved'], ['First: four apples. Now: three apples. What changed?', 'One apple was removed'],
    ['First: a dry road. Now: a wet road. What changed?', 'The road became wet'], ['First: the clock showed 8:00. Now: it shows 9:00. What changed?', 'One hour passed'],
  ],
  5: [
    ['Mina visited the market on Tuesday and bought oranges. What did she buy?', 'Oranges'], ['Arun watered the roses before breakfast. What did he water?', 'Roses'],
    ['Leela called her sister after lunch. Whom did she call?', 'Her sister'], ['Ravi took a blue bus to the library. What color was the bus?', 'Blue'],
    ['Tara baked bread on Sunday morning. What did she bake?', 'Bread'], ['Bina kept the gift inside the cupboard. Where was the gift?', 'Cupboard'],
    ['Naren met his friend beside the old bridge. Where did they meet?', 'Old bridge'], ['Asha fed the cat before going for a walk. Which animal did she feed?', 'Cat'],
    ['Deepa planted three marigolds near the gate. How many did she plant?', 'Three'], ['Kamal listened to the radio during the rain. What did he listen to?', 'Radio'],
  ],
  6: [
    ['You put your keys beside the blue vase. Where are the keys?', 'Beside the blue vase'], ['You left your glasses on the bedside table. Where are the glasses?', 'On the bedside table'],
    ['You kept the medicine in the top drawer. Where is the medicine?', 'In the top drawer'], ['You placed your phone near the window. Where is the phone?', 'Near the window'],
    ['You hung the umbrella behind the door. Where is the umbrella?', 'Behind the door'], ['You stored the rice in the kitchen cupboard. Where is the rice?', 'In the kitchen cupboard'],
    ['You put the letter inside the brown bag. Where is the letter?', 'Inside the brown bag'], ['You left the towel beside the washbasin. Where is the towel?', 'Beside the washbasin'],
    ['You kept the shoes under the wooden bench. Where are the shoes?', 'Under the wooden bench'], ['You placed the water bottle on the dining table. Where is the bottle?', 'On the dining table'],
  ],
  7: [
    ['The smiling woman was introduced as Asha. What was her name?', 'Asha'], ['The man wearing a green cap was introduced as Rohan. What was his name?', 'Rohan'],
    ['The woman holding flowers was introduced as Meera. What was her name?', 'Meera'], ['The man with round glasses was introduced as Dev. What was his name?', 'Dev'],
    ['The woman in the blue shawl was introduced as Lata. What was her name?', 'Lata'], ['The man beside the window was introduced as Ajay. What was his name?', 'Ajay'],
    ['The woman carrying a red bag was introduced as Nita. What was her name?', 'Nita'], ['The man holding a book was introduced as Kabir. What was his name?', 'Kabir'],
    ['The woman wearing a yellow scarf was introduced as Rina. What was her name?', 'Rina'], ['The man with a walking stick was introduced as Mohan. What was his name?', 'Mohan'],
  ],
  8: [
    ['Picture a red boat on a lake. What color is the boat?', 'Red'], ['Picture a white bird in a green tree. What color is the bird?', 'White'],
    ['Picture two cups beside a kettle. How many cups are there?', 'Two'], ['Picture a yellow bus near a school. What is near the school?', 'Bus'],
    ['Picture a cat sleeping on a blue mat. Where is the cat?', 'On a blue mat'], ['Picture three stars above a hill. How many stars are there?', 'Three'],
    ['Picture a round clock over a doorway. What is over the doorway?', 'Clock'], ['Picture an orange flower in a clay pot. What holds the flower?', 'Clay pot'],
    ['Picture a bicycle beside a mango tree. What is beside the tree?', 'Bicycle'], ['Picture a silver moon above dark clouds. What is above the clouds?', 'Moon'],
  ],
  9: [
    ['Which item is different: apple, apple, orange, apple?', 'Orange'], ['Which item is different: cup, cup, plate, cup?', 'Plate'],
    ['Which item is different: 6, 6, 9, 6?', '9'], ['Which item is different: blue, blue, green, blue?', 'Green'],
    ['Which item is different: cat, cat, dog, cat?', 'Dog'], ['Which item is different: leaf, leaf, flower, leaf?', 'Flower'],
    ['Which item is different: square, square, circle, square?', 'Circle'], ['Which item is different: Monday, Monday, Friday, Monday?', 'Friday'],
    ['Which item is different: spoon, spoon, fork, spoon?', 'Fork'], ['Which item is different: north, north, south, north?', 'South'],
  ],
  10: [
    ['Find the number 8.', '8'], ['Find the number 17.', '17'], ['Find the number 42.', '42'], ['Find the number 63.', '63'], ['Find the number 91.', '91'],
    ['Find the number 105.', '105'], ['Find the number 238.', '238'], ['Find the number 407.', '407'], ['Find the number 560.', '560'], ['Find the number 999.', '999'],
  ],
  11: [
    ['Choose the color of fresh grass.', 'Green'], ['Choose the color of a clear daytime sky.', 'Blue'], ['Choose the color of ripe turmeric.', 'Yellow'],
    ['Choose the color of clean milk.', 'White'], ['Choose the color of coal.', 'Black'], ['Choose the color of a ripe tomato.', 'Red'],
    ['Choose the color made by mixing red and blue.', 'Purple'], ['Choose the color of a ripe orange fruit.', 'Orange'], ['Choose the color often seen on tree trunks.', 'Brown'], ['Choose the color made by mixing red and white.', 'Pink'],
  ],
  12: [
    ['Rule: choose an animal. Which should you choose?', 'Cat'], ['Rule: choose something you can drink. Which should you choose?', 'Water'],
    ['Rule: choose a fruit. Which should you choose?', 'Mango'], ['Rule: choose something worn on the feet. Which should you choose?', 'Sandal'],
    ['Rule: choose a vehicle. Which should you choose?', 'Bus'], ['Rule: choose something found in a kitchen. Which should you choose?', 'Pan'],
    ['Rule: choose a flower. Which should you choose?', 'Rose'], ['Rule: choose something that can tell time. Which should you choose?', 'Clock'],
    ['Rule: choose a musical instrument. Which should you choose?', 'Flute'], ['Rule: choose a place where books are borrowed. Which should you choose?', 'Library'],
  ],
  13: [
    ['Tap the target word: STAR', 'STAR'], ['Tap the target word: RIVER', 'RIVER'], ['Tap the target word: HOME', 'HOME'], ['Tap the target word: SMILE', 'SMILE'], ['Tap the target word: GARDEN', 'GARDEN'],
    ['Tap the target word: FAMILY', 'FAMILY'], ['Tap the target word: MORNING', 'MORNING'], ['Tap the target word: BASKET', 'BASKET'], ['Tap the target word: WINDOW', 'WINDOW'], ['Tap the target word: FRIEND', 'FRIEND'],
  ],
  14: [
    ['Complete: circle, square, circle, square, …', 'Circle'], ['Complete: red, blue, red, blue, …', 'Red'], ['Complete: 1, 2, 1, 2, …', '1'],
    ['Complete: leaf, flower, leaf, flower, …', 'Leaf'], ['Complete: A, B, C, A, B, …', 'C'], ['Complete: sun, moon, sun, moon, …', 'Sun'],
    ['Complete: 2, 4, 2, 4, …', '2'], ['Complete: clap, tap, clap, tap, …', 'Clap'], ['Complete: cup, plate, spoon, cup, plate, …', 'Spoon'], ['Complete: north, east, south, north, east, …', 'South'],
  ],
  15: [
    ['What comes next: ▲ ● ▲ ● ?', '▲'], ['What comes next: ■ ◆ ■ ◆ ?', '■'], ['What comes next: ● ● ▲ ● ● ▲ ?', '●'],
    ['What comes next: ★ ○ ★ ○ ?', '★'], ['What comes next: ◆ ▲ ■ ◆ ▲ ?', '■'], ['What comes next: ○ □ △ ○ □ ?', '△'],
    ['What comes next: ▲ ▲ ● ▲ ▲ ● ?', '▲'], ['What comes next: ■ ● ● ■ ● ● ?', '■'], ['What comes next: ★ ◆ ○ ★ ◆ ?', '○'], ['What comes next: △ □ ○ ◆ △ □ ○ ?', '◆'],
  ],
  16: [
    ['What comes next: 2, 4, 6, …', '8'], ['What comes next: 5, 10, 15, …', '20'], ['What comes next: 10, 9, 8, …', '7'],
    ['What comes next: 3, 6, 9, …', '12'], ['What comes next: 1, 3, 5, …', '7'], ['What comes next: 20, 18, 16, …', '14'],
    ['What comes next: 4, 8, 12, …', '16'], ['What comes next: 2, 4, 8, …', '16'], ['What comes next: 30, 25, 20, …', '15'], ['What comes next: 1, 4, 7, 10, …', '13'],
  ],
  17: [
    ['Which is the smallest?', 'Seed'], ['Which is the tallest?', 'Giraffe'], ['Which is the shortest length?', 'Matchstick'], ['Which usually holds the most water?', 'Bucket'],
    ['Which is the lightest?', 'Feather'], ['Which number is greatest?', '90'], ['Which event comes earliest in a day?', 'Sunrise'], ['Which item is usually widest?', 'Dining table'],
    ['Which trip is usually shortest?', 'Bedroom to kitchen'], ['Which season comes after spring?', 'Summer'],
  ],
  18: [
    ['A cup is used for drinking. What is a plate used for?', 'Holding food'], ['The floor is wet. What should you do first?', 'Walk carefully'],
    ['A room is dark. What can help you see?', 'Switch on a light'], ['You want to know the time. What should you check?', 'A clock'],
    ['A plant’s soil is very dry. What may help it?', 'Give it water'], ['You are going outside in rain. What should you carry?', 'An umbrella'],
    ['The phone is ringing. What is the useful next action?', 'Answer it'], ['Your hands are dirty before eating. What should you do?', 'Wash them'],
    ['A letter needs to be posted. Where should it go?', 'Post box'], ['You feel tired after a walk. What is a sensible choice?', 'Sit and rest'],
  ],
  19: [
    ['Which object keeps you dry in rain?', 'Umbrella'], ['Which object helps you unlock a door?', 'Key'], ['Which object is used to comb hair?', 'Comb'],
    ['Which object lets you call someone?', 'Phone'], ['Which object helps you see your reflection?', 'Mirror'], ['Which object carries groceries?', 'Bag'],
    ['Which object is used to cut paper?', 'Scissors'], ['Which object can light a dark room?', 'Lamp'], ['Which object is used to write with ink?', 'Pen'], ['Which object tells the time?', 'Clock'],
  ],
  20: [
    ['What do we use a key for?', 'Opening a lock'], ['What do we use a kettle for?', 'Boiling water'], ['What do we use a pillow for?', 'Resting the head'],
    ['What do we use a broom for?', 'Sweeping the floor'], ['What do we use a calendar for?', 'Checking dates'], ['What do we use a refrigerator for?', 'Keeping food cool'],
    ['What do we use a needle for?', 'Sewing cloth'], ['What do we use a torch for?', 'Seeing in the dark'], ['What do we use a cup for?', 'Drinking'], ['What do we use a towel for?', 'Drying ourselves'],
  ],
  21: [
    ['Where would you usually meet a doctor?', 'Clinic'], ['Where would you usually borrow a book?', 'Library'], ['Where would you usually buy vegetables?', 'Market'],
    ['Where would you usually catch a train?', 'Railway station'], ['Where would you usually post a parcel?', 'Post office'], ['Where would children usually attend lessons?', 'School'],
    ['Where would you usually buy medicine?', 'Pharmacy'], ['Where would you usually see many plants and benches?', 'Park'], ['Where would you usually withdraw cash?', 'Bank'], ['Where would you usually board an airplane?', 'Airport'],
  ],
  22: [
    ['Which food is made from cooked grains and often eaten with curry?', 'Rice'], ['Which fruit is yellow and can be peeled?', 'Banana'], ['Which drink is often made with tea leaves and milk?', 'Tea'],
    ['Which food is a round flatbread cooked on a hot pan?', 'Roti'], ['Which fruit has a hard shell and water inside?', 'Coconut'], ['Which food is made by cooking lentils?', 'Dal'],
    ['Which fruit has many red seeds inside?', 'Pomegranate'], ['Which dairy food is cool, white, and slightly tangy?', 'Curd'], ['Which vegetable is orange and grows underground?', 'Carrot'], ['Which snack is a steamed rice cake from South India?', 'Idli'],
  ],
  23: [
    ['Which item do you sit on?', 'Chair'], ['Which item is used to cover a bed?', 'Bedsheet'], ['Which item stores clothes?', 'Wardrobe'], ['Which item is used to wash clothes?', 'Washing machine'],
    ['Which item hangs on a wall and shows time?', 'Wall clock'], ['Which item is used to cook on a flame?', 'Stove'], ['Which item helps cool a room?', 'Fan'],
    ['Which item is used to clean teeth?', 'Toothbrush'], ['Which item holds water for bathing?', 'Bucket'], ['Which item is used to serve soup?', 'Bowl'],
  ],
  24: [
    ['Complete the word: W _ T E R', 'A'], ['Complete the word: H O M _', 'E'], ['Complete the word: M _ L K', 'I'], ['Complete the word: D O _ R', 'O'],
    ['Complete the word: C _ P', 'U'], ['Complete the word: T _ E E', 'R'], ['Complete the word: F _ O W E R', 'L'], ['Complete the word: _ U N', 'S'],
    ['Complete the word: _ E A', 'T'], ['Complete the word: M O O _', 'N'],
  ],
  25: [
    ['Which word goes best with “tea”?', 'Cup'], ['Which word goes best with “rain”?', 'Umbrella'], ['Which word goes best with “bed”?', 'Pillow'], ['Which word goes best with “door”?', 'Key'],
    ['Which word goes best with “garden”?', 'Flower'], ['Which word goes best with “school”?', 'Teacher'], ['Which word goes best with “kitchen”?', 'Stove'],
    ['Which word goes best with “letter”?', 'Envelope'], ['Which word goes best with “music”?', 'Song'], ['Which word goes best with “river”?', 'Water'],
  ],
  26: [
    ['Which is commonly a person’s name? Look past the household words.', 'Anita'], ['Which is commonly a person’s name? Look past the place words.', 'Rahul'], ['Which is commonly a person’s name? Look past the food words.', 'Meera'], ['Which is commonly a person’s name? Look past the object words.', 'Kabir'],
    ['Which is commonly a person’s name? Look past the color words.', 'Lata'], ['Which is commonly a person’s name? Look past the animal words.', 'Arun'], ['Which is commonly a person’s name? Look past the clothing words.', 'Nandini'], ['Which is commonly a person’s name? Look past the weather words.', 'Dev'],
    ['Which is commonly a person’s name? Look past the transport words.', 'Priya'], ['Which is commonly a person’s name? Look past the garden words.', 'Mohan'],
  ],
  27: [
    ['Complete: Better late than …', 'Never'], ['Complete: Practice makes …', 'Perfect'], ['Complete: Where there is a will, there is a …', 'Way'],
    ['Complete: Honesty is the best …', 'Policy'], ['Complete: Two heads are better than …', 'One'], ['Complete: A friend in need is a friend …', 'Indeed'],
    ['Complete: Look before you …', 'Leap'], ['Complete: Every cloud has a silver …', 'Lining'], ['Complete: Slow and steady wins the …', 'Race'], ['Complete: An apple a day keeps the doctor …', 'Away'],
  ],
  28: [
    ['Complete: I drink water when I am …', 'Thirsty'], ['Complete: I use an umbrella when it is …', 'Raining'], ['Complete: I switch on a lamp when the room is …', 'Dark'],
    ['Complete: I wear a sweater when I feel …', 'Cold'], ['Complete: I rest when I feel …', 'Tired'], ['Complete: I smile when I feel …', 'Happy'],
    ['Complete: I use a key to open a …', 'Lock'], ['Complete: I wash my hands before I …', 'Eat'], ['Complete: I check a calendar to know the …', 'Date'], ['Complete: I call a friend on the …', 'Phone'],
  ],
  29: [
    ['What usually comes after waking up?', 'Freshen up'], ['What is a helpful step after brushing your teeth?', 'Wash your face'], ['What usually comes after getting dressed?', 'Eat breakfast'],
    ['What is helpful before a morning walk?', 'Wear comfortable shoes'], ['What should you check before taking a prescribed morning medicine?', 'The medicine label and reminder'],
    ['What usually follows breakfast?', 'Clear the dishes'], ['What can help start the day calmly?', 'Look at today’s routine'], ['What is sensible before leaving home?', 'Take keys and phone'],
    ['What can help after light morning exercise?', 'Drink some water'], ['What should you do when the morning routine is complete?', 'Mark it done'],
  ],
  30: [
    ['You washed your hands before lunch. What is next?', 'Eat lunch'], ['The kettle has boiled. What is a safe next step?', 'Turn it off carefully'], ['You finished using the bathroom. What should you do next?', 'Wash your hands'],
    ['You took your prescribed medicine. What should you do next in the app?', 'Mark it taken'], ['The floor is wet. What should you do next?', 'Move carefully and dry it'],
    ['You finished a walk and feel warm. What should you do next?', 'Rest and drink water'], ['Your appointment is today. What should you check next?', 'Time and location'],
    ['The doorbell rings. What should you do before opening?', 'Check who is there'], ['You have finished cooking. What should you do next?', 'Switch off the stove'], ['It is bedtime. What should you do with the front door?', 'Check that it is locked'],
  ],
  31: [
    ['Your walk is at 10:00. What is planned at 10:00?', 'Walk'], ['Breakfast is at 8:00. What is planned at 8:00?', 'Breakfast'], ['A phone call is at 11:30. What is planned at 11:30?', 'Phone call'],
    ['Lunch is at 13:00. What is planned at 13:00?', 'Lunch'], ['Rest time is at 14:30. What is planned at 14:30?', 'Rest'], ['Tea is at 16:00. What is planned at 16:00?', 'Tea'],
    ['Family time is at 17:30. What is planned at 17:30?', 'Family time'], ['The appointment is at 18:00. What is planned at 18:00?', 'Appointment'], ['Dinner is at 20:00. What is planned at 20:00?', 'Dinner'], ['Bedtime is at 22:00. What is planned at 22:00?', 'Bedtime'],
  ],
  32: [
    ['What is the first step before making tea?', 'Boil water'], ['What comes before brushing your teeth?', 'Put toothpaste on the brush'], ['What should happen before eating fruit?', 'Wash the fruit'],
    ['What comes before leaving for an appointment?', 'Check the time and address'], ['What should happen before watering a plant?', 'Check whether the soil is dry'], ['What comes before switching on a fan?', 'Make sure it is safe and plugged in'],
    ['What should happen before putting clothes away?', 'Fold the clothes'], ['What comes before serving soup?', 'Pour it carefully into a bowl'], ['What should happen before mailing a letter?', 'Put it in an addressed envelope'], ['What comes before going to bed?', 'Complete the bedtime routine'],
  ],
  33: [
    ['A person is smiling and laughing. How might they feel?', 'Happy'], ['A person has tears after losing something important. How might they feel?', 'Sad'], ['A person clenches their fists after an argument. How might they feel?', 'Angry'],
    ['A person hears a sudden loud noise and steps back. How might they feel?', 'Startled'], ['A person waits for test results and cannot relax. How might they feel?', 'Worried'], ['A person receives an unexpected gift. How might they feel?', 'Surprised'],
    ['A person finishes a difficult task successfully. How might they feel?', 'Proud'], ['A person yawns after a long day. How might they feel?', 'Tired'], ['A person sits quietly with slow breathing. How might they feel?', 'Calm'], ['A person meets a loved one after a long time. How might they feel?', 'Excited'],
  ],
  34: [
    ['Your body is relaxed and your breathing is slow. Which mood fits?', 'Peaceful'], ['Your thoughts keep returning to a problem. Which mood fits?', 'Concerned'], ['You have energy and want to begin the day. Which mood fits?', 'Cheerful'],
    ['You want quiet time after a busy visit. Which mood fits?', 'Overwhelmed'], ['You are waiting patiently without tension. Which mood fits?', 'Content'], ['You are unsure where an item was placed. Which mood fits?', 'Confused'],
    ['You feel thankful after receiving help. Which mood fits?', 'Grateful'], ['You miss someone close to you. Which mood fits?', 'Lonely'], ['You are curious about a new activity. Which mood fits?', 'Interested'], ['You feel safe beside someone you trust. Which mood fits?', 'Comforted'],
  ],
  35: [
    ['Which activity may help recall a warm family memory?', 'Looking at a family photo'], ['Which activity may help recall a celebration?', 'Listening to a familiar festival song'], ['Which activity may bring back a favorite recipe?', 'Smelling familiar spices'],
    ['Which activity may help remember childhood?', 'Talking about an old school'], ['Which activity may recall a journey?', 'Looking at travel photographs'], ['Which activity may bring back a loved one’s voice?', 'Listening to a saved recording'],
    ['Which activity may recall a family tradition?', 'Sharing the story with someone'], ['Which activity may help remember a garden?', 'Touching or smelling a familiar flower'], ['Which activity may recall an old friendship?', 'Reading a letter or card'], ['Which activity may help preserve a happy memory?', 'Writing a short note about it'],
  ],
  36: [
    ['Which pair belongs together? Think about crafts.', 'Bamboo & craft'], ['Which pair belongs together? Think about regional produce.', 'Tea leaves & Assam'], ['Which pair belongs together? Think about weaving.', 'Cane & basket'], ['Which pair belongs together? Think about textiles.', 'Silk & Sualkuchi'],
    ['Which pair belongs together? Think about festivals.', 'Hornbill & Nagaland'], ['Which pair belongs together? Think about lakes.', 'Loktak & Manipur'], ['Which pair belongs together? Think about dance.', 'Cheraw & Mizoram'], ['Which pair belongs together? Think about sacred places.', 'Monastery & Tawang'],
    ['Which pair belongs together? Think about natural architecture.', 'Living root bridge & Meghalaya'], ['Which pair belongs together? Think about music.', 'Bihu & dhol'],
  ],
  37: [
    ['Kaziranga National Park is especially known for which animal?', 'One-horned rhinoceros'], ['In which state is the hill town of Tawang?', 'Arunachal Pradesh'], ['Loktak Lake is located in which state?', 'Manipur'],
    ['Which city is known as the gateway to North-East India?', 'Guwahati'], ['The living root bridges are strongly associated with which state?', 'Meghalaya'], ['Majuli is a river island in which river?', 'Brahmaputra'],
    ['The Hornbill Festival is held near which Nagaland village?', 'Kisama'], ['Unakoti’s rock carvings are in which state?', 'Tripura'], ['Ziro Valley is in which state?', 'Arunachal Pradesh'], ['Khangchendzonga National Park is in which state?', 'Sikkim'],
  ],
  38: [
    ['Bihu is celebrated prominently in which state?', 'Assam'], ['Hornbill Festival is associated with which state?', 'Nagaland'], ['Wangala is a harvest festival of which community?', 'Garo'],
    ['Chapchar Kut is celebrated in which state?', 'Mizoram'], ['Kharchi Puja is associated with which state?', 'Tripura'], ['Sangai Festival is celebrated in which state?', 'Manipur'],
    ['Losar is celebrated by many Himalayan Buddhist communities as what?', 'New Year'], ['Ambubachi Mela is held at which temple?', 'Kamakhya Temple'], ['Solung is an important festival of which state?', 'Arunachal Pradesh'], ['Nongkrem Dance festival is associated with which state?', 'Meghalaya'],
  ],
  39: [
    ['A gamosa is best recognized as what kind of item?', 'Woven cloth'], ['A jaapi from Assam is traditionally what?', 'Conical hat'], ['A bamboo tokri is used as what?', 'Basket'],
    ['Muga is a famous type of what?', 'Silk'], ['A Naga shawl is recognized as what?', 'Woven garment'], ['A pepa used in Bihu music is what?', 'Horn instrument'],
    ['A Khasi knup is traditionally used as what?', 'Rain shield'], ['A Tripuri risa is what kind of item?', 'Traditional cloth'], ['Manipuri kauna is commonly woven into what?', 'Mats and baskets'], ['Cane work from the North-East commonly makes what?', 'Furniture and baskets'],
  ],
  40: [
    ['Which sound would most likely come from a dhol?', 'A deep drumbeat'], ['Which sound would most likely come from a pepa?', 'A bright horn call'], ['Which sound would most likely come from a flute?', 'A soft airy melody'],
    ['Which sound would most likely come from cymbals?', 'A metallic clash'], ['Which sound would most likely come from a gong?', 'A long resonant ring'], ['Which sound would most likely come from rain on a tin roof?', 'A steady patter'],
    ['Which sound would most likely come from a fast river?', 'Rushing water'], ['Which sound would most likely come from bamboo in the wind?', 'A gentle rustle'], ['Which sound would most likely come from a busy village market?', 'Many voices together'], ['Which sound would most likely come from evening crickets?', 'Rhythmic chirping'],
  ],
};

function buildLevels(id: number): GameLevel[] {
  const bank = LEVEL_BANKS[id];
  if (!bank || bank.length !== 10) throw new Error(`Game ${id} must contain exactly 10 levels.`);
  return bank.map(([prompt, answer], index) => {
    const answerPool = Array.from(new Set(bank.map((entry) => entry[1])));
    const distractors = answerPool.filter((value) => value !== answer);
    const options = [answer, ...Array.from({ length: 3 }, (_, offset) => distractors[(index + offset) % distractors.length])];
    return { level: index + 1, prompt, answer, options: Array.from(new Set(options)).slice(0, 4) };
  });
}

export const GAME_LIBRARY: GameDefinition[] = GAME_META.map(([id, name, category, icon, instruction]) => ({
  id, name, category, icon, instruction, levels: buildLevels(id),
}));

function shuffled<T>(values: T[]): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
  }
  return next;
}

export function getPlayableGame(game: GameDefinition, level: number, replay = false): PlayableGame {
  const safeLevel = Math.max(1, Math.min(10, level));
  const content = game.levels[safeLevel - 1];
  const distractorPool = Array.from(new Set(game.levels.map((item) => item.answer))).filter((answer) => answer !== content.answer);
  const options = shuffled([content.answer, ...shuffled(distractorPool).slice(0, 3)]);
  return { ...game, ...content, options, replay };
}

export const CATEGORY_INSTRUCTIONS: Partial<Record<Language, Record<Category, string>>> = {
  en: { Memory: 'Remember carefully, then choose.', Attention: 'Look closely and choose the target.', Pattern: 'Find the rule and complete it.', Recognition: 'Identify the familiar object or place.', Language: 'Choose the word that fits.', Routine: 'Choose the most helpful next step.', Emotion: 'Choose the feeling that fits.', Cultural: 'Choose the familiar North-Eastern connection.' },
  hi: { Memory: 'ध्यान से याद करें, फिर उत्तर चुनें।', Attention: 'ध्यान से देखें और सही लक्ष्य चुनें।', Pattern: 'नियम पहचानकर क्रम पूरा करें।', Recognition: 'जानी-पहचानी वस्तु या जगह पहचानें।', Language: 'सही शब्द चुनें।', Routine: 'सबसे उपयोगी अगला कदम चुनें।', Emotion: 'सही भावना चुनें।', Cultural: 'उत्तर-पूर्व से जुड़ा सही विकल्प चुनें।' },
  as: { Memory: 'মনোযোগেৰে মনত ৰাখি উত্তৰ বাছক।', Attention: 'ভালদৰে চাই সঠিক লক্ষ্য বাছক।', Pattern: 'নিয়মটো চিনাক্ত কৰি ক্ৰম সম্পূৰ্ণ কৰক।', Recognition: 'চিনাকি বস্তু বা ঠাই চিনাক্ত কৰক।', Language: 'খাপ খোৱা শব্দটো বাছক।', Routine: 'পৰৱৰ্তী উপযোগী কামটো বাছক।', Emotion: 'খাপ খোৱা অনুভৱটো বাছক।', Cultural: 'উত্তৰ-পূবৰ সৈতে জড়িত সঠিক বিকল্প বাছক।' },
};

export function difficultyFor(category: Category, results: GameResult[]): Difficulty {
  const recent = results.filter((result) => result.category === category).slice(-5);
  if (recent.length < 2) return 'Easy';
  const average = recent.reduce((sum, result) => sum + result.accuracy, 0) / recent.length;
  if (average >= 85) return 'Hard';
  if (average <= 55) return 'Easy';
  return 'Medium';
}

export function createBalancedSession(minutes: number): GameDefinition[] {
  const gameCount = Math.max(2, Math.min(16, Math.ceil(minutes / 2.5)));
  const pools = CATEGORIES.map((category) => shuffled(GAME_LIBRARY.filter((game) => game.category === category)));
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
