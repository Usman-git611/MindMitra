import type { Language } from './types';

export type TranslationDictionary = Record<string, string>;
export type TranslationValues = Record<string, string | number>;

const cache = new Map<Language, TranslationDictionary>([['en', {}]]);

export async function loadLanguagePack(language: Language): Promise<TranslationDictionary> {
  const cached = cache.get(language);
  if (cached) return cached;
  const response = await fetch(`/locales/${language}.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Language pack ${language} could not be loaded.`);
  const pack = await response.json() as TranslationDictionary;
  cache.set(language, pack);
  return pack;
}

export function translateText(dictionary: TranslationDictionary, source: string, values: TranslationValues = {}): string {
  const translated = dictionary[source] || source;
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), translated);
}

// Every reusable system phrase lives here so language-pack coverage can be
// verified without coupling the game engine to a particular language.
export const UI_STRINGS = [
  'Home', 'Games', 'Family', 'Progress', 'Settings', 'Mitra', 'Back', 'Save', 'Cancel', 'Start', 'Done', 'Next', 'All games',
  'Main navigation', 'Mobile navigation', 'MindMitra reminder',
  'Recommended for you', 'Online · saved', 'Offline · saved here', 'Saving…', 'Everything saved', 'Saved on this phone', 'Talk to Mitra', 'SOS',
  'Choose language', 'Language', 'Dismiss', 'Level {level} of 10', '{current} of {total}', '{count}/10 levels', '{count} of 10 completed',
  'Completed {count} time', 'Completed {count} times', 'Play', 'Continue', 'Replay', 'Save & Exit', 'Finish', 'Try again', 'Check my answer',
  'Correct', 'Incorrect', 'Well done — level complete!', 'Good try — practice helps.', 'The correct answer is {answer}.',
  'Press Next when you are ready.', 'You completed all 10 levels!', 'Your next level is ready.', 'A fresh replay is ready.',
  'Game center', 'Choose a gentle activity', 'Every game has 10 meaningful levels. Your exact place is saved automatically.',
  'Start a balanced session', 'Find a game', 'Good choices for today', 'Explore every activity', '{count} games · 400 levels',
  'Continue Level {level}', 'Play Level {level}', 'Replay with a fresh shuffle', 'Exit', 'Exit game', 'Continue session',
  'Your progress is saved on this device and synced with your account when signed in.', 'All levels complete!', 'Ready to resume Level {level}', 'Level {level} is ready',
  'Memory', 'Attention', 'Pattern', 'Recognition', 'Language', 'Routine', 'Emotion', 'Cultural', 'Easy', 'Medium', 'Hard', 'All',
  'Today', 'Good morning', 'activities', 'reminder', 'Play Games', 'Gentle activities for your mind', 'Start Session',
  '{minutes} minutes · balanced practice', 'My Routine', 'Medicines', 'Hydration', 'Appointments', 'My Family', 'My Progress',
  '{count} people in your memories', '{count} completed games', 'Coming up', 'Next reminder', 'Nothing pending', 'View today',
  'Everything in one place', 'How can we help today?', 'Caregiver view', 'Recommended', 'Start a gentle session',
  'You have {activities} activities and {reminders} reminders today.', 'Your routine is complete', 'All done for today',
  'A little practice goes a long way', 'There is no perfect score here. Take your time, enjoy the activity, and pause whenever you need.',
  'Balanced practice', 'Choose session duration', 'minutes', '{count} gentle games', 'Custom', 'Start custom session', 'Fair and balanced',
  'The session rotates through all eight cognitive activity categories. Your difficulty level is adapted per category, never treated as a medical measurement.',
  'Personal memories', 'Add people who matter to you. Photos stay private and are used only to create your personal memory activities.',
  'Play family game', 'Your circle', '{count} family members', 'Add your first family memory', 'A name, relationship, and optional photo are enough to begin.',
  'Add someone', 'Create a family profile', 'Full name', 'Relationship', 'Choose', 'Nickname (optional)', 'Photo (optional)',
  'e.g. Raj Das', 'e.g. Raju',
  'Take a photo or choose one from your phone. Maximum 5 MB.', 'Add to My Family', 'Who Is This?', 'Match Name to Face', 'Remember the Family',
  'Recognize a person and recall their relationship.', 'Match a saved family photo with the right name.', 'Recall names, nicknames, and relationships.',
  'Which name is saved as your {relationship}?', 'Who in your saved circle is your {relationship}?', 'Choose the saved name for your {relationship}.',
  'Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Caregiver', 'Friend', 'Other', 'Cousin', 'Neighbour', 'Aunt', 'Uncle',
  'Daily support', 'Medicine reminders', 'Record reminders only for medicines already prescribed to you. MindMitra does not recommend medication.',
  'Upcoming appointments', 'Keep doctor visits, times, locations, and notes together.', 'Your medicines', 'Nothing added yet',
  'Use the form to create your first reminder.', 'New medicine', 'New appointment', 'Add a reminder', 'Medicine name', 'Doctor name',
  'Date', 'Time', 'Dosage description', 'Frequency', 'Start date', 'End date', 'Location', 'Notes', 'Save reminder',
  'e.g. 1 tablet', 'Appointment',
  'A gentle nudge to drink water during your waking hours.', 'of {target} glasses', 'Target reached — well done!', 'It is time to drink some water.',
  'I drank a glass', 'Remind me later', 'Your plan', 'Hydration settings', 'Reminder interval', 'Wake time', 'Sleep time', 'Daily target', 'Save plan',
  'Today’s timeline', 'A clear, reassuring plan for the day. Tap an activity when it is complete.', 'Your day is open',
  'Add the first activity using the form.', 'New activity', 'Add to today', 'Activity', 'Add activity',
  'e.g. Morning walk',
  'Cognitive activity', 'Your Progress', 'These scores show game practice only. They are not medical measurements or a diagnosis.',
  'Games today', 'This week', 'Average accuracy', 'Sessions', 'By activity category', 'Game performance', 'Recent activity', 'New',
  'Your progress starts with one game', 'Complete a gentle activity and your result will appear here.',
  'Your voice companion', 'Speak or type naturally. Mitra remembers the recent conversation and responds in {language}.',
  'You', 'Hear this', 'Type a message or request…', 'Speak to Mitra', 'Send', 'Start a game', 'Start a 15 minute session',
  'Remind me to drink water', 'When is my medicine?', 'What should I do next?', 'Open my family',
  'Mitra keeps recent conversation context in your saved MindMitra data. Its built-in companion features do not send the conversation to an external AI service.',
  'Make MindMitra yours', 'Settings & Profile', 'Changes apply immediately and are saved for this account.', 'Text size',
  'Choose the most comfortable reading size.', 'Normal', 'Large', 'Extra large', 'High contrast', 'Stronger colors and borders.',
  'Voice responses', 'Let Mitra read helpful responses aloud.', 'Sound effects', 'Play gentle success feedback.', 'Reduced motion',
  'Turn off movement and transitions.', 'Mitra language', 'Mitra’s text, games, and voice use your selected language.', 'Notifications',
  'Allow medicine, hydration, appointment, and routine alerts.', 'Enable', 'Profile', 'Emergency contact', 'Caregiver connection code',
  'Share only with a caregiver you trust.', 'Edit profile', 'Log out', 'Delete my account and data', 'Important medical disclaimer',
  'MindMitra is designed for cognitive engagement, memory assistance, and daily activity support. It is not a medical diagnostic or treatment device. Game performance should not be interpreted as a diagnosis of dementia or any other medical condition. Please consult a qualified healthcare professional for medical concerns.',
  'Preparing MindMitra…', 'Private · elderly-friendly setup', 'Let’s set up your support', 'Edit your MindMitra profile', 'Create your MindMitra profile',
  'Large, simple fields. You can change these details later.', 'Personal information', 'Date of birth', 'Gender (optional)', 'Personal phone',
  'Email (optional)', 'Preferred MindMitra language', 'Profile type', 'Elderly user', 'SOS emergency contact',
  'This number will be used as your emergency contact and must be different from your personal phone.', 'Contact name', 'Emergency phone',
  'Choose relationship', 'I understand that MindMitra supports cognitive engagement and daily activity. It is not a medical diagnostic or treatment device.',
  'Save profile', 'Create profile', 'Welcome to MindMitra!', 'What is your full name?', 'Nice to meet you, {name}!', 'Go to my home', 'Speak',
  'Authorized family support', 'Caregiver Dashboard', 'Connect with an elderly user', 'Connect', 'Connected account', 'Authorized',
  'Games completed', 'Session minutes', 'Reminders completed', 'Reminders missed', 'Session complete', 'You did it, {name}!',
  'Thank you for taking this gentle time for yourself.', 'Planned time', 'Accuracy', 'Play another session', 'Return home',
  'Please choose a photo smaller than 5 MB.', 'Add at least one family member first.', 'Your answer and place have been saved.',
  'Voice input isn’t available. You can type instead.', 'I couldn’t hear that. Please try again or type instead.',
  'I’m sorry, this language pack could not load. English is shown while your progress remains safe.',
  '{count} coming up', '{count} pending today', '{current} of {target} glasses', 'Next: {activity}', 'levels', 'min',
  'A calmer day, one small step at a time', 'Welcome to MindMitra',
  'A simple way to keep your mind active, remember your daily routine, and stay connected.', 'Continue as {name}', 'Sign in securely',
  'Create on this device', 'Try demo account', 'I’m a caregiver', 'Cognitive engagement and daily support — never a medical diagnosis.',
  'A gentle illustration representing care, memory, and daily wellbeing', 'Good morning, Maya', 'You have 2 gentle activities today.',
  'Mind active', 'Routine ready', 'Gentle brain games', '40 short activities that adapt to you.', 'Friendly reminders for routines, water, and medicine.',
  'Family connection', 'Meaningful games made from your own memories.', 'A personal welcome', 'Your full name', 'Your phone number',
  'Prefer not to say', 'Female', 'Male', 'Non-binary', 'Speak your name', 'Remove', 'Close', 'Call emergency contact',
  'MindMitra does not provide emergency services. For immediate danger or a medical emergency, contact your local emergency service.',
  'Add favorite', 'Remove favorite', 'Add to My Games', 'Remove from My Games', 'Daily', 'Twice daily', 'Weekly', 'As prescribed',
  'Taken', 'Later', 'Missed', 'Reset', 'Every hour', 'Every 90 minutes', 'Every 2 hours', 'Every 3 hours',
  'We’ll remind you again in 20 minutes.', 'Hydration plan saved.', 'Message Mitra', 'These are game-practice scores, not medical measurements.',
  'Ask the person to share the connection code shown in their Settings. Connection requires their explicit authorization.',
  'Caregiver access connected.', 'That code does not match this profile.', 'Enter connection code', 'Add medicine reminder',
  'Record prescribed medicine times', 'Manage routine', 'Add or complete daily activities', 'Add family memory', 'Upload a private familiar photo',
  'View game performance', 'See activity trends by category',
  'View cognitive activity and help manage reminders, routines, and family memories. This is not a diagnostic dashboard.',
  'We’ll distribute games evenly across memory, attention, reasoning, recognition, language, routine, emotion, and cultural categories.',
  'You’re offline. Your progress is saved and will sync later.', 'Demo account opened. Changes stay separate on this device.',
  'Personal and emergency phone numbers must be different.', 'The photo is safely stored on this device and will be uploaded later.',
  '{name} was added to My Family.', 'Reminder saved.', 'Notifications are unavailable. You can still view reminders inside the app.',
  'Notifications enabled.', 'Notifications are disabled. You can still view reminders inside the app.',
  'Delete your profile, family records, reminders, and game history from this device and synced account?',
  'not currently scheduled', 'complete for today', '{count} sec',
  'Blood pressure medicine', '1 tablet', 'Drink a glass of water', 'City Clinic',
  'Wake up and freshen up', 'Breakfast', 'Morning walk', 'Lunch', 'Family time',
] as const;
