// ==================== WHALIO AI CHAT WIDGET ====================
// Floating chat widget connected to Google Gemini AI
// Supports both Light and Dark mode via CSS variables
// Enhanced with Syntax Highlighting and Code Programming Support
// OPTIMIZED for indentation handling and overflow prevention

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
                display: flex;
                margin-bottom: 8px;
            }
            
            /* Message bubble - FIX: Use fit-content to prevent unnecessary wrapping */
            .chat-message .message-bubble {
                max-width: 85%;
                width: fit-content;
                word-wrap: break-word;
                overflow-wrap: break-word;
                word-break: break-word;
                box-sizing: border-box;
                white-space: normal; /* Normal text wrapping */
                overflow-x: auto;
                font-family: inherit;
            }
            
            /* AI message specific */
            .ai-message {
                justify-content: flex-start;
            }
            
            .ai-message .message-content {
                max-width: 85%;
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }
            
            .ai-message .message-bubble {
                white-space: normal;
                font-family: inherit;
                max-width: 100%;
                width: fit-content;
                overflow: hidden;
            }
            
            /* User message specific */
            .user-message {
                justify-content: flex-end;
            }
            
            .user-message .message-content {
                max-width: 85%;
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            
            .user-message .message-bubble {
                max-width: 100%;
                width: fit-content;
                white-space: normal;
                text-align: left;
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
                font-size: 12px;
                color: #8b949e;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .message-bubble .code-block-lang {
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .message-bubble .code-copy-btn {
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
                flex-shrink: 0;
            }
            
            .message-bubble .code-copy-btn:hover {
                background: #30363d;
                color: #f0f6fc;
            }
            
            .message-bubble .code-copy-btn.copied {
                background: #238636;
                border-color: #238636;
                color: #ffffff;
            }
            
            .message-bubble .code-copy-btn svg {
                width: 14px;
                height: 14px;
            }
            
            /* Pre and Code - CRITICAL OVERFLOW FIX */
            .message-bubble pre {
                margin: 0;
                padding: 12px 16px;
                overflow-x: auto;
                overflow-y: hidden;
                background: #0d1117;
                max-width: 100%;
                box-sizing: border-box;
                scrollbar-width: thin;
                scrollbar-color: #30363d transparent;
            }
            
            .message-bubble pre::-webkit-scrollbar {
                height: 6px;
            }
            
            .message-bubble pre::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .message-bubble pre::-webkit-scrollbar-thumb {
                background: #30363d;
                border-radius: 3px;
            }
            
            .message-bubble pre::-webkit-scrollbar-thumb:hover {
                background: #484f58;
            }
            
            .message-bubble pre code {
                font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.5;
                background: transparent;
                padding: 0;
                border-radius: 0;
                white-space: pre;
                word-wrap: normal;
                display: block;
                overflow-x: visible;
            }
            
            .message-bubble pre code.hljs {
                background: transparent;
                padding: 0;
            }
            
            /* Inline code */
            .message-bubble code:not(pre code) {
                background: rgba(110, 118, 129, 0.2);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 0.9em;
                color: #e6edf3;
                word-break: break-all;
            }
            
            /* Light mode code styles */
            html:not(.dark-mode) .message-bubble .code-block-wrapper {
                background: #f6f8fa;
                border-color: #d0d7de;
            }
            
            html:not(.dark-mode) .message-bubble .code-block-header {
                background: #f6f8fa;
                border-bottom-color: #d0d7de;
                color: #57606a;
            }
            
            html:not(.dark-mode) .message-bubble .code-copy-btn {
                border-color: #d0d7de;
                color: #57606a;
            }
            
            html:not(.dark-mode) .message-bubble .code-copy-btn:hover {
                background: #d0d7de;
                color: #24292f;
            }
            
            html:not(.dark-mode) .message-bubble pre {
                background: #f6f8fa;
                scrollbar-color: #d0d7de transparent;
            }
            
            html:not(.dark-mode) .message-bubble pre::-webkit-scrollbar-thumb {
                background: #d0d7de;
            }
            
            html:not(.dark-mode) .message-bubble pre::-webkit-scrollbar-thumb:hover {
                background: #afb8c1;
            }
            
            html:not(.dark-mode) .message-bubble code:not(pre code) {
                background: rgba(175, 184, 193, 0.2);
                color: #24292f;
            }
            
            /* User message in bubble */
            .user-message .message-bubble code:not(pre code) {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            /* ==================== MESSAGE TEXT OVERFLOW ==================== */
            .message-bubble .message-text {
                max-width: 100%;
                overflow-wrap: anywhere;
                word-break: break-word;
            }
            
            /* Image in message */
            .message-bubble .message-image {
                max-width: 100%;
            }
            
            .message-bubble .message-image img {
                max-width: 100%;
                height: auto;
            }
            
            /* File in message */
            .message-bubble .message-file {
                max-width: 100%;
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(customStyles);
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
     * Clean HTML template literal - remove extra whitespace and newlines between tags
     * but preserve intentional spaces within content
     */
    cleanHTML(html) {
        return html
            // Remove newlines and extra whitespace between tags
            .replace(/>\s+</g, '><')
            // Remove leading/trailing whitespace
            .trim();
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
        
        // Close on outside click (optional)
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('whalio-chat-widget');
            if (this.isOpen && !widget.contains(e.target)) {
                // Optionally close on outside click
                // this.closeChat();
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
        
        // Reset input file
        const fileInput = document.getElementById('chat-file-input');
        fileInput.value = '';
        
        // Ẩn preview
        const previewContainer = document.getElementById('chat-file-preview');
        previewContainer.style.display = 'none';
        
        // Reset preview elements
        document.getElementById('chat-preview-img').style.display = 'none';
        document.getElementById('chat-preview-file').style.display = 'none';
        
        // Xóa highlight từ upload button
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
        setTimeout(() => {
            this.addMessage("Xin chào! 👋 Mình là Whalio AI Assistant. Mình có thể giúp bạn tìm hiểu về các tính năng của Whalio, giải đáp thắc mắc, hoặc hỗ trợ lập trình. Hãy hỏi mình bất cứ điều gì!", 'ai');
        }, 500);
    },
    
    /**
     * Handle sending a message - Connected to Gemini AI API
     * Hỗ trợ gửi cả text và ảnh (Multimodal)
     * ENHANCED: Smart trimming - only trim start/end, preserve internal spacing/tabs
     */
    async handleSendMessage() {
        const input = document.getElementById('chat-input');
        const rawMessage = input.value;
        
        // Smart trim: Only remove leading/trailing whitespace, preserve internal indentation
        const message = this.smartTrim(rawMessage);
        
        // Kiểm tra: phải có message hoặc file, và không đang typing
        if ((!message && !this.selectedFile) || this.isTyping) return;
        
        // Hiển thị tin nhắn người dùng (bao gồm cả file nếu có)
        if (this.selectedFile) {
            // Nếu có file, hiển thị file trong tin nhắn
            this.addMessageWithFile(message, this.selectedFile, 'user');
        } else {
            // Chỉ có text
            this.addMessage(message, 'user');
        }
        
        // Clear input và reset textarea height
        input.value = '';
        input.style.height = '40px';
        input.style.overflowY = 'hidden';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // ==================== SỬ DỤNG FORMDATA THAY VÌ JSON ====================
            // Tạo FormData để gửi multipart/form-data
            const formData = new FormData();
            
            // Append message (luôn gửi, có thể rỗng)
            formData.append('message', message);
            
            // Append file/image với key 'image' để khớp với backend multer
            if (this.selectedFile) {
                formData.append('image', this.selectedFile);
            }
            
            // Gửi request (KHÔNG set Content-Type header, để browser tự xử lý boundary)
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                body: formData
                // Lưu ý: Không set headers Content-Type, browser sẽ tự thêm với boundary
            });
            
            const data = await response.json();
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            if (data.success && data.response) {
                // Display AI response
                this.addMessage(data.response, 'ai');
            } else {
                // Handle API error response
                const errorMessage = data.response || data.message || 'Xin lỗi, mình không thể xử lý yêu cầu này. Hãy thử lại nhé! 😊';
                this.addMessage(errorMessage, 'ai');
            }
            
        } catch (error) {
            console.error('Chat API Error:', error);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Show fallback error message
            const fallbackIndex = Math.floor(Math.random() * this.fallbackResponses.length);
            this.addMessage(this.fallbackResponses[fallbackIndex], 'ai');
        } finally {
            // ==================== LUÔN CLEAR FILE SAU KHI GỬI ====================
            // Dù thành công hay lỗi, luôn reset file input và preview
            this.clearSelectedFile();
        }
    },

    /**
     * Smart trimming - only remove leading/trailing whitespace and newlines
     * but preserve internal spacing, tabs, and intentional indentation
     * @param {string} text 
     * @returns {string}
     */
    smartTrim(text) {
        if (!text) return text;
        
        // Remove only leading and trailing whitespace/newlines
        // This preserves internal tabs, spaces, and multi-line formatting
        return text.replace(/^[\s\n\r]+|[\s\n\r]+$/g, '');
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
            fileContent = this.cleanHTML(`
                <div class="message-file">
                    <div class="file-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/><path d="M14 2v6h6"/></svg></div>
                    <div class="file-info"><div class="file-name">${file.name}</div><div class="file-size">${this.formatFileSize(file.size)}</div></div>
                </div>
            `);
        }
        
        messageDiv.innerHTML = this.cleanHTML(`
            <div class="message-content">
                <div class="message-bubble">${fileContent}${textContent}</div>
                <span class="message-time">${time}</span>
            </div>
        `);
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    },
    
    /**
     * Add a message to the chat
     * @param {string} text - Message text
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
            messageDiv.innerHTML = this.cleanHTML(`
                <div class="message-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>
                <div class="message-content"><div class="message-bubble">${formattedText}</div><span class="message-time">${time}</span></div>
            `);
        } else {
            messageDiv.innerHTML = this.cleanHTML(`
                <div class="message-content"><div class="message-bubble">${formattedText}</div><span class="message-time">${time}</span></div>
            `);
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
        typingDiv.innerHTML = this.cleanHTML(`
            <div class="message-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>
            <div class="message-content"><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>
        `);
        
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
     * ENHANCED: Better code block handling without source indentation artifacts
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
            const codeBlockHTML = this.cleanHTML(`
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
            `);
            
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
        
        // 7. Handle newlines (but not inside code blocks)
        // Split by code blocks, process each part, then rejoin
        const parts = safeText.split(/(<div class="code-block-wrapper"[\s\S]*?<\/div>\s*<\/div>)/g);
        safeText = parts.map((part, index) => {
            // Odd indices are code blocks, skip them
            if (index % 2 === 1) return part;
            // Even indices are regular text, convert newlines
            return part.replace(/\n/g, '<br>');
        }).join('');
        
        return safeText;
    }
};

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
});

// Export for global access
window.ChatWidget = ChatWidget;
