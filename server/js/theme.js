// ==================== THEME MANAGER ====================
// Dark Mode / Light Mode Toggle with localStorage persistence
// STRICT LOGIC: Ignores system preferences, always defaults to Light Mode

const ThemeManager = {
    STORAGE_KEY: 'whalio-theme',
    DARK_CLASS: 'dark-mode',
    LIGHT_THEME_COLOR: '#ffffff',  // White status bar for light mode
    DARK_THEME_COLOR: '#1a1b1e',   // Dark status bar for dark mode
    
    /**
     * Initialize theme on page load
     * STRICT: Check localStorage ONLY. If empty, force LIGHT mode.
     * NEVER use prefers-color-scheme.
     */
    init() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        // STRICT LOGIC:
        // 1. If localStorage has 'dark' -> apply dark mode
        // 2. If localStorage has 'light' OR is empty/null -> force light mode
        if (savedTheme === 'dark') {
            this.applyTheme(true);
        } else {
            // Force light mode (ignore system preference)
            this.applyTheme(false);
            // If localStorage was empty, explicitly save 'light' to prevent future issues
            if (!savedTheme) {
                localStorage.setItem(this.STORAGE_KEY, 'light');
            }
        }
        
        // Set up event listeners for toggle buttons
        this.setupEventListeners();
    },
    
    /**
     * Apply a specific theme
     * @param {boolean} isDark - Whether to apply dark mode
     */
    applyTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add(this.DARK_CLASS);
        } else {
            document.documentElement.classList.remove(this.DARK_CLASS);
        }
        
        // Update toggle button icons
        this.updateToggleIcon(isDark);
        
        // Update meta theme-color for mobile status bar (PWA)
        this.updateMetaThemeColor(isDark);
    },
    
    /**
     * Toggle between dark and light mode
     */
    toggle() {
        const isDark = document.documentElement.classList.toggle(this.DARK_CLASS);
        
        // Save preference to localStorage
        localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
        
        // Update toggle button icons
        this.updateToggleIcon(isDark);
        
        // Update meta theme-color for mobile status bar (PWA)
        this.updateMetaThemeColor(isDark);
    },
    
    /**
     * Update the meta theme-color tag for mobile browsers/PWA
     * This changes the status bar color on mobile devices
     * @param {boolean} isDark - Whether dark mode is active
     */
    updateMetaThemeColor(isDark) {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        
        // Create meta tag if it doesn't exist
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            document.head.appendChild(themeColorMeta);
        }
        
        themeColorMeta.setAttribute('content', isDark ? this.DARK_THEME_COLOR : this.LIGHT_THEME_COLOR);
    },
    
    /**
     * Update toggle button icons based on current theme
     * @param {boolean} isDark - Whether dark mode is active
     */
    updateToggleIcon(isDark) {
        const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
        
        toggleButtons.forEach(btn => {
            const sunIcon = btn.querySelector('.icon-sun');
            const moonIcon = btn.querySelector('.icon-moon');
            
            if (sunIcon && moonIcon) {
                if (isDark) {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                }
            }
        });
    },
    
    /**
     * Check if dark mode is currently active
     * @returns {boolean}
     */
    isDarkMode() {
        return document.documentElement.classList.contains(this.DARK_CLASS);
    },
    
    /**
     * Set up event listeners for theme toggle buttons
     */
    setupEventListeners() {
        const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => this.toggle());
        });
    }
};

// Initialize theme on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

// IIFE: Run immediately to prevent flash of wrong theme
// STRICT: Only apply dark if explicitly saved, otherwise force light
(function() {
    const savedTheme = localStorage.getItem('whalio-theme');
    
    // Only apply dark mode if explicitly set to 'dark'
    // Otherwise, ensure we're in light mode (remove dark-mode class if present)
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
    
    // Update meta theme-color immediately
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', savedTheme === 'dark' ? '#1a1b1e' : '#ffffff');
    }
})();

// Export for module usage
export { ThemeManager };
