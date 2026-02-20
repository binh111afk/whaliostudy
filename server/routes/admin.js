/**
 * ==================== ADMIN ROUTER ====================
 * Module quản lý người dùng dành cho Admin Panel
 * 
 * Endpoints:
 * - GET    /api/admin/users           : Lấy danh sách toàn bộ user
 * - PATCH  /api/admin/users/:id/lock  : Khóa/Mở khóa tài khoản
 * - POST   /api/admin/users/:id/reset : Reset mật khẩu
 * - GET    /api/admin/users/:id/logs  : Lịch sử hoạt động của user
 */

const express = require('express');
const router = express.Router();

// ==================== MOCK DATA - CHUẨN FIGMA ====================
const mockUsers = [
    {
        id: 'SV001234',
        fullName: 'Nguyễn Văn Anh',
        email: 'sv001234@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV001234',
        device: 'Lenovo LOQ',
        studyTime: '42h 15m',
        studyTimeMinutes: 2535,
        lastIP: '192.168.1.45',
        lastLogin: '2026-02-20T08:30:00Z',
        isLocked: false,
        role: 'student',
        createdAt: '2024-09-01T00:00:00Z',
        status: 'active'
    },
    {
        id: 'SV002345',
        fullName: 'Trần Thị Bình',
        email: 'sv002345@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV002345',
        device: 'MacBook Pro M3',
        studyTime: '38h 42m',
        studyTimeMinutes: 2322,
        lastIP: '10.0.0.128',
        lastLogin: '2026-02-19T14:22:00Z',
        isLocked: false,
        role: 'student',
        createdAt: '2024-09-05T00:00:00Z',
        status: 'active'
    },
    {
        id: 'SV003456',
        fullName: 'Lê Hoàng Cường',
        email: 'sv003456@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV003456',
        device: 'ASUS ROG Strix',
        studyTime: '56h 08m',
        studyTimeMinutes: 3368,
        lastIP: '172.16.0.55',
        lastLogin: '2026-02-20T10:15:00Z',
        isLocked: false,
        role: 'student',
        createdAt: '2024-08-28T00:00:00Z',
        status: 'active'
    },
    {
        id: 'SV004567',
        fullName: 'Phạm Minh Dũng',
        email: 'sv004567@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV004567',
        device: 'Dell XPS 15',
        studyTime: '12h 30m',
        studyTimeMinutes: 750,
        lastIP: '192.168.2.100',
        lastLogin: '2026-02-10T09:00:00Z',
        isLocked: true,
        role: 'student',
        createdAt: '2024-10-01T00:00:00Z',
        status: 'locked'
    },
    {
        id: 'SV005678',
        fullName: 'Hoàng Thị Hương',
        email: 'sv005678@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV005678',
        device: 'HP Pavilion',
        studyTime: '28h 55m',
        studyTimeMinutes: 1735,
        lastIP: '192.168.1.200',
        lastLogin: '2026-02-18T16:45:00Z',
        isLocked: false,
        role: 'student',
        createdAt: '2024-09-15T00:00:00Z',
        status: 'active'
    },
    {
        id: 'SV006789',
        fullName: 'Vũ Đức Khang',
        email: 'sv006789@student.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SV006789',
        device: 'Acer Nitro 5',
        studyTime: '65h 20m',
        studyTimeMinutes: 3920,
        lastIP: '10.10.10.88',
        lastLogin: '2026-02-20T07:00:00Z',
        isLocked: false,
        role: 'student',
        createdAt: '2024-08-20T00:00:00Z',
        status: 'active'
    },
    {
        id: 'AD000001',
        fullName: 'Admin Whalio',
        email: 'admin@whalio.edu.vn',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
        device: 'MacBook Pro M2 Max',
        studyTime: '0h 0m',
        studyTimeMinutes: 0,
        lastIP: '127.0.0.1',
        lastLogin: '2026-02-20T11:00:00Z',
        isLocked: false,
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        status: 'active'
    }
];

// ==================== MOCK ACTIVITY LOGS ====================
const mockActivityLogs = {
    'SV001234': [
        { id: 1, action: 'login', description: 'Đăng nhập thành công', ip: '192.168.1.45', device: 'Lenovo LOQ', timestamp: '2026-02-20T08:30:00Z' },
        { id: 2, action: 'study', description: 'Bắt đầu phiên học: Toán Cao Cấp', ip: '192.168.1.45', device: 'Lenovo LOQ', timestamp: '2026-02-20T08:35:00Z' },
        { id: 3, action: 'exam', description: 'Hoàn thành bài kiểm tra: Quiz Giải Tích', ip: '192.168.1.45', device: 'Lenovo LOQ', timestamp: '2026-02-20T09:15:00Z' },
        { id: 4, action: 'document', description: 'Tải lên tài liệu: Bài tập chương 5.pdf', ip: '192.168.1.45', device: 'Lenovo LOQ', timestamp: '2026-02-20T10:00:00Z' },
        { id: 5, action: 'logout', description: 'Đăng xuất', ip: '192.168.1.45', device: 'Lenovo LOQ', timestamp: '2026-02-20T12:00:00Z' }
    ],
    'SV002345': [
        { id: 1, action: 'login', description: 'Đăng nhập thành công', ip: '10.0.0.128', device: 'MacBook Pro M3', timestamp: '2026-02-19T14:22:00Z' },
        { id: 2, action: 'flashcard', description: 'Học Flashcard: Tiếng Anh Unit 5', ip: '10.0.0.128', device: 'MacBook Pro M3', timestamp: '2026-02-19T14:30:00Z' },
        { id: 3, action: 'ai_chat', description: 'Sử dụng AI Chat: Hỏi về Vật Lý', ip: '10.0.0.128', device: 'MacBook Pro M3', timestamp: '2026-02-19T15:00:00Z' }
    ],
    'SV003456': [
        { id: 1, action: 'login', description: 'Đăng nhập thành công', ip: '172.16.0.55', device: 'ASUS ROG Strix', timestamp: '2026-02-20T10:15:00Z' },
        { id: 2, action: 'study', description: 'Bắt đầu phiên học: Lập Trình Web', ip: '172.16.0.55', device: 'ASUS ROG Strix', timestamp: '2026-02-20T10:20:00Z' },
        { id: 3, action: 'deadline', description: 'Tạo deadline: Nộp bài tập React', ip: '172.16.0.55', device: 'ASUS ROG Strix', timestamp: '2026-02-20T10:45:00Z' }
    ],
    'SV004567': [
        { id: 1, action: 'login_failed', description: 'Đăng nhập thất bại - Sai mật khẩu', ip: '192.168.2.100', device: 'Dell XPS 15', timestamp: '2026-02-10T08:55:00Z' },
        { id: 2, action: 'login_failed', description: 'Đăng nhập thất bại - Sai mật khẩu', ip: '192.168.2.100', device: 'Dell XPS 15', timestamp: '2026-02-10T08:56:00Z' },
        { id: 3, action: 'account_locked', description: 'Tài khoản bị khóa do đăng nhập sai quá nhiều', ip: '192.168.2.100', device: 'Dell XPS 15', timestamp: '2026-02-10T09:00:00Z' }
    ],
    'SV005678': [
        { id: 1, action: 'login', description: 'Đăng nhập thành công', ip: '192.168.1.200', device: 'HP Pavilion', timestamp: '2026-02-18T16:45:00Z' },
        { id: 2, action: 'timetable', description: 'Cập nhật thời khóa biểu', ip: '192.168.1.200', device: 'HP Pavilion', timestamp: '2026-02-18T17:00:00Z' }
    ],
    'SV006789': [
        { id: 1, action: 'login', description: 'Đăng nhập thành công', ip: '10.10.10.88', device: 'Acer Nitro 5', timestamp: '2026-02-20T07:00:00Z' },
        { id: 2, action: 'study', description: 'Marathon học tập: 4 giờ liên tục', ip: '10.10.10.88', device: 'Acer Nitro 5', timestamp: '2026-02-20T07:05:00Z' },
        { id: 3, action: 'achievement', description: 'Đạt thành tích: Top learner tuần', ip: '10.10.10.88', device: 'Acer Nitro 5', timestamp: '2026-02-20T11:05:00Z' }
    ]
};

// ==================== API ENDPOINTS ====================

/**
 * GET /users
 * Lấy danh sách toàn bộ user
 * Query params:
 *   - search: Tìm kiếm theo tên/email/ID
 *   - status: Lọc theo trạng thái (active/locked/all)
 *   - role: Lọc theo role (student/admin/all)
 *   - sortBy: Sắp xếp theo trường (studyTime/lastLogin/createdAt)
 *   - order: Thứ tự (asc/desc)
 *   - page: Số trang
 *   - limit: Số lượng mỗi trang
 */
router.get('/users', (req, res) => {
    try {
        const { 
            search = '', 
            status = 'all', 
            role = 'all',
            sortBy = 'lastLogin',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        let filteredUsers = [...mockUsers];

        // Tìm kiếm
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.fullName.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.id.toLowerCase().includes(searchLower)
            );
        }

        // Lọc theo trạng thái
        if (status !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.status === status);
        }

        // Lọc theo role
        if (role !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }

        // Sắp xếp
        filteredUsers.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'studyTime':
                    comparison = a.studyTimeMinutes - b.studyTimeMinutes;
                    break;
                case 'lastLogin':
                    comparison = new Date(a.lastLogin) - new Date(b.lastLogin);
                    break;
                case 'createdAt':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                case 'fullName':
                    comparison = a.fullName.localeCompare(b.fullName);
                    break;
                default:
                    comparison = new Date(a.lastLogin) - new Date(b.lastLogin);
            }
            return order === 'desc' ? -comparison : comparison;
        });

        // Phân trang
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        // Thống kê tổng quan
        const stats = {
            totalUsers: mockUsers.length,
            activeUsers: mockUsers.filter(u => u.status === 'active').length,
            lockedUsers: mockUsers.filter(u => u.status === 'locked').length,
            totalStudyTime: mockUsers.reduce((acc, u) => acc + u.studyTimeMinutes, 0),
            onlineNow: Math.floor(Math.random() * 10) + 1 // Mock số người online
        };

        res.json({
            success: true,
            data: paginatedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(filteredUsers.length / parseInt(limit)),
                totalItems: filteredUsers.length,
                itemsPerPage: parseInt(limit)
            },
            stats
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách người dùng',
            error: error.message
        });
    }
});

/**
 * GET /users/:id
 * Lấy thông tin chi tiết một user
 */
router.get('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const user = mockUsers.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin người dùng',
            error: error.message
        });
    }
});

/**
 * PATCH /users/:id/lock
 * Đảo trạng thái khóa/mở khóa tài khoản
 */
router.patch('/users/:id/lock', (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body; // Lý do khóa (optional)
        
        const userIndex = mockUsers.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Không cho phép khóa admin
        if (mockUsers[userIndex].role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không thể khóa tài khoản Admin'
            });
        }

        // Đảo trạng thái
        const wasLocked = mockUsers[userIndex].isLocked;
        mockUsers[userIndex].isLocked = !wasLocked;
        mockUsers[userIndex].status = mockUsers[userIndex].isLocked ? 'locked' : 'active';

        // Thêm log activity
        const action = mockUsers[userIndex].isLocked ? 'account_locked' : 'account_unlocked';
        const description = mockUsers[userIndex].isLocked 
            ? `Tài khoản bị khóa bởi Admin${reason ? `: ${reason}` : ''}`
            : 'Tài khoản được mở khóa bởi Admin';

        if (!mockActivityLogs[id]) {
            mockActivityLogs[id] = [];
        }

        mockActivityLogs[id].push({
            id: mockActivityLogs[id].length + 1,
            action,
            description,
            ip: 'Admin Panel',
            device: 'Admin Dashboard',
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: mockUsers[userIndex].isLocked 
                ? 'Đã khóa tài khoản thành công' 
                : 'Đã mở khóa tài khoản thành công',
            data: {
                id: mockUsers[userIndex].id,
                isLocked: mockUsers[userIndex].isLocked,
                status: mockUsers[userIndex].status
            }
        });

    } catch (error) {
        console.error('❌ Error toggling user lock:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi khóa/mở khóa tài khoản',
            error: error.message
        });
    }
});

/**
 * POST /users/:id/reset
 * Reset mật khẩu về mặc định
 */
router.post('/users/:id/reset', (req, res) => {
    try {
        const { id } = req.params;
        const { sendEmail = true } = req.body; // Có gửi email thông báo không
        
        const user = mockUsers.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Generate mật khẩu mới (trong thực tế sẽ hash và lưu DB)
        const newPassword = generateRandomPassword();
        const maskedPassword = newPassword.substring(0, 3) + '****';

        // Thêm log activity
        if (!mockActivityLogs[id]) {
            mockActivityLogs[id] = [];
        }

        mockActivityLogs[id].push({
            id: mockActivityLogs[id].length + 1,
            action: 'password_reset',
            description: 'Mật khẩu được reset bởi Admin',
            ip: 'Admin Panel',
            device: 'Admin Dashboard',
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Reset mật khẩu thành công',
            data: {
                id: user.id,
                email: user.email,
                newPassword: maskedPassword, // Chỉ hiển thị một phần
                emailSent: sendEmail
            }
        });

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi reset mật khẩu',
            error: error.message
        });
    }
});

/**
 * GET /users/:id/logs
 * Lấy lịch sử hoạt động của user
 */
router.get('/users/:id/logs', (req, res) => {
    try {
        const { id } = req.params;
        const { 
            action = 'all', // Lọc theo loại action
            limit = 50,
            page = 1
        } = req.query;

        const user = mockUsers.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        let logs = mockActivityLogs[id] || [];

        // Lọc theo action type
        if (action !== 'all') {
            logs = logs.filter(log => log.action === action);
        }

        // Sắp xếp mới nhất lên đầu
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Phân trang
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedLogs = logs.slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email
                },
                logs: paginatedLogs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(logs.length / parseInt(limit)),
                    totalItems: logs.length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user logs:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử hoạt động',
            error: error.message
        });
    }
});

/**
 * GET /stats
 * Thống kê tổng quan cho Dashboard Admin
 */
router.get('/stats', (req, res) => {
    try {
        const totalStudyMinutes = mockUsers.reduce((acc, u) => acc + u.studyTimeMinutes, 0);
        const avgStudyMinutes = Math.round(totalStudyMinutes / mockUsers.length);
        
        const stats = {
            users: {
                total: mockUsers.length,
                active: mockUsers.filter(u => u.status === 'active').length,
                locked: mockUsers.filter(u => u.status === 'locked').length,
                students: mockUsers.filter(u => u.role === 'student').length,
                admins: mockUsers.filter(u => u.role === 'admin').length
            },
            studyTime: {
                total: formatMinutesToHours(totalStudyMinutes),
                totalMinutes: totalStudyMinutes,
                average: formatMinutesToHours(avgStudyMinutes),
                averageMinutes: avgStudyMinutes
            },
            activity: {
                onlineNow: Math.floor(Math.random() * 15) + 3,
                todayLogins: Math.floor(Math.random() * 50) + 20,
                weeklyActiveUsers: Math.floor(Math.random() * 100) + 50
            },
            topLearners: mockUsers
                .filter(u => u.role === 'student')
                .sort((a, b) => b.studyTimeMinutes - a.studyTimeMinutes)
                .slice(0, 5)
                .map(u => ({
                    id: u.id,
                    fullName: u.fullName,
                    studyTime: u.studyTime,
                    avatar: u.avatar
                }))
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê',
            error: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function generateRandomPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function formatMinutesToHours(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

module.exports = router;
