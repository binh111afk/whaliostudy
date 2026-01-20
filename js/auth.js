import { CONFIG, DOM, Utils } from './config.js';
import { AppState, StatsManager } from './state.js';

// ==================== AUTHENTICATION ====================
export const Auth = {
    async login(username, password) {
        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Không thể kết nối tới server!' };
        }
    },

    async register(username, password, fullName, email) {
        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, fullName, email })
            });

            return await response.json();
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Không thể kết nối tới server!' };
        }
    },

    logout() {
        StatsManager.stopStudyTimer();
        AppState.clearUser();
        location.reload();
    }
};

// ==================== USER INTERFACE ====================
export const UI = {
    showUserInterface(user) {
        Utils.hideElement(DOM.actions.guestActions);
        Utils.showElement(DOM.actions.userActions, 'flex');

        if (DOM.ui.sidebarProfile) {
            DOM.ui.sidebarProfile.style.display = 'flex';
        }

        this.updateUserInfo(user);
        this.updateWelcomeMessage(user.fullName);
    },

    showGuestInterface() {
        Utils.showElement(DOM.actions.guestActions);
        Utils.hideElement(DOM.actions.userActions);

        if (DOM.ui.sidebarProfile) {
            DOM.ui.sidebarProfile.style.display = 'none';
        }

        if (DOM.ui.welcomeText) {
            DOM.ui.welcomeText.textContent = "Chào mừng bạn đến với Whalio!";
        }
    },

    updateUserInfo(user) {
        this.renderAvatar(user.avatar);

        const sidebarName = document.querySelector('.user-name');
        if (sidebarName) {
            sidebarName.innerHTML = user.fullName.replace(' ', '<br>');
        }

        const menuName = document.getElementById('menuUserName');
        if (menuName) menuName.textContent = user.fullName;
    },

    updateWelcomeMessage(userName) {
        if (DOM.ui.welcomeText) {
            const greeting = Utils.getGreeting();
            DOM.ui.welcomeText.textContent = greeting + ', ' + userName + '! 👋';
        }

        if (DOM.ui.dateText) {
            DOM.ui.dateText.textContent = "Hôm nay là " + Utils.getCurrentDate();
        }
    },

    renderAvatar(avatarValue) {
        const avatarElements = document.querySelectorAll('.nav-avatar, .user-mini-profile .avatar, .large-avatar, .avatar-small');

        avatarElements.forEach(el => {
            el.textContent = '';
            
            if (avatarValue && avatarValue.includes('/uploads/')) {
                el.style.backgroundImage = "url('" + avatarValue + "')";
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            } else {
                el.style.backgroundImage = "url('img/avt.png')";
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            }
            
            el.style.color = 'transparent'; 
        });
    },

    updateSectionTitle(isSaved = false) {
        if (DOM.ui.sectionTitle) {
            DOM.ui.sectionTitle.innerHTML = isSaved ?
                '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg> TÀI LIỆU ĐÃ LƯU' :
                '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg> KHO TÀI LIỆU CHUNG';
        }
    },

    updatePageTitle(isSaved = false) {
        if (DOM.ui.pageTitle) {
            DOM.ui.pageTitle.innerHTML = isSaved ?
                'Tài Liệu Đã Lưu' :
                'Kho Tài Liệu Chung';
        }

        if (DOM.ui.pageSubtitle) {
            DOM.ui.pageSubtitle.textContent = isSaved ?
                'Danh sách tài liệu bạn đã lưu' :
                'Tổng hợp tài liệu học tập từ các thành viên';
        }
    },

    setActiveMenu(menuItem) {
        document.querySelectorAll('.nav-menu a').forEach(el => {
            el.classList.remove('active');
        });
        if (menuItem) menuItem.classList.add('active');
    },

    setActiveNavItem(navItemId) {
        document.querySelectorAll('.nav-center .nav-item').forEach(el => {
            el.classList.remove('active');
        });
        if (navItemId) {
            const navItem = document.getElementById(navItemId);
            if (navItem) navItem.classList.add('active');
        }
    }
};
