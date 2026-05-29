// background.js
const PENDING_PROMPT_KEY = 'nanogpt_pending_sidebar_prompt';
const { apiErrorDetails, createChatStreamForwarder } = NanoGPTBackgroundUtils;

function hasTabSender(sender) {
  return Boolean(sender && sender.tab && typeof sender.tab.id === 'number');
}

function openSidebar(tab) {
  if (browser.sidebarAction && browser.sidebarAction.open) {
    return browser.sidebarAction.open()
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, error: error && error.message ? error.message : String(error) }));
  }

  return Promise.resolve({ ok: false, error: 'Firefox sidebar API is not available.' });
}

function toggleSidebar(tab) {
  if (!browser.sidebarAction) return Promise.resolve({ ok: false, error: 'Firefox sidebar API is not available.' });

  const windowId = tab && typeof tab.windowId === 'number' ? tab.windowId : undefined;
  const details = typeof windowId === 'number' ? { windowId } : {};

  if (browser.sidebarAction.isOpen && browser.sidebarAction.close) {
    return browser.sidebarAction.isOpen(details)
      .then((isOpen) => (isOpen ? browser.sidebarAction.close() : browser.sidebarAction.open()))
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, error: error && error.message ? error.message : String(error) }));
  }

  if (browser.sidebarAction.toggle) {
    return browser.sidebarAction.toggle()
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, error: error && error.message ? error.message : String(error) }));
  }

  return openSidebar(tab);
}

function setPendingPrompt(payload, tab) {
  return browser.storage.local.set({
    [PENDING_PROMPT_KEY]: {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...payload,
    },
  }).then(() => openSidebar(tab));
}

function sendChatStreamMessage(requestId, payload) {
  browser.runtime.sendMessage({
    requestId,
    ...payload,
  }).catch(() => undefined);
}

const forwardChatStream = createChatStreamForwarder(sendChatStreamMessage);

function createContextMenus() {
  if (!browser.contextMenus) return;

  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: 'nanogpt-ask-selection',
      title: 'Ask NanoGPT about "%s"',
      contexts: ['selection'],
    });

    browser.contextMenus.create({
      id: 'nanogpt-ask-image',
      title: 'Ask NanoGPT about this image',
      contexts: ['image'],
    });

    browser.contextMenus.create({
      id: 'nanogpt-circle-search',
      title: 'Circle to search with NanoGPT',
      contexts: ['page', 'selection', 'image'],
    });
  });
}

browser.runtime.onInstalled.addListener(function() {
  // Set default values
  browser.storage.local.set({
    onlineSearchEnabled: true,
    floatingIconEnabled: true,
    blacklistedDomains: ['nano-gpt.com']
  });

  createContextMenus();
});

browser.browserAction.onClicked.addListener((tab) => {
  toggleSidebar(tab);
});

createContextMenus();

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-search-bar") {
    browser.tabs.query({ active: true, currentWindow: true })
      .then((tabs) => toggleSidebar(tabs[0]))
      .catch(() => toggleSidebar());
  }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openPopup") {
    return toggleSidebar(sender.tab);
  }
  return undefined;
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'nanogpt-ask-selection') {
    const selectedText = (info.selectionText || '').trim();
    if (!selectedText) return;
    setPendingPrompt({
      text: selectedText,
      draft: true,
    }, tab);
    return;
  }

  if (info.menuItemId === 'nanogpt-ask-image') {
    if (!info.srcUrl) return;
    setPendingPrompt({
      imageUrl: info.srcUrl,
      attachmentLabel: 'Image',
    }, tab);
    return;
  }

  if (info.menuItemId === 'nanogpt-circle-search' && tab && tab.id) {
    browser.tabs.sendMessage(tab.id, { action: 'nanogpt_start_circle_search' }).catch(() => {
      setPendingPrompt({
        text: 'Circle to search is not available on this page.',
      }, tab);
    });
  }
});

// Proxy NanoGPT chat requests, injecting the stored API key securely.
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'nanogpt_capture_visible_tab') {
    return browser.tabs.captureVisibleTab(undefined, { format: 'png' })
      .then((dataUrl) => ({ ok: true, dataUrl }))
      .catch((err) => ({ ok: false, error: String(err) }));
  }

  if (request.action === 'nanogpt_circle_search_image') {
    if (!hasTabSender(sender)) {
      return Promise.resolve({ ok: false, error: 'Invalid sender.' });
    }
    if (!request.imageUrl) {
      return Promise.resolve({ ok: false, error: 'Missing cropped image.' });
    }

    return setPendingPrompt({
      text: request.text || '',
      imageUrl: request.imageUrl,
      attachmentLabel: request.attachmentLabel || (request.text ? 'Area' : 'Image'),
    }, sender.tab).then(() => ({ ok: true }));
  }

  if (request.action === 'nanogpt_selection_text') {
    if (!hasTabSender(sender)) {
      return Promise.resolve({ ok: false, error: 'Invalid sender.' });
    }
    const text = typeof request.text === 'string' ? request.text.trim() : '';
    if (!text) {
      return Promise.resolve({ ok: false, error: 'No text selected.' });
    }
    return setPendingPrompt({ text, draft: true }).then(() => ({ ok: true }));
  }

  if (request.action === 'nanogpt_chat_stream') {
    const body = { ...(request.body || {}), stream: true };
    const requestId = request.requestId;

    return browser.storage.local.get('nanogpt_api_key')
      .then(async (res) => {
        const apiKey = res.nanogpt_api_key;
        if (!apiKey) {
          return { ok: false, authRequired: true, error: 'You are not signed in.' };
        }

        try {
          const resp = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-NanoGPT-Client-Request-Id': requestId
            },
            body: JSON.stringify(body)
          });

          if (!resp.ok) {
            const text = await resp.text();
            const details = apiErrorDetails(resp, text, requestId);
            return { ok: false, error: details.message, requestId: details.requestId, status: resp.status };
          }

          forwardChatStream(requestId, resp).catch((err) => {
            sendChatStreamMessage(requestId, {
              action: 'nanogpt_chat_error',
              error: err && err.message ? err.message : String(err),
            });
          });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: String(err), requestId };
        }
      });
  }

  if (request.action !== 'nanogpt_chat') {
    return undefined;
  }

  const body = request.body || {};
  const requestId = request.requestId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return browser.storage.local.get('nanogpt_api_key')
    .then(async (res) => {
      const apiKey = res.nanogpt_api_key;
      if (!apiKey) {
        return { ok: false, authRequired: true, error: 'You are not signed in.' };
      }

      try {
        const resp = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-NanoGPT-Client-Request-Id': requestId
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const text = await resp.text();
          const details = apiErrorDetails(resp, text, requestId);
          return { ok: false, error: details.message, requestId: details.requestId, status: resp.status };
        }

        const json = await resp.json();
        const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        return { ok: true, content, raw: json };
      } catch (err) {
        return { ok: false, error: String(err), requestId };
      }
    });
});
