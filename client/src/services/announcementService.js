import { getFullApiUrl } from '../config/apiConfig';

export const announcementService = {
  async getAnnouncements() {
    try {
      const res = await fetch(getFullApiUrl("/api/announcements"));
      return await res.json();
    } catch (error) {
      console.error("Get announcements error:", error);
      return { success: false, announcements: [], message: "Lỗi kết nối server" };
    }
  },

  async createAnnouncement(formData) {
    try {
      const res = await fetch(getFullApiUrl("/api/announcements"), {
        method: "POST",
        body: formData,
      });
      return await res.json();
    } catch (error) {
      console.error("Create announcement error:", error);
      return { success: false, message: "Lỗi kết nối server" };
    }
  },

  async updateAnnouncement(id, formData) {
    try {
      const res = await fetch(getFullApiUrl(`/api/announcements/${id}`), {
        method: "PUT",
        body: formData,
      });
      return await res.json();
    } catch (error) {
      console.error("Update announcement error:", error);
      return { success: false, message: "Lỗi kết nối server" };
    }
  },

  async deleteAnnouncement(id, username) {
    try {
      const res = await fetch(getFullApiUrl(`/api/announcements/${id}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      return await res.json();
    } catch (error) {
      console.error("Delete announcement error:", error);
      return { success: false, message: "Lỗi kết nối server" };
    }
  },
};
