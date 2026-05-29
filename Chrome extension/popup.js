document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('floating-icon-toggle');
  const shortcutSpan = document.getElementById('current-shortcut');
  const editShortcutBtn = document.getElementById('edit-shortcut');
  const blacklistContainer = document.getElementById('blacklist-items');
  const addSiteButton = document.getElementById('add-site');
  const apiKeyInput = document.getElementById('api-key');
  const saveKeyBtn = document.getElementById('save-key');
  const toggleKeyBtn = document.getElementById('toggle-key');
  const toastEl = document.getElementById('toast');

  function showToast(message, isError) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('error');
    if (isError) toastEl.classList.add('error');
    toastEl.classList.add('show');
    setTimeout(() => { toastEl.classList.remove('show'); }, 2000);
  }
  
  // Load current setting
  chrome.storage.local.get('floatingIconEnabled', result => {
    toggle.checked = result.floatingIconEnabled !== false;
  });

  // Get and display current shortcut
  chrome.commands.getAll(commands => {
    const searchCommand = commands.find(command => command.name === "toggle-search-bar");
    if (searchCommand && searchCommand.shortcut) {
      shortcutSpan.textContent = searchCommand.shortcut;
    } else {
      shortcutSpan.textContent = 'Not set';
    }
  });

  // Load saved API key presence (do not display full value)
  chrome.storage.local.get('nanogpt_api_key', result => {
    if (result.nanogpt_api_key) {
      apiKeyInput.value = '••••••••••••••';
      apiKeyInput.dataset.masked = 'true';
    }
  });

  // Save API key
  saveKeyBtn.addEventListener('click', () => {
    const isMasked = apiKeyInput.dataset.masked === 'true';
    if (isMasked) {
      // Nothing typed; keep existing key
      showToast('API key unchanged.');
      return;
    }
    const value = (apiKeyInput.value || '').trim();
    if (!value) {
      showToast('Enter an API key to save.');
      return;
    }
    chrome.storage.local.set({ nanogpt_api_key: value }, () => {
      apiKeyInput.type = 'password';
      apiKeyInput.value = '••••••••••••••';
      apiKeyInput.dataset.masked = 'true';
      // Reset eye icon to eye state
      const eyeIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      toggleKeyBtn.innerHTML = eyeIcon;
      showToast('API key saved locally in the extension.');
    });
  });

  // Show/Hide API key
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.dataset.masked === 'true') {
      chrome.storage.local.get('nanogpt_api_key', result => {
        apiKeyInput.value = result.nanogpt_api_key || '';
        apiKeyInput.dataset.masked = '';
        apiKeyInput.type = 'text';
        toggleKeyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.83 21.83 0 0 1-3.06 4.5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      });
    } else {
      apiKeyInput.type = 'password';
      apiKeyInput.value = apiKeyInput.value ? '••••••••••••••' : '';
      apiKeyInput.dataset.masked = 'true';
      toggleKeyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  });

  // Direct link to Chrome shortcuts
  editShortcutBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    window.close();
  });

  // Save setting when changed
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ floatingIconEnabled: toggle.checked });
    
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.reload(tabs[0].id);
    });
  });

  // Load blacklist
  function loadBlacklist() {
    chrome.storage.local.get('blacklistedDomains', result => {
      const blacklist = result.blacklistedDomains || ['nano-gpt.com'];
      updateBlacklistUI(blacklist);
    });
  }

  // Update blacklist UI
  function updateBlacklistUI(blacklist) {
    blacklistContainer.innerHTML = '';
    
    if (blacklist.length === 0) {
      blacklistContainer.innerHTML = '<div class="blacklist-empty">No sites added</div>';
      return;
    }

    blacklist.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'blacklist-item';
      item.innerHTML = `
        <span>${domain}</span>
        <button class="blacklist-remove" title="Remove site">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      item.querySelector('button').addEventListener('click', () => {
        const updatedBlacklist = blacklist.filter(d => d !== domain);
        chrome.storage.local.set({ blacklistedDomains: updatedBlacklist }, () => {
          loadBlacklist();
        });
      });

      blacklistContainer.appendChild(item);
    });
  }

  // Add new site
  addSiteButton.addEventListener('click', () => {
    const domain = prompt('Enter domain (e.g., example.com):');
    if (domain) {
      chrome.storage.local.get('blacklistedDomains', result => {
        const blacklist = result.blacklistedDomains || ['nano-gpt.com'];
        if (!blacklist.includes(domain)) {
          blacklist.push(domain);
          chrome.storage.local.set({ blacklistedDomains: blacklist }, () => {
            loadBlacklist();
          });
        }
      });
    }
  });

  // Initial load
  loadBlacklist();
});
