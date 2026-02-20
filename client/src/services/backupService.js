import localforage from 'localforage';
import { getFullApiUrl } from '../config/apiConfig';

const musicDB = localforage.createInstance({
    name: 'whalio_local_db',
    storeName: 'music_library'
});

const PLAYLIST_META_KEY = '__playlist_meta_v1__';

// Service để sao lưu và khôi phục dữ liệu
export const backupService = {
    async getLocalMusicSnapshot() {
        const tracks = [];
        await musicDB.iterate((value, key) => {
            if (key === PLAYLIST_META_KEY) return;
            if (!value?.blob) return;
            tracks.push({
                id: key,
                name: value.name || 'Unknown Track',
                type: value.type || '',
                size: value.size || 0,
                createdAt: value.createdAt || Date.now()
            });
        });

        tracks.sort((a, b) => a.createdAt - b.createdAt);
        const meta = await musicDB.getItem(PLAYLIST_META_KEY);
        return {
            version: 1,
            tracks,
            orderIds: Array.isArray(meta?.orderIds) ? meta.orderIds : tracks.map(t => t.id)
        };
    },

    async restoreLocalMusicSnapshot(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.tracks)) {
            return { restored: false, missing: 0, message: 'Không có snapshot nhạc local trong backup.' };
        }

        const existingTracks = [];
        await musicDB.iterate((value, key) => {
            if (key === PLAYLIST_META_KEY) return;
            if (!value?.blob) return;
            existingTracks.push({
                id: key,
                name: value.name || '',
                createdAt: value.createdAt || 0
            });
        });

        const byId = new Map(existingTracks.map(t => [t.id, t]));
        const byName = new Map();
        existingTracks.forEach((track) => {
            const key = track.name.toLowerCase();
            if (!byName.has(key)) byName.set(key, []);
            byName.get(key).push(track);
        });

        const used = new Set();
        const restoredOrder = [];
        let missing = 0;

        snapshot.orderIds?.forEach((id) => {
            const match = byId.get(id);
            if (match && !used.has(match.id)) {
                restoredOrder.push(match.id);
                used.add(match.id);
            } else {
                missing += 1;
            }
        });

        snapshot.tracks.forEach((metaTrack) => {
            const direct = byId.get(metaTrack.id);
            if (direct && !used.has(direct.id)) {
                restoredOrder.push(direct.id);
                used.add(direct.id);
                return;
            }

            const sameName = byName.get(String(metaTrack.name || '').toLowerCase()) || [];
            const alt = sameName.find((candidate) => !used.has(candidate.id));
            if (alt) {
                restoredOrder.push(alt.id);
                used.add(alt.id);
            } else {
                missing += 1;
            }
        });

        existingTracks.forEach((track) => {
            if (!used.has(track.id)) restoredOrder.push(track.id);
        });

        if (restoredOrder.length === 0 && existingTracks.length > 0) {
            restoredOrder.push(...existingTracks.map(t => t.id));
        }

        await musicDB.setItem(PLAYLIST_META_KEY, {
            orderIds: restoredOrder,
            updatedAt: Date.now()
        });

        return {
            restored: true,
            missing,
            message: missing > 0
                ? `Khôi phục thứ tự playlist local. Thiếu ${missing} bài cần thêm lại file.`
                : 'Khôi phục thứ tự playlist local thành công.'
        };
    },

    /**
     * Sao lưu dữ liệu của user và tải xuống dưới dạng JSON
     */
    async exportData(username) {
        try {
            const response = await fetch(getFullApiUrl('/api/backup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Lỗi khi sao lưu dữ liệu');
            }

            const localMusic = await this.getLocalMusicSnapshot();
            const combinedBackup = {
                ...result.data,
                localMusic
            };

            // Tạo file JSON và tải xuống
            const jsonString = JSON.stringify(combinedBackup, null, 2);
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
            reader.onerror = () => reject(new Error('Không thể đọc file'));
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
            const response = await fetch(getFullApiUrl('/api/restore'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, backupData })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Lỗi khi khôi phục dữ liệu');
            }

            const localMusicRestore = await this.restoreLocalMusicSnapshot(backupData.localMusic);

            return { 
                success: true, 
                message: 'Khôi phục thành công!',
                backupInfo: {
                    version: backupData.version,
                    exportDate: backupData.exportDate,
                    localMusic: localMusicRestore.message
                },
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
