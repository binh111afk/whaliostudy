/**
 * NIGHTMARE THEME EFFECTS CONTROLLER v2.0 - ULTRA NEON EDITION
 * "Code under a holographic aurora"
 * 
 * Handles dynamic animations and interactive effects.
 * Maximum visual impact. Full cinematic experience.
 * 
 * Usage:
 *   import { initNightmareEffects } from './nightmareEffects.js';
 *   const controller = initNightmareEffects(editorContainer, options);
 * 
 * Features:
 * - Aurora borealis background
 * - Multiple shooting star variants
 * - Typing sparkle particles
 * - Matrix digital rain (optional)
 * - Holographic scanlines
 * - Parallax starfield
 * - Interactive cursor effects
 * - Performance adaptive mode
 */

/**
 * Initialize Nightmare theme effects on a Monaco editor container
 * @param {HTMLElement} container - The Monaco editor container element
 * @param {Object} options - Configuration options
 * @returns {Object} Controller object with cleanup and control methods
 */
export function initNightmareEffects(container, options = {}) {
  const config = {
    // Shooting stars
    shootingStarInterval: { min: 15000, max: 30000 },
    shootingStarColors: ['cyan', 'magenta', 'gold', 'rainbow'],
    shootingStarWeights: [40, 35, 20, 5], // Percentage chance
    
    // Effects toggles
    enableShootingStars: true,
    enableParallax: true,
    enableAurora: true,
    enableScanlines: true,
    enableTypingSparkles: true,
    enableMatrixRain: false,
    enableGlitchEffect: false,
    
    // Performance
    performanceMode: false,
    parallaxIntensity: 0.4,
    sparkleIntensity: 0.6, // 0-1, chance per keystroke
    
    // Advanced
    matrixRainColumns: 15,
    matrixRainSpeed: 10000,
    
    ...options
  };

  // State
  let shootingStarTimer = null;
  let parallaxRAF = null;
  let isActive = true;
  let lastScrollTop = 0;
  let sparkleTimeout = null;

  // Create necessary DOM elements
  const elements = createEffectElements(container);

  // Initialize effects based on config
  initializeEffects();

  /**
   * Create all effect DOM elements
   */
  function createEffectElements(container) {
    // Add main class
    container.classList.add('nightmare-editor');
    if (config.performanceMode) {
      container.classList.add('performance-mode');
    }
    if (config.enableGlitchEffect) {
      container.classList.add('glitch-enabled');
    }

    // Aurora container with waves
    const aurora = document.createElement('div');
    aurora.className = 'nightmare-aurora';
    
    const auroraWave1 = document.createElement('div');
    auroraWave1.className = 'nightmare-aurora-wave nightmare-aurora-wave-1';
    
    const auroraWave2 = document.createElement('div');
    auroraWave2.className = 'nightmare-aurora-wave nightmare-aurora-wave-2';
    
    const auroraWave3 = document.createElement('div');
    auroraWave3.className = 'nightmare-aurora-wave nightmare-aurora-wave-3';
    
    aurora.appendChild(auroraWave1);
    aurora.appendChild(auroraWave2);
    aurora.appendChild(auroraWave3);

    // Scanlines
    const scanlines = document.createElement('div');
    scanlines.className = 'nightmare-scanlines';

    // Starfield container
    const starfield = document.createElement('div');
    starfield.className = 'nightmare-starfield';

    const layer1 = document.createElement('div');
    layer1.className = 'nightmare-starfield-layer-1';
    
    const layer2 = document.createElement('div');
    layer2.className = 'nightmare-starfield-layer-2';
    
    const layer3 = document.createElement('div');
    layer3.className = 'nightmare-starfield-layer-3';

    starfield.appendChild(layer1);
    starfield.appendChild(layer2);
    starfield.appendChild(layer3);

    // City glow
    const cityGlow = document.createElement('div');
    cityGlow.className = 'nightmare-city-glow';

    // Light beams
    const lightBeams = document.createElement('div');
    lightBeams.className = 'nightmare-light-beams';

    // Noise texture
    const noise = document.createElement('div');
    noise.className = 'nightmare-noise';

    // Vignette
    const vignette = document.createElement('div');
    vignette.className = 'nightmare-vignette';

    // Shooting star container
    const shootingStarContainer = document.createElement('div');
    shootingStarContainer.className = 'nightmare-shooting-star-container';
    shootingStarContainer.style.cssText = 'position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden;';

    // Matrix rain container (hidden by default)
    const matrixRain = document.createElement('div');
    matrixRain.className = 'nightmare-matrix-rain';
    matrixRain.style.display = config.enableMatrixRain ? 'block' : 'none';

    // Sparkle container
    const sparkleContainer = document.createElement('div');
    sparkleContainer.className = 'nightmare-sparkle-container';
    sparkleContainer.style.cssText = 'position: absolute; inset: 0; z-index: 100; pointer-events: none; overflow: hidden;';

    // Insert all elements (order matters for z-index)
    container.insertBefore(vignette, container.firstChild);
    container.insertBefore(noise, container.firstChild);
    container.insertBefore(lightBeams, container.firstChild);
    container.insertBefore(cityGlow, container.firstChild);
    container.insertBefore(shootingStarContainer, container.firstChild);
    container.insertBefore(matrixRain, container.firstChild);
    container.insertBefore(starfield, container.firstChild);
    container.insertBefore(scanlines, container.firstChild);
    container.insertBefore(aurora, container.firstChild);
    container.appendChild(sparkleContainer);

    return {
      aurora,
      auroraWaves: [auroraWave1, auroraWave2, auroraWave3],
      scanlines,
      starfield,
      starLayers: [layer1, layer2, layer3],
      cityGlow,
      lightBeams,
      noise,
      vignette,
      shootingStarContainer,
      matrixRain,
      sparkleContainer
    };
  }

  /**
   * Initialize all effects based on config
   */
  function initializeEffects() {
    if (!config.performanceMode) {
      if (config.enableShootingStars) {
        startShootingStars();
      }

      if (config.enableParallax) {
        initParallax();
      }

      if (config.enableMatrixRain) {
        initMatrixRain();
      }

      if (config.enableTypingSparkles) {
        initTypingSparkles();
      }
    }

    // Focus handlers always active
    initFocusHandlers(container);
  }

  /**
   * Shooting star system - Enhanced with multiple colors
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

  function getWeightedRandomColor() {
    const total = config.shootingStarWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < config.shootingStarColors.length; i++) {
      random -= config.shootingStarWeights[i];
      if (random <= 0) {
        return config.shootingStarColors[i];
      }
    }
    return config.shootingStarColors[0];
  }

  function createShootingStar(customColor = null) {
    const star = document.createElement('div');
    const color = customColor || getWeightedRandomColor();
    star.className = `nightmare-shooting-star ${color}`;

    // Random starting position (upper-left area)
    const containerRect = container.getBoundingClientRect();
    const startX = Math.random() * containerRect.width * 0.4;
    const startY = Math.random() * containerRect.height * 0.3;

    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;

    elements.shootingStarContainer.appendChild(star);

    // Trigger animation
    requestAnimationFrame(() => {
      star.classList.add('active');
    });

    // Remove after animation
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, 2500);

    return star;
  }

  /**
   * Parallax scrolling effect
   */
  function initParallax() {
    const editorScrollable = container.querySelector('.monaco-scrollable-element');
    
    if (!editorScrollable) {
      // Retry after a short delay
      setTimeout(() => initParallax(), 500);
      return;
    }

    function updateParallax() {
      if (!isActive) return;

      const scrollTop = editorScrollable.scrollTop || 0;
      lastScrollTop = scrollTop;

      // Apply different transform speeds to each layer
      if (elements.starLayers[0]) {
        const offset1 = scrollTop * 0.08 * config.parallaxIntensity;
        elements.starLayers[0].style.transform = `translateY(${offset1}px) translateZ(0)`;
      }

      if (elements.starLayers[1]) {
        const offset2 = scrollTop * 0.12 * config.parallaxIntensity;
        elements.starLayers[1].style.transform = `translateY(${offset2}px) translateZ(0)`;
      }

      if (elements.starLayers[2]) {
        const offset3 = scrollTop * 0.18 * config.parallaxIntensity;
        elements.starLayers[2].style.transform = `translateY(${offset3}px) translateZ(0)`;
      }

      // Aurora parallax
      if (elements.aurora) {
        const auroraOffset = scrollTop * 0.05 * config.parallaxIntensity;
        elements.aurora.style.transform = `translateY(${auroraOffset}px) translateZ(0)`;
      }

      parallaxRAF = requestAnimationFrame(updateParallax);
    }

    parallaxRAF = requestAnimationFrame(updateParallax);

    // Update on scroll for immediate response
    editorScrollable.addEventListener('scroll', () => {
      if (parallaxRAF) {
        cancelAnimationFrame(parallaxRAF);
      }
      parallaxRAF = requestAnimationFrame(updateParallax);
    }, { passive: true });
  }

  /**
   * Matrix rain effect
   */
  function initMatrixRain() {
    const containerRect = container.getBoundingClientRect();
    const columnWidth = containerRect.width / config.matrixRainColumns;

    for (let i = 0; i < config.matrixRainColumns; i++) {
      const column = document.createElement('div');
      column.className = 'nightmare-matrix-column';
      column.style.left = `${i * columnWidth + Math.random() * columnWidth * 0.5}px`;
      column.style.animationDelay = `${Math.random() * config.matrixRainSpeed}ms`;
      column.style.animationDuration = `${config.matrixRainSpeed + Math.random() * 5000}ms`;
      column.style.opacity = 0.1 + Math.random() * 0.2;
      elements.matrixRain.appendChild(column);
    }
  }

  /**
   * Typing sparkle particles
   */
  function initTypingSparkles() {
    const monacoEditor = container.querySelector('.monaco-editor');
    if (!monacoEditor) {
      setTimeout(() => initTypingSparkles(), 500);
      return;
    }

    monacoEditor.addEventListener('keydown', (e) => {
      if (!isActive || config.performanceMode) return;
      
      // Skip modifier keys
      if (e.key.length > 1 && !['Enter', 'Tab', 'Backspace'].includes(e.key)) return;
      
      // Random chance based on intensity
      if (Math.random() > config.sparkleIntensity) return;

      // Get cursor position
      const cursor = container.querySelector('.monaco-editor .cursor');
      if (!cursor) return;

      createSparkle(cursor);
    });
  }

  function createSparkle(cursor) {
    const rect = cursor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const colors = ['cyan', 'magenta', 'green'];
    const numSparkles = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numSparkles; i++) {
      const sparkle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      sparkle.className = `nightmare-sparkle ${color}`;
      
      // Position at cursor
      sparkle.style.left = `${rect.left - containerRect.left + Math.random() * 10 - 5}px`;
      sparkle.style.top = `${rect.top - containerRect.top + Math.random() * 10 - 5}px`;
      
      // Random direction
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      sparkle.style.setProperty('--sparkle-x', `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty('--sparkle-y', `${Math.sin(angle) * distance - 20}px`);

      elements.sparkleContainer.appendChild(sparkle);

      // Remove after animation
      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, 800);
    }
  }

  /**
   * Focus handlers
   */
  function initFocusHandlers(container) {
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
    container.classList.remove(
      'nightmare-editor', 
      'performance-mode', 
      'nightmare-focused',
      'glitch-enabled'
    );
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
      initializeEffects();
    },

    // Trigger shooting star manually with optional color
    shootStar: (color = null) => {
      createShootingStar(color);
    },

    // Burst of shooting stars (celebration effect)
    shootStarBurst: (count = 5, delay = 200) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => createShootingStar(), i * delay);
      }
    },

    // Toggle specific effects
    toggleAurora: (enable) => {
      if (elements.aurora) {
        elements.aurora.style.display = enable ? 'block' : 'none';
      }
    },

    toggleScanlines: (enable) => {
      if (elements.scanlines) {
        elements.scanlines.style.display = enable ? 'block' : 'none';
      }
    },

    toggleMatrixRain: (enable) => {
      if (elements.matrixRain) {
        elements.matrixRain.style.display = enable ? 'block' : 'none';
        if (enable && elements.matrixRain.children.length === 0) {
          initMatrixRain();
        }
      }
    },

    toggleGlitch: (enable) => {
      if (enable) {
        container.classList.add('glitch-enabled');
      } else {
        container.classList.remove('glitch-enabled');
      }
    },

    // Update configuration
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig);
      
      if (config.performanceMode) {
        container.classList.add('performance-mode');
      } else {
        container.classList.remove('performance-mode');
      }

      if (config.enableGlitchEffect) {
        container.classList.add('glitch-enabled');
      } else {
        container.classList.remove('glitch-enabled');
      }
    },

    // Get current configuration
    getConfig: () => ({ ...config }),

    // Get elements for custom manipulation
    getElements: () => elements,

    // Intensity controls
    setGlowIntensity: (intensity) => {
      container.style.setProperty('--nm-glow-intensity', intensity);
    },

    // Create sparkle at position (for custom effects)
    createSparkleAt: (x, y, color = 'cyan') => {
      const sparkle = document.createElement('div');
      sparkle.className = `nightmare-sparkle ${color}`;
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      sparkle.style.setProperty('--sparkle-x', `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty('--sparkle-y', `${Math.sin(angle) * distance - 20}px`);

      elements.sparkleContainer.appendChild(sparkle);

      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, 800);
    }
  };
}

/**
 * Auto-detect and apply Nightmare effects to Monaco editors
 * @param {Object} options - Configuration options
 * @returns {Array} Array of controller objects
 */
export function autoInitNightmareEffects(options = {}) {
  const controllers = [];
  
  const editors = document.querySelectorAll('.monaco-editor');
  
  editors.forEach(editor => {
    const container = editor.closest('.monaco-editor-container') || editor.parentElement;
    if (container && !container.classList.contains('nightmare-editor')) {
      const controller = initNightmareEffects(container, options);
      controllers.push(controller);
    }
  });

  if (controllers.length === 0) {
    console.warn('Nightmare: No Monaco editors found. Retrying in 1s...');
    setTimeout(() => autoInitNightmareEffects(options), 1000);
  } else {
    console.log(`%c🌃 Nightmare v2.0 Ultra Neon: ${controllers.length} editor(s) awakened`, 
      'color: #ff00ff; font-weight: bold; text-shadow: 0 0 10px #ff00ff;');
  }

  return controllers;
}

/**
 * Performance monitoring utility
 * Automatically switches to performance mode if FPS drops
 * @param {Object} controller - Nightmare effects controller
 * @param {number} threshold - FPS threshold (default: 35)
 * @param {number} duration - Monitoring duration in ms (default: 8000)
 */
export function enableAdaptivePerformance(controller, threshold = 35, duration = 8000) {
  let lastTime = performance.now();
  let frames = 0;
  let monitoring = true;
  let lowFPSCount = 0;

  function checkFPS() {
    if (!monitoring) return;

    const currentTime = performance.now();
    frames++;

    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (currentTime - lastTime));
      
      if (fps < threshold) {
        lowFPSCount++;
        if (lowFPSCount >= 3) {
          console.log(`%c🌃 Nightmare: Low FPS (${fps}). Enabling performance mode.`, 
            'color: #ffaa00; font-weight: bold;');
          controller.updateConfig({ performanceMode: true });
          monitoring = false;
          return;
        }
      } else {
        lowFPSCount = 0;
      }

      frames = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(checkFPS);
  }

  setTimeout(() => {
    if (monitoring) {
      monitoring = false;
      console.log('%c🌃 Nightmare: Performance check passed ✓', 
        'color: #00ff7f; font-weight: bold;');
    }
  }, duration);

  requestAnimationFrame(checkFPS);
}

/**
 * Create custom shooting star on demand
 * @param {HTMLElement} container - Editor container
 * @param {Object} options - Star configuration
 */
export function createCustomShootingStar(container, options = {}) {
  const {
    startX = 0,
    startY = 0,
    color = 'cyan',
    duration = 1800
  } = options;

  const star = document.createElement('div');
  star.className = `nightmare-shooting-star ${color}`;
  star.style.left = `${startX}px`;
  star.style.top = `${startY}px`;

  const shootingContainer = container.querySelector('.nightmare-shooting-star-container');
  if (shootingContainer) {
    shootingContainer.appendChild(star);

    requestAnimationFrame(() => {
      star.classList.add('active');
      if (duration !== 1800) {
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

/**
 * Celebration effect - Multiple shooting stars
 * @param {Object} controller - Nightmare controller
 * @param {string} type - 'small', 'medium', 'epic'
 */
export function triggerCelebration(controller, type = 'medium') {
  const configs = {
    small: { count: 3, delay: 300 },
    medium: { count: 6, delay: 200 },
    epic: { count: 12, delay: 150 }
  };

  const config = configs[type] || configs.medium;
  controller.shootStarBurst(config.count, config.delay);
}

/**
 * Night mode transition - Smoothly increase darkness
 * @param {HTMLElement} container 
 * @param {number} duration - Transition duration in ms
 */
export function transitionToNight(container, duration = 2000) {
  container.style.transition = `filter ${duration}ms ease`;
  container.style.filter = 'brightness(0.9) saturate(1.1)';
  
  setTimeout(() => {
    container.style.filter = '';
  }, 100);
}

// Export default for convenience
export default {
  initNightmareEffects,
  autoInitNightmareEffects,
  enableAdaptivePerformance,
  createCustomShootingStar,
  triggerCelebration,
  transitionToNight
};
