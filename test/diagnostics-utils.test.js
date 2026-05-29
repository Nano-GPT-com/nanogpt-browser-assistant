const test = require('node:test');
const assert = require('node:assert/strict');
const {
  appendDiagnosticError,
  buildDiagnosticsPayload,
  cleanString,
  sanitizeErrorEntry,
} = require('../shared/diagnostics-utils');

test('cleanString redacts URLs, image data, and API-key-like strings', () => {
  assert.equal(
    cleanString('Failed at https://example.com/path with sk-secretabcdef123456 and data:image/png;base64,aaaa'),
    'Failed at [url] with [api-key] and [image-data]',
  );
});

test('appendDiagnosticError keeps a bounded sanitized error buffer', () => {
  const errors = appendDiagnosticError(
    [{ timestamp: 1, component: 'old', action: 'first', message: 'old' }],
    { component: 'sidepanel', action: 'send', message: 'bad https://page.example/private', requestId: 'req_1' },
    1,
  );

  assert.deepEqual(errors, [{
    timestamp: errors[0].timestamp,
    component: 'sidepanel',
    action: 'send',
    message: 'bad [url]',
    requestId: 'req_1',
  }]);
});

test('buildDiagnosticsPayload excludes content and records only safe state', () => {
  const payload = buildDiagnosticsPayload({
    manifest: { name: 'NanoGPT Browser Assistant', version: '1.2.3' },
    browser: 'Test Browser',
    platform: 'Test OS',
    settings: {
      onlineSearchEnabled: true,
      floatingIconEnabled: false,
      floatingIconCorner: 'bottom-right',
      hasApiKey: true,
      apiKey: 'sk-should-not-appear',
    },
    state: {
      localMessageCount: 2,
      model: 'openai/gpt-chat-latest',
      online: true,
      composerMode: 'summarise',
      draftImageCount: 1,
      draftTextCount: 1,
      prompt: 'should not appear',
    },
    errors: [sanitizeErrorEntry({ action: 'submit', message: 'nope' })],
  });

  assert.equal(payload.extension.version, '1.2.3');
  assert.equal(payload.settings.hasApiKey, true);
  assert.equal(payload.settings.apiKey, undefined);
  assert.equal(payload.conversation.localMessageCount, 2);
  assert.equal(payload.conversation.prompt, undefined);
  assert.equal(payload.recentErrors.length, 1);
});
