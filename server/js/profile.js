import { AppState } from './state.js';
import { DocumentManager } from './docs.js';
import { ICON_CLOUD_UPLOAD, ICON_BOOKMARK_OUTLINE } from './icons.js';

// ==================== PROFILE MANAGER ====================
export const ProfileManager = {
    switchTab(tabName) {
        const contents = document.querySelectorAll('.profile-tab-content');
        contents.forEach(el => el.style.display = 'none');

        const menuItems = document.querySelectorAll('.p-menu-item');
        menuItems.forEach(el => el.classList.remove('active'));

        const selectedContent = document.getElementById('tab-' + tabName);
        if (selectedContent) selectedContent.style.display = 'block';

        const selectedMenu = document.getElementById('menu-' + tabName);
        if (selectedMenu) selectedMenu.classList.add('active');

        if (tabName === 'my-docs') {
            this.renderMyDocs();
        } else if (tabName === 'saved') {
            this.renderSavedDocs();
        }
    },

    renderMyDocs() {
        const container = document.getElementById('profile-my-docs-list');
        if (!container || !AppState.currentUser) return;

        const currentUsername = AppState.currentUser.username;
        const currentFullName = AppState.currentUser.fullName;

        const myDocs = AppState.allDocuments.filter(doc => {
            // 👇 LOGIC MỚI: Ưu tiên tuyệt đối username
            
            // Trường hợp 1: Tài liệu CÓ lưu username người đăng (File mới)
            if (doc.uploaderUsername) {
                // Chỉ trả về true nếu username khớp nhau hoàn toàn
                return doc.uploaderUsername === currentUsername;
            }

            // Trường hợp 2: Tài liệu KHÔNG có username (File cũ từ hệ thống cũ)
            // Lúc này mới chấp nhận so sánh bằng tên hiển thị
            if (doc.uploader && currentFullName) {
                return doc.uploader.trim() === currentFullName.trim();
            }
            
            return false;
        });

        if (myDocs.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;">${ICON_CLOUD_UPLOAD}<p>Bạn chưa tải lên tài liệu nào.</p></div>`;
        } else {
            DocumentManager.renderDocuments(myDocs, container);
        }
    },

    renderSavedDocs() {
        const container = document.getElementById('profile-saved-list');
        if (!container || !AppState.currentUser) return;

        const savedIds = AppState.currentUser.savedDocs || [];
        const savedDocs = AppState.allDocuments.filter(doc =>
            savedIds.includes(doc.id)
        );

        if (savedDocs.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;"><svg width="60" height="60" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; margin-bottom: 10px;"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg><p>Bạn chưa lưu tài liệu nào.</p></div>`;
        } else {
            DocumentManager.renderDocuments(savedDocs, container);
        }
    }
};
// khong co gi