/**
 * Ultra-Smooth Scroll-Driven Frame Animation Engine
 * Features:
 * - High-DPI Canvas Rendering with Aspect Ratio Cover Math
 * - Asynchronous Image Preloading & Real-time Progress
 * - Linear Interpolation (Lerp) Frame Smoothing Loop
 * - Lenis Smooth Scroll Integration
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_EXT = '.jpg';
  const LERP_FACTOR = 0.12; // Controls momentum smoothness (0.08 - 0.15 is ideal)

  // --- DOM Elements ---
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const bgAudio = document.getElementById('bg-audio');
  let audioStarted = false;
  const topProgressBar = document.getElementById('top-progress-bar');
  const hudFrameNum = document.getElementById('hud-frame-num');
  const hudProgressVal = document.getElementById('hud-progress-val');
  const scrollIndicator = document.getElementById('scroll-indicator');

  // --- State Variables ---
  const images = [];
  let loadedFrames = 0;
  let isLoaded = false;

  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedFrame = -1;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Image Helper ---
  function getFrameUrl(index) {
    const padded = String(index).padStart(6, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  // --- Canvas Sizing & High-DPI Support ---
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    // Disable alpha and configure high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Force redraw on current frame
    if (isLoaded && images[Math.round(currentFrame)]) {
      renderFrame(Math.round(currentFrame));
    }
  }

  // --- Render Frame to Canvas with "Cover" Fitting ---
  function renderFrame(frameIndex) {
    const img = images[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Calculate aspect ratio cover scale
    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    // Apply a 15% zoom to permanently crop out the watermark logo in the bottom right
    const zoomFactor = 1.15;
    const ratio = Math.max(hRatio, vRatio) * zoomFactor;

    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;

    ctx.drawImage(img, 0, 0, imgWidth, imgHeight, drawX, drawY, drawWidth, drawHeight);
    lastRenderedFrame = frameIndex;
  }

  // --- Update HUD UI ---
  function updateHUD(frameIndex, scrollFraction) {
    const displayNum = String(frameIndex + 1).padStart(3, '0');
    const percent = Math.round(scrollFraction * 100);

    if (hudFrameNum) hudFrameNum.textContent = displayNum;
    if (hudProgressVal) hudProgressVal.textContent = `${percent}%`;
    if (topProgressBar) topProgressBar.style.width = `${scrollFraction * 100}%`;

    if (scrollIndicator) {
      if (window.scrollY > 40) {
        scrollIndicator.classList.add('hidden');
      } else {
        scrollIndicator.classList.remove('hidden');
      }
    }
  }

  // --- Scroll Calculation ---
  function calculateTargetFrame() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollFraction = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
  }

  // --- Animation Render Loop with Lerping ---
  function animationLoop() {
    if (isLoaded) {
      // Linear interpolation between current and target frame
      const delta = targetFrame - currentFrame;
      if (Math.abs(delta) > 0.001) {
        currentFrame += delta * LERP_FACTOR;
      } else {
        currentFrame = targetFrame;
      }

      const frameToDraw = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;

      if (frameToDraw !== lastRenderedFrame) {
        renderFrame(frameToDraw);
      }
      updateHUD(frameToDraw, scrollFraction);
    }

    requestAnimationFrame(animationLoop);
  }

  // --- Audio Engine with Fade Out ---
  function handleAudio() {
    if (!bgAudio || audioStarted) return;
    
    bgAudio.volume = 0.5; // Set volume to 50%
    const playPromise = bgAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        audioStarted = true;
        
        // Handle fade out at the end of the song
        bgAudio.addEventListener('timeupdate', () => {
          const remainingTime = bgAudio.duration - bgAudio.currentTime;
          if (remainingTime < 5.0 && remainingTime > 0) {
            // Fade out over the last 5 seconds
            bgAudio.volume = Math.max(0, (remainingTime / 5.0) * 0.5);
          }
        });
      }).catch(error => {
        console.log("Autoplay prevented. Waiting for user interaction.", error);
      });
    }
  }

  // --- Background Image Loading ---
  function startImageLoading() {
    // Load frame 0 immediately so we can render the first frame quickly
    const firstImg = new Image();
    firstImg.src = getFrameUrl(0);
    firstImg.onload = () => {
      images[0] = firstImg;
      if (!isLoaded) renderFrame(0);
      
      // Load the rest silently in the background
      for (let i = 1; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFrameUrl(i);
        images[i] = img;
      }
      isLoaded = true;
    };
  }

  // --- Initialize Lenis Smooth Scroll ---
  function initLenis() {
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        infinite: false,
      });

      lenis.on('scroll', () => {
        calculateTargetFrame();
      });

      function lenisRaf(time) {
        lenis.raf(time);
        requestAnimationFrame(lenisRaf);
      }

      requestAnimationFrame(lenisRaf);
    } else {
      window.addEventListener('scroll', calculateTargetFrame, { passive: true });
    }
  }

  // --- App Initialization ---
  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', calculateTargetFrame, { passive: true });
    
    // User interaction listeners for audio autoplay
    document.addEventListener('click', handleAudio, { once: true });
    document.addEventListener('scroll', handleAudio, { once: true });
    document.addEventListener('touchstart', handleAudio, { once: true });

    // Start loading images silently
    startImageLoading();

    // Start render loop immediately
    requestAnimationFrame(animationLoop);
    initLenis();
    
    // Attempt autoplay immediately
    handleAudio();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
