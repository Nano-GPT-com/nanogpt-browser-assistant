// background.js
importScripts('shared/background-utils.js');

const PENDING_PROMPT_KEY = 'nanogpt_pending_sidepanel_prompt';
const openSidePanelTabs = new Set();
const { apiErrorDetails, createChatStreamForwarder } = NanoGPTBackgroundUtils;

function hasTabSender(sender) {
  return Boolean(sender && sender.tab && typeof sender.tab.id === 'number');
}

function configureSidePanel() {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  if (chrome.sidePanel && chrome.sidePanel.onOpened) {
    chrome.sidePanel.onOpened.addListener((info) => {
      if (typeof info.tabId === 'number') {
        openSidePanelTabs.add(info.tabId);
      }
    });
  }

  if (chrome.sidePanel && chrome.sidePanel.onClosed) {
    chrome.sidePanel.onClosed.addListener((info) => {
      if (typeof info.tabId === 'number') {
        openSidePanelTabs.delete(info.tabId);
      }
    });
  }
}

function createContextMenus() {
  if (!chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'nanogpt-ask-selection',
      title: 'Ask NanoGPT about "%s"',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'nanogpt-ask-image',
      title: 'Ask NanoGPT about this image',
      contexts: ['image'],
    });

    chrome.contextMenus.create({
      id: 'nanogpt-circle-search',
      title: 'Circle to search with NanoGPT',
      contexts: ['page', 'selection', 'image'],
    });
  });
}

function canInjectContentScript(tab) {
  return Boolean(tab && tab.id && typeof tab.url === 'string' && /^(https?:|file:)/.test(tab.url));
}

function refreshContentScriptsInOpenTabs() {
  if (!chrome.scripting || !chrome.tabs) return;

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs || []) {
      if (!canInjectContentScript(tab)) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['shared/content-utils.js', 'content.js'],
      }, () => {
        void chrome.runtime.lastError;
      });
    }
  });
}

function sendPanelMessage(message) {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}

function sendChatStreamMessage(requestId, payload) {
  sendPanelMessage({
    requestId,
    ...payload,
  });
}

const forwardChatStream = createChatStreamForwarder(sendChatStreamMessage);

function openSidePanelForTab(tab) {
  if (chrome.sidePanel && chrome.sidePanel.open && tab && tab.id) {
    openSidePanelTabs.add(tab.id);
    chrome.sidePanel.open({ tabId: tab.id })
      .then(() => {
        openSidePanelTabs.add(tab.id);
      })
      .catch(() => {
        openSidePanelTabs.delete(tab.id);
      });
    return;
  }
}

async function closeSidePanelForTab(tab) {
  if (!(chrome.sidePanel && chrome.sidePanel.close)) return false;

  const closeOptions = [];
  if (tab && typeof tab.id === 'number') closeOptions.push({ tabId: tab.id });
  if (tab && typeof tab.windowId === 'number') closeOptions.push({ windowId: tab.windowId });

  for (const options of closeOptions) {
    try {
      await chrome.sidePanel.close(options);
      if (typeof tab.id === 'number') openSidePanelTabs.delete(tab.id);
      return true;
    } catch {
      // A global side panel rejects tab-specific close calls in recent Chrome.
    }
  }

  if (tab && typeof tab.id === 'number') openSidePanelTabs.delete(tab.id);
  return false;
}

async function toggleSidePanelForTab(tab) {
  if (!tab || typeof tab.id !== 'number') {
    openSidePanelForTab(tab);
    return;
  }

  if (openSidePanelTabs.has(tab.id)) {
    await closeSidePanelForTab(tab);
    return;
  }

  openSidePanelForTab(tab);
}

function setPendingPrompt(payload, tab) {
  chrome.storage.local.set({
    [PENDING_PROMPT_KEY]: {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...payload,
    },
  }, () => openSidePanelForTab(tab));
}

chrome.runtime.onInstalled.addListener(function() {
  // Set default values
  chrome.storage.local.set({
    onlineSearchEnabled: true,
    floatingIconEnabled: true
  });

  configureSidePanel();
  createContextMenus();
  refreshContentScriptsInOpenTabs();
});

chrome.runtime.onStartup.addListener(createContextMenus);

configureSidePanel();

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-search-bar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      toggleSidePanelForTab(tab);
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openShortcuts") {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openPopup") {
    toggleSidePanelForTab(sender.tab);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
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
    chrome.tabs.sendMessage(tab.id, { action: 'nanogpt_start_circle_search' }, () => {
      if (chrome.runtime.lastError) {
        setPendingPrompt({
          text: 'Circle to search is not available on this page.',
        }, tab);
      }
    });
  }
});

// Proxy NanoGPT chat requests, injecting the stored API key securely
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'nanogpt_chat_stream') {
    const body = { ...(request.body || {}), stream: true };
    const requestId = request.requestId;

    chrome.storage.local.get('nanogpt_api_key', async (res) => {
      const apiKey = res.nanogpt_api_key;
      if (!apiKey) {
        sendResponse({ ok: false, authRequired: true, error: 'You are not signed in.' });
        return;
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
          sendResponse({ ok: false, error: details.message, requestId: details.requestId, status: resp.status });
          return;
        }

        sendResponse({ ok: true });
        forwardChatStream(requestId, resp).catch((err) => {
          sendChatStreamMessage(requestId, {
            action: 'nanogpt_chat_error',
            error: err && err.message ? err.message : String(err),
          });
        });
      } catch (err) {
        sendResponse({ ok: false, error: String(err), requestId });
      }
    });
    return true;
  }

  if (request.action === 'nanogpt_chat') {
    const body = request.body || {};
    const requestId = request.requestId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    // Read API key from extension storage; do not expose to the page
    chrome.storage.local.get('nanogpt_api_key', async (res) => {
      const apiKey = res.nanogpt_api_key;
      if (!apiKey) {
        sendResponse({ ok: false, authRequired: true, error: 'You are not signed in.' });
        return;
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
          sendResponse({ ok: false, error: details.message, requestId: details.requestId, status: resp.status });
          return;
        }
        const json = await resp.json();
        const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        sendResponse({ ok: true, content, raw: json });
      } catch (err) {
        sendResponse({ ok: false, error: String(err), requestId });
      }
    });
    // Keep the message channel open for async response
    return true;
  }

  if (request.action === 'nanogpt_capture_visible_tab') {
    const tab = sender.tab;
    if (!tab || !tab.windowId) {
      sendResponse({ ok: false, error: 'No active tab available for capture.' });
      return;
    }

    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, dataUrl });
    });
    return true;
  }

  if (request.action === 'nanogpt_circle_search_image') {
    if (!hasTabSender(sender)) {
      sendResponse({ ok: false, error: 'Invalid sender.' });
      return;
    }
    const imageUrl = request.imageUrl;
    if (!imageUrl) {
      sendResponse({ ok: false, error: 'Missing cropped image.' });
      return;
    }

    setPendingPrompt({
      text: request.text || '',
      imageUrl,
      attachmentLabel: request.attachmentLabel || (request.text ? 'Area' : 'Image'),
    }, sender.tab);
    sendResponse({ ok: true });
    return;
  }

  if (request.action === 'nanogpt_selection_text') {
    if (!hasTabSender(sender)) {
      sendResponse({ ok: false, error: 'Invalid sender.' });
      return;
    }
    const text = typeof request.text === 'string' ? request.text.trim() : '';
    if (!text) {
      sendResponse({ ok: false, error: 'No text selected.' });
      return;
    }
    setPendingPrompt({ text, draft: true }, sender.tab);
    sendResponse({ ok: true });
    return;
  }
});
