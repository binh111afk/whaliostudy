// ==================== THEME MANAGER ====================
// Dark Mode / Light Mode Toggle with localStorage persistence

const ThemeManager = {
    STORAGE_KEY: 'whalio-theme',
    DARK_CLASS: 'dark-mode',
    
    /**
     * Initialize theme on page load
     * Checks localStorage and applies saved preference
     */
    init() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        // Apply saved theme or default to light
        if (savedTheme === 'dark') {
            document.documentElement.classList.add(this.DARK_CLASS);
            this.updateToggleIcon(true);
        } else {
            document.documentElement.classList.remove(this.DARK_CLASS);
            this.updateToggleIcon(false);
        }
        
        // Set up event listeners for toggle buttons
        this.setupEventListeners();
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
        
        // Update theme-color meta tag for mobile browsers
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', isDark ? '#1a1b1e' : '#7c3aed');
        }
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

// Also run immediately to prevent flash of wrong theme
(function() {
    const savedTheme = localStorage.getItem('whalio-theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }
})();

// Export for module usage
export { ThemeManager };
