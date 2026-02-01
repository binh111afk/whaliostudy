// ==================== WHALIO AI CHAT WIDGET ====================
// Floating chat widget connected to Google Gemini AI
// Supports both Light and Dark mode via CSS variables
// Enhanced with Syntax Highlighting and Code Programming Support
// FIXED: Wrapping issues, unwanted indentation, and proper pre-wrap handling

const ChatWidget = {
    isOpen: false,
    isTyping: false,
    API_ENDPOINT: '/api/chat',
    highlightJsLoaded: false,
    
    // Fallback responses when API is unavailable
    fallbackResponses: [
        "Xin lỗi, mình đang gặp sự cố kết nối. Vui lòng thử lại sau nhé! 🙏",
        "Hệ thống đang bận, bạn có thể thử lại sau vài giây không?",
        "Mình chưa thể xử lý yêu cầu ngay bây giờ. Hãy thử lại nhé! 😊"
    ],
    
    /**
     * Initialize the chat widget
     */
    init() {
        this.loadHighlightJs();
        this.injectCustomStyles();
        this.createWidgetHTML();
        this.setupEventListeners();
        this.addWelcomeMessage();
    },
    
    /**
     * Load highlight.js library from CDN
     */
    loadHighlightJs() {
        // Check if already loaded
        if (window.hljs) {
            this.highlightJsLoaded = true;
            return;
        }
        
        // Load CSS theme (GitHub Dark - matches VS Code dark theme)
        const hljsCss = document.createElement('link');
        hljsCss.rel = 'stylesheet';
        hljsCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        hljsCss.id = 'hljs-theme-dark';
        document.head.appendChild(hljsCss);
        
        // Also load light theme for light mode
        const hljsCssLight = document.createElement('link');
        hljsCssLight.rel = 'stylesheet';
        hljsCssLight.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        hljsCssLight.id = 'hljs-theme-light';
        hljsCssLight.disabled = true; // Disabled by default
        document.head.appendChild(hljsCssLight);
        
        // Load highlight.js script
        const hljsScript = document.createElement('script');
        hljsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        hljsScript.onload = () => {
            this.highlightJsLoaded = true;
            console.log('✅ Highlight.js loaded successfully');
            
            // Update theme based on current mode
            this.updateHighlightTheme();
        };
        hljsScript.onerror = () => {
            console.warn('⚠️ Failed to load highlight.js');
        };
        document.head.appendChild(hljsScript);
    },
    
    /**
     * Update highlight.js theme based on dark/light mode
     */
    updateHighlightTheme() {
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        const darkTheme = document.getElementById('hljs-theme-dark');
        const lightTheme = document.getElementById('hljs-theme-light');
        
        if (darkTheme && lightTheme) {
            darkTheme.disabled = !isDarkMode;
            lightTheme.disabled = isDarkMode;
        }
    },
    
    /**
     * Inject custom CSS styles for code blocks and textarea
     */
    injectCustomStyles() {
        const customStyles = document.createElement('style');
        customStyles.id = 'whalio-chat-custom-styles';
        customStyles.textContent = `
            /* ==================== CRITICAL OVERFLOW FIX ==================== */
            /* Chat messages container */
            #chat-messages.chat-messages {
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-width: thin;
                scrollbar-color: var(--border-color, #ccc) transparent;
            }
            
            #chat-messages.chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            #chat-messages.chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            #chat-messages.chat-messages::-webkit-scrollbar-thumb {
                background: var(--border-color, #ccc);
                border-radius: 3px;
            }
            
            #chat-messages.chat-messages::-webkit-scrollbar-thumb:hover {
                background: var(--text-secondary, #999);
            }
            
            /* Chat message row */
            .chat-message {
                max-width: 100%;
                box-sizing: border-box;
            }
            
            /* Message bubble - CRITICAL FIX with PRE-WRAP and FIT-CONTENT */
            .chat-message .message-bubble {
                max-width: 85%;
                width: fit-content;
                display: inline-block;
                word-wrap: break-word;
                overflow-wrap: anywhere;
                word-break: break-word;
                box-sizing: border-box;
                white-space: pre-wrap; /* PRESERVE USER INDENTATION */
                overflow-x: auto; /* Handle horizontal overflow */
                font-family: inherit;
            }
            
            /* AI message specific */
            .ai-message .message-content {
                max-width: 100%;
                min-width: 0;
            }
            
            .ai-message .message-bubble {
                white-space: pre-wrap; /* PRESERVE AI RESPONSE INDENTATION */
                font-family: inherit;
                max-width: 85%;
                width: fit-content;
                display: inline-block;
                overflow: hidden;
            }
            
            /* User message specific */
            .user-message .message-content {
                max-width: 100%;
                min-width: 0;
            }
            
            .user-message .message-bubble {
                max-width: 85%;
                width: fit-content;
                display: inline-block;
                white-space: pre-wrap; /* PRESERVE USER MESSAGE INDENTATION */
            }
            
            /* ==================== TEXTAREA AUTO-RESIZE STYLES ==================== */
            .chat-input-wrapper .chat-input {
                resize: none;
                min-height: 40px;
                max-height: 200px;
                overflow-y: auto;
                line-height: 1.4;
                padding: 10px 0;
                font-family: inherit;
                scrollbar-width: thin;
            }
            
            .chat-input-wrapper .chat-input::-webkit-scrollbar {
                width: 4px;
            }
            
            .chat-input-wrapper .chat-input::-webkit-scrollbar-thumb {
                background: var(--border-color);
                border-radius: 2px;
            }
            
            /* ==================== CODE BLOCK STYLES - OVERFLOW FIX ==================== */
            .message-bubble .code-block-wrapper {
                position: relative;
                margin: 8px 0;
                border-radius: 8px;
                overflow: hidden;
                background: #0d1117;
                border: 1px solid #30363d;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .message-bubble .code-block-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #161b22;
                border-bottom: 1px solid #30363d;
            }
            
            .message-bubble .code-block-lang {
                font-size: 12px;
                font-weight: 600;
                color: #8b949e;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .message-bubble .code-copy-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 4px;
                color: #c9d1d9;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .message-bubble .code-copy-btn:hover {
                background: #30363d;
                border-color: #8b949e;
            }
            
            .message-bubble .code-copy-btn.copied {
                background: #238636;
                border-color: #2ea043;
            }
            
            .message-bubble .code-copy-btn svg {
                width: 14px;
                height: 14px;
            }
            
            .message-bubble .code-block-wrapper pre {
                margin: 0;
                padding: 12px;
                overflow-x: auto;
                background: #0d1117;
                scrollbar-width: thin;
                scrollbar-color: #30363d #0d1117;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .message-bubble .code-block-wrapper pre::-webkit-scrollbar {
                height: 8px;
            }
            
            .message-bubble .code-block-wrapper pre::-webkit-scrollbar-track {
                background: #0d1117;
            }
            
            .message-bubble .code-block-wrapper pre::-webkit-scrollbar-thumb {
                background: #30363d;
                border-radius: 4px;
            }
            
            .message-bubble .code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
                background: #484f58;
            }
            
            .message-bubble .code-block-wrapper code {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.5;
                color: #c9d1d9;
                background: transparent;
                padding: 0;
                border-radius: 0;
                white-space: pre;
                display: block;
                min-width: max-content;
            }
            
            /* Inline code */
            .message-bubble code:not(.code-block-wrapper code) {
                background: var(--code-bg, #f6f8fa);
                color: var(--code-text, #24292f);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 0.9em;
                border: 1px solid var(--border-color, #d0d7de);
            }
            
            /* Dark mode inline code */
            .dark-mode .message-bubble code:not(.code-block-wrapper code) {
                background: #161b22;
                color: #c9d1d9;
                border-color: #30363d;
            }
            
            /* ==================== TYPING INDICATOR ==================== */
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 10px 16px;
                background: var(--ai-bubble-bg, #f0f0f0);
                border-radius: 18px;
                width: fit-content;
            }
            
            .typing-dot {
                width: 8px;
                height: 8px;
                background: var(--text-secondary, #888);
                border-radius: 50%;
                animation: typing-bounce 1.4s infinite ease-in-out;
            }
            
            .typing-dot:nth-child(1) {
                animation-delay: -0.32s;
            }
            
            .typing-dot:nth-child(2) {
                animation-delay: -0.16s;
            }
            
            @keyframes typing-bounce {
                0%, 80%, 100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            /* ==================== FILE UPLOAD PREVIEW ==================== */
            .file-preview {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
                padding: 8px 12px;
                background: var(--bg-secondary, #f5f5f5);
                border-radius: 8px;
                font-size: 13px;
            }
            
            .file-preview-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .file-preview-info {
                flex: 1;
                min-width: 0;
            }
            
            .file-preview-name {
                font-weight: 500;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .file-preview-size {
                color: var(--text-secondary);
                font-size: 11px;
            }
            
            .file-preview-remove {
                width: 20px;
                height: 20px;
                padding: 0;
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .file-preview-remove:hover {
                background: var(--border-color);
                color: var(--text-primary);
            }
            
            .file-preview-remove svg {
                width: 16px;
                height: 16px;
            }
            
            /* ==================== MESSAGE IMAGE PREVIEW ==================== */
            .message-image {
                max-width: 100%;
                border-radius: 8px;
                margin: 4px 0;
                display: block;
            }
            
            .message-file-info {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--bg-secondary, #f5f5f5);
                border-radius: 8px;
                margin: 4px 0;
                font-size: 13px;
            }
            
            .message-file-info svg {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }
            
            .message-file-name {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .message-file-size {
                color: var(--text-secondary);
                font-size: 11px;
            }
        `;
        
        document.head.appendChild(customStyles);
    },
    
    /**
     * Clean HTML by removing indentation artifacts from template literals
     * @param {string} html 
     * @returns {string}
     */
    cleanHTML(html) {
        return html
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('');
    },
    
    /**
     * Create the main widget HTML structure
     */
    createWidgetHTML() {
        const widgetHTML = `
            <div id="chat-widget" class="chat-widget">
                <button id="chat-toggle" class="chat-toggle" aria-label="Toggle chat">
                    <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                
                <div id="chat-container" class="chat-container">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="chat-title">Whalio AI</h3>
                                <p class="chat-status">Online</p>
                            </div>
                        </div>
                        <button id="chat-minimize" class="chat-minimize" aria-label="Minimize chat">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages"></div>
                    
                    <div class="chat-input-container">
                        <div id="file-preview-container"></div>
                        <div class="chat-input-wrapper">
                            <textarea 
                                id="chat-input" 
                                class="chat-input" 
                                placeholder="Nhập tin nhắn..."
                                rows="1"
                            ></textarea>
                            <div class="chat-actions">
                                <label class="attach-btn" aria-label="Attach file">
                                    <input type="file" id="file-input" accept="image/*,.pdf,.doc,.docx,.txt" style="display: none;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                    </svg>
                                </label>
                                <button id="send-btn" class="send-btn" aria-label="Send message">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },
    
    /**
     * Set up event listeners for chat interactions
     */
    setupEventListeners() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatMinimize = document.getElementById('chat-minimize');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const fileInput = document.getElementById('file-input');
        
        // Toggle chat window
        chatToggle.addEventListener('click', () => this.toggleChat());
        chatMinimize.addEventListener('click', () => this.toggleChat());
        
        // Send message on button click
        sendBtn.addEventListener('click', () => this.handleSendMessage());
        
        // Send message on Enter (Shift+Enter for new line)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
            
            // Handle Tab key for indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = chatInput.selectionStart;
                const end = chatInput.selectionEnd;
                const value = chatInput.value;
                
                // Insert 4 spaces at cursor position
                chatInput.value = value.substring(0, start) + '    ' + value.substring(end);
                chatInput.selectionStart = chatInput.selectionEnd = start + 4;
            }
        });
        
        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            this.autoResizeTextarea(chatInput);
        });
        
        // File upload handling
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Listen for dark mode changes
        const observer = new MutationObserver(() => {
            this.updateHighlightTheme();
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    },
    
    /**
     * Auto-resize textarea based on content
     * @param {HTMLTextAreaElement} textarea 
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    },
    
    /**
     * Toggle chat widget open/close
     */
    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWidget = document.getElementById('chat-widget');
        
        if (this.isOpen) {
            chatWidget.classList.add('open');
            document.getElementById('chat-input').focus();
        } else {
            chatWidget.classList.remove('open');
        }
    },
    
    /**
     * Add welcome message when chat initializes
     */
    addWelcomeMessage() {
        const welcomeMessage = "Xin chào! Mình là Whalio AI. Mình có thể giúp gì cho bạn hôm nay? 😊";
        this.addMessage(welcomeMessage, 'ai');
    },
    
    /**
     * Handle file selection
     * @param {Event} event 
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.selectedFile = file;
        this.showFilePreview(file);
    },
    
    /**
     * Show file preview in input area
     * @param {File} file 
     */
    showFilePreview(file) {
        const previewContainer = document.getElementById('file-preview-container');
        const fileSize = (file.size / 1024).toFixed(1) + ' KB';
        
        previewContainer.innerHTML = this.cleanHTML(`
            <div class="file-preview">
                <svg class="file-preview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${fileSize}</div>
                </div>
                <button class="file-preview-remove" onclick="ChatWidget.removeFilePreview()" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `);
    },
    
    /**
     * Remove file preview
     */
    removeFilePreview() {
        this.selectedFile = null;
        document.getElementById('file-preview-container').innerHTML = '';
        document.getElementById('file-input').value = '';
    },
    
    /**
     * Handle sending a message (with or without file)
     */
    async handleSendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim(); // TRIM to remove accidental leading/trailing newlines
        
        if (!message && !this.selectedFile) return;
        if (this.isTyping) return;
        
        // Add user message
        if (this.selectedFile) {
            this.addMessageWithFile(message, this.selectedFile, 'user');
        } else {
            this.addMessage(message, 'user');
        }
        
        // Clear input and file
        chatInput.value = '';
        chatInput.style.height = 'auto';
        this.removeFilePreview();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            let response;
            
            if (this.selectedFile) {
                response = await this.sendMessageWithFile(message, this.selectedFile);
            } else {
                response = await this.sendMessage(message);
            }
            
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            
            // Show fallback message
            const fallback = this.fallbackResponses[
                Math.floor(Math.random() * this.fallbackResponses.length)
            ];
            this.addMessage(fallback, 'ai');
        }
    },
    
    /**
     * Send text message to API
     * @param {string} message 
     * @returns {Promise<string>}
     */
    async sendMessage(message) {
        const response = await fetch(this.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message,
                model: 'gemini-2.5-flash'
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        return data.reply || data.message || 'Xin lỗi, mình không thể trả lời ngay bây giờ.';
    },
    
    /**
     * Send message with file to API
     * @param {string} message 
     * @param {File} file 
     * @returns {Promise<string>}
     */
    async sendMessageWithFile(message, file) {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('file', file);
        formData.append('model', 'gemini-2.5-flash');
        
        const response = await fetch(this.API_ENDPOINT, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        return data.reply || data.message || 'Xin lỗi, mình không thể xử lý file này.';
    },
    
    /**
     * Add message with file attachment to chat
     * @param {string} text 
     * @param {File} file 
     * @param {string} sender 
     */
    addMessageWithFile(text, file, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const fileSize = (file.size / 1024).toFixed(1) + ' KB';
        const isImage = file.type.startsWith('image/');
        
        let filePreviewHTML = '';
        
        if (isImage) {
            const imageUrl = URL.createObjectURL(file);
            filePreviewHTML = `<img src="${imageUrl}" alt="${file.name}" class="message-image" style="max-width: 200px;">`;
        } else {
            filePreviewHTML = this.cleanHTML(`
                <div class="message-file-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <div>
                        <div class="message-file-name">${file.name}</div>
                        <div class="message-file-size">${fileSize}</div>
                    </div>
                </div>
            `);
        }
        
        const formattedText = text ? this.formatMessage(text) : '';
        
        messageDiv.innerHTML = `<div class="message-content"><div class="message-bubble">${filePreviewHTML}${formattedText}</div><span class="message-time">${time}</span></div>`.trim();
        
        messagesContainer.appendChild(messageDiv);
        this.applyHighlighting(messageDiv);
        this.scrollToBottom();
    },
    
    /**
     * Add a text message to the chat
     * @param {string} text 
     * @param {string} sender - 'user' or 'ai'
     */
    addMessage(text, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const formattedText = this.formatMessage(text);
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `<div class="message-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div><div class="message-content"><div class="message-bubble">${formattedText}</div><span class="message-time">${time}</span></div>`.trim();
        } else {
            messageDiv.innerHTML = `<div class="message-content"><div class="message-bubble">${formattedText}</div><span class="message-time">${time}</span></div>`.trim();
        }
        
        messagesContainer.appendChild(messageDiv);
        
        // Apply syntax highlighting to code blocks
        this.applyHighlighting(messageDiv);
        
        this.scrollToBottom();
    },
    
    /**
     * Apply syntax highlighting to code blocks in a message
     * @param {HTMLElement} container 
     */
    applyHighlighting(container) {
        if (!this.highlightJsLoaded || !window.hljs) return;
        
        const codeBlocks = container.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            // Use requestAnimationFrame to avoid blocking
            requestAnimationFrame(() => {
                hljs.highlightElement(block);
            });
        });
    },
    
    /**
     * Copy code to clipboard
     * @param {HTMLButtonElement} button 
     */
    copyCodeToClipboard(button) {
        const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
        const code = codeBlock.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!`.trim();
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    },
    
    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        this.isTyping = true;
        const messagesContainer = document.getElementById('chat-messages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai-message typing-indicator-wrapper';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `<div class="message-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div><div class="message-content"><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>`.trim();
        
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    },
    
    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },
    
    /**
     * Auto-scroll to the bottom of messages
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    /**
     * Format message with code block support and syntax highlighting
     * Handles: code blocks (```), inline code (`), bold (**), italic (*), newlines
     * FIXED: Removed .replace(/\n/g, '<br>') to prevent double line breaks with pre-wrap
     * @param {string} text 
     * @returns {string}
     */
    formatMessage(text) {
        // Generate unique ID for copy button callbacks
        const generateId = () => 'code-' + Math.random().toString(36).substr(2, 9);
        
        // 1. Extract and preserve code blocks first (```code```)
        const codeBlocks = [];
        let processedText = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const id = generateId();
            const language = lang || 'plaintext';
            const trimmedCode = code.trim();
            
            // Escape HTML in code
            const escapedCode = trimmedCode
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            // Clean HTML template for code blocks - NO INDENTATION ARTIFACTS
            const codeBlockHTML = `<div class="code-block-wrapper" id="${id}"><div class="code-block-header"><span class="code-block-lang">${language}</span><button class="code-copy-btn" onclick="ChatWidget.copyCodeToClipboard(this)" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy</button></div><pre><code class="language-${language}">${escapedCode}</code></pre></div>`;
            
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(codeBlockHTML);
            return placeholder;
        });
        
        // 2. Escape remaining HTML for security
        const div = document.createElement('div');
        div.textContent = processedText;
        let safeText = div.innerHTML;
        
        // 3. Restore code blocks (they're already safe)
        codeBlocks.forEach((block, index) => {
            safeText = safeText.replace(`__CODE_BLOCK_${index}__`, block);
        });
        
        // 4. Handle inline code: `code` -> <code>code</code>
        safeText = safeText.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 5. Handle bold: **text** -> <strong>text</strong>
        safeText = safeText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 6. Handle italic: *text* -> <em>text</em> (but not inside code)
        safeText = safeText.replace(/(?<!`)\*([^*]+)\*(?!`)/g, '<em>$1</em>');
        
        // 7. CRITICAL FIX: DO NOT convert \n to <br> because pre-wrap already handles it
        // The previous code had: safeText = safeText.replace(/\n/g, '<br>');
        // This caused double line breaks. With white-space: pre-wrap, newlines are preserved naturally.
        
        return safeText;
    }
};

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
});

// Export for global access
window.ChatWidget = ChatWidget;