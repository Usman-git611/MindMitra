import type { Category } from './types';

export type MitraCapabilityId =
  | 'navigation.home' | 'navigation.back'
  | 'games.open' | 'games.start' | 'games.resume' | 'games.explain'
  | 'games.favorite.add' | 'games.favorite.remove' | 'games.favorites.open' | 'games.my.add' | 'games.my.remove' | 'games.my.open'
  | 'session.open' | 'session.start' | 'session.pause' | 'session.resume' | 'session.finish'
  | 'family.open' | 'family.add' | 'family.remove' | 'family.game.start'
  | 'medicine.open' | 'medicine.read' | 'medicine.create' | 'medicine.status' | 'reminder.create' | 'reminder.status'
  | 'appointment.open' | 'appointment.read' | 'appointment.create'
  | 'routine.open' | 'routine.read' | 'routine.create' | 'routine.complete' | 'routine.modify'
  | 'hydration.open' | 'hydration.read' | 'hydration.record' | 'hydration.reminder' | 'hydration.plan'
  | 'progress.open' | 'progress.read'
  | 'settings.open' | 'settings.language' | 'settings.text' | 'settings.contrast'
  | 'settings.voice' | 'settings.sound' | 'settings.motion' | 'settings.notifications'
  | 'profile.edit' | 'caregiver.open' | 'sos.open'
  | 'assistant.help' | 'assistant.repeat' | 'assistant.stop' | 'assistant.greeting' | 'assistant.wellbeing' | 'assistant.medical-boundary'
  | 'account.logout' | 'account.delete';

export type MitraConcept =
  | 'open' | 'back' | 'start' | 'resume' | 'pause' | 'finish' | 'create' | 'modify' | 'remove'
  | 'read' | 'next' | 'record' | 'complete' | 'enable' | 'disable' | 'increase' | 'decrease'
  | 'home' | 'game' | 'favorite' | 'myGames' | 'session' | 'family' | 'memory' | 'medicine' | 'reminder'
  | 'appointment' | 'routine' | 'hydration' | 'progress' | 'settings' | 'language' | 'text'
  | 'contrast' | 'voice' | 'sound' | 'motion' | 'notification' | 'profile' | 'caregiver'
  | 'sos' | 'help' | 'repeat' | 'stop' | 'greeting' | 'wellbeing' | 'logout' | 'delete'
  | 'instructions' | 'medicalAdvice' | 'yes' | 'no';

export type MitraParameterName =
  | 'minutes' | 'time' | 'date' | 'title' | 'activity' | 'memberName' | 'relationship'
  | 'category' | 'difficulty' | 'language' | 'enabled' | 'textSize' | 'target' | 'interval'
  | 'status' | 'familyGameType' | 'gameQuery' | 'reminderKind';

export type MitraParameterType = 'duration' | 'time' | 'date' | 'text' | 'category' | 'difficulty' | 'language' | 'boolean' | 'number' | 'status' | 'family-game' | 'reminder-kind';

export interface MitraCapabilityParameter {
  name: MitraParameterName;
  type: MitraParameterType;
  required?: boolean;
  prompt: 'askDuration' | 'askTime' | 'askDate' | 'askTitle' | 'askActivity' | 'askMemberName' | 'askRelationship' | 'askTarget' | 'askInterval' | 'askReminderKind' | 'askLanguage' | 'askTextSize' | 'askStatus';
}

export interface MitraCapabilityDefinition {
  id: MitraCapabilityId;
  name: string;
  description: string;
  domain: string;
  required: MitraConcept[];
  weighted?: Partial<Record<MitraConcept, number>>;
  blocked?: MitraConcept[];
  parameters?: MitraCapabilityParameter[];
  defaults?: Record<string, string | number | boolean>;
  canExecuteOffline: boolean;
  requiresConfirmation: boolean;
  priority?: number;
}

const capability = (definition: MitraCapabilityDefinition) => definition;

/**
 * This registry is the single inventory of user-accessible actions exposed to
 * Mitra. Language interpretation is intentionally separate from execution:
 * the UI binds each id to the existing MindMitra function that already owns
 * the relevant state and validation.
 */
export const MITRA_CAPABILITIES: readonly MitraCapabilityDefinition[] = [
  capability({ id: 'navigation.home', name: 'Open Home', description: 'Open the existing home dashboard.', domain: 'navigation', required: ['home'], weighted: { open: 4 }, canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'navigation.back', name: 'Go Back', description: 'Return to the page from which Mitra was opened.', domain: 'navigation', required: ['back'], canExecuteOffline: true, requiresConfirmation: false }),

  capability({ id: 'games.open', name: 'Open Games', description: 'Open the existing game library, optionally filtered by category.', domain: 'games', required: ['game'], weighted: { open: 5, read: 1 }, blocked: ['start', 'session', 'favorite', 'instructions'], parameters: [{ name: 'category', type: 'category', prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'games.start', name: 'Start Game', description: 'Choose and launch an existing game.', domain: 'games', required: ['game'], weighted: { start: 6, memory: 2 }, blocked: ['session', 'family', 'favorite'], parameters: [{ name: 'category', type: 'category', prompt: 'askTitle' }, { name: 'difficulty', type: 'difficulty', prompt: 'askTitle' }, { name: 'gameQuery', type: 'text', prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false, priority: 2 }),
  capability({ id: 'games.resume', name: 'Resume Game', description: 'Resume the current saved game round.', domain: 'games', required: ['game', 'resume'], weighted: { resume: 8 }, canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'games.explain', name: 'Explain Current Game', description: 'Repeat current game instructions without revealing answers.', domain: 'games', required: ['instructions'], weighted: { game: 3, repeat: 2, read: 2 }, canExecuteOffline: true, requiresConfirmation: false, priority: 6 }),
  capability({ id: 'games.favorite.add', name: 'Favorite Game', description: 'Add the selected game to favorites.', domain: 'games', required: ['favorite'], weighted: { create: 5, enable: 3, game: 2 }, blocked: ['remove', 'open'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'games.favorite.remove', name: 'Unfavorite Game', description: 'Remove the selected game from favorites.', domain: 'games', required: ['favorite', 'remove'], weighted: { remove: 6 }, canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'games.favorites.open', name: 'Open Favorite Games', description: 'Open the existing game library showing favorite games first.', domain: 'games', required: ['favorite', 'open'], weighted: { game: 3 }, canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'games.my.add', name: 'Add to My Games', description: 'Add the selected game to the existing My Games list.', domain: 'games', required: ['game', 'myGames', 'create'], blocked: ['favorite'], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'games.my.remove', name: 'Remove from My Games', description: 'Remove the selected game from the existing My Games list.', domain: 'games', required: ['game', 'myGames', 'remove'], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'games.my.open', name: 'Open My Games', description: 'Open the game library containing the user’s saved My Games items.', domain: 'games', required: ['game', 'myGames', 'open'], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),

  capability({ id: 'session.open', name: 'Open Sessions', description: 'Open the existing balanced-session duration picker.', domain: 'sessions', required: ['session'], weighted: { open: 5 }, blocked: ['start', 'pause', 'resume', 'finish'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'session.start', name: 'Start Session', description: 'Start an existing balanced cognitive session.', domain: 'sessions', required: ['session', 'start'], weighted: { start: 7 }, parameters: [{ name: 'minutes', type: 'duration', required: true, prompt: 'askDuration' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'session.pause', name: 'Pause Session', description: 'Pause navigation away from the active session while preserving game progress.', domain: 'sessions', required: ['session', 'pause'], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'session.resume', name: 'Resume Session', description: 'Return to the active session.', domain: 'sessions', required: ['session', 'resume'], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'session.finish', name: 'Finish Session', description: 'Finish and summarize the active session.', domain: 'sessions', required: ['session', 'finish'], canExecuteOffline: true, requiresConfirmation: true, priority: 5 }),

  capability({ id: 'family.open', name: 'Open Family', description: 'Open stored family members and memory activities.', domain: 'family', required: ['family'], weighted: { open: 5, memory: 2, read: 2 }, blocked: ['start', 'create', 'remove'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'family.add', name: 'Add Family Member', description: 'Add a family profile using the existing family store.', domain: 'family', required: ['family', 'create'], weighted: { create: 7 }, parameters: [{ name: 'memberName', type: 'text', required: true, prompt: 'askMemberName' }, { name: 'relationship', type: 'text', required: true, prompt: 'askRelationship' }], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'family.remove', name: 'Remove Family Member', description: 'Remove a named family profile.', domain: 'family', required: ['family', 'remove'], parameters: [{ name: 'memberName', type: 'text', required: true, prompt: 'askMemberName' }], canExecuteOffline: true, requiresConfirmation: true, priority: 5 }),
  capability({ id: 'family.game.start', name: 'Start Family Memory Game', description: 'Launch one of the existing family-memory activities.', domain: 'family', required: ['family', 'game', 'start'], weighted: { memory: 3 }, parameters: [{ name: 'familyGameType', type: 'family-game', prompt: 'askTitle' }], defaults: { familyGameType: 'who' }, canExecuteOffline: true, requiresConfirmation: false, priority: 7 }),

  capability({ id: 'medicine.open', name: 'Open Medicines', description: 'Open the existing medicine reminder page.', domain: 'medicine', required: ['medicine'], weighted: { open: 6, settings: 3 }, blocked: ['create', 'read', 'next'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'medicine.read', name: 'Read Medicines', description: 'Read the next actual pending medicine reminder.', domain: 'medicine', required: ['medicine'], weighted: { read: 5, next: 5 }, blocked: ['create'], canExecuteOffline: true, requiresConfirmation: false, priority: 1 }),
  capability({ id: 'medicine.create', name: 'Add Medicine Reminder', description: 'Create a reminder for medicine already prescribed to the user.', domain: 'medicine', required: ['medicine', 'create'], parameters: [{ name: 'title', type: 'text', required: true, prompt: 'askTitle' }, { name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'medicine.status', name: 'Mark Medicine Taken', description: 'Mark the next pending medicine reminder taken.', domain: 'medicine', required: ['medicine', 'complete'], canExecuteOffline: true, requiresConfirmation: false, priority: 6 }),
  capability({ id: 'reminder.create', name: 'Add Reminder', description: 'Create a reminder through the existing reminder store.', domain: 'reminders', required: ['reminder', 'create'], blocked: ['medicine', 'hydration', 'appointment'], parameters: [{ name: 'reminderKind', type: 'reminder-kind', required: true, prompt: 'askReminderKind' }, { name: 'title', type: 'text', required: true, prompt: 'askTitle' }, { name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 2 }),
  capability({ id: 'reminder.status', name: 'Update Reminder Status', description: 'Mark the next pending reminder taken, missed, or snoozed.', domain: 'reminders', required: ['reminder'], weighted: { complete: 5, record: 3, next: 2 }, parameters: [{ name: 'status', type: 'status', required: true, prompt: 'askStatus' }], canExecuteOffline: true, requiresConfirmation: false }),

  capability({ id: 'appointment.open', name: 'Open Appointments', description: 'Open the existing appointments page.', domain: 'appointments', required: ['appointment'], weighted: { open: 6 }, blocked: ['create', 'read', 'next'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'appointment.read', name: 'Read Appointment', description: 'Read the next actual saved appointment.', domain: 'appointments', required: ['appointment'], weighted: { read: 5, next: 5 }, blocked: ['create'], canExecuteOffline: true, requiresConfirmation: false, priority: 1 }),
  capability({ id: 'appointment.create', name: 'Add Appointment', description: 'Create an appointment in the existing reminder store.', domain: 'appointments', required: ['appointment', 'create'], parameters: [{ name: 'title', type: 'text', required: true, prompt: 'askTitle' }, { name: 'date', type: 'date', required: true, prompt: 'askDate' }, { name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),

  capability({ id: 'routine.open', name: 'Open Routine', description: 'Open today’s existing routine.', domain: 'routine', required: ['routine'], weighted: { open: 6 }, blocked: ['create', 'modify', 'complete', 'read', 'next'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'routine.read', name: 'Read Routine', description: 'Read the next actual unfinished routine item.', domain: 'routine', required: ['routine'], weighted: { read: 5, next: 6 }, blocked: ['create', 'modify'], canExecuteOffline: true, requiresConfirmation: false, priority: 1 }),
  capability({ id: 'routine.create', name: 'Add Routine Item', description: 'Add an activity to the existing daily routine.', domain: 'routine', required: ['routine', 'create'], parameters: [{ name: 'activity', type: 'text', required: true, prompt: 'askActivity' }, { name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'routine.complete', name: 'Complete Routine Item', description: 'Mark a named or next routine activity complete.', domain: 'routine', required: ['routine', 'complete'], parameters: [{ name: 'activity', type: 'text', prompt: 'askActivity' }], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'routine.modify', name: 'Modify Routine Item', description: 'Update the time of an existing named routine activity.', domain: 'routine', required: ['routine', 'modify'], parameters: [{ name: 'activity', type: 'text', required: true, prompt: 'askActivity' }, { name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),

  capability({ id: 'hydration.open', name: 'Open Hydration', description: 'Open the existing hydration page.', domain: 'hydration', required: ['hydration'], weighted: { open: 6 }, blocked: ['read', 'record', 'reminder', 'create', 'modify'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'hydration.read', name: 'Read Hydration Progress', description: 'Read actual glasses consumed and daily target.', domain: 'hydration', required: ['hydration'], weighted: { read: 5, progress: 4 }, blocked: ['record', 'reminder', 'create'], canExecuteOffline: true, requiresConfirmation: false, priority: 1 }),
  capability({ id: 'hydration.record', name: 'Record Water', description: 'Record one consumed glass using the existing hydration state.', domain: 'hydration', required: ['hydration', 'record'], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'hydration.reminder', name: 'Create Water Reminder', description: 'Create an actual hydration reminder.', domain: 'hydration', required: ['hydration', 'reminder'], weighted: { create: 3 }, parameters: [{ name: 'time', type: 'time', required: true, prompt: 'askTime' }], canExecuteOffline: true, requiresConfirmation: false, priority: 5 }),
  capability({ id: 'hydration.plan', name: 'Update Hydration Plan', description: 'Update the existing reminder interval and daily target.', domain: 'hydration', required: ['hydration', 'modify'], parameters: [{ name: 'target', type: 'number', required: true, prompt: 'askTarget' }, { name: 'interval', type: 'duration', prompt: 'askInterval' }], canExecuteOffline: true, requiresConfirmation: false, priority: 3 }),

  capability({ id: 'progress.open', name: 'Open Progress', description: 'Open the existing progress dashboard.', domain: 'progress', required: ['progress'], weighted: { open: 5 }, blocked: ['read'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'progress.read', name: 'Summarize Progress', description: 'Summarize actual stored game performance without diagnosis.', domain: 'progress', required: ['progress'], weighted: { read: 5 }, canExecuteOffline: true, requiresConfirmation: false, priority: 1 }),

  capability({ id: 'settings.open', name: 'Open Settings', description: 'Open existing profile and accessibility settings.', domain: 'settings', required: ['settings'], weighted: { open: 5 }, blocked: ['language', 'text', 'contrast', 'voice', 'sound', 'motion', 'notification'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.language', name: 'Change Language', description: 'Change the app’s existing language preference.', domain: 'settings', required: ['language'], weighted: { modify: 3 }, parameters: [{ name: 'language', type: 'language', required: true, prompt: 'askLanguage' }], canExecuteOffline: true, requiresConfirmation: false, priority: 4 }),
  capability({ id: 'settings.text', name: 'Change Text Size', description: 'Change the existing text-size accessibility setting.', domain: 'settings', required: ['text'], weighted: { increase: 5, decrease: 5, modify: 3 }, parameters: [{ name: 'textSize', type: 'text', required: true, prompt: 'askTextSize' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.contrast', name: 'Change Contrast', description: 'Enable or disable existing high-contrast mode.', domain: 'settings', required: ['contrast'], parameters: [{ name: 'enabled', type: 'boolean', required: true, prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.voice', name: 'Change Voice Responses', description: 'Enable or disable Mitra voice responses.', domain: 'settings', required: ['voice'], parameters: [{ name: 'enabled', type: 'boolean', required: true, prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.sound', name: 'Change Sound Effects', description: 'Enable or disable existing game sound feedback.', domain: 'settings', required: ['sound'], parameters: [{ name: 'enabled', type: 'boolean', required: true, prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.motion', name: 'Change Reduced Motion', description: 'Enable or disable existing reduced-motion mode.', domain: 'settings', required: ['motion'], parameters: [{ name: 'enabled', type: 'boolean', required: true, prompt: 'askTitle' }], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'settings.notifications', name: 'Enable Notifications', description: 'Request notification permission using the existing workflow.', domain: 'settings', required: ['notification'], weighted: { enable: 4, settings: 2 }, canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'profile.edit', name: 'Edit Profile', description: 'Open the existing profile editor.', domain: 'profile', required: ['profile'], weighted: { modify: 5, open: 2 }, blocked: ['delete'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'caregiver.open', name: 'Open Caregiver', description: 'Open the existing caregiver dashboard.', domain: 'caregiver', required: ['caregiver'], weighted: { open: 4 }, canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'sos.open', name: 'Open SOS', description: 'Open emergency assistance without placing a call.', domain: 'safety', required: ['sos'], canExecuteOffline: true, requiresConfirmation: false, priority: 10 }),
  capability({ id: 'account.logout', name: 'Log Out', description: 'Leave the current account through the existing logout flow.', domain: 'account', required: ['logout'], canExecuteOffline: true, requiresConfirmation: true, priority: 5 }),
  capability({ id: 'account.delete', name: 'Delete Account', description: 'Use the existing account-and-data deletion workflow.', domain: 'account', required: ['delete', 'profile'], canExecuteOffline: true, requiresConfirmation: true, priority: 7 }),

  capability({ id: 'assistant.repeat', name: 'Repeat Reply', description: 'Repeat Mitra’s last response.', domain: 'assistant', required: ['repeat'], canExecuteOffline: true, requiresConfirmation: false, priority: 6 }),
  capability({ id: 'assistant.stop', name: 'Stop Voice', description: 'Stop current voice playback.', domain: 'assistant', required: ['stop', 'voice'], canExecuteOffline: true, requiresConfirmation: false, priority: 7 }),
  capability({ id: 'assistant.greeting', name: 'Greeting', description: 'Greet the actual signed-in user.', domain: 'assistant', required: ['greeting'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'assistant.wellbeing', name: 'Wellbeing Support', description: 'Offer a gentle non-medical activity suggestion.', domain: 'assistant', required: ['wellbeing'], canExecuteOffline: true, requiresConfirmation: false }),
  capability({ id: 'assistant.medical-boundary', name: 'Medical Safety Boundary', description: 'Decline diagnosis, prescribing, or medicine changes and direct the user to a qualified professional.', domain: 'safety', required: ['medicalAdvice'], canExecuteOffline: true, requiresConfirmation: false, priority: 20 }),
  capability({ id: 'assistant.help', name: 'Capability Help', description: 'Explain the actions available through the registry.', domain: 'assistant', required: ['help'], canExecuteOffline: true, requiresConfirmation: false }),
] as const;

export const capabilityById = (id: MitraCapabilityId) => MITRA_CAPABILITIES.find((item) => item.id === id);

export const MITRA_GAME_CATEGORIES: readonly Category[] = ['Memory', 'Attention', 'Pattern', 'Recognition', 'Language', 'Routine', 'Emotion', 'Cultural'];
