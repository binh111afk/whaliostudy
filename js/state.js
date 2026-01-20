import { CONFIG } from './config.js';

// ==================== STATE MANAGEMENT ====================
export const AppState = {
    currentUser: null,
    allDocuments: [],
    allCourses: [],
    isViewingSaved: false,
    isLoading: false,

    init() {
        const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS);
        const savedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER);

        if (isLoggedIn === 'true' && savedUser) {
            this.currentUser = JSON.parse(savedUser);
            return true;
        }
        return false;
    },

    saveUser(user) {
        this.currentUser = user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS, 'true');
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    },

    clearUser() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
    }
};

// ==================== STATS MANAGER ====================
export const StatsManager = {
    timerInterval: null,

    getUserKey(baseKey) {
        const username = AppState.currentUser ? AppState.currentUser.username : 'guest';
        return baseKey + '_' + username;
    },

    init() {
        this.stopStudyTimer();
        this.checkStreak();
        this.startStudyTimer();
        this.updateUI();
    },

    checkStreak() {
        const keyStreak = this.getUserKey('whalio_streak');
        const keyLastVisit = this.getUserKey('whalio_last_visit');

        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem(keyLastVisit);
        let currentStreak = parseInt(localStorage.getItem(keyStreak) || 0);

        if (!lastVisit) {
            currentStreak = 1;
        } else if (lastVisit !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastVisit === yesterday.toDateString()) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
        }

        localStorage.setItem(keyStreak, currentStreak);
        localStorage.setItem(keyLastVisit, today);
    },

    startStudyTimer() {
        const keyTotalTime = this.getUserKey('whalio_total_minutes');

        this.timerInterval = setInterval(() => {
            const currentKey = this.getUserKey('whalio_total_minutes');
            let totalMinutes = parseInt(localStorage.getItem(currentKey) || 0);
            totalMinutes++;
            localStorage.setItem(currentKey, totalMinutes);

            this.updateUI();
        }, 60000);
    },

    stopStudyTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    updateUI() {
        const keyStreak = this.getUserKey('whalio_streak');
        const keyTotalTime = this.getUserKey('whalio_total_minutes');

        const streak = localStorage.getItem(keyStreak) || 1;
        const totalMinutes = parseInt(localStorage.getItem(keyTotalTime) || 0);

        const hours = (totalMinutes / 60).toFixed(1);

        const statNumbers = document.querySelectorAll('.stat-num');
        if (statNumbers.length >= 2) {
            statNumbers[0].textContent = streak + ' N';
            statNumbers[1].textContent = hours + 'H';
        }
    }
};
