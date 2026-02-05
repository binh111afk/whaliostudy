export const studyService = {
    // Lưu thời gian học
    async saveSession(username, durationMinutes) {
        try {
            const res = await fetch('/api/study/save', {
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
            const res = await fetch(`/api/study/stats?username=${username}`);
            return await res.json();
        } catch (error) {
            console.error("Lỗi lấy thống kê:", error);
            return { success: false, data: [] };
        }
    }
};