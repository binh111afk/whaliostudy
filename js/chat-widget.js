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
     * Create and inject the widget HTML into the page
     * HTML written on single lines to prevent indentation artifacts in DOM
     */
    createWidgetHTML() {
        const widgetHTML = this.cleanHTML(`
            <!-- Whalio AI Chat Widget -->
            <div id="whalio-chat-widget" class="chat-widget-container">
                <!-- Floating Launcher Button -->
                <button id="chat-launcher" class="chat-launcher" aria-label="Open chat">
                    <svg class="chat-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.08L2 22l4.92-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>
                    <svg class="chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                
                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <!-- Header -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>
                            <div class="chat-header-text"><h4>Whalio AI Assistant</h4><span class="chat-status"><span class="status-dot"></span>Trực tuyến</span></div>
                        </div>
                        <button id="chat-close-btn" class="chat-close-btn" aria-label="Close chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                    
                    <!-- Messages Area -->
                    <div id="chat-messages" class="chat-messages">
                        <!-- Messages will be appended here -->
                    </div>
                    
                    <!-- Input Area -->
                    <div class="chat-input-area">
                        <!-- File Preview Area (Hiển thị khi chọn file/ảnh) -->
                        <div id="chat-file-preview" class="chat-file-preview" style="display: none;">
                            <div class="preview-container">
                                <!-- Image Preview -->
                                <img id="chat-preview-img" src="" alt="Preview" style="display: none;" />
                                <!-- File Info Preview -->
                                <div id="chat-preview-file" class="file-preview-info" style="display: none;">
                                    <div class="file-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/><path d="M14 2v6h6"/></svg></div>
                                    <div class="file-details"><div class="file-name"></div><div class="file-size"></div></div>
                                </div>
                                <button id="chat-remove-file" class="remove-file-btn" aria-label="Remove file"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
                            </div>
                        </div>
                        
                        <div class="chat-input-wrapper">
                            <!-- Hidden File Input for All Types -->
                            <input type="file" id="chat-file-input" accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.js,.html,.css,.py,.java,.cpp,.c,.ts,.jsx,.tsx,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bash" hidden />
                            
                            <!-- File/Image Upload Button -->
                            <button id="chat-upload-btn" class="chat-upload-btn" aria-label="Attach file"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>
                            
                            <textarea id="chat-input" class="chat-input" placeholder="Hỏi Whalio bất cứ điều gì..." autocomplete="off" rows="1"></textarea>
                            <button id="chat-send-btn" class="chat-send-btn" aria-label="Send message"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        // Insert widget into the body
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const launcher = document.getElementById('chat-launcher');
        const closeBtn = document.getElementById('chat-close-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        
        // Toggle chat window
        launcher.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.closeChat());
        
        // Send message
        sendBtn.addEventListener('click', () => this.handleSendMessage());
        
        // ==================== TEXTAREA KEY HANDLING ====================
        input.addEventListener('keydown', (e) => {
            // Tab key: Insert 4 spaces
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const spaces = '    '; // 4 spaces
                
                input.value = input.value.substring(0, start) + spaces + input.value.substring(end);
                input.selectionStart = input.selectionEnd = start + spaces.length;
                
                // Trigger auto-resize
                this.autoResizeTextarea(input);
                return;
            }
            
            // Enter key handling
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Shift + Enter: New line (default behavior)
                    // Let it happen naturally, just auto-resize after
                    setTimeout(() => this.autoResizeTextarea(input), 0);
                } else {
                    // Enter only: Send message
                    e.preventDefault();
                    this.handleSendMessage();
                }
            }
        });
        
        // Auto-resize textarea on input
        input.addEventListener('input', () => {
            this.autoResizeTextarea(input);
        });
        
        // ==================== FILE UPLOAD & DRAG-DROP EVENT LISTENERS ====================
        const uploadBtn = document.getElementById('chat-upload-btn');
        const fileInput = document.getElementById('chat-file-input');
        const removeFileBtn = document.getElementById('chat-remove-file');
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        
        // Click nút upload -> kích hoạt input file
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Khi chọn file -> hiển thị preview
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Xóa file đã chọn
        removeFileBtn.addEventListener('click', () => {
            this.clearSelectedFile();
        });
        
        // ==================== DRAG & DROP EVENT LISTENERS ====================
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            inputWrapper.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            inputWrapper.addEventListener(eventName, () => {
                inputWrapper.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            inputWrapper.addEventListener(eventName, () => {
                inputWrapper.classList.remove('drag-over');
            });
        });
        
        // Handle dropped files
        inputWrapper.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files: [files[0]] } }); // Chỉ lấy file đầu tiên
            }
        });
        
        // Listen for theme changes to update highlight.js theme
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    this.updateHighlightTheme();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    },
    
    /**
     * Auto-resize textarea based on content
     * @param {HTMLTextAreaElement} textarea 
     */
    autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate new height
        const minHeight = 40;
        const maxHeight = 200;
        const scrollHeight = textarea.scrollHeight;
        
        // Set new height within bounds
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = newHeight + 'px';
        
        // Show scrollbar if content exceeds max height
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    },
    
    /**
     * Biến lưu trữ file đã chọn (ảnh hoặc file khác)
     */
    selectedFile: null,
    
    /**
     * Xử lý khi người dùng chọn file (ảnh hoặc file khác)
     * @param {Event} e - Change event từ input file hoặc drag & drop
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Kiểm tra định dạng file
        const allowedTypes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            // Documents  
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            // Presentations
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Archives
            'application/zip', 'application/x-rar-compressed',
            // Code files
            'application/javascript', 'text/javascript',
            'text/html', 'text/css',
            'text/x-python', 'text/x-java',
            'text/x-c', 'text/x-c++',
            'application/json', 'application/xml',
            'text/yaml', 'text/markdown',
            'application/x-sh'
        ];
        
        const allowedExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp', 
            '.pdf', '.doc', '.docx', '.txt', 
            '.xls', '.xlsx', '.ppt', '.pptx', 
            '.zip', '.rar',
            '.js', '.ts', '.jsx', '.tsx',
            '.html', '.css', '.scss', '.sass',
            '.py', '.java', '.cpp', '.c', '.h', '.hpp',
            '.json', '.xml', '.yaml', '.yml',
            '.md', '.sql', '.sh', '.bash',
            '.php', '.rb', '.go', '.rs', '.swift'
        ];
        const fileExt = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
            alert('Loại file không được hỗ trợ! Chỉ chấp nhận: ảnh, PDF, Word, Excel, PowerPoint, ZIP, và các file code.');
            return;
        }
        
        // Kiểm tra kích thước file (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File quá lớn! Vui lòng chọn file nhỏ hơn 50MB.');
            return;
        }
        
        // Lưu file vào biến
        this.selectedFile = file;
        
        // Hiển thị preview
        const previewContainer = document.getElementById('chat-file-preview');
        const previewImg = document.getElementById('chat-preview-img');
        const previewFile = document.getElementById('chat-preview-file');
        const isImage = file.type.startsWith('image/');
        
        if (isImage) {
            // Hiển thị ảnh
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = 'block';
                previewFile.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            // Hiển thị thông tin file
            const fileName = previewFile.querySelector('.file-name');
            const fileSize = previewFile.querySelector('.file-size');
            
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            
            previewImg.style.display = 'none';
            previewFile.style.display = 'flex';
            previewContainer.style.display = 'block';
        }
        
        // Thêm highlight cho upload button
        document.getElementById('chat-upload-btn').classList.add('has-file');
    },
    
    /**
     * Xóa file đã chọn và reset preview
     */
    clearSelectedFile() {
        this.selectedFile = null;
        
        // Ẩn preview
        const previewContainer = document.getElementById('chat-file-preview');
        const previewImg = document.getElementById('chat-preview-img');
        const previewFile = document.getElementById('chat-preview-file');
        
        previewContainer.style.display = 'none';
        previewImg.src = '';
        previewImg.style.display = 'none';
        previewFile.style.display = 'none';
        
        // Reset file input
        const fileInput = document.getElementById('chat-file-input');
        fileInput.value = '';
        
        // Remove highlight
        document.getElementById('chat-upload-btn').classList.remove('has-file');
    },
    
    /**
     * Format file size to human readable
     * @param {number} bytes 
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Toggle chat window visibility
     */
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    },
    
    /**
     * Open the chat window
     */
    openChat() {
        const chatWindow = document.getElementById('chat-window');
        const launcher = document.getElementById('chat-launcher');
        
        chatWindow.classList.add('open');
        launcher.classList.add('active');
        this.isOpen = true;
        
        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            input.focus();
            this.autoResizeTextarea(input);
        }, 300);
    },
    
    /**
     * Close the chat window
     */
    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        const launcher = document.getElementById('chat-launcher');
        
        chatWindow.classList.remove('open');
        launcher.classList.remove('active');
        this.isOpen = false;
    },
    
    /**
     * Add welcome message on init
     */
    addWelcomeMessage() {
        const welcomeMessage = "Xin chào! 👋 Mình là **Whalio AI Assistant**. Mình có thể giúp bạn:\n\n• Trả lời câu hỏi\n• Viết code và giải thích lập trình\n• Phân tích file và hình ảnh\n• Tạo nội dung sáng tạo\n\nHãy hỏi mình bất cứ điều gì nhé! 😊";
        this.addMessage(welcomeMessage, 'ai');
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
        this.clearSelectedFile();
        
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
     * Thêm tin nhắn kèm file vào chat
     * @param {string} text - Nội dung text
     * @param {File} file - File đính kèm
     * @param {string} sender - 'user' hoặc 'ai'
     */
    addMessageWithFile(text, file, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const textContent = text ? `<div class="message-text">${this.formatMessage(text)}</div>` : '';
        const isImage = file.type.startsWith('image/');
        let fileContent = '';
        
        if (isImage) {
            const imageUrl = URL.createObjectURL(file);
            fileContent = `<div class="message-image"><img src="${imageUrl}" alt="Sent image" onload="this.parentElement.classList.add('loaded')" /></div>`;
        } else {
            fileContent = `<div class="message-file"><div class="file-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/><path d="M14 2v6h6"/></svg></div><div class="file-info"><div class="file-name">${file.name}</div><div class="file-size">${this.formatFileSize(file.size)}</div></div></div>`;
        }
        
        messageDiv.innerHTML = `<div class="message-content"><div class="message-bubble">${fileContent}${textContent}</div><span class="message-time">${time}</span></div>`.trim();
        
        messagesContainer.appendChild(messageDiv);
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