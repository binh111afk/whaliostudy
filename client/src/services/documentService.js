import { getFullApiUrl } from '../config/apiConfig';

export const documentService = {
    // Lấy danh sách tài liệu
    async getDocuments() {
      const res = await fetch(getFullApiUrl('/api/documents'));
      return await res.json();
    },
  
    // Tải lên tài liệu (FormData)
    async uploadDocument(formData) {
      try {
          const res = await fetch(getFullApiUrl('/api/upload-document'), {
              method: 'POST',
              body: formData // Tự động set Content-Type
          });
          return await res.json();
      } catch (error) {
          console.error("Upload error:", error);
          return { success: false, message: "Lỗi kết nối server" };
      }
    },
  
    // Cập nhật thông tin
    async updateDocument(data) {
      const res = await fetch(getFullApiUrl('/api/update-document'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
  
    // Xóa tài liệu
    async deleteDocument(docId, username) {
      const res = await fetch(getFullApiUrl('/api/delete-document'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, username })
      });
      return await res.json();
    },
  
    // Lưu / Bỏ lưu
    async toggleSave(docId, username) {
      const res = await fetch(getFullApiUrl('/api/toggle-save-doc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, username })
      });
      return await res.json();
    },

    async viewDocument(docId) {
      try {
        const res = await fetch(getFullApiUrl(`/api/documents/view/${docId}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          console.warn(`View API returned ${res.status}`);
          return { success: false };
        }
        return await res.json();
      } catch (error) {
        console.error('Error viewing document:', error);
        return { success: false };
      }
    }

  };