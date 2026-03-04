/**
 * NIGHTMARE THEME EFFECTS CONTROLLER
 * "Code under falling stars"
 * 
 * Handles dynamic animations and interactive effects.
 * Companion script for Nightmare Monaco theme.
 * 
 * Usage:
 *   import { initNightmareEffects } from './nightmareEffects.js';
 *   initNightmareEffects(editorContainer);
 */

/**
 * Initialize Nightmare theme effects on a Monaco editor container
 * @param {HTMLElement} container - The Monaco editor container element
 * @param {Object} options - Configuration options
 * @returns {Object} Controller object with cleanup and control methods
 */
export function initNightmareEffects(container, options = {}) {
  const config = {
    shootingStarInterval: { min: 25000, max: 45000 }, // 25-45 seconds
    parallaxIntensity: 0.3,
    performanceMode: false,
    enableShootingStars: true,
    enableParallax: true,
    ...options
  };

  // State
  let shootingStarTimer = null;
  let parallaxRAF = null;
  let isActive = true;
  let lastScrollTop = 0;

  // Create necessary DOM elements
  const elements = createEffectElements(container);

  // Initialize effects
  if (config.enableShootingStars && !config.performanceMode) {
    startShootingStars();
  }

  if (config.enableParallax && !config.performanceMode) {
    initParallax();
  }

  // Add focus handlers to enhance effects
  initFocusHandlers(container);

  /**
   * Create all effect DOM elements
   */
  function createEffectElements(container) {
    // Add main class
    container.classList.add('nightmare-editor');
    if (config.performanceMode) {
      container.classList.add('performance-mode');
    }

    // Create starfield container
    const starfield = document.createElement('div');
    starfield.className = 'nightmare-starfield';

    // Create three starfield layers
    const layer1 = document.createElement('div');
    layer1.className = 'nightmare-starfield-layer-1';
    
    const layer2 = document.createElement('div');
    layer2.className = 'nightmare-starfield-layer-2';
    
    const layer3 = document.createElement('div');
    layer3.className = 'nightmare-starfield-layer-3';

    starfield.appendChild(layer1);
    starfield.appendChild(layer2);
    starfield.appendChild(layer3);

    // Create city glow
    const cityGlow = document.createElement('div');
    cityGlow.className = 'nightmare-city-glow';

    // Create light beams
    const lightBeams = document.createElement('div');
    lightBeams.className = 'nightmare-light-beams';

    // Create noise texture
    const noise = document.createElement('div');
    noise.className = 'nightmare-noise';

    // Create vignette
    const vignette = document.createElement('div');
    vignette.className = 'nightmare-vignette';

    // Create shooting star container
    const shootingStarContainer = document.createElement('div');
    shootingStarContainer.className = 'nightmare-shooting-star-container';
    shootingStarContainer.style.cssText = 'position: absolute; inset: 0; z-index: -1; pointer-events: none;';

    // Insert all elements
    container.insertBefore(vignette, container.firstChild);
    container.insertBefore(noise, container.firstChild);
    container.insertBefore(lightBeams, container.firstChild);
    container.insertBefore(cityGlow, container.firstChild);
    container.insertBefore(shootingStarContainer, container.firstChild);
    container.insertBefore(starfield, container.firstChild);

    return {
      starfield,
      starLayers: [layer1, layer2, layer3],
      cityGlow,
      lightBeams,
      noise,
      vignette,
      shootingStarContainer
    };
  }

  /**
   * Shooting star animation system
   */
  function startShootingStars() {
    function scheduleNextShootingStar() {
      if (!isActive) return;

      const delay = 
        config.shootingStarInterval.min + 
        Math.random() * (config.shootingStarInterval.max - config.shootingStarInterval.min);

      shootingStarTimer = setTimeout(() => {
        createShootingStar();
        scheduleNextShootingStar();
      }, delay);
    }

    scheduleNextShootingStar();
  }

  function createShootingStar() {
    const star = document.createElement('div');
    star.className = 'nightmare-shooting-star';

    // Random starting position (upper portion of screen)
    const startX = Math.random() * 0.3 * window.innerWidth; // Left 30%
    const startY = Math.random() * 0.2 * window.innerHeight; // Top 20%

    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;

    elements.shootingStarContainer.appendChild(star);

    // Trigger animation
    requestAnimationFrame(() => {
      star.classList.add('active');
    });

    // Remove after animation completes
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, 2500);
  }

  /**
   * Parallax scrolling effect for starfield
   */
  function initParallax() {
    const editorScrollable = container.querySelector('.monaco-scrollable-element');
    
    if (!editorScrollable) {
      console.warn('Nightmare: Could not find Monaco scrollable element for parallax');
      return;
    }

    function updateParallax() {
      if (!isActive) return;

      const scrollTop = editorScrollable.scrollTop || 0;
      const delta = scrollTop - lastScrollTop;
      lastScrollTop = scrollTop;

      // Apply different transform speeds to each layer for depth
      if (elements.starLayers[0]) {
        const offset1 = scrollTop * 0.1 * config.parallaxIntensity;
        elements.starLayers[0].style.transform = `translateY(${offset1}px)`;
      }

      if (elements.starLayers[1]) {
        const offset2 = scrollTop * 0.15 * config.parallaxIntensity;
        elements.starLayers[1].style.transform = `translateY(${offset2}px)`;
      }

      if (elements.starLayers[2]) {
        const offset3 = scrollTop * 0.2 * config.parallaxIntensity;
        elements.starLayers[2].style.transform = `translateY(${offset3}px)`;
      }

      parallaxRAF = requestAnimationFrame(updateParallax);
    }

    // Start parallax loop
    parallaxRAF = requestAnimationFrame(updateParallax);

    // Also update on scroll events for immediate response
    editorScrollable.addEventListener('scroll', () => {
      if (parallaxRAF) {
        cancelAnimationFrame(parallaxRAF);
      }
      parallaxRAF = requestAnimationFrame(updateParallax);
    }, { passive: true });
  }

  /**
   * Focus handlers to enhance effects when editor is active
   */
  function initFocusHandlers(container) {
    // These classes are already styled in CSS
    container.addEventListener('focusin', () => {
      container.classList.add('nightmare-focused');
    });

    container.addEventListener('focusout', () => {
      container.classList.remove('nightmare-focused');
    });
  }

  /**
   * Cleanup function
   */
  function destroy() {
    isActive = false;

    // Clear timers
    if (shootingStarTimer) {
      clearTimeout(shootingStarTimer);
    }

    if (parallaxRAF) {
      cancelAnimationFrame(parallaxRAF);
    }

    // Remove DOM elements
    Object.values(elements).forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // Remove classes
    container.classList.remove('nightmare-editor', 'performance-mode', 'nightmare-focused');
  }

  /**
   * Control methods
   */
  return {
    destroy,
    
    // Toggle effects on/off
    pause: () => {
      isActive = false;
      if (shootingStarTimer) clearTimeout(shootingStarTimer);
      if (parallaxRAF) cancelAnimationFrame(parallaxRAF);
    },
    
    resume: () => {
      isActive = true;
      if (config.enableShootingStars && !config.performanceMode) {
        startShootingStars();
      }
      if (config.enableParallax && !config.performanceMode) {
        initParallax();
      }
    },

    // Trigger shooting star manually
    shootStar: () => {
      createShootingStar();
    },

    // Update configuration
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig);
      
      // Handle performance mode toggle
      if (config.performanceMode) {
        container.classList.add('performance-mode');
      } else {
        container.classList.remove('performance-mode');
      }
    },

    // Get current configuration
    getConfig: () => ({ ...config }),

    // Get elements for custom manipulation
    getElements: () => elements
  };
}

/**
 * Auto-detect and apply Nightmare effects to Monaco editors
 * Call this after Monaco editor is initialized
 * @param {Object} options - Configuration options
 * @returns {Array} Array of controller objects for each editor found
 */
export function autoInitNightmareEffects(options = {}) {
  const controllers = [];
  
  // Find all Monaco editor containers
  const editors = document.querySelectorAll('.monaco-editor');
  
  editors.forEach(editor => {
    const container = editor.closest('.monaco-editor-container') || editor.parentElement;
    if (container && !container.classList.contains('nightmare-editor')) {
      const controller = initNightmareEffects(container, options);
      controllers.push(controller);
    }
  });

  if (controllers.length === 0) {
    console.warn('Nightmare: No Monaco editors found for auto-initialization');
  } else {
    console.log(`Nightmare: Initialized effects for ${controllers.length} editor(s)`);
  }

  return controllers;
}

/**
 * Performance monitoring utility
 * Automatically switches to performance mode if FPS drops
 * @param {Object} controller - Nightmare effects controller
 * @param {number} threshold - FPS threshold (default: 30)
 */
export function enableAdaptivePerformance(controller, threshold = 30) {
  let lastTime = performance.now();
  let frames = 0;
  let checkInterval;

  function checkFPS() {
    const currentTime = performance.now();
    frames++;

    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (currentTime - lastTime));
      
      if (fps < threshold) {
        console.warn(`Nightmare: Low FPS detected (${fps}). Enabling performance mode.`);
        controller.updateConfig({ performanceMode: true });
        clearInterval(checkInterval);
      }

      frames = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(checkFPS);
  }

  // Check for 10 seconds
  checkInterval = setTimeout(() => {
    console.log('Nightmare: Performance monitoring complete');
  }, 10000);

  requestAnimationFrame(checkFPS);
}

/**
 * Utility: Create custom shooting star on demand
 * @param {HTMLElement} container - Editor container
 * @param {Object} options - Start position and style options
 */
export function createCustomShootingStar(container, options = {}) {
  const {
    startX = 0,
    startY = 0,
    color = 'rgba(0, 247, 255, 0.8)',
    duration = 2000
  } = options;

  const star = document.createElement('div');
  star.className = 'nightmare-shooting-star';
  star.style.left = `${startX}px`;
  star.style.top = `${startY}px`;
  
  if (color !== 'rgba(0, 247, 255, 0.8)') {
    star.style.boxShadow = `
      0 0 10px ${color},
      0 0 20px ${color},
      0 0 30px ${color}
    `;
  }

  const shootingContainer = container.querySelector('.nightmare-shooting-star-container');
  if (shootingContainer) {
    shootingContainer.appendChild(star);

    requestAnimationFrame(() => {
      star.classList.add('active');
      if (duration !== 2000) {
        star.style.animationDuration = `${duration}ms`;
      }
    });

    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, duration + 500);
  }
}

// Export default for convenience
export default {
  initNightmareEffects,
  autoInitNightmareEffects,
  enableAdaptivePerformance,
  createCustomShootingStar
};
