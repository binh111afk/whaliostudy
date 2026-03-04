# 🌃 Nightmare Theme
### *"Code under falling stars"*

A premium cinematic cyberpunk Monaco editor theme that transforms your coding environment into a living Tokyo rooftop at 2AM under a neon-lit sky.

---

## ✨ Features

### 🌌 Living Night Sky Background
- **Multi-layer cosmic gradient** with deep purple and black
- **Nebula fog textures** with soft animated drift
- **Three-layer starfield** with natural density and twinkling
- **Parallax depth** - stars move at different speeds while scrolling
- **City glow horizon** - magenta and cyan reflections from distant skyline
- **Shooting stars** - Random subtle meteors every 25-45 seconds

### 💎 True Neon Syntax
Hierarchical glow system with premium neon colors:
- **Keywords** - Neon magenta/pink gradient with strong glow
- **Functions** - Electric cyan with strongest glow
- **Types** - Electric violet with medium glow
- **Strings** - Toxic neon green with soft glow
- **Numbers** - Neon orange
- **Operators** - Soft white with subtle glow
- **Variables** - Clean cool white
- **Comments** - Dimmed neon blue

### 🎭 Depth & Atmosphere
- Vertical light beams
- Subtle noise texture
- Corner vignette
- Glass UI panels with blurred backdrop
- Neon gradient borders

### 🎯 Interactive Elements
- **Pulsing cyan cursor** with glow
- **Purple glass active line** highlight
- **Translucent violet glass** selections
- **Focus enhancement** - stars brighten, glows intensify
- **Hover effects** - function glows intensify smoothly

### ⚡ Performance Optimized
- GPU-accelerated animations
- Efficient layered rendering
- Automatic performance mode for low-end devices
- Respects `prefers-reduced-motion`

---

## 🚀 Installation

### 1. Import Theme Files

```javascript
// Import the Monaco theme definition
import nightmareTheme from './monacoThemes/nightmare.js';

// Import CSS effects
import './monacoThemes/nightmareEffects.css';

// Import JS controller
import { initNightmareEffects } from './monacoThemes/nightmareEffects.js';
```

### 2. Apply Theme to Monaco Editor

```javascript
import * as monaco from 'monaco-editor';

// Define the theme
monaco.editor.defineTheme('nightmare', nightmareTheme);

// Create editor with theme
const editor = monaco.editor.create(document.getElementById('editor'), {
  value: 'console.log("Hello, Nightmare!");',
  language: 'javascript',
  theme: 'nightmare'
});
```

### 3. Initialize Visual Effects

```javascript
// Get the editor container
const editorContainer = document.getElementById('editor');

// Initialize Nightmare effects
const nightmareController = initNightmareEffects(editorContainer, {
  shootingStarInterval: { min: 25000, max: 45000 },
  parallaxIntensity: 0.3,
  enableShootingStars: true,
  enableParallax: true,
  performanceMode: false // Auto-detected for low-end devices
});
```

### 4. Auto-Initialize (Optional)

If you have multiple editors or want automatic setup:

```javascript
import { autoInitNightmareEffects } from './monacoThemes/nightmareEffects.js';

// After all editors are created
const controllers = autoInitNightmareEffects({
  performanceMode: false
});
```

---

## 🎛️ Configuration Options

```javascript
const options = {
  // Shooting star timing (milliseconds)
  shootingStarInterval: { 
    min: 25000,  // Minimum 25 seconds
    max: 45000   // Maximum 45 seconds
  },
  
  // Parallax scroll intensity (0.0 - 1.0)
  parallaxIntensity: 0.3,
  
  // Enable/disable features
  enableShootingStars: true,
  enableParallax: true,
  
  // Performance mode (disables heavy effects)
  performanceMode: false
};

initNightmareEffects(container, options);
```

---

## 🎮 Controller API

The `initNightmareEffects()` function returns a controller object:

```javascript
const controller = initNightmareEffects(container);

// Pause all animations
controller.pause();

// Resume animations
controller.resume();

// Trigger shooting star manually
controller.shootStar();

// Update configuration
controller.updateConfig({ performanceMode: true });

// Get current config
const config = controller.getConfig();

// Get DOM elements for custom manipulation
const elements = controller.getElements();

// Clean up (removes all effects)
controller.destroy();
```

---

## 🔧 Advanced Usage

### Adaptive Performance Monitoring

Automatically enable performance mode if FPS drops:

```javascript
import { enableAdaptivePerformance } from './monacoThemes/nightmareEffects.js';

const controller = initNightmareEffects(container);

// Monitor FPS, switch to performance mode if below 30 FPS
enableAdaptivePerformance(controller, 30);
```

### Custom Shooting Stars

Create shooting stars on demand:

```javascript
import { createCustomShootingStar } from './monacoThemes/nightmareEffects.js';

createCustomShootingStar(container, {
  startX: 100,
  startY: 50,
  color: 'rgba(255, 0, 255, 0.8)',
  duration: 2000
});
```

### React Integration

```jsx
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import nightmareTheme from './monacoThemes/nightmare.js';
import { initNightmareEffects } from './monacoThemes/nightmareEffects.js';
import './monacoThemes/nightmareEffects.css';

function CodeEditor() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const nightmareRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      // Define theme
      monaco.editor.defineTheme('nightmare', nightmareTheme);

      // Create editor
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: '// Code under falling stars...',
        language: 'javascript',
        theme: 'nightmare'
      });

      // Initialize effects
      nightmareRef.current = initNightmareEffects(containerRef.current);

      return () => {
        editorRef.current?.dispose();
        nightmareRef.current?.destroy();
      };
    }
  }, []);

  return <div ref={containerRef} style={{ height: '600px' }} />;
}
```

### Vue Integration

```vue
<template>
  <div ref="editorContainer" class="editor-container"></div>
</template>

<script>
import * as monaco from 'monaco-editor';
import nightmareTheme from './monacoThemes/nightmare.js';
import { initNightmareEffects } from './monacoThemes/nightmareEffects.js';
import './monacoThemes/nightmareEffects.css';

export default {
  name: 'CodeEditor',
  data() {
    return {
      editor: null,
      nightmareController: null
    };
  },
  mounted() {
    monaco.editor.defineTheme('nightmare', nightmareTheme);

    this.editor = monaco.editor.create(this.$refs.editorContainer, {
      value: '// Code under falling stars...',
      language: 'javascript',
      theme: 'nightmare'
    });

    this.nightmareController = initNightmareEffects(this.$refs.editorContainer);
  },
  beforeUnmount() {
    this.editor?.dispose();
    this.nightmareController?.destroy();
  }
};
</script>

<style scoped>
.editor-container {
  height: 600px;
}
</style>
```

---

## 🎨 Customization

### Adjusting Colors

Edit [nightmare.js](nightmare.js) to change syntax colors:

```javascript
// Example: Change function color from cyan to blue
{ token: 'entity.name.function', foreground: '0080ff' },
```

### Modifying Effects

Edit [nightmareEffects.css](nightmareEffects.css):

```css
/* Example: Increase star brightness */
.nightmare-starfield-layer-3 {
  opacity: 1.0; /* Default 0.8 */
}

/* Example: Faster shooting stars */
@keyframes shootingStar {
  /* Adjust animation timing */
}
```

### Disabling Specific Effects

```javascript
// Disable parallax only
initNightmareEffects(container, {
  enableParallax: false
});

// Disable shooting stars only
initNightmareEffects(container, {
  enableShootingStars: false
});
```

---

## 📱 Responsive Behavior

### Mobile Devices
- Reduced city glow height
- Disabled text glows for performance
- Simplified animations

### Low-End Devices
- Performance mode auto-enabled
- Nebula fog disabled
- Static starfield (no animation)
- Light beams disabled

### Accessibility
- Respects `prefers-reduced-motion`
- All animations reduced to minimal duration
- Static starfield fallback

---

## 🐛 Troubleshooting

### Effects Not Appearing

1. Ensure CSS is imported:
   ```javascript
   import './monacoThemes/nightmareEffects.css';
   ```

2. Verify container structure:
   ```javascript
   const container = editorElement.parentElement; // Should be wrapper div
   initNightmareEffects(container);
   ```

3. Check console for warnings

### Performance Issues

Enable performance mode manually:

```javascript
initNightmareEffects(container, {
  performanceMode: true
});
```

Or use adaptive performance:

```javascript
import { enableAdaptivePerformance } from './monacoThemes/nightmareEffects.js';
enableAdaptivePerformance(controller, 30);
```

### Glows Not Visible

Monaco uses token classes like `.mtk5`, `.mtk12`, etc. The mapping may vary by language. To debug:

1. Inspect a keyword in DevTools
2. Note its `.mtk*` class number
3. Update [nightmareEffects.css](nightmareEffects.css) accordingly

### Parallax Not Working

Ensure Monaco editor has scrollable content and verify:

```javascript
const scrollable = container.querySelector('.monaco-scrollable-element');
console.log(scrollable); // Should not be null
```

---

## 🎯 Best Practices

### 1. Container Structure

```html
<div id="editor-wrapper" style="position: relative; height: 600px;">
  <!-- Monaco editor will be created here -->
</div>
```

```javascript
const editor = monaco.editor.create(document.getElementById('editor-wrapper'), {
  theme: 'nightmare'
});

initNightmareEffects(document.getElementById('editor-wrapper'));
```

### 2. Theme Switching

When switching themes, clean up first:

```javascript
// Store controller
let nightmareController = null;

function applyNightmareTheme() {
  editor.updateOptions({ theme: 'nightmare' });
  nightmareController = initNightmareEffects(container);
}

function applyOtherTheme() {
  nightmareController?.destroy();
  nightmareController = null;
  editor.updateOptions({ theme: 'vs-dark' });
}
```

### 3. Performance Monitoring

For production apps:

```javascript
const controller = initNightmareEffects(container, {
  performanceMode: window.innerWidth < 768 // Mobile
});

// Monitor and adapt
if (window.performance && window.performance.memory) {
  const memoryUsage = window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit;
  if (memoryUsage > 0.8) {
    controller.updateConfig({ performanceMode: true });
  }
}
```

---

## 🎬 Demo Code

Complete working example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nightmare Theme Demo</title>
  <style>
    body {
      margin: 0;
      background: #000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #editor-container {
      width: 100vw;
      height: 100vh;
      position: relative;
    }
  </style>
</head>
<body>
  <div id="editor-container"></div>

  <script type="module">
    import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/+esm';
    import nightmareTheme from './nightmare.js';
    import { initNightmareEffects } from './nightmareEffects.js';
    
    // Define theme
    monaco.editor.defineTheme('nightmare', nightmareTheme);

    // Sample code
    const code = `// Code under falling stars
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(\`Result: \${result}\`);

class NeonCity {
  constructor(name) {
    this.name = name;
    this.lights = [];
  }

  addLight(color, intensity) {
    this.lights.push({ color, intensity });
  }
}

const tokyo = new NeonCity("Tokyo");
tokyo.addLight("cyan", 0.8);
tokyo.addLight("magenta", 0.9);`;

    // Create editor
    const editor = monaco.editor.create(document.getElementById('editor-container'), {
      value: code,
      language: 'javascript',
      theme: 'nightmare',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: true },
      automaticLayout: true
    });

    // Initialize effects
    const controller = initNightmareEffects(document.getElementById('editor-container'));

    // Optional: Trigger shooting star on Ctrl+Shift+S
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        controller.shootStar();
      }
    });
  </script>
</body>
</html>
```

---

## 🌟 Credits

**Theme Name:** Nightmare  
**Tagline:** Code under falling stars  
**Style:** Premium Cinematic Cyberpunk  
**Inspiration:** Tokyo rooftops at 2AM, neon-lit silence, falling stars

---

## 📄 License

This theme is part of the studyweb project. Feel free to use and modify for your projects.

---

## 🤝 Contributing

To enhance the theme:

1. **Colors** - Edit `nightmare.js`
2. **Visual effects** - Edit `nightmareEffects.css`
3. **Animations** - Edit `nightmareEffects.js`

---

## 🔮 Roadmap

- [ ] VS Code theme port
- [ ] JetBrains IDE theme port
- [ ] Additional color variants (Sunrise, Midnight)
- [ ] Sound effects (optional ambient)
- [ ] WebGL enhanced starfield

---

**Enjoy coding in the night.** 🌃✨
