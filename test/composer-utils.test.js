const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyComposerMode,
  buildPromptPayload,
  contentImages,
  contentText,
  toApiMessages,
} = require('../shared/composer-utils');

const modes = {
  summarise: 'Summarise this clearly.',
  explain: 'Explain this clearly.',
};

test('toApiMessages keeps only chat roles and preserves multimodal content', () => {
  const imageMessage = [{ type: 'image_url', image_url: { url: 'data:image/png;base64,x' } }];
  assert.deepEqual(toApiMessages([
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
    { role: 'system', content: 'rules' },
    { role: 'tool', content: 'ignore' },
    { role: 'user', content: imageMessage },
  ]), [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
    { role: 'system', content: 'rules' },
    { role: 'user', content: imageMessage },
  ]);
});

test('contentText extracts text from string and text parts only', () => {
  assert.equal(contentText('plain'), 'plain');
  assert.equal(contentText([
    { type: 'text', text: 'first' },
    { type: 'image_url', image_url: { url: 'image' } },
    'second',
  ]), 'first\nsecond');
});

test('contentImages extracts image URLs from multimodal content', () => {
  assert.deepEqual(contentImages([
    { type: 'text', text: 'ignore' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,x' } },
  ]), ['data:image/png;base64,x']);
});

test('applyComposerMode prepends instructions to text and supplies image-only instructions', () => {
  assert.equal(applyComposerMode('Body', false, 'summarise', modes), 'Summarise this clearly.\n\nBody');
  assert.equal(applyComposerMode('', true, 'explain', modes), 'Explain this clearly.');
  assert.equal(applyComposerMode('', false, 'explain', modes), '');
  assert.equal(applyComposerMode('Body', false, 'unknown', modes), 'Body');
});

test('buildPromptPayload combines prompt text, attachments, mode, and images', () => {
  const payload = buildPromptPayload({
    content: 'Question',
    draftTexts: [{ label: 'Entire page', text: 'Page text' }],
    draftImages: [{ url: 'data:image/png;base64,x' }],
    composerMode: 'summarise',
    promptModes: modes,
  });

  assert.deepEqual(payload.prompt, [
    { type: 'text', text: 'Summarise this clearly.\n\nQuestion\n\nEntire page:\nPage text' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,x' } },
  ]);
  assert.equal(payload.displayText, 'Summarise this clearly.\n\nQuestion\n\nEntire page:\nPage text');
  assert.deepEqual(payload.imageUrls, ['data:image/png;base64,x']);
});
