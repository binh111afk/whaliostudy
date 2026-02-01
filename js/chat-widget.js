// ==================== WHALIO AI CHAT WIDGET V2 ====================
// Floating chat widget with Full Screen Mode (Gemini-style)
// Supports: Session History, Light/Dark mode, Syntax Highlighting
// Author: Whalio Team

const ChatWidget = {
    // ==================== STATE ====================
    isOpen: false,
    isFullScreen: false,
    isTyping: false,
    isSidebarOpen: true,
    currentSessionId: null,
    sessions: [],
    highlightJsLoaded: false,
    
    // ==================== CONFIG ====================
    API_ENDPOINT: '/api/chat',
    SESSIONS_ENDPOINT: '/api/sessions',
    SESSION_ENDPOINT: '/api/session',
    
    // Fallback responses
    fallbackResponses: [
        "Xin lỗi, mình đang gặp sự cố kết nối. Vui lòng thử lại sau nhé! 🙏",
        "Hệ thống đang bận, bạn có thể thử lại sau vài giây không?",
        "Mình chưa thể xử lý yêu cầu ngay bây giờ. Hãy thử lại nhé! 😊"
    ],
    
    // ==================== INITIALIZATION ====================
    init() {
        this.loadHighlightJs();
        this.injectStyles();
        this.createWidgetHTML();
        this.setupEventListeners();
        this.addWelcomeMessage();
    },
    
    // ==================== LOAD HIGHLIGHT.JS ====================
    loadHighlightJs() {
        if (window.hljs) {
            this.highlightJsLoaded = true;
            return;
        }
        
        // Dark theme
        const hljsCssDark = document.createElement('link');
        hljsCssDark.rel = 'stylesheet';
        hljsCssDark.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        hljsCssDark.id = 'hljs-theme-dark';
        document.head.appendChild(hljsCssDark);
        
        // Light theme
        const hljsCssLight = document.createElement('link');
        hljsCssLight.rel = 'stylesheet';
        hljsCssLight.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        hljsCssLight.id = 'hljs-theme-light';
        hljsCssLight.disabled = true;
        document.head.appendChild(hljsCssLight);
        
        // Script
        const hljsScript = document.createElement('script');
        hljsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        hljsScript.onload = () => {
            this.highlightJsLoaded = true;
            this.updateHighlightTheme();
        };
        document.head.appendChild(hljsScript);
    },
    
    updateHighlightTheme() {
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        const darkTheme = document.getElementById('hljs-theme-dark');
        const lightTheme = document.getElementById('hljs-theme-light');
        
        if (darkTheme && lightTheme) {
            darkTheme.disabled = !isDarkMode;
            lightTheme.disabled = isDarkMode;
        }
    },
    
    // ==================== INJECT CSS STYLES ====================
    injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'whalio-chat-styles';
        styles.textContent = `
            /* ==================== CSS VARIABLES ====================  */
            :root {
                --whalio-primary: #6366f1;
                --whalio-primary-dark: #4f46e5;
                --whalio-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                --whalio-gradient-hover: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
            }
            
            /* ==================== CHAT WIDGET CONTAINER ==================== */
            .whalio-chat-widget {
                position: fixed;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            /* ==================== LAUNCHER BUTTON ==================== */
            .whalio-launcher {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--whalio-gradient);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000000;
            }
            
            .whalio-launcher:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
            }
            
            .whalio-launcher.active {
                background: var(--whalio-gradient-hover);
            }
            
            .whalio-launcher svg {
                width: 28px;
                height: 28px;
                color: white;
                transition: transform 0.3s ease;
            }
            
            .whalio-launcher .icon-close {
                display: none;
            }
            
            .whalio-launcher.active .icon-open {
                display: none;
            }
            
            .whalio-launcher.active .icon-close {
                display: block;
            }
            
            /* ==================== CHAT WINDOW (WIDGET MODE) ==================== */
            .whalio-chat-window {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 400px;
                height: 550px;
                background: var(--bg-primary, #ffffff);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 999999;
                border: 1px solid var(--border-color, #e5e7eb);
            }
            
            .whalio-chat-window.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            
            /* ==================== FULLSCREEN MODE ==================== */
            .whalio-chat-window.fullscreen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                height: 100%;
                border-radius: 0;
                display: flex;
                flex-direction: row;
            }
            
            /* ==================== SIDEBAR (FULLSCREEN ONLY) ==================== */
            .whalio-sidebar {
                width: 280px;
                min-width: 280px;
                background: var(--bg-secondary, #f9fafb);
                border-right: 1px solid var(--border-color, #e5e7eb);
                display: none;
                flex-direction: column;
                transition: all 0.3s ease;
            }
            
            .whalio-chat-window.fullscreen .whalio-sidebar {
                display: flex;
            }
            
            .whalio-chat-window.fullscreen .whalio-sidebar.collapsed {
                width: 0;
                min-width: 0;
                overflow: hidden;
                border-right: none;
            }
            
            .whalio-sidebar-header {
                padding: 16px;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
            }
            
            .whalio-new-chat-btn {
                width: 100%;
                padding: 12px 16px;
                background: var(--whalio-gradient);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
            }
            
            .whalio-new-chat-btn:hover {
                background: var(--whalio-gradient-hover);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }
            
            .whalio-new-chat-btn svg {
                width: 18px;
                height: 18px;
            }
            
            .whalio-sidebar-title {
                padding: 16px 16px 8px;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary, #6b7280);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .whalio-sessions-list {
                flex: 1;
                overflow-y: auto;
                padding: 0 8px 16px;
            }
            
            .whalio-sessions-list::-webkit-scrollbar {
                width: 6px;
            }
            
            .whalio-sessions-list::-webkit-scrollbar-thumb {
                background: var(--border-color, #d1d5db);
                border-radius: 3px;
            }
            
            .whalio-session-item {
                padding: 12px 16px;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: all 0.2s ease;
                margin-bottom: 4px;
                position: relative;
            }
            
            .whalio-session-item:hover {
                background: var(--bg-hover, #f3f4f6);
            }
            
            .whalio-session-item.active {
                background: rgba(99, 102, 241, 0.1);
            }
            
            .whalio-session-item svg {
                width: 18px;
                height: 18px;
                color: var(--text-secondary, #6b7280);
                flex-shrink: 0;
            }
            
            .whalio-session-item.active svg {
                color: var(--whalio-primary);
            }
            
            .whalio-session-info {
                flex: 1;
                min-width: 0;
            }
            
            .whalio-session-title {
                font-size: 14px;
                color: var(--text-primary, #1f2937);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .whalio-session-item.active .whalio-session-title {
                color: var(--whalio-primary);
                font-weight: 500;
            }
            
            .whalio-session-date {
                font-size: 11px;
                color: var(--text-tertiary, #9ca3af);
                margin-top: 2px;
            }
            
            .whalio-session-delete {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 28px;
                height: 28px;
                border-radius: 6px;
                background: transparent;
                border: none;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary, #6b7280);
                transition: all 0.2s ease;
            }
            
            .whalio-session-item:hover .whalio-session-delete {
                display: flex;
            }
            
            .whalio-session-delete:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
            }
            
            .whalio-session-delete svg {
                width: 16px;
                height: 16px;
            }
            
            .whalio-sessions-empty {
                padding: 24px 16px;
                text-align: center;
                color: var(--text-secondary, #6b7280);
                font-size: 14px;
            }
            
            /* ==================== MAIN CHAT AREA ==================== */
            .whalio-main {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: 0;
                background: var(--bg-primary, #ffffff);
            }
            
            /* ==================== CHAT HEADER ==================== */
            .whalio-header {
                padding: 12px 16px;
                background: var(--whalio-gradient);
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            
            .whalio-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .whalio-toggle-sidebar {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.2s ease;
            }
            
            .whalio-chat-window.fullscreen .whalio-toggle-sidebar {
                display: flex;
            }
            
            .whalio-toggle-sidebar:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .whalio-toggle-sidebar svg {
                width: 20px;
                height: 20px;
            }
            
            .whalio-avatar {
                width: 36px;
                height: 36px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .whalio-avatar svg {
                width: 20px;
                height: 20px;
            }
            
            .whalio-header-info h4 {
                font-size: 15px;
                font-weight: 600;
                margin: 0;
            }
            
            .whalio-status {
                font-size: 12px;
                opacity: 0.9;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .whalio-status-dot {
                width: 8px;
                height: 8px;
                background: #34d399;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .whalio-header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .whalio-header-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.2s ease;
            }
            
            .whalio-header-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .whalio-header-btn svg {
                width: 18px;
                height: 18px;
            }
            
            /* ==================== MESSAGES AREA ==================== */
            .whalio-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                scroll-behavior: smooth;
            }
            
            .whalio-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .whalio-messages::-webkit-scrollbar-thumb {
                background: var(--border-color, #d1d5db);
                border-radius: 3px;
            }
            
            /* Centered container for fullscreen */
            .whalio-chat-window.fullscreen .whalio-messages {
                padding: 24px;
                max-width: 900px;
                margin: 0 auto;
                width: 100%;
            }
            
            .whalio-message {
                display: flex;
                gap: 12px;
                max-width: 100%;
            }
            
            .whalio-message.user {
                flex-direction: row-reverse;
            }
            
            .whalio-message-avatar {
                width: 32px;
                height: 32px;
                min-width: 32px;
                border-radius: 50%;
                background: var(--whalio-gradient);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .whalio-message-avatar svg {
                width: 16px;
                height: 16px;
            }
            
            .whalio-message.user .whalio-message-avatar {
                background: var(--bg-tertiary, #e5e7eb);
                color: var(--text-primary, #374151);
            }
            
            .whalio-message-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-width: calc(100% - 50px);
            }
            
            .whalio-message-bubble {
                padding: 12px 16px;
                border-radius: 16px;
                font-size: 14px;
                line-height: 1.6;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .whalio-message.ai .whalio-message-bubble {
                background: var(--bg-secondary, #f3f4f6);
                color: var(--text-primary, #1f2937);
                border-bottom-left-radius: 4px;
            }
            
            .whalio-message.user .whalio-message-bubble {
                background: var(--whalio-gradient);
                color: white;
                border-bottom-right-radius: 4px;
            }
            
            .whalio-message-time {
                font-size: 11px;
                color: var(--text-tertiary, #9ca3af);
                padding: 0 4px;
            }
            
            .whalio-message.user .whalio-message-time {
                text-align: right;
            }
            
            /* ==================== TYPING INDICATOR ==================== */
            .whalio-typing {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 12px;
            }
            
            .whalio-typing-dot {
                width: 8px;
                height: 8px;
                background: var(--text-secondary, #6b7280);
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            
            .whalio-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .whalio-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }
            
            /* ==================== INPUT AREA ==================== */
            .whalio-input-area {
                padding: 16px;
                border-top: 1px solid var(--border-color, #e5e7eb);
                background: var(--bg-primary, #ffffff);
            }
            
            .whalio-chat-window.fullscreen .whalio-input-area {
                max-width: 900px;
                margin: 0 auto;
                width: 100%;
                padding: 16px 24px 24px;
                border-top: none;
            }
            
            /* File Preview */
            .whalio-file-preview {
                margin-bottom: 12px;
                padding: 12px;
                background: var(--bg-secondary, #f3f4f6);
                border-radius: 12px;
                display: none;
                position: relative;
            }
            
            .whalio-file-preview.active {
                display: block;
            }
            
            .whalio-file-preview img {
                max-width: 200px;
                max-height: 150px;
                border-radius: 8px;
                object-fit: cover;
            }
            
            .whalio-file-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .whalio-file-icon {
                width: 40px;
                height: 40px;
                background: var(--whalio-primary);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .whalio-file-icon svg {
                width: 20px;
                height: 20px;
            }
            
            .whalio-file-details {
                flex: 1;
            }
            
            .whalio-file-name {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #1f2937);
            }
            
            .whalio-file-size {
                font-size: 12px;
                color: var(--text-secondary, #6b7280);
            }
            
            .whalio-file-remove {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.5);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.2s ease;
            }
            
            .whalio-file-remove:hover {
                background: rgba(239, 68, 68, 0.8);
            }
            
            .whalio-file-remove svg {
                width: 14px;
                height: 14px;
            }
            
            /* Input Wrapper */
            .whalio-input-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                background: var(--bg-secondary, #f3f4f6);
                border-radius: 24px;
                border: 2px solid transparent;
                transition: all 0.2s ease;
                min-height: 48px;
            }
            
            .whalio-input-wrapper:focus-within {
                border-color: var(--whalio-primary);
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
            }
            
            .whalio-input-wrapper.drag-over {
                border-color: var(--whalio-primary);
                background: rgba(99, 102, 241, 0.05);
            }
            
            .whalio-upload-btn {
                width: 40px;
                height: 40px;
                min-width: 40px;
                border-radius: 50%;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary, #6b7280);
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .whalio-upload-btn:hover {
                color: var(--whalio-primary);
                background: rgba(99, 102, 241, 0.1);
            }
            
            .whalio-upload-btn.has-file {
                color: var(--whalio-primary);
            }
            
            .whalio-upload-btn svg {
                width: 22px;
                height: 22px;
            }
            
            .whalio-textarea {
                flex: 1;
                border: none;
                background: transparent;
                resize: none;
                font-size: 15px;
                line-height: 1.5;
                color: var(--text-primary, #1f2937);
                min-height: 28px;
                max-height: 150px;
                outline: none;
                font-family: inherit;
                padding: 6px 0;
            }
            
            .whalio-textarea::placeholder {
                color: var(--text-tertiary, #9ca3af);
            }
            
            .whalio-send-btn {
                width: 40px;
                height: 40px;
                min-width: 40px;
                border-radius: 50%;
                background: var(--whalio-gradient);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .whalio-send-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            }
            
            .whalio-send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .whalio-send-btn svg {
                width: 18px;
                height: 18px;
                margin-left: 2px;
            }
            
            /* ==================== CODE BLOCKS ==================== */
            .whalio-message-bubble .code-block-wrapper {
                margin: 12px 0;
                border-radius: 8px;
                overflow: hidden;
                background: #0d1117;
                border: 1px solid #30363d;
            }
            
            .whalio-message-bubble .code-block-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #161b22;
                border-bottom: 1px solid #30363d;
                font-size: 12px;
                color: #8b949e;
            }
            
            .whalio-message-bubble .code-block-lang {
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .whalio-message-bubble .code-copy-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: transparent;
                border: 1px solid #30363d;
                border-radius: 6px;
                color: #8b949e;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .whalio-message-bubble .code-copy-btn:hover {
                background: #30363d;
                color: #f0f6fc;
            }
            
            .whalio-message-bubble .code-copy-btn.copied {
                background: #238636;
                border-color: #238636;
                color: #ffffff;
            }
            
            .whalio-message-bubble .code-copy-btn svg {
                width: 14px;
                height: 14px;
            }
            
            .whalio-message-bubble pre {
                margin: 0;
                padding: 12px 16px;
                overflow-x: auto;
                background: #0d1117;
            }
            
            .whalio-message-bubble pre code {
                font-family: 'Fira Code', 'Consolas', monospace;
                font-size: 13px;
                line-height: 1.5;
                background: transparent;
                white-space: pre;
            }
            
            .whalio-message-bubble code:not(pre code) {
                background: rgba(110, 118, 129, 0.2);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Fira Code', monospace;
                font-size: 0.9em;
            }
            
            /* Light mode code */
            html:not(.dark-mode) .whalio-message-bubble .code-block-wrapper {
                background: #f6f8fa;
                border-color: #d0d7de;
            }
            
            html:not(.dark-mode) .whalio-message-bubble .code-block-header {
                background: #f6f8fa;
                border-color: #d0d7de;
                color: #57606a;
            }
            
            html:not(.dark-mode) .whalio-message-bubble pre {
                background: #f6f8fa;
            }
            
            /* User message code styling */
            .whalio-message.user .whalio-message-bubble code:not(pre code) {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            /* ==================== MESSAGE IMAGE & FILE ==================== */
            .whalio-message-image img {
                max-width: 100%;
                max-height: 300px;
                border-radius: 12px;
                margin-bottom: 8px;
            }
            
            .whalio-message-file {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 8px;
                margin-bottom: 8px;
            }
            
            .whalio-message.user .whalio-message-file {
                background: rgba(255, 255, 255, 0.1);
            }
            
            /* ==================== MOBILE RESPONSIVE ==================== */
            @media (max-width: 768px) {
                .whalio-chat-window {
                    width: calc(100% - 20px);
                    height: calc(100% - 120px);
                    bottom: 90px;
                    right: 10px;
                    left: 10px;
                }
                
                .whalio-chat-window.fullscreen .whalio-sidebar {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    z-index: 10;
                    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
                }
                
                .whalio-chat-window.fullscreen .whalio-sidebar.collapsed {
                    transform: translateX(-100%);
                }
                
                .whalio-launcher {
                    bottom: 16px;
                    right: 16px;
                    width: 56px;
                    height: 56px;
                }
            }
            
            /* ==================== DARK MODE OVERRIDES ==================== */
            .dark-mode .whalio-chat-window {
                background: var(--bg-primary, #1f2937);
                border-color: var(--border-color, #374151);
            }
            
            .dark-mode .whalio-sidebar {
                background: var(--bg-secondary, #111827);
                border-color: var(--border-color, #374151);
            }
            
            .dark-mode .whalio-session-item:hover {
                background: var(--bg-hover, #374151);
            }
            
            .dark-mode .whalio-input-wrapper {
                background: var(--bg-secondary, #374151);
            }
            
            .dark-mode .whalio-message.ai .whalio-message-bubble {
                background: var(--bg-secondary, #374151);
            }
            
            .dark-mode .whalio-file-preview {
                background: var(--bg-secondary, #374151);
            }
        `;
        document.head.appendChild(styles);
    },
    
    // ==================== CREATE HTML ====================
    createWidgetHTML() {
        const html = `
            <div class="whalio-chat-widget" id="whalio-chat-widget">
                <!-- Launcher Button -->
                <button class="whalio-launcher" id="whalio-launcher" aria-label="Open chat">
                    <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.08L2 22l4.92-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                        <circle cx="8" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="16" cy="12" r="1" fill="currentColor"/>
                    </svg>
                    <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
                
                <!-- Chat Window -->
                <div class="whalio-chat-window" id="whalio-chat-window">
                    <!-- Sidebar (Fullscreen only) -->
                    <div class="whalio-sidebar" id="whalio-sidebar">
                        <div class="whalio-sidebar-header">
                            <button class="whalio-new-chat-btn" id="whalio-new-chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                Cuộc trò chuyện mới
                            </button>
                        </div>
                        <div class="whalio-sidebar-title">Lịch sử trò chuyện</div>
                        <div class="whalio-sessions-list" id="whalio-sessions-list">
                            <div class="whalio-sessions-empty">Chưa có cuộc trò chuyện nào</div>
                        </div>
                    </div>
                    
                    <!-- Main Chat Area -->
                    <div class="whalio-main">
                        <!-- Header -->
                        <div class="whalio-header">
                            <div class="whalio-header-left">
                                <button class="whalio-toggle-sidebar" id="whalio-toggle-sidebar" aria-label="Toggle sidebar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="3" y1="6" x2="21" y2="6"/>
                                        <line x1="3" y1="12" x2="21" y2="12"/>
                                        <line x1="3" y1="18" x2="21" y2="18"/>
                                    </svg>
                                </button>
                                <div class="whalio-avatar">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                </div>
                                <div class="whalio-header-info">
                                    <h4>Whalio AI</h4>
                                    <span class="whalio-status">
                                        <span class="whalio-status-dot"></span>
                                        Trực tuyến
                                    </span>
                                </div>
                            </div>
                            <div class="whalio-header-actions">
                                <button class="whalio-header-btn" id="whalio-fullscreen-btn" aria-label="Toggle fullscreen">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                    </svg>
                                </button>
                                <button class="whalio-header-btn" id="whalio-close-btn" aria-label="Close">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Messages -->
                        <div class="whalio-messages" id="whalio-messages"></div>
                        
                        <!-- Input Area -->
                        <div class="whalio-input-area">
                            <!-- File Preview -->
                            <div class="whalio-file-preview" id="whalio-file-preview">
                                <img id="whalio-preview-img" src="" alt="Preview" style="display: none;" />
                                <div class="whalio-file-info" id="whalio-file-info" style="display: none;">
                                    <div class="whalio-file-icon">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/>
                                            <path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1"/>
                                        </svg>
                                    </div>
                                    <div class="whalio-file-details">
                                        <div class="whalio-file-name"></div>
                                        <div class="whalio-file-size"></div>
                                    </div>
                                </div>
                                <button class="whalio-file-remove" id="whalio-file-remove" aria-label="Remove file">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 6L6 18M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Input Wrapper -->
                            <div class="whalio-input-wrapper" id="whalio-input-wrapper">
                                <input type="file" id="whalio-file-input" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.js,.html,.css,.py,.java,.cpp,.c,.ts,.jsx,.tsx,.json,.xml,.yaml,.yml,.md,.sql,.sh" hidden />
                                <button class="whalio-upload-btn" id="whalio-upload-btn" aria-label="Attach file">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="8" x2="12" y2="16"/>
                                        <line x1="8" y1="12" x2="16" y2="12"/>
                                    </svg>
                                </button>
                                <textarea class="whalio-textarea" id="whalio-textarea" placeholder="Hỏi Whalio bất cứ điều gì..." rows="1"></textarea>
                                <button class="whalio-send-btn" id="whalio-send-btn" aria-label="Send message">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Launcher
        document.getElementById('whalio-launcher').addEventListener('click', () => this.toggleChat());
        
        // Close button
        document.getElementById('whalio-close-btn').addEventListener('click', () => this.closeChat());
        
        // Fullscreen toggle
        document.getElementById('whalio-fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
        // Sidebar toggle
        document.getElementById('whalio-toggle-sidebar').addEventListener('click', () => this.toggleSidebar());
        
        // New chat button
        document.getElementById('whalio-new-chat').addEventListener('click', () => this.startNewChat());
        
        // Send button
        document.getElementById('whalio-send-btn').addEventListener('click', () => this.handleSendMessage());
        
        // Textarea
        const textarea = document.getElementById('whalio-textarea');
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                this.autoResizeTextarea(textarea);
                return;
            }
            
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
        
        // File upload
        document.getElementById('whalio-upload-btn').addEventListener('click', () => {
            document.getElementById('whalio-file-input').click();
        });
        
        document.getElementById('whalio-file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('whalio-file-remove').addEventListener('click', () => this.clearSelectedFile());
        
        // Drag & Drop
        const inputWrapper = document.getElementById('whalio-input-wrapper');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            inputWrapper.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(event => {
            inputWrapper.addEventListener(event, () => inputWrapper.classList.add('drag-over'));
        });
        
        ['dragleave', 'drop'].forEach(event => {
            inputWrapper.addEventListener(event, () => inputWrapper.classList.remove('drag-over'));
        });
        
        inputWrapper.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files: [files[0]] } });
            }
        });
        
        // Theme observer
        const observer = new MutationObserver(() => this.updateHighlightTheme());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    },
    
    // ==================== CHAT CONTROLS ====================
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    },
    
    openChat() {
        const chatWindow = document.getElementById('whalio-chat-window');
        const launcher = document.getElementById('whalio-launcher');
        
        chatWindow.classList.add('open');
        launcher.classList.add('active');
        this.isOpen = true;
        
        // Load sessions when opening fullscreen
        if (this.isFullScreen) {
            this.loadSessions();
        }
        
        setTimeout(() => {
            document.getElementById('whalio-textarea').focus();
        }, 300);
    },
    
    closeChat() {
        const chatWindow = document.getElementById('whalio-chat-window');
        const launcher = document.getElementById('whalio-launcher');
        
        chatWindow.classList.remove('open');
        launcher.classList.remove('active');
        this.isOpen = false;
        
        // Exit fullscreen when closing
        if (this.isFullScreen) {
            this.exitFullscreen();
        }
    },
    
    toggleFullscreen() {
        if (this.isFullScreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    },
    
    enterFullscreen() {
        const chatWindow = document.getElementById('whalio-chat-window');
        const launcher = document.getElementById('whalio-launcher');
        const fullscreenBtn = document.getElementById('whalio-fullscreen-btn');
        
        chatWindow.classList.add('fullscreen');
        launcher.style.display = 'none';
        this.isFullScreen = true;
        
        // Change icon to minimize
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7"/>
            </svg>
        `;
        
        // Load sessions
        this.loadSessions();
    },
    
    exitFullscreen() {
        const chatWindow = document.getElementById('whalio-chat-window');
        const launcher = document.getElementById('whalio-launcher');
        const fullscreenBtn = document.getElementById('whalio-fullscreen-btn');
        
        chatWindow.classList.remove('fullscreen');
        launcher.style.display = 'flex';
        this.isFullScreen = false;
        
        // Change icon back to maximize
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
        `;
    },
    
    toggleSidebar() {
        const sidebar = document.getElementById('whalio-sidebar');
        sidebar.classList.toggle('collapsed');
        this.isSidebarOpen = !sidebar.classList.contains('collapsed');
    },
    
    // ==================== SESSION MANAGEMENT ====================
    async loadSessions() {
        try {
            const response = await fetch(this.SESSIONS_ENDPOINT);
            const data = await response.json();
            
            if (data.success && data.sessions) {
                this.sessions = data.sessions;
                this.renderSessionsList();
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    },
    
    renderSessionsList() {
        const container = document.getElementById('whalio-sessions-list');
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="whalio-sessions-empty">Chưa có cuộc trò chuyện nào</div>';
            return;
        }
        
        container.innerHTML = this.sessions.map(session => {
            const date = new Date(session.createdAt);
            const dateStr = date.toLocaleDateString('vi-VN', { 
                day: '2-digit', 
                month: '2-digit',
                year: 'numeric'
            });
            
            const isActive = session.sessionId === this.currentSessionId;
            
            return `
                <div class="whalio-session-item ${isActive ? 'active' : ''}" data-session-id="${session.sessionId}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div class="whalio-session-info">
                        <div class="whalio-session-title">${this.escapeHtml(session.title)}</div>
                        <div class="whalio-session-date">${dateStr}</div>
                    </div>
                    <button class="whalio-session-delete" data-session-id="${session.sessionId}" aria-label="Delete session">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
        
        // Add click listeners
        container.querySelectorAll('.whalio-session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.whalio-session-delete')) return;
                const sessionId = item.dataset.sessionId;
                this.loadSession(sessionId);
            });
        });
        
        container.querySelectorAll('.whalio-session-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sessionId = btn.dataset.sessionId;
                this.deleteSession(sessionId);
            });
        });
    },
    
    async loadSession(sessionId) {
        try {
            const response = await fetch(`${this.SESSION_ENDPOINT}/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.session) {
                this.currentSessionId = sessionId;
                this.clearMessages();
                
                // Render messages
                data.session.messages.forEach(msg => {
                    this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai', false);
                });
                
                this.scrollToBottom();
                this.renderSessionsList();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    },
    
    async deleteSession(sessionId) {
        if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;
        
        try {
            const response = await fetch(`${this.SESSION_ENDPOINT}/${sessionId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                // If deleting current session, start new chat
                if (sessionId === this.currentSessionId) {
                    this.startNewChat();
                }
                
                // Reload sessions list
                this.loadSessions();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    },
    
    startNewChat() {
        this.currentSessionId = null;
        this.clearMessages();
        this.addWelcomeMessage();
        this.renderSessionsList();
        document.getElementById('whalio-textarea').focus();
    },
    
    clearMessages() {
        document.getElementById('whalio-messages').innerHTML = '';
    },
    
    // ==================== MESSAGING ====================
    addWelcomeMessage() {
        setTimeout(() => {
            this.addMessage("Xin chào! 👋 Mình là Whalio AI Assistant. Mình có thể giúp bạn tìm hiểu về các tính năng của Whalio, giải đáp thắc mắc, hoặc hỗ trợ lập trình. Hãy hỏi mình bất cứ điều gì!", 'ai', false);
        }, 300);
    },
    
    async handleSendMessage() {
        const textarea = document.getElementById('whalio-textarea');
        const message = textarea.value.trim();
        
        if ((!message && !this.selectedFile) || this.isTyping) return;
        
        // Display user message
        if (this.selectedFile) {
            this.addMessageWithFile(message, this.selectedFile, 'user');
        } else {
            this.addMessage(message, 'user');
        }
        
        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';
        
        // Show typing
        this.showTypingIndicator();
        
        try {
            const formData = new FormData();
            formData.append('message', message);
            
            // Attach sessionId if exists
            if (this.currentSessionId) {
                formData.append('sessionId', this.currentSessionId);
            }
            
            // Attach file
            if (this.selectedFile) {
                formData.append('image', this.selectedFile);
            }
            
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            this.hideTypingIndicator();
            
            if (data.success) {
                // Update session ID
                if (data.sessionId) {
                    this.currentSessionId = data.sessionId;
                    
                    // Reload sessions if in fullscreen
                    if (this.isFullScreen && data.isNewSession) {
                        this.loadSessions();
                    }
                }
                
                this.addMessage(data.response, 'ai');
            } else {
                const errorMessage = data.response || data.message || 'Xin lỗi, mình không thể xử lý yêu cầu này.';
                this.addMessage(errorMessage, 'ai');
            }
            
        } catch (error) {
            console.error('Chat API Error:', error);
            this.hideTypingIndicator();
            const fallback = this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
            this.addMessage(fallback, 'ai');
        } finally {
            this.clearSelectedFile();
        }
    },
    
    addMessage(text, sender, scroll = true) {
        const container = document.getElementById('whalio-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `whalio-message ${sender}`;
        
        const time = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const formattedText = this.formatMessage(text);
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="whalio-message-avatar">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                </div>
                <div class="whalio-message-content">
                    <div class="whalio-message-bubble">${formattedText}</div>
                    <span class="whalio-message-time">${time}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="whalio-message-content">
                    <div class="whalio-message-bubble">${formattedText}</div>
                    <span class="whalio-message-time">${time}</span>
                </div>
                <div class="whalio-message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>
            `;
        }
        
        container.appendChild(messageDiv);
        this.applyHighlighting(messageDiv);
        
        if (scroll) this.scrollToBottom();
    },
    
    addMessageWithFile(text, file, sender) {
        const container = document.getElementById('whalio-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `whalio-message ${sender}`;
        
        const time = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const textContent = text ? `<div class="whalio-message-text">${this.formatMessage(text)}</div>` : '';
        const isImage = file.type.startsWith('image/');
        let fileContent = '';
        
        if (isImage) {
            const imageUrl = URL.createObjectURL(file);
            fileContent = `<div class="whalio-message-image"><img src="${imageUrl}" alt="Sent image" /></div>`;
        } else {
            fileContent = `
                <div class="whalio-message-file">
                    <div class="whalio-file-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/>
                        </svg>
                    </div>
                    <div class="whalio-file-details">
                        <div class="whalio-file-name">${this.escapeHtml(file.name)}</div>
                        <div class="whalio-file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="whalio-message-content">
                <div class="whalio-message-bubble">${fileContent}${textContent}</div>
                <span class="whalio-message-time">${time}</span>
            </div>
            <div class="whalio-message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
        `;
        
        container.appendChild(messageDiv);
        this.scrollToBottom();
    },
    
    showTypingIndicator() {
        this.isTyping = true;
        const container = document.getElementById('whalio-messages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'whalio-message ai';
        typingDiv.id = 'whalio-typing-indicator';
        typingDiv.innerHTML = `
            <div class="whalio-message-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
            <div class="whalio-message-content">
                <div class="whalio-typing">
                    <span class="whalio-typing-dot"></span>
                    <span class="whalio-typing-dot"></span>
                    <span class="whalio-typing-dot"></span>
                </div>
            </div>
        `;
        
        container.appendChild(typingDiv);
        this.scrollToBottom();
    },
    
    hideTypingIndicator() {
        this.isTyping = false;
        const indicator = document.getElementById('whalio-typing-indicator');
        if (indicator) indicator.remove();
    },
    
    scrollToBottom() {
        const container = document.getElementById('whalio-messages');
        container.scrollTop = container.scrollHeight;
    },
    
    // ==================== FILE HANDLING ====================
    selectedFile: null,
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            alert('File quá lớn! Vui lòng chọn file nhỏ hơn 50MB.');
            return;
        }
        
        this.selectedFile = file;
        
        const preview = document.getElementById('whalio-file-preview');
        const previewImg = document.getElementById('whalio-preview-img');
        const fileInfo = document.getElementById('whalio-file-info');
        
        const isImage = file.type.startsWith('image/');
        
        if (isImage) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = 'block';
                fileInfo.style.display = 'none';
                preview.classList.add('active');
            };
            reader.readAsDataURL(file);
        } else {
            fileInfo.querySelector('.whalio-file-name').textContent = file.name;
            fileInfo.querySelector('.whalio-file-size').textContent = this.formatFileSize(file.size);
            previewImg.style.display = 'none';
            fileInfo.style.display = 'flex';
            preview.classList.add('active');
        }
        
        document.getElementById('whalio-upload-btn').classList.add('has-file');
    },
    
    clearSelectedFile() {
        this.selectedFile = null;
        document.getElementById('whalio-file-input').value = '';
        document.getElementById('whalio-file-preview').classList.remove('active');
        document.getElementById('whalio-preview-img').style.display = 'none';
        document.getElementById('whalio-file-info').style.display = 'none';
        document.getElementById('whalio-upload-btn').classList.remove('has-file');
    },
    
    // ==================== UTILITIES ====================
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 28), 150);
        textarea.style.height = newHeight + 'px';
    },
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatMessage(text) {
        const generateId = () => 'code-' + Math.random().toString(36).substr(2, 9);
        
        // Extract code blocks
        const codeBlocks = [];
        let processedText = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const id = generateId();
            const language = lang || 'plaintext';
            const escapedCode = code.trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            const codeBlockHTML = `
                <div class="code-block-wrapper" id="${id}">
                    <div class="code-block-header">
                        <span class="code-block-lang">${language}</span>
                        <button class="code-copy-btn" onclick="ChatWidget.copyCodeToClipboard(this)" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                    <pre><code class="language-${language}">${escapedCode}</code></pre>
                </div>
            `;
            
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(codeBlockHTML);
            return placeholder;
        });
        
        // Escape HTML
        const div = document.createElement('div');
        div.textContent = processedText;
        let safeText = div.innerHTML;
        
        // Restore code blocks
        codeBlocks.forEach((block, index) => {
            safeText = safeText.replace(`__CODE_BLOCK_${index}__`, block);
        });
        
        // Inline code
        safeText = safeText.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold
        safeText = safeText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        safeText = safeText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        // Newlines (outside code blocks)
        const parts = safeText.split(/(<div class="code-block-wrapper"[\s\S]*?<\/div>\s*<\/div>)/g);
        safeText = parts.map((part, index) => {
            if (index % 2 === 1) return part;
            return part.replace(/\n/g, '<br>');
        }).join('');
        
        return safeText;
    },
    
    applyHighlighting(container) {
        if (!this.highlightJsLoaded || !window.hljs) return;
        
        const codeBlocks = container.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            requestAnimationFrame(() => {
                hljs.highlightElement(block);
            });
        });
    },
    
    copyCodeToClipboard(button) {
        const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
        const code = codeBlock.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
});

// Export globally
window.ChatWidget = ChatWidget;
