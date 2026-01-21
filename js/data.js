// ==================== DATA BACKUP & RESTORE MANAGER ====================
// Handles export, import, and restoration of all localStorage data

export const DataManager = {
    /**
     * Initialize DataManager and expose to global scope
     */
    init() {
        console.log('✅ DataManager initialized');
        // Fix scope issue - make accessible from HTML onclick handlers
        window.DataManager = this;
        
        // Set up file input listener
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            console.log('✅ File input listener attached');
        } else {
            console.warn('⚠️ File input not found during init');
        }
    },

    /**
     * Export all app data to a JSON file
     */
    exportData() {
        console.log('📤 Starting data export...');
        
        try {
            // Collect all relevant localStorage data
            const backupData = {
                // Metadata
                app: "Whalio",
                version: "1.0",
                timestamp: Date.now(),
                exportDate: new Date().toLocaleString('vi-VN'),
                
                // User data
                currentUser: localStorage.getItem('currentUser'),
                isWhalioLoggedIn: localStorage.getItem('isWhalioLoggedIn'),
                
                // App data
                whalio_events: localStorage.getItem('whalio_events'),
                whalio_timetable: localStorage.getItem('whalio_timetable'),
                
                // Collect any other whalio_* keys dynamically
                additionalData: {}
            };

            // Scan for any other whalio_* prefixed keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('whalio_') && !backupData[key]) {
                    backupData.additionalData[key] = localStorage.getItem(key);
                }
            }

            console.log('📦 Backup data prepared:', backupData);

            // Create JSON blob
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whalio_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Export successful:', a.download);

            // Success notification
            Swal.fire({
                icon: 'success',
                title: 'Sao lưu thành công!',
                text: `File đã được tải xuống: ${a.download}`,
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('❌ Export error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi sao lưu',
                text: 'Không thể tạo file sao lưu. Vui lòng thử lại!'
            });
        }
    },

    /**
     * Trigger the hidden file input to select a backup file
     */
    triggerImport() {
        console.log('📥 Triggering file import...');
        
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) {
            fileInput.click();
            console.log('✅ File input clicked');
        } else {
            console.error('❌ File input element not found!');
            Swal.fire({
                icon: 'error',
                title: 'Lỗi hệ thống',
                text: 'Không tìm thấy input file. Vui lòng tải lại trang!'
            });
        }
    },

    /**
     * Handle file selection and read the backup file
     * @param {Event} event - File input change event
     */
    async handleFileSelect(event) {
        console.log('📂 File selected, processing...');
        
        const file = event.target.files[0];
        
        if (!file) {
            console.log('⚠️ No file selected (user canceled)');
            return;
        }

        console.log('📄 File info:', { name: file.name, size: file.size, type: file.type });

        // Validate file type
        if (!file.name.endsWith('.json')) {
            console.error('❌ Invalid file type:', file.name);
            Swal.fire({
                icon: 'error',
                title: 'File không hợp lệ',
                text: 'Vui lòng chọn file JSON (.json)!'
            });
            event.target.value = '';
            return;
        }

        try {
            // Read file content
            const fileContent = await this.readFileAsText(file);
            console.log('📖 File read successfully, parsing JSON...');
            
            // Parse JSON
            const backupData = JSON.parse(fileContent);
            console.log('✅ JSON parsed:', backupData);
            
            // Validate backup data
            if (backupData.app !== "Whalio") {
                throw new Error('File không phải là bản sao lưu Whalio hợp lệ!');
            }

            console.log('✅ Backup validation passed');

            // Show confirmation dialog
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Xác nhận khôi phục dữ liệu',
                html: `
                    <p><strong>Phiên bản:</strong> ${backupData.version || 'N/A'}</p>
                    <p><strong>Ngày sao lưu:</strong> ${backupData.exportDate || 'N/A'}</p>
                    <p style="color: #ef4444; margin-top: 12px;">
                        ⚠️ Dữ liệu hiện tại sẽ bị ghi đè!
                    </p>
                `,
                showCancelButton: true,
                confirmButtonText: 'Khôi phục',
                cancelButtonText: 'Hủy',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6b7280'
            });

            if (result.isConfirmed) {
                console.log('🔄 User confirmed restore, proceeding...');
                this.restoreData(backupData);
            } else {
                console.log('⚠️ User canceled restore');
            }

        } catch (error) {
            console.error('❌ Import error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đọc file',
                text: error.message || 'File bị hỏng hoặc không đúng định dạng!'
            });
        } finally {
            event.target.value = '';
            console.log('🧹 File input reset');
        }
    },

    /**
     * Read file as text using FileReader
     * @param {File} file - File object
     * @returns {Promise<string>} File content as text
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
     * Restore data to localStorage and reload the page
     * @param {Object} backupData - Backup data object
     */
    restoreData(backupData) {
        console.log('💾 Starting data restoration...');
        
        try {
            // Restore main data keys
            if (backupData.currentUser !== null) {
                localStorage.setItem('currentUser', backupData.currentUser);
                console.log('✅ Restored: currentUser');
            }
            if (backupData.isWhalioLoggedIn !== null) {
                localStorage.setItem('isWhalioLoggedIn', backupData.isWhalioLoggedIn);
                console.log('✅ Restored: isWhalioLoggedIn');
            }
            if (backupData.whalio_events !== null) {
                localStorage.setItem('whalio_events', backupData.whalio_events);
                console.log('✅ Restored: whalio_events');
            }
            if (backupData.whalio_timetable !== null) {
                localStorage.setItem('whalio_timetable', backupData.whalio_timetable);
                console.log('✅ Restored: whalio_timetable');
            }

            // Restore additional data
            if (backupData.additionalData) {
                Object.keys(backupData.additionalData).forEach(key => {
                    if (backupData.additionalData[key] !== null) {
                        localStorage.setItem(key, backupData.additionalData[key]);
                        console.log('✅ Restored:', key);
                    }
                });
            }

            console.log('✅ All data restored successfully');

            // Success notification
            Swal.fire({
                icon: 'success',
                title: 'Khôi phục thành công!',
                text: 'Trang sẽ tải lại để cập nhật dữ liệu...',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                console.log('🔄 Reloading page...');
                location.reload();
            });

        } catch (error) {
            console.error('❌ Restore error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi khôi phục',
                text: 'Không thể khôi phục dữ liệu. Vui lòng thử lại!'
            });
        }
    },

    /**
     * Clear all localStorage data (optional utility)
     */
    clearAllData() {
        console.log('🗑️ Clear all data requested');
        
        Swal.fire({
            icon: 'warning',
            title: 'Xác nhận xóa toàn bộ dữ liệu',
            html: `
                <p style="color: #ef4444;">
                    ⚠️ Hành động này sẽ xóa <strong>TẤT CẢ</strong> dữ liệu ứng dụng!
                </p>
                <p>Bạn sẽ mất:</p>
                <ul style="text-align: left; margin: 12px auto; max-width: 300px;">
                    <li>Tài khoản đăng nhập</li>
                    <li>Sự kiện</li>
                    <li>Thời khóa biểu</li>
                    <li>Điểm GPA</li>
                    <li>Tất cả cài đặt</li>
                </ul>
            `,
            showCancelButton: true,
            confirmButtonText: 'Xóa tất cả',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                console.log('🗑️ User confirmed clear all');
                localStorage.clear();
                Swal.fire({
                    icon: 'success',
                    title: 'Đã xóa dữ liệu',
                    text: 'Trang sẽ tải lại...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    console.log('🔄 Reloading page...');
                    location.reload();
                });
            } else {
                console.log('⚠️ User canceled clear all');
            }
        });
    }
};
