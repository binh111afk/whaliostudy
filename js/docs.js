import { CONFIG, Utils } from './config.js';
import { AppState } from './state.js';
import {
    ICON_USER, ICON_CALENDAR, ICON_DATABASE,
    ICON_EYE, ICON_EDIT, ICON_BOOKMARK_FILLED,
    ICON_BOOKMARK_OUTLINE, ICON_DOWNLOAD, ICON_TRASH
} from './icons.js';

// ==================== SUBJECT TO COURSE MAPPING ====================
const SUBJECT_TO_COURSE_MAP = {
    'Pháp luật đại cương': 10,
    'Tâm lý học đại cương': 11,
    'Tâm lý học Đại cương': 11,
    'Cơ sở toán trong CNTT': 1,
    'Toán rời rạc': 2,
    'Giải tích 1': 1,
    'Đại số tuyến tính': 2,
    'Vật lý 1': 3,
    'Hóa học': 4,
    'Tiếng Anh': 5,
    'Lập trình C++': 6,
    'Cơ sở dữ liệu': 7,
    'Web Development': 8,
    'Triết học Mác Lenin': 9
};

// ==================== SUBJECT LIST FOR DROPDOWN ====================
const SUBJECT_LIST = [
    { id: 'all', name: 'Tất cả môn học' },
    { id: 1, name: 'Cơ sở toán trong CNTT' },
    { id: 2, name: 'Tâm lý học đại cương' },
    { id: 3, name: 'Kinh tế chính trị' },
    { id: 4, name: 'Chủ nghĩa xã hội' },
    { id: 5, name: 'Tâm lý học giáo dục' },
    { id: 6, name: 'Lập trình C++' },
    { id: 7, name: 'Toán rời rạc' },
    { id: 8, name: 'Xác suất thống kê' },
    { id: 9, name: 'Triết học Mác Lenin' },
    { id: 10, name: 'Pháp luật đại cương' },
    { id: 11, name: 'Quân sự' },
    { id: 'other', name: 'Khác' }
];

// ==================== DOCUMENT MANAGER ====================
export const DocumentManager = {
    pendingDocId: null,
    pendingDocUser: null,
    currentMode: 'normal',
    pagination: { currentPage: 1, itemsPerPage: 9 },
    currentFilteredDocs: [],
    editingDocId: null,
    currentCourseFilter: 'all',
    selectedSubject: { id: 'all', name: 'Tất cả môn học' },
    isDropdownOpen: false,

    // Toggle dropdown visibility
    toggleCourseDropdown(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Get the button that was clicked - support both desktop and mobile buttons
        let btn = null;
        if (event && event.target) {
            btn = event.target.closest('.course-dropdown-btn') || 
                  event.target.closest('.filter-chip.has-dropdown');
        }
        if (!btn) {
            btn = document.getElementById('courseDropdownBtn');
        }
        
        if (!btn) return;

        // Find the dropdown menu - check multiple container types
        const container = btn.closest('.course-dropdown-container') || 
                          btn.closest('.filter-chip-dropdown');
        if (!container) return;
        
        const dropdown = container.querySelector('.course-dropdown-menu');
        if (!dropdown) return;

        // Toggle state
        const isCurrentlyOpen = dropdown.classList.contains('active');
        
        // Close all dropdowns first
        document.querySelectorAll('.course-dropdown-menu').forEach(d => {
            d.style.display = 'none';
            d.classList.remove('active');
        });
        document.querySelectorAll('.course-dropdown-btn, .filter-chip.has-dropdown').forEach(b => {
            b.classList.remove('active');
        });

        // If it was closed, open it
        if (!isCurrentlyOpen) {
            // Ensure dropdown items are rendered
            this.renderCourseDropdown();
            
            dropdown.style.display = 'block';
            dropdown.classList.add('active');
            btn.classList.add('active');
            this.isDropdownOpen = true;

            // Focus search input
            const searchInput = dropdown.querySelector('.course-search-input');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        } else {
            this.isDropdownOpen = false;
        }
    },

    // Close dropdown when clicking outside
    setupDropdownListeners() {
        document.addEventListener('click', (e) => {
            // Handle course dropdowns
            const dropdowns = document.querySelectorAll('.course-dropdown-menu');
            const buttons = document.querySelectorAll('.course-dropdown-btn, .filter-chip.has-dropdown');

            // Check if click is outside all dropdowns and buttons
            let clickedInside = false;
            dropdowns.forEach(dropdown => {
                if (dropdown.contains(e.target)) clickedInside = true;
            });
            buttons.forEach(btn => {
                if (btn.contains(e.target)) clickedInside = true;
            });

            if (!clickedInside && this.isDropdownOpen) {
                this.isDropdownOpen = false;
                dropdowns.forEach(dropdown => {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('active');
                });
                buttons.forEach(btn => {
                    btn.classList.remove('active');
                });
            }

            // Handle mobile card dropdowns
            const cardDropdowns = document.querySelectorAll('.doc-card-dropdown');
            const cardMenuBtns = document.querySelectorAll('.doc-card-more-btn');
            
            let clickedInsideCard = false;
            cardDropdowns.forEach(dropdown => {
                if (dropdown.contains(e.target)) clickedInsideCard = true;
            });
            cardMenuBtns.forEach(btn => {
                if (btn.contains(e.target)) clickedInsideCard = true;
            });

            if (!clickedInsideCard) {
                this.closeAllDropdowns();
            }
        });
    },

    // Filter dropdown items based on search input
    searchCourseDropdown(searchTerm, event) {
        // Get the dropdown container from the search input
        const searchInput = event?.target || document.activeElement;
        const container = searchInput?.closest('.course-dropdown-container');
        const items = container?.querySelectorAll('.course-dropdown-item') ||
            document.querySelectorAll('.course-dropdown-item');

        const term = searchTerm.toLowerCase().trim();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    // Select course from dropdown
    selectCourseFromDropdown(courseId, courseName, event) {
        this.selectedSubject = { id: courseId, name: courseName };

        // Get the clicked item's container - support both desktop and mobile
        const item = event?.target?.closest('.course-dropdown-item');
        const container = item?.closest('.course-dropdown-container') || 
                          item?.closest('.filter-chip-dropdown');
        const btn = container?.querySelector('.course-dropdown-btn') ||
                    container?.querySelector('.filter-chip.has-dropdown');
        const dropdown = container?.querySelector('.course-dropdown-menu');

        // Update button text
        if (btn) {
            const textSpan = btn.querySelector('.dropdown-btn-text') || btn.querySelector('.chip-text');
            if (textSpan) {
                textSpan.textContent = courseName;
            }
        }

        // Close dropdown
        this.isDropdownOpen = false;
        if (dropdown) {
            dropdown.style.display = 'none';
            dropdown.classList.remove('active');
        }
        if (btn) {
            btn.classList.remove('active');
        }

        // Clear search
        const searchInput = container?.querySelector('.course-search-input');
        if (searchInput) {
            searchInput.value = '';
            this.searchCourseDropdown('', { target: searchInput });
        }

        // Trigger filter
        this.filterDocsByCourse(courseId);
    },

    // Render dropdown items
    renderCourseDropdown() {
        const containers = document.querySelectorAll('.course-dropdown-items');
        if (!containers.length) return;

        const html = SUBJECT_LIST.map(subject => `
            <div class="course-dropdown-item" 
                 onclick="DocumentManager.selectCourseFromDropdown('${subject.id}', '${subject.name}', event)">
                <span class="dropdown-item-text">${subject.name}</span>
            </div>
        `).join('');

        // Render to all dropdown containers
        containers.forEach(container => {
            container.innerHTML = html;
        });
    },

    async loadAllDocuments() {
        if (AppState.isLoading) {
            console.log('⏳ Already loading documents, skipping...');
            return;
        }
        AppState.isLoading = true;
        console.log('📥 Loading documents...');
        try {
            const response = await fetch(CONFIG.API_ENDPOINTS.DOCUMENTS);
            AppState.allDocuments = await response.json();

            if (AppState.isViewingSaved) {
                this.currentFilteredDocs = AppState.allDocuments.filter(doc =>
                    AppState.currentUser?.savedDocs?.includes(doc.id)
                );
            } else {
                this.currentFilteredDocs = AppState.allDocuments.filter(doc => doc.visibility !== 'private');
            }

            this.pagination.currentPage = 1;
            this.renderPagedDocuments();
            this.updateStats();
        } catch (error) {
            console.error('❌ Load documents error:', error);
            // Show empty state on error
            this.currentFilteredDocs = [];
            this.renderPagedDocuments();
        } finally {
            AppState.isLoading = false;
            console.log(`✅ Documents loaded: ${AppState.allDocuments.length} total`);
        }
    },

    async loadCourses() {
        try {
            AppState.allCourses = [
                { id: 1, name: "Cơ sở toán trong CNTT", code: "Cơ sở toán" },
                { id: 2, name: "Tâm lý học đại cương", code: "Tâm lý học đại cương" },
                { id: 3, name: "Kinh tế chính trị", code: "Kinh tế chính trị" },
                { id: 4, name: "Chủ nghĩa xã hội", code: "Chủ nghĩa xã hội" },
                { id: 5, name: "Tâm lý học giáo dục", code: "Tâm lý học giáo dục" },
                { id: 6, name: "Lập trình C++", code: "Lập trình C++" },
                { id: 7, name: "Toán rời rạc", code: "Toán rời rạc" },
                { id: 8, name: "Xác suất thống kê", code: "Xác suất thống kê" },
                { id: 9, name: "Triết học Mác Lenin", code: "Triết học Mác Lenin" },
                { id: 10, name: "Pháp luật đại cương", code: "Pháp luật đại cương" },
                { id: 11, name: "Quân sự", code: "Quân sự" }
            ];
            this.populateCourseDropdown();
        } catch (error) {
            console.error('Load courses error:', error);
        }
    },

    populateCourseDropdown() {
        const courseSelect = document.getElementById('docCourse');
        if (!courseSelect) return;

        courseSelect.innerHTML = '<option value="">-- Chọn môn --</option>';

        AppState.allCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'Tài liệu khác';
        courseSelect.appendChild(otherOption);
    },

    renderPagedDocuments() {
        let containerId = 'documents-list-container';
        let paginationId = 'pagination-container';

        if (this.currentMode === 'library') {
            containerId = 'library-grid-container';
            paginationId = 'library-pagination';
            this.pagination.itemsPerPage = 9;
        } else {
            this.pagination.itemsPerPage = 8;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('⚠️ Container not found:', containerId);
            return;
        }

        // If no documents loaded yet and not currently loading, retry
        if (AppState.allDocuments.length === 0 && !AppState.isLoading) {
            console.log('⚠️ No documents loaded, retrying...');
            setTimeout(() => this.loadAllDocuments(), 500);
        }

        const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
        const end = start + this.pagination.itemsPerPage;
        const docsToShow = this.currentFilteredDocs.slice(start, end);

        if (docsToShow.length === 0) {
            const icon = AppState.isViewingSaved ? '📭' : (AppState.isLoading ? '⏳' : '📂');
            const msg = AppState.isViewingSaved
                ? 'Bạn chưa lưu tài liệu nào!'
                : (AppState.isLoading ? 'Đang tải tài liệu...' : 'Chưa có tài liệu nào! Hãy tải lên tài liệu đầu tiên.');
            this.renderEmptyState(msg, icon, container);
            const pageContainer = document.getElementById(paginationId);
            if (pageContainer) pageContainer.innerHTML = '';
            return;
        }

        console.log(`📄 Rendering ${docsToShow.length} documents (page ${this.pagination.currentPage})`);
        container.innerHTML = this.generateCardsHTML(docsToShow);

        if (this.currentMode === 'library') {
            this.renderPaginationControl(paginationId);
        } else {
            const pageContainer = document.getElementById(paginationId);
            if (pageContainer && this.currentFilteredDocs.length > this.pagination.itemsPerPage) {
                this.renderPaginationControl(paginationId);
            } else if (pageContainer) {
                pageContainer.innerHTML = '';
            }
        }
    },

    generateCardsHTML(docs) {
        const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
        const currentUsername = AppState.currentUser ? AppState.currentUser.username : "";
        const savedList = AppState.currentUser?.savedDocs || [];

        return docs.map(doc => {
            const isSaved = savedList.includes(doc.id);
            const fileType = Utils.getFileType(doc.type);
            const uploadDate = doc.time ? `${doc.date} ${doc.time}` : doc.date;

            // --- 🛠️ XỬ LÝ LINK THÔNG MINH ---
            const extension = doc.path.substring(doc.path.lastIndexOf('.')).toLowerCase();

            // 1. Xử lý Link XEM (Preview)
            let viewUrl = doc.path;
            // Nếu là file Office (Word, Excel, PowerPoint) -> Dùng Google/Microsoft Viewer để xem online
            if (['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].includes(extension)) {
                viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.path)}`;
            }

            // 2. Xử lý Link TẢI (Download)
            // Vì Server đã fix lỗi lưu tên file, ta dùng link gốc để tránh lỗi 400 với file Raw
            let downloadUrl = doc.path;

            // ---------------------------------

            let visibilityIcon = '';
            if (doc.visibility === 'private') {
                visibilityIcon = `<span title="Riêng tư" style="font-size: 12px; margin-left: 6px; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px;">🔒 Riêng tư</span>`;
            } else {
                visibilityIcon = `<span title="Công khai" style="font-size: 12px; margin-left: 6px; background: #ecfdf5; color: #10b981; padding: 2px 6px; border-radius: 4px;">🌐</span>`;
            }

            let courseName = '';
            let courseCode = '';
            if (doc.course && doc.course !== 'other') {
                const course = AppState.allCourses.find(c => c.id == doc.course);
                if (course) {
                    courseName = course.name;
                    courseCode = course.code;
                }
            }
            if (!courseName) {
                courseName = 'Tài liệu khác';
                courseCode = 'OTHER';
            }

            let canEdit = false;
            if (isAdmin) {
                canEdit = true;
            } else if (doc.uploaderUsername) {
                canEdit = doc.uploaderUsername === currentUsername;
            } else {
                canEdit = doc.uploader === AppState.currentUser?.fullName;
            }

            const editBtn = canEdit ? `
                <button class="doc-card-btn btn-edit-card" onclick="event.stopPropagation(); DocumentManager.openEditModal('${doc.id}')" title="Sửa thông tin">
                    ${ICON_EDIT}
                    <span>Sửa</span>
                </button>
            ` : '';

            let canDelete = false;
            if (isAdmin) {
                canDelete = true;
            } else if (doc.uploaderUsername) {
                canDelete = doc.uploaderUsername === currentUsername;
            } else {
                canDelete = doc.uploader === AppState.currentUser?.fullName;
            }

            const deleteBtn = canDelete ? ` 
                <button class="admin-delete-btn" 
                        onclick="event.stopPropagation(); DocumentManager.openDeleteModal('${doc.id}', '${currentUsername}')" 
                        title="Xóa vĩnh viễn">
                    ${ICON_TRASH}
                </button>
            ` : '';

            // Mobile 3-dot menu items
            const mobileMenuItems = [];
            if (canEdit) {
                mobileMenuItems.push(`
                    <button class="doc-card-dropdown-item" onclick="event.stopPropagation(); DocumentManager.closeAllDropdowns(); DocumentManager.openEditModal('${doc.id}')">
                        ${ICON_EDIT}
                        <span>Sửa thông tin</span>
                    </button>
                `);
            }
            mobileMenuItems.push(`
                <button class="doc-card-dropdown-item" onclick="event.stopPropagation(); DocumentManager.closeAllDropdowns(); DocumentManager.toggleSave('${doc.id}')">
                    ${isSaved ? ICON_BOOKMARK_FILLED : ICON_BOOKMARK_OUTLINE}
                    <span>${isSaved ? 'Bỏ lưu' : 'Lưu tài liệu'}</span>
                </button>
            `);
            if (canDelete) {
                mobileMenuItems.push(`
                    <button class="doc-card-dropdown-item danger" onclick="event.stopPropagation(); DocumentManager.closeAllDropdowns(); DocumentManager.openDeleteModal('${doc.id}', '${currentUsername}')">
                        ${ICON_TRASH}
                        <span>Xóa tài liệu</span>
                    </button>
                `);
            }

            const mobileMoreMenu = `
                <div class="doc-card-more-menu">
                    <button class="doc-card-more-btn" onclick="event.stopPropagation(); DocumentManager.toggleCardDropdown(this)" title="Thêm tùy chọn">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                        </svg>
                    </button>
                    <div class="doc-card-dropdown">
                        ${mobileMenuItems.join('')}
                    </div>
                </div>
            `;

            // 👇 CẬP NHẬT: Dùng viewUrl (đã bọc Viewer) và downloadUrl (link gốc)
            return `
                <div class="doc-card" data-id="${doc.id}" onclick="window.open('${viewUrl}', '_blank')">
                    ${deleteBtn}
                    <div class="doc-card-header">
                        <div class="doc-card-icon ${fileType.class}" style="background-color: ${fileType.color}20; color: ${fileType.color}">
                            ${fileType.text}
                        </div>
                        <div class="doc-card-info">
                            <h3 title="${Utils.escapeHtml(doc.name)}">${Utils.escapeHtml(doc.name)}</h3>
                            <div class="doc-uploader">
                                ${ICON_USER}
                                ${Utils.escapeHtml(doc.uploader)}
                            </div>
                            <div class="doc-course-badge" title="${Utils.escapeHtml(courseName)}">
                                <span class="course-code">${courseCode}</span>
                            </div>
                        </div>
                        ${mobileMoreMenu}
                    </div>
                    <div class="doc-card-body">
                        <div class="doc-meta-info">
                            <div class="doc-meta-item">
                                ${ICON_CALENDAR}
                                ${uploadDate}
                            </div>
                            ${doc.size ? `<div class="doc-meta-item">
                                ${ICON_DATABASE}
                                ${Utils.formatFileSize(doc.size)}</div>` : ''}
                        </div>
                        <div class="doc-card-actions">
                            <button class="doc-card-btn btn-view" onclick="event.stopPropagation(); window.open('${viewUrl}', '_blank')">
                                ${ICON_EYE}
                                <span>Xem</span>
                            </button>
                            ${editBtn}
                            <button class="doc-card-btn btn-save-card ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); DocumentManager.toggleSave('${doc.id}')">
                                ${isSaved ? ICON_BOOKMARK_FILLED : ICON_BOOKMARK_OUTLINE}
                            </button>
                            <a href="${downloadUrl}" class="doc-card-btn btn-download-card" onclick="event.stopPropagation(); DocumentManager.trackDownload('${doc.id}')">
                                ${ICON_DOWNLOAD}
                                <span>Tải</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Toggle mobile card dropdown menu
    toggleCardDropdown(btn) {
        const dropdown = btn.nextElementSibling;
        const isActive = dropdown.classList.contains('active');
        
        // Close all other dropdowns first
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        if (!isActive) {
            dropdown.classList.add('active');
        }
    },

    // Close all card dropdown menus
    closeAllDropdowns() {
        document.querySelectorAll('.doc-card-dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    },

    openDeleteModal(docId, username) {
        // 1. Tìm tài liệu để xác minh quyền sở hữu
        const doc = AppState.allDocuments.find(d => d.id === docId);

        if (!doc) {
            Utils.showAlert("Lỗi", "Không tìm thấy tài liệu!", false);
            return;
        }

        const currentUser = AppState.currentUser;
        if (!currentUser) {
            Utils.showAlert("Lỗi", "Vui lòng đăng nhập!", false);
            return;
        }

        // 2. Kiểm tra quyền: Là Admin HOẶC là người đăng (Owner)
        const isAdmin = currentUser.role === 'admin';

        // Logic so sánh chủ sở hữu (giống như lúc hiển thị nút xóa)
        let isOwner = false;
        if (doc.uploaderUsername) {
            isOwner = doc.uploaderUsername === currentUser.username;
        } else {
            // Hỗ trợ tài liệu cũ chưa có username
            isOwner = doc.uploader === currentUser.fullName;
        }

        // 👇 NẾU KHÔNG PHẢI ADMIN VÀ KHÔNG PHẢI CHỦ FILE THÌ MỚI CHẶN
        if (!isAdmin && !isOwner) {
            Utils.showAlert("Lỗi", "Bạn chỉ có thể xóa tài liệu do chính mình đăng!", false);
            return;
        }

        // 3. Nếu qua được bước trên thì mở Modal
        this.pendingDocId = docId;
        this.pendingDocUser = username; // username này lấy từ tham số truyền vào

        const modal = document.getElementById('deleteDocConfirmModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // Đảm bảo modal hiện lên
        } else {
            console.error("Lỗi: Không tìm thấy Modal deleteDocConfirmModal");
        }
    },

    closeDeleteModal() {
        this.pendingDocId = null;
        this.pendingDocUser = null;

        const modal = document.getElementById('deleteDocConfirmModal');
        if (modal) modal.classList.remove('active');
    },

    async confirmDeleteAction() {
        if (!this.pendingDocId) {
            this.closeDeleteModal();
            return;
        }

        const modal = document.getElementById('deleteDocConfirmModal');
        const buttons = modal ? modal.querySelectorAll('button') : [];
        const btnDelete = buttons.length > 0 ? buttons[buttons.length - 1] : null;

        const originalText = btnDelete ? btnDelete.textContent : "Xóa ngay";

        if (btnDelete) {
            btnDelete.textContent = "Đang xóa...";
            btnDelete.disabled = true;
        }

        try {
            const response = await fetch('/api/delete-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId: this.pendingDocId, username: this.pendingDocUser })
            });
            const result = await response.json();

            if (result.success) {
                this.closeDeleteModal();
                await this.loadAllDocuments();
                this.updateStats();
                if (document.getElementById('profile-section').style.display !== 'none') {
                    if (ProfileManager && ProfileManager.renderMyDocs) {
                        ProfileManager.renderMyDocs();
                    }
                }
                Utils.showAlert("Đã xóa", "Tài liệu đã bị xóa vĩnh viễn! 🗑️", true);
            } else {
                alert("❌ Lỗi: " + result.message);
                this.closeDeleteModal();
            }
        } catch (error) {
            alert("Lỗi kết nối Server!");
            this.closeDeleteModal();
        } finally {
            if (btnDelete) {
                btnDelete.textContent = originalText;
                btnDelete.disabled = false;
            }
        }
    },

    openEditModal(docId) {
        const doc = AppState.allDocuments.find(d => d.id === docId);
        if (!doc) {
            Utils.showAlert("Lỗi", "Không tìm thấy tài liệu!", false);
            return;
        }

        const currentUser = AppState.currentUser;
        if (!currentUser) return;

        // 👇 CẬP NHẬT LOGIC KIỂM TRA QUYỀN (Đồng bộ với bên trên)
        const isAdmin = currentUser.role === 'admin';
        let isOwner = false;

        if (doc.uploaderUsername) {
            isOwner = doc.uploaderUsername === currentUser.username;
        } else {
            isOwner = doc.uploader === currentUser.fullName;
        }

        if (!isAdmin && !isOwner) {
            Utils.showAlert("Lỗi", "Bạn không có quyền sửa tài liệu này!", false);
            return;
        }

        this.editingDocId = docId;
        document.getElementById('editDocName').value = doc.name;
        document.getElementById('editDocCourse').value = doc.course || '';

        const visSelect = document.getElementById('editDocVisibility');
        if (visSelect) visSelect.value = doc.visibility || 'public';

        this.populateEditCourseDropdown();

        const modal = document.getElementById('editDocModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // 👇 THÊM DÒNG NÀY để hiện modal
        }
    },

    closeEditModal() {
        this.editingDocId = null;
        const modal = document.getElementById('editDocModal');
        if (modal) modal.classList.remove('active');
    },

    populateEditCourseDropdown() {
        const courseSelect = document.getElementById('editDocCourse');
        if (!courseSelect) return;

        courseSelect.innerHTML = '<option value="">-- Chọn môn --</option>';

        AppState.allCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'Tài liệu khác';
        courseSelect.appendChild(otherOption);
    },

    async handleEditDocument(event) {
        event.preventDefault();

        if (!this.editingDocId) {
            Utils.showAlert("Lỗi", "Không tìm thấy tài liệu cần sửa!", false);
            return;
        }

        // 🔒 RE-VERIFY PERMISSIONS BEFORE SUBMITTING
        const doc = AppState.allDocuments.find(d => d.id === this.editingDocId);
        const currentUser = AppState.currentUser;

        if (!doc || !currentUser) {
            Utils.showAlert("Lỗi", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", false);
            this.closeEditModal();
            return;
        }

        // Check if user has permission (admin OR owner)
        const isAdmin = currentUser.role === 'admin';
        let isOwner = false;

        if (doc.uploaderUsername) {
            isOwner = doc.uploaderUsername === currentUser.username;
        } else {
            // Legacy support: match by display name
            isOwner = doc.uploader === currentUser.fullName;
        }

        if (!isAdmin && !isOwner) {
            Utils.showAlert("Lỗi", "⛔ Bạn không có quyền sửa tài liệu này!", false);
            this.closeEditModal();
            return;
        }

        const newName = document.getElementById('editDocName').value.trim();
        const newCourse = document.getElementById('editDocCourse').value;
        const visSelect = document.getElementById('editDocVisibility');
        const newVisibility = visSelect ? visSelect.value : 'public';

        if (!newName) {
            Utils.showAlert("Lỗi", "Tên tài liệu không được trống!", false);
            return;
        }

        const btn = event.target.querySelector('button[type="submit"]');
        Utils.setButtonLoading(btn, true);

        try {
            const response = await fetch('/api/update-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId: this.editingDocId,
                    name: newName,
                    course: newCourse,
                    visibility: newVisibility,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();

            // 🔒 Handle 403 Forbidden (permission denied)
            if (response.status === 403) {
                Utils.showAlert("Lỗi", "⛔ " + (result.message || "Bạn không có quyền sửa tài liệu này!"), false);
                this.closeEditModal();
                return;
            }

            if (result.success) {
                const doc = AppState.allDocuments.find(d => d.id === this.editingDocId);
                if (doc) {
                    doc.name = newName;
                    doc.course = newCourse;
                    doc.visibility = newVisibility;
                }

                Utils.showAlert("Thành công!", "Cập nhật tài liệu thành công!", true);
                this.closeEditModal();
                this.loadAllDocuments();
            } else {
                Utils.showAlert("Lỗi", result.message || "Không thể cập nhật tài liệu!", false);
            }
        } catch (error) {
            console.error('Edit document error:', error);
            Utils.showAlert("Lỗi", "Lỗi kết nối server!", false);
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async uploadDocument(formData) {
        try {
            const response = await fetch('/api/upload-document', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Upload document error:', error);
            return { success: false, message: 'Lỗi kết nối server' };
        }
    },

    // ... Bên trong DocumentManager ...

    // 👇 HÀM MỚI: Xử lý sự kiện Upload (Hiện popup, đóng modal, load lại trang)
    async handleUploadSubmit(event) {
        event.preventDefault(); // Chặn trang web bị load lại

        // 1. Hiệu ứng nút bấm "Đang tải..."
        const form = event.target;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        if (btn) {
            btn.textContent = 'Đang tải lên...';
            btn.disabled = true;
        }

        try {
            // 2. Lấy dữ liệu từ form
            const formData = new FormData(form);

            // Đảm bảo có username
            if (AppState.currentUser && !formData.has('username')) {
                formData.append('username', AppState.currentUser.username);
                formData.append('uploader', AppState.currentUser.fullName);
            }

            // 3. Gọi hàm uploadDocument (Logic ngầm)
            const result = await this.uploadDocument(formData);

            // 4. KIỂM TRA & HIỆN POP-UP
            if (result.success) {
                // 🎉 ĐÂY RỒI! POP-UP CỦA BẠN ĐÂY
                Utils.showAlert("Thành công!", "Tài liệu đã được tải lên thành công.", true);

                // Reset form cho sạch
                form.reset();

                // Đóng Modal (Nếu có ModalManager)
                if (window.ModalManager) {
                    window.ModalManager.close('uploadDocModal'); // Hoặc ID modal upload của bạn
                } else {
                    // Fallback: Tự tìm và đóng nếu không có Manager
                    const modal = document.getElementById('uploadDocModal');
                    if (modal) modal.classList.remove('active');
                }

                // Tải lại danh sách tài liệu
                await this.loadAllDocuments();
                this.updateStats();
            } else {
                Utils.showAlert("Lỗi", result.message || "Không thể tải tài liệu lên!", false);
            }
        } catch (error) {
            console.error(error);
            Utils.showAlert("Lỗi", "Lỗi kết nối server!", false);
        } finally {
            // 5. Trả lại nút bấm như cũ
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    },

    renderEmptyState(message, icon, container) {
        container.innerHTML = `
            <div class="docs-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;">
                <div class="icon" style="font-size: 40px; margin-bottom: 10px;">${icon}</div>
                <h3 style="font-size: 16px; font-weight: 600;">${message}</h3>
                ${!AppState.isViewingSaved ?
                `<button class="btn-upload-header" onclick="ModalManager.open('uploadDoc')" style="margin-top: 15px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Tải tài liệu lên</button>` : ''}
            </div>
        `;
    },

    renderPaginationControl(targetId) {
        const container = document.getElementById(targetId);
        if (!container) return;
        const totalPages = Math.ceil(this.currentFilteredDocs.length / this.pagination.itemsPerPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = '';
        html += `<button class="page-btn ${this.pagination.currentPage === 1 ? 'disabled' : ''}" onclick="DocumentManager.changePage(${this.pagination.currentPage - 1})">❮</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${this.pagination.currentPage === i ? 'active' : ''}" onclick="DocumentManager.changePage(${i})">${i}</button>`;
        }
        html += `<button class="page-btn ${this.pagination.currentPage === totalPages ? 'disabled' : ''}" onclick="DocumentManager.changePage(${this.pagination.currentPage + 1})">❯</button>`;
        container.innerHTML = html;
    },

    changePage(pageNum) {
        const totalPages = Math.ceil(this.currentFilteredDocs.length / this.pagination.itemsPerPage);
        if (pageNum < 1 || pageNum > totalPages) return;
        this.pagination.currentPage = pageNum;
        this.renderPagedDocuments();
        const targetId = this.currentMode === 'library' ? 'library-grid-container' : 'documents-list-container';
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    async toggleSave(docId) {
        if (!AppState.currentUser) { Utils.showAlert("Thông báo", "Vui lòng đăng nhập!", false); return; }
        try {
            const res = await fetch(CONFIG.API_ENDPOINTS.TOGGLE_SAVE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: AppState.currentUser.username, docId })
            });
            const data = await res.json();
            if (data.success) {
                AppState.currentUser.savedDocs = data.savedDocs;
                AppState.saveUser(AppState.currentUser);
                this.renderPagedDocuments();
                this.updateStats();
                Utils.showAlert("Thành công", data.action === 'saved' ? 'Đã lưu' : 'Đã bỏ lưu', true);
            }
        } catch (e) {
            Utils.showAlert("Lỗi", "Không thể lưu", false);
        }
    },

    trackDownload(docId) {
        console.log('DL', docId);
    },

    updateStats() {
        const totalDocsEl = document.getElementById('total-docs');
        const savedDocsEl = document.getElementById('saved-docs');
        const recentDocsEl = document.getElementById('recent-docs');
        const publicDocs = AppState.allDocuments.filter(doc => doc.visibility !== 'private');

        if (totalDocsEl) {
            totalDocsEl.textContent = publicDocs.length; // ✅ Chỉ đếm file công khai
        }

        if (savedDocsEl && AppState.currentUser) {
            // ✅ Code mới: Chỉ đếm những tài liệu CÒN TỒN TẠI trong hệ thống
            const validSavedDocs = AppState.currentUser.savedDocs?.filter(savedId =>
                AppState.allDocuments.some(doc => doc.id === savedId)
            ) || [];

            savedDocsEl.textContent = validSavedDocs.length;
        }

        if (recentDocsEl) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            // ✅ Chỉ đếm file công khai
            const recentCount = publicDocs.filter(doc => {
                return doc.createdAt && new Date(doc.createdAt) >= sevenDaysAgo;
            }).length;
            recentDocsEl.textContent = recentCount;
        }

        let totalSize = 0;
        let fileSize = 0;
        let imageSize = 0;

        AppState.allDocuments.forEach(doc => {
            const size = doc.size || 0;
            totalSize += size;

            if (doc.type === 'image') {
                imageSize += size;
            } else {
                fileSize += size;
            }
        });

        const totalSizeMB = totalSize / (1024 * 1024);
        const fileSizeMB = fileSize / (1024 * 1024);
        const imageSizeMB = imageSize / (1024 * 1024);
        const totalQuotaMB = 10 * 1024;

        const storageEl = document.getElementById('storage-usage');
        if (storageEl) {
            storageEl.textContent = `${totalSizeMB.toFixed(1)} MB / ${totalQuotaMB} MB`;
        }

        let filePercent = 0;
        let imagePercent = 0;

        if (totalSize > 0) {
            filePercent = (fileSize / totalSize) * 100;
            imagePercent = (imageSize / totalSize) * 100;
        }

        const barFile = document.getElementById('storage-bar-file');
        const barImage = document.getElementById('storage-bar-image');

        if (barFile) barFile.style.width = filePercent + '%';
        if (barImage) barImage.style.width = imagePercent + '%';

        const fileSizeEl = document.getElementById('storage-file-size');
        const imageSizeEl = document.getElementById('storage-image-size');

        const folderIcon = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
        const imageIcon = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';

        if (fileSizeEl) fileSizeEl.innerHTML = folderIcon + ' Files: ' + fileSizeMB.toFixed(1) + ' MB';
        if (imageSizeEl) imageSizeEl.innerHTML = imageIcon + ' Ảnh: ' + imageSizeMB.toFixed(1) + ' MB';
    },

    filterLibrary(type) {
        document.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if ((!type && btn.textContent === 'Tất cả') || (type && btn.textContent.toLowerCase().includes(type === 'ppt' ? 'slide' : type))) btn.classList.add('active');
        });
        this.filterByType(type === 'all' ? '' : type);
    },

    searchLibrary(v) {
        this.searchDocuments(v);
    },

    filterByCourse(courseId) {
        document.querySelectorAll('.course-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`.course-filter-btn[onclick*="filterByCourse('${courseId}')"]`) ||
            document.querySelector(`.course-filter-btn[onclick*='filterByCourse(${courseId})']`);
        if (activeBtn) activeBtn.classList.add('active');

        this.currentCourseFilter = courseId;
        let src = AppState.allDocuments.filter(d => d.visibility !== 'private');

        if (courseId === 'all') {
            this.currentFilteredDocs = [...src];
        } else if (courseId === 'other') {
            this.currentFilteredDocs = src.filter(d => !d.course || d.course === 'other' || d.course === '');
        } else {
            this.currentFilteredDocs = src.filter(d => d.course == courseId);
        }

        this.pagination.currentPage = 1;
        this.renderPagedDocuments();
    },

    filterDocsByCourse(courseId) {
        // Store current filter
        this.currentCourseFilter = courseId;

        // Get source documents (public only)
        let src = AppState.allDocuments.filter(d => d.visibility !== 'private');

        // Apply course filter
        if (courseId === 'all') {
            this.currentFilteredDocs = [...src];
        } else if (courseId === 'other') {
            this.currentFilteredDocs = src.filter(d => !d.course || d.course === 'other' || d.course === '');
        } else {
            this.currentFilteredDocs = src.filter(d => d.course == courseId);
        }

        // Reset to first page and render
        this.pagination.currentPage = 1;
        this.renderPagedDocuments();
    },

    searchDocuments(k) {
        const term = k.toLowerCase().trim();
        let src = AppState.isViewingSaved
            ? AppState.allDocuments.filter(d => AppState.currentUser?.savedDocs?.includes(d.id))
            : AppState.allDocuments.filter(d => d.visibility !== 'private'); // 👈 LỌC PRIVATE
        this.currentFilteredDocs = term ? src.filter(d => d.name.toLowerCase().includes(term) || d.uploader.toLowerCase().includes(term)) : [...src];
        this.pagination.currentPage = 1;
        this.renderPagedDocuments();

        // Sync both search inputs (mobile & desktop)
        const desktopSearch = document.getElementById('docs-search');
        const mobileSearch = document.getElementById('docs-search-mobile');
        if (desktopSearch && desktopSearch.value !== k) desktopSearch.value = k;
        if (mobileSearch && mobileSearch.value !== k) mobileSearch.value = k;
    },

    filterByType(t) {
        let src = AppState.isViewingSaved
            ? AppState.allDocuments.filter(d => AppState.currentUser?.savedDocs?.includes(d.id))
            : AppState.allDocuments.filter(d => d.visibility !== 'private');
        this.currentFilteredDocs = t ? src.filter(d => d.type === t) : [...src];
        this.pagination.currentPage = 1;
        this.renderPagedDocuments();

        // Update filter chips active state (mobile)
        const chips = document.querySelectorAll('.filter-chip[data-filter]');
        chips.forEach(chip => {
            const filterValue = chip.getAttribute('data-filter');
            if ((t === '' || t === null) && filterValue === 'all') {
                chip.classList.add('active');
            } else if (filterValue === t) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        // Sync desktop select dropdown
        const selectEl = document.getElementById('doc-type-filter');
        if (selectEl) {
            selectEl.value = t || '';
        }
    },

    renderDocuments(docs, container) {
        if (!container) return;
        container.innerHTML = this.generateCardsHTML(docs);
    },

    // ==================== SUBJECT CARD NAVIGATION ====================
    /**
     * Handles click on subject card from Home Dashboard
     * Navigates to Documents page and applies the course filter
     * @param {string} subjectName - Name of the subject clicked
     */
    navigateFromSubjectCard(subjectName) {
        console.log('📚 Navigating from subject:', subjectName);

        // Find the course ID from the subject name
        const courseId = SUBJECT_TO_COURSE_MAP[subjectName];

        if (!courseId) {
            console.warn('⚠️ No course mapping found for:', subjectName);
            // Navigate to documents page without filter
            localStorage.setItem('pendingCourseFilter', 'all');
        } else {
            // Store the course ID to apply filter after navigation
            localStorage.setItem('pendingCourseFilter', courseId.toString());
            console.log('💾 Stored pending filter:', courseId);
        }

        // Trigger navigation to documents page
        // This will be handled by PageManager
        const docsMenuItem = document.querySelector('.sidebar-left .nav-menu a[onclick*="showDocumentsPage"]');
        if (docsMenuItem) {
            docsMenuItem.click();
        }
    },

    /**
     * Checks and applies pending course filter from localStorage
     * Called when Documents page is initialized
     */
    applyPendingFilter() {
        const pendingFilter = localStorage.getItem('pendingCourseFilter');

        if (pendingFilter) {
            console.log('✅ Applying pending filter:', pendingFilter);

            // Clear the pending filter immediately
            localStorage.removeItem('pendingCourseFilter');

            // Apply the filter with a small delay to ensure DOM is ready
            setTimeout(() => {
                if (pendingFilter === 'all') {
                    this.filterDocsByCourse('all');
                } else {
                    this.filterDocsByCourse(pendingFilter);
                }

                // Scroll to documents section
                const docsSection = document.getElementById('documents-section');
                if (docsSection) {
                    docsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }
};
