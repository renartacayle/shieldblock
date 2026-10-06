// ShieldBlock - YouTube Bridge (Isolated World)
// Handles communication between Chrome Extension APIs and MAIN world YouTube script

(function () {
  'use strict';

  function sendConfigToMainWorld() {
    chrome.storage.local.get(['shieldBlockEnabled', 'whitelistedDomains'], (res) => {
      const globallyEnabled = res.shieldBlockEnabled !== false;
      const whitelisted = Array.isArray(res.whitelistedDomains) &&
        (res.whitelistedDomains.includes('youtube.com') || res.whitelistedDomains.includes('www.youtube.com'));

      const isEnabled = globallyEnabled && !whitelisted;
      window.postMessage({
        type: 'SHIELDBLOCK_CONFIG',
        enabled: isEnabled
      }, '*');
    });
  }

  // Initial config broadcast
  sendConfigToMainWorld();

  // Listen for storage changes (e.g. popup toggle)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.shieldBlockEnabled || changes.whitelistedDomains)) {
      sendConfigToMainWorld();
    }
  });

  // Listen for ad skipped reports from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'SHIELDBLOCK_AD_BLOCKED') {
      chrome.runtime.sendMessage({
        action: 'elementsBlocked',
        count: 1,
        host: 'youtube.com'
      }).catch(() => {});
    } else if (event.data.type === 'SHIELDBLOCK_REQUEST_CONFIG') {
      sendConfigToMainWorld();
    }
  });
})();
