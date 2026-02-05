import { AppState } from './state.js';

// ==================== RECENT ACTIVITY ====================
// ==================== RECENT ACTIVITY (ĐÃ NÂNG CẤP PREVIEW) ====================
export const RecentActivity = {
    isInitialized: false,
    allActivities: [],
    isShowingAll: false,

    // ==================== KHỞI TẠO ====================
    init() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing RecentActivity...');

        // 1. Kích hoạt tính năng click vào link (Deep Linking)
        this.setupDeepLinking();

        // 2. Kích hoạt nút "Xem thêm"
        this.setupEventListeners();

        this.isInitialized = true;
    },

    // 👇 HÀM MỚI: Xử lý khi click vào link trong hoạt động
    setupDeepLinking() {
        document.addEventListener('click', async (e) => {
            const link = e.target.closest('.activity-list .file-link');
            if (!link) return;

            e.preventDefault();
            const href = link.getAttribute('href');
            
            if (!href || href === '#') return;

            // CASE 1: Click vào Bài viết (#post-...)
            if (href.startsWith('#post-')) {
                const postId = href.replace('#post-', '');
                if (window.PageManager && window.PageManager.showCommunityPage) {
                    window.PageManager.showCommunityPage();
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
                if (postCard) {
                    postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    postCard.classList.add('highlight-flash');
                    setTimeout(() => postCard.classList.remove('highlight-flash'), 2000);
                }
            
            // CASE 2: Click vào Tài liệu (#doc-...) -> MỞ PREVIEW NGAY
            } else if (href.startsWith('#doc-')) {
                const docId = href.replace('#doc-', '');
                console.log('📄 Đang mở tài liệu:', docId);

                // Tìm thông tin file trong danh sách đã tải
                const doc = AppState.allDocuments.find(d => String(d.id) === String(docId));

                if (doc) {
                    const extension = doc.path.substring(doc.path.lastIndexOf('.')).toLowerCase();
                    
                    // Nếu là file Office -> Dùng Microsoft Viewer
                    if (['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].includes(extension)) {
                        const previewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.path)}`;
                        window.open(previewUrl, '_blank');
                    } else {
                        // Các file khác (PDF, Ảnh) -> Mở trực tiếp
                        window.open(doc.path, '_blank');
                    }
                } else {
                    // Dự phòng: Nếu chưa tải được info file thì chuyển trang như cũ
                    if (window.PageManager && window.PageManager.showDocumentsPage) {
                        window.PageManager.showDocumentsPage();
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const docCard = document.querySelector(`.doc-card[data-doc-id="${docId}"]`);
                    if (docCard) docCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    },

    // Xử lý nút Xem thêm / Thu gọn
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view-more-activities')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.toggleViewAll();
            }
        });
    },

    async loadActivities() {
        try {
            const response = await fetch('/api/recent-activities');
            const data = await response.json();

            if (data.success) {
                // Render mặc định 2 dòng đầu
                this.allActivities = data.activities || [];
                this.renderActivities(this.allActivities, data.count);
            }
            this.init();
        } catch (error) {
            console.error('Load activities error:', error);
        }
    },

    renderActivities(activities, count) {
        const container = document.querySelector('.activity-list');
        const badge = document.querySelector('.recent-activity .badge-count');

        if (!container) return;
        if (badge) badge.textContent = count;

        if (activities.length === 0) {
            container.innerHTML = '<li style="text-align: center; color: #6b7280; padding: 20px;">Chưa có hoạt động nào</li>';
            return;
        }

        this.allActivities = activities; // Lưu lại full list
        this.isShowingAll = false;       // Mặc định đang thu gọn

        // Chỉ hiện 2 cái đầu tiên
        this.renderActivityList(activities.slice(0, 2));

        // Nếu tổng > 2 thì hiện nút Xem thêm
        if (activities.length > 2) {
            const viewMoreBtn = document.createElement('li');
            viewMoreBtn.style.textAlign = 'center';
            viewMoreBtn.style.padding = '10px';
            viewMoreBtn.innerHTML = `<button class="btn-view-more-activities" style="background: #6366f1; color: white; border: none; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-weight: 500; font-size: 12px;">Xem thêm (${activities.length - 2})</button>`;
            container.appendChild(viewMoreBtn);
        }
    },

    renderActivityList(activities) {
        const container = document.querySelector('.activity-list');
        if (!container) return;

        container.innerHTML = activities.map(activity => {
            const bgColor = this.getAvatarColor(activity.type);
            const timeAgo = this.getTimeAgo(activity.time);
            
            // Logic kiểm tra Avatar (Có Custom hay dùng Mặc định)
            const hasCustomAvatar = activity.userAvatar && activity.userAvatar.includes('/uploads/');
            
            // ✅ SỬA Ở ĐÂY: Luôn trả về thẻ <img> (Dùng ảnh thật hoặc ảnh avt.png)
            const avatarHtml = hasCustomAvatar
                ? `<img src="${activity.userAvatar}" class="avatar-small" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="avatar">`
                : `<img src="img/avt.png" class="avatar-small ${bgColor}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="avatar">`;

            return `
                <li style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                    ${avatarHtml}
                    <div class="activity-info" style="flex: 1;">
                        <p style="margin: 0; font-size: 13px; color: #374151;">
                            <strong>${activity.user}</strong> ${activity.action}
                        </p>
                        <a href="${activity.link}" class="file-link" style="display: block; font-size: 13px; color: #6366f1; margin-top: 2px; text-decoration: none;">${activity.target}</a>
                        <span class="time-ago" style="display: block; font-size: 11px; color: #9ca3af; margin-top: 4px;">${timeAgo}</span>
                    </div>
                </li>`;
        }).join('');
    },

    toggleViewAll() {
        const container = document.querySelector('.activity-list');
        if (!container) return;

        this.isShowingAll = !this.isShowingAll;

        if (this.isShowingAll) {
            // Mở rộng: Hiện tất cả
            this.renderActivityList(this.allActivities);
            const viewMoreBtn = document.createElement('li');
            viewMoreBtn.style.textAlign = 'center';
            viewMoreBtn.style.padding = '10px';
            viewMoreBtn.innerHTML = '<button class="btn-view-more-activities" style="background: #6b7280; color: white; border: none; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-weight: 500; font-size: 12px;">Thu gọn</button>';
            container.appendChild(viewMoreBtn);
        } else {
            // Thu gọn: Chỉ hiện 2 cái
            this.renderActivityList(this.allActivities.slice(0, 2));
            const viewMoreBtn = document.createElement('li');
            viewMoreBtn.style.textAlign = 'center';
            viewMoreBtn.style.padding = '10px';
            viewMoreBtn.innerHTML = '<button class="btn-view-more-activities" style="background: #6366f1; color: white; border: none; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-weight: 500; font-size: 12px;">Xem thêm (' + (this.allActivities.length - 2) + ')</button>';
            container.appendChild(viewMoreBtn);
        }
    },

    getAvatarColor(type) {
        const colors = { 'upload': 'bg-blue', 'comment': 'bg-green', 'post': 'bg-purple' };
        return colors[type] || 'bg-gray';
    },

    getTimeAgo(dateString) {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'Vừa xong';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' phút trước';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' giờ trước';
        return Math.floor(seconds / 86400) + ' ngày trước';
    }
};

// ==================== COMMUNITY MODULE WITH EVENT DELEGATION ====================
export const Community = {
    allPosts: [],
    currentPage: 'feed',
    currentUserId: null,
    postsPerPage: 10,
    currentLoadedPosts: 0,
    eventListenersInitialized: false,

    async init() {
        console.log(' Initializing Community with Event Delegation...');
        this.currentUserId = AppState.currentUser?.id;
        await this.loadPosts();
        this.renderFeed();
        this.initEventDelegation(); // CRITICAL: Initialize event delegation
    },

    // ==================== HELPER: GET AVATAR ====================
    // ==================== HELPER: GET AVATAR (FIXED) ====================
    getAvatar() {
        const currentUser = AppState.currentUser;
        // Kiểm tra xem có user và avatar có phải là đường dẫn file không
        if (currentUser && currentUser.avatar && currentUser.avatar.includes('/uploads/')) {
            return currentUser.avatar;
        }
        // Nếu là chữ cái (N, H...) hoặc null -> Trả về ảnh mặc định
        return 'img/avt.png';
    },

    // ==================== EVENT DELEGATION ====================
    initEventDelegation() {
        if (this.eventListenersInitialized) {
            console.log(' Event listeners already initialized, skipping...');
            return;
        }

        console.log(' Initializing Event Delegation...');

        // DELEGATION FOR CLICKS (handles all dynamic buttons)
        document.addEventListener('click', (e) => {
            console.log(' Click detected:', e.target);

            // Like Post Button
            if (e.target.closest('.btn-like-post')) {
                console.log(' Like button clicked');
                const postCard = e.target.closest('.post-card');
                const postId = postCard?.dataset.postId;
                if (postId) this.likePost(postId);
            }

            // Comment Button
            if (e.target.closest('.btn-comment-post')) {
                console.log(' Comment button clicked');
                const postCard = e.target.closest('.post-card');
                const postId = postCard?.dataset.postId;
                if (postId) this.openCommentModal(postId);
            }

            // Save Post Button
            if (e.target.closest('.btn-save-post')) {
                console.log(' Save button clicked');
                const postCard = e.target.closest('.post-card');
                const postId = postCard?.dataset.postId;
                if (postId) this.savePost(postId);
            }

            // Delete Post Button
            if (e.target.closest('.btn-delete-post')) {
                console.log('🔴 Delete post button clicked');
                const btn = e.target.closest('.btn-delete-post');
                // Robust ID retrieval: getAttribute first, dataset as fallback
                const postId = btn?.getAttribute('data-post-id') || btn?.dataset.postId;
                
                console.log('🔍 Target Button:', btn);
                console.log('🔍 Target ID:', postId);
                
                if (!postId) {
                    console.error('❌ Delete failed: No postId found on button');
                    console.error('Button HTML:', btn?.outerHTML);
                    return;
                }
                
                console.log('🎯 Attempting to delete post ID:', postId);
                this.deletePost(postId);
            }

            // Edit Post Button
            if (e.target.closest('.btn-edit-post')) {
                console.log('✏️ Edit post button clicked');
                const btn = e.target.closest('.btn-edit-post');
                // Robust ID retrieval: getAttribute first, dataset as fallback
                const postId = btn?.getAttribute('data-post-id') || btn?.dataset.postId;
                
                console.log('🔍 Target Button:', btn);
                console.log('🔍 Target ID:', postId);
                
                if (!postId) {
                    console.error('❌ Edit failed: No postId found on button');
                    console.error('Button HTML:', btn?.outerHTML);
                    return;
                }
                
                console.log('🎯 Attempting to edit post ID:', postId);
                this.openEditPostModal(postId);
            }

            // Submit Comment Button (CRITICAL FIX)
            if (e.target.closest('.btn-submit-comment')) {
                console.log(' Submit comment button clicked');
                e.preventDefault();
                this.submitComment();
            }

            // Delete Comment Button
            if (e.target.closest('.btn-delete-comment')) {
                console.log(' Delete comment button clicked');
                const commentEl = e.target.closest('.comment-item');
                const postId = commentEl?.dataset.postId;  // Keep as string for MongoDB
                const commentId = parseInt(commentEl?.dataset.commentId);  // Comment IDs are still numeric
                if (postId && commentId) this.deleteComment(postId, commentId);
            }

            // Reply to Comment Button
            if (e.target.closest('.btn-reply-comment')) {
                console.log(' Reply comment button clicked');
                const commentId = parseInt(e.target.closest('.btn-reply-comment').dataset.commentId);
                if (commentId) this.openReplyForm(commentId);
            }

            // Submit Reply Button
            if (e.target.closest('.btn-submit-reply')) {
                console.log(' Submit reply button clicked');
                e.preventDefault();
                const commentId = parseInt(e.target.closest('.btn-submit-reply').dataset.commentId);
                if (commentId) this.submitReply(commentId);
            }

            // Cancel Reply Button
            if (e.target.closest('.btn-cancel-reply')) {
                console.log(' Cancel reply button clicked');
                const commentId = parseInt(e.target.closest('.btn-cancel-reply').dataset.commentId);
                if (commentId) this.closeReplyForm(commentId);
            }

            // Remove file from reply preview
            if (e.target.closest('.btn-remove-reply-file')) {
                const btn = e.target.closest('.btn-remove-reply-file');
                const inputId = btn.dataset.inputId;
                const index = parseInt(btn.dataset.index);
                this.removeFileFromInput(inputId, index);
            }

            // Create Post Button
            if (e.target.closest('.btn-create-post')) {
                console.log(' Create post button clicked');
                this.openCreatePostModal();
            }

            // Submit Create Post
            if (e.target.closest('.btn-submit-create-post')) {
                console.log(' Submit create post clicked');
                e.preventDefault();
                this.createPost();
            }

            // Submit Edit Post
            if (e.target.closest('.btn-submit-edit-post')) {
                console.log(' Submit edit post clicked');
                e.preventDefault();
                this.submitEditPost();
            }

            // Tab Switching
            if (e.target.closest('.tab-btn')) {
                console.log(' Tab switch clicked');
                const tab = e.target.closest('.tab-btn').dataset.tab;
                if (tab) this.switchTab(tab);
            }

            // Close Modals
            if (e.target.closest('.btn-close-modal') || e.target.classList.contains('modal-overlay')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) {
                    modal.classList.remove('active');
                    setTimeout(() => modal.style.display = 'none', 300);
                }
            }
        });

        // DELEGATION FOR FILE INPUT CHANGES (handles preview)
        document.addEventListener('change', (e) => {
            console.log(' Change detected:', e.target);

            // Comment Images
            if (e.target.matches('#commentImages')) {
                console.log(' Comment images selected');
                this.handleCommentFileSelect(e, 'image');
            }

            // Comment Files
            if (e.target.matches('#commentFiles')) {
                console.log(' Comment files selected');
                this.handleCommentFileSelect(e, 'file');
            }

            // Post Images
            if (e.target.matches('#postImages')) {
                console.log(' Post images selected');
                this.updatePreview();
            }

            // Post Files
            if (e.target.matches('#postFiles')) {
                console.log(' Post files selected');
                this.updatePreview();
            }

            // Reply Images (dynamic IDs)
            if (e.target.id && e.target.id.startsWith('replyImages-')) {
                console.log(' Reply images selected');
                const commentId = e.target.id.replace('replyImages-', '');
                this.handleReplyFileSelect(e, commentId, 'image');
            }

            // Reply Files (dynamic IDs)
            if (e.target.id && e.target.id.startsWith('replyFiles-')) {
                console.log(' Reply files selected');
                const commentId = e.target.id.replace('replyFiles-', '');
                this.handleReplyFileSelect(e, commentId, 'file');
            }
        });

        document.addEventListener('keydown', (e) => {
            // Chỉ áp dụng cho phím TAB và khi đang gõ trong các ô nhập nội dung
            if (e.key === 'Tab' && (
                e.target.id === 'postContent' ||      // Ô tạo bài viết
                e.target.id === 'editPostContent' ||  // Ô sửa bài viết
                e.target.id === 'commentContent' ||   // Ô bình luận
                e.target.id.startsWith('replyContent-') // Ô trả lời bình luận
            )) {
                e.preventDefault(); // Chặn hành vi chuyển ô mặc định của trình duyệt

                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;

                // Chèn 4 khoảng trắng (giả lập Tab) vào vị trí con trỏ
                const spaces = "    ";
                e.target.value = e.target.value.substring(0, start) + spaces + e.target.value.substring(end);

                // Đưa con trỏ về đúng vị trí sau khi chèn
                e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
            }
        });

        this.eventListenersInitialized = true;
        console.log(' Event Delegation Initialized Successfully');
    },

    async loadPosts() {
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();
            if (data.success) {
                this.allPosts = data.posts;
                console.log(' Loaded', this.allPosts.length, 'posts');
            }
        } catch (error) {
            console.error(' Load posts error:', error);
        }
    },

    renderFeed() {
        console.log(' Rendering feed, currentPage:', this.currentPage);
        const container = document.getElementById('community-feed');
        if (!container) {
            console.error(' Container #community-feed not found');
            return;
        }

        const posts = this.currentPage === 'feed'
            ? this.allPosts.filter(p => !p.deleted)
            : this.allPosts.filter(p => p.savedBy?.includes(AppState.currentUser?.username) && !p.deleted);

        console.log(' Found ' + posts.length + ' posts to render');

        if (posts.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: #9ca3af;"><div style="font-size: 48px; margin-bottom: 16px;"></div><p style="font-size: 16px; font-weight: 500; color: #6b7280;">' + (this.currentPage === 'feed' ? 'Chưa có bài viết nào' : 'Bạn chưa lưu bài viết nào') + '</p></div>';
            return;
        }

        container.innerHTML = posts.map(post => this.renderPostCard(post)).join('');
    },

    renderPostCard(post) {
        const currentUser = AppState.currentUser;
        const isCurrentUser = currentUser?.username === post.author;
        const displayName = isCurrentUser ? 'Bạn' : (post.authorFullName || post.author);
        
        // Handle both MongoDB _id and legacy id
        const postId = post._id || post.id;

        // Uses current user's avatar if it's their post
        const postAvatar = isCurrentUser
            ? this.getAvatar() // Dùng hàm đã fix ở trên cho chính mình
            : (post.authorAvatar && post.authorAvatar.includes('/uploads/') ? post.authorAvatar : 'img/avt.png');

        const isAdmin = currentUser?.role === 'admin';
        const isAuthor = currentUser?.username === post.author;
        const canDelete = isAdmin || isAuthor;
        const canEdit = isAuthor;
        const isSaved = post.savedBy?.includes(currentUser?.username);
        const isLiked = post.likedBy?.includes(currentUser?.username);

        const timeAgo = this.getTimeAgo(post.createdAt);
        const hasImage = post.images && post.images.length > 0;
        const hasFile = post.files && post.files.length > 0;
        const isEdited = post.editedAt && post.editedAt !== post.createdAt;

        return `
            <div class="post-card" data-post-id="${postId}">
                <div class="post-header">
                    <div class="post-author-info">
                        <img src="${postAvatar}" class="author-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="avatar">
                        <div class="author-details">
                            <div class="author-name">${displayName}</div>
                            <div class="post-time" style="display: flex; align-items: center; gap: 6px;">
                                <span>${timeAgo}</span>
                                ${isEdited ? '<span style="font-size: 11px; color: #888; font-style: italic;">(đã chỉnh sửa)</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="post-actions-menu" style="display: flex; gap: 4px;">
                        ${canEdit ? '<button class="btn-post-menu btn-edit-post" data-post-id="' + postId + '" style="background: none; border: none; color: #6366f1; cursor: pointer; padding: 4px 6px; font-size: 13px; font-weight: 500;">Sửa</button>' : ''}
                        ${canDelete ? '<button class="btn-post-menu btn-delete-post" data-post-id="' + postId + '" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px 6px; font-size: 13px; font-weight: 500;">Xóa</button>' : ''}
                    </div>
                </div>
                <div class="post-content">
                    <p class="post-text" style="white-space: pre-wrap; word-break: break-word; line-height: 1.5;">${this.escapeHtml(post.content)}</p>
                </div>
                ${hasImage ? '<div class="post-images">' + post.images.map((img, idx) => '<img src="' + img + '" alt="image-' + idx + '" class="post-image">').join('') + '</div>' : ''}
                ${hasFile ? '<div class="post-files">' + post.files.map(file => '<a href="' + file.path + '" class="file-item" download="' + (file.originalName || file.name) + '"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>' + (file.originalName || file.name) + '</a>').join('') + '</div>' : ''}
                <div class="post-stats">
                    <span class="stat"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 3px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>${post.likes || 0}</span>
                    <span class="stat"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 3px;"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>${post.comments?.length || 0}</span>
                </div>
                <div class="post-actions">
                    <button class="post-action-btn btn-like-post ${isLiked ? 'liked' : ''}">
                        <svg width="18" height="18" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
                        <span>Thích</span>
                    </button>
                    <button class="post-action-btn btn-comment-post">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        <span>Bình luận</span>
                    </button>
                    <button class="post-action-btn btn-save-post ${isSaved ? 'saved' : ''}">
                        <svg width="18" height="18" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                        <span>${isSaved ? 'Đã lưu' : 'Lưu'}</span>
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

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };

        for (const [name, secondsIn] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsIn);
            if (interval >= 1) return interval + ' ' + name + (interval > 1 ? 's' : '') + ' trước';
        }
        return 'Vừa xong';
    },

    // ==================== CREATE POST ====================
    openCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.getElementById('postContent').value = '';
            document.getElementById('postImages').value = '';
            document.getElementById('postFiles').value = '';
        }
    },

    closeCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    async createPost() {
        const content = document.getElementById('postContent')?.value.trim();
        if (!content) {
            Swal.fire('Thiếu nội dung', 'Vui lòng nhập nội dung bài viết', 'warning');
            return;
        }

        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để tạo bài viết', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('content', content);
        formData.append('username', AppState.currentUser.username);

        const imageInput = document.getElementById('postImages');
        if (imageInput?.files?.length > 0) {
            Array.from(imageInput.files).forEach(file => formData.append('images', file));
        }

        const fileInput = document.getElementById('postFiles');
        if (fileInput?.files?.length > 0) {
            Array.from(fileInput.files).forEach(file => formData.append('files', file));
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server returned ' + response.status);
            }

            const data = await response.json();
            if (data.success) {
                // Show success alert
                await Swal.fire({
                    icon: 'success',
                    title: 'Đăng bài thành công!',
                    text: 'Bài viết của bạn đã được chia sẻ với cộng đồng.',
                    timer: 1500, // Tự tắt sau 1.5 giây
                    showConfirmButton: false,
                    confirmButtonColor: '#6366f1' // Màu tím chủ đạo của web bạn
                });
                
                // Reset form inputs
                document.getElementById('postContent').value = '';
                const imageInput = document.getElementById('postImages');
                const fileInput = document.getElementById('postFiles');
                if (imageInput) imageInput.value = '';
                if (fileInput) fileInput.value = '';
                
                // Clear preview
                const previewContainer = document.getElementById('filePreviewContainer');
                if (previewContainer) previewContainer.style.display = 'none';
                
                // Close modal
                this.closeCreatePostModal();
                
                // CRITICAL: Reload posts to update UI immediately
                await this.loadPosts();
                this.renderFeed();

                // Reload recent activities
                if (window.RecentActivity) {
                    RecentActivity.loadActivities();
                }
            } else {
                Swal.fire('Thất bại', data.message || 'Tạo bài viết thất bại', 'error');
            }
        } catch (error) {
            console.error(' Create post error:', error);
            Swal.fire('Lỗi', 'Lỗi khi tạo bài viết: ' + error.message, 'error');
        }
    },

    // ==================== LIKE POST ====================
    async likePost(postId) {
        if (!AppState.currentUser || !AppState.currentUser.username) {
            return;
        }
        try {
            const response = await fetch('/api/posts/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, username: AppState.currentUser.username })
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPosts();
                this.renderFeed(); // Force UI update
            }
        } catch (error) {
            console.error(' Like post error:', error);
        }
    },

    // ==================== COMMENT MODAL ====================
    openCommentModal(postId) {
        console.log('Open Comment Modal:', postId);
        // Handle both MongoDB _id and legacy id
        const post = this.allPosts.find(p => String(p._id || p.id) === String(postId));
        if (!post) return;

        const modal = document.getElementById('commentModal');
        if (!modal) return;

        modal.dataset.postId = postId;

        // Lấy avatar hiện tại
        const currentAvatar = this.getAvatar();

        // Xử lý danh sách bình luận
        const commentsHtml = (post.comments || []).map(comment => {
            const isCurrentUser = AppState.currentUser?.username === comment.author;
            const canDelete = isCurrentUser || AppState.currentUser?.role === 'admin';

            // --- SỬA LỖI AVATAR Ở ĐÂY ---
            // Kiểm tra: Nếu avatar có chứa '/uploads/' thì mới lấy, còn lại (null, "N", "A"...) thì về ảnh mặc định
            const avatarSrc = (comment.authorAvatar && comment.authorAvatar.includes('/uploads/'))
                ? comment.authorAvatar
                : 'img/avt.png';
            // -----------------------------

            // Xử lý ảnh trong bình luận
            const imagesHtml = comment.images && comment.images.length > 0
                ? `<div class="comment-images">${comment.images.map(img => `<img src="${img}" class="comment-image">`).join('')}</div>`
                : '';

            // Xử lý file trong bình luận
            const filesHtml = comment.files && comment.files.length > 0
                ? `<div class="comment-files">${comment.files.map(file => `<a href="${file.path}" download>${file.name}</a>`).join('')}</div>`
                : '';

            // Render replies
            const repliesHtml = (comment.replies || []).map(reply => {
                const replyAvatarSrc = (reply.authorAvatar && reply.authorAvatar.includes('/uploads/'))
                    ? reply.authorAvatar
                    : 'img/avt.png';
                const replyImagesHtml = reply.images && reply.images.length > 0
                    ? `<div class="comment-images">${reply.images.map(img => `<img src="${img}" class="comment-image">`).join('')}</div>`
                    : '';
                const replyFilesHtml = reply.files && reply.files.length > 0
                    ? `<div class="comment-files">${reply.files.map(file => `<a href="${file.path}" download>${file.name}</a>`).join('')}</div>`
                    : '';
                return `
                    <div class="reply-item" style="margin-left: 40px; margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 8px;">
                        <img src="${replyAvatarSrc}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; display: inline-block; vertical-align: top; margin-right: 8px;" alt="avatar">
                        <div style="display: inline-block; max-width: calc(100% - 36px);">
                            <div style="font-weight: 600; font-size: 13px; color: #111827;">${reply.authorFullName || reply.author}</div>
                            <div style="font-size: 13px; color: #374151; margin-top: 2px;">${this.escapeHtml(reply.content)}</div>
                            ${replyImagesHtml}
                            ${replyFilesHtml}
                            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${this.getTimeAgo(reply.createdAt)}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
            <div class="comment-item" data-post-id="${postId}" data-comment-id="${comment.id}">
                <img src="${avatarSrc}" class="comment-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="avatar">
                <div class="comment-content">
                    <div class="comment-author">${isCurrentUser ? 'Bạn' : comment.author}</div>
                    <div class="comment-text" style="white-space: pre-wrap; word-break: break-word; line-height: 1.4;">${this.escapeHtml(comment.content)}</div>
                    ${imagesHtml}
                    ${filesHtml}
                    <div class="comment-time">
                        ${this.getTimeAgo(comment.createdAt)}
                        <button class="btn-reply-comment" data-comment-id="${comment.id}" style="margin-left: 12px; background: none; border: none; color: #6366f1; cursor: pointer; font-size: 12px; font-weight: 500;">↩️ Trả lời</button>
                    </div>
                </div>
                ${canDelete ? `<button class="btn-delete-comment" style="margin-left: auto; background: none; border: none; color: #dc2626; cursor: pointer; font-size: 12px;">Xóa</button>` : ''}
            </div>
            ${repliesHtml}
            <div id="reply-form-${comment.id}" style="display: none; margin-left: 40px; margin-top: 8px;"></div>
        `;
        }).join('');

        const commentsListEl = modal.querySelector('#commentsList');
        if (commentsListEl) {
            commentsListEl.innerHTML = commentsHtml || '<p style="text-align: center; color: #9ca3af; padding: 20px;">Chưa có bình luận nào</p>';
        }

        // Cập nhật avatar ở ô nhập liệu
        const avatarImg = modal.querySelector('.comment-input-avatar');
        if (avatarImg) {
            avatarImg.src = currentAvatar;
        }

        // Reset form
        document.getElementById('commentContent').value = '';
        document.getElementById('commentImages').value = '';
        document.getElementById('commentFiles').value = '';
        this.clearCommentPreview();

        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeCommentModal() {
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    // ==================== SUBMIT COMMENT ====================
    async submitComment() {
        console.log(' submitComment called');
        const modal = document.getElementById('commentModal');
        const postId = modal?.dataset.postId;  // Keep as string for MongoDB ObjectId
        const content = document.getElementById('commentContent')?.value.trim();

        if (!postId || !content) {
            Swal.fire('Thiếu nội dung', 'Vui lòng nhập nội dung bình luận', 'warning');
            return;
        }

        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để bình luận', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', content);
        formData.append('username', AppState.currentUser.username);

        const imageInput = document.getElementById('commentImages');
        if (imageInput?.files?.length > 0) {
            Array.from(imageInput.files).forEach(file => formData.append('images', file));
        }

        const fileInput = document.getElementById('commentFiles');
        if (fileInput?.files?.length > 0) {
            Array.from(fileInput.files).forEach(file => formData.append('files', file));
        }

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server returned ' + response.status);
            }

            const data = await response.json();
            if (data.success) {
                console.log(' Comment posted successfully');

                // CRITICAL: Force reload and re-render
                await this.loadPosts();
                this.renderFeed();

                // Re-open modal with updated comments
                this.openCommentModal(postId);

                // Clear inputs
                document.getElementById('commentContent').value = '';
                document.getElementById('commentImages').value = '';
                document.getElementById('commentFiles').value = '';
                this.clearCommentPreview();

                // Reload recent activities
                if (window.RecentActivity) {
                    RecentActivity.loadActivities();
                }
            } else {
                Swal.fire('Thất bại', data.message || 'Gửi bình luận thất bại', 'error');
            }
        } catch (error) {
            console.error(' Submit comment error:', error);
            Swal.fire('Lỗi', 'Lỗi khi gửi bình luận: ' + error.message, 'error');
        }
    },

    // ==================== DELETE COMMENT ====================
    async deleteComment(postId, commentId) {
        if (!AppState.currentUser || !AppState.currentUser.username) return;

        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: 'Bạn chắc chắn muốn xóa bình luận này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch('/api/comments/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, commentId, username: AppState.currentUser.username })
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPosts();
                this.openCommentModal(postId); // Refresh modal
            }
        } catch (error) {
            console.error(' Delete comment error:', error);
        }
    },

    // ==================== SAVE POST ====================
    async savePost(postId) {
        if (!AppState.currentUser || !AppState.currentUser.username) return;
        try {
            const response = await fetch('/api/posts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, username: AppState.currentUser.username })
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPosts();
                this.renderFeed();
            }
        } catch (error) {
            console.error(' Save post error:', error);
        }
    },

    // ==================== DELETE POST ====================
    async deletePost(postId) {
        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập', 'warning');
            return;
        }
        
        if (!postId) {
            console.error('❌ Delete failed: postId is undefined');
            Swal.fire('Lỗi', 'Không xác định được bài viết', 'error');
            return;
        }

        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: 'Bạn chắc chắn muốn xóa bài viết này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) return;
        
        console.log('🛠️ Sending delete request for post ID:', postId);

        try {
            const response = await fetch('/api/posts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, username: AppState.currentUser.username })
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPosts();
                this.renderFeed();
            }
        } catch (error) {
            console.error(' Delete post error:', error);
        }
    },

    // ==================== EDIT POST ====================
    openEditPostModal(postId) {
        console.log('✏️ Opening edit modal for post ID:', postId);
        
        // Find post using MongoDB _id compatibility
        const post = this.allPosts.find(p => String(p._id || p.id) === String(postId));
        
        if (!post) {
            console.error('❌ Post not found with ID:', postId);
            console.error('Available posts:', this.allPosts.map(p => ({ id: p._id || p.id, content: p.content?.substring(0, 30) })));
            Swal.fire('Không tìm thấy', 'Không tìm thấy bài viết để chỉnh sửa', 'error');
            return;
        }
        
        // Verify user is logged in
        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để chỉnh sửa', 'warning');
            return;
        }
        
        // Verify user has permission (must be author)
        if (AppState.currentUser.username !== post.author) {
            Swal.fire('Không có quyền', 'Bạn chỉ có thể sửa bài viết của mình', 'error');
            return;
        }

        console.log('✅ Post found:', { id: postId, author: post.author, content: post.content?.substring(0, 50) });
        
        // Populate textarea with current content
        const textarea = document.getElementById('editPostContent');
        if (textarea) {
            textarea.value = post.content;
        } else {
            console.error('❌ Textarea #editPostContent not found');
            return;
        }
        
        // Get modal and store postId (as string, NOT parsed!)
        const modal = document.getElementById('editPostModal');
        if (!modal) {
            console.error('❌ Modal #editPostModal not found');
            return;
        }
        
        // CRITICAL: Store raw postId (MongoDB ObjectId string)
        modal.dataset.postId = postId;
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        
        console.log('✅ Edit modal opened with postId:', modal.dataset.postId);
    },

    closeEditPostModal() {
        const modal = document.getElementById('editPostModal');
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    },

    async submitEditPost() {
        const modal = document.getElementById('editPostModal');
        // CRITICAL FIX: Don't use parseInt() on MongoDB ObjectId - keep as string!
        const postId = modal?.dataset.postId;
        const content = document.getElementById('editPostContent')?.value.trim();

        console.log('📝 Submit Edit - Post ID:', postId);
        console.log('📝 Submit Edit - Content:', content?.substring(0, 50) + '...');

        // Validation
        if (!postId || !content) {
            Swal.fire('Thiếu nội dung', 'Vui lòng nhập nội dung bài viết', 'warning');
            return;
        }

        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để chỉnh sửa', 'warning');
            return;
        }

        try {
            console.log('🚀 Sending edit request to /api/posts/edit...');
            const response = await fetch('/api/posts/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    postId: postId,  // MongoDB ObjectId as string
                    content: content, 
                    username: AppState.currentUser.username 
                })
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                if (response.status === 500) {
                    Swal.fire('Lỗi Server', 'Lỗi server khi cập nhật bài viết (500)', 'error');
                    return;
                }
                throw new Error('Server returned ' + response.status);
            }

            const data = await response.json();
            console.log('✅ Server response:', data);

            if (data.success) {
                // Success feedback
                Swal.fire('Thành công!', 'Cập nhật bài viết thành công!', 'success');
                
                // Close modal
                this.closeEditPostModal();
                
                // Reload posts and refresh UI
                await this.loadPosts();
                this.renderFeed();
                
                console.log('✅ Post updated successfully');
            } else {
                Swal.fire('Thất bại', data.message || 'Chỉnh sửa thất bại', 'error');
            }
        } catch (error) {
            console.error('❌ Edit post error:', error);
            Swal.fire('Lỗi', 'Lỗi khi chỉnh sửa: ' + error.message, 'error');
        }
    },

    // ==================== SWITCH TAB ====================
    switchTab(tab) {
        this.currentPage = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) btn.classList.add('active');
        });
        this.renderFeed();
    },

    // ==================== FILE PREVIEW ====================
    updatePreview() {
        const imageInput = document.getElementById('postImages');
        const fileInput = document.getElementById('postFiles');
        const previewContainer = document.getElementById('filePreviewContainer');
        if (previewContainer) {
            previewContainer.style.display = (imageInput?.files?.length > 0 || fileInput?.files?.length > 0) ? 'block' : 'none';
        }
    },

    handleCommentFileSelect(event, type) {
        console.log(' handleCommentFileSelect called, type:', type);
        const files = event.target.files;
        if (!files || files.length === 0) {
            console.log(' No files selected');
            return;
        }

        const previewContainer = document.getElementById('commentFilePreviewContainer');
        const imagePreview = document.getElementById('commentImagePreview');
        const filePreview = document.getElementById('commentFilePreview');
        const imagePreviewList = document.getElementById('commentImagePreviewList');
        const filePreviewList = document.getElementById('commentFilePreviewList');

        if (!previewContainer) {
            console.error(' Preview container not found');
            return;
        }

        previewContainer.style.display = 'block';

        if (type === 'image') {
            imagePreview.style.display = 'block';
            imagePreviewList.innerHTML = '';

            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
                    imgWrapper.innerHTML = `
    <img src="${e.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
    <button class="btn-remove-preview-file" data-input-id="commentImages" data-index="${index}" 
        style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">
        ×
    </button>
`;
                    imagePreviewList.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        } else {
            filePreview.style.display = 'block';
            filePreviewList.innerHTML = '';

            Array.from(files).forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px; margin: 5px 0;';
                fileItem.innerHTML = `
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
    </svg>
    <span style="flex: 1; font-size: 13px; color: #374151;">${file.name}</span>
    <button class="btn-remove-preview-file" data-input-id="commentFiles" data-index="${index}" 
        style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;">
        Xóa
    </button>
`;
                filePreviewList.appendChild(fileItem);
            });
        }
    },

    removeFileFromInput(inputId, indexToRemove) {
        const input = document.getElementById(inputId);
        if (!input || !input.files) return;

        const dt = new DataTransfer();
        Array.from(input.files).forEach((file, index) => {
            if (index != indexToRemove) dt.items.add(file);
        });

        input.files = dt.files;

        // Re-trigger preview
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);

        console.log(' Removed file at index', indexToRemove);
    },

    clearCommentPreview() {
        const previewContainer = document.getElementById('commentFilePreviewContainer');
        const imagePreviewList = document.getElementById('commentImagePreviewList');
        const filePreviewList = document.getElementById('commentFilePreviewList');
        const imagePreview = document.getElementById('commentImagePreview');
        const filePreview = document.getElementById('commentFilePreview');

        if (imagePreviewList) imagePreviewList.innerHTML = '';
        if (filePreviewList) filePreviewList.innerHTML = '';
        if (imagePreview) imagePreview.style.display = 'none';
        if (filePreview) filePreview.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'none';

        console.log(' Comment preview cleared');
    },

    // ==================== REPLY FEATURE ====================
    openReplyForm(commentId) {
        console.log('📝 Opening reply form for comment:', commentId);
        const replyFormContainer = document.getElementById(`reply-form-${commentId}`);
        if (!replyFormContainer) return;

        const currentAvatar = this.getAvatar();

        replyFormContainer.style.display = 'block';
        replyFormContainer.innerHTML = `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 8px;">
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <img src="${currentAvatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="avatar">
                    <div style="flex: 1;">
                        <textarea id="replyContent-${commentId}" placeholder="Viết trả lời..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; min-height: 60px; resize: vertical;"></textarea>
                        
                        <div id="replyFilePreviewContainer-${commentId}" style="display: none; margin-top: 8px;">
                            <div id="replyImagePreview-${commentId}" style="display: none;">
                                <div style="font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">📷 Ảnh đã chọn:</div>
                                <div id="replyImagePreviewList-${commentId}" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
                            </div>
                            <div id="replyFilePreview-${commentId}" style="display: none; margin-top: 8px;">
                                <div style="font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px;">📎 File đã chọn:</div>
                                <div id="replyFilePreviewList-${commentId}"></div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                            <input type="file" id="replyImages-${commentId}" accept="image/*" multiple style="display: none;">
                            <input type="file" id="replyFiles-${commentId}" multiple style="display: none;">
                            
                            <button onclick="document.getElementById('replyImages-${commentId}').click()" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                📷 Ảnh
                            </button>
                            <button onclick="document.getElementById('replyFiles-${commentId}').click()" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                📎 File
                            </button>
                            
                            <div style="flex: 1;"></div>
                            
                            <button class="btn-cancel-reply" data-comment-id="${commentId}" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #6b7280;">
                                Hủy
                            </button>
                            <button class="btn-submit-reply" data-comment-id="${commentId}" style="background: #6366f1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    closeReplyForm(commentId) {
        const replyFormContainer = document.getElementById(`reply-form-${commentId}`);
        if (replyFormContainer) {
            replyFormContainer.style.display = 'none';
            replyFormContainer.innerHTML = '';
        }
    },

    async submitReply(parentCommentId) {
        console.log('📤 Submitting reply to comment:', parentCommentId);
        const modal = document.getElementById('commentModal');
        const postId = modal?.dataset.postId;  // Keep as string for MongoDB ObjectId
        const content = document.getElementById(`replyContent-${parentCommentId}`)?.value.trim();

        if (!content) {
            Swal.fire('Thiếu nội dung', 'Vui lòng nhập nội dung trả lời', 'warning');
            return;
        }

        if (!AppState.currentUser || !AppState.currentUser.username) {
            Swal.fire('Chưa đăng nhập', 'Vui lòng đăng nhập để trả lời', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('parentCommentId', parentCommentId);
        formData.append('content', content);
        formData.append('username', AppState.currentUser.username);

        const imageInput = document.getElementById(`replyImages-${parentCommentId}`);
        if (imageInput?.files?.length > 0) {
            Array.from(imageInput.files).forEach(file => formData.append('images', file));
        }

        const fileInput = document.getElementById(`replyFiles-${parentCommentId}`);
        if (fileInput?.files?.length > 0) {
            Array.from(fileInput.files).forEach(file => formData.append('files', file));
        }

        try {
            const response = await fetch('/api/reply-comment', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server returned ' + response.status);
            }

            const data = await response.json();
            if (data.success) {
                console.log('✅ Reply posted successfully');

                // Reload posts and re-open modal
                await this.loadPosts();
                this.renderFeed();
                this.openCommentModal(postId);

                // Reload recent activities
                if (window.RecentActivity) {
                    RecentActivity.loadActivities();
                }
            } else {
                Swal.fire('Thất bại', data.message || 'Gửi trả lời thất bại', 'error');
            }
        } catch (error) {
            console.error('❌ Submit reply error:', error);
            Swal.fire('Lỗi', 'Lỗi khi gửi trả lời: ' + error.message, 'error');
        }
    },

    handleReplyFileSelect(event, commentId, type) {
        console.log(`📁 Reply file select: ${type} for comment ${commentId}`);
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const previewContainer = document.getElementById(`replyFilePreviewContainer-${commentId}`);
        const imagePreview = document.getElementById(`replyImagePreview-${commentId}`);
        const filePreview = document.getElementById(`replyFilePreview-${commentId}`);
        const imagePreviewList = document.getElementById(`replyImagePreviewList-${commentId}`);
        const filePreviewList = document.getElementById(`replyFilePreviewList-${commentId}`);

        if (!previewContainer) return;

        previewContainer.style.display = 'block';

        if (type === 'image') {
            imagePreview.style.display = 'block';
            imagePreviewList.innerHTML = '';

            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
                    imgWrapper.innerHTML = `
                        <img src="${e.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                        <button class="btn-remove-reply-file" data-input-id="replyImages-${commentId}" data-index="${index}" 
                            style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">
                            ×
                        </button>
                    `;
                    imagePreviewList.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        } else {
            filePreview.style.display = 'block';
            filePreviewList.innerHTML = '';

            Array.from(files).forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px; margin: 5px 0;';
                fileItem.innerHTML = `
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    </svg>
                    <span style="flex: 1; font-size: 13px; color: #374151;">${file.name}</span>
                    <button class="btn-remove-reply-file" data-input-id="replyFiles-${commentId}" data-index="${index}" 
                        style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;">
                        Xóa
                    </button>
                `;
                filePreviewList.appendChild(fileItem);
            });
        }
    },

    attachPostEventListeners() {
        // Empty - using event delegation instead
    }
};
