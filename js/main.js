// ==================== MAIN ENTRY POINT ====================
// Import all modules
import { CONFIG, DOM, Utils, ModalManager } from './config.js';
import { AppState, StatsManager } from './state.js';
import { Auth, UI } from './auth.js';
import { DocumentManager } from './docs.js';
import { StudyTimer, openTimePickerModal, closeTimePickerModal, updateTimeDisplay, setTimeFromModal, applyCustomTime, scrollDocs } from './timer.js';
import { ExamManager, ExamRunner, ExamCreator } from './exam.js';
import { ProfileManager } from './profile.js';
import { RecentActivity, Community } from './community.js';
import { Timetable } from './timetable.js';

// ==================== PAGE MANAGER ====================
const PageManager = {
    hideAllSections() {
        // Hide all DOM.sections
        Object.values(DOM.sections).forEach(section => {
            if (section) section.style.display = 'none';
        });

        // Explicitly hide all other content sections by ID
        const sectionIds = [
            'library-section',
            'documents-section',
            'community-section',
            'exams-section',
            'timetable-section',
            'profile-section'
        ];

        sectionIds.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });

        // Reset body classes
        document.body.classList.remove('full-mode');
        
        // Restore sidebar by default (individual pages can hide it)
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'block';
    },

    showDashboard() {
        this.hideAllSections();
        if (DOM.sections.mainDashboard) DOM.sections.mainDashboard.style.display = 'block';
        
        // Ensure sidebar is visible on dashboard
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'block';
        
        const sidebarHomeLink = document.querySelector('.sidebar-left .nav-menu a:first-child');
        UI.setActiveMenu(sidebarHomeLink);
        UI.setActiveNavItem('nav-home');
    },

    showLibraryPage(menuItem) {
        this.hideAllSections();
        document.body.classList.add('full-mode');

        const libSection = document.getElementById('library-section');
        if (libSection) libSection.style.display = 'block';

        UI.setActiveMenu(menuItem || document.getElementById('nav-docs'));
        UI.setActiveNavItem('nav-docs');

        DocumentManager.currentMode = 'library';
        DocumentManager.loadAllDocuments();
    },

    showDocumentsPage(menuItem) {
        this.hideAllSections();
        if (DOM.sections.documentsSection) DOM.sections.documentsSection.style.display = 'block';

        UI.setActiveMenu(menuItem);

        DocumentManager.currentMode = 'normal';
        DocumentManager.loadAllDocuments();
        
        // Check and apply pending course filter (from subject card navigation)
        DocumentManager.applyPendingFilter();
    },

    showSavedDocumentsPage(menuItem = null) {
        if (!AppState.currentUser) {
            Utils.showAlert("Thông báo", "Vui lòng đăng nhập để xem tài liệu đã lưu!", false);
            return;
        }

        this.hideAllSections();
        Utils.showElement(DOM.sections.documentsSection);

        AppState.isViewingSaved = true;
        UI.setActiveMenu(menuItem);
        UI.updatePageTitle(true);

        DocumentManager.currentFilteredDocs = AppState.allDocuments.filter(doc => 
            AppState.currentUser?.savedDocs?.includes(doc.id)
        );
        DocumentManager.pagination.currentPage = 1;
        DocumentManager.renderPagedDocuments();
        DocumentManager.updateStats();

        document.title = 'Tài Liệu Đã Lưu - Whalio';
    },

    showExamsPage(menuItem = null) {
        this.hideAllSections();
        const examSection = document.getElementById('exams-section');
        if (examSection) Utils.showElement(examSection);

        // Ensure sidebar is visible on exams page
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'block';

        if (!menuItem) {
            const sidebarLinks = document.querySelectorAll('.sidebar-left .nav-menu a');
            menuItem = sidebarLinks[3];
        }
        UI.setActiveMenu(menuItem);
        document.title = 'Thi Online - Whalio';

        ExamManager.renderExams();
    },

    showCommunityPage(menuItem = null) {
        console.log('🎯 showCommunityPage called', menuItem);
        if (!AppState.currentUser) {
            Utils.showAlert("Thông báo", "Vui lòng đăng nhập để truy cập cộng đồng!", false);
            return;
        }

        this.hideAllSections();
        const communitySection = document.getElementById('community-section');
        if (communitySection) {
            Utils.showElement(communitySection);
            console.log('✅ Community section shown');
        } else {
            console.error('❌ Community section not found!');
        }

        // Ensure sidebar is visible on community page
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'block';

        document.querySelectorAll('.nav-center .nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
        
        const communityNavItem = document.querySelector('[data-tooltip="Cộng đồng"]');
        if (communityNavItem) {
            communityNavItem.classList.add('active');
            console.log('✅ Community nav item marked active');
        }

        document.title = 'Cộng Đồng - Whalio';

        // Initialize Community module
        if (Community && Community.init) {
            console.log('🚀 Calling Community.init()');
            Community.init();
        } else {
            console.error('❌ Community object not found!');
        }
    },

    showTimetablePage(menuItem) {
        this.hideAllSections();
        const timetableSection = document.getElementById('timetable-section');
        if (timetableSection) {
            Utils.showElement(timetableSection);
        }

        // Hide right sidebar to give more space for the timetable
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'none';

        UI.setActiveMenu(menuItem);
        document.title = 'Thời Khóa Biểu - Whalio';

        // Initialize Timetable module
        if (Timetable && Timetable.init) {
            Timetable.init();
        }
    },

    showProfilePage() {
        this.hideAllSections();
        Utils.showElement(DOM.sections.profileSection);

        // Ensure sidebar is visible on profile page
        const sidebarRight = document.querySelector('.sidebar-right');
        if (sidebarRight) sidebarRight.style.display = 'block';

        if (DOM.ui.userDropdown) {
            DOM.ui.userDropdown.classList.remove('active');
        }

        if (AppState.currentUser) {
            this.fillProfileData(AppState.currentUser);
        }

        document.title = 'Hồ Sơ Cá Nhân - Whalio';
    },

    fillProfileData(user) {
        const largeAvatar = document.querySelector('.large-avatar');
        if (largeAvatar) {
            largeAvatar.textContent = '';
            
            if (user.avatar && user.avatar.includes('/uploads/')) {
                largeAvatar.style.backgroundImage = "url('" + user.avatar + "')";
            } else {
                largeAvatar.style.backgroundImage = "url('img/avt.png')";
            }
            
            largeAvatar.style.backgroundSize = 'cover';
            largeAvatar.style.backgroundPosition = 'center';
            largeAvatar.style.color = 'transparent';
        }

        const fields = {
            'p-fullname-1': user.fullName,
            'p-email-1': user.email || 'Chưa cập nhật email',
            'p-fullname-2': user.fullName,
            'p-username': user.username,
            'p-email-2': user.email || 'Chưa cập nhật',
            'p-phone': user.phone || 'Chưa cập nhật',
            'p-gender': user.gender || 'Chưa cập nhật',
            'p-birth': user.birthYear || 'Chưa cập nhật',
            'p-facebook': user.facebook || '#',
            'p-city': user.city || 'Chưa cập nhật',
            'p-school': user.school || 'Chưa cập nhật'
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }
};

// ==================== EVENT HANDLERS ====================
const EventHandlers = {
    async handleLogin(event) {
        event.preventDefault();

        const username = document.querySelector('#loginForm input[type="text"]').value.trim();
        const password = document.getElementById('passwordInput').value.trim();
        const btnSubmit = document.querySelector('.btn-submit-login');

        if (!username || !password) {
            Utils.showAlert("Thông báo", "Vui lòng nhập đầy đủ thông tin!", false);
            return;
        }

        Utils.setButtonLoading(btnSubmit, true);

        const result = await Auth.login(username, password);

        if (result.success) {
            AppState.saveUser(result.user);
            UI.showUserInterface(result.user);
            ModalManager.close('login');
            Utils.showAlert("Thành công!", 'Xin chào ' + result.user.fullName + '! 👋', true);

            DocumentManager.loadAllDocuments();
            StatsManager.init();
        } else {
            Utils.showAlert("Đăng nhập thất bại", result.message, false);
        }

        Utils.setButtonLoading(btnSubmit, false);
    },

    async handleRegister(event) {
        event.preventDefault();

        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
        const fullName = document.getElementById('regFullname').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const btnSubmit = document.querySelector('#registerForm button[type="submit"]');

        // Validation
        if (!username || !password || !fullName || !email) {
            Utils.showAlert("Thông báo", "Vui lòng nhập đầy đủ thông tin!", false);
            return;
        }

        if (password !== confirmPassword) {
            Utils.showAlert("Thông báo", "Mật khẩu xác nhận không khớp!", false);
            return;
        }

        if (password.length < 6) {
            Utils.showAlert("Thông báo", "Mật khẩu phải có ít nhất 6 ký tự!", false);
            return;
        }

        Utils.setButtonLoading(btnSubmit, true);

        const result = await Auth.register(username, password, fullName, email);

        if (result.success) {
            // 1. CRITICAL: Save token first (required for API calls)
            if (result.token) {
                localStorage.setItem('token', result.token);
                console.log('✅ Token saved after registration');
            }

            // 2. Construct complete user object from server response + form inputs
            const newUser = {
                id: result.user?.id || Date.now(),
                username: username,
                fullName: fullName,
                email: email,
                avatar: result.user?.avatar || 'img/avt.png',
                role: result.user?.role || 'member',
                savedDocs: result.user?.savedDocs || [],
                createdAt: result.user?.createdAt || new Date().toISOString()
            };

            // 3. HARD SAVE to LocalStorage (Crucial - must persist before reload)
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            localStorage.setItem('isWhalioLoggedIn', 'true');
            console.log('✅ User data saved to localStorage:', newUser);

            // 4. Close modal immediately
            ModalManager.close('register');
            
            // 5. Force Page Reload to initialize AppState cleanly
            alert('✅ Đăng ký thành công! Hệ thống sẽ tự động đăng nhập...');
            window.location.reload();
            return; // Stop execution after reload
        } else {
            Utils.showAlert("Đăng ký thất bại", result.message, false);
        }

        Utils.setButtonLoading(btnSubmit, false);
    },

    async handleUploadDocument(event) {
        event.preventDefault();

        const form = event.target;
        const fileInput = document.getElementById('docFile');
        const nameInput = document.getElementById('docName');
        const btn = form.querySelector('button[type="submit"]');

        if (!fileInput.files.length) {
            Utils.showAlert("Thông báo", "Vui lòng chọn file!", false);
            return;
        }

        const file = fileInput.files[0];
        const fileName = file.name.toLowerCase();
        let finalType = 'other';

        if (fileName.endsWith('.pdf')) {
            finalType = 'pdf';
        } else if (fileName.includes('.doc') || fileName.includes('.docx')) {
            finalType = 'word';
        } else if (fileName.includes('.xls') || fileName.includes('.xlsx') || fileName.includes('.csv')) {
            finalType = 'excel';
        } else if (fileName.includes('.ppt') || fileName.includes('.pptx')) {
            finalType = 'ppt';
        } else if (/\.(jpg|jpeg|png|gif|webp)$/.test(fileName)) {
            finalType = 'image';
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', nameInput.value);
        formData.append('type', finalType);

        const courseSelect = document.getElementById('docCourse');
        const selectedCourse = courseSelect.value;
        formData.append('course', selectedCourse);

        const visibilitySelect = document.getElementById('docVisibility');
        const visibility = visibilitySelect ? visibilitySelect.value : 'public';
        formData.append('visibility', visibility);

        formData.append('uploader', AppState.currentUser.fullName);
        formData.append('username', AppState.currentUser.username);

        Utils.setButtonLoading(btn, true);

        const result = await DocumentManager.uploadDocument(formData);

        Utils.setButtonLoading(btn, false);

        if (result.success) {
            Utils.showAlert("Thành công!", "Tài liệu đã được tải lên!", true);
            
            form.reset();
            
            // FIX: Reload all documents from server to ensure consistency
            await DocumentManager.loadAllDocuments();
            
            // Update filtered docs based on current view
            /*if (AppState.isViewingSaved) {
                DocumentManager.currentFilteredDocs = AppState.allDocuments.filter(doc => 
                    AppState.currentUser?.savedDocs?.includes(doc.id)
                );
            } else {
                DocumentManager.currentFilteredDocs = AppState.allDocuments.filter(doc => doc.visibility !== 'private');
            }
            
            DocumentManager.pagination.currentPage = 1;
            DocumentManager.renderPagedDocuments();
            DocumentManager.updateStats();*/
            
            RecentActivity.loadActivities();
            
            setTimeout(() => {
                const uploadModal = document.getElementById('uploadDocModal');
                if (uploadModal) {
                    uploadModal.classList.remove('active');
                    uploadModal.style.display = 'none';
                }
            }, 300);
        } else {
            Utils.showAlert("Lỗi", result.message || "Không thể tải lên!", false);
        }
    },

    confirmLogout() {
        const btn = document.querySelector('#logoutModal button:last-child');
        btn.textContent = "Đang đăng xuất...";
        btn.disabled = true;

        setTimeout(() => {
            Auth.logout();
        }, 500);
    },

    setupMenuEvents() {
        const dashboardMenu = document.querySelector('.nav-center .nav-item[data-tooltip="Trang chủ"]');
        if (dashboardMenu) {
            dashboardMenu.addEventListener('click', (e) => {
                e.preventDefault();
                PageManager.showDashboard();
            });
        }

        const leftMenus = document.querySelectorAll('.nav-menu a');

        if (leftMenus[0]) {
            leftMenus[0].addEventListener('click', (e) => {
                e.preventDefault();
                PageManager.showDashboard();
            });
        }

        if (leftMenus[1]) {
            leftMenus[1].addEventListener('click', (e) => {
                e.preventDefault();
                PageManager.showDocumentsPage(e.target);
            });
        }

        if (leftMenus[2]) {
            leftMenus[2].addEventListener('click', (e) => {
                e.preventDefault();
                PageManager.showSavedDocumentsPage(e.target);
            });
        }

        if (leftMenus[3]) {
            leftMenus[3].addEventListener('click', (e) => {
                e.preventDefault();
                PageManager.showExamsPage(e.target);
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-avatar') || e.target.closest('.avatar-wrapper')) {
                return;
            }

            if (DOM.ui.userDropdown && !DOM.ui.userDropdown.contains(e.target)) {
                DOM.ui.userDropdown.classList.remove('active');
            }
        });
    },

    setupFormSubmissions() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm && !loginForm.dataset.listenerAdded) {
            loginForm.dataset.listenerAdded = 'true';
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm && !registerForm.dataset.listenerAdded) {
            registerForm.dataset.listenerAdded = 'true';
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        const uploadForm = document.querySelector('#uploadDocModal form');
        if (uploadForm && !uploadForm.dataset.listenerAdded) {
            uploadForm.dataset.listenerAdded = 'true';
            uploadForm.addEventListener('submit', this.handleUploadDocument.bind(this));
        }

        const docFileInput = document.getElementById('docFile');
        if (docFileInput) {
            docFileInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    const fileName = this.files[0].name.toLowerCase();
                    const typeSelect = document.getElementById('docType');
                    const nameInput = document.getElementById('docName');

                    if (!nameInput.value) {
                        nameInput.value = this.files[0].name.replace(/\.[^/.]+$/, "");
                    }

                    if (fileName.endsWith('.pdf')) {
                        typeSelect.value = 'pdf';
                    }
                    else if (fileName.includes('.doc') || fileName.includes('.docx')) {
                        typeSelect.value = 'word';
                    }
                    else if (fileName.includes('.xls') || fileName.includes('.xlsx') || fileName.includes('.csv')) {
                        typeSelect.value = 'excel';
                    }
                    else if (fileName.includes('.ppt') || fileName.includes('.pptx')) {
                        typeSelect.value = 'ppt';
                    }
                    else if (/\.(jpg|jpeg|png|gif|webp)$/.test(fileName)) {
                        typeSelect.value = 'image';
                    }
                    else {
                        typeSelect.value = 'other';
                    }
                }
            });
        }
    }
};

// ==================== INITIALIZATION ====================
async function initializeApp() {
    console.log('🚀 Initializing Whalio App...');
    
    const isLoggedIn = AppState.init();

    if (isLoggedIn) {
        UI.showUserInterface(AppState.currentUser);
        PageManager.showDashboard();
    } else {
        UI.showGuestInterface();
    }

    // FIX: Await data loading BEFORE rendering to prevent race conditions
    console.log('⏳ Loading initial data...');
    await Promise.all([
        DocumentManager.loadAllDocuments(),
        DocumentManager.loadCourses()
    ]);
    console.log('✅ Initial data loaded');

    ModalManager.setupCloseListeners();
    EventHandlers.setupMenuEvents();
    EventHandlers.setupFormSubmissions();

    StudyTimer.init();
    StatsManager.init();
    
    if (isLoggedIn) {
        RecentActivity.loadActivities();
    }
    
    // Initialize ExamRunner to load exam data
    if (ExamRunner && ExamRunner.init) {
        await ExamRunner.init();
    }
    
    console.log('✅ Whalio App initialized successfully (ES6 Modules)!');
}

// ==================== GLOBAL EXPORTS TO WINDOW ====================
// Export all modules to window for HTML onclick compatibility
window.AppState = AppState;
window.StatsManager = StatsManager;
window.Auth = Auth;
window.UI = UI;
window.DocumentManager = DocumentManager;
window.StudyTimer = StudyTimer;
window.ExamManager = ExamManager;
window.ExamRunner = ExamRunner;
window.ExamCreator = ExamCreator;
window.ProfileManager = ProfileManager;
window.RecentActivity = RecentActivity;
window.Community = Community;
window.PageManager = PageManager;
window.ModalManager = ModalManager;
window.Utils = Utils;

// Timer functions
window.selectedMinutes = 25;
window.openTimePickerModal = openTimePickerModal;
window.closeTimePickerModal = closeTimePickerModal;
window.updateTimeDisplay = updateTimeDisplay;
window.setTimeFromModal = setTimeFromModal;
window.applyCustomTime = applyCustomTime;
window.scrollDocs = scrollDocs;

// Legacy compatibility functions
window.openLoginModal = () => ModalManager.open('login');
window.closeLoginModal = () => ModalManager.close('login');
window.handleLogout = () => ModalManager.open('logout');
window.closeLogoutModal = () => ModalManager.close('logout');
window.confirmLogoutAction = () => EventHandlers.confirmLogout();
window.openUploadDocModal = () => {
    DocumentManager.populateCourseDropdown();
    ModalManager.open('uploadDoc');
};
window.closeUploadDocModal = () => ModalManager.close('uploadDoc');
window.showProfilePage = () => PageManager.showProfilePage();
window.showDashboard = () => PageManager.showDashboard();
window.showAllDocsPage = (e) => {
    // If 'e' is an event, prevent default navigation
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        PageManager.showDocumentsPage(e.target);
    } else {
        // If 'e' is just an element (or null), pass it directly
        PageManager.showDocumentsPage(e);
    }
};
window.showDocumentsPage = (e) => {
    // If 'e' is an event, prevent default navigation
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        PageManager.showDocumentsPage(e.target);
    } else {
        // If 'e' is just an element (or null), pass it directly
        PageManager.showDocumentsPage(e);
    }
};
window.showSavedDocumentsPage = (e) => {
    // If 'e' is an event, prevent default navigation
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        PageManager.showSavedDocumentsPage(e.target);
    } else {
        // If 'e' is just an element (or null), pass it directly
        PageManager.showSavedDocumentsPage(e);
    }
};
window.showCommunityPage = (e) => {
    console.log('🔗 window.showCommunityPage called', e);
    // If 'e' is an event, prevent default navigation
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        PageManager.showCommunityPage(e.target);
    } else {
        // If 'e' is just an element (or null), pass it directly
        PageManager.showCommunityPage(e);
    }
};
window.showStudyTimePage = function (e) {
    // If 'e' is an event, prevent default navigation
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const sectionsToHide = [
        DOM.sections.mainDashboard,
        DOM.sections.profileSection,
        DOM.sections.documentsSection
    ];

    sectionsToHide.forEach(section => {
        if (section) section.style.display = 'none';
    });

    if (UI && UI.setActiveMenu) {
        // Pass the element (target) if it's an event, otherwise pass the argument
        UI.setActiveMenu((e && e.target) ? e.target : e || null);
    }

    if (!StudyTimer.elements || !StudyTimer.elements.overlay) {
        StudyTimer.init();
    }

    StudyTimer.open();
};

window.toggleSaveDocument = (docId) => DocumentManager.toggleSave(docId);
window.searchDocuments = (keyword) => DocumentManager.searchDocuments(keyword);
window.filterByType = (type) => DocumentManager.filterByType(type);
window.loadDocuments = () => DocumentManager.loadAllDocuments();
window.closeCustomAlert = () => Utils.closeAlert();
window.toggleUserMenu = () => {
    if (DOM.ui.userDropdown) {
        DOM.ui.userDropdown.classList.toggle('active');
    }
};
window.openForgotPasswordModal = () => {
    ModalManager.close('login');
    ModalManager.open('forgot');
};
window.closeForgotPasswordModal = () => ModalManager.close('forgot');
window.switchToLoginFromForgot = () => {
    ModalManager.close('forgot');
    ModalManager.open('login');
};
window.switchToRegister = () => {
    ModalManager.close('login');
    ModalManager.open('register');
};
window.switchToLogin = () => {
    ModalManager.close('register');
    ModalManager.open('login');
};

// Export Timetable to window
window.Timetable = Timetable;

// Generic password toggle function
window.togglePassword = function(element) {
    // Find the input field (previous sibling of the toggle button)
    const input = element.previousElementSibling;
    if (!input) return;
    
    // Toggle input type
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
};

window.closeRegisterModal = () => ModalManager.close('register');
window.openEditProfileModal = () => {
    if (typeof window.fillEditProfileForm === 'function') {
        window.fillEditProfileForm();
    }
    ModalManager.open('editProfile');
};
window.closeEditProfileModal = () => ModalManager.close('editProfile');
window.openChangePassModal = () => ModalManager.open('changePass');
window.closeChangePassModal = () => ModalManager.close('changePass');

// ==================== PROFILE MANAGEMENT FUNCTIONS ====================

// Fill edit profile form with current user data
window.fillEditProfileForm = function() {
    const user = AppState.currentUser;
    if (!user) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('edit-username', user.username);
    setVal('edit-fullname', user.fullName);
    setVal('edit-email', user.email);
    setVal('edit-phone', user.phone);
    setVal('edit-gender', user.gender || 'Nam');
    setVal('edit-birth', user.birthYear);
    setVal('edit-school', user.school);
    setVal('edit-city', user.city);
    setVal('edit-facebook', user.facebook);

    const previewImg = document.getElementById('preview-img');
    const previewText = document.getElementById('preview-text');

    if (previewImg && previewText) {
        previewText.style.display = 'none';
        previewImg.style.display = 'block';
        
        if (user.avatar && user.avatar.includes('/uploads/')) {
            previewImg.src = user.avatar;
        } else {
            previewImg.src = 'img/avt.png';
        }
    }
};

// Handle avatar preview
window.handleAvatarPreview = function() {
    const fileInput = document.getElementById('avatar-input');
    const previewImg = document.getElementById('preview-img');
    const previewText = document.getElementById('preview-text');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

// Update user profile
window.handleUpdateProfile = async function(event) {
    event.preventDefault();

    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Đang lưu...';

    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    const profileData = {
        username: AppState.currentUser.username,
        fullName: getValue('edit-fullname'),
        email: getValue('edit-email'),
        phone: getValue('edit-phone'),
        gender: getValue('edit-gender'),
        birthYear: getValue('edit-birth'),
        school: getValue('edit-school'),
        city: getValue('edit-city'),
        facebook: getValue('edit-facebook')
    };

    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (result.success) {
            const newUserState = { ...AppState.currentUser, ...result.user };
            AppState.saveUser(newUserState);

            UI.showUserInterface(newUserState);
            if (PageManager.fillProfileData) {
                PageManager.fillProfileData(newUserState);
            }

            // ✅ SUCCESS NOTIFICATION WITH SWEETALERT2
            Swal.fire({
                icon: 'success',
                title: 'Thành công',
                text: 'Thông tin cá nhân đã được cập nhật!',
                timer: 1500,
                showConfirmButton: false
            });
            
            ModalManager.close('editProfile');
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error('Lỗi cập nhật:', error);
        // ❌ ERROR NOTIFICATION WITH SWEETALERT2
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: error.message || 'Không thể kết nối tới server'
        });
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
};

// Change password
window.handleChangePassword = async function(event) {
    event.preventDefault();

    const oldPass = document.getElementById('old-pass').value.trim();
    const newPass = document.getElementById('new-pass').value.trim();
    const confirmPass = document.getElementById('confirm-new-pass').value.trim();
    const btnSubmit = event.target.querySelector('button[type="submit"]');

    if (!oldPass || !newPass || !confirmPass) {
        Swal.fire('Thiếu thông tin', 'Vui lòng nhập đầy đủ các trường!', 'warning');
        return;
    }

    if (newPass !== confirmPass) {
        Swal.fire('Lỗi', 'Mật khẩu mới xác nhận không khớp!', 'error');
        return;
    }

    if (newPass.length < 6) {
        Swal.fire('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
        return;
    }

    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Đang xử lý...';

    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: AppState.currentUser.username,
                oldPass: oldPass,
                newPass: newPass
            })
        });

        const result = await response.json();

        if (result.success) {
            // ✅ SUCCESS NOTIFICATION WITH SWEETALERT2
            Swal.fire({
                icon: 'success',
                title: 'Thành công',
                text: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại!',
                timer: 2000,
                showConfirmButton: false
            });

            ModalManager.close('changePass');
            event.target.reset();

            if (AppState.currentUser) {
                AppState.currentUser.password = newPass;
                AppState.saveUser(AppState.currentUser);
            }

            setTimeout(() => {
                Auth.logout();
            }, 2000);

        } else {
            // ❌ ERROR NOTIFICATION WITH SWEETALERT2
            Swal.fire('Thất bại', result.message || 'Có lỗi xảy ra', 'error');
        }

    } catch (error) {
        console.error('Lỗi kết nối:', error);
        // ❌ NETWORK ERROR NOTIFICATION
        Swal.fire('Lỗi mạng', 'Không thể kết nối tới server!', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
};

// Start application
window.addEventListener('DOMContentLoaded', initializeApp);

console.log('📦 ES6 Modules loaded');
