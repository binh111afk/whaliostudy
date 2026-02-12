// Service để sao lưu và khôi phục dữ liệu
export const backupService = {
    /**
     * Sao lưu dữ liệu của user và tải xuống dưới dạng JSON
     */
    async exportData(username) {
        try {
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Lỗi khi sao lưu dữ liệu');
            }

            // Tạo file JSON và tải xuống
            const jsonString = JSON.stringify(result.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whalio_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true, filename: a.download };
        } catch (error) {
            console.error('Export error:', error);
            return { success: false, message: error.message || 'Lỗi kết nối Server!' };
        }
    },

    /**
     * Đọc file backup
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Không thể đọc file'));
            reader.readAsText(file);
        });
    },

    /**
     * Khôi phục dữ liệu từ file backup
     */
    async importData(username, file) {
        try {
            // Validate file type
            if (!file.name.endsWith('.json')) {
                throw new Error('Vui lòng chọn file JSON (.json)!');
            }

            // Đọc file
            const fileContent = await this.readFileAsText(file);
            const backupData = JSON.parse(fileContent);

            // Validate backup data
            if (backupData.app !== "Whalio") {
                throw new Error('File không phải là bản sao lưu Whalio hợp lệ!');
            }

            // Gửi lên server để restore
            const response = await fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, backupData })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Lỗi khi khôi phục dữ liệu');
            }

            return { 
                success: true, 
                message: 'Khôi phục thành công!',
                backupInfo: {
                    version: backupData.version,
                    exportDate: backupData.exportDate
                }
            };
        } catch (error) {
            console.error('Import error:', error);
            return { 
                success: false, 
                message: error.message || 'File bị hỏng hoặc không đúng định dạng!' 
            };
        }
    }
};
