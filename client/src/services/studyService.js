import { getFullApiUrl } from '../config/apiConfig';

export const studyService = {
    // Lưu thời gian học
    async saveSession(username, durationMinutes) {
        try {
            const res = await fetch(getFullApiUrl('/api/study/save'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, duration: durationMinutes })
            });
            return await res.json();
        } catch (error) {
            console.error("Lỗi lưu thời gian học:", error);
            return { success: false };
        }
    },

    // Lấy dữ liệu biểu đồ
    async getStats(username) {
        try {
            const res = await fetch(getFullApiUrl(`/api/study/stats?username=${username}`));
            return await res.json();
        } catch (error) {
            console.error("Lỗi lấy thống kê:", error);
            return { success: false, data: [] };
        }
    },

    async getTasks(username) {
        try {
            const res = await fetch(getFullApiUrl(`/api/study/tasks?username=${encodeURIComponent(username)}`));
            return await res.json();
        } catch (error) {
            console.error("Lỗi lấy task phiên học:", error);
            return { success: false, tasks: [] };
        }
    },

    async createTask(username, title) {
        try {
            const res = await fetch(getFullApiUrl("/api/study/tasks"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, title }),
            });
            return await res.json();
        } catch (error) {
            console.error("Lỗi tạo task phiên học:", error);
            return { success: false };
        }
    },

    async updateTask(id, payload) {
        try {
            const res = await fetch(getFullApiUrl(`/api/study/tasks/${id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            return await res.json();
        } catch (error) {
            console.error("Lỗi cập nhật task phiên học:", error);
            return { success: false };
        }
    },

    async deleteTask(username, id) {
        try {
            const res = await fetch(getFullApiUrl(`/api/study/tasks/${id}?username=${encodeURIComponent(username)}`), {
                method: "DELETE",
            });
            return await res.json();
        } catch (error) {
            console.error("Lỗi xóa task phiên học:", error);
            return { success: false };
        }
    }
};
