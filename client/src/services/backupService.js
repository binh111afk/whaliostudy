import localforage from 'localforage';
import { getFullApiUrl } from '../config/apiConfig';

const musicDB = localforage.createInstance({
    name: 'whalio_local_db',
    storeName: 'music_library'
});

const PLAYLIST_META_KEY = '__playlist_meta_v1__';
const LOCAL_PREFERENCE_KEYS = [
    'theme',
    'whalio_avatar_frame',
    'whalio_music_playback_v1',
    'whalio_study_overlay_state_v1',
    'whalio_flashcard_decks',
    'whalio_flashcard_progress',
    'whalio.code-editor-theme'
];

const readLocalUserSnapshot = (username) => {
    try {
        const raw = localStorage.getItem('user');
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            username: String(parsed?.username || username || '').trim(),
            fullName: String(parsed?.fullName || ''),
            email: String(parsed?.email || ''),
            phone: String(parsed?.phone || ''),
            gender: String(parsed?.gender || ''),
            birthYear: parsed?.birthYear || '',
            facebook: String(parsed?.facebook || ''),
            city: String(parsed?.city || ''),
            school: String(parsed?.school || ''),
            role: String(parsed?.role || 'user'),
            settings: parsed?.settings || {},
            savedDocs: Array.isArray(parsed?.savedDocs) ? parsed.savedDocs : []
        };
    } catch {
        return {
            username: String(username || '').trim(),
            fullName: '',
            email: '',
            phone: '',
            gender: '',
            birthYear: '',
            facebook: '',
            city: '',
            school: '',
            role: 'user',
            settings: {},
            savedDocs: []
        };
    }
};

const buildCompleteBackupPayload = ({ serverData, username, localMusic }) => {
    const base = serverData && typeof serverData === 'object' ? serverData : {};
    const userSnapshot = {
        ...readLocalUserSnapshot(username),
        ...(base.userSnapshot || base.user || {})
    };

    return {
        ...base,
        app: String(base.app || 'Whalio'),
        version: String(base.version || '2.0.0'),
        exportDate: String(base.exportDate || new Date().toISOString()),
        backupType: 'full-user-data',
        backupOwner: String(userSnapshot?.username || username || ''),
        userSnapshot,
        localMusic: localMusic || base.localMusic || null,
        localPreferences: base.localPreferences || {}
    };
};

const normalizeImportedBackupPayload = (backupData) => {
    const raw = backupData && typeof backupData === 'object' ? backupData : {};
    const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : raw;

    return {
        ...payload,
        app: String(payload.app || raw.app || ''),
        version: String(payload.version || raw.version || ''),
        exportDate: String(payload.exportDate || raw.exportDate || ''),
        backupType: String(payload.backupType || raw.backupType || ''),
        backupOwner: String(payload.backupOwner || raw.backupOwner || ''),
        userSnapshot: payload.userSnapshot || raw.userSnapshot || payload.user || raw.user || null,
        localMusic: payload.localMusic || raw.localMusic || null,
        localPreferences: payload.localPreferences || raw.localPreferences || {}
    };
};

const hasEnoughUserData = (payload) => {
    const userSnapshot = payload?.userSnapshot;
    if (!userSnapshot || typeof userSnapshot !== 'object') return false;

    const username = String(userSnapshot.username || '').trim();
    const hasIdentity = Boolean(username);
    const hasProfileFields = [
        userSnapshot.fullName,
        userSnapshot.email,
        userSnapshot.phone,
        userSnapshot.city,
        userSnapshot.school,
        userSnapshot.settings
    ].some((field) => {
        if (field && typeof field === 'object') return Object.keys(field).length > 0;
        return Boolean(String(field || '').trim());
    });

    return hasIdentity && hasProfileFields;
};

const readLocalPreferenceSnapshot = () => {
    const snapshot = {};

    LOCAL_PREFERENCE_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) snapshot[key] = value;
    });

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (snapshot[key] !== undefined) continue;
        if (key.startsWith('whalio_') || key.startsWith('whalio.')) {
            const value = localStorage.getItem(key);
            if (value !== null) snapshot[key] = value;
        }
    }

    return snapshot;
};

const restoreLocalPreferenceSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return;

    Object.entries(snapshot).forEach(([key, value]) => {
        if (typeof key !== 'string' || key.length === 0) return;
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return;
        }
        localStorage.setItem(key, String(value));
    });
};

const restoreLocalUserSnapshot = (userSnapshot) => {
    if (!userSnapshot || typeof userSnapshot !== 'object') return;

    try {
        const currentRaw = localStorage.getItem('user');
        const currentParsed = currentRaw ? JSON.parse(currentRaw) : {};
        const merged = { ...currentParsed, ...userSnapshot };
        localStorage.setItem('user', JSON.stringify(merged));
    } catch {
        localStorage.setItem('user', JSON.stringify(userSnapshot));
    }
};

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
            const combinedBackup = buildCompleteBackupPayload({
                serverData: result.data,
                username,
                localMusic
            });
            combinedBackup.localPreferences = readLocalPreferenceSnapshot();

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
            const parsedBackupData = JSON.parse(fileContent);
            const backupData = normalizeImportedBackupPayload(parsedBackupData);

            // Validate backup data
            if (backupData.app !== "Whalio") {
                throw new Error('File không phải là bản sao lưu Whalio hợp lệ!');
            }

            if (!backupData.exportDate) {
                throw new Error('File backup thiếu thông tin thời gian sao lưu.');
            }

            if (!hasEnoughUserData(backupData)) {
                throw new Error('File backup thiếu dữ liệu người dùng (user profile/settings).');
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

            restoreLocalUserSnapshot(backupData.userSnapshot);
            restoreLocalPreferenceSnapshot(backupData.localPreferences);
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
