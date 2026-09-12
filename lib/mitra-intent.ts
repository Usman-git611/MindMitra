import { MITRA_CAPABILITIES, MITRA_GAME_CATEGORIES, capabilityById, type MitraCapabilityDefinition, type MitraCapabilityId, type MitraConcept, type MitraParameterName, type MitraParameterType } from './mitra-capabilities';
import type { Category, Language } from './types';

export type SupportedMitraLanguage = Extract<Language, 'en' | 'hi' | 'bn' | 'as'>;
export type MitraParameterValue = string | number | boolean;
export type MitraParameters = Record<string, MitraParameterValue>;
export type MitraResolutionState = 'ready' | 'needs-parameter' | 'needs-confirmation' | 'cancelled' | 'ambiguous';

export interface MitraUnderstandingContext {
  lastIntent?: string;
  lastCapability?: string;
  pendingCapability?: string;
  missingParameters?: string[];
  collectedParameters?: MitraParameters;
  awaitingConfirmation?: boolean;
  lastCategory?: Category;
  currentScreen?: string;
  currentUser?: string;
  currentLanguage?: Language;
  currentGameName?: string;
  currentSessionMinutes?: number;
  knownRoutineActivities?: string[];
  knownFamilyNames?: string[];
}

export interface MitraUnderstanding {
  intent: string;
  capabilityId?: MitraCapabilityId;
  capability?: MitraCapabilityDefinition;
  parameters: MitraParameters;
  confidence: number;
  state: MitraResolutionState;
  promptKey?: MitraMessageKey;
  missingParameters: MitraParameterName[];
  category?: Category;
}

export type MitraMessageKey =
  | 'greeting' | 'askDuration' | 'askTime' | 'askDate' | 'askTitle' | 'askActivity' | 'askMemberName' | 'askRelationship' | 'askTarget' | 'askInterval' | 'askReminderKind' | 'askLanguage' | 'askTextSize' | 'askStatus'
  | 'confirmAction' | 'cancelled' | 'actionFailed' | 'notFound'
  | 'sessionStarted' | 'sessionPaused' | 'sessionResumed' | 'sessionFinished' | 'noSession'
  | 'gamesOpened' | 'gameStarted' | 'gameResumed' | 'gameSuggested' | 'favoritesOpened'
  | 'familyOpened' | 'familyGameStarted' | 'familyAdded' | 'familyRemoved' | 'noFamily'
  | 'waterReminder' | 'hydrationProgress' | 'hydrationRecorded' | 'hydrationPlanUpdated'
  | 'medicineNext' | 'medicineNone' | 'medicineCreated' | 'appointmentNext' | 'appointmentNone' | 'appointmentCreated'
  | 'routineNext' | 'routineNone' | 'routineCreated' | 'routineModified' | 'routineCompleted'
  | 'reminderCreated' | 'reminderStatusUpdated' | 'progress' | 'languageChanged' | 'settingChanged' | 'screenOpened'
  | 'gameInstructions' | 'noGame' | 'favoriteAdded' | 'favoriteRemoved' | 'myGamesAdded' | 'myGamesRemoved' | 'myGamesOpened' | 'sos' | 'repeat' | 'stopped'
  | 'wellbeing' | 'help' | 'unknown' | 'voiceUnavailable' | 'microphoneDenied' | 'medicalBoundary' | 'offlineUnavailable';

type MessageTable = Record<MitraMessageKey, string>;

const MESSAGES: Record<SupportedMitraLanguage, MessageTable> = {
  en: {
    greeting: 'Hello {name}, what can I do for you?', askDuration: 'How many minutes would you like?', askTime: 'What time should I use?', askDate: 'What date should I use?', askTitle: 'What should I call it?', askActivity: 'Which activity do you mean?', askMemberName: 'What is the family member’s name?', askRelationship: 'What is their relationship to you?', askTarget: 'What daily glass target would you like?', askInterval: 'How many minutes between water reminders?', askReminderKind: 'What kind of reminder is this: medicine, water, appointment, routine, or session?', askLanguage: 'Which language would you like: English, Hindi, Bengali, or Assamese?', askTextSize: 'Would you like normal, large, or extra-large text?', askStatus: 'Should I mark it taken, missed, or later?',
    confirmAction: 'Please confirm: should I {action}?', cancelled: 'Okay, I cancelled that action.', actionFailed: 'I couldn’t complete that action. Your existing data has not been changed.', notFound: 'I couldn’t find a matching saved item.',
    sessionStarted: 'Starting your {minutes}-minute session now.', sessionPaused: 'Your session is paused. Ask me to resume whenever you are ready.', sessionResumed: 'Resuming your session now.', sessionFinished: 'Your session is finished. Well done for taking this time for yourself.', noSession: 'There is no active session right now.',
    gamesOpened: 'I opened {category} games for you.', gameStarted: 'Starting {game} now.', gameResumed: 'Resuming {game} from your saved level.', gameSuggested: 'Let’s do something enjoyable. Would you like me to start an easy memory game?', favoritesOpened: 'I opened Games and placed your saved favorites first.',
    familyOpened: 'I opened My Family. You have {count} saved family members.', familyGameStarted: 'Starting a family-memory activity now.', familyAdded: 'I added {name} to My Family.', familyRemoved: 'I removed {name} from My Family.', noFamily: 'Add at least one family member before starting a family-memory activity.',
    waterReminder: 'I added a water reminder for {time}.', hydrationProgress: 'You have had {current} of your {target} glasses of water today.', hydrationRecorded: 'I recorded one glass. You have had {current} of {target} glasses today.', hydrationPlanUpdated: 'Your hydration plan has been updated.',
    medicineNext: 'Your next medicine reminder is {detail}.', medicineNone: 'You do not have any pending medicine reminders.', medicineCreated: 'I added the prescribed-medicine reminder “{title}” for {time}.', appointmentNext: 'Your next appointment is {detail}.', appointmentNone: 'You do not have any appointments saved yet.', appointmentCreated: 'I added “{title}” on {date} at {time}.',
    routineNext: 'Your next activity is {detail}.', routineNone: 'Your routine is complete for today.', routineCreated: 'I added “{activity}” to your routine at {time}.', routineModified: 'I moved “{activity}” to {time}.', routineCompleted: 'I marked “{activity}” complete.', reminderCreated: 'I added “{title}” for {time}.', reminderStatusUpdated: 'I marked “{title}” as {status}.',
    progress: 'You completed {count} games with {accuracy}% average accuracy. These are practice scores, not medical measurements.', languageChanged: 'I will speak with you in English now.', settingChanged: '{setting} has been {value}.', screenOpened: 'I opened {screen}.',
    gameInstructions: 'Here is what to do: {instruction}', noGame: 'There is no game open or saved right now.', favoriteAdded: 'I added this game to your favorites.', favoriteRemoved: 'I removed this game from your favorites.', myGamesAdded: 'I added this game to My Games.', myGamesRemoved: 'I removed this game from My Games.', myGamesOpened: 'I opened Games. Your My Games selections are marked on their cards.', sos: 'I opened the emergency assistance option. Tap Call only if you want to contact {contact}.', repeat: '{reply}', stopped: 'Voice playback has stopped.',
    wellbeing: 'I’m here with you. We can take a calm pause or do one gentle activity together. Would you like an easy memory game?', help: 'I can use {count} registered local capabilities for games, sessions, routines, reminders, medicines, water, appointments, family, progress, settings, accessibility, profile and SOS.', unknown: 'I’m not sure what you mean. Please say what you want to open, read, add, change or start.', voiceUnavailable: 'Voice input is not available right now. You can type your request instead.', microphoneDenied: 'Microphone permission is off. Enable it in your phone’s Settings for MindMitra, or type your request instead.', medicalBoundary: 'I can show reminders already saved in MindMitra, but I cannot diagnose, prescribe, or change medicine. Please contact a qualified healthcare professional for medical advice.', offlineUnavailable: 'That action needs an online service, but you are offline. Your local MindMitra features are still available.',
  },
  hi: {
    greeting: 'नमस्ते {name}, मैं आपके लिए क्या कर सकती हूँ?', askDuration: 'आप कितने मिनट का सत्र चाहते हैं?', askTime: 'कृपया समय बताइए।', askDate: 'कृपया तारीख बताइए।', askTitle: 'इसे किस नाम से सहेजूँ?', askActivity: 'आप किस गतिविधि की बात कर रहे हैं?', askMemberName: 'परिवार के सदस्य का नाम क्या है?', askRelationship: 'उनका आपसे क्या संबंध है?', askTarget: 'आप रोज़ कितने गिलास पानी का लक्ष्य चाहते हैं?', askInterval: 'पानी के रिमाइंडर के बीच कितने मिनट हों?', askReminderKind: 'यह किस प्रकार का रिमाइंडर है: दवा, पानी, अपॉइंटमेंट, दिनचर्या या सत्र?', askLanguage: 'आप कौन-सी भाषा चाहेंगे: अंग्रेज़ी, हिन्दी, बंगाली या असमिया?', askTextSize: 'आप सामान्य, बड़ा या बहुत बड़ा टेक्स्ट चाहेंगे?', askStatus: 'इसे लिया हुआ, छूटा हुआ या बाद के लिए चिह्नित करूँ?',
    confirmAction: 'कृपया पुष्टि करें: क्या मैं {action}?', cancelled: 'ठीक है, मैंने वह कार्रवाई रद्द कर दी।', actionFailed: 'मैं वह कार्रवाई पूरी नहीं कर पाई। आपका मौजूदा डेटा नहीं बदला गया है।', notFound: 'मुझे उससे मेल खाने वाला सहेजा हुआ आइटम नहीं मिला।',
    sessionStarted: 'आपका {minutes} मिनट का सत्र अभी शुरू कर रही हूँ।', sessionPaused: 'आपका सत्र रोक दिया गया है। तैयार होने पर मुझसे जारी रखने को कहें।', sessionResumed: 'आपका सत्र फिर से शुरू कर रही हूँ।', sessionFinished: 'आपका सत्र पूरा हुआ। अपने लिए समय निकालने के लिए बहुत अच्छा किया।', noSession: 'अभी कोई सत्र चल नहीं रहा है।',
    gamesOpened: 'मैंने आपके लिए {category} खेल खोल दिए हैं।', gameStarted: 'अब {game} शुरू कर रही हूँ।', gameResumed: 'आपका सहेजा हुआ {game} फिर से शुरू कर रही हूँ।', gameSuggested: 'चलिए कुछ अच्छा करते हैं। क्या मैं एक आसान स्मृति खेल शुरू करूँ?', favoritesOpened: 'मैंने खेल खोलकर आपके पसंदीदा खेल पहले रखे हैं।',
    familyOpened: 'मैंने मेरा परिवार खोल दिया है। आपके {count} परिवार सदस्य सहेजे हैं।', familyGameStarted: 'अब परिवार-स्मृति गतिविधि शुरू कर रही हूँ।', familyAdded: 'मैंने {name} को मेरा परिवार में जोड़ दिया है।', familyRemoved: 'मैंने {name} को मेरा परिवार से हटा दिया है।', noFamily: 'परिवार-स्मृति गतिविधि शुरू करने से पहले कम से कम एक परिवार सदस्य जोड़ें।',
    waterReminder: 'मैंने {time} बजे पानी पीने का रिमाइंडर जोड़ दिया है।', hydrationProgress: 'आज आपने {target} में से {current} गिलास पानी पिया है।', hydrationRecorded: 'मैंने एक गिलास दर्ज किया। आज आपने {target} में से {current} गिलास पानी पिया है।', hydrationPlanUpdated: 'आपकी पानी की योजना अपडेट कर दी गई है।',
    medicineNext: 'आपका अगला दवा रिमाइंडर {detail} है।', medicineNone: 'आपका कोई दवा रिमाइंडर बाकी नहीं है।', medicineCreated: 'मैंने निर्धारित दवा “{title}” का रिमाइंडर {time} बजे जोड़ दिया है।', appointmentNext: 'आपकी अगली अपॉइंटमेंट {detail} है।', appointmentNone: 'अभी आपकी कोई अपॉइंटमेंट सहेजी नहीं गई है।', appointmentCreated: 'मैंने “{title}” को {date}, {time} बजे जोड़ दिया है।',
    routineNext: 'आपकी अगली गतिविधि {detail} है।', routineNone: 'आज की आपकी दिनचर्या पूरी हो गई है।', routineCreated: 'मैंने “{activity}” को {time} बजे दिनचर्या में जोड़ दिया है।', routineModified: 'मैंने “{activity}” का समय {time} कर दिया है।', routineCompleted: 'मैंने “{activity}” को पूरा चिह्नित कर दिया है।', reminderCreated: 'मैंने “{title}” का रिमाइंडर {time} बजे जोड़ दिया है।', reminderStatusUpdated: 'मैंने “{title}” को {status} चिह्नित किया है।',
    progress: 'आपने {count} खेल पूरे किए हैं और औसत सटीकता {accuracy}% है। ये अभ्यास अंक हैं, चिकित्सीय माप नहीं।', languageChanged: 'अब मैं आपसे हिन्दी में बात करूँगी।', settingChanged: '{setting} को {value} कर दिया गया है।', screenOpened: 'मैंने {screen} खोल दिया है।',
    gameInstructions: 'आपको यह करना है: {instruction}', noGame: 'अभी कोई खेल खुला या सहेजा नहीं है।', favoriteAdded: 'मैंने इस खेल को पसंदीदा में जोड़ दिया है।', favoriteRemoved: 'मैंने इस खेल को पसंदीदा से हटा दिया है।', myGamesAdded: 'मैंने इस खेल को मेरे खेल में जोड़ दिया है।', myGamesRemoved: 'मैंने इस खेल को मेरे खेल से हटा दिया है।', myGamesOpened: 'मैंने खेल खोल दिए हैं। मेरे खेल में चुने गए खेल कार्ड पर चिह्नित हैं।', sos: 'मैंने आपात सहायता विकल्प खोल दिया है। {contact} को संपर्क करने के लिए केवल अपनी इच्छा से कॉल दबाएँ।', repeat: '{reply}', stopped: 'आवाज़ बंद कर दी गई है।',
    wellbeing: 'मैं आपके साथ हूँ। हम थोड़ा शांत विश्राम कर सकते हैं या एक सरल गतिविधि कर सकते हैं। क्या आप आसान स्मृति खेल चाहेंगे?', help: 'मैं {count} स्थानीय क्षमताओं से खेल, सत्र, दिनचर्या, रिमाइंडर, दवा, पानी, अपॉइंटमेंट, परिवार, प्रगति, सेटिंग, प्रोफ़ाइल और SOS संभाल सकती हूँ।', unknown: 'मैं आपकी बात समझ नहीं पाई। कृपया बताइए कि आप क्या खोलना, देखना, जोड़ना, बदलना या शुरू करना चाहते हैं।', voiceUnavailable: 'अभी आवाज़ से इनपुट उपलब्ध नहीं है। आप अपना अनुरोध लिख सकते हैं।', microphoneDenied: 'माइक्रोफ़ोन की अनुमति बंद है। फ़ोन की सेटिंग में MindMitra के लिए इसे चालू करें या अपना अनुरोध लिखें।', medicalBoundary: 'मैं MindMitra में सहेजे रिमाइंडर दिखा सकती हूँ, लेकिन निदान, दवा लिखना या दवा बदलना नहीं कर सकती। चिकित्सीय सलाह के लिए योग्य डॉक्टर से संपर्क करें।', offlineUnavailable: 'इस कार्रवाई के लिए ऑनलाइन सेवा चाहिए, लेकिन आप ऑफ़लाइन हैं। स्थानीय MindMitra सुविधाएँ उपलब्ध हैं।',
  },
  bn: {
    greeting: 'হ্যালো {name}, আমি আপনার জন্য কী করতে পারি?', askDuration: 'আপনি কত মিনিটের সেশন চান?', askTime: 'কোন সময় ব্যবহার করব?', askDate: 'কোন তারিখ ব্যবহার করব?', askTitle: 'এটির নাম কী রাখব?', askActivity: 'আপনি কোন কাজটির কথা বলছেন?', askMemberName: 'পরিবারের সদস্যের নাম কী?', askRelationship: 'আপনার সঙ্গে তাঁর সম্পর্ক কী?', askTarget: 'প্রতিদিন কত গ্লাস জলের লক্ষ্য চান?', askInterval: 'জলের রিমাইন্ডারের মাঝে কত মিনিট থাকবে?', askReminderKind: 'এটি কোন রিমাইন্ডার: ওষুধ, জল, অ্যাপয়েন্টমেন্ট, রুটিন না সেশন?', askLanguage: 'কোন ভাষা চান: ইংরেজি, হিন্দি, বাংলা না অসমীয়া?', askTextSize: 'সাধারণ, বড় না খুব বড় লেখা চান?', askStatus: 'এটি নেওয়া হয়েছে, মিস হয়েছে না পরে—কোনটি চিহ্নিত করব?',
    confirmAction: 'অনুগ্রহ করে নিশ্চিত করুন: আমি কি {action}?', cancelled: 'ঠিক আছে, কাজটি বাতিল করেছি।', actionFailed: 'কাজটি শেষ করতে পারিনি। আপনার বর্তমান তথ্য বদলানো হয়নি।', notFound: 'মিল আছে এমন কোনো সংরক্ষিত তথ্য পাইনি।',
    sessionStarted: 'আপনার {minutes} মিনিটের সেশন এখন শুরু করছি।', sessionPaused: 'আপনার সেশন বিরতিতে আছে। প্রস্তুত হলে আমাকে আবার শুরু করতে বলুন।', sessionResumed: 'আপনার সেশন আবার শুরু করছি।', sessionFinished: 'আপনার সেশন শেষ হয়েছে। নিজের জন্য সময় দেওয়ার জন্য খুব ভালো করেছেন।', noSession: 'এই মুহূর্তে কোনো সেশন চলছে না।',
    gamesOpened: 'আমি আপনার জন্য {category} গেম খুলেছি।', gameStarted: 'এখন {game} শুরু করছি।', gameResumed: 'সংরক্ষিত {game} আবার শুরু করছি।', gameSuggested: 'চলুন আনন্দের কিছু করি। আমি কি একটি সহজ স্মৃতির খেলা শুরু করব?', favoritesOpened: 'গেমস খুলে আপনার পছন্দের গেমগুলি আগে রেখেছি।',
    familyOpened: 'আমি আমার পরিবার খুলেছি। আপনার {count} জন পরিবারের সদস্য সংরক্ষিত আছেন।', familyGameStarted: 'এখন একটি পারিবারিক স্মৃতির কার্যকলাপ শুরু করছি।', familyAdded: 'আমি {name}-কে আমার পরিবারে যোগ করেছি।', familyRemoved: 'আমি {name}-কে আমার পরিবার থেকে সরিয়েছি।', noFamily: 'পারিবারিক স্মৃতির কার্যকলাপ শুরু করার আগে অন্তত একজন সদস্য যোগ করুন।',
    waterReminder: 'আমি {time}-এ জল খাওয়ার রিমাইন্ডার যোগ করেছি।', hydrationProgress: 'আজ আপনি {target} গ্লাসের মধ্যে {current} গ্লাস জল খেয়েছেন।', hydrationRecorded: 'এক গ্লাস নথিভুক্ত করেছি। আজ {target} গ্লাসের মধ্যে {current} গ্লাস হয়েছে।', hydrationPlanUpdated: 'আপনার জলের পরিকল্পনা আপডেট হয়েছে।',
    medicineNext: 'আপনার পরবর্তী ওষুধের রিমাইন্ডার {detail}।', medicineNone: 'আপনার কোনো ওষুধের রিমাইন্ডার বাকি নেই।', medicineCreated: 'নির্ধারিত ওষুধ “{title}”-এর রিমাইন্ডার {time}-এ যোগ করেছি।', appointmentNext: 'আপনার পরবর্তী অ্যাপয়েন্টমেন্ট {detail}।', appointmentNone: 'এখনও কোনো অ্যাপয়েন্টমেন্ট সংরক্ষিত নেই।', appointmentCreated: 'আমি “{title}” {date} তারিখে {time}-এ যোগ করেছি।',
    routineNext: 'আপনার পরবর্তী কাজ {detail}।', routineNone: 'আজকের রুটিন সম্পূর্ণ হয়েছে।', routineCreated: 'আমি “{activity}” {time}-এ রুটিনে যোগ করেছি।', routineModified: 'আমি “{activity}”-এর সময় {time} করেছি।', routineCompleted: 'আমি “{activity}” সম্পূর্ণ হিসেবে চিহ্নিত করেছি।', reminderCreated: 'আমি “{title}”-এর রিমাইন্ডার {time}-এ যোগ করেছি।', reminderStatusUpdated: 'আমি “{title}”-কে {status} চিহ্নিত করেছি।',
    progress: 'আপনি {count}টি খেলা শেষ করেছেন, গড় নির্ভুলতা {accuracy}%। এগুলি অনুশীলনের স্কোর, চিকিৎসার মাপ নয়।', languageChanged: 'এখন আমি আপনার সঙ্গে বাংলায় কথা বলব।', settingChanged: '{setting} {value} করা হয়েছে।', screenOpened: 'আমি {screen} খুলেছি।',
    gameInstructions: 'আপনাকে যা করতে হবে: {instruction}', noGame: 'এই মুহূর্তে কোনো খেলা খোলা বা সংরক্ষিত নেই।', favoriteAdded: 'আমি এই খেলাটি আপনার পছন্দের তালিকায় যোগ করেছি।', favoriteRemoved: 'আমি এই খেলাটি পছন্দের তালিকা থেকে সরিয়েছি।', myGamesAdded: 'আমি খেলাটি আমার গেমসে যোগ করেছি।', myGamesRemoved: 'আমি খেলাটি আমার গেমস থেকে সরিয়েছি।', myGamesOpened: 'আমি গেমস খুলেছি। আমার গেমসে রাখা গেমগুলি কার্ডে চিহ্নিত আছে।', sos: 'আমি জরুরি সহায়তার বিকল্প খুলেছি। {contact}-কে যোগাযোগ করতে চাইলে তবেই কল চাপুন।', repeat: '{reply}', stopped: 'ভয়েস বন্ধ করা হয়েছে।',
    wellbeing: 'আমি আপনার সঙ্গে আছি। আমরা একটু শান্ত বিরতি নিতে বা সহজ কাজ করতে পারি। একটি সহজ স্মৃতির খেলা চান?', help: 'আমি {count}টি নিবন্ধিত স্থানীয় ক্ষমতা দিয়ে গেম, সেশন, রুটিন, রিমাইন্ডার, ওষুধ, জল, অ্যাপয়েন্টমেন্ট, পরিবার, অগ্রগতি, সেটিংস, প্রোফাইল ও SOS চালাতে পারি।', unknown: 'আমি বুঝতে পারিনি। আপনি কী খুলতে, পড়তে, যোগ করতে, বদলাতে বা শুরু করতে চান তা বলুন।', voiceUnavailable: 'এই মুহূর্তে ভয়েস ইনপুট পাওয়া যাচ্ছে না। আপনি অনুরোধটি লিখতে পারেন।', microphoneDenied: 'মাইক্রোফোনের অনুমতি বন্ধ আছে। ফোনের সেটিংসে MindMitra-এর জন্য এটি চালু করুন অথবা অনুরোধটি লিখুন।', medicalBoundary: 'আমি MindMitra-তে সংরক্ষিত রিমাইন্ডার দেখাতে পারি, কিন্তু রোগ নির্ণয়, ওষুধ লেখা বা বদলানো পারি না। চিকিৎসার পরামর্শের জন্য যোগ্য চিকিৎসকের সঙ্গে কথা বলুন।', offlineUnavailable: 'এই কাজটির জন্য অনলাইন পরিষেবা দরকার, কিন্তু আপনি অফলাইনে আছেন। স্থানীয় MindMitra সুবিধাগুলি চালু আছে।',
  },
  as: {
    greeting: 'নমস্কাৰ {name}, মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ?', askDuration: 'আপুনি কিমান মিনিটৰ অধিৱেশন বিচাৰে?', askTime: 'কোন সময় ব্যৱহাৰ কৰিম?', askDate: 'কোন তাৰিখ ব্যৱহাৰ কৰিম?', askTitle: 'ইয়াৰ নাম কি ৰাখিম?', askActivity: 'আপুনি কোনটো কামৰ কথা কৈছে?', askMemberName: 'পৰিয়ালৰ সদস্যজনৰ নাম কি?', askRelationship: 'তেওঁৰ আপোনাৰ সৈতে সম্পৰ্ক কি?', askTarget: 'দৈনিক কিমান গিলাচ পানীৰ লক্ষ্য বিচাৰে?', askInterval: 'পানীৰ সোঁৱৰণিৰ মাজত কিমান মিনিট থাকিব?', askReminderKind: 'এইটো কোন ধৰণৰ সোঁৱৰণি: ঔষধ, পানী, সাক্ষাৎ, দিনচৰ্যা নে অধিৱেশন?', askLanguage: 'কোন ভাষা বিচাৰে: ইংৰাজী, হিন্দী, বাংলা নে অসমীয়া?', askTextSize: 'সাধাৰণ, ডাঙৰ নে অতি ডাঙৰ লিখনি বিচাৰে?', askStatus: 'ইয়াক খোৱা, বাদ পৰা নে পাছৰ বাবে বুলি চিহ্নিত কৰিম?',
    confirmAction: 'অনুগ্ৰহ কৰি নিশ্চিত কৰক: মই {action} কৰিম নেকি?', cancelled: 'ঠিক আছে, সেই কামটো বাতিল কৰিলোঁ।', actionFailed: 'কামটো সম্পূৰ্ণ কৰিব নোৱাৰিলোঁ। আপোনাৰ বৰ্তমানৰ তথ্য সলনি হোৱা নাই।', notFound: 'মিল থকা কোনো সংৰক্ষিত বস্তু নাপালোঁ।',
    sessionStarted: 'আপোনাৰ {minutes} মিনিটৰ অধিৱেশন এতিয়া আৰম্ভ কৰিছোঁ।', sessionPaused: 'আপোনাৰ অধিৱেশন বিৰতিত আছে। সাজু হ’লে মোক পুনৰ আৰম্ভ কৰিবলৈ ক’ব।', sessionResumed: 'আপোনাৰ অধিৱেশন পুনৰ আৰম্ভ কৰিছোঁ।', sessionFinished: 'আপোনাৰ অধিৱেশন শেষ হ’ল। নিজৰ বাবে সময় দিয়াৰ বাবে বহুত ভাল কৰিলে।', noSession: 'এতিয়া কোনো অধিৱেশন চলি থকা নাই।',
    gamesOpened: 'মই আপোনাৰ বাবে {category} খেল খুলিলোঁ।', gameStarted: 'এতিয়া {game} আৰম্ভ কৰিছোঁ।', gameResumed: 'সংৰক্ষিত {game} পুনৰ আৰম্ভ কৰিছোঁ।', gameSuggested: 'আহক, আনন্দৰ কিবা এটা কৰোঁ। মই এটা সহজ স্মৃতিৰ খেল আৰম্ভ কৰিম নেকি?', favoritesOpened: 'খেলসমূহ খুলি আপোনাৰ প্ৰিয় খেলবোৰ আগত ৰাখিছোঁ।',
    familyOpened: 'মই মোৰ পৰিয়াল খুলিলোঁ। {count}জন পৰিয়ালৰ সদস্য সংৰক্ষিত আছে।', familyGameStarted: 'এতিয়া পৰিয়াল-স্মৃতিৰ কাৰ্যকলাপ আৰম্ভ কৰিছোঁ।', familyAdded: 'মই {name}-ক মোৰ পৰিয়ালত যোগ কৰিলোঁ।', familyRemoved: 'মই {name}-ক মোৰ পৰিয়ালৰ পৰা আঁতৰালোঁ।', noFamily: 'পৰিয়াল-স্মৃতিৰ কাৰ্যকলাপ আৰম্ভ কৰাৰ আগতে অন্তত এজন সদস্য যোগ কৰক।',
    waterReminder: 'মই {time}-ত পানী খাবলৈ সোঁৱৰণি যোগ কৰিলোঁ।', hydrationProgress: 'আজি আপুনি {target} গিলাচৰ ভিতৰত {current} গিলাচ পানী খাইছে।', hydrationRecorded: 'এগিলাচ নথিভুক্ত কৰিলোঁ। আজি {target}ৰ ভিতৰত {current} গিলাচ হৈছে।', hydrationPlanUpdated: 'আপোনাৰ পানীৰ পৰিকল্পনা আপডেট কৰা হৈছে।',
    medicineNext: 'আপোনাৰ পৰৱৰ্তী ঔষধৰ সোঁৱৰণি {detail}।', medicineNone: 'আপোনাৰ কোনো ঔষধৰ সোঁৱৰণি বাকী নাই।', medicineCreated: 'নিৰ্ধাৰিত ঔষধ “{title}”-ৰ সোঁৱৰণি {time}-ত যোগ কৰিলোঁ।', appointmentNext: 'আপোনাৰ পৰৱৰ্তী সাক্ষাৎ {detail}।', appointmentNone: 'এতিয়ালৈ কোনো সাক্ষাৎ সংৰক্ষণ কৰা নাই।', appointmentCreated: 'মই “{title}” {date} তাৰিখে {time}-ত যোগ কৰিলোঁ।',
    routineNext: 'আপোনাৰ পৰৱৰ্তী কাম {detail}।', routineNone: 'আজিৰ দিনচৰ্যা সম্পূৰ্ণ হৈছে।', routineCreated: 'মই “{activity}” {time}-ত দিনচৰ্যাত যোগ কৰিলোঁ।', routineModified: 'মই “{activity}”-ৰ সময় {time} কৰিলোঁ।', routineCompleted: 'মই “{activity}” সম্পূৰ্ণ বুলি চিহ্নিত কৰিলোঁ।', reminderCreated: 'মই “{title}”-ৰ সোঁৱৰণি {time}-ত যোগ কৰিলোঁ।', reminderStatusUpdated: 'মই “{title}”-ক {status} বুলি চিহ্নিত কৰিলোঁ।',
    progress: 'আপুনি {count}টা খেল সম্পূৰ্ণ কৰিছে; গড় শুদ্ধতা {accuracy}%। এইবোৰ অনুশীলনৰ নম্বৰ, চিকিৎসাৰ মাপ নহয়।', languageChanged: 'এতিয়া মই আপোনাৰ লগত অসমীয়াত কথা পাতিম।', settingChanged: '{setting} {value} কৰা হৈছে।', screenOpened: 'মই {screen} খুলিলোঁ।',
    gameInstructions: 'আপুনি এইটো কৰিব লাগিব: {instruction}', noGame: 'এতিয়া কোনো খেল খোলা বা সংৰক্ষিত নাই।', favoriteAdded: 'মই এই খেলটো আপোনাৰ প্ৰিয় তালিকাত যোগ কৰিলোঁ।', favoriteRemoved: 'মই এই খেলটো প্ৰিয় তালিকাৰ পৰা আঁতৰালোঁ।', myGamesAdded: 'মই খেলটো মোৰ খেলত যোগ কৰিলোঁ।', myGamesRemoved: 'মই খেলটো মোৰ খেলৰ পৰা আঁতৰালোঁ।', myGamesOpened: 'মই খেলসমূহ খুলিলোঁ। মোৰ খেলত থকা খেলবোৰ কাৰ্ডত চিহ্নিত আছে।', sos: 'মই জৰুৰী সহায়ৰ বিকল্প খুলিলোঁ। {contact}-ৰ সৈতে যোগাযোগ কৰিব বিচাৰিলেহে কল টিপক।', repeat: '{reply}', stopped: 'কণ্ঠ বন্ধ কৰা হৈছে।',
    wellbeing: 'মই আপোনাৰ লগত আছোঁ। আমি অলপ শান্তিৰে জিৰণি ল’ব পাৰোঁ বা সহজ কাম কৰিব পাৰোঁ। এটা সহজ স্মৃতিৰ খেল বিচাৰে নেকি?', help: 'মই {count}টা পঞ্জীভুক্ত স্থানীয় ক্ষমতাৰে খেল, অধিৱেশন, দিনচৰ্যা, সোঁৱৰণি, ঔষধ, পানী, সাক্ষাৎ, পৰিয়াল, অগ্ৰগতি, ছেটিংছ, প্ৰ’ফাইল আৰু SOS চলাব পাৰোঁ।', unknown: 'মই বুজি নাপালোঁ। আপুনি কি খুলিব, পঢ়িব, যোগ কৰিব, সলনি কৰিব বা আৰম্ভ কৰিব বিচাৰে কওক।', voiceUnavailable: 'এতিয়া কণ্ঠ ইনপুট উপলব্ধ নহয়। আপুনি অনুৰোধটো লিখিব পাৰে।', microphoneDenied: 'মাইক্ৰ’ফোনৰ অনুমতি বন্ধ আছে। ফোনৰ ছেটিংছত MindMitra-ৰ বাবে ইয়াক চালু কৰক বা অনুৰোধটো লিখক।', medicalBoundary: 'মই MindMitra-ত সংৰক্ষিত সোঁৱৰণি দেখুৱাব পাৰোঁ, কিন্তু ৰোগ নিৰ্ণয়, ঔষধ লিখা বা সলনি কৰিব নোৱাৰোঁ। চিকিৎসাৰ পৰামৰ্শৰ বাবে যোগ্য চিকিৎসকৰ সৈতে যোগাযোগ কৰক।', offlineUnavailable: 'এই কামৰ বাবে অনলাইন সেৱা লাগে, কিন্তু আপুনি অফলাইন। স্থানীয় MindMitra সুবিধাবোৰ চলি আছে।',
  },
};

const CONCEPT_PATTERNS: Record<MitraConcept, RegExp[]> = {
  open: [/\b(open|show|view|take me to|go to|manage)\b/u, /खोल|दिखा|ले चल/u, /খুল|দেখা/u, /খোল|দেখুৱা/u], back: [/\b(go|take me)?\s*back\b/u, /पीछे/u, /ফিরে|পিছনে/u, /পিছলৈ|উভতি/u],
  start: [/\b(start|begin|play|let.?s|give me|something to|test my)\b/u, /शुरू|खेलना/u, /শুরু|খেলতে/u, /আৰম্ভ|খেলিব/u], resume: [/\b(resume|continue)\b/u, /जारी/u, /আবার শুরু|চালিয়ে/u, /পুনৰ|আগবঢ়া/u], pause: [/\b(pause|hold)\b/u, /रोक/u, /বিরতি/u, /বিৰতি/u], finish: [/\b(finish|end session|stop session)\b/u, /समाप्त/u, /সেশন শেষ/u, /অধিৱেশন শেষ/u],
  create: [/\b(add|create|set|schedule|make|new)\b/u, /जोड़|बनाओ|लगाओ/u, /যোগ|তৈরি/u, /যোগ|বনাওক/u], modify: [/\b(change|modify|update|move|edit)\b/u, /बदल|अपडेट/u, /বদল|আপডেট/u, /সলনি|আপডেট/u], remove: [/\b(remove|delete|unfavorite)\b/u, /हटा|मिटा/u, /সর|মুছ/u, /আঁতৰ|মচ/u],
  read: [/\b(what|which|when|how much|tell me|read|summarize|check)\b/u, /क्या|कब|कितना|बताओ|पढ़/u, /কি|কখন|কত|বল|পড়/u, /কি|কেতিয়া|কিমান|কওক|পঢ়/u], next: [/\b(next|coming up|today)\b/u, /अगला|आज/u, /পরবর্তী|আজ/u, /পৰৱৰ্তী|আজি/u], record: [/\b(record|i drank|i had|log)\b/u, /पी लिया|दर्ज/u, /খেয়েছি|নথিভুক্ত/u, /খালোঁ|নথিভুক্ত/u], complete: [/\b(done|complete|completed|taken|mark)\b/u, /पूरा|ले लिया/u, /শেষ|খেয়েছি|সম্পূর্ণ/u, /সম্পূৰ্ণ|খালোঁ/u],
  enable: [/\b(enable|on|turn on|allow)\b/u, /चालू|सक्षम/u, /চালু|সক্ষম/u, /চালু|সক্ষম/u], disable: [/\b(disable|off|turn off)\b/u, /बंद|अक्षम/u, /বন্ধ|অক্ষম/u, /বন্ধ|অক্ষম/u], increase: [/\b(increase|bigger|larger|large|extra large)\b/u, /बड़ा|बढ़ा/u, /বড়|বাড়াও/u, /ডাঙৰ|বঢ়াওক/u], decrease: [/\b(decrease|smaller|normal size)\b/u, /छोटा|कम/u, /ছোট|কমাও/u, /সৰু|কমাওক/u],
  home: [/\b(home|dashboard)\b/u, /होम|घर/u, /হোম|বাড়ি/u, /হোম|ঘৰ/u], game: [/\b(game|games|play|memory test|brain activity)\b/u, /खेल/u, /খেলা|গেম/u, /খেল/u], favorite: [/\b(favou?rite|saved games)\b/u, /पसंदीदा/u, /পছন্দ/u, /প্ৰিয়/u], myGames: [/\b(my games|my game list)\b/u, /मेरे खेल/u, /আমার গেম|আমার খেলা/u, /মোৰ খেল/u], session: [/\b(session|practice session)\b/u, /सत्र|अभ्यास/u, /সেশন|অনুশীলন/u, /অধিৱেশন|অনুশীলন/u], family: [/\b(family|family member|memories)\b/u, /परिवार|यादें/u, /পরিবার|স্মৃতি/u, /পৰিয়াল|স্মৃতি/u], memory: [/\b(memory|remember|recall)\b/u, /स्मृति|याद/u, /স্মৃতি|মনে/u, /স্মৃতি|সোঁৱৰণ/u],
  medicine: [/\b(medicine|medication|tablet|pill|dose)\b/u, /दवा|औषध|गोली/u, /ওষুধ|ট্যাবলেট/u, /ঔষধ|টেবলেট/u], reminder: [/\b(reminder|remind|alert)\b/u, /रिमाइंडर|याद दिल/u, /রিমাইন্ডার|মনে কর/u, /সোঁৱৰণি|মনত পেলাই/u], appointment: [/\b(appointment|doctor visit|clinic visit)\b/u, /अपॉइंटमेंट|डॉक्टर/u, /অ্যাপয়েন্টমেন্ট|ডাক্তার/u, /সাক্ষাৎ|ডাক্তৰ/u], routine: [/\b(routine|schedule|activity|what should i do)\b/u, /दिनचर्या|कार्य/u, /রুটিন|কাজ/u, /দিনচৰ্যা|কাম/u], hydration: [/\b(hydration|water|drink a glass|drink water)\b/u, /पानी|जल/u, /জল|পানি/u, /পানী/u], progress: [/\b(progress|performance|score|accuracy|trend)\b/u, /प्रगति|स्कोर/u, /অগ্রগতি|স্কোর/u, /অগ্ৰগতি|নম্বৰ/u],
  settings: [/\b(settings?|preferences?)\b/u, /सेटिंग/u, /সেটিং/u, /ছেটিং/u], language: [/\b(language|english|hindi|bengali|bangla|assamese|asamiya)\b/u, /भाषा|हिन्दी|अंग्रेजी/u, /ভাষা|বাংলা|ইংরেজি/u, /ভাষা|অসমীয়া|ইংৰাজী/u], text: [/\b(text|font|letters?)\b/u, /टेक्स्ट|अक्षर/u, /লেখা|অক্ষর/u, /আখৰ|লিখনি/u], contrast: [/\bcontrast\b/u, /कंट्रास्ट/u, /কনট্রাস্ট/u, /কনট্ৰাষ্ট/u], voice: [/\b(voice|speak|speaking|talk aloud)\b/u, /आवाज़|बोल/u, /ভয়েস|কথা বল/u, /কণ্ঠ|কথা ক/u], sound: [/\b(sound|sound effect|audio effect)\b/u, /ध्वनि|साउंड/u, /সাউন্ড|শব্দ/u, /শব্দ/u], motion: [/\b(motion|animation|movement)\b/u, /एनीमेशन|गति/u, /অ্যানিমেশন|নড়াচড়া/u, /এনিমেচন|গতি/u], notification: [/\b(notification|notifications)\b/u, /नोटिफिकेशन|सूचना/u, /নোটিফিকেশন|বিজ্ঞপ্তি/u, /জাননী|নটিফিকেচন/u], profile: [/\b(profile|account|my details)\b/u, /प्रोफ़ाइल|खाता/u, /প্রোফাইল|অ্যাকাউন্ট/u, /প্ৰফাইল|একাউণ্ট/u], caregiver: [/\b(caregiver|carer)\b/u, /देखभाल/u, /কেয়ারগিভার/u, /যত্ন লওঁতা/u],
  sos: [/\b(sos|emergency|danger|urgent help)\b/u, /आपात|खतरा/u, /জরুরি|বিপদ/u, /জৰুৰী|বিপদ/u], help: [/\b(help|what can you do|capabilities)\b/u, /मदद|क्या कर सकती/u, /সাহায্য|কি করতে পার/u, /সহায়|কি কৰিব পাৰ/u], repeat: [/\b(repeat|say again)\b/u, /दोहर|फिर से कह/u, /আবার বল/u, /আকৌ কওক/u], stop: [/\b(stop|be quiet)\b/u, /रुको|चुप/u, /থাম|চুপ/u, /ৰখ|নীৰৱ/u], greeting: [/\b(hello|hi|hey|namaste|good morning|good evening)\b/u, /नमस्ते|नमस्कार/u, /নমস্কার|হ্যালো/u, /নমস্কাৰ/u], wellbeing: [/\b(bored|lonely|sad|worried|anxious|nothing to do|not well)\b/u, /बोर|उदास|अकेला|चिंतित/u, /বিরক্ত|মন খারাপ|একাকী|চিন্তিত/u, /আমনি|দুখ|অকলশৰীয়া|চিন্তিত/u], logout: [/\b(log ?out|sign ?out)\b/u, /लॉग ?आউট/u, /লগ ?আউট/u, /লগ ?আউট/u], delete: [/\b(delete|erase|remove account)\b/u, /खाता.*मिटा|हटा/u, /অ্যাকাউন্ট.*মুছ/u, /একাউণ্ট.*মচ/u], instructions: [/\b(instruction|instructions|explain this|what do i do|don.?t understand)\b/u, /निर्देश|समझ नहीं|क्या करना/u, /নির্দেশ|বুঝতে পারছি না|কি করতে হবে/u, /নিৰ্দেশ|বুজি পোৱা নাই|কি কৰিব লাগিব/u], medicalAdvice: [/\b(diagnos\w*|prescrib\w*|change (?:my )?dose|increase (?:my )?dose|decrease (?:my )?dose|stop (?:my )?medicine|which medicine should i take)\b/u, /निदान|दवा.*खुराक.*बदल|दवा.*बंद/u, /রোগ নির্ণয়|ওষুধ.*মাত্রা.*বদল|ওষুধ.*বন্ধ/u, /ৰোগ নিৰ্ণয়|ঔষধ.*মাত্ৰা.*সলনি|ঔষধ.*বন্ধ/u],
  yes: [/^(yes|yeah|yep|ok|okay|sure|please do)$/u, /^(हाँ|हां|ठीक)$/u, /^(হ্যাঁ|ঠিক আছে)$/u, /^(হয়|ঠিক আছে)$/u], no: [/^(no|nope|cancel|don.?t)$/u, /^(नहीं|रद्द)$/u, /^(না|বাতিল)$/u, /^(নহয়|বাতিল)$/u],
};

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[?!,.;]+/gu, ' ').replace(/\s+/gu, ' ').trim();
const canonicalize = (value: string) => value.replace(/\bmedicines\b/gu, 'medicine').replace(/\bappointments\b/gu, 'appointment').replace(/\breminders\b/gu, 'reminder').replace(/\broutines\b/gu, 'routine').replace(/\bsessions\b/gu, 'session');
const conceptSet = (value: string) => { const canonical = canonicalize(value); return new Set<MitraConcept>((Object.entries(CONCEPT_PATTERNS) as [MitraConcept, RegExp[]][]).filter(([, patterns]) => patterns.some((pattern) => pattern.test(canonical))).map(([concept]) => concept)); };

function durationFrom(value: string): number | undefined {
  const numeric = value.match(/(\d{1,3})\s*(?:minutes?|mins?|मिनट|মিনিট)/u);
  if (numeric) return Math.max(1, Math.min(180, Number(numeric[1])));
  const words: Array<[RegExp, number]> = [[/\b(five|पाँच|পাঁচ)\b/u, 5], [/\b(ten|दस|দশ)\b/u, 10], [/\b(fifteen|पंद्रह|পনেরো)\b/u, 15], [/\b(thirty|तीस|ত্রিশ)\b/u, 30], [/\b(sixty|साठ|ষাট)\b/u, 60]];
  return words.find(([pattern]) => pattern.test(value))?.[1];
}

function timeFrom(value: string): string | undefined {
  const relative = value.match(/(?:in|after|बाद|পরে|পাছত)\s*(\d{1,3})\s*(?:minutes?|mins?|मिनट|মিনিট)/u)
    ?? value.match(/^(\d{1,3})\s*(?:minutes?|mins?|मिनट|মিনিট)(?:\s*(?:from now|later|बाद|পরে|পাছত))?$/u);
  if (relative) return new Date(Date.now() + Number(relative[1]) * 60000).toTimeString().slice(0, 5);
  const twelveHour = value.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/u);
  if (twelveHour) { let hour = Number(twelveHour[1]) % 12; if (twelveHour[3].startsWith('p')) hour += 12; return `${String(hour).padStart(2, '0')}:${twelveHour[2] ?? '00'}`; }
  const twentyFour = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/u);
  return twentyFour ? `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}` : undefined;
}

function dateFrom(value: string): string | undefined {
  const iso = value.match(/\b(20\d{2}-[01]\d-[0-3]\d)\b/u)?.[1];
  if (iso && Number.isFinite(Date.parse(`${iso}T00:00:00`))) return iso;
  const date = new Date();
  if (/\b(tomorrow|कल|আগামীকাল|কাইলৈ)\b/u.test(value)) date.setDate(date.getDate() + 1);
  else if (!/\b(today|आज|আজ|আজি)\b/u.test(value)) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const index = weekdays.findIndex((day) => value.includes(day));
    if (index < 0) return undefined;
    date.setDate(date.getDate() + ((index - date.getDay() + 7) % 7 || 7));
  }
  return date.toISOString().slice(0, 10);
}

function languageFrom(value: string): SupportedMitraLanguage | undefined {
  if (/\b(hindi)\b|हिन्दी|हिंदी/u.test(value)) return 'hi';
  if (/\b(bengali|bangla)\b|বাংলা|বাঙালি/u.test(value)) return 'bn';
  if (/\b(assamese|asamiya)\b|অসমীয়া|অসমীয়/u.test(value)) return 'as';
  if (/\benglish\b|अंग्रेजी|ইংরেজি|ইংৰাজী/u.test(value)) return 'en';
  return undefined;
}

function categoryFrom(value: string): Category | undefined {
  const patterns: Array<[Category, RegExp]> = [['Memory', /memory|remember|স্মৃতি|মেমরি|याद|स्मृति|স্মৰণ/u], ['Attention', /attention|focus|ध्यान|মনোযোগ/u], ['Pattern', /pattern|প্যাটার্ন|পেটাৰ্ণ|क्रम/u], ['Recognition', /recognition|চেনা|पहचान|চিনাক্ত/u], ['Language', /language game|শব্দ|ভাষার খেলা|ভাষাৰ খেল|शब्द/u], ['Routine', /routine game|দিনচর্যার খেলা|দিনচৰ্যাৰ খেল|दिनचर्या खेल/u], ['Emotion', /emotion|feeling game|আবেগ|भावना|অনুভৱ/u], ['Cultural', /cultural|culture|সংস্কৃতি|संस्कृति/u]];
  return patterns.find(([, pattern]) => pattern.test(value))?.[0];
}

function parameterValue(type: MitraParameterType, input: string, concepts: Set<MitraConcept>, capabilityId: MitraCapabilityId, followUp = false): MitraParameterValue | undefined {
  if (type === 'duration') return durationFrom(input);
  if (type === 'time') return timeFrom(input);
  if (type === 'date') return dateFrom(input);
  if (type === 'language') return languageFrom(input);
  if (type === 'category') return categoryFrom(input);
  if (type === 'difficulty') return /hard|कठिन|কঠিন/u.test(input) ? 'Hard' : /medium|मध्यम|মাঝারি/u.test(input) ? 'Medium' : /easy|आसान|सरल|সহজ/u.test(input) ? 'Easy' : undefined;
  if (type === 'boolean') return concepts.has('disable') ? false : concepts.has('enable') ? true : true;
  if (type === 'status') return /missed|छूट|মিস|বাদ/u.test(input) ? 'missed' : /later|snooze|बाद|পরে|পাছত/u.test(input) ? 'snoozed' : concepts.has('complete') ? 'taken' : undefined;
  if (type === 'family-game') return /match|मिलान|মেল|মিল/u.test(input) ? 'match' : /remember|recall|याद|মনে|সোঁৱৰ/u.test(input) ? 'remember' : /who|कौन|কে|কোন/u.test(input) ? 'who' : undefined;
  if (type === 'reminder-kind') return concepts.has('medicine') ? 'medicine' : concepts.has('hydration') ? 'hydration' : concepts.has('appointment') ? 'appointment' : concepts.has('routine') ? 'routine' : concepts.has('session') ? 'session' : followUp ? normalize(input) : undefined;
  if (type === 'number') return Number(input.match(/\b(\d{1,3})\b/u)?.[1]) || undefined;
  if (type === 'text') {
    if (capabilityId === 'settings.text') return concepts.has('decrease') ? 'normal' : /extra|बहुत बड़ा|অতি বড়|অতি ডাঙৰ/u.test(input) ? 'extra' : concepts.has('increase') ? 'large' : undefined;
    return followUp && input.length <= 100 ? input.trim() : undefined;
  }
  return undefined;
}

function initialTextValue(capabilityId: MitraCapabilityId, name: MitraParameterName, input: string): string | undefined {
  const patterns: Partial<Record<MitraCapabilityId, RegExp>> = {
    'appointment.create': /(?:with|for|about)\s+(.+?)(?=\s+(?:on|at|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|$)/u,
    'medicine.create': /(?:medicine|tablet|pill)(?:\s+(?:called|named))?\s+(.+?)(?=\s+(?:at|on|daily|tomorrow|today)\b|$)/u,
    'routine.create': /(?:activity|routine)(?:\s+(?:called|named|for))?\s+(.+?)(?=\s+(?:at|on|today|tomorrow)\b|$)/u,
    'routine.modify': /(?:move|change|update)\s+(.+?)\s+(?:to|at)\s/u,
    'family.add': /(?:member|named|called)\s+(.+?)(?=\s+(?:as|who is|my)\b|$)/u,
    'family.remove': /(?:remove|delete)\s+(.+?)(?:\s+from\s+(?:my\s+)?family)?$/u,
  };
  const match = patterns[capabilityId]?.exec(input)?.[1]?.trim();
  return match && (name === 'activity' || name === 'title' || name === 'memberName') ? match : undefined;
}

function scoreCapability(capability: MitraCapabilityDefinition, concepts: Set<MitraConcept>): number {
  if (capability.required.some((concept) => !concepts.has(concept))) return Number.NEGATIVE_INFINITY;
  if (capability.blocked?.some((concept) => concepts.has(concept))) return Number.NEGATIVE_INFINITY;
  let score = capability.required.length * 10 + (capability.priority ?? 0);
  for (const [concept, weight] of Object.entries(capability.weighted ?? {}) as [MitraConcept, number][]) if (concepts.has(concept)) score += weight;
  return score;
}

function missingFor(capability: MitraCapabilityDefinition, parameters: MitraParameters) {
  return (capability.parameters ?? []).filter((item) => item.required && parameters[item.name] === undefined).map((item) => item.name);
}

function resultFor(capability: MitraCapabilityDefinition, parameters: MitraParameters, confidence: number, confirmed = false): MitraUnderstanding {
  const missing = missingFor(capability, parameters);
  if (missing.length) {
    const parameter = capability.parameters?.find((item) => item.name === missing[0]);
    return { intent: capability.domain, capabilityId: capability.id, capability, parameters, confidence, state: 'needs-parameter', promptKey: parameter?.prompt, missingParameters: missing, category: parameters.category as Category | undefined };
  }
  if (capability.requiresConfirmation && !confirmed) return { intent: capability.domain, capabilityId: capability.id, capability, parameters, confidence, state: 'needs-confirmation', promptKey: 'confirmAction', missingParameters: [], category: parameters.category as Category | undefined };
  return { intent: capability.domain, capabilityId: capability.id, capability, parameters, confidence, state: 'ready', missingParameters: [], category: parameters.category as Category | undefined };
}

export function understandMitraRequest(value: string, context: MitraUnderstandingContext = {}): MitraUnderstanding {
  const input = normalize(value);
  const concepts = conceptSet(input);
  if (/^(yes|yeah|sure|okay) please$/u.test(input)) concepts.add('yes');
  if (/^no thanks?$/u.test(input)) concepts.add('no');
  const mentionedRoutine = context.knownRoutineActivities?.find((activity) => input.includes(normalize(activity)));
  const mentionedFamily = context.knownFamilyNames?.find((name) => input.includes(normalize(name)));
  if (context.pendingCapability) {
    const pending = capabilityById(context.pendingCapability as MitraCapabilityId);
    if (pending) {
      if (concepts.has('no')) return { intent: pending.domain, capabilityId: pending.id, capability: pending, parameters: context.collectedParameters ?? {}, confidence: 1, state: 'cancelled', promptKey: 'cancelled', missingParameters: [] };
      if (context.awaitingConfirmation && !concepts.has('yes')) return { intent: pending.domain, capabilityId: pending.id, capability: pending, parameters: context.collectedParameters ?? {}, confidence: .9, state: 'needs-confirmation', promptKey: 'confirmAction', missingParameters: [] };
      if (context.awaitingConfirmation && concepts.has('yes')) return resultFor(pending, context.collectedParameters ?? {}, 1, true);
      const parameters: MitraParameters = { ...(context.collectedParameters ?? {}) };
      const expectedName = ((context.missingParameters ?? [])[0]) as MitraParameterName | undefined;
      const definition = pending.parameters?.find((item) => item.name === expectedName);
      if (definition && expectedName) {
        const parsed = parameterValue(definition.type, input, concepts, pending.id, true);
        if (parsed !== undefined) parameters[expectedName] = parsed;
        if (pending.id === 'reminder.create' && expectedName === 'reminderKind' && parsed === 'hydration') parameters.title = 'Drink a glass of water';
      }
      for (const parameter of pending.parameters ?? []) {
        if (parameters[parameter.name] !== undefined) continue;
        const parsed = parameterValue(parameter.type, input, concepts, pending.id, false);
        if (parsed !== undefined) parameters[parameter.name] = parsed;
      }
      return resultFor(pending, parameters, 1);
    }
  }

  if (context.currentScreen === 'game' && (concepts.has('help') || (concepts.has('read') && input.length < 60))) concepts.add('instructions');
  if ((context.currentScreen === 'routine' || mentionedRoutine) && (concepts.has('modify') || concepts.has('complete'))) concepts.add('routine');
  if (mentionedFamily && concepts.has('remove')) concepts.add('family');
  if (/\b(took|consumed)\b/u.test(input)) concepts.add('complete');
  if (concepts.has('favorite') && !concepts.has('remove') && !concepts.has('open')) concepts.add('create');
  if (concepts.has('memory') && concepts.has('start')) concepts.add('game');
  if (context.lastCategory && concepts.has('start') && !concepts.has('session')) concepts.add('game');
  if (concepts.has('reminder') && !concepts.has('complete') && !concepts.has('record')) concepts.add('create');

  const ranked = MITRA_CAPABILITIES.map((capability) => ({ capability, score: scoreCapability(capability, concepts) })).filter((item) => Number.isFinite(item.score)).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return { intent: 'unknown', parameters: {}, confidence: 0, state: 'ambiguous', promptKey: 'unknown', missingParameters: [] };

  const parameters: MitraParameters = { ...(best.capability.defaults ?? {}) };
  const category = categoryFrom(input) ?? context.lastCategory;
  for (const parameter of best.capability.parameters ?? []) {
    const parsed = parameterValue(parameter.type, input, concepts, best.capability.id);
    const initialText = parameter.type === 'text' ? initialTextValue(best.capability.id, parameter.name, input) : undefined;
    if (parsed !== undefined) parameters[parameter.name] = parsed;
    else if (initialText) parameters[parameter.name] = initialText;
  }
  if (category && best.capability.domain === 'games') parameters.category = category;
  if (mentionedRoutine && (best.capability.id === 'routine.modify' || best.capability.id === 'routine.complete')) parameters.activity = mentionedRoutine;
  if (mentionedFamily && best.capability.id === 'family.remove') parameters.memberName = mentionedFamily;
  if (best.capability.id === 'games.start') parameters.gameQuery = input;
  const margin = ranked[1] ? best.score - ranked[1].score : 10;
  return resultFor(best.capability, parameters, Math.min(.99, .72 + Math.max(0, margin) / 30));
}

export function mitraMessage(language: Language, key: MitraMessageKey, values: Record<string, string | number> = {}): string {
  const supported: SupportedMitraLanguage = language === 'hi' || language === 'bn' || language === 'as' ? language : 'en';
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), MESSAGES[supported][key]);
}

export const mitraCapabilityCount = MITRA_CAPABILITIES.length;
export const mitraCapabilityCategories = MITRA_GAME_CATEGORIES;
