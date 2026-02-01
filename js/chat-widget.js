// ==================== WHALIO AI CHAT WIDGET ====================
// Floating chat widget connected to Google Gemini AI
// Supports both Light and Dark mode via CSS variables

const ChatWidget = {
    isOpen: false,
    isTyping: false,
    API_ENDPOINT: '/api/chat',
    
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
        this.createWidgetHTML();
        this.setupEventListeners();
        this.addWelcomeMessage();
    },
    
    /**
     * Create and inject the widget HTML into the page
     */
    createWidgetHTML() {
        const widgetHTML = `
            <!-- Whalio AI Chat Widget -->
            <div id="whalio-chat-widget" class="chat-widget-container">
                <!-- Floating Launcher Button -->
                <button id="chat-launcher" class="chat-launcher" aria-label="Open chat">
                    <svg class="chat-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.08L2 22l4.92-1.36C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                        <circle cx="8" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="16" cy="12" r="1" fill="currentColor"/>
                    </svg>
                    <svg class="chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
                
                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <!-- Header -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                            <div class="chat-header-text">
                                <h4>Whalio AI Assistant</h4>
                                <span class="chat-status">
                                    <span class="status-dot"></span>
                                    Trực tuyến
                                </span>
                            </div>
                        </div>
                        <button id="chat-close-btn" class="chat-close-btn" aria-label="Close chat">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
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
                                    <div class="file-icon">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/>
                                            <path d="M14 2v6h6"/>
                                        </svg>
                                    </div>
                                    <div class="file-details">
                                        <div class="file-name"></div>
                                        <div class="file-size"></div>
                                    </div>
                                </div>
                                <button id="chat-remove-file" class="remove-file-btn" aria-label="Remove file">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="chat-input-wrapper">
                            <!-- Hidden File Input for All Types -->
                            <input 
                                type="file" 
                                id="chat-file-input" 
                                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.js,.html,.css" 
                                hidden
                            />
                            
                            <!-- File/Image Upload Button -->
                            <button id="chat-upload-btn" class="chat-upload-btn" aria-label="Attach file">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                            </button>
                            
                            <input 
                                type="text" 
                                id="chat-input" 
                                class="chat-input" 
                                placeholder="Nhập tin nhắn..." 
                                autocomplete="off"
                            />
                            <button id="chat-send-btn" class="chat-send-btn" aria-label="Send message">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
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
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // ==================== FILE UPLOAD & DRAG-DROP EVENT LISTENERS ====================
        const uploadBtn = document.getElementById('chat-upload-btn');
        const fileInput = document.getElementById('chat-file-input');
        const removeFileBtn = document.getElementById('chat-remove-file');
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        const chatInput = document.getElementById('chat-input');
        
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
            // Code
            'application/javascript', 'text/html', 'text/css'
        ];
        
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.js', '.html', '.css'];
        const fileExt = file.name.toLowerCase().substr(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
            alert('Loại file không được hỗ trợ! Chỉ chấp nhận: ảnh, PDF, Word, Excel, PowerPoint, ZIP, văn bản.');
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
            document.getElementById('chat-input').focus();
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
            this.addMessage("Xin chào! 👋 Mình là Whalio AI Assistant. Mình có thể giúp bạn tìm hiểu về các tính năng của Whalio hoặc giải đáp thắc mắc. Hãy hỏi mình bất cứ điều gì!", 'ai');
        }, 500);
    },
    
    /**
     * Handle sending a message - Connected to Gemini AI API
     * Hỗ trợ gửi cả text và ảnh (Multimodal)
     */
    async handleSendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
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
        
        // Clear input và ảnh preview
        input.value = '';
        
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
            // Hiển thị ảnh như trước
            const imageUrl = URL.createObjectURL(file);
            fileContent = `<div class="message-image"><img src="${imageUrl}" alt="Sent image" onload="this.parentElement.classList.add('loaded')" /></div>`;
        } else {
            // Hiển thị thông tin file
            fileContent = `
                <div class="message-file">
                    <div class="file-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/>
                            <path d="M14 2v6h6"/>
                        </svg>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    ${fileContent}
                    ${textContent}
                </div>
                <span class="message-time">${time}</span>
            </div>
        `;
        
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
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${this.formatMessage(text)}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${this.formatMessage(text)}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
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
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        
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
     * Format message: Escape HTML -> Convert Markdown -> Handle Newlines
     */
    formatMessage(text) {
        // 1. Bảo mật: Chuyển các ký tự nguy hiểm thành text an toàn trước
        const div = document.createElement('div');
        div.textContent = text;
        let safeText = div.innerHTML;

        // 2. Xử lý in đậm: Đổi **text** thành <strong>text</strong>
        safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 3. Xử lý in nghiêng: Đổi *text* thành <em>text</em>
        safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 4. Xử lý xuống dòng: Đổi \n thành <br>
        safeText = safeText.replace(/\n/g, '<br>');

        return safeText;
    }
};

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
});

// Export for global access
window.ChatWidget = ChatWidget;
