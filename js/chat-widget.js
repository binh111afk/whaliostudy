// ==================== WHALIO AI CHAT WIDGET ====================
// Floating chat widget with AI assistant simulation
// Supports both Light and Dark mode via CSS variables

const ChatWidget = {
    isOpen: false,
    isTyping: false,
    
    // AI Response Templates (for simulation)
    responses: [
        "Xin chào! Mình là Whalio AI, mình có thể giúp gì cho bạn?",
        "Cảm ơn bạn đã liên hệ! Hãy cho mình biết bạn cần hỗ trợ gì nhé.",
        "Mình hiểu rồi! Để mình tìm hiểu thêm về vấn đề này cho bạn.",
        "Đó là một câu hỏi hay! Bạn có thể thử xem phần Tài liệu hoặc Flashcard để ôn tập nhé.",
        "Mình sẽ hỗ trợ bạn ngay! Bạn có thể cung cấp thêm chi tiết được không?",
        "Bạn có thể sử dụng tính năng Tính GPA để theo dõi điểm số của mình.",
        "Để quản lý thời gian tốt hơn, hãy thử dùng Thời khóa biểu và Pomodoro Timer nhé!",
        "Mình rất vui được giúp đỡ bạn! Có gì cần hỏi thêm không?"
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
                        <div class="chat-input-wrapper">
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
     * Handle sending a message
     */
    handleSendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator and simulate AI response
        this.showTypingIndicator();
        
        // Simulate AI thinking time (1.5-3 seconds)
        const delay = Math.random() * 1500 + 1500;
        setTimeout(() => {
            this.hideTypingIndicator();
            const response = this.generateResponse(message);
            this.addMessage(response, 'ai');
        }, delay);
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
                    <div class="message-bubble">${this.escapeHTML(text)}</div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHTML(text)}</div>
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
     * Generate a simulated AI response based on user input
     * @param {string} userMessage - User's message
     * @returns {string} AI response
     */
    generateResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Simple keyword matching for demo
        if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Xin chào bạn! 👋 Mình có thể giúp gì cho bạn hôm nay?";
        }
        if (lowerMessage.includes('gpa') || lowerMessage.includes('điểm')) {
            return "Để tính GPA, bạn hãy vào mục 'Tính GPA' trên thanh điều hướng. Tại đó bạn có thể nhập điểm các môn học và hệ thống sẽ tự động tính GPA cho bạn! 📊";
        }
        if (lowerMessage.includes('flashcard') || lowerMessage.includes('ôn tập') || lowerMessage.includes('học')) {
            return "Bạn có thể sử dụng tính năng Flashcard để ôn tập hiệu quả! Hãy vào trang chủ và tìm phần Flashcard để tạo bộ thẻ học của riêng mình. 📚";
        }
        if (lowerMessage.includes('thời khóa biểu') || lowerMessage.includes('lịch học')) {
            return "Để quản lý thời khóa biểu, bạn có thể sử dụng tính năng Thời khóa biểu trên Dashboard. Tại đây bạn có thể thêm các môn học theo từng ngày trong tuần! 📅";
        }
        if (lowerMessage.includes('timer') || lowerMessage.includes('pomodoro') || lowerMessage.includes('thời gian')) {
            return "Whalio có tích hợp Pomodoro Timer để giúp bạn tập trung học tập. Hãy thử phương pháp 25 phút học - 5 phút nghỉ để tăng hiệu quả nhé! ⏱️";
        }
        if (lowerMessage.includes('tài liệu') || lowerMessage.includes('document') || lowerMessage.includes('file')) {
            return "Bạn có thể truy cập thư viện Tài liệu từ thanh điều hướng. Tại đây có thể tải lên và quản lý các file học tập của bạn! 📁";
        }
        if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thank')) {
            return "Không có gì! 😊 Nếu cần hỗ trợ thêm, đừng ngại hỏi mình nhé!";
        }
        if (lowerMessage.includes('tạm biệt') || lowerMessage.includes('bye')) {
            return "Tạm biệt bạn! Chúc bạn học tập hiệu quả! 👋✨";
        }
        
        // Random response for other messages
        const randomIndex = Math.floor(Math.random() * this.responses.length);
        return this.responses[randomIndex];
    },
    
    /**
     * Auto-scroll to the bottom of messages
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
});

// Export for global access
window.ChatWidget = ChatWidget;
