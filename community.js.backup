// ==================== COMMUNITY MODULE ====================

const Community = {
    // --- STATE ---
    allPosts: [],
    currentPage: 'feed', // 'feed' or 'saved'
    currentUserId: null,
    postsPerPage: 10,
    currentLoadedPosts: 0,

    // --- INITIALIZATION ---
    async init() {
        console.log('🚀 Initializing Community...');
        this.currentUserId = AppState.currentUser?.id;
        await this.loadPosts();
        this.renderFeed();
    },

    // --- LOAD DATA ---
    async loadPosts() {
        try {
            console.log('📥 Fetching posts...');
            const response = await fetch('/api/posts');
            if (response.ok) {
                this.allPosts = await response.json();
                console.log(`✅ Loaded ${this.allPosts.length} posts`, this.allPosts);
            } else {
                console.error('❌ API error:', response.status);
            }
        } catch (error) {
            console.error('❌ Load posts error:', error);
        }
    },

    // --- RENDER FEED ---
    renderFeed() {
        console.log('🎨 Rendering feed, currentPage:', this.currentPage);
        const container = document.getElementById('community-feed');
        if (!container) {
            console.error('❌ community-feed container not found!');
            return;
        }

        const posts = this.currentPage === 'feed' 
            ? this.allPosts.filter(p => !p.deleted)
            : this.allPosts.filter(p => p.savedBy?.includes(AppState.currentUser?.username) && !p.deleted);

        console.log(`📝 Found ${posts.length} posts to render`);

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>${this.currentPage === 'feed' ? 'Chưa có bài viết nào' : 'Bạn chưa lưu bài viết nào'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.renderPostCard(post)).join('');

        // Thêm event listener cho các nút
        this.attachPostEventListeners();
    },

    // --- RENDER POST CARD ---
    renderPostCard(post) {
        // Hiển thị tên đại diện (fullName) thay vì username
        const isCurrentUser = AppState.currentUser?.username === post.author;
        const displayName = isCurrentUser ? 'Bạn' : (post.authorFullName || post.author);
        const postAvatar = post.authorAvatar;
        const avatarLetter = displayName.charAt(0).toUpperCase();
        
        const isAdmin = AppState.currentUser?.role === 'admin';
        const isAuthor = AppState.currentUser?.username === post.author;
        
        // Admin có thể xóa tất cả nhưng KHÔNG được sửa bài của người khác
        // User chỉ có thể xóa và sửa bài của chính mình
        const canDelete = isAdmin || isAuthor;
        const canEdit = isAuthor;  // CHỈ người đăng mới được sửa
        const isSaved = post.savedBy?.includes(AppState.currentUser?.username);

        const timeAgo = this.getTimeAgo(post.createdAt);
        const hasImage = post.images && post.images.length > 0;
        const hasFile = post.files && post.files.length > 0;
        const isEdited = post.editedAt && post.editedAt !== post.createdAt;

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author-info">
                        ${postAvatar 
                            ? `<img src="${postAvatar}" class="author-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="avatar">`
                            : `<img src="img/avt.png" class="author-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="avatar">`
                        }
                        <div class="author-details">
                            <div class="author-name">${displayName}</div>
                            <div class="post-time" style="display: flex; align-items: center; gap: 6px;">
                                <span>${timeAgo}</span>
                                ${isEdited ? '<span style="font-size: 11px; color: #888; font-style: italic;">(đã chỉnh sửa)</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="post-actions-menu" style="display: flex; gap: 4px;">
                        ${canEdit ? `
                            <button class="btn-post-menu" onclick="Community.openEditPostModal(${post.id})" style="background: none; border: none; color: #6366f1; cursor: pointer; padding: 4px 6px; font-size: 13px; font-weight: 500;">
                                Sửa
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn-post-menu" onclick="Community.deletePost(${post.id})" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px 6px; font-size: 13px; font-weight: 500;">
                                Xóa
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="post-content">
                    <p class="post-text">${this.escapeHtml(post.content)}</p>
                </div>

                ${hasImage ? `
                    <div class="post-images">
                        ${post.images.map((img, idx) => `<img src="${img}" alt="image-${idx}" class="post-image">`).join('')}
                    </div>
                ` : ''}

                ${hasFile ? `
                    <div class="post-files">
                        ${post.files.map(file => `
                            <a href="${file.path}" class="file-item" download="${file.originalName || file.name}">
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
                                </svg>
                                ${file.originalName || file.name}
                            </a>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="post-stats">
                    <span class="stat">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        ${post.likes || 0}
                    </span>
                    <span class="stat">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
                            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                        </svg>
                        ${post.comments?.length || 0}
                    </span>
                </div>

                <div class="post-actions">
                    <button class="post-action-btn ${post.likedBy?.includes(AppState.currentUser?.username) ? 'liked' : ''}" onclick="Community.likePost(${post.id})">
                        <svg width="18" height="18" fill="${post.likedBy?.includes(AppState.currentUser?.username) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                        </svg>
                        <span>Thích</span>
                    </button>
                    <button class="post-action-btn" onclick="Community.openCommentModal(${post.id})">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span>Bình luận</span>
                    </button>
                    <button class="post-action-btn ${isSaved ? 'saved' : ''}" onclick="Community.savePost(${post.id})">
                        <svg width="18" height="18" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        <span>${isSaved ? 'Đã lưu' : 'Lưu'}</span>
                    </button>
                </div>

                ${post.comments && post.comments.length > 0 ? `
                    <div class="post-comments">
                        ${post.comments.slice(-2).map(comment => {
                            const isAdminUser = AppState.currentUser?.role === 'admin';
                            const isCommentAuthor = comment.author === AppState.currentUser?.username;
                            
                            // Admin có thể xóa tất cả comment nhưng KHÔNG được sửa comment của người khác
                            // User chỉ có thể xóa và sửa comment của chính mình
                            const canDeleteComment = isAdminUser || isCommentAuthor;
                            const canEditComment = isCommentAuthor;  // CHỈ người đăng mới được sửa
                            const isCommentEdited = comment.editedAt && comment.editedAt !== comment.createdAt;
                            
                            // Hiển thị tên đại diện và avatar thực
                            const commentDisplayName = comment.authorFullName || comment.author;
                            const commentAvatar = comment.authorAvatar;
                            const avatarLetter = commentDisplayName.charAt(0).toUpperCase();
                            
                            const hasReactions = comment.reactions && Object.keys(comment.reactions).length > 0;
                            const hasReplies = comment.replies && comment.replies.length > 0;
                            
                            return `
                                <div style="padding: 12px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px;">
                                    <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                                        ${commentAvatar 
                                            ? `<img src="${commentAvatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="avatar">`
                                            : `<img src="img/avt.png" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="avatar">`
                                        }
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                                <div>
                                                    <div style="font-weight: 700; font-size: 14px; color: #1f2937;">${commentDisplayName}</div>
                                                    <div style="font-size: 12px; color: #6b7280; margin-top: 1px;">
                                                        ${this.getTimeAgo(comment.createdAt)}
                                                        ${isCommentEdited ? ' <span style="font-style: italic;">(đã sửa)</span>' : ''}
                                                    </div>
                                                </div>
                                                ${(canEditComment || canDeleteComment) ? `
                                                    <div style="display: flex; gap: 6px; flex-shrink: 0;">
                                                        ${canEditComment ? `<button onclick="Community.openEditCommentModal(${post.id}, ${comment.id})" style="background: none; border: none; color: #6366f1; cursor: pointer; font-size: 12px; padding: 0; font-weight: 500;">Sửa</button>` : ''}
                                                        ${canDeleteComment ? `<button onclick="Community.deleteComment(${post.id}, ${comment.id})" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 12px; padding: 0; font-weight: 500;">Xóa</button>` : ''}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div style="padding: 8px 0; font-size: 14px; line-height: 1.5; color: #374151;">${this.escapeHtml(comment.content)}</div>
                                            
                                            ${comment.images && comment.images.length > 0 ? `
                                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; margin: 8px 0;">
                                                    ${comment.images.map((img, idx) => `<img src="${img}" alt="comment-image-${idx}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; cursor: pointer;" onclick="window.open('${img}')">`).join('')}
                                                </div>
                                            ` : ''}

                                            ${comment.files && comment.files.length > 0 ? `
                                                <div style="margin: 8px 0;">
                                                    ${comment.files.map(file => `
                                                        <a href="${file.path}" class="file-item" download="${file.originalName || file.name}" style="display: block; padding: 6px 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 4px; font-size: 12px; color: #374151; text-decoration: none; display: flex; align-items: center; gap: 6px;">
                                                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; flex-shrink: 0;">
                                                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                                                            </svg>
                                                            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.originalName || file.name}</span>
                                                        </a>
                                                    `).join('')}
                                                </div>
                                            ` : ''}

                                            <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 13px;">
                                                <button onclick="Community.openReplyCommentModal(${post.id}, ${comment.id})" style="background: none; border: none; color: #6366f1; cursor: pointer; padding: 0; font-weight: 500;">Trả lời</button>
                                                <button onclick="Community.openEmojiReactionPicker(${post.id}, ${comment.id}, event)" style="background: none; border: none; color: #6366f1; cursor: pointer; padding: 0; font-weight: 500;">Thả cảm xúc</button>
                                            </div>
                                            ${hasReactions ? `
                                                <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
                                                    ${Object.entries(comment.reactions).map(([emoji, reactionObj]) => {
                                                        const count = typeof reactionObj === 'object' ? reactionObj.count : reactionObj;
                                                        return `
                                                            <div style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; background: #f0f0f0; border: 1px solid #d1d5db; border-radius: 14px; font-size: 13px; cursor: default;">
                                                                <span style="font-size: 14px;">${emoji}</span>
                                                                ${count > 1 ? `<span style="color: #6b7280; font-size: 12px;">${count}</span>` : ''}
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            ` : ''}
                                            
                                            <!-- Render replies -->
                                            ${hasReplies ? `
                                                <div style="margin-top: 12px; padding-left: 20px; border-left: 2px solid #e5e7eb;">
                                                    ${comment.replies.map(reply => {
                                                        const isAdminUser = AppState.currentUser?.role === 'admin';
                                                        const isReplyAuthor = reply.author === AppState.currentUser?.username;
                                                        
                                                        // Admin có thể xóa tất cả reply nhưng KHÔNG được sửa reply của người khác
                                                        // User chỉ có thể xóa và sửa reply của chính mình
                                                        const canDeleteReply = isAdminUser || isReplyAuthor;
                                                        const canEditReply = isReplyAuthor;  // CHỈ người đăng mới được sửa
                                                        const isReplyEdited = reply.editedAt && reply.editedAt !== reply.createdAt;
                                                        
                                                        // Hiển thị tên đại diện và avatar thực
                                                        const replyDisplayName = reply.authorFullName || reply.author;
                                                        const replyAvatar = reply.authorAvatar;
                                                        const replyAvatarLetter = replyDisplayName.charAt(0).toUpperCase();
                                                        
                                                        return `
                                                            <div style="padding: 8px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px;">
                                                                <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                                                                    ${replyAvatar 
                                                                        ? `<img src="${replyAvatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="avatar">`
                                                                        : `<img src="img/avt.png" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="avatar">`
                                                                    }
                                                                    <div style="flex: 1; min-width: 0;">
                                                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                                                                            <div>
                                                                                <div style="font-weight: 600; font-size: 12px; color: #1f2937;">${replyDisplayName}</div>
                                                                                <div style="font-size: 11px; color: #6b7280;">
                                                                                    ${this.getTimeAgo(reply.createdAt)}
                                                                                    ${isReplyEdited ? ' <span style="font-style: italic;">(đã sửa)</span>' : ''}
                                                                                </div>
                                                                            </div>
                                                                            ${(canEditReply || canDeleteReply) ? `
                                                                                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                                                                                    ${canEditReply ? `<button onclick="Community.openEditReplyModal(${post.id}, ${comment.id}, ${reply.id})" style="background: none; border: none; color: #6366f1; cursor: pointer; font-size: 11px; padding: 0; font-weight: 500;">Sửa</button>` : ''}
                                                                                    ${canDeleteReply ? `<button onclick="Community.deleteReply(${post.id}, ${comment.id}, ${reply.id})" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 11px; padding: 0; font-weight: 500;">Xóa</button>` : ''}
                                                                                </div>
                                                                            ` : ''}
                                                                        </div>
                                                                        <div style="padding: 4px 0; font-size: 13px; line-height: 1.4; color: #374151;">${this.escapeHtml(reply.content)}</div>
                                                        
                                                        ${reply.images && reply.images.length > 0 ? `
                                                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 4px; margin: 6px 0;">
                                                                ${reply.images.map((img, idx) => `<img src="${img}" alt="reply-image-${idx}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="window.open('${img}')">`).join('')}
                                                            </div>
                                                        ` : ''}

                                                        ${reply.files && reply.files.length > 0 ? `
                                                            <div style="margin: 6px 0;">
                                                                ${reply.files.map(file => `
                                                                    <a href="${file.path}" class="file-item" download="${file.originalName || file.name}" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 6px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px; margin-bottom: 3px; font-size: 11px; color: #374151; text-decoration: none;">
                                                                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; flex-shrink: 0;">
                                                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                                                                        </svg>
                                                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;">${file.originalName || file.name}</span>
                                                                    </a>
                                                                `).join('')}
                                                            </div>
                                                        ` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${post.comments.length > 2 ? `<a href="#" class="view-all-comments">Xem tất cả bình luận</a>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // --- UTILITY FUNCTIONS ---
    escapeHtml(text) {
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
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [name, secondsIn] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsIn);
            if (interval >= 1) {
                return interval + ' ' + name + (interval > 1 ? 's' : '') + ' trước';
            }
        }
        return 'Vừa xong';
    },

    // --- ACTIONS ---
    openCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            // Initialize file preview listeners
            setTimeout(() => this.initFilePreview(), 100);
        }
    },

    closeCreatePostModal() {
        const modal = document.getElementById('createPostModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Wait for animation
        }
        // Reset form
        document.getElementById('postContent').value = '';
        document.getElementById('postImages').value = '';
        document.getElementById('postFiles').value = '';
        // Clear preview
        const preview = document.getElementById('filePreviewContainer');
        if (preview) preview.style.display = 'none';
    },

    async createPost() {
        const content = document.getElementById('postContent')?.value.trim();
        if (!content) {
            alert('Nội dung bài viết không được trống!');
            return;
        }

        const formData = new FormData();
        formData.append('content', content);
        formData.append('username', AppState.currentUser?.username);

        // Add images
        const imageInput = document.getElementById('postImages');
        if (imageInput?.files?.length > 0) {
            for (let file of imageInput.files) {
                formData.append('images', file);
            }
        }

        // Add files (but not videos)
        const fileInput = document.getElementById('postFiles');
        if (fileInput?.files?.length > 0) {
            for (let file of fileInput.files) {
                if (!file.type.startsWith('video/')) {
                    formData.append('files', file);
                } else {
                    alert('❌ Không được phép đăng video!');
                    return;
                }
            }
        }

        try {
            const response = await fetch('/api/create-post', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                this.closeCreatePostModal();
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Đăng bài thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('Create post error:', error);
            alert('Lỗi kết nối server');
        }
    },

    async likePost(postId) {
        try {
            const response = await fetch('/api/like-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
            }
        } catch (error) {
            console.error('Like post error:', error);
        }
    },

    openCommentModal(postId) {
        console.log('🔵 openCommentModal called with postId:', postId);
        const modal = document.getElementById('commentModal');
        console.log('🔵 Modal element:', modal);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            modal.dataset.postId = postId;
            console.log('✅ Comment modal opened for post:', postId);
            // Initialize file preview listeners
            setTimeout(() => this.initCommentFilePreview(), 100);
        } else {
            console.error('❌ Comment modal not found in DOM!');
        }
    },

    closeCommentModal() {
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Wait for animation
            document.getElementById('commentContent').value = '';
            document.getElementById('commentImages').value = '';
            document.getElementById('commentFiles').value = '';
            document.getElementById('commentFilePreviewContainer').style.display = 'none';
        }
    },

    async submitComment() {
        const modal = document.getElementById('commentModal');
        const postId = parseInt(modal?.dataset.postId);
        const content = document.getElementById('commentContent')?.value.trim();

        console.log('📝 submitComment - postId:', postId, 'content:', content);

        if (!postId) {
            alert('❌ Lỗi: Không tìm thấy bài viết!');
            return;
        }

        if (!content) {
            alert('❌ Bình luận không được trống!');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', content);
        formData.append('username', AppState.currentUser?.username);

        // Add images
        const imageInput = document.getElementById('commentImages');
        if (imageInput?.files?.length > 0) {
            for (let file of imageInput.files) {
                formData.append('images', file);
            }
        }

        // Add files
        const fileInput = document.getElementById('commentFiles');
        if (fileInput?.files?.length > 0) {
            for (let file of fileInput.files) {
                formData.append('files', file);
            }
        }

        try {
            const response = await fetch('/api/comment-post', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('💬 Comment response:', result);
            
            if (result.success) {
                this.closeCommentModal();
                await this.loadPosts();
                this.renderFeed();
                
                // Cập nhật hoạt động gần đây
                if (window.RecentActivity) {
                    window.RecentActivity.loadActivities();
                }
                
                alert('✅ Bình luận thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Comment error:', error);
            alert('❌ Lỗi kết nối server');
        }
    },

    async deleteComment(postId, commentId) {
        if (!confirm('Bạn chắc chắn muốn xóa bình luận này?')) return;

        try {
            const response = await fetch('/api/delete-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    commentId: commentId,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
                console.log('✅ Bình luận đã bị xóa');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('Delete comment error:', error);
        }
    },    async savePost(postId) {
        try {
            const response = await fetch('/api/save-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
            }
        } catch (error) {
            console.error('Save post error:', error);
        }
    },

    async deletePost(postId) {
        if (!confirm('Bạn chắc chắn muốn xóa bài viết này?')) return;

        try {
            const response = await fetch('/api/delete-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Xóa bài viết thành công!');
            }
        } catch (error) {
            console.error('Delete post error:', error);
        }
    },

    // === EDIT POST ===
    openEditPostModal(postId) {
        const post = this.allPosts.find(p => p.id === postId);
        if (!post) {
            alert('❌ Bài viết không tồn tại!');
            return;
        }

        const canEdit = AppState.currentUser?.username === post.author;  // CHỈ người đăng mới được sửa
        if (!canEdit) {
            alert('❌ Bạn không có quyền chỉnh sửa bài viết này!');
            return;
        }

        document.getElementById('editPostContent').value = post.content;
        const modal = document.getElementById('editPostModal');
        modal.dataset.postId = postId;
        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeEditPostModal() {
        const modal = document.getElementById('editPostModal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for animation
        document.getElementById('editPostContent').value = '';
    },

    async submitEditPost() {
        const modal = document.getElementById('editPostModal');
        const postId = parseInt(modal?.dataset.postId);
        const content = document.getElementById('editPostContent')?.value.trim();

        console.log('✏️ submitEditPost - postId:', postId, 'content:', content);

        if (!postId) {
            alert('❌ Lỗi: Không tìm thấy bài viết!');
            return;
        }

        if (!content) {
            alert('❌ Nội dung không được trống!');
            return;
        }

        try {
            const response = await fetch('/api/edit-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    content: content,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            console.log('✏️ Edit post response:', result);

            if (result.success) {
                this.closeEditPostModal();
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Cập nhật bài viết thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Edit post error:', error);
            alert('❌ Lỗi kết nối server');
        }
    },

    // === EDIT COMMENT ===
    openEditCommentModal(postId, commentId) {
        const post = this.allPosts.find(p => p.id === postId);
        const comment = post?.comments?.find(c => c.id === commentId);

        if (!comment) {
            alert('❌ Bình luận không tồn tại!');
            return;
        }

        const canEdit = AppState.currentUser?.username === comment.author;  // CHỈ người đăng mới được sửa
        if (!canEdit) {
            alert('❌ Bạn không có quyền chỉnh sửa bình luận này!');
            return;
        }

        document.getElementById('editCommentContent').value = comment.content;
        const modal = document.getElementById('editCommentModal');
        modal.dataset.postId = postId;
        modal.dataset.commentId = commentId;
        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeEditCommentModal() {
        const modal = document.getElementById('editCommentModal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for animation
        document.getElementById('editCommentContent').value = '';
    },

    async submitEditComment() {
        const modal = document.getElementById('editCommentModal');
        const postId = parseInt(modal?.dataset.postId);
        const commentId = parseInt(modal?.dataset.commentId);
        const content = document.getElementById('editCommentContent')?.value.trim();

        console.log('✏️ submitEditComment - postId:', postId, 'commentId:', commentId, 'content:', content);

        if (!postId || !commentId) {
            alert('❌ Lỗi: Không tìm thấy bài viết hoặc bình luận!');
            return;
        }

        if (!content) {
            alert('❌ Nội dung không được trống!');
            return;
        }

        try {
            const response = await fetch('/api/edit-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    commentId: commentId,
                    content: content,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            console.log('✏️ Edit comment response:', result);

            if (result.success) {
                this.closeEditCommentModal();
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Cập nhật bình luận thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Edit comment error:', error);
            alert('❌ Lỗi kết nối server');
        }
    },

    // === REPLY COMMENT ===
    openReplyCommentModal(postId, commentId) {
        const post = this.allPosts.find(p => p.id === postId);
        const comment = post?.comments?.find(c => c.id === commentId);

        if (!comment) {
            alert('❌ Bình luận không tồn tại!');
            return;
        }

        document.getElementById('replyingToComment').innerHTML = `
            <strong>${comment.author}:</strong> ${this.escapeHtml(comment.content.substring(0, 50))}${comment.content.length > 50 ? '...' : ''}
        `;
        
        const modal = document.getElementById('replyCommentModal');
        modal.dataset.postId = postId;
        modal.dataset.commentId = commentId;
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Initialize file preview listeners
        setTimeout(() => this.initReplyFilePreview(), 100);
    },

    closeReplyCommentModal() {
        const modal = document.getElementById('replyCommentModal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for animation
        document.getElementById('replyCommentContent').value = '';
        document.getElementById('replyImages').value = '';
        document.getElementById('replyFiles').value = '';
        document.getElementById('replyFilePreviewContainer').style.display = 'none';
    },

    async submitReplyComment() {
        const modal = document.getElementById('replyCommentModal');
        const postId = parseInt(modal?.dataset.postId);
        const parentCommentId = parseInt(modal?.dataset.commentId);
        const content = document.getElementById('replyCommentContent')?.value.trim();

        console.log('↩️ submitReplyComment - postId:', postId, 'parentCommentId:', parentCommentId, 'content:', content);

        if (!postId || !parentCommentId) {
            alert('❌ Lỗi: Không tìm thấy bài viết hoặc bình luận!');
            return;
        }

        if (!content) {
            alert('❌ Nội dung không được trống!');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('parentCommentId', parentCommentId);
        formData.append('content', content);
        formData.append('username', AppState.currentUser?.username);

        // Add images
        const imageInput = document.getElementById('replyImages');
        if (imageInput?.files?.length > 0) {
            for (let file of imageInput.files) {
                formData.append('images', file);
            }
        }

        // Add files
        const fileInput = document.getElementById('replyFiles');
        if (fileInput?.files?.length > 0) {
            for (let file of fileInput.files) {
                formData.append('files', file);
            }
        }

        try {
            const response = await fetch('/api/reply-comment', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('↩️ Reply response:', result);

            if (result.success) {
                this.closeReplyCommentModal();
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Trả lời thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Reply error:', error);
            alert('❌ Lỗi kết nối server');
        }
    },

    // === REPLY MANAGEMENT ===
    openEditReplyModal(postId, parentCommentId, replyId) {
        const post = this.allPosts.find(p => p.id === postId);
        const parentComment = post?.comments?.find(c => c.id === parentCommentId);
        const reply = parentComment?.replies?.find(r => r.id === replyId);

        if (!reply) {
            alert('❌ Trả lời không tồn tại!');
            return;
        }

        const canEdit = AppState.currentUser?.username === reply.author;  // CHỈ người đăng mới được sửa
        if (!canEdit) {
            alert('❌ Bạn không có quyền chỉnh sửa trả lời này!');
            return;
        }

        document.getElementById('editReplyContent').value = reply.content;
        const modal = document.getElementById('editReplyModal');
        modal.dataset.postId = postId;
        modal.dataset.parentCommentId = parentCommentId;
        modal.dataset.replyId = replyId;
        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeEditReplyModal() {
        const modal = document.getElementById('editReplyModal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for animation
        document.getElementById('editReplyContent').value = '';
    },

    async submitEditReply() {
        const modal = document.getElementById('editReplyModal');
        const postId = parseInt(modal?.dataset.postId);
        const parentCommentId = parseInt(modal?.dataset.parentCommentId);
        const replyId = parseInt(modal?.dataset.replyId);
        const content = document.getElementById('editReplyContent')?.value.trim();

        console.log('✏️ submitEditReply - postId:', postId, 'parentCommentId:', parentCommentId, 'replyId:', replyId, 'content:', content);

        if (!postId || !parentCommentId || !replyId) {
            alert('❌ Lỗi: Không tìm thấy bài viết, bình luận hoặc trả lời!');
            return;
        }

        if (!content) {
            alert('❌ Nội dung không được trống!');
            return;
        }

        try {
            const response = await fetch('/api/edit-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    parentCommentId: parentCommentId,
                    replyId: replyId,
                    content: content,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            console.log('✏️ Edit reply response:', result);

            if (result.success) {
                this.closeEditReplyModal();
                await this.loadPosts();
                this.renderFeed();
                alert('✅ Cập nhật trả lời thành công!');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Edit reply error:', error);
            alert('❌ Lỗi kết nối server');
        }
    },

    async deleteReply(postId, parentCommentId, replyId) {
        if (!confirm('Bạn chắc chắn muốn xóa trả lời này?')) return;

        try {
            const response = await fetch('/api/delete-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    parentCommentId: parentCommentId,
                    replyId: replyId,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
                console.log('✅ Trả lời đã bị xóa');
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('Delete reply error:', error);
        }
    },

    // === EMOJI REACTIONS ===
    openEmojiReactionPicker(postId, commentId, event) {
        const emojis = ['😀', '😂', '😍', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥'];
        const modal = document.createElement('div');
        
        // Create picker container
        modal.id = 'emojiPickerModal';
        modal.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            display: grid;
            grid-template-columns: repeat(5, 40px);
            gap: 6px;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        `;
        
        // Add emoji buttons
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.className = 'emoji-btn';
            btn.style.cssText = `
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                background: #f3f4f6;
                font-size: 20px;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            `;
            btn.onmouseover = () => {
                btn.style.background = '#e5e7eb';
                btn.style.transform = 'scale(1.1)';
            };
            btn.onmouseout = () => {
                btn.style.background = '#f3f4f6';
                btn.style.transform = 'scale(1)';
            };
            btn.onclick = (e) => {
                e.stopPropagation();
                this.addEmojiReaction(postId, commentId, emoji);
                if (modal.parentElement) document.body.removeChild(modal);
            };
            modal.appendChild(btn);
        });

        // Position picker below the button that was clicked
        const rect = event?.target?.getBoundingClientRect?.();
        if (rect) {
            modal.style.top = (rect.bottom + 10) + 'px';
            modal.style.left = (rect.left - 80) + 'px';
        } else {
            // Fallback to center
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
        }
        
        document.body.appendChild(modal);

        // Close on outside click
        const closeListener = (e) => {
            if (!modal.contains(e.target) && modal.parentElement) {
                document.body.removeChild(modal);
                document.removeEventListener('click', closeListener);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeListener);
        }, 0);
    },

    async addEmojiReaction(postId, commentId, emoji) {
        try {
            const response = await fetch('/api/add-emoji-reaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: postId,
                    commentId: commentId,
                    emoji: emoji,
                    username: AppState.currentUser?.username
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadPosts();
                this.renderFeed();
                console.log('😊 Thêm emoji thành công');
            }
        } catch (error) {
            console.error('Emoji reaction error:', error);
        }
    },

    switchTab(tab) {
        console.log('🔄 Switching to tab:', tab);
        this.currentPage = tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.textContent.includes(tab === 'feed' ? 'Bảng Tin' : 'Đã Lưu')) {
                btn.classList.add('active');
            }
        });
        
        this.renderFeed();
    },

    // Initialize file preview
    initFilePreview() {
        const imageInput = document.getElementById('postImages');
        const fileInput = document.getElementById('postFiles');
        
        if (imageInput) {
            // Remove old listener if exists
            const newImageInput = imageInput.cloneNode(true);
            imageInput.parentNode.replaceChild(newImageInput, imageInput);
            newImageInput.addEventListener('change', () => this.updatePreview());
        }
        if (fileInput) {
            // Remove old listener if exists
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);
            newFileInput.addEventListener('change', () => this.updatePreview());
        }
    },

    updatePreview() {
        const imageInput = document.getElementById('postImages');
        const fileInput = document.getElementById('postFiles');
        const previewContainer = document.getElementById('filePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const filePreview = document.getElementById('filePreview');
        const imagePreviewList = document.getElementById('imagePreviewList');
        const filePreviewList = document.getElementById('filePreviewList');

        // Handle image preview
        if (imageInput?.files?.length > 0) {
            imagePreview.style.display = 'block';
            imagePreviewList.innerHTML = '';
            
            for (let file of imageInput.files) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'position: relative; width: 80px; height: 80px;';
                    div.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;">
                    `;
                    imagePreviewList.appendChild(div);
                };
                reader.readAsDataURL(file);
            }
        } else {
            imagePreview.style.display = 'none';
        }

        // Handle file preview
        if (fileInput?.files?.length > 0) {
            filePreview.style.display = 'block';
            filePreviewList.innerHTML = '';
            
            for (let file of fileInput.files) {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = 'padding: 8px; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; font-size: 12px;';
                fileItem.innerHTML = `
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; flex-shrink: 0;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                    <span style="font-size: 11px; color: #6b7280;">${(file.size / 1024).toFixed(1)}KB</span>
                `;
                filePreviewList.appendChild(fileItem);
            }
        } else {
            filePreview.style.display = 'none';
        }

        // Show/hide container
        if (imageInput?.files?.length > 0 || fileInput?.files?.length > 0) {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    },

    // Initialize file preview for comments
    initCommentFilePreview() {
        const imageInput = document.getElementById('commentImages');
        const fileInput = document.getElementById('commentFiles');
        
        if (imageInput) {
            // Remove old listener if exists
            const newImageInput = imageInput.cloneNode(true);
            imageInput.parentNode.replaceChild(newImageInput, imageInput);
            newImageInput.addEventListener('change', () => this.updateCommentPreview());
        }
        if (fileInput) {
            // Remove old listener if exists
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);
            newFileInput.addEventListener('change', () => this.updateCommentPreview());
        }
    },

    updateCommentPreview() {
        const imageInput = document.getElementById('commentImages');
        const fileInput = document.getElementById('commentFiles');
        const previewContainer = document.getElementById('commentFilePreviewContainer');
        const imagePreview = document.getElementById('commentImagePreview');
        const filePreview = document.getElementById('commentFilePreview');
        const imagePreviewList = document.getElementById('commentImagePreviewList');
        const filePreviewList = document.getElementById('commentFilePreviewList');

        // Handle image preview
        if (imageInput?.files?.length > 0) {
            imagePreview.style.display = 'block';
            imagePreviewList.innerHTML = '';
            
            for (let file of imageInput.files) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'position: relative; width: 60px; height: 60px;';
                    div.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid #d1d5db;">
                    `;
                    imagePreviewList.appendChild(div);
                };
                reader.readAsDataURL(file);
            }
        } else {
            imagePreview.style.display = 'none';
        }

        // Handle file preview
        if (fileInput?.files?.length > 0) {
            filePreview.style.display = 'block';
            filePreviewList.innerHTML = '';
            
            for (let file of fileInput.files) {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = 'padding: 6px; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; font-size: 11px;';
                fileItem.innerHTML = `
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; flex-shrink: 0;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
                    <span style="color: #6b7280;">${(file.size / 1024).toFixed(1)}KB</span>
                `;
                filePreviewList.appendChild(fileItem);
            }
        } else {
            filePreview.style.display = 'none';
        }

        // Show/hide container
        if (imageInput?.files?.length > 0 || fileInput?.files?.length > 0) {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    },

    // Initialize file preview for replies
    initReplyFilePreview() {
        const imageInput = document.getElementById('replyImages');
        const fileInput = document.getElementById('replyFiles');
        
        if (imageInput) {
            // Remove old listener if exists
            const newImageInput = imageInput.cloneNode(true);
            imageInput.parentNode.replaceChild(newImageInput, imageInput);
            newImageInput.addEventListener('change', () => this.updateReplyPreview());
        }
        if (fileInput) {
            // Remove old listener if exists
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);
            newFileInput.addEventListener('change', () => this.updateReplyPreview());
        }
    },

    updateReplyPreview() {
        const imageInput = document.getElementById('replyImages');
        const fileInput = document.getElementById('replyFiles');
        const previewContainer = document.getElementById('replyFilePreviewContainer');
        const imagePreview = document.getElementById('replyImagePreview');
        const filePreview = document.getElementById('replyFilePreview');
        const imagePreviewList = document.getElementById('replyImagePreviewList');
        const filePreviewList = document.getElementById('replyFilePreviewList');

        // Handle image preview
        if (imageInput?.files?.length > 0) {
            imagePreview.style.display = 'block';
            imagePreviewList.innerHTML = '';
            
            for (let file of imageInput.files) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'position: relative; width: 60px; height: 60px;';
                    div.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid #d1d5db;">
                    `;
                    imagePreviewList.appendChild(div);
                };
                reader.readAsDataURL(file);
            }
        } else {
            imagePreview.style.display = 'none';
        }

        // Handle file preview
        if (fileInput?.files?.length > 0) {
            filePreview.style.display = 'block';
            filePreviewList.innerHTML = '';
            
            for (let file of fileInput.files) {
                const fileItem = document.createElement('div');
                fileItem.style.cssText = 'padding: 6px; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; font-size: 11px;';
                fileItem.innerHTML = `
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style="display: inline-block; flex-shrink: 0;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
                    <span style="color: #6b7280;">${(file.size / 1024).toFixed(1)}KB</span>
                `;
                filePreviewList.appendChild(fileItem);
            }
        } else {
            filePreview.style.display = 'none';
        }

        // Show/hide container
        if (imageInput?.files?.length > 0 || fileInput?.files?.length > 0) {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
        }
    },

    attachPostEventListeners() {
        // Xử lý các sự kiện
    }
};

// Gán vào window
window.Community = Community;
