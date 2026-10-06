// ShieldBlock Content Script

(function () {
  'use strict';

  let blockedCount = 0;
  let isEnabled = true;

  const currentHost = window.location.hostname;

  // Check state from storage
  chrome.storage.local.get(['shieldBlockEnabled', 'whitelistedDomains'], (res) => {
    const globallyEnabled = res.shieldBlockEnabled !== false;
    const whitelisted = Array.isArray(res.whitelistedDomains) && res.whitelistedDomains.includes(currentHost);

    if (!globallyEnabled || whitelisted) {
      isEnabled = false;
      return;
    }

    startBlocking();
  });

  const adSelectors = [
    'ins.adsbygoogle',
    '.adsbygoogle',
    '[data-ad-client]',
    '[data-ad-slot]',
    '[data-google-query-id]',
    'iframe[id^="google_ads_"]',
    'iframe[id^="aswift_"]',
    '[id^="taboola-"]',
    '[class^="taboola-"]',
    '.trc_related_container',
    '.outbrain-container',
    '.OUTBRAIN',
    '.ad-container',
    '.ad-wrapper',
    '.ad-banner',
    '.ad-slot',
    '.ad-box',
    '.ad-unit',
    '.ad_unit',
    '.advert-wrapper',
    '.sponsored-post',
    '[class*="floating-ad"]',
    '[id*="floating-ad"]',
    '[class*="sticky-ad"]',
    '[id*="sticky-ad"]'
  ];

  function cleanAdElements() {
    if (!isEnabled) return;

    let newlyBlocked = 0;
    try {
      adSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (!el.dataset.sbCleaned) {
            el.dataset.sbCleaned = 'true';
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('height', '0px', 'important');
            newlyBlocked++;
          }
        });
      });
    } catch (e) {
      // Ignore selector errors
    }

    if (newlyBlocked > 0) {
      blockedCount += newlyBlocked;
      notifyBackground(newlyBlocked);
    }
  }

  function notifyBackground(increment) {
    chrome.runtime.sendMessage({
      action: 'elementsBlocked',
      count: increment,
      host: currentHost
    }).catch(() => {
      // Context might be invalidated on tab close
    });
  }

  function preventAntiAdblockScrollLocks() {
    // If sites try to lock scroll with overflow: hidden on html/body
    const observer = new MutationObserver(() => {
      if (document.body && document.body.style.overflow === 'hidden') {
        const hasOverlay = document.querySelector('.adblock-overlay, .ad-blocker-overlay, [class*="anti-adblock"]');
        if (hasOverlay) {
          hasOverlay.style.display = 'none';
          document.body.style.overflow = 'auto';
          if (document.documentElement) document.documentElement.style.overflow = 'auto';
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true
    });
  }

  function startBlocking() {
    // Run immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cleanAdElements);
    } else {
      cleanAdElements();
    }

    // Set up MutationObserver for dynamically injected ad units
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) {
        cleanAdElements();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    preventAntiAdblockScrollLocks();

    // Check again after page fully loads
    window.addEventListener('load', () => {
      setTimeout(cleanAdElements, 1000);
      setTimeout(cleanAdElements, 3000);
    });
  }

  // Listen for queries from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageStats') {
      sendResponse({ blockedCount: blockedCount, isEnabled: isEnabled });
    }
  });
})();
