import { getFullApiUrl } from '../config/apiConfig';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const codeSnippetService = {
  async getSnippets(username) {
    try {
      const res = await fetch(
        getFullApiUrl(`/api/code-snippets?username=${encodeURIComponent(username || '')}`)
      );
      return await res.json();
    } catch (error) {
      console.error('Get code snippets error:', error);
      return { success: false, snippets: [], message: 'Lỗi kết nối server' };
    }
  },

  async createSnippet(payload) {
    try {
      const res = await fetch(getFullApiUrl('/api/code-snippets'), {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload || {}),
      });
      return await res.json();
    } catch (error) {
      console.error('Create code snippet error:', error);
      return { success: false, message: 'Lỗi kết nối server' };
    }
  },

  async updateSnippet(id, payload, options = {}) {
    try {
      const res = await fetch(getFullApiUrl(`/api/code-snippets/${id}`), {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload || {}),
        keepalive: Boolean(options.keepalive),
      });
      return await res.json();
    } catch (error) {
      console.error('Update code snippet error:', error);
      return { success: false, message: 'Lỗi kết nối server' };
    }
  },

  async deleteSnippet(id, username) {
    try {
      const res = await fetch(
        getFullApiUrl(`/api/code-snippets/${id}?username=${encodeURIComponent(username || '')}`),
        { method: 'DELETE' }
      );
      return await res.json();
    } catch (error) {
      console.error('Delete code snippet error:', error);
      return { success: false, message: 'Lỗi kết nối server' };
    }
  },
};

