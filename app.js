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
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progress-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderCount = document.getElementById('loader-count');
  const loaderStatus = document.getElementById('loader-status');
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

  // --- Image Preloading Engine ---
  function preloadImages() {
    return new Promise((resolve) => {
      let isResolved = false;

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFrameUrl(i);

        const onFrameComplete = () => {
          loadedFrames++;
          const progress = (loadedFrames / TOTAL_FRAMES);
          const percent = Math.floor(progress * 100);

          if (progressBar) progressBar.style.width = `${percent}%`;
          if (loaderPercent) loaderPercent.textContent = `${percent}%`;
          if (loaderCount) loaderCount.textContent = `${loadedFrames} / ${TOTAL_FRAMES} FRAMES`;

          // Draw the first frame as soon as frame 0 loads
          if (i === 0 && !isLoaded) {
            renderFrame(0);
          }

          if (loadedFrames === TOTAL_FRAMES && !isResolved) {
            isResolved = true;
            if (loaderStatus) loaderStatus.textContent = 'Ready to launch';
            resolve();
          }
        };

        img.onload = onFrameComplete;
        img.onerror = () => {
          console.warn(`Frame ${i} failed to load: ${img.src}`);
          onFrameComplete(); // Proceed anyway so preloader doesn't get stuck
        };

        images[i] = img;
      }
    });
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
  async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', calculateTargetFrame, { passive: true });

    // Start render loop immediately
    requestAnimationFrame(animationLoop);

    // Preload all assets
    await preloadImages();

    // Small delay for smooth visual transition
    setTimeout(() => {
      isLoaded = true;
      if (preloader) {
        preloader.classList.add('loaded');
      }
      initLenis();
      calculateTargetFrame();
      renderFrame(Math.round(currentFrame));
    }, 300);
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
