// ShieldBlock - Dedicated YouTube Ad Blocker & Auto-Skipper

(function () {
  'use strict';

  // Mark script presence
  window.__shieldBlockYouTubeActive = true;

  let isEnabled = true;
  let wasAdPlaying = false;
  let previousMuted = false;

  // Check if extension is enabled & not whitelisted
  chrome.storage.local.get(['shieldBlockEnabled', 'whitelistedDomains'], (res) => {
    const globallyEnabled = res.shieldBlockEnabled !== false;
    const whitelisted = Array.isArray(res.whitelistedDomains) && 
      (res.whitelistedDomains.includes('youtube.com') || res.whitelistedDomains.includes('www.youtube.com'));

    if (!globallyEnabled || whitelisted) {
      isEnabled = false;
      return;
    }

    initYouTubeAdShield();
  });

  function reportAdSkipped() {
    chrome.runtime.sendMessage({
      action: 'elementsBlocked',
      count: 1,
      host: 'youtube.com'
    }).catch(() => {});
  }

  // Detect whether an ad is currently playing on YouTube HTML5 player
  function checkIsAdPlaying(moviePlayer) {
    if (!moviePlayer) return false;

    // 1. Check DOM classes
    if (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting')) {
      return true;
    }

    // 2. Check Player API ad state (-1 means no ad, >= 0 means ad active)
    if (typeof moviePlayer.getAdState === 'function') {
      try {
        if (moviePlayer.getAdState() > -1) return true;
      } catch (e) {}
    }

    // 3. Check Lifa ad playing flag
    if (typeof moviePlayer.isLifaAdPlaying === 'function') {
      try {
        if (moviePlayer.isLifaAdPlaying()) return true;
      } catch (e) {}
    }

    return false;
  }

  // 1. Skip Video Ads (Pre-roll, Mid-roll, Post-roll)
  function handleVideoAds() {
    if (!isEnabled) return;

    const moviePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!moviePlayer || !video) return;

    const isAd = checkIsAdPlaying(moviePlayer);

    if (isAd) {
      if (!wasAdPlaying) {
        wasAdPlaying = true;
        previousMuted = video.muted;
      }

      // Mute audio during ad
      video.muted = true;

      // Accelerate playback speed to 16x
      video.playbackRate = 16.0;

      // Fast-forward video to end of ad segment
      if (Number.isFinite(video.duration) && video.duration > 0.1) {
        video.currentTime = video.duration;
      }

      // Auto-click skip button immediately if visible
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '[class*="ytp-ad-skip-button"]',
        '.ytp-ad-skip-button-slot button',
        'button.ytp-ad-skip-button',
        '.ytp-ad-preview-container',
        '.ytp-ad-skip-button-container button'
      ];

      for (const selector of skipSelectors) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          break;
        }
      }
    } else {
      // Ad finished, restore regular playback
      if (wasAdPlaying) {
        wasAdPlaying = false;
        video.playbackRate = 1.0;
        video.muted = previousMuted;
        reportAdSkipped();

        // Resume if paused
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    }
  }

  // 2. Remove Anti-Adblock Popup & Resume Playback
  function bypassAntiAdblockModal() {
    if (!isEnabled) return;

    // Remove player-unavailable attribute if YouTube added it
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy && flexy.hasAttribute('player-unavailable')) {
      flexy.removeAttribute('player-unavailable');
    }

    const enforcementDialog = document.querySelector('ytd-enforcement-message-view-model');
    const dialogBackdrop = document.querySelector('tp-yt-iron-overlay-backdrop');

    if (enforcementDialog) {
      const parentDialog = enforcementDialog.closest('tp-yt-paper-dialog') || enforcementDialog;
      parentDialog.remove();
      if (dialogBackdrop) dialogBackdrop.remove();

      // Resume video playback
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  // 3. Clean In-Feed, Home, and Search Ads
  function cleanStaticAds() {
    if (!isEnabled) return;

    const staticAdSelectors = [
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      '#masthead-ad',
      '#player-ads',
      '.ytp-ad-overlay-container',
      '.ytp-ad-message-container',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-display-ad-renderer',
      'ytd-promoted-video-renderer'
    ];

    staticAdSelectors.forEach((selector) => {
      const els = document.querySelectorAll(selector);
      els.forEach((el) => {
        // Also hide parent grid card if present
        const cardParent = el.closest('ytd-rich-item-renderer, ytd-rich-section-renderer');
        const target = cardParent || el;
        if (!target.dataset.sbCleaned) {
          target.dataset.sbCleaned = 'true';
          target.style.setProperty('display', 'none', 'important');
        }
      });
    });
  }

  function initYouTubeAdShield() {
    // High-frequency check for video ads (every 100ms)
    setInterval(() => {
      handleVideoAds();
      bypassAntiAdblockModal();
    }, 100);

    // Periodic check for static feed ads
    setInterval(cleanStaticAds, 800);

    // MutationObserver to react immediately to DOM changes
    const observer = new MutationObserver(() => {
      handleVideoAds();
      bypassAntiAdblockModal();
      cleanStaticAds();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();
