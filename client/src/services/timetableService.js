import { getFullApiUrl } from '../config/apiConfig';
import axios from '../config/axiosConfig';

export const timetableService = {
    // Lấy TKB
    async getTimetable(username) {
      const res = await axios.get(
        getFullApiUrl(`/api/timetable?username=${encodeURIComponent(username)}`),
        { withCredentials: true }
      );
      return res.data;
    },
  
    // Tạo mới (hoặc Sửa nếu có classId)
    async saveClass(classData, isEdit = false) {
      const url = isEdit ? '/api/timetable/update' : '/api/timetable';
      const res = await axios.post(getFullApiUrl(url), classData, { withCredentials: true });
      return res.data;
    },
  
    // Xóa 1 lớp
    async deleteClass(classId, username) {
      const res = await axios.post(
        getFullApiUrl('/api/timetable/delete'),
        { classId, username },
        { withCredentials: true }
      );
      return res.data;
    },
  
    // Xóa tất cả
    async clearTimetable(username) {
      const res = await axios.delete(getFullApiUrl('/api/timetable/clear'), {
        data: { username },
        withCredentials: true
      });
      return res.data;
    },
  
    // Quản lý Ghi chú (Thêm/Sửa/Xóa/Toggle)
    async updateNote(classId, username, action, note) {
      const res = await axios.post(
        getFullApiUrl('/api/timetable/update-note'),
        { classId, username, action, note },
        { withCredentials: true }
      );
      return res.data;
    }
  };
