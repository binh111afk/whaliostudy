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

        // Initialize week navigation to current week
        this.jumpToToday();

        await this.loadTimetable();
        this.renderTimetable();
        this.highlightCurrentDay();
        this.setupEventListeners();
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

                // Update innerHTML to preserve the dd/mm format
                dateElement.innerHTML = `${day}/${month}`;
            }
        });

        console.log('📅 Week dates rendered in headers');
    },

    // ==================== LOGIC HIỂN THỊ TUẦN (CHUẨN 100%) ====================
    isClassInWeek(classObj) {
        // [Case 0] Nếu không có tuần được chọn → Hiện tất cả
        if (!this.currentWeekStart) {
            console.log(`📋 "${classObj.subject}": No week filter → SHOW ALL`);
            return true;
        }

        // Xác định phạm vi tuần đang xem (Thứ 2 00:00 → Chủ Nhật 23:59)
        const viewStart = new Date(this.currentWeekStart);
        viewStart.setHours(0, 0, 0, 0);

        const viewEnd = new Date(viewStart);
        viewEnd.setDate(viewEnd.getDate() + 6);
        viewEnd.setHours(23, 59, 59, 999);

        console.log(`📅 View: ${viewStart.toLocaleDateString('vi-VN')} - ${viewEnd.toLocaleDateString('vi-VN')}`);

        // Xác định phạm vi môn học
        let clsStart = null;
        let clsEnd = null;

        if (classObj.startDate && classObj.endDate) {
            clsStart = new Date(classObj.startDate);
            clsStart.setHours(0, 0, 0, 0);

            clsEnd = new Date(classObj.endDate);
            clsEnd.setHours(23, 59, 59, 999);

            console.log(`📚 "${classObj.subject}": ${clsStart.toLocaleDateString('vi-VN')} - ${clsEnd.toLocaleDateString('vi-VN')}`);
        }

        // ========== LỚP 1: HARD CHECK (NGÀY THÁNG) ==========
        if (clsStart && clsEnd) {
            // Nếu tuần xem kết thúc TRƯỚC khi môn bắt đầu → ẨN
            if (viewEnd < clsStart) {
                console.log(`❌ "${classObj.subject}": Week ends BEFORE class starts → HIDE`);
                return false;
            }

            // Nếu tuần xem bắt đầu SAU khi môn kết thúc → ẨN
            if (viewStart > clsEnd) {
                console.log(`❌ "${classObj.subject}": Week starts AFTER class ends → HIDE`);
                return false;
            }

            console.log(`✅ "${classObj.subject}": Passed Layer 1 (Date Range)`);
        }

        // ========== LỚP 2: SOFT CHECK (SỐ TUẦN) ==========
        // Lấy số tuần hiện tại (dùng Thứ 5 để tính chuẩn ISO)
        const checkDate = new Date(viewStart);
        checkDate.setDate(checkDate.getDate() + 3); // Thứ 5
        const currentWeekNum = this.getWeekNumber(checkDate);

        console.log(`🔢 Current week number: ${currentWeekNum}`);

        // Kiểm tra mảng weeks
        let weeks = classObj.weeks;

        // 🔥 CRITICAL: Tính lại nếu rỗng
        if ((!weeks || weeks.length === 0) && clsStart && clsEnd) {
            console.warn(`⚠️ "${classObj.subject}": Empty weeks array, recalculating...`);
            weeks = this.getWeeksBetween(classObj.startDate, classObj.endDate);
            console.log(`✅ Recalculated: [${weeks.join(', ')}]`);
        }

        // Nếu có mảng weeks hợp lệ
        if (Array.isArray(weeks) && weeks.length > 0) {
            const isInWeeks = weeks.includes(currentWeekNum);
            console.log(`🔍 "${classObj.subject}": weeks=[${weeks.join(', ')}], current=${currentWeekNum}, match=${isInWeeks ? '✅' : '❌'}`);
            return isInWeeks;
        }

        // [Fallback] Nếu không có weeks nhưng có date range → SHOW
        if (clsStart && clsEnd) {
            console.log(`⚠️ "${classObj.subject}": No weeks data, passed Layer 1 → SHOW`);
            return true;
        }

        // Mặc định: ẨN (an toàn)
        console.log(`❌ "${classObj.subject}": No data → HIDE (safe default)`);
        return false;
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
            /* --- CẤU TRÚC BẢNG --- */
            .timetable-wrapper {
                width: 100%;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                overflow-x: auto;
                border: 1px solid #e2e8f0;
                margin-bottom: 30px;
            }

            .timetable-table {
                width: 100%;
                min-width: 1200px;
                table-layout: auto;
                border-collapse: separate; 
                border-spacing: 0;
            }

            .timetable-table th,
            .timetable-table td {
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                padding: 0;
            }
            
            .timetable-table th:last-child,
            .timetable-table td:last-child { 
                border-right: none; 
            }

            /* --- HEADER --- */
            .timetable-table thead th {
                background-color: #6366f1;
                color: #ffffff;
                padding: 12px 8px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                position: sticky;
                top: 0;
                z-index: 20;
                text-align: center;
            }

            /* CỘT SÁNG/CHIỀU/TỐI */
            .timetable-table .session-col {
                width: 70px;
                min-width: 70px;
                background-color: #f8fafc;
                color: #475569;
                font-weight: 700;
                text-align: center;
                vertical-align: middle;
                text-transform: uppercase;
                font-size: 11px;
                position: sticky;
                left: 0;
                z-index: 10;
                border-right: 2px solid #e2e8f0;
            }

            /* --- Ô CHỨA MÔN HỌC --- */
            .timetable-cell {
                background-color: #ffffff;
                min-height: 100px;
                vertical-align: top;
                padding: 6px;
                width: auto;
            }

            .timetable-cell-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            /* --- THẺ MÔN HỌC (COMPACT) --- */
            .class-card {
                padding: 8px 10px;
                border-radius: 6px;
                position: relative;
                cursor: pointer;
                transition: all 0.2s ease;
                border-left: 3px solid rgba(0,0,0,0.15);
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                display: block;
                min-height: 85px;
                width: 100%;
            }

            .class-card:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                z-index: 5;
            }

            /* Tên môn học - COMPACT */
            .class-subject {
                font-weight: 700;
                font-size: 13px;
                color: #1e40af;
                margin-bottom: 8px;
                line-height: 1.3;
                word-wrap: break-word;
                display: block;
                text-align: left;
            }

            /* Nhóm thông tin chi tiết - COMPACT */
            .class-info-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%;
            }

            /* Dòng thông tin - COMPACT */
            .class-detail {
                display: flex;
                align-items: baseline;
                justify-content: flex-start;
                font-size: 11px;
                color: #334155;
                gap: 4px;
                width: 100%;
            }
            
            /* Nhãn - COMPACT */
            .class-detail-label {
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                font-size: 10px;
                min-width: 55px;
                flex-shrink: 0;
            }
            
            /* Giá trị - COMPACT */
            .class-detail-value {
                font-weight: 600;
                color: #1e293b;
                font-size: 11px;
                flex: 1;
                word-wrap: break-word;
            }

            /* Nút chỉnh sửa */
            .btn-edit-class {
                position: absolute;
                top: 4px;
                right: 28px;
                width: 20px;
                height: 20px;
                background: white;
                border: 1px solid #cbd5e1;
                color: #6366f1;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: all 0.2s;
                font-size: 11px;
            }

            /* Nút xóa */
            .btn-delete-class {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 20px;
                height: 20px;
                background: white;
                border: 1px solid #fecaca;
                color: #ef4444;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: all 0.2s;
                font-size: 11px;
            }

            .class-card:hover .btn-delete-class,
            .class-card:hover .btn-edit-class { 
                opacity: 1;
            }
            
            .btn-edit-class:hover { 
                background: #6366f1; 
                color: white; 
                border-color: #6366f1;
            }

            .btn-delete-class:hover { 
                background: #ef4444; 
                color: white; 
                border-color: #ef4444;
            }

            /* --- HIGHLIGHT HÔM NAY --- */
            .is-today {
                background-color: #fef3c7 !important;
            }

            .timetable-table thead th.is-today {
                background-color: #f59e0b !important;
            }

            .timetable-table thead th.is-today::after {
                content: "HÔM NAY";
                display: block;
                font-size: 8px;
                font-weight: 700;
                color: #ffffff;
                background: #dc2626;
                padding: 2px 6px;
                border-radius: 8px;
                margin-top: 3px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            /* Animation */
            @keyframes pulse-today {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.95; }
            }

            .timetable-table tbody td.is-today {
                animation: pulse-today 3s ease-in-out infinite;
            }
        `;
        document.head.appendChild(styleTag);
        console.log('✅ Timetable CSS loaded successfully');
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
                console.log(`✅ Timetable loaded: ${this.currentTimetable.length} classes`);
                this.renderTimetable(); // Lọc theo ngày sẽ xử lý trong isClassInWeek()
                this.highlightCurrentDay();
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
                                <th data-day="2">THỨ 2<div class="header-date" id="date-2" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="3">THỨ 3<div class="header-date" id="date-3" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="4">THỨ 4<div class="header-date" id="date-4" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="5">THỨ 5<div class="header-date" id="date-5" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="6">THỨ 6<div class="header-date" id="date-6" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="7">THỨ 7<div class="header-date" id="date-7" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
                                <th data-day="CN">CN<div class="header-date" id="date-CN" style="font-size: 11px; font-weight: normal; color: #6b7280; margin-top: 2px;">--/--</div></th>
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

        sessions.forEach(session => {
            html += '<tr>';

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

                    const isMatch = dayMatch && sessionMatch && weekMatch;

                    // Debug logging for each comparison
                    if (cls) {
                        console.log(`🔍 Checking "${cls.subject}": day=${cls.day} vs ${day} → ${dayMatch ? '✅' : '❌'}, session=${cls.session} vs ${session.id} → ${sessionMatch ? '✅' : '❌'}, week → ${weekMatch ? '✅' : '❌'}`);
                    }

                    return isMatch;
                });

                html += `<td class="timetable-cell">`;

                if (classes.length > 0) {
                    console.log(`📍 Rendering ${classes.length} class(es) for Day ${day}, ${session.label}`);
                    html += '<div class="timetable-cell-content">';
                    classes.forEach(cls => {
                        html += this.renderClassCard(cls);
                        totalClassesRendered++;
                    });
                    html += '</div>';
                } else {
                    // Empty cell - still needs min-height for consistent layout
                    html += '<div class="timetable-cell-content"></div>';
                }

                html += '</td>';
            });

            html += '</tr>';
        });

        tbody.innerHTML = html;

        console.log('✅ Timetable rendered successfully!');
        console.log(`📊 Stats: ${totalClassesRendered} classes rendered out of ${this.currentTimetable.length} in memory`);

        // Verification warning
        if (this.currentTimetable.length > 0 && totalClassesRendered === 0) {
            console.warn('⚠️ WARNING: Classes exist but NONE were rendered!');
            console.warn('🔍 Sample class structure:');
            if (this.currentTimetable[0]) {
                console.log(this.currentTimetable[0]);
            }
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

        // Check if class is currently active
        let isActive = true;
        let statusBadge = '';
        let cardOpacity = '1';

        if (cls.startDate && cls.endDate) {
            const today = new Date();
            const start = new Date(cls.startDate);
            const end = new Date(cls.endDate);

            if (today < start) {
                isActive = false;
                statusBadge = '<span style="display: inline-block; background: #fbbf24; color: #78350f; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 4px;">⏳ Sắp diễn ra</span>';
                cardOpacity = '0.6';
            } else if (today > end) {
                isActive = false;
                statusBadge = '<span style="display: inline-block; background: #d1d5db; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 4px;">✓ Đã kết thúc</span>';
                cardOpacity = '0.5';
            } else {
                statusBadge = '<span style="display: inline-block; background: #34d399; color: #064e3b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 4px;">▶ Đang diễn ra</span>';
            }
        }

        return `
            <div class="class-card" style="background-color: ${bgColor}; opacity: ${cardOpacity};" data-class-id="${classId}">
                <div class="class-subject" title="${this.escapeHtml(cls.subject)}">
                    ${this.escapeHtml(cls.subject)}
                </div>
                
                <div class="class-info-group">
                    <div class="class-detail">
                        <span class="class-detail-label">PHÒNG:</span> 
                        <span class="class-detail-value">${this.escapeHtml(cls.room)}</span>
                    </div>
                    <div class="class-detail">
                        <span class="class-detail-label">CƠ SỞ:</span> 
                        <span class="class-detail-value" style="color: #000;">${this.escapeHtml(cls.campus || 'CS1')}</span>
                    </div>
                    <div class="class-detail">
                        <span class="class-detail-label">GIỜ:</span> 
                        <span class="class-detail-value">${this.escapeHtml(timeRange)}</span>
                    </div>
                    ${cls.dateRangeDisplay ? `
                    <div class="class-detail" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.1);">
                        <span class="class-detail-label">📅 Thời gian:</span> 
                        <span class="class-detail-value" style="font-size: 12px;">${this.escapeHtml(cls.dateRangeDisplay)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${statusBadge ? `<div style="text-align: center; margin-top: 8px;">${statusBadge}</div>` : ''}

                <button class="btn-edit-class" data-class-id="${classId}" title="Sửa môn này">
                   <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>

                <button class="btn-delete-class" data-class-id="${classId}" title="Xóa môn này">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
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
            timeRange
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
        const colMap = { subject: -1, day: -1, period: -1, date: -1, room: -1 };

        // Quét 20 dòng đầu để tìm header
        for (let i = 0; i < Math.min(20, rows.length); i++) {
            const row = rows[i] || [];
            const cells = row.map(c => String(c || '').toLowerCase().trim());

            if (colMap.subject === -1) colMap.subject = cells.findIndex(c => c.includes('tên lhp') || c.includes('môn'));
            if (colMap.day === -1) colMap.day = cells.findIndex(c => c.includes('thứ'));
            if (colMap.period === -1) colMap.period = cells.findIndex(c => c.includes('tiết') || c.includes('giờ'));
            if (colMap.date === -1) colMap.date = cells.findIndex(c => c.includes('ngày') || c.includes('thời gian'));
            if (colMap.room === -1) colMap.room = cells.findIndex(c => c.includes('phòng'));

            // Nếu tìm thấy Tên môn và Thứ thì chốt đây là dòng header
            if (colMap.subject > -1 && colMap.day > -1) { headerRow = i; break; }
        }

        if (headerRow === -1) {
            // Nếu không tìm thấy header, thử gán cứng (Backup cho file của bạn)
            // Dựa trên file bạn gửi: STT(1), Tên(2), GV(3), STC(4), Mã(5), Thứ(6), Tiết(7), Phòng(8), Ngày(9)
            colMap.subject = 2; colMap.day = 6; colMap.period = 7; colMap.room = 8; colMap.date = 9;
            headerRow = 0; // Giả định
        }

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

                importedClasses.push({
                    id: Date.now() + Math.random(), // Tạo ID tạm
                    subject: cleanSubject.trim(),
                    day: day,
                    session: periodInfo.session,
                    startPeriod: periodInfo.startPeriod,
                    numPeriods: periodInfo.numPeriods,
                    room: roomRaw || 'Online',
                    startDate: dateInfo.startDate, // Lưu ngày bắt đầu chuẩn
                    endDate: dateInfo.endDate,     // Lưu ngày kết thúc chuẩn
                    dateRangeDisplay: dateInfo.display,
                    weeks: [], // Để trống, ta dùng logic ngày tháng để lọc
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

    // ==================== ADVANCED PERIOD PARSER ====================
    parseAdvancedPeriod(periodStr) {
        const str = String(periodStr).trim();

        // --- Case 1: Format chứa giờ (VD: "(15h10)->12") ---
        // Regex này bắt: 15h10 hoặc (15h10)
        const timeMatch = str.match(/(\d{1,2})h(\d{2})/);
        // Regex này bắt số sau dấu > hoặc - (VD: >12 hoặc -12)
        const endPeriodMatch = str.match(/[>\-](\d+)/);

        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);

            // Tìm tiết bắt đầu từ giờ
            const startPeriod = this.findPeriodByTime(hour, minute);

            if (startPeriod) {
                let endPeriod = startPeriod;
                if (endPeriodMatch) {
                    endPeriod = parseInt(endPeriodMatch[1]);
                }

                const numPeriods = Math.max(1, endPeriod - startPeriod + 1);

                // Xác định buổi học
                let session = 'morning';
                if (startPeriod > 12) session = 'evening';
                else if (startPeriod > 6) session = 'afternoon';

                return { startPeriod, numPeriods, session };
            }
        }

        // --- Case 2: Format chuẩn số (VD: "1-3" hoặc "10") ---
        const numbers = str.match(/\d+/g);
        if (numbers) {
            const start = parseInt(numbers[0]);
            const end = numbers.length > 1 ? parseInt(numbers[1]) : start;

            return {
                startPeriod: start,
                numPeriods: end - start + 1,
                session: start > 12 ? 'evening' : (start > 6 ? 'afternoon' : 'morning')
            };
        }

        throw new Error(`Không đọc được tiết học: ${periodStr}`);
    },

    // ==================== PARSE NGÀY (CHUẨN PYTHON 100%) ====================
    // Hàm mới để xử lý ngày tháng từ Excel
    parseAdvancedDateRange(dateRangeStr) {
        if (!dateRangeStr) return { startDate: null, endDate: null, display: '' };

        // 1. Vệ sinh chuỗi: Xóa hết chữ cái, xuống dòng, dấu >
        // Input: "19/01/2026-\n>13/04/2026"  =>  Thành: "19/01/2026-13/04/2026"
        const cleanStr = String(dateRangeStr).replace(/[a-zA-Z\n\r\s>]/g, '');

        // 2. Trích xuất ngày theo format dd/mm/yyyy
        const regex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
        const matches = [...cleanStr.matchAll(regex)];

        if (matches.length >= 1) {
            // Helper convert string sang Date object
            const toDate = (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

            const start = toDate(matches[0]);
            // Nếu có 2 ngày thì lấy ngày 2 làm kết thúc, nếu không thì lấy chính ngày đầu
            const end = matches.length > 1 ? toDate(matches[matches.length - 1]) : new Date(start);

            // Set giờ để so sánh chính xác
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            return {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                display: `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
            };
        }
        return { startDate: null, endDate: null, display: '' };
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