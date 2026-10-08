// ShieldBlock - YouTube Super Speedup & Instant Skip Engine (Runs in MAIN world)

(function () {
  'use strict';

  let isEnabled = true;
  let wasAdPlaying = false;
  let savedPlaybackRate = 1.0;
  let savedMuted = false;

  // Listen for config from the isolated bridge
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'SHIELDBLOCK_CONFIG') {
      isEnabled = event.data.enabled !== false;
    }
  });

  // Request config from bridge
  window.postMessage({ type: 'SHIELDBLOCK_REQUEST_CONFIG' }, '*');

  function reportAdBlocked() {
    window.postMessage({ type: 'SHIELDBLOCK_AD_BLOCKED' }, '*');
  }

  // Check if an in-stream ad is currently active on the player
  function isAdActive() {
    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (!moviePlayer) return false;

    // Strict and reliable ad indicator: only active when video ad is actually playing
    return moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting');
  }

  // Fast auto-click skip buttons
  function clickSkipButtons() {
    const skipSelectors = [
      '.ytp-skip-ad-button',
      '.ytp-skip-ad-button-modern',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-container button',
      '.ytp-ad-skip-slot button',
      '[class*="ytp-ad-skip-button"]',
      '.ytp-ad-skip-button-slot button',
      'button.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      'button.ytp-skip-ad-button',
      '.ytp-ad-preview-container',
      '.ytp-ad-overlay-close-button',
      'ytd-button-renderer#skip-button button'
    ];

    for (const selector of skipSelectors) {
      const btn = document.querySelector(selector);
      if (btn && typeof btn.click === 'function') {
        btn.click();
        break;
      }
    }
  }

  // Handle video playback rate & sound during ad
  function handleVideoAds() {
    if (!isEnabled) return;

    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!moviePlayer || !video) return;

    const adPlaying = isAdActive();

    if (adPlaying) {
      if (!wasAdPlaying) {
        wasAdPlaying = true;
        savedMuted = video.muted;
        savedPlaybackRate = (video.playbackRate > 2.0 || video.playbackRate <= 0) ? 1.0 : video.playbackRate;
      }

      // 1. Instantly mute audio so user hears nothing
      video.muted = true;

      // 2. Accelerate playback speed to 16x (maximum supported native speed)
      try {
        if (video.playbackRate !== 16.0) {
          video.playbackRate = 16.0;
        }
      } catch (e) {}

      // 3. Keep video playing (avoid stalling)
      if (video.paused) {
        video.play().catch(() => {});
      }

      // 4. Click skip button immediately
      clickSkipButtons();
    } else {
      // Ad has ended or no ad is playing
      if (wasAdPlaying) {
        wasAdPlaying = false;

        // Restore normal playback rate and original mute setting
        video.playbackRate = savedPlaybackRate || 1.0;
        video.muted = savedMuted;

        if (video.paused) {
          video.play().catch(() => {});
        }

        reportAdBlocked();
      } else if (video.playbackRate > 2.0) {
        // Recovery safeguard
        video.playbackRate = 1.0;
      }
    }
  }

  // Force-kill black screen and anti-adblock traps
  function fixBlackScreen() {
    // 1. Remove player-unavailable attribute from <ytd-watch-flexy>
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy && flexy.hasAttribute('player-unavailable')) {
      flexy.removeAttribute('player-unavailable');
    }

    // 2. Ensure player-container is visible
    const playerContainer = document.querySelector('#player-container');
    if (playerContainer && playerContainer.style.visibility === 'hidden') {
      playerContainer.style.removeProperty('visibility');
    }

    // 3. Remove anti-adblock modal dialog if YouTube displayed it
    const enforcementDialog = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcementDialog) {
      const parentDialog = enforcementDialog.closest('tp-yt-paper-dialog') || enforcementDialog;
      parentDialog.remove();

      const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
      if (backdrop) backdrop.remove();

      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  // Clean only feed/masthead ads outside player (NEVER touch player elements!)
  function cleanStaticAds() {
    if (!isEnabled) return;

    // On watch page, only hide side sponsored panels, never player elements
    if (location.pathname === '/watch') {
      const watchAds = document.querySelectorAll('#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"], ytd-merch-shelf-renderer');
      for (const el of watchAds) {
        if (!el.dataset.sbCleaned) {
          el.dataset.sbCleaned = 'true';
          el.style.setProperty('display', 'none', 'important');
        }
      }
      return;
    }

    const feedAdSelectors = [
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      '#masthead-ad',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-display-ad-renderer'
    ];

    for (const selector of feedAdSelectors) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        const cardParent = el.closest('ytd-rich-item-renderer, ytd-rich-section-renderer');
        const target = cardParent || el;
        if (!target.dataset.sbCleaned) {
          target.dataset.sbCleaned = 'true';
          target.style.setProperty('display', 'none', 'important');
        }
      }
    }
  }

  function init() {
    // High frequency loop (every 25ms) for ultra-fast ad skip & speedup
    setInterval(() => {
      handleVideoAds();
      fixBlackScreen();
    }, 25);

    // Periodic sweep for feed and banner ads
    setInterval(cleanStaticAds, 1000);

    // DOM Mutation observer for instant reaction
    const observer = new MutationObserver(() => {
      handleVideoAds();
      fixBlackScreen();
      cleanStaticAds();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
