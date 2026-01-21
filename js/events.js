// ==================== EVENT MANAGER ====================
export const EventManager = {
    STORAGE_KEY: 'whalio_events',
    events: [],

    // ===== INITIALIZATION =====
    init() {
        console.log('🚀 EventManager initializing...');
        this.loadEvents();
        this.renderWidget();
        console.log('✅ EventManager initialized');
    },

    // ===== LOCAL STORAGE OPERATIONS =====
    loadEvents() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this.events = stored ? JSON.parse(stored) : [];
            this.events = this.sortEventsByDate(this.events);
        } catch (error) {
            console.error('Error loading events:', error);
            this.events = [];
        }
    },

    saveEvents() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
        } catch (error) {
            console.error('Error saving events:', error);
        }
    },

    sortEventsByDate(events) {
        return events.sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // ===== EVENT OPERATIONS =====
    addEvent(title, date, type = 'exam') {
        if (!title.trim()) {
            Swal.fire('Lỗi', 'Vui lòng nhập tiêu đề sự kiện!', 'warning');
            return false;
        }

        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (eventDate < today) {
            Swal.fire('Lỗi', 'Vui lòng chọn ngày trong tương lai!', 'warning');
            return false;
        }

        const event = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title.trim(),
            date: date,
            type: type,
            createdAt: new Date().toISOString()
        };

        this.events.push(event);
        this.events = this.sortEventsByDate(this.events);
        this.saveEvents();
        this.renderWidget();
        this.renderModal();

        return true;
    },

    deleteEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
        this.saveEvents();
        this.renderWidget();
        this.renderModal();
    },

    // ===== DATE UTILITIES =====
    calculateDaysRemaining(dateStr) {
        const eventDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        const timeDiff = eventDate - today;
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    },

    getCountdownText(daysRemaining) {
        if (daysRemaining === 0) return 'Hôm nay';
        if (daysRemaining === 1) return 'Ngày mai';
        return `Còn ${daysRemaining} ngày`;
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    },

    getDay(dateString) {
        return new Date(dateString).getDate().toString().padStart(2, '0');
    },

    getMonth(dateString) {
        const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
        return months[new Date(dateString).getMonth()];
    },

    getUpcomingEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.events.filter(e => new Date(e.date) >= today);
    },

    // ===== WIDGET RENDERING =====
    renderWidget() {
        const container = document.querySelector('.widget-box.upcoming-event .event-list');
        if (!container) {
            console.warn('⚠️ Event list container not found');
            return;
        }

        const upcoming = this.getUpcomingEvents();
        container.innerHTML = '';

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-state">Chưa có sự kiện nào</p>';
            return;
        }

        const displayedEvents = upcoming.slice(0, 2);

        displayedEvents.forEach(event => {
            const daysRemaining = this.calculateDaysRemaining(event.date);
            const isUrgent = daysRemaining < 3 && daysRemaining >= 0;
            const typeIcon = event.type === 'exam' ? '🎯' : (event.type === 'deadline' ? '⏰' : '🎉');

            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <div class="event-date-box">
                    <span class="event-day">${this.getDay(event.date)}</span>
                    <span class="event-month">${this.getMonth(event.date)}</span>
                </div>
                <div class="event-info">
                    <div class="event-title">${typeIcon} ${this.escapeHtml(event.title)}</div>
                    <div class="event-countdown ${isUrgent ? 'urgent' : ''}">
                        ${this.getCountdownText(daysRemaining)}
                    </div>
                </div>
                <button type="button" class="btn-delete-event-widget" onclick="event.stopPropagation(); if(window.EventManager) window.EventManager.deleteEvent('${event.id}')" title="Xóa sự kiện">
                    ✕
                </button>
            `;
            container.appendChild(eventCard);
        });

        if (upcoming.length > 2) {
            const seeMoreBtn = document.createElement('button');
            seeMoreBtn.className = 'btn-see-more-events';
            seeMoreBtn.textContent = `Xem thêm (${upcoming.length - 2})`;
            seeMoreBtn.onclick = () => this.openModal();
            container.appendChild(seeMoreBtn);
        }
    },

    // ===== MODAL RENDERING =====
    renderModal() {
        const listContainer = document.getElementById('events-modal-list');
        if (!listContainer) return;

        const upcoming = this.getUpcomingEvents();
        listContainer.innerHTML = '';

        if (upcoming.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Chưa có sự kiện nào</p>';
            return;
        }

        upcoming.forEach(event => {
            const daysRemaining = this.calculateDaysRemaining(event.date);
            const isUrgent = daysRemaining < 3 && daysRemaining >= 0;
            const typeIcon = event.type === 'exam' ? '🎯' : (event.type === 'deadline' ? '⏰' : '🎉');

            const eventRow = document.createElement('div');
            eventRow.className = 'event-modal-item';
            eventRow.innerHTML = `
                <div class="event-modal-content">
                    <div class="event-modal-title">${typeIcon} ${this.escapeHtml(event.title)}</div>
                    <div class="event-modal-meta">
                        <span class="event-modal-date">${this.formatDate(event.date)}</span>
                        <span class="event-modal-countdown ${isUrgent ? 'urgent' : ''}">
                            ${this.getCountdownText(daysRemaining)}
                        </span>
                    </div>
                </div>
                <button class="btn-delete-event" onclick="EventManager.deleteEvent('${event.id}')" title="Xóa sự kiện">
                    ✕
                </button>
            `;
            listContainer.appendChild(eventRow);
        });
    },

    // ===== MODAL MANAGEMENT =====
    openModal() {
        console.log('Opening events modal...');
        const modal = document.getElementById('eventsModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.classList.add('active');
            this.renderModal();
            console.log('✅ Modal opened', modal);
        } else {
            console.error('❌ Events modal not found in DOM');
        }
    },

    closeModal() {
        console.log('Closing events modal...');
        const modal = document.getElementById('eventsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.classList.remove('active');
        }
    },

    handleAddEvent() {
        const title = document.getElementById('eventTitle')?.value || '';
        const date = document.getElementById('eventDate')?.value || '';
        const type = document.getElementById('eventType')?.value || 'exam';

        if (this.addEvent(title, date, type)) {
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventType').value = 'exam';

            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Sự kiện đã được thêm.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    },

    // ===== UTILITIES =====
    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Make available globally for onclick handlers
window.EventManager = EventManager;
console.log('🌍 EventManager exposed to window:', window.EventManager);
