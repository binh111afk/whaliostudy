import { AppState } from './state.js';

// ==================== TIMETABLE MODULE ====================
export const Timetable = {
    currentTimetable: [],
    currentCell: null, // {day, session}
    listenersAttached: false,
    editingClassId: null,

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

    async init() {
        console.log('📅 Initializing Timetable...');
        this.injectStyles();
        await this.loadTimetable();
        this.renderTimetable();
        this.setupEventListeners();
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
            const response = await fetch(`http://localhost:3000/api/timetable?username=${username}`);
            const data = await response.json();

            console.log('📥 Raw Server Data:', data);

            if (data.success) {
                this.currentTimetable = data.timetable || [];
                console.log('✅ Timetable loaded:', this.currentTimetable.length, 'classes');
                console.log('📋 Timetable contents:', this.currentTimetable);
                this.renderTimetable();
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
                                <th>Thứ 2</th>
                                <th>Thứ 3</th>
                                <th>Thứ 4</th>
                                <th>Thứ 5</th>
                                <th>Thứ 6</th>
                                <th>Thứ 7</th>
                                <th>CN</th>
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
                // Filter classes for this cell using strict string comparison
                const classes = this.currentTimetable.filter(cls => {
                    const dayMatch = String(cls.day) === String(day);

                    // Check if session matches ID or any alias (case-insensitive)
                    const sessionLower = String(cls.session || '').toLowerCase();
                    const sessionMatch = session.id === sessionLower || session.aliases.includes(sessionLower);

                    const isMatch = dayMatch && sessionMatch;

                    // Debug logging for each comparison
                    if (cls) {
                        console.log(`🔍 Checking "${cls.subject}": day=${cls.day} vs ${day} → ${dayMatch ? '✅' : '❌'}, session=${cls.session} vs ${session.id} → ${sessionMatch ? '✅' : '❌'}`);
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
                            <th>Thứ 2</th>
                            <th>Thứ 3</th>
                            <th>Thứ 4</th>
                            <th>Thứ 5</th>
                            <th>Thứ 6</th>
                            <th>Thứ 7</th>
                            <th>CN</th>
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
        
        return `
            <div class="class-card" style="background-color: ${bgColor};" data-class-id="${cls.id}">
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
                        <span class="class-detail-value">${this.escapeHtml(cls.timeRange)}</span>
                    </div>
                </div>

                <button class="btn-edit-class" data-class-id="${cls.id}" title="Sửa môn này">
                   <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>

                <button class="btn-delete-class" data-class-id="${cls.id}" title="Xóa môn này">
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
            // Add class button (main header button)
            if (e.target.closest('.btn-add-class')) {
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
        const cls = this.currentTimetable.find(c => String(c.id) === String(classId));
        if (!cls) return;

        this.editingClassId = classId; // Đánh dấu là đang sửa

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
                alert('❌ Vui lòng đăng nhập để sử dụng tính năng này!');
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
            alert('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (numPeriods < 1 || numPeriods > 5) {
            alert('Số tiết phải từ 1 đến 5!');
            return;
        }

        const endPeriod = startPeriod + numPeriods - 1;
        if (endPeriod > 15) {
            alert('Vượt quá tiết 15! Vui lòng điều chỉnh lại.');
            return;
        }

        const startTime = this.periodTimes[startPeriod].start;
        const endTime = this.periodTimes[endPeriod].end;
        const timeRange = `${startTime} - ${endTime}`;

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

        // 👇👇👇 PHẦN QUAN TRỌNG NHẤT: CHỌN API ĐÚNG 👇👇👇
        let url = 'http://localhost:3000/api/timetable'; // Mặc định là TẠO MỚI

        // Nếu đang có ID sửa, chuyển sang API UPDATE
        if (this.editingClassId) {
            console.log('✏️ Detected Edit Mode for ID:', this.editingClassId);
            url = 'http://localhost:3000/api/timetable/update';
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
                this.closeCreateModal();    // Đóng modal
                
                // Reset trạng thái sửa
                this.editingClassId = null; 
                
                alert(this.editingClassId ? '✅ Cập nhật thành công!' : '✅ Thêm lớp học thành công!');
            } else {
                alert('❌ ' + (data.message || 'Thao tác thất bại!'));
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            alert('❌ Lỗi kết nối server!');
        }
    },

    async deleteClass(classId) {
        if (!confirm('Bạn chắc chắn muốn xóa lớp học này?')) return;

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
            alert('Vui lòng đăng nhập để sử dụng tính năng này!');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/timetable/delete', {
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
            } else {
                if (data.message && (
                    data.message.includes('User not found') ||
                    data.message.includes('người dùng') ||
                    data.message.includes('Unauthorized') ||
                    data.message.includes('không tìm thấy')
                )) {
                    alert('⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                    localStorage.clear();
                    location.reload();
                    return;
                }
                alert(data.message || 'Xóa lớp học thất bại!');
            }
        } catch (error) {
            console.error('❌ Delete class error:', error);
            alert('Lỗi khi xóa lớp học!');
        }
    },

    closeCreateModal() {
        const modal = document.getElementById('createClassModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }
};