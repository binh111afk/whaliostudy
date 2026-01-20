import { DOM, Utils } from './config.js';

// ==================== STUDY TIMER ====================
export const StudyTimer = {
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    interval: null,
    elements: {},

    init() {
        this.elements = {
            overlay: document.getElementById('study-focus-overlay'),
            fHours: document.getElementById('f-hours'),
            fMinutes: document.getElementById('f-minutes'),
            fSeconds: document.getElementById('f-seconds'),
            minTop: document.querySelector('#f-minutes .top'),
            minBottom: document.querySelector('#f-minutes .bottom'),
            secTop: document.querySelector('#f-seconds .top'),
            secBottom: document.querySelector('#f-seconds .bottom'),
            btnMain: document.getElementById('f-btn-toggle')
        };

        if (this.elements.overlay) {
            this.updateDisplay();
        }
    },

    open() {
        if (!this.elements.overlay) {
            console.error("⚠️ Không tìm thấy study-focus-overlay trong HTML!");
            return;
        }

        this.elements.overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.updateDisplay();

        const hours = Math.floor(this.remainingSeconds / 3600);
        const mins = Math.floor((this.remainingSeconds % 3600) / 60);
        const secs = this.remainingSeconds % 60;

        const hourStr = hours < 10 ? '0' + hours : hours.toString();
        const minStr = mins < 10 ? '0' + mins : mins.toString();
        const secStr = secs < 10 ? '0' + secs : secs.toString();

        document.title = '(' + hourStr + ':' + minStr + ':' + secStr + ') Whalio Focus';
    },

    exit() {
        this.pause();

        if (this.elements.overlay) {
            this.elements.overlay.style.display = 'none';
        }

        document.body.style.overflow = 'auto';
        document.title = 'Whalio - Dashboard';

        if (typeof window.PageManager !== 'undefined' && window.PageManager.showDashboard) {
            window.PageManager.showDashboard();
        }
    },

    toggle() {
        if (this.isRunning) this.pause();
        else this.start();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.updateBtnState();

        this.interval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.updateDisplay();
            } else {
                this.finish();
            }
        }, 1000);
    },

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.updateBtnState();
    },

    reset() {
        this.pause();
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
    },

    finish() {
        this.pause();
        if (typeof Utils !== 'undefined') {
             Utils.showAlert("🎉 Hoàn thành!", "Bạn đã hoàn thành phiên học tập tập trung!", true);
        } else {
             alert("🎉 Hoàn thành! Bạn đã hoàn thành phiên học tập tập trung!");
        }
    },

    setTime(minutes) {
        this.pause();
        this.totalSeconds = minutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
    },

    addTime(minutes) {
        this.pause();
        this.totalSeconds += minutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
    },

    updateDisplay() {
        const hours = Math.floor(this.remainingSeconds / 3600);
        const mins = Math.floor((this.remainingSeconds % 3600) / 60);
        const secs = this.remainingSeconds % 60;

        const hourStr = hours < 10 ? '0' + hours : hours.toString();
        const minStr = mins < 10 ? '0' + mins : mins.toString();
        const secStr = secs < 10 ? '0' + secs : secs.toString();

        this.updateCardWithEffect('f-hours', hourStr);
        this.updateCardWithEffect('f-minutes', minStr);
        this.updateCardWithEffect('f-seconds', secStr);

        if (this.elements.overlay && this.elements.overlay.style.display !== 'none') {
            document.title = '(' + hourStr + ':' + minStr + ':' + secStr + ') Whalio Focus';
        }
    },

    updateCardWithEffect(cardId, newValue) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const currentValue = card.innerText;

        if (currentValue !== newValue) {
            card.classList.add('changing');
            card.innerText = newValue;

            setTimeout(() => {
                card.classList.remove('changing');
            }, 200);
        }
    },

    updateBtnState() {
        if (this.elements.btnMain) {
            this.elements.btnMain.innerText = this.isRunning ? 'TẠM DỪNG' : 'BẮT ĐẦU';
        }
    },

    openSettings() {
        if (typeof window.openTimePickerModal === 'function') {
            window.openTimePickerModal();
        } else {
            console.warn('openTimePickerModal chưa được định nghĩa');
        }
    }
};

// Timer modal helper functions
export function openTimePickerModal() {
    const modal = document.getElementById('timePickerModal');
    const slider = document.getElementById('time-slider');

    if (modal && slider) {
        slider.value = window.selectedMinutes || 25;
        updateTimeDisplay(window.selectedMinutes || 25);
        updateSliderProgress(window.selectedMinutes || 25);
        highlightActivePreset(window.selectedMinutes || 25);
        modal.classList.add('active');
    }
}

export function closeTimePickerModal() {
    const modal = document.getElementById('timePickerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function updateTimeDisplay(minutes) {
    const valueElement = document.getElementById('time-value');
    if (valueElement) {
        valueElement.textContent = minutes;
    }

    window.selectedMinutes = parseInt(minutes);
    updateSliderProgress(minutes);
    highlightActivePreset(minutes);
}

export function updateSliderProgress(minutes) {
    const slider = document.getElementById('time-slider');
    if (slider) {
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        const progress = ((minutes - min) / (max - min)) * 100;
        slider.style.setProperty('--slider-progress', progress + '%');
    }
}

export function highlightActivePreset(minutes) {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    presetButtons.forEach(btn => {
        const btnMinutes = parseInt(btn.textContent);
        if (btnMinutes === parseInt(minutes)) {
            btn.classList.add('active');
        }
    });
}

export function setTimeFromModal(minutesToAdd) {
    const slider = document.getElementById('time-slider');
    if (slider) {
        let newTime = (window.selectedMinutes || 25) + parseInt(minutesToAdd);
        if (newTime > 300) newTime = 300;
        
        slider.value = newTime;
        updateTimeDisplay(newTime);
    }
}

export function applyCustomTime() {
    if (window.selectedMinutes && window.selectedMinutes > 0) {
        if (StudyTimer && StudyTimer.setTime) {
            StudyTimer.setTime(window.selectedMinutes);
        }
        closeTimePickerModal();
    }
}

export function scrollDocs(direction) {
    const container = document.getElementById('docScrollContainer');
    const scrollAmount = 300;
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}
