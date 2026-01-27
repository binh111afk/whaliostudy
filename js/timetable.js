import { AppState } from './state.js';

// ==================== TIMETABLE MODULE ====================
export const Timetable = {
    currentTimetable: [],
    currentCell: null, // {day, session}
    listenersAttached: false,
    editingClassId: null,
    importedData: [], // Store imported classes temporarily
    currentWeekStart: null, // Monday of the current selected week

    // Period time mapping
    periodTimes: {
        1: { start: '06:30', end: '07:20' },
        2: { start: '07:20', end: '08:10' },
        3: { start: '08:10', end: '09:00' },
        4: { start: '09:10', end: '10:00' },
        5: { start: '10:00', end: '10:50' },
        6: { start: '10:50', end: '11:40' },
        7: { start: '12:30', end: '13:20' },
        8: { start: '13:20', end: '14:10' },
        9: { start: '14:10', end: '15:00' },
        10: { start: '15:10', end: '16:00' },
        11: { start: '16:00', end: '16:50' },
        12: { start: '16:50', end: '17:40' },
        13: { start: '17:50', end: '18:40' },
        14: { start: '18:40', end: '19:30' },
        15: { start: '19:50', end: '20:40' }
    },

    pastelColors: [
        '#FFE5E5', // Light pink
        '#E5F3FF', // Light blue
        '#FFF5E5', // Light orange
        '#E5FFE5', // Light green
        '#F5E5FF', // Light purple
        '#FFE5F5', // Light magenta
        '#E5FFFF', // Light cyan
        '#FFFFE5'  // Light yellow
    ],

    //🔥 THÊM MỚI: Parse chuỗi tuần học
    parseWeeks(weekString) {
        if (!weekString || typeof weekString !== 'string') {
            return []; // Rỗng = áp dụng mọi tuần
        }

        try {
            const weeks = new Set();
            const cleaned = weekString.replace(/\s+/g, '');
            const parts = cleaned.split(',');

            for (const part of parts) {
                if (part.includes('-')) {
                    // "1-5" -> [1,2,3,4,5]
                    const [start, end] = part.split('-').map(Number);

                    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > 52) {
                        console.warn(`⚠️ Invalid week range: "${part}"`);
                        continue;
                    }

                    for (let w = start; w <= end; w++) {
                        weeks.add(w);
                    }
                } else {
                    // "7" -> [7]
                    const week = Number(part);
                    if (!isNaN(week) && week >= 1 && week <= 52) {
                        weeks.add(week);
                    } else {
                        console.warn(`⚠️ Invalid week: "${part}"`);
                    }
                }
            }

            return Array.from(weeks).sort((a, b) => a - b);
        } catch (error) {
            console.error(`❌ Error parsing weeks: "${weekString}"`, error);
            return [];
        }
    },

    // Get current day in timetable format (2-7, CN)
    getCurrentDay() {
        const dayOfWeek = new Date().getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Convert JavaScript day (0-6) to timetable format
        if (dayOfWeek === 0) return 'CN'; // Sunday
        return String(dayOfWeek + 1); // Monday=2, Tuesday=3, ..., Saturday=7
    },

    // Highlight the current day column in the timetable
    highlightCurrentDay() {
        const today = this.getCurrentDay();
        console.log('📅 Today is:', today);

        // Remove any existing highlight
        document.querySelectorAll('.is-today').forEach(el => {
            el.classList.remove('is-today');
        });

        // Find and highlight all cells for today (header + body cells)
        const headers = document.querySelectorAll('.timetable-table thead th');
        const rows = document.querySelectorAll('.timetable-table tbody tr');

        // Find the column index for today
        let todayColumnIndex = -1;
        headers.forEach((header, index) => {
            const dayValue = header.getAttribute('data-day');
            if (dayValue === today) {
                todayColumnIndex = index;
                header.classList.add('is-today');
                console.log('✅ Highlighted header for day:', today);
            }
        });

        // Highlight all cells in this column
        if (todayColumnIndex >= 0) {
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells[todayColumnIndex]) {
                    cells[todayColumnIndex].classList.add('is-today');
                }
            });
        }
    },

    async init() {
        console.log('📅 Initializing Timetable...');
        this.injectStyles();

        // 🔥 FIX RE-LOGIN: Ensure timetable-body exists in the section
        const timetableSection = document.getElementById('timetable-section');
        const timetableBody = document.getElementById('timetable-body');
        
        if (timetableSection && !timetableBody) {
            console.log('⚠️ timetable-body not found, restoring structure...');
            this.restoreTimetableStructure(timetableSection);
        }

        // Initialize week navigation to current week
        this.jumpToToday();

        await this.loadTimetable();
        this.renderTimetable();
        this.highlightCurrentDay();
        this.setupEventListeners();
    },

    // 🔥 FIX: Restore timetable structure inside timetable-section if damaged
    restoreTimetableStructure(section) {
        console.log('🏗️ Restoring timetable structure...');
        
        // Find the container inside section
        let container = section.querySelector('.timetable-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'timetable-container';
            section.appendChild(container);
        }

        // Check if timetable-wrapper and tbody exist
        if (!document.getElementById('timetable-body')) {
            const wrapperHTML = `
                <div class="timetable-header">
                    <h1 class="timetable-title">📅 Thời Khóa Biểu</h1>
                    <div id="week-navigator" class="week-navigator">
                        <button onclick="Timetable.prevWeek()" class="week-nav-btn" aria-label="Tuần trước">◀</button>
                        <span id="current-week-display" class="week-display">Đang tải...</span>
                        <button onclick="Timetable.nextWeek()" class="week-nav-btn" aria-label="Tuần sau">▶</button>
                    </div>
                    <div class="timetable-actions">
                        <button id="btn-delete-all" class="btn-timetable-action btn-timetable-danger" onclick="Timetable.deleteAllClasses()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span class="btn-text">Delete All</span>
                        </button>
                        <button class="btn-timetable-action btn-timetable-import" onclick="Timetable.openImportModal()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span class="btn-text">Import File</span>
                        </button>
                        <button class="btn-timetable-action btn-add-class" onclick="Timetable.openCreateModal()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span class="btn-text">Add Class</span>
                        </button>
                    </div>
                </div>
                <div class="timetable-wrapper">
                    <table class="timetable-table">
                        <thead>
                            <tr>
                                <th class="session-col">Buổi</th>
                                <th data-day="2">THỨ 2<div class="header-date" id="date-2">--/--</div></th>
                                <th data-day="3">THỨ 3<div class="header-date" id="date-3">--/--</div></th>
                                <th data-day="4">THỨ 4<div class="header-date" id="date-4">--/--</div></th>
                                <th data-day="5">THỨ 5<div class="header-date" id="date-5">--/--</div></th>
                                <th data-day="6">THỨ 6<div class="header-date" id="date-6">--/--</div></th>
                                <th data-day="7">THỨ 7<div class="header-date" id="date-7">--/--</div></th>
                                <th data-day="CN">CN<div class="header-date" id="date-CN">--/--</div></th>
                            </tr>
                        </thead>
                        <tbody id="timetable-body"></tbody>
                    </table>
                </div>
                <button onclick="PageManager.showDashboard()" class="btn-back-dashboard">↩ Quay về Dashboard</button>
            `;
            container.innerHTML = wrapperHTML;
            console.log('✅ Timetable structure restored successfully');
        }
    },

    // Week Navigation Helper Methods
    getMondayOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // If Sunday (0), go back 6 days, else go to Monday
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0); // Reset to start of day
        return d;
    },

    changeWeek(offset) {
        if (!this.currentWeekStart) {
            this.currentWeekStart = this.getMondayOfWeek(new Date());
        }
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (offset * 7));
        this.updateWeekDisplay();
        this.renderTimetable();
        console.log(`📅 Week changed by ${offset}, new start: ${this.currentWeekStart.toDateString()}`);
    },

    prevWeek() {
        this.changeWeek(-1);
    },

    nextWeek() {
        this.changeWeek(1);
    },

    jumpToToday() {
        this.currentWeekStart = this.getMondayOfWeek(new Date());
        this.updateWeekDisplay();
        this.renderTimetable();
        console.log('📅 Jumped to current week:', this.currentWeekStart.toDateString());
    },

    updateWeekDisplay() {
        const weekDisplay = document.getElementById('current-week-display') || document.getElementById('week-display');
        if (!weekDisplay) {
            console.warn('⚠️ Week display element not found');
            return;
        }

        if (!this.currentWeekStart) {
            weekDisplay.textContent = '...';
            return;
        }

        const monday = new Date(this.currentWeekStart);
        const sunday = new Date(this.currentWeekStart);
        sunday.setDate(sunday.getDate() + 6);

        const formatDate = (date) => {
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${d}/${m}`;
        };

        weekDisplay.textContent = `${formatDate(monday)} - ${formatDate(sunday)}`;
        console.log(`📅 Week display updated: ${weekDisplay.textContent}`);

        // Also update the header dates for each day
        this.renderWeekDatesInHeader();
    },

    renderWeekDatesInHeader() {
        if (!this.currentWeekStart) {
            console.warn('⚠️ Cannot render week dates - currentWeekStart is null');
            return;
        }

        const monday = new Date(this.currentWeekStart);

        // Days mapping: 2 = Monday (index 0), 3 = Tuesday (index 1), ..., CN = Sunday (index 6)
        const dayIds = ['2', '3', '4', '5', '6', '7', 'CN'];

        dayIds.forEach((dayId, index) => {
            const dateElement = document.getElementById(`date-${dayId}`);
            if (dateElement) {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + index);

                const day = currentDate.getDate().toString().padStart(2, '0');
                const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

                // Update textContent instead of innerHTML to preserve existing styles
                dateElement.textContent = `${day}/${month}`;
            }
        });

        console.log('📅 Week dates rendered in headers');
    },

    // ==================== LOGIC HIỂN THỊ TUẦN (REFACTORED - Uses isSubjectActiveInWeek) ====================
    /**
     * Determines if a class should be displayed in the currently selected week.
     * This is the main filtering function called during rendering.
     * 
     * Uses the new isSubjectActiveInWeek() helper for clean date-based filtering.
     */
    isClassInWeek(classObj) {
        // If no week is selected, show all classes
        if (!this.currentWeekStart) {
            console.log(`📋 "${classObj.subject}": No week filter → SHOW ALL`);
            return true;
        }

        // Calculate week boundaries (Monday 00:00 to Sunday 23:59)
        const weekStart = new Date(this.currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Use the new helper function for clean date-based filtering
        return this.isSubjectActiveInWeek(classObj, weekStart, weekEnd);
    },

    // Helper 1: Lấy số tuần của năm (1-52)
    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    // Hàm tính mảng tuần (giống backend)
    // Hàm tính mảng tuần (Day-by-Day)
    getWeeksBetween(startDateStr, endDateStr) {
        if (!startDateStr || !endDateStr) return [];

        const weeks = new Set();
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (start > end) return [];

        let current = new Date(start);
        let iterations = 0;
        const maxIterations = 400;

        while (current <= end && iterations < maxIterations) {
            const weekNum = this.getWeekNumber(current);
            weeks.add(weekNum);
            current.setDate(current.getDate() + 1);
            iterations++;
        }

        return Array.from(weeks).sort((a, b) => a - b);
    },

    injectStyles() {
        if (document.getElementById('timetable-injected-styles')) return;

        const styleTag = document.createElement('style');
        styleTag.id = 'timetable-injected-styles';
        styleTag.textContent = `
/* ==================== TIMETABLE STYLES (MOBILE-FIRST, CLEAN) ==================== */
/* 
 * MOBILE-FIRST APPROACH:
 * 1. Base styles are for mobile (card view)
 * 2. @media (min-width: 768px) adds tablet/desktop table view
 * 3. NO !important used - proper CSS specificity instead
 */

/* === TIMETABLE CONTAINER === */
.timetable-container {
    padding: 16px;
    max-width: 100%;
}

.timetable-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
}

.timetable-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

/* === WEEK NAVIGATION === */
.week-navigation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
}

.btn-week-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-week-nav:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.week-display {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    min-width: 120px;
    text-align: center;
}

/* === TIMETABLE WRAPPER (Scroll Container) === */
.timetable-wrapper {
    width: 100%;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    overflow-x: auto;
    overflow-y: visible;
    border: 1px solid #e2e8f0;
    margin-bottom: 24px;
    -webkit-overflow-scrolling: touch;
}

/* Custom scrollbar */
.timetable-wrapper::-webkit-scrollbar {
    height: 8px;
}

.timetable-wrapper::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 8px;
}

.timetable-wrapper::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 8px;
}

.timetable-wrapper::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* === TIMETABLE TABLE === */
.timetable-table {
    width: 100%;
    min-width: 900px;
    table-layout: auto;
    border-collapse: separate;
    border-spacing: 0;
    background: #ffffff;
}

.timetable-table th,
.timetable-table td {
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    padding: 12px 8px;
    text-align: center;
    vertical-align: top;
    min-width: 100px;
}

.timetable-table th:last-child,
.timetable-table td:last-child {
    border-right: none;
}

/* === TABLE HEADER === */
.timetable-table thead th {
    background: #1e293b;
    color: #ffffff;
    padding: 14px 10px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    position: sticky;
    top: 0;
    z-index: 20;
}

/* === HEADER DATE (Ngày/tháng) === */
.header-date {
    font-size: 11px;
    font-weight: 600;
    color: #fbbf24;
    margin-top: 4px;
    text-transform: none;
}

/* === SESSION COLUMN (Buổi: Sáng/Chiều/Tối) === */
.session-col {
    width: 80px;
    min-width: 80px;
    max-width: 80px;
    background-color: #1e293b;
    color: #ffffff;
    font-weight: 700;
    text-align: center;
    vertical-align: middle;
    text-transform: uppercase;
    font-size: 12px;
    position: sticky;
    left: 0;
    z-index: 15;
    border-right: 2px solid #334155;
}

/* === TIMETABLE CELL === */
.timetable-cell {
    background-color: #fefefe;
    min-height: 180px;
    height: auto;
    vertical-align: top;
    padding: 10px;
    transition: background-color 0.2s ease;
}

.timetable-cell:hover {
    background-color: #f8fafc;
}

.timetable-cell-content {
    min-height: 160px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.timetable-cell-empty {
    min-height: 160px;
}

/* === CLASS CARD === */
.class-card {
    padding: 12px 14px;
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    border-left: 4px solid #6366f1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    display: block;
    width: 100%;
    background-color: #f0f9ff;
    text-align: left;
}

.class-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    z-index: 5;
}

/* === CLASS CARD STATES === */
.class-card--active {
    opacity: 1;
}

.class-card--upcoming {
    opacity: 0.7;
}

.class-card--ended {
    opacity: 0.5;
}

/* === STATUS WRAPPER === */
.class-status-wrapper {
    text-align: center;
    margin-top: 8px;
}

/* === DATE DETAIL (Special styling) === */
.class-detail--date {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

/* === CLASS SUBJECT (Tên môn học) === */
.class-subject {
    font-weight: 700;
    font-size: 14px;
    color: #1e40af;
    margin-bottom: 8px;
    line-height: 1.35;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    display: block;
    max-width: 100%;
}

/* === CLASS INFO GROUP === */
.class-info-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
}

/* === CLASS DETAIL ROW === */
.class-detail {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: #475569;
    gap: 4px;
    flex-wrap: wrap;
}

/* === DETAIL LABEL === */
.class-detail-label {
    font-weight: 700;
    color: #334155;
    text-transform: uppercase;
    font-size: 9px;
    flex-shrink: 0;
}

/* === DETAIL VALUE === */
.class-detail-value {
    font-weight: 600;
    color: #1e293b;
    font-size: 11px;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
}

/* === STATUS BADGE === */
.class-status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    margin-top: 6px;
}

.class-status-badge--active {
    background: #34d399;
    color: #064e3b;
}

.class-status-badge--upcoming {
    background: #fbbf24;
    color: #78350f;
}

.class-status-badge--ended {
    background: #d1d5db;
    color: #374151;
}

/* === NOTES BADGE === */
.class-notes-badge {
    position: absolute;
    top: -6px;
    left: -6px;
    background: #ef4444;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 5;
    animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

/* === CARD ACTIONS (Fixed Overlap) === */
.class-card-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    flex-direction: row;
    gap: 4px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
    background: rgba(255,255,255,0.9);
    padding: 2px;
    border-radius: 6px;
}

.class-card:hover .class-card-actions {
    opacity: 1;
}

.class-card-actions button {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
    flex-shrink: 0;
}

.btn-notes-class {
    color: #10b981;
    border-color: #d1fae5;
}

.btn-notes-class:hover {
    background: #10b981;
    color: #ffffff;
    border-color: #10b981;
}

/* === EDIT BUTTON === */
.btn-edit-class {
    color: #6366f1;
    border-color: #e0e7ff;
}

.btn-edit-class:hover {
    background: #6366f1;
    color: #ffffff;
    border-color: #6366f1;
}

/* === DELETE BUTTON === */
.btn-delete-class {
    color: #ef4444;
    border-color: #fecaca;
}

.btn-delete-class:hover {
    background: #ef4444;
    color: #ffffff;
    border-color: #ef4444;
}

/* === TEACHER DISPLAY === */
.class-detail--teacher {
    font-weight: 600;
    color: #4f46e5;
    font-size: 11px;
}

/* === NOTE ITEM STYLES === */
.note-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.note-item:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.note-item--done {
    background: #f9fafb;
    opacity: 0.7;
}

.note-item--overdue {
    border-color: #fecaca;
    background: #fef2f2;
}

.note-checkbox {
    flex-shrink: 0;
}

.note-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #10b981;
}

.note-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.note-text {
    font-size: 13px;
    color: #1f2937;
    line-height: 1.4;
}

.note-text--done {
    text-decoration: line-through;
    color: #9ca3af;
}

.note-deadline {
    font-size: 11px;
    color: #6b7280;
}

.note-deadline--overdue {
    color: #ef4444;
    font-weight: 600;
}

.note-delete-btn {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    color: #d1d5db;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.note-delete-btn:hover {
    background: #fef2f2;
    color: #ef4444;
}

/* === TODAY HIGHLIGHT === */
.is-today {
    background-color: rgba(99, 102, 241, 0.05);
}

.timetable-table thead th.is-today {
    background: #4f46e5;
}

.timetable-table thead th.is-today::after {
    content: "HÔM NAY";
    display: block;
    font-size: 8px;
    font-weight: 800;
    color: #ffffff;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2px 8px;
    border-radius: 8px;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
    animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
    0%, 100% { 
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
    }
    50% { 
        box-shadow: 0 0 15px rgba(102, 126, 234, 0.7);
    }
}

/* === ADD CLASS BUTTON === */
.btn-add-class {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-add-class:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* === TIMETABLE SECTION === */
.timetable-section {
    display: none;
    width: 100%;
}

/* === TIMETABLE TITLE === */
.timetable-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

/* === WEEK NAVIGATOR === */
.week-navigator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.week-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
}

.week-nav-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #111827;
}

.week-display {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    min-width: 120px;
    text-align: center;
}

/* === TIMETABLE ACTIONS === */
.timetable-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.btn-timetable-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #ffffff;
}

.btn-timetable-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-timetable-danger {
    background: #ef4444;
}

.btn-timetable-danger:hover {
    background: #dc2626;
}

.btn-timetable-import {
    background: #10b981;
}

.btn-timetable-import:hover {
    background: #059669;
}

/* === BACK TO DASHBOARD BUTTON === */
.btn-back-dashboard {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    background: #374151;
    color: #ffffff;
    border-radius: 30px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.btn-back-dashboard:hover {
    background: #1f2937;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25);
}

/* ==================== TABLET & DESKTOP (min-width: 768px) ==================== */
@media (min-width: 768px) {
    .timetable-container {
        padding: 24px;
    }

    .timetable-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }

    .timetable-table {
        min-width: 1200px;
    }

    .timetable-table th,
    .timetable-table td {
        padding: 16px 12px;
        min-width: 140px;
    }

    .timetable-table thead th {
        font-size: 14px;
        padding: 16px 12px;
    }

    .header-date {
        font-size: 12px;
        margin-top: 5px;
    }

    .session-col {
        width: 100px;
        min-width: 100px;
        font-size: 13px;
    }

    .timetable-cell {
        min-height: 220px;
        padding: 14px;
    }

    .timetable-cell-content {
        min-height: 200px;
        gap: 10px;
    }

    .class-card {
        padding: 14px 16px;
    }

    .class-subject {
        font-size: 15px;
        margin-bottom: 10px;
    }

    .class-info-group {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px 12px;
    }

    .class-detail {
        font-size: 12px;
    }

    .class-detail-label {
        font-size: 10px;
    }

    .class-detail-value {
        font-size: 12px;
    }
}

/* ==================== LARGE DESKTOP (min-width: 1200px) ==================== */
@media (min-width: 1200px) {
    .timetable-wrapper {
        max-width: calc(100vw - 340px);
    }

    .timetable-table {
        min-width: 1400px;
    }

    .timetable-table th,
    .timetable-table td {
        padding: 20px 16px;
        min-width: 160px;
    }

    .timetable-cell {
        min-height: 260px;
        padding: 16px;
    }

    .timetable-cell-content {
        min-height: 240px;
    }

    .class-subject {
        font-size: 16px;
    }
}

/* ==================== MOBILE CARD VIEW (max-width: 480px) ==================== */
@media (max-width: 480px) {
    .timetable-wrapper {
        border-radius: 8px;
        margin-bottom: 16px;
    }

    .timetable-table {
        min-width: 700px;
    }

    .timetable-table th,
    .timetable-table td {
        padding: 8px 6px;
        min-width: 85px;
        font-size: 11px;
    }

    .timetable-table thead th {
        font-size: 10px;
        padding: 10px 6px;
    }

    .header-date {
        font-size: 9px;
        margin-top: 3px;
    }

    .session-col {
        width: 55px;
        min-width: 55px;
        font-size: 10px;
    }

    .timetable-cell {
        min-height: 120px;
        padding: 6px;
    }

    .timetable-cell-content {
        min-height: 100px;
        gap: 6px;
    }

    .class-card {
        padding: 8px 10px;
        border-radius: 6px;
        border-left-width: 3px;
    }

    .class-subject {
        font-size: 11px;
        margin-bottom: 6px;
        line-height: 1.25;
    }

    .class-info-group {
        gap: 3px;
    }

    .class-detail {
        font-size: 9px;
        gap: 3px;
    }

    .class-detail-label {
        font-size: 8px;
    }

    .class-detail-value {
        font-size: 9px;
    }

    /* Mobile: Always show action buttons for touch */
    .class-card-actions {
        opacity: 1 !important;
        top: 4px;
        right: 4px;
        gap: 3px;
        padding: 1px;
    }

    .class-card-actions button {
        width: 18px;
        height: 18px;
        min-width: 18px;
        min-height: 18px;
    }

    .timetable-table thead th.is-today::after {
        font-size: 7px;
        padding: 2px 5px;
    }

    /* Mobile header adjustments */
    .timetable-header {
        flex-direction: column;
        gap: 12px;
        padding: 12px;
    }

    .timetable-title {
        font-size: 1.25rem;
        text-align: center;
    }

    .week-navigator {
        gap: 8px;
    }

    .week-nav-btn {
        width: 32px;
        height: 32px;
        font-size: 12px;
    }

    .week-display {
        font-size: 0.9rem;
        min-width: 100px;
    }

    .timetable-actions {
        justify-content: center;
        gap: 8px;
    }

    .btn-timetable-action {
        padding: 8px 12px;
        font-size: 12px;
    }

    .btn-timetable-action .btn-text {
        display: none;
    }

    .btn-back-dashboard {
        bottom: 15px;
        right: 15px;
        padding: 8px 14px;
        font-size: 12px;
    }
}
        `;
        document.head.appendChild(styleTag);
        console.log('✅ Timetable CSS loaded successfully (Mobile-First, Clean)');
    },

    async loadTimetable() {
        try {
            const currentUser = AppState.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
            const username = currentUser.username;

            if (!username) {
                console.warn('⚠️ No user logged in');
                this.currentTimetable = [];
                this.renderTimetable();
                return;
            }

            // 🔥 KHÔNG GỬI THAM SỐ TUẦN - Lấy tất cả môn học
            const response = await fetch(`/api/timetable?username=${username}`);
            const data = await response.json();

            if (data.success) {
                this.currentTimetable = data.timetable || [];
                this.classes = this.currentTimetable; // 🔥 Lưu vào classes để notes có thể truy cập
                console.log(`✅ Timetable loaded: ${this.currentTimetable.length} classes`);
                this.renderTimetable(); // Lọc theo ngày sẽ xử lý trong isClassInWeek()
                this.highlightCurrentDay();
                this.renderRemindersWidget(); // 🔥 MỚI: Render widget nhắc nhở
            } else {
                console.warn('⚠️ Timetable load failed:', data.message);
                this.currentTimetable = [];
                this.renderTimetable();
            }
        } catch (error) {
            console.error('❌ Load timetable error:', error);
            this.currentTimetable = [];
            this.renderTimetable();
        }
    },

    renderTimetable() {
        console.log('🎨 Starting renderTimetable with', this.currentTimetable.length, 'classes...');
        console.log('📋 Class data:', this.currentTimetable);

        // CRITICAL FIX: Calculate week boundaries for filtering
        if (!this.currentWeekStart) {
            this.currentWeekStart = this.getMondayOfWeek(new Date());
        }

        const weekStart = new Date(this.currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        console.log('📅 Week filter range:', weekStart.toDateString(), 'to', weekEnd.toDateString());

        // Update week display and header dates
        this.updateWeekDisplay();
        this.renderWeekDatesInHeader();

        const tbody = document.getElementById('timetable-body');
        if (!tbody) {
            console.error('❌ timetable-body element not found in DOM!');
            console.log('🔍 Attempting fallback to timetable-grid...');

            const gridContainer = document.getElementById('timetable-grid');
            if (!gridContainer) {
                console.error('❌ timetable-grid also not found. Cannot render.');
                return;
            }

            // Create table structure if missing
            console.log('🏗️ Creating table structure in timetable-grid...');
            gridContainer.innerHTML = `
                <div class="timetable-wrapper">
                    <table class="timetable-table">
                        <thead>
                            <tr>
                                <th class="session-col">Buổi</th>
                                <th data-day="2">THỨ 2<div class="header-date" id="date-2" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="3">THỨ 3<div class="header-date" id="date-3" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="4">THỨ 4<div class="header-date" id="date-4" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="5">THỨ 5<div class="header-date" id="date-5" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="6">THỨ 6<div class="header-date" id="date-6" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="7">THỨ 7<div class="header-date" id="date-7" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                                <th data-day="CN">CN<div class="header-date" id="date-CN" style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-top: 5px;">--/--</div></th>
                            </tr>
                        </thead>
                        <tbody id="timetable-body"></tbody>
                    </table>
                </div>
            `;

            // Retry getting tbody
            const newTbody = document.getElementById('timetable-body');
            if (!newTbody) {
                console.error('❌ Failed to create timetable-body even after structure creation');
                return;
            }

            // Continue with the new tbody
            this.renderTableRows(newTbody);
            this.renderWeekDatesInHeader(); // Render dates again after creating structure
            return;
        }

        // tbody found, render rows directly
        this.renderTableRows(tbody);
    },

    renderTableRows(tbody) {
        console.log('🔨 Building table rows into tbody...');

        // Define sessions with aliases for flexible matching
        const sessions = [
            { id: 'morning', label: 'Sáng', aliases: ['morning', 'sáng', 'sa', 'am'] },
            { id: 'afternoon', label: 'Chiều', aliases: ['afternoon', 'chiều', 'ch', 'pm'] },
            { id: 'evening', label: 'Tối', aliases: ['evening', 'tối', 'to', 'ev', 'pm'] }
        ];
        const days = ['2', '3', '4', '5', '6', '7', 'CN'];

        let html = '';
        let totalClassesRendered = 0;

        // Track rendered classes to prevent duplicates
        // Key format: "subject|day|session|startPeriod"
        const renderedClasses = new Set();

        sessions.forEach(session => {
            html += '<tr class="timetable-row">';

            // 1. Render Session Label Column
            html += `<td class="session-col">${session.label}</td>`;

            // 2. Render 7 Day Columns
            days.forEach(day => {
                // Filter classes for this cell using strict string comparison + week filtering
                const classes = this.currentTimetable.filter(cls => {
                    const dayMatch = String(cls.day) === String(day);

                    // Check if session matches ID or any alias (case-insensitive)
                    const sessionLower = String(cls.session || '').toLowerCase();
                    const sessionMatch = session.id === sessionLower || session.aliases.includes(sessionLower);

                    // Check if class is active in the selected week
                    const weekMatch = this.isClassInWeek(cls);

                    return dayMatch && sessionMatch && weekMatch;
                });

                html += `<td class="timetable-cell" data-day="${day}" data-session="${session.id}">`;

                if (classes.length > 0) {
                    html += '<div class="timetable-cell-content">';
                    
                    classes.forEach(cls => {
                        // Create unique key to prevent duplicates
                        const uniqueKey = `${cls.subject}|${cls.day}|${cls.session}|${cls.startPeriod}`;
                        
                        // Skip if already rendered
                        if (renderedClasses.has(uniqueKey)) {
                            console.log(`⏭️ Skipping duplicate: "${cls.subject}" on day ${day}, ${session.id}`);
                            return;
                        }
                        
                        renderedClasses.add(uniqueKey);
                        html += this.renderClassCard(cls);
                        totalClassesRendered++;
                    });
                    
                    html += '</div>';
                } else {
                    // Empty cell - still needs structure for consistent layout
                    html += '<div class="timetable-cell-content timetable-cell-empty"></div>';
                }

                html += '</td>';
            });

            html += '</tr>';
        });

        tbody.innerHTML = html;

        console.log('✅ Timetable rendered successfully!');
        console.log(`📊 Stats: ${totalClassesRendered} unique classes rendered (duplicates filtered)`);

        // Verification warning
        if (this.currentTimetable.length > 0 && totalClassesRendered === 0) {
            console.warn('⚠️ WARNING: Classes exist but NONE were rendered!');
            console.warn('🔍 Check if date ranges match the selected week.');
        }
    },

    getClassesForCell(day, session) {
        // Note: This function is kept for backward compatibility
        // but is no longer used by renderTableRows (which has its own inline filtering)
        return this.currentTimetable.filter(cls => {
            const dayMatch = String(cls.day) === String(day);
            const sessionMatch = String(cls.session || '').toLowerCase() === String(session).toLowerCase();
            return dayMatch && sessionMatch;
        });
    },

    createTableStructure(container) {
        console.log('🏗️ Building table structure...');
        container.innerHTML = `
            <style>
                /* INJECTED STYLES FOR TIMETABLE GRID - FULL WIDTH */
                * {
                    box-sizing: border-box;
                }
                
                .timetable-wrapper {
                    width: 100%;
                    display: block;
                    overflow-x: auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    margin-bottom: 20px;
                }
                
                .timetable-table {
                    width: 100% !important;
                    min-width: 800px;
                    table-layout: fixed;
                    border-collapse: collapse;
                    background: white;
                }
                
                .timetable-table th,
                .timetable-table td {
                    border: 1px solid #cbd5e1;
                    padding: 12px 10px;
                    text-align: center;
                    box-sizing: border-box;
                }
                
                .timetable-table thead th {
                    background: #1e40af;
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    border-color: #1e3a8a;
                    padding: 14px 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    vertical-align: middle;
                }
                
                .timetable-table .session-col {
                    background: #e2e8f0;
                    font-weight: 700;
                    color: #374151;
                    width: 80px;
                    min-width: 80px;
                    max-width: 80px;
                    border-right: 2px solid #cbd5e1;
                    font-size: 15px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    vertical-align: middle;
                }
                
                .timetable-cell {
                    background: #ffffff;
                    min-height: 100px;
                    position: relative;
                    vertical-align: top;
                }
                
                .timetable-cell-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 6px;
                    min-height: 100px;
                }
                
                /* Class cards inside cells */
                .class-card {
                    padding: 10px 12px;
                    font-size: 13px;
                    border-radius: 8px;
                    position: relative;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid rgba(0,0,0,0.1);
                    text-align: left;
                }
                
                .class-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                .class-subject {
                    font-weight: 700;
                    margin-bottom: 6px;
                    font-size: 14px;
                    color: #1f2937;
                    line-height: 1.3;
                }
                
                .class-detail {
                    font-size: 12px;
                    margin: 3px 0;
                    color: #4b5563;
                    line-height: 1.4;
                }
                
                .class-detail-label {
                    font-weight: 600;
                    color: #374151;
                }
                
                .btn-delete-class {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    background: rgba(239, 68, 68, 0.9);
                    border: none;
                    border-radius: 4px;
                    padding: 4px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s, transform 0.1s;
                    color: white;
                    width: 22px;
                    height: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .class-card:hover .btn-delete-class {
                    opacity: 1;
                }
                
                .btn-delete-class:hover {
                    background: rgba(220, 38, 38, 1);
                    transform: scale(1.1);
                }
            </style>
            <div class="timetable-wrapper">
                <table class="timetable-table">
                    <thead>
                        <tr>
                            <th class="session-col">Buổi</th>
                            <th data-day="2">Thứ 2</th>
                            <th data-day="3">Thứ 3</th>
                            <th data-day="4">Thứ 4</th>
                            <th data-day="5">Thứ 5</th>
                            <th data-day="6">Thứ 6</th>
                            <th data-day="7">Thứ 7</th>
                            <th data-day="CN">CN</th>
                        </tr>
                    </thead>
                    <tbody id="timetable-body"></tbody>
                </table>
            </div>
        `;
        console.log('✅ Table structure created');
    },

    renderClassCard(cls) {
        const colorIndex = Math.abs(cls.subject.charCodeAt(0)) % this.pastelColors.length;
        const bgColor = this.pastelColors[colorIndex];
        const classId = cls._id || cls.id; // Handle both MongoDB _id and id

        // VISUAL FIX: Validate startPeriod and numPeriods
        const startPeriod = (!isNaN(cls.startPeriod) && cls.startPeriod >= 1) ? cls.startPeriod : 1;
        const numPeriods = (!isNaN(cls.numPeriods) && cls.numPeriods >= 1) ? cls.numPeriods : 1;

        // Recalculate time range with validated values
        const endPeriod = startPeriod + numPeriods - 1;
        const startTime = this.periodTimes[startPeriod]?.start || '00:00';
        const endTime = this.periodTimes[endPeriod]?.end || '23:59';
        const timeRange = cls.timeRange || `${startTime} - ${endTime}`;

        // 🔥 MỚI: Đếm số ghi chú chưa xong
        const notes = cls.notes || [];
        const pendingNotes = notes.filter(n => !n.isDone).length;
        const hasNotes = pendingNotes > 0;

        // Determine class status and apply appropriate CSS class
        let statusClass = '';
        let statusText = '';
        let cardStateClass = '';

        if (cls.startDate && cls.endDate) {
            const today = new Date();
            const start = new Date(cls.startDate);
            const end = new Date(cls.endDate);

            if (today < start) {
                statusClass = 'class-status-badge--upcoming';
                statusText = '⏳ Sắp diễn ra';
                cardStateClass = 'class-card--upcoming';
            } else if (today > end) {
                statusClass = 'class-status-badge--ended';
                statusText = '✓ Đã kết thúc';
                cardStateClass = 'class-card--ended';
            } else {
                statusClass = 'class-status-badge--active';
                statusText = '▶ Đang diễn ra';
                cardStateClass = 'class-card--active';
            }
        }

        // Use CSS variable for background color instead of inline style
        return `
            <div class="class-card ${cardStateClass}" style="--card-bg: ${bgColor}; background-color: var(--card-bg);" data-class-id="${classId}">
                ${hasNotes ? `<span class="class-notes-badge" title="${pendingNotes} ghi chú chưa xong">📝${pendingNotes}</span>` : ''}
                <div class="class-subject" title="${this.escapeHtml(cls.subject)}">
                    ${this.escapeHtml(cls.subject)}
                </div>
                
                <div class="class-info-group">
                    <div class="class-detail">
                        <span class="class-detail-label">Phòng:</span> 
                        <span class="class-detail-value">${this.escapeHtml(cls.room)}</span>
                    </div>
                    <div class="class-detail">
                        <span class="class-detail-label">Cơ sở:</span> 
                        <span class="class-detail-value">${this.escapeHtml(cls.campus || 'CS1')}</span>
                    </div>
                    <div class="class-detail">
                        <span class="class-detail-label">Giờ:</span> 
                        <span class="class-detail-value">${this.escapeHtml(timeRange)}</span>
                    </div>
                    ${cls.dateRangeDisplay ? `
                    <div class="class-detail class-detail--date">
                        <span class="class-detail-label">📅</span> 
                        <span class="class-detail-value">${this.escapeHtml(cls.dateRangeDisplay)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${statusText ? `
                <div class="class-status-wrapper">
                    <span class="class-status-badge ${statusClass}">${statusText}</span>
                </div>
                ` : ''}

                <div class="class-card-actions">
                    <button class="btn-notes-class" data-class-id="${classId}" title="Ghi chú">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </button>
                    <button class="btn-edit-class" data-class-id="${classId}" title="Sửa môn này">
                       <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="btn-delete-class" data-class-id="${classId}" title="Xóa môn này">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    setupEventListeners() {
        if (this.listenersAttached) {
            console.log('⚠️ Event listeners already attached, skipping...');
            return;
        }
        // Event delegation for add class buttons
        document.addEventListener('click', (e) => {
            // Add class button (main header button) - EXCLUDE btn-open-import
            const addClassBtn = e.target.closest('.btn-add-class');
            if (addClassBtn && !e.target.closest('.btn-open-import')) {
                e.preventDefault();
                this.openCreateModal();
            }

            if (e.target.closest('.btn-edit-class')) {
                const btn = e.target.closest('.btn-edit-class');
                const classId = btn.dataset.classId;
                this.openEditModal(classId);
            }

            // 🔥 MỚI: Notes button click
            if (e.target.closest('.btn-notes-class')) {
                const btn = e.target.closest('.btn-notes-class');
                const classId = btn.dataset.classId;
                this.openNotesModal(classId);
            }

            // Delete class button
            if (e.target.closest('.btn-delete-class')) {
                const btn = e.target.closest('.btn-delete-class');
                const classId = btn.dataset.classId;

                // Thêm dòng log này để kiểm tra xem ID có lấy được không
                console.log('🗑️ Requesting delete for ID:', classId);

                this.deleteClass(classId);
            }

            // Submit create class
            if (e.target.closest('.btn-submit-create-class')) {
                e.preventDefault();
                this.submitCreateClass();
            }
        });

        // Listen to period changes to update time display
        const startPeriodSelect = document.getElementById('classStartPeriod');
        const numPeriodsInput = document.getElementById('classNumPeriods');

        if (startPeriodSelect && numPeriodsInput) {
            startPeriodSelect.addEventListener('change', () => this.updateTimeDisplay());
            numPeriodsInput.addEventListener('input', () => this.updateTimeDisplay());
        }

        this.listenersAttached = true; // <--- 3. ĐÁNH DẤU LÀ ĐÃ GÁN SỰ KIỆN XONG
        console.log('✅ Event listeners attached successfully');
    },

    openEditModal(classId) {
        const cls = this.currentTimetable.find(c => String(c._id || c.id) === String(classId));
        if (!cls) {
            console.error('❌ Class not found with ID:', classId);
            return;
        }

        this.editingClassId = classId; // Đánh dấu là đang sửa
        console.log('✏️ Opening edit modal for class:', cls);

        const modal = document.getElementById('createClassModal');
        if (!modal) return;

        // Điền dữ liệu cũ vào form
        document.getElementById('classSubject').value = cls.subject;
        document.getElementById('classRoom').value = cls.room;
        document.getElementById('classCampus').value = cls.campus || '';
        document.getElementById('classDay').value = cls.day;
        document.getElementById('classSession').value = cls.session;
        document.getElementById('classStartPeriod').value = cls.startPeriod;
        document.getElementById('classNumPeriods').value = cls.numPeriods;
        
        // 🔥 MỚI: Điền tên giáo viên
        const teacherInput = document.getElementById('classTeacher');
        if (teacherInput) teacherInput.value = cls.teacher || '';

        // CRITICAL FIX: Populate date fields if available
        const startDateInput = document.getElementById('classStartDate');
        const endDateInput = document.getElementById('classEndDate');

        if (cls.startDate && cls.endDate) {
            // Convert ISO date strings to YYYY-MM-DD format for input
            const formatDateForInput = (isoString) => {
                const date = new Date(isoString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            if (startDateInput) startDateInput.value = formatDateForInput(cls.startDate);
            if (endDateInput) endDateInput.value = formatDateForInput(cls.endDate);
        } else {
            // Clear date inputs if class doesn't have date range
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
        }

        // Đổi tiêu đề modal và nút bấm cho hợp ngữ cảnh
        modal.querySelector('h2').innerHTML = '✏️ Cập Nhật Lớp Học';
        modal.querySelector('.btn-submit-create-class').innerHTML = '💾 Lưu Thay Đổi';

        this.updateTimeDisplay();
        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    openCreateModal() {
        console.log('📝 Mở form thêm lớp...');
        this.editingClassId = null;

        const modal = document.getElementById('createClassModal');
        if (!modal) return;

        // Reset form
        document.getElementById('classSubject').value = '';
        document.getElementById('classRoom').value = '';
        document.getElementById('classCampus').value = '';
        document.getElementById('classDay').value = '2';
        document.getElementById('classSession').value = 'morning';
        document.getElementById('classStartPeriod').value = '1';
        document.getElementById('classNumPeriods').value = '2';
        
        // 🔥 MỚI: Reset teacher field
        const teacherInput = document.getElementById('classTeacher');
        if (teacherInput) teacherInput.value = '';

        // --- TỰ ĐỘNG ĐIỀN NGÀY CỦA TUẦN HIỆN TẠI ---
        if (this.currentWeekStart) {
            const monday = new Date(this.currentWeekStart);
            const sunday = new Date(this.currentWeekStart);
            sunday.setDate(monday.getDate() + 6);

            // Chuyển sang định dạng yyyy-mm-dd cho ô input type="date"
            const toInputFormat = (d) => {
                return d.toISOString().split('T')[0];
            };

            const startDateInput = document.getElementById('classStartDate');
            const endDateInput = document.getElementById('classEndDate');

            if (startDateInput) startDateInput.value = toInputFormat(monday);
            if (endDateInput) endDateInput.value = toInputFormat(sunday);

            console.log(`📅 Đã điền sẵn ngày: ${toInputFormat(monday)} đến ${toInputFormat(sunday)}`);
        }
        // ----------------------------------------------

        modal.querySelector('h2').innerHTML = '➕ Thêm Lớp Học';
        modal.querySelector('.btn-submit-create-class').innerHTML = '💾 Lưu Lớp Học';
        this.updateTimeDisplay();
        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    updateTimeDisplay() {
        const startPeriod = parseInt(document.getElementById('classStartPeriod').value);
        const numPeriods = parseInt(document.getElementById('classNumPeriods').value) || 1;

        const endPeriod = startPeriod + numPeriods - 1;

        if (endPeriod > 15) {
            document.getElementById('calculatedTime').textContent = '⚠️ Vượt quá tiết 12';
            document.getElementById('calculatedTime').style.color = '#dc2626';
            return;
        }

        const startTime = this.periodTimes[startPeriod].start;
        const endTime = this.periodTimes[endPeriod].end;
        const timeRange = `${startTime} - ${endTime}`;

        document.getElementById('calculatedTime').textContent = timeRange;
        document.getElementById('calculatedTime').style.color = '#6366f1';
    },

    async submitCreateClass() {
        console.log('🔐 Starting class submission...');

        // 1. Kiểm tra đăng nhập
        let currentUser = AppState.currentUser;
        if (!currentUser || !currentUser.username) {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                AppState.currentUser = currentUser;
            } else {
                Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
                return;
            }
        }

        // 2. Lấy dữ liệu từ form
        const subject = document.getElementById('classSubject').value.trim();
        const room = document.getElementById('classRoom').value.trim();
        const campusElement = document.getElementById('classCampus');
        const campus = campusElement ? campusElement.value.trim() : 'Cơ sở chính';
        const day = document.getElementById('classDay').value;
        const session = document.getElementById('classSession').value;
        const startPeriod = parseInt(document.getElementById('classStartPeriod').value);
        const numPeriods = parseInt(document.getElementById('classNumPeriods').value);
        
        // 🔥 MỚI: Lấy tên giáo viên
        const teacherElement = document.getElementById('classTeacher');
        const teacher = teacherElement ? teacherElement.value.trim() : '';

        // Validate
        if (!subject || !room) {
            Swal.fire('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
        }

        if (numPeriods < 1 || numPeriods > 5) {
            Swal.fire('Số tiết không hợp lệ', 'Số tiết phải từ 1 đến 5!', 'error');
            return;
        }

        const endPeriod = startPeriod + numPeriods - 1;
        if (endPeriod > 15) {
            Swal.fire('Vượt quá giới hạn', 'Vượt quá tiết 15! Vui lòng điều chỉnh lại.', 'error');
            return;
        }

        const startTime = this.periodTimes[startPeriod].start;
        const endTime = this.periodTimes[endPeriod].end;
        const timeRange = `${startTime} - ${endTime}`;

        // CRITICAL FIX: Get date range from inputs (optional)
        const startDateInput = document.getElementById('classStartDate');
        const endDateInput = document.getElementById('classEndDate');

        let startDate = null;
        let endDate = null;
        let dateRangeDisplay = '';

        if (startDateInput && startDateInput.value && endDateInput && endDateInput.value) {
            // Parse dates from input (YYYY-MM-DD format)
            const startDateParts = startDateInput.value.split('-');
            const endDateParts = endDateInput.value.split('-');

            // Create Date objects with proper time boundaries
            startDate = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]), 0, 0, 0, 0);
            endDate = new Date(parseInt(endDateParts[0]), parseInt(endDateParts[1]) - 1, parseInt(endDateParts[2]), 23, 59, 59, 999);

            // Create display string
            const formatDD_MM = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return `${day}/${month}`;
            };

            dateRangeDisplay = `${formatDD_MM(startDate)} - ${formatDD_MM(endDate)}`;

            console.log('📅 Date range captured:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                display: dateRangeDisplay
            });
        }

        // 3. Chuẩn bị dữ liệu gửi đi
        const classData = {
            username: currentUser.username,
            subject,
            room,
            campus,
            day,
            session,
            startPeriod,
            numPeriods,
            timeRange,
            teacher // 🔥 MỚI: Gửi tên giáo viên
        };

        // Add date range if provided
        if (startDate && endDate) {
            classData.startDate = startDate.toISOString();
            classData.endDate = endDate.toISOString();
            classData.dateRangeDisplay = dateRangeDisplay;
        }

        // 👇👇👇 PHẦN QUAN TRỌNG NHẤT: CHỌN API ĐÚNG 👇👇👇
        let url = '/api/timetable'; // Mặc định là TẠO MỚI

        // Nếu đang có ID sửa, chuyển sang API UPDATE
        if (this.editingClassId) {
            console.log('✏️ Detected Edit Mode for ID:', this.editingClassId);
            url = '/api/timetable/update';
            classData.classId = this.editingClassId; // Gửi kèm ID để server biết sửa cái nào
        }
        // 👆👆👆 -------------------------------------- 👆👆👆

        console.log(`📤 Sending data to ${url}:`, classData);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(classData)
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Success');
                await this.loadTimetable(); // Tải lại bảng
                this.highlightCurrentDay(); // Highlight current day again
                this.closeCreateModal();    // Đóng modal

                // Reset trạng thái sửa
                this.editingClassId = null;

                Swal.fire({
                    title: 'Thành công!',
                    text: this.editingClassId ? 'Cập nhật thành công!' : 'Thêm lớp học thành công!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Thất bại', data.message || 'Thao tác thất bại!', 'error');
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            Swal.fire('Lỗi kết nối', 'Lỗi kết nối server!', 'error');
        }
    },

    async deleteClass(classId) {
        const result = await Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: 'Bạn có muốn xóa lớp học này khỏi thời khóa biểu không?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Có, xóa đi',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;

        // Get username from AppState or localStorage
        let currentUser = AppState.currentUser;
        if (!currentUser || !currentUser.username) {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                AppState.currentUser = currentUser;
            }
        }

        const username = currentUser?.username;
        if (!username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
            return;
        }

        try {
            const response = await fetch('/api/timetable/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ classId, username })
            });

            const data = await response.json();
            if (data.success) {
                console.log('✅ Class deleted');
                await this.loadTimetable();
                this.highlightCurrentDay();
            } else {
                if (data.message && (
                    data.message.includes('User not found') ||
                    data.message.includes('người dùng') ||
                    data.message.includes('Unauthorized') ||
                    data.message.includes('không tìm thấy')
                )) {
                    Swal.fire('Phiên hết hạn', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 'warning');
                    localStorage.clear();
                    location.reload();
                    return;
                }
                Swal.fire('Thất bại', data.message || 'Xóa lớp học thất bại!', 'error');
            }
        } catch (error) {
            console.error('❌ Delete class error:', error);
            Swal.fire('Lỗi', 'Lỗi khi xóa lớp học!', 'error');
        }
    },

    closeCreateModal() {
        const modal = document.getElementById('createClassModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    // ==================== 🔥 MỚI: NOTES MANAGEMENT ====================
    currentNotesClassId: null,

    openNotesModal(classId) {
        console.log('📝 Opening Notes Modal for class:', classId);
        
        // Tìm class trong dữ liệu
        const cls = this.classes.find(c => (c._id || c.id) === classId);
        if (!cls) {
            console.error('❌ Class not found:', classId);
            return;
        }

        this.currentNotesClassId = classId;

        const modal = document.getElementById('classNotesModal');
        const subjectEl = document.getElementById('notesModalSubject');
        
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
        
        if (subjectEl) {
            subjectEl.textContent = cls.subject;
        }

        // Render danh sách notes
        this.renderNotesList(cls.notes || []);
    },

    closeNotesModal() {
        const modal = document.getElementById('classNotesModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
        this.currentNotesClassId = null;
        
        // Reset form
        const content = document.getElementById('noteContent');
        const deadline = document.getElementById('noteDeadline');
        if (content) content.value = '';
        if (deadline) deadline.value = '';
    },

    renderNotesList(notes) {
        const container = document.getElementById('notesList');
        const noNotesMsg = document.getElementById('noNotesMessage');
        
        if (!container) return;

        if (!notes || notes.length === 0) {
            container.innerHTML = '';
            if (noNotesMsg) noNotesMsg.style.display = 'block';
            return;
        }

        if (noNotesMsg) noNotesMsg.style.display = 'none';

        // Sắp xếp: Chưa xong trước, deadline gần trước
        const sortedNotes = [...notes].sort((a, b) => {
            if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            return 0;
        });

        container.innerHTML = sortedNotes.map(note => {
            const deadlineStr = note.deadline 
                ? new Date(note.deadline).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                : '';
            const isOverdue = note.deadline && !note.isDone && new Date(note.deadline) < new Date();
            
            return `
                <div class="note-item ${note.isDone ? 'note-item--done' : ''} ${isOverdue ? 'note-item--overdue' : ''}" 
                     data-note-id="${note.id}">
                    <div class="note-checkbox">
                        <input type="checkbox" ${note.isDone ? 'checked' : ''} 
                               onchange="Timetable.toggleNote('${note.id}')" 
                               title="${note.isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu đã xong'}">
                    </div>
                    <div class="note-content">
                        <span class="note-text ${note.isDone ? 'note-text--done' : ''}">${this.escapeHtml(note.content)}</span>
                        ${deadlineStr ? `<span class="note-deadline ${isOverdue ? 'note-deadline--overdue' : ''}">⏰ ${deadlineStr}</span>` : ''}
                    </div>
                    <button class="note-delete-btn" onclick="Timetable.deleteNote('${note.id}')" title="Xóa ghi chú">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    },

    async addNote() {
        const content = document.getElementById('noteContent')?.value?.trim();
        const deadline = document.getElementById('noteDeadline')?.value;

        if (!content) {
            Swal.fire('Lỗi', 'Vui lòng nhập nội dung ghi chú!', 'warning');
            return;
        }

        if (!this.currentNotesClassId) {
            console.error('❌ No class selected for notes');
            return;
        }

        // 🔥 FIX: Parse JSON đúng cách để lấy username
        let username = null;
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userObj = JSON.parse(savedUser);
                username = userObj.username;
            } catch (e) {
                username = savedUser; // Fallback nếu là string đơn thuần
            }
        }
        if (!username) {
            Swal.fire('Lỗi', 'Vui lòng đăng nhập!', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/timetable/update-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: this.currentNotesClassId,
                    username: username,
                    action: 'add',
                    note: {
                        id: Date.now().toString(),
                        content: content,
                        deadline: deadline || null
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                // Cập nhật UI
                this.renderNotesList(data.notes);
                
                // Cập nhật class trong mảng local
                const cls = this.classes.find(c => (c._id || c.id) === this.currentNotesClassId);
                if (cls) cls.notes = data.notes;
                
                // Reset form
                document.getElementById('noteContent').value = '';
                document.getElementById('noteDeadline').value = '';
                
                // Render lại bảng để cập nhật badge
                this.renderTimetable();
                
                Swal.fire({ icon: 'success', title: 'Đã thêm ghi chú!', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Lỗi', data.message, 'error');
            }
        } catch (err) {
            console.error('❌ Add note error:', err);
            Swal.fire('Lỗi', 'Không thể thêm ghi chú!', 'error');
        }
    },

    async toggleNote(noteId) {
        if (!this.currentNotesClassId) return;
        
        // 🔥 FIX: Parse JSON đúng cách để lấy username
        let username = null;
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userObj = JSON.parse(savedUser);
                username = userObj.username;
            } catch (e) {
                username = savedUser;
            }
        }
        if (!username) return;

        try {
            const response = await fetch('/api/timetable/update-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: this.currentNotesClassId,
                    username: username,
                    action: 'toggle',
                    note: { id: noteId }
                })
            });

            const data = await response.json();
            if (data.success) {
                this.renderNotesList(data.notes);
                
                const cls = this.classes.find(c => (c._id || c.id) === this.currentNotesClassId);
                if (cls) cls.notes = data.notes;
                
                // Render lại bảng để cập nhật badge
                this.renderTimetable();
            }
        } catch (err) {
            console.error('❌ Toggle note error:', err);
        }
    },

    async deleteNote(noteId) {
        if (!this.currentNotesClassId) return;
        
        // 🔥 FIX: Parse JSON đúng cách để lấy username
        let username = null;
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userObj = JSON.parse(savedUser);
                username = userObj.username;
            } catch (e) {
                username = savedUser;
            }
        }
        if (!username) return;

        const confirm = await Swal.fire({
            title: 'Xác nhận xóa?',
            text: 'Ghi chú sẽ bị xóa vĩnh viễn!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch('/api/timetable/update-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: this.currentNotesClassId,
                    username: username,
                    action: 'delete',
                    note: { id: noteId }
                })
            });

            const data = await response.json();
            if (data.success) {
                this.renderNotesList(data.notes);
                
                const cls = this.classes.find(c => (c._id || c.id) === this.currentNotesClassId);
                if (cls) cls.notes = data.notes;
                
                // Render lại bảng để cập nhật badge
                this.renderTimetable();
                
                Swal.fire({ icon: 'success', title: 'Đã xóa ghi chú!', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Lỗi', data.message, 'error');
            }
        } catch (err) {
            console.error('❌ Delete note error:', err);
            Swal.fire('Lỗi', 'Không thể xóa ghi chú!', 'error');
        }
    },

    // 🔥 MỚI: Lấy danh sách tasks sắp đến hạn cho Dashboard Widget
    getUpcomingTasks() {
        const allNotes = [];
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        this.classes.forEach(cls => {
            if (!cls.notes) return;
            cls.notes.forEach(note => {
                if (note.isDone) return; // Bỏ qua task đã xong
                
                const deadline = note.deadline ? new Date(note.deadline) : null;
                const isOverdue = deadline && deadline < now;
                const isUpcoming = deadline && deadline <= next7Days;
                
                if (!deadline || isOverdue || isUpcoming) {
                    allNotes.push({
                        ...note,
                        subject: cls.subject,
                        classId: cls._id || cls.id,
                        isOverdue
                    });
                }
            });
        });

        // Sắp xếp: Quá hạn trước, sau đó theo deadline gần nhất
        return allNotes.sort((a, b) => {
            if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            return 0;
        });
    },

    // 🔥 MỚI: Render Dashboard Reminders Widget
    renderRemindersWidget() {
        const container = document.getElementById('reminders-list');
        const badge = document.getElementById('reminders-count');
        
        if (!container) return;
        
        const tasks = this.getUpcomingTasks();
        
        // Cập nhật badge
        if (badge) {
            if (tasks.length > 0) {
                badge.textContent = tasks.length;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        if (tasks.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #9ca3af; font-size: 12px; padding: 16px;">
                    🎉 Không có ghi chú nào cần hoàn thành
                </p>
            `;
            return;
        }

        // Giới hạn 5 tasks hiển thị trên widget
        const displayTasks = tasks.slice(0, 5);
        
        container.innerHTML = displayTasks.map(task => {
            const deadlineStr = task.deadline 
                ? new Date(task.deadline).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                : 'Không có hạn';
            
            return `
                <div class="reminder-item ${task.isOverdue ? 'reminder-item--overdue' : ''}" 
                     onclick="Timetable.openNotesModal('${task.classId}')">
                    <div class="reminder-subject">${this.escapeHtml(task.subject)}</div>
                    <div class="reminder-content">${this.escapeHtml(task.content)}</div>
                    <div class="reminder-deadline ${task.isOverdue ? 'reminder-deadline--overdue' : ''}">
                        ${task.isOverdue ? '⚠️ Quá hạn: ' : '⏰ '} ${deadlineStr}
                    </div>
                </div>
            `;
        }).join('');

        // Thêm link xem thêm nếu có nhiều hơn 5 tasks
        if (tasks.length > 5) {
            container.innerHTML += `
                <p style="text-align: center; color: #6366f1; font-size: 12px; padding: 8px; cursor: pointer;" 
                   onclick="PageManager.showSection('timetable-section')">
                    +${tasks.length - 5} ghi chú khác →
                </p>
            `;
        }
    },

    // ==================== IMPORT FROM EXCEL ====================

    openImportModal() {
        console.log('🔵 Opening Import Modal...');
        const modal = document.getElementById('modal-import-excel');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => { modal.classList.add('active'); }, 10);
            // Reset state
            this.importedData = [];
            const fileInput = document.getElementById('timetable-file-upload');
            if (fileInput) fileInput.value = '';
            const preview = document.getElementById('import-preview');
            const error = document.getElementById('import-error');
            if (preview) preview.style.display = 'none';
            if (error) error.style.display = 'none';
            const confirmBtn = document.getElementById('btn-confirm-import');
            if (confirmBtn) confirmBtn.disabled = true;
        } else {
            console.error('❌ Import modal #modal-import-excel not found!');
        }
    },

    closeImportModal() {
        console.log('🔵 Closing Import Modal...');
        const modal = document.getElementById('modal-import-excel');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');

            // Đợi hiệu ứng mờ dần rồi mới ẩn hẳn
            setTimeout(() => { modal.style.display = 'none'; }, 300);
            this.importedData = [];
        }
    },

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📁 File selected:', file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON with all rows as arrays
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                console.log('📊 Excel data loaded, total rows:', jsonData.length);
                console.log('📊 First 5 rows:', jsonData.slice(0, 5));

                // Process the data with smart column detection
                this.processExcelData(jsonData);

            } catch (error) {
                console.error('❌ Error reading Excel file:', error);
                this.showError('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file!');
            }
        };

        reader.onerror = () => {
            this.showError('Không thể đọc file. Vui lòng thử lại!');
        };

        reader.readAsArrayBuffer(file);
    },

    processExcelData(rows) {
        console.log('🚀 Đang xử lý file Excel...');

        // 1. Map cột tự động (Dựa trên từ khóa)
        let headerRow = -1;
        const colMap = { subject: -1, day: -1, period: -1, date: -1, room: -1, teacher: -1 };

        // Quét 20 dòng đầu để tìm header
        for (let i = 0; i < Math.min(20, rows.length); i++) {
            const row = rows[i] || [];
            const cells = row.map(c => String(c || '').toLowerCase().trim());

            if (colMap.subject === -1) colMap.subject = cells.findIndex(c => c.includes('tên lhp') || c.includes('môn'));
            if (colMap.day === -1) colMap.day = cells.findIndex(c => c.includes('thứ'));
            if (colMap.period === -1) colMap.period = cells.findIndex(c => c.includes('tiết') || c.includes('giờ'));
            if (colMap.date === -1) colMap.date = cells.findIndex(c => c.includes('ngày') || c.includes('thời gian'));
            if (colMap.room === -1) colMap.room = cells.findIndex(c => c.includes('phòng'));
            // 🔥 MỚI: Tìm cột Giáo viên
            if (colMap.teacher === -1) colMap.teacher = cells.findIndex(c => c.includes('gv') || c.includes('giáo viên') || c.includes('giảng viên') || c.includes('lecturer'));

            // Nếu tìm thấy Tên môn và Thứ thì chốt đây là dòng header
            if (colMap.subject > -1 && colMap.day > -1) { headerRow = i; break; }
        }

        if (headerRow === -1) {
            // Nếu không tìm thấy header, thử gán cứng (Backup cho file của bạn)
            // Dựa trên file bạn gửi: STT(1), Tên(2), GV(3), STC(4), Mã(5), Thứ(6), Tiết(7), Phòng(8), Ngày(9)
            colMap.subject = 2; colMap.teacher = 3; colMap.day = 6; colMap.period = 7; colMap.room = 8; colMap.date = 9;
            headerRow = 0; // Giả định
        }

        // 🔥 Fallback: Nếu không tìm thấy cột teacher, đặt mặc định là cột 3 (GV)
        if (colMap.teacher === -1) colMap.teacher = 3;

        console.log('📊 Column mapping:', colMap);

        const importedClasses = [];
        let lastSubject = null; // Biến nhớ để xử lý Merge Cell

        // 2. Duyệt từng dòng dữ liệu
        for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;

            let subjectRaw = row[colMap.subject];
            let dayRaw = row[colMap.day];
            let periodRaw = row[colMap.period];
            let dateRaw = row[colMap.date];
            let roomRaw = row[colMap.room];
            let teacherRaw = row[colMap.teacher]; // 🔥 MỚI: Lấy tên giáo viên

            // LOGIC FILL-DOWN: Nếu ô Tên môn trống nhưng có Giờ học -> Lấy tên môn dòng trên
            if ((!subjectRaw || String(subjectRaw).trim() === '') && dayRaw && lastSubject) {
                subjectRaw = lastSubject;
            } else if (subjectRaw) {
                lastSubject = subjectRaw; // Cập nhật biến nhớ
            }

            // Nếu thiếu thông tin quan trọng thì bỏ qua
            if (!subjectRaw || !dayRaw || !periodRaw) continue;

            try {
                // Gọi các hàm xử lý mới
                const day = this.parseDayString(dayRaw); // Hàm này giữ nguyên như cũ
                const periodInfo = this.parseAdvancedPeriod(periodRaw); // <--- LOGIC MỚI
                const dateInfo = this.parseAdvancedDateRange(dateRaw);   // <--- LOGIC MỚI

                // Làm sạch tên môn
                let cleanSubject = String(subjectRaw);
                if (cleanSubject.includes('\n')) cleanSubject = cleanSubject.split('\n')[1] || cleanSubject;
                if (cleanSubject.includes('-')) cleanSubject = cleanSubject.split('-')[1] || cleanSubject;

                // Parse campus từ room number
                const campus = this.parseCampusFromRoom(roomRaw);

                importedClasses.push({
                    id: Date.now() + Math.random(), // Tạo ID tạm
                    subject: cleanSubject.trim(),
                    day: day,
                    session: periodInfo.session,
                    startPeriod: periodInfo.startPeriod,
                    numPeriods: periodInfo.numPeriods,
                    room: roomRaw || 'Online',
                    campus: campus,
                    teacher: teacherRaw ? String(teacherRaw).trim() : '', // 🔥 MỚI: Lưu tên giáo viên
                    startDate: dateInfo.startDate, // Lưu ngày bắt đầu chuẩn
                    endDate: dateInfo.endDate,     // Lưu ngày kết thúc chuẩn
                    dateRangeDisplay: dateInfo.display,
                    weeks: [], // Để trống, ta dùng logic ngày tháng để lọc
                    notes: [], // 🔥 MỚI: Mảng ghi chú rỗng
                });

            } catch (err) {
                console.warn(`Lỗi dòng ${i}:`, err.message);
            }
        }

        if (importedClasses.length > 0) {
            this.importedData = importedClasses;
            // Gọi hàm hiển thị bảng xem trước (giữ nguyên logic cũ của bạn)
            if (this.showPreview) this.showPreview(importedClasses.length);
            else console.log("Imported:", importedClasses);
        } else {
            alert('Không đọc được dữ liệu nào! Hãy kiểm tra lại file Excel.');
        }
    },

    // Helper: Tìm tiết học dựa trên giờ (VD: 15h10 -> Tiết 10)
    // Bạn nhớ thêm hàm này vào trong object Timetable nhé
    findPeriodByTime(hour, minute) {
        const timeVal = hour * 60 + minute;
        for (const [period, time] of Object.entries(this.periodTimes)) {
            const [h, m] = time.start.split(':').map(Number);
            const startVal = h * 60 + m;
            // Cho phép lệch tối đa 10 phút
            if (Math.abs(timeVal - startVal) <= 10) {
                return parseInt(period);
            }
        }
        return null;
    },

    // Helper: Parse campus từ room number
    parseCampusFromRoom(roomStr) {
        if (!roomStr) return 'ADV';
        
        const room = String(roomStr).trim().toUpperCase();
        
        // Kiểm tra CVT.LTR -> Ngoài trường
        if (room.includes('CVT.LTR') || room.includes('CVT')) {
            return 'Ngoài trường';
        }
        
        // Tách phần prefix trước dấu chấm đầu tiên
        const parts = room.split('.');
        if (parts.length >= 2) {
            const prefix = parts[0].trim();
            
            // Kiểm tra nếu prefix chỉ là một chữ cái (như B, A, C) -> ADV
            if (prefix.length === 1 && /^[A-Z]$/.test(prefix)) {
                return 'ADV';
            }
            
            // Nếu prefix có nhiều hơn 1 ký tự -> đó là tên cơ sở
            if (prefix.length > 1) {
                return prefix;
            }
        }
        
        // Nếu không có dấu chấm hoặc format không khớp -> ADV
        return 'ADV';
    },

    // ==================== ADVANCED PERIOD PARSER (REFACTORED) ====================
    /**
     * Parse period/time from "weird" CSV format.
     * 
     * REGEX EXPLANATION (Step-by-step):
     * ─────────────────────────────────────────────────────────
     * Input examples:
     *   - "(15h10)-\n>12 (17h40)"   → Tiết 10 đến 12 (Chiều)
     *   - "1 (6h30)-\n>3 (9h00)"    → Tiết 1 đến 3 (Sáng)
     *   - "10 (15h10)"              → Tiết 10 (Single period)
     * 
     * STRATEGY: We use TWO different approaches:
     * 
     * Approach 1: Extract TIME (e.g., 15h10)
     *   Regex: /(\d{1,2})h(\d{2})/
     *   - (\d{1,2})  → 1-2 digits for hour (6, 15, etc.)
     *   - h          → Literal 'h' character
     *   - (\d{2})    → Exactly 2 digits for minutes (30, 10, etc.)
     *   Then use findPeriodByTime() to convert time → period number
     * 
     * Approach 2: Extract END PERIOD number
     *   Regex: /[>\-](\d+)/
     *   - [>\-]      → Match either ">" or "-" character
     *   - (\d+)      → Capture one or more digits after
     *   This grabs the ending period from patterns like ">12" or "-3"
     * 
     * Fallback: Just extract all numbers and use first as start, last as end
     *   Regex: /\d+/g
     * ─────────────────────────────────────────────────────────
     */
    parseAdvancedPeriod(periodStr) {
        const str = String(periodStr).trim();
        console.log(`    🔍 Period parsing: "${str}"`);

        // === Approach 1: Look for time format (e.g., 15h10) ===
        const timeRegex = /(\d{1,2})h(\d{2})/;
        const timeMatch = str.match(timeRegex);

        // Look for end period after arrow or dash (e.g., >12, -3)
        const endPeriodRegex = /[>\-]\s*(\d+)/;
        const endPeriodMatch = str.match(endPeriodRegex);

        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            console.log(`      ⏰ Found time: ${hour}h${minute}`);

            // Convert time to period number
            const startPeriod = this.findPeriodByTime(hour, minute);

            if (startPeriod) {
                let endPeriod = startPeriod;

                // If we found an end period, use it
                if (endPeriodMatch) {
                    endPeriod = parseInt(endPeriodMatch[1]);
                    console.log(`      📍 End period from arrow: ${endPeriod}`);
                }

                const numPeriods = Math.max(1, endPeriod - startPeriod + 1);

                // Determine session based on period number
                let session = 'morning';
                if (startPeriod >= 13) {
                    session = 'evening';
                } else if (startPeriod >= 7) {
                    session = 'afternoon';
                }

                console.log(`      ✅ Result: Period ${startPeriod}-${endPeriod} (${numPeriods} periods), Session: ${session}`);

                return { startPeriod, numPeriods, session };
            }
        }

        // === Approach 2: Look for period numbers directly ===
        // Pattern: "10 (15h10) -> 12" - extract 10 and 12
        const periodBeforeParenRegex = /(\d+)\s*\(/g;
        const periodMatches = [...str.matchAll(periodBeforeParenRegex)];

        if (periodMatches.length >= 1) {
            const startPeriod = parseInt(periodMatches[0][1]);
            let endPeriod = startPeriod;

            // If there's more than one match, get the last one as end
            if (periodMatches.length >= 2) {
                endPeriod = parseInt(periodMatches[periodMatches.length - 1][1]);
            } else if (endPeriodMatch) {
                // Or use the arrow match if available
                endPeriod = parseInt(endPeriodMatch[1]);
            }

            const numPeriods = Math.max(1, endPeriod - startPeriod + 1);

            let session = 'morning';
            if (startPeriod >= 13) {
                session = 'evening';
            } else if (startPeriod >= 7) {
                session = 'afternoon';
            }

            console.log(`      ✅ Result (from period numbers): Period ${startPeriod}-${endPeriod}, Session: ${session}`);

            return { startPeriod, numPeriods, session };
        }

        // === Fallback: Extract any numbers ===
        const numbers = str.match(/\d+/g);
        if (numbers && numbers.length >= 1) {
            const start = parseInt(numbers[0]);
            const end = numbers.length > 1 ? parseInt(numbers[numbers.length - 1]) : start;

            // Make sure end is not a time value (e.g., 17 from 17h40)
            const validEnd = end <= 15 ? end : start;

            const numPeriods = Math.max(1, validEnd - start + 1);

            let session = 'morning';
            if (start >= 13) {
                session = 'evening';
            } else if (start >= 7) {
                session = 'afternoon';
            }

            console.log(`      ✅ Result (fallback): Period ${start}-${validEnd}, Session: ${session}`);

            return {
                startPeriod: start,
                numPeriods: numPeriods,
                session: session
            };
        }

        console.log(`      ❌ Failed to parse period: "${periodStr}"`);
        throw new Error(`Không đọc được tiết học: ${periodStr}`);
    },

    // ==================== PARSE NGÀY THÁNG (REFACTORED - Handles Multi-line CSV) ====================
    /**
     * Parse date range from "weird" CSV format.
     * 
     * REGEX EXPLANATION (Step-by-step):
     * ─────────────────────────────────────────────────────────
     * Input examples:
     *   - "19/01/2026-\n>13/04/2026"
     *   - "23/01/2026->13/03/2026"
     *   - "05/02/2026-\n>25/04/2026"
     * 
     * Step 1: CLEAN the string
     *   - Remove ALL letters, newlines (\n, \r), spaces, and the arrow character (>)
     *   - Regex: /[a-zA-Z\n\r\s>]/g
     *   - Result: "19/01/2026-13/04/2026"
     * 
     * Step 2: EXTRACT dates using this pattern:
     *   /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g
     * 
     *   Breakdown:
     *   - (\d{1,2})    → Capture 1-2 digits (day: 1-31)
     *   - [\/\-\.]     → Match separator: slash, dash, or dot
     *   - (\d{1,2})    → Capture 1-2 digits (month: 1-12)
     *   - [\/\-\.]     → Match separator again
     *   - (\d{4})      → Capture exactly 4 digits (year: 2026)
     * 
     *   The 'g' flag finds ALL matches, so we get both start AND end dates.
     * ─────────────────────────────────────────────────────────
     */
    parseAdvancedDateRange(dateRangeStr) {
        if (!dateRangeStr) return { startDate: null, endDate: null, display: '' };

        // Step 1: Clean the messy CSV format
        // Remove: letters, newlines, spaces, and the ">" arrow character
        const cleanStr = String(dateRangeStr).replace(/[a-zA-Z\n\r\s>]/g, '');
        console.log(`    🧹 Date cleaning: "${dateRangeStr}" → "${cleanStr}"`);

        // Step 2: Extract all dates using Regex
        // Pattern matches: dd/mm/yyyy, dd-mm-yyyy, or dd.mm.yyyy
        const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
        const matches = [...cleanStr.matchAll(dateRegex)];

        if (matches.length >= 1) {
            // Helper: Convert regex match to Date object
            // match[1] = day, match[2] = month, match[3] = year
            const toDate = (m) => new Date(
                parseInt(m[3]),      // year
                parseInt(m[2]) - 1,  // month (0-indexed)
                parseInt(m[1])       // day
            );

            const start = toDate(matches[0]);
            // If we found 2 dates, use the second as end date
            // Otherwise, use the same date (single-day event)
            const end = matches.length > 1 ? toDate(matches[matches.length - 1]) : new Date(start);

            // Set time boundaries for accurate comparisons
            start.setHours(0, 0, 0, 0);       // Start of day
            end.setHours(23, 59, 59, 999);    // End of day

            const display = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')} - ${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;

            console.log(`    ✅ Date parsed: ${start.toLocaleDateString('vi-VN')} → ${end.toLocaleDateString('vi-VN')}`);

            return {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                display: display
            };
        }

        console.log(`    ⚠️ No valid date found in: "${dateRangeStr}"`);
        return { startDate: null, endDate: null, display: '' };
    },

    // ==================== HELPER: Check if subject is active in selected week ====================
    /**
     * Determines if a subject should be displayed in the currently selected week.
     * 
     * LOGIC EXPLANATION:
     * ─────────────────────────────────────────────────────────
     * 1. Get the selected week's Monday (start) and Sunday (end)
     * 2. Get the subject's startDate and endDate
     * 3. Check for OVERLAP:
     *    - If week ends BEFORE subject starts → HIDE (not started yet)
     *    - If week starts AFTER subject ends → HIDE (already finished)
     *    - Otherwise → SHOW (there's overlap)
     * ─────────────────────────────────────────────────────────
     */
    isSubjectActiveInWeek(subject, weekStartDate, weekEndDate) {
        // If no week filter is set, show all subjects
        if (!weekStartDate || !weekEndDate) {
            return true;
        }

        // If subject has no date range, show it (legacy data)
        if (!subject.startDate || !subject.endDate) {
            console.log(`    ⚠️ "${subject.subject}": No date range → SHOW (legacy)`);
            return true;
        }

        // Parse subject dates
        const subjectStart = new Date(subject.startDate);
        const subjectEnd = new Date(subject.endDate);

        // Normalize times for comparison
        subjectStart.setHours(0, 0, 0, 0);
        subjectEnd.setHours(23, 59, 59, 999);

        const weekStart = new Date(weekStartDate);
        const weekEnd = new Date(weekEndDate);
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);

        // Check for NO overlap (hide conditions)
        if (weekEnd < subjectStart) {
            // Week ends before subject starts
            console.log(`    ❌ "${subject.subject}": Week ends ${weekEnd.toLocaleDateString('vi-VN')} < Subject starts ${subjectStart.toLocaleDateString('vi-VN')} → HIDE`);
            return false;
        }

        if (weekStart > subjectEnd) {
            // Week starts after subject ends
            console.log(`    ❌ "${subject.subject}": Week starts ${weekStart.toLocaleDateString('vi-VN')} > Subject ends ${subjectEnd.toLocaleDateString('vi-VN')} → HIDE`);
            return false;
        }

        // There is overlap → SHOW
        console.log(`    ✅ "${subject.subject}": Active in week ${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')}`);
        return true;
    },

    parseDayString(dayStr) {
        const dayString = String(dayStr).toLowerCase().trim();

        const dayMap = {
            'thứ hai': '2',
            'thứ ba': '3',
            'thứ tư': '4',
            'thứ năm': '5',
            'thứ sáu': '6',
            'thứ bảy': '7',
            'thứ 2': '2',
            'thứ 3': '3',
            'thứ 4': '4',
            'thứ 5': '5',
            'thứ 6': '6',
            'thứ 7': '7',
            'chủ nhật': 'CN',
            'cn': 'CN',
            't2': '2',
            't3': '3',
            't4': '4',
            't5': '5',
            't6': '6',
            't7': '7'
        };

        for (const [key, value] of Object.entries(dayMap)) {
            if (dayString.includes(key)) {
                return value;
            }
        }

        throw new Error(`Cannot parse day: ${dayStr}`);
    },

    parsePeriodString(periodStr) {
        const str = String(periodStr).trim();

        // CRITICAL FIX: Pattern "10 (15h10) -> 12 (17h40)"
        // We need to extract period numbers (10, 12), NOT hour values (15, 17)
        // Regex: Match digits that are followed by opening parenthesis "("
        // This ensures we only capture period numbers, not time values inside parentheses

        const matches = str.match(/\b(\d+)\s*\(/g);

        if (matches && matches.length >= 1) {
            // Extract the numbers from matches (e.g., "10 (" -> 10)
            const periods = matches.map(match => parseInt(match.match(/\d+/)[0]));

            const startPeriod = periods[0]; // First match = start period
            const endPeriod = periods[periods.length - 1]; // Last match = end period
            const numPeriods = endPeriod - startPeriod + 1;

            // Determine session based on start period
            let session = 'morning';
            if (startPeriod <= 6) {
                session = 'morning';
            } else if (startPeriod > 6 && startPeriod <= 12) {
                session = 'afternoon';
            } else if (startPeriod > 12) {
                session = 'evening';
            }

            console.log(`    📊 Period parsing: "${str}" -> Start: ${startPeriod}, End: ${endPeriod}, Count: ${numPeriods}, Session: ${session}`);

            return {
                startPeriod: startPeriod,
                numPeriods: numPeriods,
                session: session
            };
        }

        // Fallback: Try extracting any numbers if parenthesis pattern fails
        const numbers = str.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            const startPeriod = parseInt(numbers[0]);
            const endPeriod = parseInt(numbers[1]);
            const numPeriods = endPeriod - startPeriod + 1;

            let session = 'morning';
            if (startPeriod <= 6) {
                session = 'morning';
            } else if (startPeriod > 6 && startPeriod <= 12) {
                session = 'afternoon';
            } else if (startPeriod > 12) {
                session = 'evening';
            }

            console.log(`    📊 Period parsing (fallback): "${str}" -> Start: ${startPeriod}, End: ${endPeriod}, Count: ${numPeriods}, Session: ${session}`);

            return {
                startPeriod: startPeriod,
                numPeriods: numPeriods,
                session: session
            };
        }

        // Single period fallback
        if (numbers && numbers.length === 1) {
            const startPeriod = parseInt(numbers[0]);
            let session = 'morning';
            if (startPeriod <= 6) {
                session = 'morning';
            } else if (startPeriod > 6 && startPeriod <= 12) {
                session = 'afternoon';
            } else if (startPeriod > 12) {
                session = 'evening';
            }

            console.log(`    📊 Single period: "${str}" -> Period: ${startPeriod}, Session: ${session}`);
            return {
                startPeriod: startPeriod,
                numPeriods: 1,
                session: session
            };
        }

        throw new Error(`Cannot parse period: ${periodStr}`);
    },

    parseDateRange(dateRangeStr) {
        if (!dateRangeStr || !String(dateRangeStr).trim()) {
            console.log('    ⏭️ No date range provided');
            return {
                startDate: null,
                endDate: null,
                display: ''
            };
        }

        try {
            const original = String(dateRangeStr);
            console.log(`    🔍 Parsing date range: "${original}"`);

            // CRITICAL: Clean messy formatting
            // Remove: newlines (\n, \r), arrows (>), extra whitespace
            const cleaned = original
                .replace(/[\n\r\s>-]/g, '')
                .trim();

            console.log(`    🧹 Cleaned: "${cleaned}"`);

            // Regex: Extract all dates in DD/MM/YYYY format
            const dates = cleaned.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);

            if (dates && dates.length >= 1) {
                // Parse start date (first match)
                const startParts = dates[0].split('/');
                const startDay = parseInt(startParts[0]);
                const startMonth = parseInt(startParts[1]);
                const startYear = parseInt(startParts[2]);

                // Parse end date (last match, or same as start if only one date)
                const endParts = dates[dates.length - 1].split('/');
                const endDay = parseInt(endParts[0]);
                const endMonth = parseInt(endParts[1]);
                const endYear = parseInt(endParts[2]);

                // CRITICAL: Set time boundaries properly
                // startDate: 00:00:00 (beginning of day)
                // endDate: 23:59:59 (end of day)
                const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
                const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

                // Create display string (short format: dd/mm)
                const display = `${String(startDay).padStart(2, '0')}/${String(startMonth).padStart(2, '0')} - ${String(endDay).padStart(2, '0')}/${String(endMonth).padStart(2, '0')}`;

                console.log(`    ✅ Parsed: ${startDate.toISOString()} to ${endDate.toISOString()}`);

                return {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    display: display
                };
            }

            // If no match, return empty
            console.log('    ⚠️ Date format not recognized');
            return {
                startDate: null,
                endDate: null,
                display: ''
            };

        } catch (error) {
            console.error('    ❌ Date parsing error:', error.message);
            return {
                startDate: null,
                endDate: null,
                display: ''
            };
        }
    },

    showPreview(count) {
        document.getElementById('import-error').style.display = 'none';
        document.getElementById('import-preview').style.display = 'block';
        document.getElementById('class-count').textContent = count;
        document.getElementById('btn-confirm-import').disabled = false;
    },

    showError(message) {
        document.getElementById('import-preview').style.display = 'none';
        document.getElementById('import-error').style.display = 'block';
        document.getElementById('error-message').textContent = message;
        document.getElementById('btn-confirm-import').disabled = true;
    },

    async confirmImport() {
        if (this.importedData.length === 0) {
            Swal.fire('Lỗi', 'Không có dữ liệu để import!', 'error');
            return;
        }

        // Get current user
        let currentUser = AppState.currentUser;
        if (!currentUser || !currentUser.username) {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                AppState.currentUser = currentUser;
            }
        }

        if (!currentUser || !currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
            return;
        }

        try {
            // Show loading
            Swal.fire({
                title: 'Đang import...',
                text: `Đang thêm ${this.importedData.length} lớp học vào thời khóa biểu`,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Send all classes to server
            const promises = this.importedData.map(classData => {
                return fetch('/api/timetable', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: currentUser.username,
                        ...classData
                    })
                });
            });

            const results = await Promise.all(promises);

            // Check if all succeeded
            let successCount = 0;
            for (const response of results) {
                const data = await response.json();
                if (data.success) {
                    successCount++;
                }
            }

            // Reload timetable
            await this.loadTimetable();
            this.highlightCurrentDay();

            // Close modal
            this.closeImportModal();

            // Show success message
            Swal.fire({
                title: 'Thành công!',
                text: `Đã import ${successCount}/${this.importedData.length} lớp học vào thời khóa biểu`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('❌ Import error:', error);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi import dữ liệu!', 'error');
        }
    },

    // ==================== XÓA TẤT CẢ (Đã Fix lỗi F5) ====================
    // ==================== XÓA TẤT CẢ (PHIÊN BẢN SIÊU TỐC) ====================
    async deleteAllClasses() {
        // 1. Kiểm tra xem có gì để xóa không
        let classesToDelete = [];
        if (this.currentTimetable && this.currentTimetable.length > 0) {
            classesToDelete = [...this.currentTimetable];
        } else if (AppState.currentUser && AppState.currentUser.timetable) {
            classesToDelete = [...AppState.currentUser.timetable];
        }

        if (classesToDelete.length === 0) {
            Swal.fire('Thông báo', 'Thời khóa biểu đã trống sẵn rồi!', 'info');
            return;
        }

        // 2. Hỏi xác nhận
        const result = await Swal.fire({
            title: 'Xóa sạch dữ liệu?',
            text: `Hành động này sẽ xóa vĩnh viễn ${classesToDelete.length} lớp học trên Server.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa sạch',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            // Hiện loading để đảm bảo người dùng đợi Server xử lý xong
            Swal.fire({
                title: 'Đang dọn dẹp Server...',
                html: 'Vui lòng đợi trong giây lát.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                // Lấy username
                let currentUser = AppState.currentUser;
                if (!currentUser || !currentUser.username) {
                    const savedUser = localStorage.getItem('currentUser');
                    if (savedUser) currentUser = JSON.parse(savedUser);
                }

                if (!currentUser || !currentUser.username) {
                    Swal.fire('Lỗi', 'Không tìm thấy thông tin người dùng!', 'error');
                    return;
                }

                const username = currentUser.username;

                // 🚀 GỌI API CLEAR (API NÀY ĐÃ CÓ TRONG SERVER.JS CỦA BẠN)
                // Method: DELETE, Endpoint: /api/timetable/clear
                const response = await fetch('/api/timetable/clear', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });

                const data = await response.json();

                if (data.success) {
                    // --- NẾU SERVER BÁO THÀNH CÔNG ---

                    // 1. Xóa sạch bộ nhớ hiển thị
                    this.currentTimetable = [];
                    this.importedData = [];

                    // 2. Xóa sạch bộ nhớ LocalStorage
                    if (AppState.currentUser) {
                        AppState.currentUser.timetable = [];
                        await AppState.saveUser(AppState.currentUser);
                    }

                    // 3. Xóa giao diện HTML
                    document.querySelectorAll('.class-card').forEach(el => el.remove());

                    // 4. Vẽ lại bảng lưới
                    if (typeof this.renderTimetable === 'function') this.renderTimetable();
                    else if (typeof this.render === 'function') this.render();

                    // 5. Báo thành công
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã xóa sạch!',
                        text: `Server đã xóa ${data.deletedCount || 'toàn bộ'} lớp học.`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(data.message || 'Server trả về lỗi');
                }

            } catch (error) {
                console.error('Lỗi xóa:', error);
                Swal.fire('Thất bại', 'Không thể xóa dữ liệu trên Server: ' + error.message, 'error');
            }
        }
    },
};

window.Timetable = Timetable;