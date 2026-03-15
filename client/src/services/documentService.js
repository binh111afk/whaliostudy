import { getFullApiUrl } from '../config/apiConfig';

const getAuthHeader = () => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('accessToken');

  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return await res.json();
          }

          const text = await res.text();
          return {
            success: false,
            message: text || `Upload thất bại (HTTP ${res.status})`
          };
      } catch (error) {
          console.error("Upload error:", error);
          return { success: false, message: "Lỗi kết nối server" };
      }
    },
  
    // Cập nhật thông tin
    async updateDocument(data) {
      const res = await fetch(getFullApiUrl('/api/update-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
  
    // Xóa tài liệu
    async deleteDocument(docId, username) {
      try {
        const res = await fetch(getFullApiUrl('/api/delete-document'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ docId, username })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }

        const text = await res.text();
        return {
          success: false,
          message: text || `Xóa tài liệu thất bại (HTTP ${res.status})`
        };
      } catch (error) {
        console.error('Delete document error:', error);
        return { success: false, message: 'Lỗi kết nối server' };
      }
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
