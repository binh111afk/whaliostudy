// Service để gọi API Portal
export const portalService = {
    // Lấy dữ liệu portal từ MongoDB
    async getPortalData() {
        try {
            const response = await fetch('/api/portal');
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu portal:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    },

    // Cập nhật dữ liệu portal (chỉ admin)
    async updatePortalData(categories) {
        try {
            const response = await fetch('/api/portal/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật portal:', error);
            return { success: false, message: 'Lỗi kết nối Server!' };
        }
    }
};
