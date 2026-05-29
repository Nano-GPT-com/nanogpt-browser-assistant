document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('floating-icon-toggle');
  const shortcutSpan = document.getElementById('current-shortcut');
  const blacklistContainer = document.getElementById('blacklist-items');
  const addSiteButton = document.getElementById('add-site');
  
  // Load current setting
  browser.storage.local.get('floatingIconEnabled').then(result => {
    toggle.checked = result.floatingIconEnabled !== false;
  });

  // Get and display current shortcut
  browser.commands.getAll().then(commands => {
    const searchCommand = commands.find(command => command.name === "toggle-search-bar");
    if (searchCommand && searchCommand.shortcut) {
      shortcutSpan.textContent = searchCommand.shortcut;
    } else {
      shortcutSpan.textContent = 'Not set';
    }
  });

  // Save setting when changed
  toggle.addEventListener('change', () => {
    browser.storage.local.set({ floatingIconEnabled: toggle.checked }).then(() => {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        browser.tabs.reload(tabs[0].id);
      });
    });
  });

  // Load blacklist
  function loadBlacklist() {
    browser.storage.local.get('blacklistedDomains').then(result => {
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
        browser.storage.local.set({ blacklistedDomains: updatedBlacklist }).then(() => {
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
      browser.storage.local.get('blacklistedDomains').then(result => {
        const blacklist = result.blacklistedDomains || ['nano-gpt.com'];
        if (!blacklist.includes(domain)) {
          blacklist.push(domain);
          browser.storage.local.set({ blacklistedDomains: blacklist }).then(() => {
            loadBlacklist();
          });
        }
      });
    }
  });

  // Initial load
  loadBlacklist();
});
