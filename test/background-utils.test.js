const test = require('node:test');
const assert = require('node:assert/strict');
const {
  apiErrorDetails,
  eventDataFromSseBlock,
  handleStreamEvent,
  responseRequestId,
  streamDeltaFromChunk,
} = require('../shared/background-utils');

function response(status, headers = {}) {
  return {
    status,
    headers: {
      get(name) {
        return headers[name] || headers[name.toLowerCase()] || '';
      },
    },
  };
}

test('streamDeltaFromChunk supports OpenAI-compatible delta shapes', () => {
  assert.equal(streamDeltaFromChunk({ choices: [{ delta: { content: 'hi' } }] }), 'hi');
  assert.equal(streamDeltaFromChunk({ choices: [{ message: { content: 'done' } }] }), 'done');
  assert.equal(streamDeltaFromChunk({ choices: [{ text: 'legacy' }] }), 'legacy');
  assert.equal(streamDeltaFromChunk({ choices: [] }), '');
});

test('responseRequestId prefers known provider request headers', () => {
  assert.equal(responseRequestId(response(400, { 'x-nanogpt-request-id': 'nano-1' })), 'nano-1');
  assert.equal(responseRequestId(response(400, { 'cf-ray': 'cf-1' })), 'cf-1');
  assert.equal(responseRequestId(response(400)), '');
});

test('apiErrorDetails extracts clean messages and request ids from JSON errors', () => {
  const details = apiErrorDetails(
    response(400, { 'x-request-id': 'header-id' }),
    JSON.stringify({ error: { message: 'Blocked', request_id: 'body-id' } }),
    'fallback-id',
  );

  assert.deepEqual(details, { message: 'Blocked', requestId: 'body-id' });
});

test('apiErrorDetails cleans prefixed raw API errors', () => {
  const details = apiErrorDetails(response(429), 'API error 429: Too many requests', 'fallback-id');
  assert.deepEqual(details, { message: 'Too many requests', requestId: 'fallback-id' });
});

test('eventDataFromSseBlock joins multiline data frames', () => {
  assert.equal(eventDataFromSseBlock('event: message\ndata: {"a":1}\ndata: {"b":2}\n'), '{"a":1}\n{"b":2}');
});

test('handleStreamEvent emits deltas and completion markers', () => {
  const events = [];
  const done = handleStreamEvent('data: {"choices":[{"delta":{"content":"x"}}]}', (event) => events.push(event));
  assert.equal(done, false);
  assert.deepEqual(events, [{ type: 'delta', delta: 'x' }]);

  const completed = handleStreamEvent('data: [DONE]', (event) => events.push(event));
  assert.equal(completed, true);
  assert.deepEqual(events[1], { type: 'done' });
});
