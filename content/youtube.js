// ShieldBlock - YouTube Super Speedup & Instant Skip Engine (Runs in MAIN world)

(function () {
  'use strict';

  let isEnabled = true;
  let wasAdPlaying = false;
  let originalMuted = false;
  let originalPlaybackRate = 1.0;
  let adActiveTicks = 0;
  let currentVideoElement = null;

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
    const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [class*="ytp-ad-skip-button"], .ytp-ad-skip-slot');
    if (skipBtn && skipBtn.offsetParent !== null) {
      return true;
    }

    // 3. Timed countdown or survey container
    if (document.querySelector('.ytp-ad-timed-pie-countdown-container, .ytp-ad-survey-questions, .ytp-ad-player-overlay')) {
      return true;
    }

    return false;
  }

  // Attach ratechange protection to video element
  function attachVideoListeners(video) {
    if (!video || video === currentVideoElement) return;
    currentVideoElement = video;

    video.addEventListener('ratechange', () => {
      // If YouTube tries to force playbackRate back to 1.0 while ad is showing, force back to 16.0
      if (isEnabled && isAdActive() && video.playbackRate !== 16.0) {
        try {
          video.playbackRate = 16.0;
        } catch (e) {}
      }
    });
  }

  // Fast, smooth video ad skip & extreme speedup (Max Native 16x + Instant Buffer Jump)
  function handleVideoAds() {
    if (!isEnabled) return;

    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!moviePlayer || !video) return;
    attachVideoListeners(video);

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

      // 2. Accelerate playback speed to maximum native rate allowed by browser (16x)
      try {
        if (video.playbackRate !== 16.0) {
          video.playbackRate = 16.0;
        }
      } catch (e) {}

      // 3. Fast-forward buffered ad video towards the end (effectively instant / 2048x speed)
      // Only apply if video.duration is strictly ad-length (< 180 seconds)
      if (isFinite(video.duration) && video.duration > 0 && video.duration < 180) {
        const bufferedEnd = (video.buffered && video.buffered.length > 0)
          ? video.buffered.end(video.buffered.length - 1)
          : video.duration;
        const targetTime = Math.min(bufferedEnd, video.duration - 0.1);
        if (targetTime > video.currentTime + 0.5) {
          video.currentTime = targetTime;
        }
      }

      // 4. Ensure video does not pause or stall
      if (video.paused) {
        video.play().catch(() => {});
      }

      // 5. Click any skip button immediately
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

      // 6. If unskippable ad persists for > 500ms (20 ticks at 25ms), invoke Player API reload
      if (adActiveTicks > 20) {
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

  // Prevent Black Screen & Remove Anti-Adblock Overlays
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

  // Clean In-Feed, Home, and Sidebar Ads (NEVER touch #player-ads or player module!)
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
    // Ultra-high frequency loop (every 25ms) for instantaneous ad skip & speedup
    setInterval(() => {
      handleVideoAds();
      fixBlackScreenAndBypassModal();
    }, 25);

    // Periodic sweep for feed and banner ads
    setInterval(cleanStaticAds, 1000);

    // DOM Mutation observer for immediate response to dynamic changes
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
