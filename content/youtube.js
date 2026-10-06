// ShieldBlock - Dedicated YouTube Ad Blocker & Auto-Skipper (Runs in MAIN world)

(function () {
  'use strict';

  let isEnabled = true;
  let wasAdPlaying = false;
  let originalMuted = false;
  let originalPlaybackRate = 1.0;
  let adActiveTicks = 0;

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

  // Detect whether an ad is actively playing or interrupting
  function isAdActive() {
    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (!moviePlayer) return false;

    // 1. YouTube player class indicators
    if (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting')) {
      return true;
    }

    // 2. Active skip button visible
    const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [class*="ytp-ad-skip-button"]');
    if (skipBtn && skipBtn.offsetParent !== null) {
      return true;
    }

    // 3. Timed pie countdown or survey container
    if (document.querySelector('.ytp-ad-timed-pie-countdown-container, .ytp-ad-survey-questions')) {
      return true;
    }

    return false;
  }

  // 1. Fast, smooth video ad skip & speedup
  function handleVideoAds() {
    if (!isEnabled) return;

    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!moviePlayer || !video) return;

    const adPlaying = isAdActive();

    if (adPlaying) {
      adActiveTicks++;

      if (!wasAdPlaying) {
        wasAdPlaying = true;
        originalMuted = video.muted;
        originalPlaybackRate = (video.playbackRate > 2.0 || video.playbackRate <= 0) ? 1.0 : video.playbackRate;
      }

      // 1. Instantly mute audio so user hears nothing
      video.muted = true;

      // 2. Accelerate playback speed to 16x
      video.playbackRate = 16.0;

      // 3. Ensure video doesn't stall or pause
      if (video.paused) {
        video.play().catch(() => {});
      }

      // 4. Click any visible skip button immediately
      const skipSelectors = [
        '.ytp-skip-ad-button',
        '.ytp-skip-ad-button-modern',
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '[class*="ytp-ad-skip-button"]',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button',
        'button.ytp-ad-skip-button-modern',
        '.ytp-ad-preview-container',
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-overlay-close-button'
      ];

      for (const selector of skipSelectors) {
        const btn = document.querySelector(selector);
        if (btn && typeof btn.click === 'function') {
          btn.click();
          break;
        }
      }

      // 5. If unskippable ad persists for > 800ms (10 ticks at 80ms), use Player API reload
      if (adActiveTicks > 10) {
        const playerEl = document.querySelector('#ytd-player') || moviePlayer;
        const player = (playerEl && playerEl.getPlayer) ? playerEl.getPlayer() : playerEl;

        if (player && typeof player.getVideoData === 'function') {
          const videoData = player.getVideoData();
          const videoId = videoData && videoData.video_id;
          const start = Math.floor(player.getCurrentTime ? player.getCurrentTime() : 0);

          if (videoId && start >= 0) {
            if (playerEl && 'loadVideoWithPlayerVars' in playerEl) {
              playerEl.loadVideoWithPlayerVars({ videoId, start });
              adActiveTicks = 0;
            } else if (player && 'loadVideoByPlayerVars' in player) {
              player.loadVideoByPlayerVars({ videoId, start });
              adActiveTicks = 0;
            }
          }
        }
      }
    } else {
      // Ad is no longer playing
      if (wasAdPlaying) {
        wasAdPlaying = false;
        adActiveTicks = 0;

        // Restore normal playback rate and original mute setting
        video.playbackRate = originalPlaybackRate || 1.0;
        video.muted = originalMuted;

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

  // 2. Prevent Black Screen & Remove Anti-Adblock Overlays
  function fixBlackScreenAndBypassModal() {
    if (!isEnabled) return;

    // Remove player-unavailable attribute (which sets #player-container { visibility: hidden })
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy && flexy.hasAttribute('player-unavailable')) {
      flexy.removeAttribute('player-unavailable');
    }

    // Remove anti-adblock modal if triggered
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

  // 3. Clean In-Feed, Home, and Sidebar Ads (NEVER touch #player-ads or player module!)
  function cleanStaticAds() {
    if (!isEnabled) return;

    const safeStaticAdSelectors = [
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      '#masthead-ad',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-display-ad-renderer',
      'ytd-promoted-video-renderer',
      'ytd-merch-shelf-renderer',
      '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
      '.ytp-featured-product',
      '.yt-mealbar-promo-renderer',
      'ytmusic-mealbar-promo-renderer',
      'ytmusic-statement-banner-renderer'
    ];

    for (const selector of safeStaticAdSelectors) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        // Hide card parent if in home/feed grid, otherwise hide element
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
    // High-frequency loop for responsive ad skipping without lag (every 80ms)
    setInterval(() => {
      handleVideoAds();
      fixBlackScreenAndBypassModal();
    }, 80);

    // Periodic sweep for feed and banner ads
    setInterval(cleanStaticAds, 1000);

    // DOM Mutation observer for instant response
    const observer = new MutationObserver(() => {
      handleVideoAds();
      fixBlackScreenAndBypassModal();
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
