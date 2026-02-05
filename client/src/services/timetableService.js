export const timetableService = {
    // Lấy TKB
    async getTimetable(username) {
      const res = await fetch(`/api/timetable?username=${username}`);
      return await res.json();
    },
  
    // Tạo mới (hoặc Sửa nếu có classId)
    async saveClass(classData, isEdit = false) {
      const url = isEdit ? '/api/timetable/update' : '/api/timetable';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      });
      return await res.json();
    },
  
    // Xóa 1 lớp
    async deleteClass(classId, username) {
      const res = await fetch('/api/timetable/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, username })
      });
      return await res.json();
    },
  
    // Xóa tất cả
    async clearTimetable(username) {
      const res = await fetch('/api/timetable/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      return await res.json();
    },
  
    // Quản lý Ghi chú (Thêm/Sửa/Xóa/Toggle)
    async updateNote(classId, username, action, note) {
      const res = await fetch('/api/timetable/update-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, username, action, note })
      });
      return await res.json();
    }
  };