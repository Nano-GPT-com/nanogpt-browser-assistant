(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NanoGPTBackgroundUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const REQUEST_ID_HEADERS = [
    'x-request-id',
    'x-nanogpt-request-id',
    'x-vercel-id',
    'cf-ray',
    'openai-request-id',
    'anthropic-request-id',
  ];

  function streamDeltaFromChunk(chunk) {
    const choice = chunk && chunk.choices && chunk.choices[0];
    if (!choice) return '';
    if (choice.delta && typeof choice.delta.content === 'string') return choice.delta.content;
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content;
    if (typeof choice.text === 'string') return choice.text;
    return '';
  }

  function responseRequestId(response) {
    if (!response || !response.headers || typeof response.headers.get !== 'function') return '';
    return REQUEST_ID_HEADERS
      .map((header) => response.headers.get(header))
      .find(Boolean) || '';
  }

  function apiErrorDetails(response, text, fallbackRequestId = '') {
    const status = response && typeof response.status === 'number' ? response.status : 'unknown';
    const fallback = `NanoGPT request failed (${status}).`;
    const raw = String(text || '').trim();
    const headerRequestId = responseRequestId(response);
    let requestId = headerRequestId || fallbackRequestId || '';
    if (!raw) return { message: fallback, requestId };

    try {
      const parsed = JSON.parse(raw);
      requestId = parsed?.request_id || parsed?.requestId || parsed?.id || parsed?.error?.request_id || parsed?.error?.requestId || requestId;
      const message = parsed?.error?.message || parsed?.message || parsed?.error;
      if (typeof message === 'string' && message.trim()) return { message: message.trim(), requestId };
    } catch {
      // Fall through to cleaned text.
    }

    return { message: raw.replace(/^API error\s+\d+:\s*/i, '').trim() || fallback, requestId };
  }

  function eventDataFromSseBlock(eventText) {
    return String(eventText || '')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();
  }

  function handleStreamEvent(eventText, emit) {
    const data = eventDataFromSseBlock(eventText);
    if (!data) return false;
    if (data === '[DONE]') {
      emit({ type: 'done' });
      return true;
    }

    try {
      const parsed = JSON.parse(data);
      const delta = streamDeltaFromChunk(parsed);
      if (delta) emit({ type: 'delta', delta });
    } catch {
      // Ignore malformed stream frames; the request will still finish or error.
    }
    return false;
  }

  function createChatStreamForwarder(sendChatStreamMessage) {
    return async function forwardChatStream(requestId, response) {
      if (!response.body || !response.body.getReader) {
        throw new Error('Streaming response body is not available.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      const emit = (event) => {
        if (event.type === 'done') {
          completed = true;
          sendChatStreamMessage(requestId, { action: 'nanogpt_chat_done' });
        } else if (event.type === 'delta') {
          sendChatStreamMessage(requestId, { action: 'nanogpt_chat_delta', delta: event.delta });
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || '';
        for (const part of parts) {
          handleStreamEvent(part, emit);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        handleStreamEvent(buffer, emit);
      }

      if (!completed) {
        sendChatStreamMessage(requestId, { action: 'nanogpt_chat_done' });
      }
    };
  }

  return {
    apiErrorDetails,
    createChatStreamForwarder,
    eventDataFromSseBlock,
    handleStreamEvent,
    responseRequestId,
    streamDeltaFromChunk,
  };
});
