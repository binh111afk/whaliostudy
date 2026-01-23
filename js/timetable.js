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

    isClassInWeek(classObj) {
        // CRITICAL FIX: If class has no date range, show it in all weeks (manual classes)
        if (!classObj.startDate || !classObj.endDate) {
            return true;
        }

        if (!this.currentWeekStart) {
            console.warn('⚠️ currentWeekStart is null, showing all classes');
            return true;
        }

        // Calculate week boundaries
        // weekStart: Monday 00:00:00
        // weekEnd: Sunday 23:59:59
        const weekStart = new Date(this.currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const clsStart = new Date(classObj.startDate);
        const clsEnd = new Date(classObj.endDate);

        // STRICT WEEK FILTERING
        // Show class ONLY IF it overlaps with the current week
        // If class ends BEFORE this week starts → HIDE
        // OR class starts AFTER this week ends → HIDE
        if (clsEnd < weekStart || clsStart > weekEnd) {
            return false; // Not in this week
        }

        // Class overlaps with current week
        return true;
    },

    injectStyles() {
        if (document.getElementById('timetable-injected-styles')) return;

        const styleTag = document.createElement('style');
        styleTag.id = 'timetable-injected-styles';
        styleTag.textContent = `
            /* --- 1. CẤU TRÚC BẢNG (KÉO DÃN BỀ NGANG) --- */
            .timetable-wrapper {
                width: 100%;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                overflow-x: auto; /* Thanh cuộn ngang hoạt động ở đây */
                border: 1px solid #e2e8f0;
                margin-bottom: 30px;
                padding-bottom: 5px; /* Để thanh cuộn không dính sát bảng */
            }

            .timetable-table {
                width: 100% !important;
                min-width: 1600px; /* 🔥 ÉP RỘNG RA 1600px: Mỗi cột sẽ rất thoáng */
                table-layout: fixed;
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
            .timetable-table td:last-child { border-right: none; }

            /* --- HEADER --- */
            .timetable-table thead th {
                background-color: #1e293b;
                color: #f8fafc;
                padding: 16px 10px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                position: sticky;
                top: 0;
                z-index: 20;
            }

            /* CỘT SÁNG/CHIỀU */
            .timetable-table .session-col {
                width: 90px;
                background-color: #f8fafc;
                color: #475569;
                font-weight: 800;
                text-align: center;
                vertical-align: middle;
                text-transform: uppercase;
                font-size: 13px;
                position: sticky;
                left: 0;
                z-index: 10;
                border-right: 2px solid #e2e8f0;
                box-shadow: 2px 0 5px rgba(0,0,0,0.05); /* Bóng nhẹ để tách biệt khi cuộn */
            }

            /* --- Ô CHỨA MÔN HỌC --- */
            .timetable-cell {
                background-color: #ffffff;
                min-height: 120px; /* Chiều cao vừa phải */
                vertical-align: top;
                padding: 8px; /* Tăng padding để thẻ không dính lề */
            }

            .timetable-cell-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            /* --- THẺ MÔN HỌC --- */
            .class-card {                 /* <--- THÊM DÒNG NÀY VÀO */
                padding: 12px 3px;       /* Bây giờ padding mới có tác dụng */
                border-radius: 10px;
                position: relative;
                cursor: pointer;
                transition: transform 0.2s;
                border: none; 
                border-left: 4px solid rgba(0,0,0,0.15);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
                background-clip: padding-box;
                
                /* Flexbox để căn giữa tiêu đề */
                display: flex;
                flex-direction: column;
                align-items: center;     
                justify-content: center; 
                text-align: center;      
                min-height: 100px;       
                height: 100%;
            }

            .class-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.1);
                z-index: 5;
            }

            .class-subject {
                font-weight: 900;          /* Đậm nhất có thể */
                font-size: 14px;           /* To hơn chút nữa */
                letter-spacing: 0.5px;     /* Giãn chữ ra một chút cho thoáng */
                margin-bottom: 10px;
                line-height: 1.3;
                width: 100%;
                
                /* 🔥 WOW FACTOR 1: MÀU CHUYỂN SẮC (Xanh đậm -> Tím nhạt) */
                background: linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                
                /* 🔥 WOW FACTOR 2: BÓNG TRẮNG VIỀN MỊN (Giúp chữ nổi lên trên nền màu) */
                filter: drop-shadow(0 2px 0px rgba(255, 255, 255, 0.9));

                /* Logic xuống dòng giữ nguyên */
                white-space: normal;      
                word-wrap: break-word;
            }

            .class-info-group {
                display: flex;
                flex-direction: column;
                align-items: flex-start; /* 🔥 QUAN TRỌNG: Nội dung bên trong căn trái để thẳng hàng */
                width: fit-content;      /* Co lại vừa khít nội dung */
                margin: 5px auto 0;      /* Căn giữa khối này trong thẻ + cách tiêu đề 5px */
                padding: 0 5px;          /* Đệm chút lề 2 bên */
            }

            /* --- DÒNG THÔNG TIN (PHÒNG - GIỜ) --- */
            /* Flexbox giúp Label và Value nằm ngang hàng thẳng tắp */
            .class-detail {
                display: flex; 
                align-items: baseline; 
                justify-content: flex-start; /* 🔥 SỬA LẠI: Bỏ center, dùng flex-start */
                font-size: 15px;             /* 🔥 Tăng cỡ chữ lên cho dễ đọc */
                margin-bottom: 6px;
                color: #334155;
                width: 100%;
            }
            
            /* Nhãn (PHÒNG, GIỜ) */
            .class-detail-label {
                font-weight: 800;
                color: #1e3a8a; /* Xanh đậm */
                text-transform: uppercase;
                font-size: 12px;
                
                /* Cố định chiều rộng nhãn để các dòng thẳng hàng */
                min-width: 65px; 
                margin-right: 4px;
                text-align: left;
            }
            
            /* Nội dung (A234, 06:30...) */
            .class-detail-value {
                font-weight: 600;
                color: #000;
                white-space: nowrap; /* 🔥 QUAN TRỌNG: Cấm xuống dòng */
                font-size: 14px;
            }

            /* Nút xóa */
            .btn-delete-class {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                background: white;
                border: 1px solid #fee2e2;
                color: #ef4444;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: 0.2s;
            }

            .btn-edit-class {
                position: absolute;
                top: 8px;
                right: 38px; /* Nằm bên trái nút xóa (8px + 24px + 6px gap) */
                width: 24px;
                height: 24px;
                background: white;
                border: 1px solid #e0e7ff;
                color: #4f46e5; /* Màu xanh tím */
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0; /* Ẩn mặc định */
                transition: 0.2s;
            }

            .class-card:hover .btn-delete-class,
            .class-card:hover .btn-edit-class { 
                opacity: 1; /* Hiện khi di chuột vào thẻ */
            }
            
            .btn-edit-class:hover { background: #4f46e5; color: white; }

            .class-card:hover .btn-delete-class { opacity: 1; }
            .btn-delete-class:hover { background: #ef4444; color: white; }

            /* --- HIGHLIGHT CURRENT DAY --- */
            .is-today {
                position: relative;
                z-index: 10;
                border: 2px solid #8b5cf6 !important;
            }

            /* Add "Hôm nay" badge to the header of current day */
            .timetable-table thead th.is-today::after {
                content: "Hôm nay";
                display: block;
                font-size: 10px;
                font-weight: 700;
                color: #ffffff;
                background: #8b5cf6;
                padding: 4px 12px;
                border-radius: 12px;
                margin-top: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
            }

            /* Enhance current day cells with subtle animation */
            .timetable-table tbody td.is-today {
                animation: pulse-today 3s ease-in-out infinite;
            }

            
        `;
        document.head.appendChild(styleTag);
        console.log('✅ Đã nạp CSS: Bảng rộng 1600px + Thanh cuộn ngang');
    },

    async loadTimetable() {
        try {
            // CRITICAL FIX: Server expects user.token, not JWT token
            const currentUser = AppState.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
            const username = currentUser.username;

            console.log('🔍 Fetching timetable for user:', username);

            if (!username) {
                console.warn('⚠️ No user logged in, skipping timetable load');
                this.currentTimetable = [];
                this.renderTimetable();
                return;
            }

            // Server uses username to filter timetable, not token-based auth
            const response = await fetch(`/api/timetable?username=${username}`);
            const data = await response.json();

            console.log('📥 Raw Server Data:', data);

            if (data.success) {
                this.currentTimetable = data.timetable || [];
                console.log('✅ Timetable loaded:', this.currentTimetable.length, 'classes');
                console.log('📋 Timetable contents:', this.currentTimetable);
                this.renderTimetable();
                this.highlightCurrentDay();
            } else {
                console.warn('⚠️ Timetable load failed:', data.message);
                this.currentTimetable = [];
                this.renderTimetable();
                this.highlightCurrentDay();
            }
        } catch (error) {
            console.error('❌ Load timetable error:', error);
            this.currentTimetable = [];
            this.renderTimetable();
            this.highlightCurrentDay();
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
        console.log('📝 Opening create class modal');

        this.editingClassId = null;

        const modal = document.getElementById('createClassModal');
        if (!modal) {
            console.error('❌ Modal not found');
            return;
        }

        // Reset form
        document.getElementById('classSubject').value = '';
        document.getElementById('classRoom').value = '';
        document.getElementById('classCampus').value = '';
        document.getElementById('classDay').value = '2';
        document.getElementById('classSession').value = 'morning';
        document.getElementById('classStartPeriod').value = '1';
        document.getElementById('classNumPeriods').value = '2';

        // CRITICAL FIX: Smart date pre-fill based on currently viewed week
        if (this.currentWeekStart) {
            // Calculate Monday and Sunday of the current viewed week
            const monday = new Date(this.currentWeekStart);
            monday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(this.currentWeekStart);
            sunday.setDate(sunday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            // Format dates as YYYY-MM-DD for input[type="date"]
            const formatDateForInput = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const startDateInput = document.getElementById('classStartDate');
            const endDateInput = document.getElementById('classEndDate');
            
            if (startDateInput) {
                startDateInput.value = formatDateForInput(monday);
                console.log('📅 Pre-filled start date:', formatDateForInput(monday));
            }
            
            if (endDateInput) {
                endDateInput.value = formatDateForInput(sunday);
                console.log('📅 Pre-filled end date:', formatDateForInput(sunday));
            }
        } else {
            // Clear date inputs if no week is selected
            const startDateInput = document.getElementById('classStartDate');
            const endDateInput = document.getElementById('classEndDate');
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            console.log('ℹ️ Manual classes will be visible in all weeks (no date range restriction)');
        }

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
        console.log('🔄 Processing Excel data with SMART COLUMN DETECTION...');
        console.log('📊 Total rows:', rows.length);
        
        // ==================== STEP 1: FIND HEADER ROW ====================
        let headerRowIndex = -1;
        const columnMap = {};
        
        // Search for header row in first 10 rows
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            // Check if this row contains header keywords
            const rowString = row.map(cell => String(cell || '').toLowerCase()).join(' ');
            
            if (rowString.includes('mã lhp') || 
                rowString.includes('tên lhp') || 
                rowString.includes('học phần') ||
                (rowString.includes('thứ') && rowString.includes('tiết'))) {
                
                headerRowIndex = i;
                console.log(`✅ Header row found at index ${i}:`, row);
                
                // Map columns based on header keywords
                for (let colIdx = 0; colIdx < row.length; colIdx++) {
                    const header = String(row[colIdx] || '').toLowerCase().trim();
                    
                    // Subject column
                    if (header.includes('tên lhp') || header.includes('tên hp') || 
                        header.includes('học phần') || header.includes('môn học')) {
                        columnMap.subject = colIdx;
                        console.log(`  📌 Subject column: ${colIdx} (${row[colIdx]})`);
                    }
                    // Alternative: Subject code column (Mã LHP)
                    else if (header.includes('mã lhp') || header.includes('mã hp')) {
                        if (!columnMap.subject) { // Use as fallback
                            columnMap.subjectCode = colIdx;
                            console.log(`  📌 Subject Code column: ${colIdx} (${row[colIdx]})`);
                        }
                    }
                    // Day column
                    else if (header.includes('thứ') && !header.includes('thứ tự')) {
                        columnMap.day = colIdx;
                        console.log(`  📌 Day column: ${colIdx} (${row[colIdx]})`);
                    }
                    // Period column
                    else if (header.includes('tiết') || header.includes('giờ học') || header.includes('giờ')) {
                        columnMap.period = colIdx;
                        console.log(`  📌 Period column: ${colIdx} (${row[colIdx]})`);
                    }
                    // Room column
                    else if (header.includes('phòng')) {
                        columnMap.room = colIdx;
                        console.log(`  📌 Room column: ${colIdx} (${row[colIdx]})`);
                    }
                    // Campus/Location column
                    else if (header.includes('cơ sở') || header.includes('địa điểm') || 
                             header.includes('campus') || header.includes('location')) {
                        columnMap.campus = colIdx;
                        console.log(`  📌 Campus column: ${colIdx} (${row[colIdx]})`);
                    }
                    // Date Range column
                    else if (header.includes('từ ngày') || header.includes('đến ngày') || 
                             header.includes('ngày') || header.includes('time') || 
                             header.includes('thời gian')) {
                        columnMap.dateRange = colIdx;
                        console.log(`  📌 Date Range column: ${colIdx} (${row[colIdx]})`);
                    }
                    // STT column
                    else if (header.includes('stt') || header === 'stt') {
                        columnMap.stt = colIdx;
                        console.log(`  📌 STT column: ${colIdx} (${row[colIdx]})`);
                    }
                }
                
                break;
            }
        }
        
        // Validation: Check if essential columns were found
        if (headerRowIndex === -1) {
            this.showError('❌ Không tìm thấy dòng tiêu đề trong file Excel. Vui lòng kiểm tra định dạng!');
            console.error('❌ Header row not found in first 10 rows');
            return;
        }
        
        if (!columnMap.subject && !columnMap.subjectCode) {
            this.showError('❌ Không tìm thấy cột "Tên học phần" hoặc "Mã LHP"');
            console.error('❌ Subject column not found');
            return;
        }
        
        if (columnMap.day === undefined || columnMap.period === undefined) {
            this.showError('❌ Không tìm thấy cột "Thứ" hoặc "Tiết". Vui lòng kiểm tra file!');
            console.error('❌ Day or Period column not found');
            return;
        }
        
        console.log('✅ Column mapping complete:', columnMap);
        
        // ==================== STEP 2: PARSE DATA ROWS ====================
        const importedClasses = [];
        let lastValidSubject = '';
        
        // Start from row after header
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip completely empty rows
            if (!row || row.length === 0 || !row.some(cell => cell && String(cell).trim())) {
                continue;
            }
            
            // Extract data using mapped column indexes
            const subjectRaw = row[columnMap.subject] || row[columnMap.subjectCode] || '';
            const dayRaw = row[columnMap.day] || '';
            const periodRaw = row[columnMap.period] || '';
            const roomRaw = row[columnMap.room] || '';
            const campusRaw = columnMap.campus !== undefined ? (row[columnMap.campus] || '') : '';
            const dateRangeRaw = columnMap.dateRange !== undefined ? (row[columnMap.dateRange] || '') : '';
            
            console.log(`Row ${i}:`, { subjectRaw, dayRaw, periodRaw, roomRaw, campusRaw, dateRangeRaw });
            
            // ===== HANDLE MERGED CELLS: Update lastValidSubject =====
            if (subjectRaw && String(subjectRaw).trim()) {
                const subjectStr = String(subjectRaw).trim();
                
                // Extract subject name (after "-" if exists)
                const dashIndex = subjectStr.indexOf('-');
                if (dashIndex !== -1) {
                    lastValidSubject = subjectStr.substring(dashIndex + 1).trim();
                } else {
                    lastValidSubject = subjectStr;
                }
                console.log(`  ✅ New subject detected: "${lastValidSubject}"`);
            }
            
            // Skip if no period or day data (not a valid class entry)
            if (!periodRaw || !dayRaw) {
                console.log('  ⏭️ Skipping - no period or day data');
                continue;
            }
            
            // Use lastValidSubject if current subject is empty (merged cell)
            const currentSubject = lastValidSubject;
            if (!currentSubject) {
                console.log('  ⏭️ Skipping - no subject available');
                continue;
            }
            
            try {
                // Parse Day: "Thứ Hai" -> "2", "Chủ Nhật" -> "CN"
                const day = this.parseDayString(dayRaw);
                
                // Parse Period: Extract start and end using regex
                const periodInfo = this.parsePeriodString(periodRaw);
                
                // Parse Room - default to "Online" if empty
                const room = (roomRaw && String(roomRaw).trim()) ? String(roomRaw).trim() : 'Online';
                
                // Parse Campus/Location - extract from campus column or detect from room
                let campus = 'CS1'; // Default campus
                if (campusRaw && String(campusRaw).trim()) {
                    campus = String(campusRaw).trim();
                } else if (room && room.toLowerCase().includes('cs')) {
                    // Try to extract campus from room name (e.g., "CS2-A101")
                    const campusMatch = room.match(/cs\d+/i);
                    if (campusMatch) {
                        campus = campusMatch[0].toUpperCase();
                    }
                }
                
                // Parse Date Range
                const dateInfo = this.parseDateRange(dateRangeRaw);
                
                // Use session from period info (already calculated in parsePeriodString)
                const session = periodInfo.session;
                
                // Calculate time range
                const endPeriod = periodInfo.startPeriod + periodInfo.numPeriods - 1;
                const startTime = this.periodTimes[periodInfo.startPeriod]?.start || '00:00';
                const endTime = this.periodTimes[endPeriod]?.end || '23:59';
                const timeRange = `${startTime} - ${endTime}`;
                
                // Create class object
                const classData = {
                    subject: currentSubject,
                    room: room,
                    campus: campus,
                    day: day,
                    session: session,
                    startPeriod: periodInfo.startPeriod,
                    numPeriods: periodInfo.numPeriods,
                    timeRange: timeRange,
                    startDate: dateInfo.startDate,
                    endDate: dateInfo.endDate,
                    dateRangeDisplay: dateInfo.display
                };
                
                // 🔥 DUPLICATION PREVENTION: Check if this class already exists
                const existingIndex = importedClasses.findIndex(existing => 
                    existing.subject === classData.subject &&
                    existing.day === classData.day &&
                    existing.startPeriod === classData.startPeriod
                );
                
                if (existingIndex !== -1) {
                    // Update existing class instead of creating duplicate
                    importedClasses[existingIndex] = classData;
                    console.log('  ⚠️ Duplicate class detected - updating existing entry:', classData.subject);
                } else {
                    // Add new class
                    importedClasses.push(classData);
                    console.log('  ✅ Parsed class:', classData);
                }
                
            } catch (error) {
                console.warn(`  ⚠️ Skipping row ${i} - Parse error:`, error.message);
                continue;
            }
        }
        
        console.log('📦 Total classes parsed:', importedClasses.length);
        
        if (importedClasses.length === 0) {
            this.showError('Không tìm thấy lớp học nào trong file! Vui lòng kiểm tra định dạng.');
            return;
        }
        
        // Store imported data
        this.importedData = importedClasses;
        
        // Show preview
        this.showPreview(importedClasses.length);
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
        // 1. Kiểm tra dữ liệu (Ưu tiên lấy từ màn hình)
        let classesToDelete = [];
        if (this.currentTimetable && this.currentTimetable.length > 0) {
            classesToDelete = [...this.currentTimetable];
        } else if (AppState.currentUser && AppState.currentUser.timetable) {
            classesToDelete = [...AppState.currentUser.timetable];
        }

        // Nếu thực sự trống rỗng thì báo
        if (classesToDelete.length === 0) {
            Swal.fire('Thông báo', 'Thời khóa biểu đã trống sẵn rồi!', 'info');
            return;
        }

        // 2. Hỏi xác nhận
        const result = await Swal.fire({
            title: 'Xóa sạch?',
            text: `Bạn có chắc muốn xóa ${classesToDelete.length} lớp học?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy',
            focusCancel: true
        });

        if (result.isConfirmed) {
            try {
                // 🚀 BƯỚC 1: XÓA GIAO DIỆN & LOCAL (ƯU TIÊN TỐC ĐỘ)
                const username = AppState.currentUser ? AppState.currentUser.username : null;
                
                // Xóa biến hiển thị
                this.currentTimetable = [];
                this.importedData = [];
                
                // Xóa biến trong State & LocalStorage
                if (AppState.currentUser) {
                    AppState.currentUser.timetable = [];
                    // Lưu ngay lập tức để F5 không bị hiện lại
                    await AppState.saveUser(AppState.currentUser); 
                }

                // 🔥 QUAN TRỌNG: Gọi đúng tên hàm renderTimetable (Thay vì render)
                if (typeof this.renderTimetable === 'function') {
                    this.renderTimetable(); 
                } else if (typeof this.render === 'function') {
                    this.render(); // Dự phòng nếu bạn đổi tên
                }

                // Báo thành công ngay
                Swal.fire({
                    icon: 'success',
                    title: 'Đã xóa!',
                    showConfirmButton: false,
                    timer: 1000
                });

                // 🐢 BƯỚC 2: XÓA SERVER (CHẠY NGẦM)
                if (username) {
                    // Thử gọi API xóa nếu backend hỗ trợ
                    // Chúng ta gửi ID của từng lớp lên để xóa
                    classesToDelete.forEach(cls => {
                        if (cls.id) {
                            fetch('/api/timetable/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: username, id: cls.id })
                            }).catch(err => console.warn('Lỗi xóa ngầm:', err));
                        }
                    });
                }

            } catch (error) {
                console.error('Lỗi khi xóa:', error);
                Swal.fire('Lỗi', 'Đã xảy ra lỗi khi xóa (Xem console)', 'error');
            }
        }
    },
};

window.Timetable = Timetable;