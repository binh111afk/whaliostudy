// ==================== CONFIGURATION ====================
export const CONFIG = {
    STORAGE_KEYS: {
        LOGIN_STATUS: 'isWhalioLoggedIn',
        CURRENT_USER: 'currentUser'
    },
    API_ENDPOINTS: {
        LOGIN: '/api/login',
        REGISTER: '/api/register',
        DOCUMENTS: '/api/documents',
        TOGGLE_SAVE: '/api/toggle-save-doc',
        UPLOAD: '/api/upload-document'
    },
    FILE_TYPES: {
        word: { class: 'icon-word', text: 'DOC', color: '#2B579A' },
        excel: { class: 'icon-excel', text: 'XLS', color: '#217346' },
        ppt: { class: 'icon-ppt', text: 'PPT', color: '#D24726' },
        pdf: { class: 'icon-pdf', text: 'PDF', color: '#F40F02' },
        image: { class: 'icon-image', text: 'IMG', color: '#FF6B35' }
    }
};

// ==================== DOM ELEMENTS ====================
export const DOM = {
    modals: {
        login: document.getElementById('loginModal'),
        register: document.getElementById('registerModal'),
        logout: document.getElementById('logoutModal'),
        forgot: document.getElementById('forgotPassModal'),
        editProfile: document.getElementById('editProfileModal'),
        changePass: document.getElementById('changePassModal'),
        uploadDoc: document.getElementById('uploadDocModal'),
        alert: document.getElementById('customAlert'),
        dataSettings: document.getElementById('dataSettingsModal')
    },
    actions: {
        guestActions: document.getElementById('guest-actions'),
        userActions: document.getElementById('user-actions'),
    },
    sections: {
        mainDashboard: document.getElementById('main-dashboard'),
        profileSection: document.getElementById('profile-section'),
        documentsSection: document.getElementById('documents-section'),
        examsSection: document.getElementById('exams-section'),
        communitySection: document.getElementById('community-section')
    },
    containers: {
        docList: document.getElementById('document-list-container'),
        documentsList: document.getElementById('documents-list-container')
    },
    alert: {
        icon: document.getElementById('alertIcon'),
        title: document.getElementById('alertTitle'),
        message: document.getElementById('alertMessage')
    },
    ui: {
        userDropdown: document.getElementById('userDropdown'),
        sidebarProfile: document.querySelector('.user-mini-profile'),
        welcomeText: document.querySelector('.welcome-info h1'),
        dateText: document.querySelector('.welcome-info p'),
        sectionTitle: document.querySelector('.section-title'),
        pageTitle: document.querySelector('.page-title h1'),
        pageSubtitle: document.querySelector('.page-title p')
    }
};

// ==================== UTILITY FUNCTIONS ====================
export const Utils = {
    showElement(el, display = 'block') {
        if (el) el.style.display = display;
    },

    hideElement(el) {
        if (el) el.style.display = 'none';
    },

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Đang xử lý...';
            button.disabled = true;
            button.style.opacity = '0.7';
        } else {
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
            button.disabled = false;
            button.style.opacity = '1';
        }
    },

    showAlert(title, message, isSuccess = true, duration = 3000) {
        if (!DOM.modals.alert) return;

        DOM.alert.icon.textContent = isSuccess ? '✅' : '⚠️';
        DOM.alert.title.textContent = title;
        DOM.alert.message.textContent = message;

        DOM.modals.alert.classList.add('active');

        setTimeout(() => {
            this.closeAlert();
        }, duration);
    },

    closeAlert() {
        if (DOM.modals.alert) {
            DOM.modals.alert.classList.remove('active');
        }
    },

    getFileType(type) {
        return CONFIG.FILE_TYPES[type] || { class: 'icon-other', text: 'FILE', color: '#6C757D' };
    },

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Chào buổi sáng";
        if (hour < 18) return "Chào buổi chiều";
        return "Chào buổi tối";
    },

    getCurrentDate() {
        return new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
};

// ==================== MODAL MANAGEMENT ====================
export const ModalManager = {
    closeAll() {
        Object.values(DOM.modals).forEach(modal => {
            if (modal) modal.classList.remove('active');
        });
    },

    open(modalName) {
        this.closeAll();
        const modal = DOM.modals[modalName];
        if (modal) modal.classList.add('active');
    },

    close(modalName) {
        const modal = DOM.modals[modalName];
        if (modal) modal.classList.remove('active');
    },

    setupCloseListeners() {
        Object.values(DOM.modals).forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            }
        });
    }
};
