// ShieldBlock Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const globalToggle = document.getElementById('globalToggle');
  const shieldGraphic = document.getElementById('shieldGraphic');
  const statusBadge = document.getElementById('statusBadge');
  const toggleStateText = document.getElementById('toggleStateText');
  const tabBlockedCount = document.getElementById('tabBlockedCount');
  const totalBlockedCount = document.getElementById('totalBlockedCount');
  const currentDomainEl = document.getElementById('currentDomain');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const whitelistBtnText = document.getElementById('whitelistBtnText');
  const reloadTabBtn = document.getElementById('reloadTabBtn');

  let currentTab = null;
  let currentHost = '';
  let isWhitelisted = false;

  // Get active tab info
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    currentTab = tabs[0];
    try {
      const url = new URL(currentTab.url);
      if (url.protocol.startsWith('http')) {
        currentHost = url.hostname;
        currentDomainEl.textContent = currentHost;
      } else {
        currentHost = '';
        currentDomainEl.textContent = 'Halaman Sistem / Browser';
        whitelistBtn.style.display = 'none';
      }
    } catch {
      currentDomainEl.textContent = 'Tidak tersedia';
      whitelistBtn.style.display = 'none';
    }
  }

  // Load storage state
  chrome.storage.local.get(['shieldBlockEnabled', 'totalBlocked', 'whitelistedDomains'], (res) => {
    const isEnabled = res.shieldBlockEnabled !== false;
    const totalBlocked = res.totalBlocked || 0;
    const whitelistedDomains = res.whitelistedDomains || [];

    globalToggle.checked = isEnabled;
    updateUIState(isEnabled);
    totalBlockedCount.textContent = formatNumber(totalBlocked);

    if (currentHost) {
      isWhitelisted = whitelistedDomains.includes(currentHost);
      updateWhitelistButtonState();
    }
  });

  // Get tab blocked count from background
  if (currentTab && currentTab.id) {
    chrome.runtime.sendMessage({ action: 'getTabStats', tabId: currentTab.id }, (response) => {
      if (chrome.runtime.lastError || !response) {
        tabBlockedCount.textContent = '0';
      } else {
        tabBlockedCount.textContent = formatNumber(response.tabBlocked || 0);
      }
    });
  }

  // Update visual UI state based on on/off
  function updateUIState(active) {
    if (active) {
      statusBadge.textContent = 'Aktif';
      statusBadge.className = 'status-badge active';
      shieldGraphic.className = 'shield-circle active';
      toggleStateText.textContent = 'Perlindungan Aktif';
    } else {
      statusBadge.textContent = 'Mati';
      statusBadge.className = 'status-badge disabled';
      shieldGraphic.className = 'shield-circle disabled';
      toggleStateText.textContent = 'Perlindungan Jeda';
    }
  }

  function updateWhitelistButtonState() {
    if (isWhitelisted) {
      whitelistBtnText.textContent = 'Aktifkan kembali di situs ini';
      whitelistBtn.className = 'btn-secondary whitelisted';
    } else {
      whitelistBtnText.textContent = 'Izinkan iklan di situs ini';
      whitelistBtn.className = 'btn-secondary';
    }
  }

  function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  // Toggle global blocking
  globalToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    updateUIState(isEnabled);

    chrome.storage.local.set({ shieldBlockEnabled: isEnabled });

    // Inform background to update declarativeNetRequest ruleset
    chrome.runtime.sendMessage({
      action: 'updateGlobalStatus',
      enabled: isEnabled
    });
  });

  // Whitelist toggle for current domain
  whitelistBtn.addEventListener('click', () => {
    if (!currentHost) return;

    chrome.storage.local.get(['whitelistedDomains'], (res) => {
      let whitelisted = res.whitelistedDomains || [];

      if (isWhitelisted) {
        // Remove from whitelist
        whitelisted = whitelisted.filter((h) => h !== currentHost);
        isWhitelisted = false;
      } else {
        // Add to whitelist
        if (!whitelisted.includes(currentHost)) {
          whitelisted.push(currentHost);
        }
        isWhitelisted = true;
      }

      chrome.storage.local.set({ whitelistedDomains: whitelisted }, () => {
        updateWhitelistButtonState();
        chrome.runtime.sendMessage({
          action: 'syncWhitelist',
          whitelistedDomains: whitelisted
        });
      });
    });
  });

  // Reload Tab
  reloadTabBtn.addEventListener('click', () => {
    if (currentTab && currentTab.id) {
      chrome.tabs.reload(currentTab.id);
      window.close();
    }
  });
});
