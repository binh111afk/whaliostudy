// client/src/services/communityService.js
import { getFullApiUrl } from '../config/apiConfig';

export const communityService = {
    // Lấy tất cả bài viết
    async getPosts() {
      const res = await fetch(getFullApiUrl('/api/posts'));
      return await res.json();
    },
  
    // Tạo bài viết mới (hoặc Sửa)
    async createPost(formData) {
      const res = await fetch(getFullApiUrl('/api/posts'), {
        method: 'POST',
        body: formData // Tự động set Content-Type multipart/form-data
      });
      return await res.json();
    },
  
    async editPost(data) {
      const res = await fetch(getFullApiUrl('/api/posts/edit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
  
    async deletePost(postId, username) {
      const res = await fetch(getFullApiUrl('/api/posts/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, username })
      });
      return await res.json();
    },
  
    // Tương tác
    async likePost(postId, username) {
      const res = await fetch(getFullApiUrl('/api/posts/like'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, username })
      });
      return await res.json();
    },
  
    async savePost(postId, username) {
      const res = await fetch(getFullApiUrl('/api/posts/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, username })
      });
      return await res.json();
    },
  
    // Bình luận
    async addComment(formData) {
      const res = await fetch(getFullApiUrl('/api/comments'), {
        method: 'POST',
        body: formData
      });
      return await res.json();
    },
  
    async deleteComment(postId, commentId, username) {
      const res = await fetch(getFullApiUrl('/api/comments/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, commentId, username })
      });
      return await res.json();
    },
  
    async replyComment(formData) {
      const res = await fetch(getFullApiUrl('/api/reply-comment'), {
          method: 'POST',
          body: formData
      });
      return await res.json();
    }
  };