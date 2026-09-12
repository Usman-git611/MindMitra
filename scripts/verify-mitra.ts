import assert from 'node:assert/strict';
import { MITRA_CAPABILITIES } from '../lib/mitra-capabilities';
import { understandMitraRequest } from '../lib/mitra-intent';

const resolved = (text: string, context = {}) => understandMitraRequest(text, context);
const capability = (text: string, context = {}) => resolved(text, context).capabilityId;

assert.equal(new Set(MITRA_CAPABILITIES.map((item) => item.id)).size, MITRA_CAPABILITIES.length, 'capability ids must be unique');
assert.ok(MITRA_CAPABILITIES.length >= 50, 'the registry should cover the real app surface');
assert.ok(MITRA_CAPABILITIES.every((item) => typeof item.canExecuteOffline === 'boolean' && typeof item.requiresConfirmation === 'boolean'));

assert.equal(capability('Can you give me something to test my memory?'), 'games.start');
assert.equal(capability('Show me memory games'), 'games.open');
assert.equal(resolved('Show me memory games').parameters.category, 'Memory');
assert.equal(capability('Mitra, start a 15 minute memory session'), 'session.start');
assert.equal(resolved('Mitra, start a 15 minute memory session').parameters.minutes, 15);

const sessionQuestion = resolved('Start a session');
assert.equal(sessionQuestion.state, 'needs-parameter');
assert.deepEqual(sessionQuestion.missingParameters, ['minutes']);
const sessionFollowUp = resolved('30 minutes', { pendingCapability: 'session.start', missingParameters: ['minutes'], collectedParameters: {} });
assert.equal(sessionFollowUp.state, 'ready');
assert.equal(sessionFollowUp.parameters.minutes, 30);

assert.equal(capability("I'm bored"), 'assistant.wellbeing');
assert.equal(capability('yes', { pendingCapability: 'games.start', awaitingConfirmation: true, collectedParameters: { category: 'Memory', difficulty: 'Easy' } }), 'games.start');
assert.equal(capability('Talk to me in Hindi'), 'settings.language');
assert.equal(resolved('Talk to me in Hindi').parameters.language, 'hi');
assert.equal(resolved('English mein bolo').parameters.language, 'en');
assert.equal(resolved('বাংলায় কথা বলো').parameters.language, 'bn');
assert.equal(resolved('অসমীয়াত কথা কওক').parameters.language, 'as');

assert.equal(capability('Remind me to drink water in 20 minutes'), 'hydration.reminder');
assert.match(String(resolved('Remind me to drink water in 20 minutes').parameters.time), /^\d{2}:\d{2}$/);
assert.equal(capability('When is my medicine?'), 'medicine.read');
assert.equal(capability('What should I do next?'), 'routine.read');
assert.equal(capability('When is my next appointment?'), 'appointment.read');
assert.equal(capability('Explain my progress'), 'progress.read');
assert.equal(capability('Open my family'), 'family.open');
assert.equal(capability('Increase the text size'), 'settings.text');
assert.equal(capability("Mitra, I don't understand this", { currentScreen: 'game' }), 'games.explain');
assert.equal(capability('SOS emergency'), 'sos.open');
assert.equal(capability('Help me understand what you can do'), 'assistant.help');
assert.equal(capability('Please diagnose dementia'), 'assistant.medical-boundary');

const reminder = resolved('Add a reminder');
assert.equal(reminder.capabilityId, 'reminder.create');
assert.equal(reminder.state, 'needs-parameter');
assert.equal(reminder.missingParameters[0], 'reminderKind');
const reminderKind = resolved('water', { pendingCapability: 'reminder.create', missingParameters: reminder.missingParameters, collectedParameters: reminder.parameters });
assert.equal(reminderKind.parameters.reminderKind, 'hydration');
assert.equal(reminderKind.parameters.title, 'Drink a glass of water');
assert.equal(reminderKind.missingParameters[0], 'time');
const reminderTime = resolved('2 PM', { pendingCapability: 'reminder.create', missingParameters: reminderKind.missingParameters, collectedParameters: reminderKind.parameters });
assert.equal(reminderTime.state, 'ready');
assert.equal(reminderTime.parameters.time, '14:00');

const deletion = resolved('Delete my profile');
assert.equal(deletion.capabilityId, 'account.delete');
assert.equal(deletion.state, 'needs-confirmation');
assert.equal(resolved('no', { pendingCapability: 'account.delete', awaitingConfirmation: true }).state, 'cancelled');

console.log(`Mitra registry verification passed: ${MITRA_CAPABILITIES.length} capabilities with multilingual, multi-turn, safety and confirmation cases.`);
