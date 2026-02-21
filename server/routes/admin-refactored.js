/**
 * ==================== ADMIN ROUTER (REFACTORED) ====================
 * Module quản lý Admin Panel cho Whalio Study
 * 
 * 🔄 VERSION: 2.0 - Kết nối Database thực tế (MongoDB)
 * 
 * 📋 MODULES:
 * 1. User Management - Quản lý người dùng (MongoDB)
 * 2. Security Monitoring - Giám sát bảo mật (Real-time CPU/RAM + MongoDB)
 * 3. Statistics - Thống kê & Analytics (MongoDB Aggregation)
 * 4. Database Backup - Sao lưu hệ thống (MongoDB + File System)
 * 5. Maintenance - Bảo trì hệ thống (MongoDB SystemSettings)
 * 
 * 🔧 USAGE:
 * const adminRouter = require('./routes/admin-refactored');
 * app.use(adminRouter.maintenanceCheck);
 * app.use('/api/admin', adminRouter);
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==================== IMPORT MODELS ====================
// Models được định nghĩa trong server/index.js
let User, Document, Exam, Post, Timetable, StudySession;
let BlacklistIP, SystemSettings, SystemEvent, UserActivityLog, BackupRecord;

// Lazy load models để tránh circular dependency
function getModels() {
    if (!User) {
        User = mongoose.model('User');
        Document = mongoose.model('Document');
        Exam = mongoose.model('Exam');
        Post = mongoose.model('Post');
        Timetable = mongoose.model('Timetable');
        StudySession = mongoose.model('StudySession');
        BlacklistIP = mongoose.model('BlacklistIP');
        SystemSettings = mongoose.model('SystemSettings');
        SystemEvent = mongoose.model('SystemEvent');
        UserActivityLog = mongoose.model('UserActivityLog');
        BackupRecord = mongoose.model('BackupRecord');
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format minutes sang "Xh Ym"
 */
function formatMinutesToHours(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

/**
 * Format bytes sang KB/MB/GB
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function normalizeIp(rawValue) {
    let ip = String(rawValue || '').trim();
    if (!ip) return '';

    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }
    if (ip === '::1') {
        return '127.0.0.1';
    }
    return ip;
}

/**
 * Generate random password
 */
function generateRandomPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Log System Event to database
 */
async function logSystemEvent(type, severity, title, description, details = {}, performedBy = 'System') {
    try {
        getModels();
        await SystemEvent.create({
            type,
            severity,
            title,
            description,
            details,
            performedBy
        });
    } catch (err) {
        console.error('❌ Error logging system event:', err);
    }
}

/**
 * Get or create system setting
 */
async function getSystemSetting(key, defaultValue = null) {
    getModels();
    let setting = await SystemSettings.findOne({ key });
    if (!setting && defaultValue !== null) {
        setting = await SystemSettings.create({ key, value: defaultValue });
    }
    return setting ? setting.value : defaultValue;
}

/**
 * Update system setting
 */
async function updateSystemSetting(key, value, updatedBy = 'System') {
    getModels();
    return await SystemSettings.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date(), updatedBy },
        { upsert: true, new: true }
    );
}

// ==================== SECURITY LOGGER MIDDLEWARE ====================
const securityLogger = async (req, res, next) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? JSON.stringify(req.body) : null
    };
    console.log('🔐 [SECURITY LOG]', JSON.stringify(logEntry));
    next();
};

function logDeniedAdminRouteAccess(req, reason) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]
        : Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : '';
    const ip = normalizeIp(forwardedIp || req.ip || req.connection?.remoteAddress) || 'unknown';
    const username = req.user?.username || 'anonymous';
    const userId = req.user?.userId || null;

    console.warn('🚫 [ADMIN ROUTER ACCESS DENIED]', JSON.stringify({
        timestamp: new Date().toISOString(),
        reason,
        method: req.method,
        endpoint: req.originalUrl || req.url || req.path,
        ip,
        user: username,
        userId
    }));
}

// Defense in depth: mọi admin endpoint phải có req.user role=admin.
// Nếu router bị mount sai ở nơi khác, guard này vẫn chặn truy cập trái phép.
const adminRouteGuard = (req, res, next) => {
    if (!req.user) {
        logDeniedAdminRouteAccess(req, 'missing_authenticated_user_on_admin_router');
        return res.status(401).json({
            success: false,
            data: null,
            message: '⛔ Chưa xác thực! Vui lòng đăng nhập.'
        });
    }

    if (req.user.role !== 'admin') {
        logDeniedAdminRouteAccess(req, 'insufficient_role_not_admin_on_admin_router');
        return res.status(403).json({
            success: false,
            data: null,
            message: '⛔ Bạn không có quyền Admin để truy cập endpoint này!'
        });
    }

    return next();
};

router.use(adminRouteGuard);

// ==================== MODULE 1: USER MANAGEMENT ====================

/**
 * GET /users
 * Lấy danh sách users từ MongoDB
 */
router.get('/users', async (req, res) => {
    try {
        getModels();
        const {
            search = '',
            status = 'all',
            role = 'all',
            sortBy = 'lastLogin',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Build query
        let query = {};

        // Search
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by status
        if (status !== 'all') {
            query.status = status;
        }

        // Filter by role
        if (role !== 'all') {
            query.role = role === 'student' ? 'member' : role;
        }

        // Build sort
        let sort = {};
        switch (sortBy) {
            case 'studyTime':
                sort.totalStudyMinutes = order === 'desc' ? -1 : 1;
                break;
            case 'lastLogin':
                sort.lastLogin = order === 'desc' ? -1 : 1;
                break;
            case 'createdAt':
                sort.createdAt = order === 'desc' ? -1 : 1;
                break;
            case 'fullName':
                sort.fullName = order === 'desc' ? -1 : 1;
                break;
            default:
                sort.lastLogin = -1;
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [users, totalCount] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        const usernames = users
            .map((user) => String(user.username || '').trim())
            .filter(Boolean);

        const uploadedFileStats = usernames.length > 0
            ? await Document.aggregate([
                { $match: { uploaderUsername: { $in: usernames } } },
                { $group: { _id: '$uploaderUsername', count: { $sum: 1 } } }
            ])
            : [];

        const uploadedFilesByUsername = uploadedFileStats.reduce((acc, item) => {
            const username = String(item?._id || '').trim();
            if (username) {
                acc[username] = Number(item?.count || 0);
            }
            return acc;
        }, {});

        // Get stats
        const [totalUsers, activeUsers, lockedUsers] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ status: 'locked' })
        ]);

        // Calculate total study time
        const studyTimeAgg = await User.aggregate([
            { $group: { _id: null, total: { $sum: '$totalStudyMinutes' } } }
        ]);
        const totalStudyMinutes = studyTimeAgg[0]?.total || 0;

        // Format users for response
        const formattedUsers = users.map(user => {
            const normalizedIP = normalizeIp(user.lastIP);
            const geo = (!user.lastCountry && normalizedIP) ? geoip.lookup(normalizedIP) : null;
            const lastCountry = user.lastCountry || String(geo?.country || '').trim();
            const lastCity = user.lastCity || String(geo?.city || '').trim();
            const location = [lastCity, lastCountry].filter(Boolean).join(', ') || 'Không xác định';

            return {
                id: user._id.toString(),
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
                device: user.lastDevice || 'Unknown',
                studyTime: formatMinutesToHours(user.totalStudyMinutes || 0),
                studyTimeMinutes: user.totalStudyMinutes || 0,
                lastIP: user.lastIP || 'N/A',
                lastCountry,
                lastCity,
                location,
                lastLogin: user.lastLogin,
                uploadedFilesCount: uploadedFilesByUsername[user.username] || 0,
                isLocked: user.isLocked || false,
                role: user.role === 'member' ? 'student' : user.role,
                createdAt: user.createdAt,
                status: user.status || 'active'
            };
        });

        res.json({
            success: true,
            data: formattedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalItems: totalCount,
                itemsPerPage: parseInt(limit)
            },
            stats: {
                totalUsers,
                activeUsers,
                lockedUsers,
                totalStudyTime: totalStudyMinutes,
                onlineNow: Math.floor(Math.random() * 10) + 1 // TODO: Implement real online tracking
            },
            message: 'Lấy danh sách người dùng thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /users/:id
 * Lấy thông tin chi tiết một user
 */
router.get('/users/:id', async (req, res) => {
    try {
        getModels();
        const { id } = req.params;

        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('-password').lean();
        } else {
            user = await User.findOne({ username: id }).select('-password').lean();
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy người dùng'
            });
        }

        const lastCountry = user.lastCountry || '';
        const lastCity = user.lastCity || '';
        const location = [lastCity, lastCountry].filter(Boolean).join(', ') || 'Không xác định';

        const formattedUser = {
            id: user._id.toString(),
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
            device: user.lastDevice || 'Unknown',
            studyTime: formatMinutesToHours(user.totalStudyMinutes || 0),
            studyTimeMinutes: user.totalStudyMinutes || 0,
            lastIP: user.lastIP || 'N/A',
            lastCountry,
            lastCity,
            location,
            lastLogin: user.lastLogin,
            isLocked: user.isLocked || false,
            role: user.role === 'member' ? 'student' : user.role,
            createdAt: user.createdAt,
            status: user.status || 'active'
        };

        res.json({
            success: true,
            data: formattedUser,
            message: 'Lấy thông tin người dùng thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * PATCH /users/:id/lock
 * Khóa/Mở khóa tài khoản
 */
router.patch('/users/:id/lock', async (req, res) => {
    try {
        getModels();
        const { id } = req.params;
        const { reason } = req.body;

        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id);
        } else {
            user = await User.findOne({ username: id });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Không cho phép khóa admin
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                data: null,
                message: 'Không thể khóa tài khoản Admin'
            });
        }

        // Toggle lock status
        const wasLocked = user.isLocked;
        user.isLocked = !wasLocked;
        user.status = user.isLocked ? 'locked' : 'active';
        user.updatedAt = new Date();
        await user.save();

        // Log activity
        const action = user.isLocked ? 'account_locked' : 'account_unlocked';
        const description = user.isLocked
            ? `Tài khoản bị khóa bởi Admin${reason ? `: ${reason}` : ''}`
            : 'Tài khoản được mở khóa bởi Admin';

        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action,
            description,
            ip: 'Admin Panel',
            device: 'Admin Dashboard'
        });

        // Log system event
        await logSystemEvent(
            'security',
            user.isLocked ? 'warning' : 'success',
            user.isLocked ? 'Tài khoản bị khóa' : 'Tài khoản được mở khóa',
            `User ${user.username} - ${description}`,
            { userId: user._id, reason },
            'Admin'
        );

        res.json({
            success: true,
            data: {
                id: user._id.toString(),
                isLocked: user.isLocked,
                status: user.status
            },
            message: user.isLocked
                ? 'Đã khóa tài khoản thành công'
                : 'Đã mở khóa tài khoản thành công'
        });

    } catch (error) {
        console.error('❌ Error toggling user lock:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * POST /users/:id/reset
 * Reset mật khẩu
 */
router.post('/users/:id/reset', async (req, res) => {
    try {
        getModels();
        const { id } = req.params;
        const { sendEmail = true } = req.body;

        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id);
        } else {
            user = await User.findOne({ username: id });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Generate new password
        const newPassword = generateRandomPassword();
        const maskedPassword = newPassword.substring(0, 3) + '****';

        // Update password (In production, hash it!)
        user.password = newPassword;
        user.updatedAt = new Date();
        await user.save();

        // Log activity
        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action: 'password_reset',
            description: 'Mật khẩu được reset bởi Admin',
            ip: 'Admin Panel',
            device: 'Admin Dashboard'
        });

        // Log system event
        await logSystemEvent(
            'security',
            'warning',
            'Password Reset',
            `Mật khẩu của ${user.username} đã được reset`,
            { userId: user._id, email: user.email },
            'Admin'
        );

        res.json({
            success: true,
            data: {
                id: user._id.toString(),
                email: user.email,
                newPassword: maskedPassword,
                emailSent: sendEmail
            },
            message: 'Reset mật khẩu thành công'
        });

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /users/:id/logs
 * Lấy lịch sử hoạt động của user từ MongoDB
 */
router.get('/users/:id/logs', async (req, res) => {
    try {
        getModels();
        const { id } = req.params;
        const {
            action = 'all',
            limit = 50,
            page = 1
        } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('_id username fullName email lastCity lastCountry').lean();
        } else {
            user = await User.findOne({ username: id }).select('_id username fullName email lastCity lastCountry').lean();
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Build query: ưu tiên cả userId và username để không mất log legacy
        const query = {
            $or: [
                { userId: user._id },
                { username: user.username }
            ]
        };

        if (action !== 'all') {
            query.action = action;
        }

        // Execute query with pagination
        const skip = (parsedPage - 1) * parsedLimit;
        const [logs, totalCount] = await Promise.all([
            UserActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            UserActivityLog.countDocuments(query)
        ]);

        // Format logs
        const defaultLocation = [String(user.lastCity || '').trim(), String(user.lastCountry || '').trim()]
            .filter(Boolean)
            .join(', ');

        const formattedLogs = logs.map((log) => {
            const metadata = (log && typeof log.metadata === 'object' && log.metadata !== null) ? log.metadata : {};
            const metadataCity = String(metadata.lastCity || metadata.city || '').trim();
            const metadataCountry = String(metadata.lastCountry || metadata.country || '').trim();
            const location = [metadataCity, metadataCountry].filter(Boolean).join(', ') || defaultLocation;
            const descriptionWithLocation = location
                ? `${log.description} (Location: ${location})`
                : log.description;

            return {
            id: log._id.toString(),
            action: log.action,
            description: descriptionWithLocation,
            ip: log.ip || '',
            device: log.device || '',
            createdAt: log.createdAt,
            timestamp: log.createdAt
        };
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    lastCity: String(user.lastCity || '').trim(),
                    lastCountry: String(user.lastCountry || '').trim()
                },
                logs: formattedLogs,
                pagination: {
                    currentPage: parsedPage,
                    totalPages: Math.ceil(totalCount / parsedLimit),
                    totalItems: totalCount,
                    itemsPerPage: parsedLimit
                }
            },
            message: 'Lấy lịch sử hoạt động thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching user logs:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /stats (User stats)
 * Thống kê tổng quan người dùng
 */
router.get('/stats', async (req, res) => {
    try {
        getModels();

        // Aggregate statistics
        const [
            totalUsers,
            activeUsers,
            lockedUsers,
            adminCount,
            memberCount,
            studyTimeAgg,
            topLearners
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ status: 'locked' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'member' }),
            User.aggregate([
                { $group: { _id: null, total: { $sum: '$totalStudyMinutes' } } }
            ]),
            User.find({ role: 'member' })
                .sort({ totalStudyMinutes: -1 })
                .limit(5)
                .select('fullName username totalStudyMinutes avatar')
                .lean()
        ]);

        const totalStudyMinutes = studyTimeAgg[0]?.total || 0;
        const avgStudyMinutes = totalUsers > 0 ? Math.round(totalStudyMinutes / totalUsers) : 0;

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    locked: lockedUsers,
                    students: memberCount,
                    admins: adminCount
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
                topLearners: topLearners.map(u => ({
                    id: u._id.toString(),
                    fullName: u.fullName,
                    studyTime: formatMinutesToHours(u.totalStudyMinutes || 0),
                    avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
                }))
            },
            message: 'Lấy thống kê thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

// ==================== MODULE 2: SECURITY MONITORING ====================

/**
 * GET /security/traffic
 * Lấy dữ liệu traffic (Simulated based on real request logs)
 */
router.get('/security/traffic', securityLogger, async (req, res) => {
    try {
        getModels();
        const { timeRange = '30m' } = req.query;

        // Get real login count from last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const loginCount = await UserActivityLog.countDocuments({
            action: 'login',
            createdAt: { $gte: oneHourAgo }
        });

        // Generate traffic data based on real activity
        const baseRequests = loginCount * 15; // Estimate 15 requests per login
        const now = new Date();
        const chart = [];

        for (let i = 6; i >= 0; i--) {
            const time = new Date(now - i * 5 * 60 * 1000);
            const timeStr = time.toTimeString().substring(0, 5);
            chart.push({
                time: timeStr,
                requests: Math.floor(baseRequests * (0.5 + Math.random() * 0.5))
            });
        }

        const data = {
            currentRequests: chart[chart.length - 1].requests,
            averageRequests: Math.round(chart.reduce((a, b) => a + b.requests, 0) / chart.length),
            peakRequests: Math.max(...chart.map(c => c.requests)),
            timeRange: `${chart[0].time} - ${chart[chart.length - 1].time}`,
            chart,
            breakdown: {
                api: Math.floor(baseRequests * 0.6),
                static: Math.floor(baseRequests * 0.3),
                websocket: Math.floor(baseRequests * 0.1)
            },
            statusCodes: {
                '2xx': Math.floor(baseRequests * 0.94),
                '3xx': Math.floor(baseRequests * 0.02),
                '4xx': Math.floor(baseRequests * 0.03),
                '5xx': Math.floor(baseRequests * 0.01)
            }
        };

        res.json({
            success: true,
            data,
            message: 'Lấy dữ liệu traffic thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching traffic:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /security/suspicious-ips
 * Lấy danh sách IP từ MongoDB BlacklistIP collection
 */
router.get('/security/suspicious-ips', securityLogger, async (req, res) => {
    try {
        getModels();
        const {
            attackType = 'all',
            status = 'all',
            sortBy = 'attempts',
            order = 'desc'
        } = req.query;

        // Build query
        let query = {};
        if (attackType !== 'all') {
            query.attackType = attackType;
        }
        if (status !== 'all') {
            query.status = status;
        }

        // Build sort
        let sort = {};
        if (sortBy === 'attempts') {
            sort.attempts = order === 'desc' ? -1 : 1;
        } else if (sortBy === 'lastSeen') {
            sort.lastSeen = order === 'desc' ? -1 : 1;
        }

        const [ips, stats] = await Promise.all([
            BlacklistIP.find(query).sort(sort).lean(),
            BlacklistIP.aggregate([
                {
                    $group: {
                        _id: '$attackType',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const totalBlocked = await BlacklistIP.countDocuments({ status: 'blocked' });
        const totalActive = await BlacklistIP.countDocuments({ status: 'active' });

        // Format response
        const formattedIPs = ips.map(ip => ({
            id: ip._id.toString(),
            ip: ip.ip,
            attackType: ip.attackType,
            attempts: ip.attempts,
            firstSeen: ip.firstSeen,
            lastSeen: ip.lastSeen,
            targetEndpoint: ip.targetEndpoint,
            status: ip.status,
            country: ip.country,
            isp: ip.isp,
            isBlocked: ip.status === 'blocked'
        }));

        const byType = {};
        stats.forEach(s => {
            byType[s._id] = s.count;
        });

        res.json({
            success: true,
            data: {
                ips: formattedIPs,
                stats: {
                    totalSuspicious: ips.length,
                    blocked: totalBlocked,
                    active: totalActive,
                    byType
                }
            },
            message: 'Lấy danh sách IP đáng ngờ thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching suspicious IPs:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * POST /security/ips/block
 * Chặn IP - Lưu vào MongoDB
 */
router.post('/security/ips/block', securityLogger, async (req, res) => {
    try {
        getModels();
        const { ips, reason, attackType = 'Other' } = req.body;

        if (!ips || !Array.isArray(ips) || ips.length === 0) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Vui lòng cung cấp danh sách IP cần chặn'
            });
        }

        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const invalidIPs = ips.filter(ip => !ipRegex.test(ip));
        if (invalidIPs.length > 0) {
            return res.status(400).json({
                success: false,
                data: null,
                message: `IP không hợp lệ: ${invalidIPs.join(', ')}`
            });
        }

        const newlyBlocked = [];
        const alreadyBlocked = [];

        for (const ip of ips) {
            const existing = await BlacklistIP.findOne({ ip });
            if (existing) {
                if (existing.status === 'blocked') {
                    alreadyBlocked.push(ip);
                } else {
                    existing.status = 'blocked';
                    existing.blockedAt = new Date();
                    existing.blockedBy = 'Admin';
                    existing.reason = reason || '';
                    await existing.save();
                    newlyBlocked.push(ip);
                }
            } else {
                await BlacklistIP.create({
                    ip,
                    attackType,
                    status: 'blocked',
                    blockedAt: new Date(),
                    blockedBy: 'Admin',
                    reason: reason || ''
                });
                newlyBlocked.push(ip);
            }
        }

        if (newlyBlocked.length > 0) {
            console.log(`🚫 Đã chặn truy cập từ các IP: [${newlyBlocked.join(', ')}]`);
            await logSystemEvent(
                'security',
                'warning',
                'IP Blocked',
                `Đã chặn ${newlyBlocked.length} IP`,
                { ips: newlyBlocked, reason },
                'Admin'
            );
        }

        const totalBlocked = await BlacklistIP.countDocuments({ status: 'blocked' });

        res.json({
            success: true,
            data: {
                blocked: newlyBlocked,
                alreadyBlocked,
                totalBlocked
            },
            message: newlyBlocked.length > 0
                ? `Đã chặn truy cập từ các IP: [${newlyBlocked.join(', ')}]`
                : 'Tất cả IP đã có trong danh sách chặn'
        });

    } catch (error) {
        console.error('❌ Error blocking IPs:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * DELETE /security/ips/unblock
 * Bỏ chặn IP
 */
router.delete('/security/ips/unblock', securityLogger, async (req, res) => {
    try {
        getModels();
        const { ips } = req.body;

        if (!ips || !Array.isArray(ips) || ips.length === 0) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Vui lòng cung cấp danh sách IP cần bỏ chặn'
            });
        }

        const result = await BlacklistIP.updateMany(
            { ip: { $in: ips }, status: 'blocked' },
            { status: 'active', blockedAt: null, blockedBy: null }
        );

        console.log(`✅ Đã bỏ chặn ${result.modifiedCount} IP`);

        const totalBlocked = await BlacklistIP.countDocuments({ status: 'blocked' });

        res.json({
            success: true,
            data: {
                unblocked: result.modifiedCount,
                totalBlocked
            },
            message: `Đã bỏ chặn ${result.modifiedCount} IP`
        });

    } catch (error) {
        console.error('❌ Error unblocking IPs:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /security/server-status
 * Lấy thông số REAL-TIME của Server (CPU, RAM, Disk)
 */
router.get('/security/server-status', securityLogger, async (req, res) => {
    try {
        getModels();

        // Get REAL system info using Node.js os module
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const uptime = os.uptime();

        // Calculate CPU usage
        let totalIdle = 0, totalTick = 0;
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        const cpuUsage = Math.round(100 - (totalIdle / totalTick * 100));

        // RAM usage
        const ramUsage = Math.round((usedMemory / totalMemory) * 100);

        // Format uptime
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const uptimeStr = `${days} ngày ${hours} giờ`;

        // Get deploy info from system settings
        const deployInfo = await getSystemSetting('lastDeploy', {
            version: 'v1.0.0',
            time: new Date().toISOString(),
            totalPushes: 0
        });

        // Get total pushes (could be from git or stored value)
        const totalPushes = deployInfo.totalPushes || 557;

        const status = {
            cpu: cpuUsage,
            ram: ramUsage,
            disk: 34, // TODO: Implement disk usage check
            uptime: uptimeStr,
            uptimeSeconds: uptime,
            totalPushes,
            lastDeployTime: deployInfo.time,
            lastDeployVersion: deployInfo.version,
            stableVersion: 'v2.4.0',
            nodeVersion: process.version,
            platform: `${os.type()} ${os.release()}`,
            hostname: os.hostname(),
            network: {
                inbound: '245 MB/s',
                outbound: '128 MB/s'
            },
            activeConnections: Math.floor(Math.random() * 100) + 50,
            processMemory: formatBytes(process.memoryUsage().heapUsed)
        };

        // Calculate health score
        const healthScore = Math.round(100 - (cpuUsage * 0.3 + ramUsage * 0.4 + 34 * 0.3));
        status.healthScore = healthScore;
        status.healthStatus = healthScore >= 70 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical';

        res.json({
            success: true,
            data: status,
            message: 'Lấy trạng thái server thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching server status:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * POST /security/rollback
 * Rollback server (Simulated)
 */
router.post('/security/rollback', securityLogger, async (req, res) => {
    try {
        getModels();
        const { confirmRollback, targetVersion } = req.body;

        const deployInfo = await getSystemSetting('lastDeploy', {
            version: 'v2.4.1',
            stableVersion: 'v2.4.0',
            totalPushes: 557
        });

        if (!confirmRollback) {
            return res.status(400).json({
                success: false,
                data: {
                    currentVersion: deployInfo.version,
                    stableVersion: deployInfo.stableVersion,
                    totalPushes: deployInfo.totalPushes
                },
                message: 'Vui lòng xác nhận rollback bằng { confirmRollback: true }'
            });
        }

        const rollbackVersion = targetVersion || deployInfo.stableVersion;

        console.log(`🔄 Hệ thống đang thực hiện Rollback về phiên bản ổn định gần nhất (Dựa trên mốc ${deployInfo.totalPushes} lần push)`);

        // Update deploy info
        await updateSystemSetting('lastDeploy', {
            ...deployInfo,
            version: rollbackVersion,
            time: new Date().toISOString()
        }, 'Admin');

        // Log system event
        await logSystemEvent(
            'rollback',
            'warning',
            'System Rollback',
            `Rolled back to ${rollbackVersion}`,
            { previousVersion: deployInfo.version, rolledBackTo: rollbackVersion },
            'Admin'
        );

        res.json({
            success: true,
            data: {
                previousVersion: deployInfo.version,
                rolledBackTo: rollbackVersion,
                totalPushes: deployInfo.totalPushes,
                rollbackTime: new Date().toISOString(),
                status: 'completed'
            },
            message: `Hệ thống đang thực hiện Rollback về phiên bản ổn định gần nhất (Dựa trên mốc ${deployInfo.totalPushes} lần push)`
        });

    } catch (error) {
        console.error('❌ Error rollback:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /security/events
 * Lấy log sự kiện từ MongoDB
 */
router.get('/security/events', securityLogger, async (req, res) => {
    try {
        getModels();
        const {
            type = 'all',
            severity = 'all',
            limit = 20,
            page = 1
        } = req.query;

        let query = {};
        if (type !== 'all') query.type = type;
        if (severity !== 'all') query.severity = severity;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [events, totalCount, stats] = await Promise.all([
            SystemEvent.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SystemEvent.countDocuments(query),
            SystemEvent.aggregate([
                {
                    $facet: {
                        byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
                        bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }]
                    }
                }
            ])
        ]);

        // Format events with relative time
        const formattedEvents = events.map(e => {
            const now = new Date();
            const eventTime = new Date(e.createdAt);
            const diffMs = now - eventTime;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            let relativeTime;
            if (diffHours < 1) relativeTime = 'Vừa xong';
            else if (diffHours < 24) relativeTime = `${diffHours} giờ trước`;
            else relativeTime = `${diffDays} ngày trước`;

            return {
                id: e._id.toString(),
                type: e.type,
                severity: e.severity,
                title: e.title,
                description: e.description,
                timestamp: e.createdAt,
                relativeTime,
                details: e.details
            };
        });

        // Format stats
        const byType = {};
        const bySeverity = {};
        if (stats[0]) {
            stats[0].byType.forEach(s => byType[s._id] = s.count);
            stats[0].bySeverity.forEach(s => bySeverity[s._id] = s.count);
        }

        res.json({
            success: true,
            data: {
                events: formattedEvents,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalItems: totalCount
                },
                stats: {
                    total: totalCount,
                    byType,
                    bySeverity
                }
            },
            message: 'Lấy danh sách sự kiện thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching events:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /security/blacklist
 */
router.get('/security/blacklist', securityLogger, async (req, res) => {
    try {
        getModels();
        const blockedIPs = await BlacklistIP.find({ status: 'blocked' }).select('ip').lean();

        res.json({
            success: true,
            data: {
                blockedIPs: blockedIPs.map(b => b.ip),
                total: blockedIPs.length
            },
            message: 'Lấy danh sách blacklist thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching blacklist:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

// ==================== MODULE 3: STATISTICS ====================

/**
 * GET /stats/overview
 * Thống kê tổng quan từ MongoDB Aggregation
 */
router.get('/stats/overview', async (req, res) => {
    try {
        getModels();
        const { period = 'month' } = req.query;

        // Get current month stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [
            totalUsers,
            usersLastMonth,
            totalDocs,
            docsLastMonth,
            totalSubjects,
            domesticUsersVN
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $lt: startOfMonth } }),
            Document.countDocuments({}),
            Document.countDocuments({ createdAt: { $lt: startOfMonth } }),
            Timetable.distinct('subject').then(arr => arr.length),
            User.countDocuments({ lastCountry: { $regex: /^VN$/i } })
        ]);

        const internationalUsers = Math.max(0, totalUsers - domesticUsersVN);

        // Calculate growth percentages
        const userGrowth = usersLastMonth > 0 ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100) : 100;
        const docGrowth = docsLastMonth > 0 ? Math.round(((totalDocs - docsLastMonth) / docsLastMonth) * 100) : 100;

        const overview = {
            totalUsers: {
                value: totalUsers,
                growth: userGrowth,
                label: 'Tổng người dùng',
                formatted: totalUsers.toLocaleString(),
                growthText: `${userGrowth >= 0 ? '+' : ''}${userGrowth}%`
            },
            newDocuments: {
                value: totalDocs,
                growth: docGrowth,
                label: 'Tài liệu mới',
                formatted: totalDocs.toLocaleString(),
                growthText: `${docGrowth >= 0 ? '+' : ''}${docGrowth}%`
            },
            totalSubjects: {
                value: totalSubjects,
                growth: 8,
                label: 'Môn học',
                formatted: totalSubjects.toLocaleString(),
                growthText: '+8%'
            },
            domesticUsersVN: {
                value: domesticUsersVN,
                growth: 0,
                label: 'User trong nước (VN)',
                formatted: domesticUsersVN.toLocaleString(),
                growthText: '0%'
            },
            internationalUsers: {
                value: internationalUsers,
                growth: 0,
                label: 'User quốc tế',
                formatted: internationalUsers.toLocaleString(),
                growthText: '0%'
            }
        };

        res.json({
            success: true,
            data: {
                metrics: overview,
                summary: {
                    period,
                    userLocation: {
                        domesticVN: domesticUsersVN,
                        international: internationalUsers
                    }
                }
            },
            message: 'Lấy dữ liệu tổng quan thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching overview:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /stats/growth-chart
 * Dữ liệu tăng trưởng theo tháng
 */
router.get('/stats/growth-chart', async (req, res) => {
    try {
        getModels();
        const { metric = 'users', months = 7 } = req.query;

        const now = new Date();
        const chartData = [];

        for (let i = parseInt(months) - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthLabel = `T${monthStart.getMonth() + 1}`;

            let value;
            if (metric === 'users' || metric === 'all') {
                value = await User.countDocuments({ createdAt: { $lte: monthEnd } });
            } else if (metric === 'documents') {
                value = await Document.countDocuments({ createdAt: { $lte: monthEnd } });
            }

            chartData.push({
                label: monthLabel,
                month: `Tháng ${monthStart.getMonth() + 1}`,
                value
            });
        }

        const values = chartData.map(d => d.value);
        const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
            growthRate: values[0] > 0 ? Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100) : 100
        };

        res.json({
            success: true,
            data: {
                chart: chartData,
                stats,
                meta: { metric, period: `${months} tháng gần nhất` }
            },
            message: 'Lấy dữ liệu biểu đồ tăng trưởng thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching growth chart:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /stats/popular-subjects
 * Môn học phổ biến từ Timetable collection
 */
router.get('/stats/popular-subjects', async (req, res) => {
    try {
        getModels();
        const { limit = 5 } = req.query;

        // Aggregate subjects by count
        const subjects = await Timetable.aggregate([
            { $group: { _id: '$subject', students: { $addToSet: '$username' } } },
            { $project: { name: '$_id', students: { $size: '$students' } } },
            { $sort: { students: -1 } },
            { $limit: parseInt(limit) }
        ]);

        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
        const totalStudents = subjects.reduce((sum, s) => sum + s.students, 0);

        const formattedSubjects = subjects.map((s, i) => ({
            id: i + 1,
            name: s.name,
            students: s.students,
            color: colors[i % colors.length],
            percentage: Math.round((s.students / totalStudents) * 100)
        }));

        res.json({
            success: true,
            data: {
                subjects: formattedSubjects,
                chartData: formattedSubjects.map(s => ({
                    label: s.name,
                    value: s.students,
                    percentage: s.percentage,
                    color: s.color
                })),
                summary: {
                    totalSubjects: subjects.length,
                    totalStudents
                }
            },
            message: 'Lấy danh sách môn học phổ biến thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching popular subjects:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /stats/weekly-activity
 * Hoạt động theo tuần từ UserActivityLog
 */
router.get('/stats/weekly-activity', async (req, res) => {
    try {
        getModels();
        const { breakdown = false } = req.query;

        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Aggregate by day of week
        const activityByDay = await UserActivityLog.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo } } },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    total: { $sum: 1 },
                    logins: { $sum: { $cond: [{ $eq: ['$action', 'login'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in all days
        const activityData = [];
        for (let i = 1; i <= 7; i++) {
            const dayIndex = i % 7;
            const dayData = activityByDay.find(d => d._id === i) || { total: 0, logins: 0 };
            activityData.push({
                label: days[dayIndex],
                day: dayNames[dayIndex],
                value: dayData.total,
                logins: dayData.logins
            });
        }

        // Reorder to start from Monday
        const reordered = [...activityData.slice(1), activityData[0]];

        const values = reordered.map(d => d.value);
        const total = values.reduce((a, b) => a + b, 0);

        res.json({
            success: true,
            data: {
                activity: reordered,
                stats: {
                    total,
                    average: Math.round(total / 7),
                    peak: {
                        day: reordered.find(d => d.value === Math.max(...values))?.day || 'N/A',
                        value: Math.max(...values)
                    }
                }
            },
            message: 'Lấy dữ liệu hoạt động tuần thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching weekly activity:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /stats/dashboard
 * Tổng hợp tất cả stats
 */
router.get('/stats/dashboard', async (req, res) => {
    try {
        getModels();

        const [totalUsers, totalDocs, totalSubjects, topLearners] = await Promise.all([
            User.countDocuments({}),
            Document.countDocuments({}),
            Timetable.distinct('subject').then(arr => arr.length),
            User.find({ role: 'member' })
                .sort({ totalStudyMinutes: -1 })
                .limit(5)
                .select('fullName username totalStudyMinutes avatar')
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers: { value: totalUsers, growth: 23 },
                    newDocuments: { value: totalDocs, growth: 15 },
                    totalSubjects: { value: totalSubjects, growth: 8 }
                },
                topLearners: topLearners.map(u => ({
                    fullName: u.fullName,
                    studyTime: formatMinutesToHours(u.totalStudyMinutes || 0),
                    avatar: u.avatar
                }))
            },
            message: 'Lấy dữ liệu dashboard thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

// ==================== MODULE 4: DATABASE BACKUP ====================

/**
 * GET /backups
 * Lấy danh sách backup từ MongoDB
 */
router.get('/backups', async (req, res) => {
    try {
        getModels();
        const { type = 'all', page = 1, limit = 10 } = req.query;

        let query = {};
        if (type !== 'all') {
            query.type = type === 'auto' ? 'Tự động' : 'Thủ công';
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [backups, totalCount, settings] = await Promise.all([
            BackupRecord.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            BackupRecord.countDocuments(query),
            getSystemSetting('backupSettings', {
                autoBackup: true,
                schedule: 'Hàng ngày 03:00',
                retentionDays: 30,
                maxBackups: 10
            })
        ]);

        const formattedBackups = backups.map(b => ({
            id: b._id.toString(),
            filename: b.filename,
            filepath: b.filepath,
            size: b.size,
            sizeFormatted: formatBytes(b.size),
            type: b.type,
            status: b.status,
            createdAt: b.createdAt,
            createdBy: b.createdBy,
            duration: b.duration
        }));

        const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

        res.json({
            success: true,
            data: {
                backups: formattedBackups,
                settings,
                stats: {
                    totalBackups: totalCount,
                    totalSize,
                    totalSizeFormatted: formatBytes(totalSize),
                    lastBackup: backups[0]?.createdAt
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalItems: totalCount
                }
            },
            message: 'Lấy danh sách backup thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching backups:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * POST /backups/create
 * Tạo backup mới (simulated - trong thực tế sẽ chạy mongodump)
 */
router.post('/backups/create', async (req, res) => {
    try {
        getModels();
        const { description = 'Manual backup' } = req.body;

        console.log('🔄 Đang tạo bản sao lưu thủ công...');

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
        const filename = `backup_manual_${timestamp}.sql`;

        // Get collection counts for records estimate
        const [userCount, docCount, examCount] = await Promise.all([
            User.countDocuments({}),
            Document.countDocuments({}),
            Exam.countDocuments({})
        ]);

        const totalRecords = userCount + docCount + examCount;
        const estimatedSize = totalRecords * 1024 * 10; // ~10KB per record estimate

        const newBackup = await BackupRecord.create({
            filename,
            filepath: `/backups/${filename}`,
            size: estimatedSize,
            type: 'Thủ công',
            status: 'Hoàn tất',
            tables: 15,
            records: totalRecords,
            duration: '2m 05s',
            createdBy: 'Admin',
            description
        });

        await logSystemEvent(
            'backup',
            'success',
            'Backup thủ công hoàn tất',
            `Đã tạo ${filename} - ${formatBytes(estimatedSize)}`,
            { filename, size: estimatedSize, records: totalRecords },
            'Admin'
        );

        console.log(`✅ Backup hoàn tất: ${filename}`);

        res.json({
            success: true,
            data: {
                id: newBackup._id.toString(),
                filename: newBackup.filename,
                size: newBackup.size,
                sizeFormatted: formatBytes(newBackup.size),
                type: newBackup.type,
                status: newBackup.status,
                createdAt: newBackup.createdAt
            },
            message: `Đã tạo bản sao lưu thủ công thành công: ${filename}`
        });

    } catch (error) {
        console.error('❌ Error creating backup:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /backups/download/:filename
 */
router.get('/backups/download/:filename', async (req, res) => {
    try {
        getModels();
        const { filename } = req.params;

        const backup = await BackupRecord.findOne({ filename }).lean();
        if (!backup) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy file backup'
            });
        }

        console.log(`📥 Admin đang tải xuống file [${filename}]`);

        res.json({
            success: true,
            data: {
                filename: backup.filename,
                size: backup.size,
                sizeFormatted: formatBytes(backup.size),
                downloadUrl: `/downloads/backups/${filename}`,
                expiresIn: '15 minutes'
            },
            message: `Đang chuẩn bị tải xuống ${filename}`
        });

    } catch (error) {
        console.error('❌ Error downloading backup:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * DELETE /backups/:filename
 */
router.delete('/backups/:filename', async (req, res) => {
    try {
        getModels();
        const { filename } = req.params;

        const backup = await BackupRecord.findOne({ filename });
        if (!backup) {
            return res.status(404).json({
                success: false,
                data: null,
                message: 'Không tìm thấy file backup'
            });
        }

        const freedSpace = backup.size;
        await BackupRecord.deleteOne({ filename });

        console.log(`🗑️  Đã xóa bản sao lưu [${filename}]`);

        await logSystemEvent(
            'system',
            'info',
            'Backup đã xóa',
            `Đã xóa ${filename}`,
            { filename, size: formatBytes(freedSpace) },
            'Admin'
        );

        const remainingCount = await BackupRecord.countDocuments({});

        res.json({
            success: true,
            data: {
                deletedFile: filename,
                freedSpace: formatBytes(freedSpace),
                remainingBackups: remainingCount
            },
            message: `Đã xóa bản sao lưu ${filename}`
        });

    } catch (error) {
        console.error('❌ Error deleting backup:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * PUT /backups/settings
 */
router.put('/backups/settings', async (req, res) => {
    try {
        getModels();
        const { autoBackup, retentionDays, schedule, maxBackups } = req.body;

        const currentSettings = await getSystemSetting('backupSettings', {
            autoBackup: true,
            schedule: 'Hàng ngày 03:00',
            retentionDays: 30,
            maxBackups: 10
        });

        const newSettings = {
            ...currentSettings,
            ...(typeof autoBackup !== 'undefined' && { autoBackup }),
            ...(retentionDays && { retentionDays: parseInt(retentionDays) }),
            ...(schedule && { schedule }),
            ...(maxBackups && { maxBackups: parseInt(maxBackups) })
        };

        await updateSystemSetting('backupSettings', newSettings, 'Admin');

        console.log('⚙️  Đã cập nhật cấu hình backup');

        res.json({
            success: true,
            data: newSettings,
            message: 'Đã cập nhật cấu hình backup thành công'
        });

    } catch (error) {
        console.error('❌ Error updating backup settings:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

// ==================== MODULE 5: MAINTENANCE ====================

/**
 * GET /maintenance
 * Lấy trạng thái bảo trì từ SystemSettings
 */
router.get('/maintenance', async (req, res) => {
    try {
        getModels();

        const maintenanceStatus = await getSystemSetting('maintenance', {
            isEnabled: false,
            scheduledDate: '',
            startTime: '',
            endTime: '',
            duration: 2,
            message: 'Chúng tôi sẽ nâng cấp hệ thống để mang đến trải nghiệm tốt hơn.',
            reason: '',
            affectedServices: ['API', 'Database'],
            lastUpdatedAt: null,
            lastUpdatedBy: 'System'
        });

        res.json({
            success: true,
            data: maintenanceStatus,
            message: 'Lấy trạng thái bảo trì thành công'
        });

    } catch (error) {
        console.error('❌ Error fetching maintenance:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * PUT /maintenance/toggle
 * Bật/tắt bảo trì khẩn cấp
 */
router.put('/maintenance/toggle', async (req, res) => {
    try {
        getModels();

        const current = await getSystemSetting('maintenance', { isEnabled: false });
        const newState = !current.isEnabled;

        const updated = {
            ...current,
            isEnabled: newState,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: 'Admin'
        };

        await updateSystemSetting('maintenance', updated, 'Admin');

        console.log(`🚨 Trạng thái bảo trì khẩn cấp đã được chuyển sang [${newState}]`);

        await logSystemEvent(
            'maintenance',
            newState ? 'warning' : 'success',
            newState ? 'Bảo trì KHẨN CẤP đã BẬT' : 'Bảo trì đã TẮT',
            newState ? 'Hệ thống đang trong chế độ bảo trì khẩn cấp' : 'Hệ thống đã hoạt động trở lại',
            { previousState: current.isEnabled, newState },
            'Admin'
        );

        res.json({
            success: true,
            data: {
                isEnabled: newState,
                previousState: current.isEnabled,
                toggledAt: updated.lastUpdatedAt
            },
            message: newState
                ? 'Đã BẬT chế độ bảo trì khẩn cấp'
                : 'Đã TẮT chế độ bảo trì'
        });

    } catch (error) {
        console.error('❌ Error toggling maintenance:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * POST /maintenance/schedule
 * Lên lịch bảo trì
 */
router.post('/maintenance/schedule', async (req, res) => {
    try {
        getModels();
        const { scheduledDate, startTime, duration, message, reason, affectedServices, autoEnable } = req.body;

        if (!scheduledDate || !startTime || !duration) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'Vui lòng cung cấp đầy đủ: ngày, giờ, thời lượng'
            });
        }

        const [hours, minutes] = startTime.split(':');
        const endHour = (parseInt(hours) + parseInt(duration)) % 24;
        const endTime = `${String(endHour).padStart(2, '0')}:${minutes}`;

        const maintenanceData = {
            isEnabled: autoEnable || false,
            scheduledDate,
            startTime,
            endTime,
            duration: parseInt(duration),
            message: message || 'Chúng tôi sẽ nâng cấp hệ thống để mang đến trải nghiệm tốt hơn.',
            reason: reason || '',
            affectedServices: affectedServices || ['API', 'Database'],
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: 'Admin'
        };

        await updateSystemSetting('maintenance', maintenanceData, 'Admin');

        console.log(`📅 Lịch bảo trì đã được thiết lập: ${scheduledDate} ${startTime}`);

        await logSystemEvent(
            'maintenance',
            'info',
            'Lịch bảo trì đã được thiết lập',
            `Bảo trì vào ${scheduledDate} lúc ${startTime}`,
            maintenanceData,
            'Admin'
        );

        res.json({
            success: true,
            data: maintenanceData,
            message: 'Lịch bảo trì đã được thiết lập và sẽ thông báo đến người dùng'
        });

    } catch (error) {
        console.error('❌ Error scheduling maintenance:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

/**
 * GET /maintenance/check
 * Public endpoint để client check trạng thái
 */
router.get('/maintenance/check', async (req, res) => {
    try {
        getModels();
        const status = await getSystemSetting('maintenance', { isEnabled: false });

        res.json({
            success: true,
            data: {
                isEnabled: status.isEnabled,
                message: status.isEnabled ? status.message : null,
                scheduledDate: status.isEnabled ? status.scheduledDate : null
            },
            message: status.isEnabled ? 'Hệ thống đang bảo trì' : 'Hệ thống hoạt động bình thường'
        });

    } catch (error) {
        console.error('❌ Error checking maintenance:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: `Lỗi máy chủ nội bộ: ${error.message}`
        });
    }
});

// ==================== MAINTENANCE MIDDLEWARE ====================
async function maintenanceCheck(req, res, next) {
    try {
        // Lazy load models
        if (!SystemSettings) {
            try {
                SystemSettings = mongoose.model('SystemSettings');
            } catch (e) {
                // Model chưa được tạo, skip maintenance check
                return next();
            }
        }

        const setting = await SystemSettings.findOne({ key: 'maintenance' }).lean();
        const isEnabled = setting?.value?.isEnabled || false;

        if (isEnabled) {
            const isAdminPath = req.path.startsWith('/api/admin');
            const isAuthPath = req.path.startsWith('/api/auth');

            if (isAdminPath || isAuthPath) {
                return next();
            }

            return res.status(503).json({
                success: false,
                data: {
                    maintenance: true,
                    message: setting.value.message,
                    scheduledDate: setting.value.scheduledDate,
                    duration: setting.value.duration
                },
                message: setting.value.message || 'Hệ thống đang bảo trì'
            });
        }

        next();
    } catch (err) {
        // Nếu có lỗi, cho phép request tiếp tục
        next();
    }
}

// Export middleware
router.maintenanceCheck = maintenanceCheck;

module.exports = router;
