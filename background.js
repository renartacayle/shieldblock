// ShieldBlock - Background Service Worker (Manifest V3)

const tabBlockCounts = new Map();

// Initialize extension storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['shieldBlockEnabled', 'totalBlocked', 'whitelistedDomains'], (res) => {
    const defaults = {};
    if (res.shieldBlockEnabled === undefined) defaults.shieldBlockEnabled = true;
    if (res.totalBlocked === undefined) defaults.totalBlocked = 0;
    if (!Array.isArray(res.whitelistedDomains)) defaults.whitelistedDomains = [];

    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });

  // Set badge style
  chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' }); // Indigo
});

// Update badge display for a specific tab
function updateBadge(tabId) {
  const count = tabBlockCounts.get(tabId) || 0;
  const text = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
  chrome.action.setBadgeText({ tabId, text });
}

function incrementTabBlockCount(tabId, amount = 1) {
  const current = tabBlockCounts.get(tabId) || 0;
  const updated = current + amount;
  tabBlockCounts.set(tabId, updated);
  updateBadge(tabId);

  // Increment total stats
  chrome.storage.local.get(['totalBlocked'], (res) => {
    const total = (res.totalBlocked || 0) + amount;
    chrome.storage.local.set({ totalBlocked: total });
  });
}

// Reset counter when tab navigates or loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabBlockCounts.set(tabId, 0);
    updateBadge(tabId);
  }
});

// Clean up memory when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlockCounts.delete(tabId);
});

// Update badge when user switches active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadge(activeInfo.tabId);
});

// Catch network-level blocks in developer / unpacked mode if supported
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if (info && info.request && typeof info.request.tabId === 'number' && info.request.tabId >= 0) {
      incrementTabBlockCount(info.request.tabId, 1);
    }
  });
}

// Sync dynamic whitelist rules in DeclarativeNetRequest
async function syncWhitelistRules(whitelistedDomains) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const addRules = (whitelistedDomains || []).map((domain, index) => ({
      id: 1000 + index,
      priority: 100, // Higher priority than static block rules (priority 1)
      action: { type: 'allowAllRequests' },
      condition: {
        initiatorDomains: [domain],
        resourceTypes: [
          'main_frame', 'sub_frame', 'stylesheet', 'script',
          'image', 'font', 'object', 'xmlhttprequest', 'ping',
          'media', 'websocket', 'other'
        ]
      }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: addRules
    });
  } catch (err) {
    console.error('Error syncing whitelist rules:', err);
  }
}

// Listen to messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementsBlocked' && sender.tab) {
    incrementTabBlockCount(sender.tab.id, message.count || 1);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'getTabStats') {
    const count = tabBlockCounts.get(message.tabId) || 0;
    sendResponse({ tabBlocked: count });
    return true;
  }

  if (message.action === 'updateGlobalStatus') {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: message.enabled ? ['adblock_rules'] : [],
      disableRulesetIds: message.enabled ? [] : ['adblock_rules']
    }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'syncWhitelist') {
    syncWhitelistRules(message.whitelistedDomains).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Initial sync on startup
chrome.storage.local.get(['whitelistedDomains'], (res) => {
  if (Array.isArray(res.whitelistedDomains)) {
    syncWhitelistRules(res.whitelistedDomains);
  }
});
