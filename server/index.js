require('dotenv').config();
console.log("🔑 KEY CHECK:", process.env.GEMINI_API_KEY ? "Đã tìm thấy Key!" : "❌ KHÔNG THẤY KEY");
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==================== SECURITY LIBRARIES ====================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp'); // 🛡️ [ENTERPRISE] Chống HTTP Parameter Pollution
const { body, param, query, validationResult } = require('express-validator'); // 🛡️ [ENTERPRISE] Input Validation

// ==================== SECURITY CONSTANTS ====================
const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'whalio_super_secret_key_change_in_production_2024';
const JWT_EXPIRES_IN = '7d'; // Token hết hạn sau 7 ngày

// ==================== FILE PARSING LIBRARIES ====================
const mammoth = require('mammoth');  // Đọc file Word (.docx)
const XLSX = require('xlsx');         // Đọc file Excel (.xlsx, .xls)
const pdfParse = require('pdf-parse'); // Đọc file PDF

// ==================== AI SERVICE ====================
const { generateAIResponse } = require('./aiService'); // Bỏ cái /js/ đi là xong

// ==================== ADMIN ROUTER ====================
const adminRouter = require('./routes/admin-refactored');

const app = express();
app.set('trust proxy', true);

// ==================== MIDDLEWARE CONFIGURATION ====================
// 🔧 [CRITICAL] JSON/URL Parsing PHẢI ĐẶT TRƯỚC TẤT CẢ MIDDLEWARE BẢO MẬT
// Lý do: Các middleware bảo mật (mongoSanitize, xss, hpp) cần req.body đã được parse
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 🔧 [EXPRESS 5.x FIX] Kích hoạt query parser TRƯỚC mongoSanitize
// Express 5.x không tự động parse query string, gây lỗi "Cannot set property query"
app.set('query parser', 'extended');

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, '../img')));
console.log('✅  Request parsing enabled (JSON + URL-encoded + Query, max 2MB)');

// 1. CORS Configuration - Cho phép cả Main App và Admin Panel
const corsOptions = {
    origin: [
        'http://localhost:5173',      // Vite dev server (Main App)
        'http://localhost:5174',      // Vite dev server (Admin Panel)
        'http://localhost:3000',      // Express server
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'https://whaliostudying.onrender.com',  // Frontend trên Render
        'https://weblogwhalio.onrender.com',
        /\.vercel\.app$/,             // Vercel deployments
        /\.netlify\.app$/             // Netlify deployments
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
console.log('✅  CORS enabled for multiple origins');

// ==================== SECURITY MIDDLEWARE ====================
// 🛡️ [ENTERPRISE SECURITY - LAYER 1] HELMET - HTTP Security Headers
// Ẩn giấu dấu vết server, chống clickjacking, XSS, MIME sniffing
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Cho phép tải resource từ domain khác
    contentSecurityPolicy: false, // Tắt CSP để tránh conflict với frontend
    hidePoweredBy: true, // 🛡️ Xóa header X-Powered-By
    xFrameOptions: { action: 'deny' }, // Chống clickjacking
    xContentTypeOptions: true, // Chống MIME-sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' }
}));
// 🛡️ Đảm bảo xóa X-Powered-By hoàn toàn
app.disable('x-powered-by');
console.log('🛡️  Helmet security headers enabled (Enterprise - Server fingerprints hidden)');

// ==================== IP HELPER FUNCTIONS ====================
// Helper: Normalize IP address (remove IPv6 prefix, port, etc.)
function normalizeIp(rawValue) {
    let ip = String(rawValue || '').trim();
    if (!ip) return '';

    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }

    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
        ip = ip.split(':')[0];
    }

    if (ip === '::1') {
        return '127.0.0.1';
    }

    return ip;
}

// Helper: Check if IP is private/local
function isPrivateIp(ip) {
    if (!ip) return true;
    if (ip === '127.0.0.1') return true;

    if (/^10\./.test(ip)) return true;
    if (/^192\.168\./.test(ip)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
    if (/^169\.254\./.test(ip)) return true;
    if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;

    return false;
}

// Helper: Extract client IP from request (handles proxies, Cloudflare, etc.)
function extractClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const candidates = [];

    const pushCandidate = (value) => {
        const normalized = normalizeIp(value);
        if (normalized) {
            candidates.push(normalized);
        }
    };

    if (typeof req.headers['cf-connecting-ip'] === 'string') {
        pushCandidate(req.headers['cf-connecting-ip']);
    }
    if (typeof req.headers['x-real-ip'] === 'string') {
        pushCandidate(req.headers['x-real-ip']);
    }
    if (typeof forwarded === 'string' && forwarded.trim()) {
        forwarded.split(',').forEach((item) => pushCandidate(item));
    } else if (Array.isArray(forwarded)) {
        forwarded.forEach((item) => pushCandidate(item));
    }

    pushCandidate(req.ip);
    pushCandidate(req.socket?.remoteAddress);
    pushCandidate(req.connection?.remoteAddress);

    const publicIp = candidates.find((ip) => !isPrivateIp(ip));
    return publicIp || candidates[0] || '';
}

// ==================== BLACKLIST IP GATEKEEPER ====================
const BLOCKED_IP_FORBIDDEN_MESSAGE = 'Địa chỉ IP của bạn đã bị chặn do vi phạm chính sách bảo mật. Vui lòng liên hệ Admin Whalio để được hỗ trợ.';
const BLOCKED_IP_CACHE_REFRESH_MS = 5 * 60 * 1000; // 5 phút
let blockedIPCacheSet = new Set();
let blockedIPCacheLastUpdatedAt = 0;
let blockedIPCacheRefreshPromise = null;
let blockedIPCacheRefreshInterval = null;

function normalizeBlacklistIP(ip) {
    return normalizeIp(ip);
}

function syncBlockedIPCacheLocally(ips = [], shouldBlock = true) {
    if (!Array.isArray(ips) || ips.length === 0) return;
    ips.forEach((rawIp) => {
        const normalizedIp = normalizeBlacklistIP(rawIp);
        if (!normalizedIp) return;
        if (shouldBlock) {
            blockedIPCacheSet.add(normalizedIp);
        } else {
            blockedIPCacheSet.delete(normalizedIp);
        }
    });
}

async function refreshBlockedIPCache({ force = false } = {}) {
    if (blockedIPCacheRefreshPromise) {
        return blockedIPCacheRefreshPromise;
    }

    const cacheIsFresh =
        blockedIPCacheLastUpdatedAt > 0 &&
        Date.now() - blockedIPCacheLastUpdatedAt < BLOCKED_IP_CACHE_REFRESH_MS;
    if (!force && cacheIsFresh) {
        return blockedIPCacheSet;
    }

    blockedIPCacheRefreshPromise = (async () => {
        try {
            if (mongoose.connection.readyState !== 1) {
                return blockedIPCacheSet;
            }

            const blockedIPs = await BlacklistIP.find({ status: 'blocked' }).select('ip -_id').lean();
            blockedIPCacheSet = new Set(
                blockedIPs
                    .map((entry) => normalizeBlacklistIP(entry.ip))
                    .filter(Boolean)
            );
            blockedIPCacheLastUpdatedAt = Date.now();
            console.log(`🚫 Blacklist IP cache refreshed (${blockedIPCacheSet.size} blocked IPs)`);
        } catch (error) {
            console.error('❌ Failed to refresh Blacklist IP cache:', error.message);
        } finally {
            blockedIPCacheRefreshPromise = null;
        }

        return blockedIPCacheSet;
    })();

    return blockedIPCacheRefreshPromise;
}

function startBlockedIPCacheAutoRefresh() {
    if (blockedIPCacheRefreshInterval) return;

    blockedIPCacheRefreshInterval = setInterval(() => {
        void refreshBlockedIPCache({ force: true });
    }, BLOCKED_IP_CACHE_REFRESH_MS);

    if (typeof blockedIPCacheRefreshInterval.unref === 'function') {
        blockedIPCacheRefreshInterval.unref();
    }
}

function attachAdminBlacklistCacheSyncHook(req, res) {
    const requestPath = req.path || '';
    const isBlockRoute = req.method === 'POST' && requestPath === '/api/admin/security/ips/block';
    const isUnblockRoute = req.method === 'DELETE' && requestPath === '/api/admin/security/ips/unblock';

    if (!isBlockRoute && !isUnblockRoute) {
        return;
    }

    const ips = Array.isArray(req.body?.ips)
        ? req.body.ips.map((ip) => normalizeBlacklistIP(ip)).filter(Boolean)
        : [];
    if (ips.length === 0) {
        return;
    }

    res.once('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
            return;
        }

        syncBlockedIPCacheLocally(ips, isBlockRoute);
        blockedIPCacheLastUpdatedAt = Date.now();

        // Đồng bộ lại từ DB ở nền để đảm bảo cache luôn đúng với dữ liệu thực tế
        void refreshBlockedIPCache({ force: true });
    });
}

async function blockIPGatekeeper(req, res, next) {
    try {
        attachAdminBlacklistCacheSyncHook(req, res);

        const clientIP = extractClientIP(req);
        if (!clientIP) {
            return next();
        }

        if (blockedIPCacheLastUpdatedAt === 0) {
            await refreshBlockedIPCache({ force: true });
        } else if (Date.now() - blockedIPCacheLastUpdatedAt >= BLOCKED_IP_CACHE_REFRESH_MS) {
            void refreshBlockedIPCache();
        }

        if (blockedIPCacheSet.has(clientIP)) {
            return res.status(403).json({
                success: false,
                message: BLOCKED_IP_FORBIDDEN_MESSAGE
            });
        }

        return next();
    } catch (error) {
        console.error('❌ blockIPGatekeeper error:', error.message);
        return next();
    }
}

// Middleware này phải nằm trên cùng route stack (ngay sau CORS + Helmet)
app.use(blockIPGatekeeper);
console.log('🚫 Blacklist IP Gatekeeper enabled (RAM cache + periodic refresh)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 2] MONGODB SANITIZATION
// Chặn NoSQL Injection ($gt, $eq, etc.) - CẦN req.body đã được parse
// 🔧 [EXPRESS 5.x FIX] Không dùng middleware mặc định vì package cố gán lại req.query
app.use((req, res, next) => {
    const sanitizeOptions = { replaceWith: '_' };

    if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, sanitizeOptions);
    }
    if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params, sanitizeOptions);
    }
    if (req.query && typeof req.query === 'object') {
        mongoSanitize.sanitize(req.query, sanitizeOptions);
    }

    next();
});
console.log('🛡️  MongoDB Sanitization enabled (Enterprise Layer 2)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 3] XSS CLEAN
// Tự động lọc mọi thẻ <script>, mã độc HTML trong req.body, req.query, req.params
const sanitizeXssString = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

const SENSITIVE_FIELDS = new Set(['password', 'oldPass', 'newPass', 'confirmPassword', 'token']);

const deepSanitizeXss = (value, currentKey = '') => {
    if (SENSITIVE_FIELDS.has(currentKey)) {
        return value;
    }

    if (typeof value === 'string') return sanitizeXssString(value);

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) {
            value[i] = deepSanitizeXss(value[i], currentKey);
        }
        return value;
    }

    if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            value[key] = deepSanitizeXss(value[key], key);
        });
    }

    return value;
};

app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        deepSanitizeXss(req.body, 'body');
    }
    if (req.params && typeof req.params === 'object') {
        deepSanitizeXss(req.params, 'params');
    }
    if (req.query && typeof req.query === 'object') {
        deepSanitizeXss(req.query, 'query');
    }

    next();
});
console.log('🛡️  XSS Clean protection enabled (Enterprise Layer 3)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 4] HTTP PARAMETER POLLUTION
// Chặn tấn công gử́i nhiều tham số trùng lặp (VD: ?username=admin&username=hacker)
app.use(hpp({
    whitelist: ['images', 'files'] // Cho phép một số field có thể có nhiều giá trị (file upload)
}));
console.log('🛡️  HTTP Parameter Pollution protection enabled (Enterprise Layer 4)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 5] RATE LIMITING
// Chống Brute Force & DDoS - Rate limiter cho tất cả API (100 requests / 15 phút)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 requests
    message: {
        success: false,
        message: '⛔ Quá nhiều yêu cầu! Vui lòng thử lại sau 15 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => rateLimit.ipKeyGenerator(
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    )
});

// Rate limiter nghiêm ngặt cho đăng nhập (5 lần / 15 phút)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // Chỉ cho phép 5 lần thử
    message: {
        success: false,
        message: '⛔ Quá nhiều lần đăng nhập thất bại! Vui lòng thử lại sau 15 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Không tính lần đăng nhập thành công
    keyGenerator: (req) => rateLimit.ipKeyGenerator(
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    )
});

// Áp dụng general rate limit cho tất cả API
app.use('/api/', generalLimiter);
console.log('🛡️  Rate limiting enabled (100 req/15min general, 5 req/15min login) - Enterprise Layer 5');

// ⛔ REMOVED: Static data route - Không được serve public thư mục chứa exam/questions
// app.use('/static-data', express.static(path.join(__dirname, 'data'))); // SECURITY RISK!
const PORT = process.env.PORT || 3000;

// ==================== CLOUDINARY CONFIGURATION ====================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('☁️  Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌');

// ==================== MONGODB CONNECTION ====================
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/whalio';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('🚀 Whalio is now connected to MongoDB Cloud');
        
        // Khởi tạo Blacklist IP cache và auto-refresh
        refreshBlockedIPCache({ force: true }).then(() => {
            startBlockedIPCacheAutoRefresh();
            console.log('🚫 Blacklist IP cache initialized and auto-refresh started');
        });
        
        seedInitialData(); // Automatically seed data on startup
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });

// ==================== DATA SEEDING FUNCTION (ROBUST VERSION) ====================
async function seedExamsFromJSON(forceReseed = false) {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(60));
    console.log('🌱 EXAM SEEDING PROCESS STARTED');
    console.log('='.repeat(60));

    try {
        // Step 1: Check current database state
        console.log('\n📊 Step 1: Checking database state...');
        const currentExamCount = await Exam.countDocuments();
        console.log(`   Current exams in database: ${currentExamCount}`);

        if (currentExamCount > 0 && !forceReseed) {
            console.log(`   ✅ Database already contains ${currentExamCount} exams.`);
            console.log(`   ℹ️  Use forceReseed=true or visit /api/debug/seed-exams to re-seed.`);
            console.log('='.repeat(60) + '\n');
            return {
                success: true,
                message: 'Database already populated',
                examCount: currentExamCount,
                skipped: true
            };
        }

        if (forceReseed && currentExamCount > 0) {
            console.log(`   🔄 Force reseed enabled. Clearing ${currentExamCount} existing exams...`);
            await Exam.deleteMany({});
            console.log(`   ✅ Cleared existing exams`);
        }

        // Step 2: Resolve file paths
        console.log('\n📁 Step 2: Resolving JSON file paths...');
        const examsFilePath = path.join(__dirname, 'data', 'exams.json');
        const questionsFilePath = path.join(__dirname, 'questions.json');

        console.log(`   Exams file path: ${examsFilePath}`);
        console.log(`   Questions file path: ${questionsFilePath}`);

        // Step 3: Check file existence
        console.log('\n🔍 Step 3: Checking file existence...');

        if (!fs.existsSync(examsFilePath)) {
            const error = `❌ ERROR: Could not find exams.json at ${examsFilePath}`;
            console.error(`   ${error}`);
            console.log(`   💡 Current directory (__dirname): ${__dirname}`);
            console.log(`   💡 Files in directory:`, fs.readdirSync(__dirname).filter(f => f.endsWith('.json')));
            return { success: false, error, files: fs.readdirSync(__dirname).filter(f => f.endsWith('.json')) };
        }
        console.log(`   ✅ Found exams.json`);

        if (!fs.existsSync(questionsFilePath)) {
            const error = `❌ ERROR: Could not find questions.json at ${questionsFilePath}`;
            console.error(`   ${error}`);
            console.log(`   💡 Current directory (__dirname): ${__dirname}`);
            console.log(`   💡 Files in directory:`, fs.readdirSync(__dirname).filter(f => f.endsWith('.json')));
            return { success: false, error, files: fs.readdirSync(__dirname).filter(f => f.endsWith('.json')) };
        }
        console.log(`   ✅ Found questions.json`);

        // Step 4: Read and parse JSON files
        console.log('\n📖 Step 4: Reading JSON files...');

        let examsData, questionsData;

        try {
            const examsRaw = fs.readFileSync(examsFilePath, 'utf8');
            examsData = JSON.parse(examsRaw);
            console.log(`   ✅ Successfully parsed exams.json`);
            console.log(`   📚 Found ${examsData.length} exam entries`);
        } catch (parseError) {
            const error = `❌ ERROR: Failed to parse exams.json - ${parseError.message}`;
            console.error(`   ${error}`);
            return { success: false, error };
        }

        try {
            const questionsRaw = fs.readFileSync(questionsFilePath, 'utf8');
            questionsData = JSON.parse(questionsRaw);
            console.log(`   ✅ Successfully parsed questions.json`);
            console.log(`   📝 Found ${Object.keys(questionsData).length} question sets`);

            // Log sample of question IDs
            const questionIds = Object.keys(questionsData);
            console.log(`   📋 Question set IDs: ${questionIds.slice(0, 5).join(', ')}${questionIds.length > 5 ? '...' : ''}`);
        } catch (parseError) {
            const error = `❌ ERROR: Failed to parse questions.json - ${parseError.message}`;
            console.error(`   ${error}`);
            return { success: false, error };
        }

        // Step 5: Transform data for MongoDB
        console.log('\n🔄 Step 5: Transforming data for MongoDB...');

        const examsToInsert = [];
        let totalQuestions = 0;

        for (const exam of examsData) {
            const examId = exam.id.toString();
            const questionBank = questionsData[examId] || [];

            if (questionBank.length === 0) {
                console.log(`   ⚠️  Exam ID ${examId} ("${exam.title}") has no questions - skipping`);
                continue;
            }

            // Parse time value
            let timeValue = exam.time;
            if (typeof timeValue === 'string') {
                timeValue = parseInt(timeValue.replace(/\D/g, '')) || 45;
            }

            const examDocument = {
                examId: examId,
                title: exam.title,
                subject: exam.subject || 'Tự tạo',
                questions: exam.questions || questionBank.length,
                time: timeValue,
                image: exam.image || './img/snvvnghen.png',
                createdBy: exam.createdBy || 'System',
                questionBank: questionBank,
                isDefault: true,
                createdAt: exam.createdAt ? new Date(exam.createdAt) : new Date()
            };

            examsToInsert.push(examDocument);
            totalQuestions += questionBank.length;
            console.log(`   ✅ Prepared exam: "${exam.title}" (${questionBank.length} questions)`);
        }

        // Step 6: Handle orphaned question sets
        console.log('\n🔍 Step 6: Checking for orphaned question sets...');
        const existingExamIds = new Set(examsData.map(e => e.id.toString()));
        const allQuestionSetIds = Object.keys(questionsData);
        const orphanedIds = allQuestionSetIds.filter(id => !existingExamIds.has(id));

        if (orphanedIds.length > 0) {
            console.log(`   📌 Found ${orphanedIds.length} orphaned question sets`);

            for (const id of orphanedIds) {
                const questionBank = questionsData[id];
                const examDocument = {
                    examId: id,
                    title: `Đề thi ${id}`,
                    subject: 'Tự tạo',
                    questions: questionBank.length,
                    time: 45,
                    image: './img/snvvnghen.png',
                    createdBy: 'System',
                    questionBank: questionBank,
                    isDefault: true,
                    createdAt: new Date()
                };

                examsToInsert.push(examDocument);
                totalQuestions += questionBank.length;
                console.log(`   ✅ Created exam from orphaned set ID ${id} (${questionBank.length} questions)`);
            }
        } else {
            console.log(`   ℹ️  No orphaned question sets found`);
        }

        // Step 7: Insert into MongoDB
        console.log('\n💾 Step 7: Inserting exams into MongoDB...');
        console.log(`   Total exams to insert: ${examsToInsert.length}`);
        console.log(`   Total questions: ${totalQuestions}`);

        if (examsToInsert.length === 0) {
            const error = '❌ ERROR: No valid exams to insert!';
            console.error(`   ${error}`);
            return { success: false, error };
        }

        await Exam.insertMany(examsToInsert, { ordered: false });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ SEEDING COMPLETED SUCCESSFULLY in ${duration}s`);
        console.log(`   📊 Imported ${examsToInsert.length} exams`);
        console.log(`   📝 Imported ${totalQuestions} total questions`);
        console.log('='.repeat(60) + '\n');

        return {
            success: true,
            examCount: examsToInsert.length,
            questionCount: totalQuestions,
            duration: duration
        };

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ CRITICAL ERROR DURING SEEDING');
        console.error('='.repeat(60));
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('='.repeat(60) + '\n');

        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

// ==================== MONGOOSE SCHEMAS & MODELS ====================

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: null },
    role: { type: String, default: 'member', enum: ['member', 'admin'] },
    savedDocs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    
    // Admin Management Fields
    isLocked: { type: Boolean, default: false },
    status: { type: String, default: 'active', enum: ['active', 'locked', 'pending'] },
    lastIP: { type: String, default: '' },
    lastCountry: { type: String, default: '' },
    lastCity: { type: String, default: '' },
    lastDevice: { type: String, default: '' },
    lastLogin: { type: Date, default: null },
    totalStudyMinutes: { type: Number, default: 0 },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

userSchema.index({ isLocked: 1, status: 1 });
userSchema.index({ lastLogin: -1 });

// --- Study Session Schema (Lưu lịch sử học tập) ---
const studySessionSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    duration: { type: Number, required: true }, // Thời gian học (phút)
    date: { type: Date, default: Date.now }, // Ngày học
    createdAt: { type: Date, default: Date.now }
});

const StudySession = mongoose.model('StudySession', studySessionSchema);

const studyTaskSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    isDone: { type: Boolean, default: false },
    checkedAt: { type: Date, default: null },
    lastInteractedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

studyTaskSchema.index({ username: 1, createdAt: -1 });
const StudyTask = mongoose.model('StudyTask', studyTaskSchema);

// --- GPA Schema ---
// --- GPA Schema (ĐÃ SỬA: KHỚP 100% VỚI FRONTEND) ---
const gpaSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    targetGpa: { type: String, default: "" }, // 🔥 Thêm field này
    semesters: [{
        id: Number,
        name: String,
        isExpanded: { type: Boolean, default: true }, // Thêm cái này để lưu trạng thái đóng/mở

        // 👇 ĐỔI TÊN 'courses' -> 'subjects'
        subjects: [{
            id: Number,
            name: String,
            credits: Number,
            type: { type: String, default: 'general' }, // 'general' hoặc 'major'

            // 👇 THÊM 'components' để lưu điểm thành phần (Quan trọng!)
            components: [{
                id: Number,
                score: String, // Lưu string vì frontend gửi cả chuỗi rỗng ""
                weight: Number
            }]
        }]
    }],
    updatedAt: { type: Date, default: Date.now }
});

// Document Schema
const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    uploader: { type: String, required: true },
    uploaderUsername: { type: String, ref: 'User' },
    date: { type: String },
    time: { type: String },
    type: { type: String, default: 'other' },
    path: { type: String, required: true },
    size: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    course: { type: String, default: '' },
    visibility: { type: String, default: 'public', enum: ['public', 'private'] },
    createdAt: { type: Date, default: Date.now }
});

// Exam Schema
const examSchema = new mongoose.Schema({
    examId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subject: { type: String, default: 'Tự tạo' },
    questions: { type: Number, required: true },
    time: { type: Number, required: true },
    image: { type: String, default: './img/snvvnghen.png.png' },
    createdBy: { type: String, ref: 'User' },
    questionBank: [{ type: mongoose.Schema.Types.Mixed }],
    isDefault: { type: Boolean, default: false }, // Mark initial seeded exams
    createdAt: { type: Date, default: Date.now }
});

// Post Schema (Community)
const postSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    author: { type: String, required: true },
    authorFullName: { type: String, required: true },
    authorAvatar: { type: String },
    content: { type: String, required: true },
    images: [String],
    files: [{
        originalName: String,
        name: String,
        path: String,
        size: Number,
        mimeType: String
    }],
    likes: { type: Number, default: 0 },
    likedBy: [String],
    comments: [{
        id: Number,
        author: String,
        authorFullName: String,
        authorAvatar: String,
        content: String,
        images: [String],
        files: [{
            originalName: String,
            name: String,
            path: String,
            size: Number,
            mimeType: String
        }],
        reactions: mongoose.Schema.Types.Mixed,
        replies: [{
            id: Number,
            author: String,
            authorFullName: String,
            authorAvatar: String,
            content: String,
            images: [String],
            files: [mongoose.Schema.Types.Mixed],
            reactions: mongoose.Schema.Types.Mixed,
            createdAt: Date,
            editedAt: Date,
            replyTo: Number
        }],
        createdAt: { type: Date, default: Date.now },
        editedAt: Date
    }],
    savedBy: [String],
    deleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    editedAt: Date
});

// Activity Schema
const activitySchema = new mongoose.Schema({
    user: { type: String, required: true },
    username: { type: String, required: true },
    userAvatar: { type: String },
    action: { type: String, required: true },
    target: { type: String, required: true },
    link: { type: String },
    type: { type: String },
    time: { type: Date, default: Date.now },
    timestamp: { type: Number, default: Date.now }
});

// Timetable Schema - CÓ TUẦN HỌC + TEACHER + NOTES
const timetableSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User', index: true },
    subject: { type: String, required: true },
    room: { type: String, required: true },
    campus: { type: String, default: 'Cơ sở chính' },
    day: { type: String, required: true },
    session: { type: String, required: true },
    startPeriod: { type: Number, required: true },
    numPeriods: { type: Number, required: true },
    timeRange: { type: String },

    // 🔥 MỚI: Tên giáo viên (Optional)
    teacher: { type: String, default: '' },

    // 🔥 MỚI: Ghi chú và nhắc nhở cho môn học
    notes: [{
        id: { type: String, required: true },
        content: { type: String, required: true },
        deadline: { type: Date },
        isDone: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],

    // 🔥 Lưu danh sách tuần học cụ thể
    weeks: {
        type: [Number],
        default: [], // Rỗng = áp dụng cho TẤT CẢ các tuần
        validate: {
            validator: function (arr) {
                return arr.every(w => w >= 1 && w <= 52);
            },
            message: 'Tuần phải từ 1-52'
        }
    },

    // Giữ lại để tương thích với code cũ
    startDate: { type: Date },
    endDate: { type: Date },
    dateRangeDisplay: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

// Index để query nhanh theo tuần
timetableSchema.index({ username: 1, weeks: 1 });

// Quick Notes Schema (Dashboard + StudyTimer)
const quickNoteSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true },
    color: { type: String, default: 'bg-yellow-100' },
    source: { type: String, default: 'dashboard', enum: ['dashboard', 'studytimer'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

quickNoteSchema.index({ username: 1, createdAt: -1 });

// Announcement Schema (Admin notifications)
const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    type: {
        type: String,
        enum: ['new-feature', 'update', 'maintenance', 'other'],
        default: 'other'
    },
    image: { type: String, default: '' },
    authorUsername: { type: String, required: true, index: true },
    authorFullName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

announcementSchema.index({ createdAt: -1 });

// Event Schema
const eventSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User', index: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, default: 'exam', enum: ['exam', 'deadline', 'other'] },
    description: { type: String, default: '' },
    deadlineTag: { type: String, default: 'Công việc' },
    isDone: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const deadlineTagSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    normalizedName: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
});

deadlineTagSchema.index({ username: 1, normalizedName: 1 }, { unique: true });

// ChatSession Schema - Lưu lịch sử trò chuyện với Whalio AI
const chatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    },
    username: { type: String, ref: 'User', index: true }, // Optional: link to user if logged in
    title: {
        type: String,
        default: 'Cuộc trò chuyện mới',
        maxlength: 100
    },
    messages: [{
        role: { type: String, enum: ['user', 'model'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        hasAttachment: { type: Boolean, default: false },
        attachmentType: { type: String } // 'image', 'pdf', 'doc', etc.
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index để query nhanh theo thời gian
chatSessionSchema.index({ createdAt: -1 });
chatSessionSchema.index({ username: 1, createdAt: -1 });

// ==================== ADMIN PANEL SCHEMAS ====================

// Blacklist IP Schema - Lưu danh sách IP bị chặn
const blacklistIPSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true, index: true },
    attackType: { type: String, enum: ['Brute Force', 'DDOS', 'SQL Injection', 'XSS', 'Other'], default: 'Other' },
    attempts: { type: Number, default: 1 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    targetEndpoint: { type: String, default: '' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    country: { type: String, default: 'Unknown' },
    isp: { type: String, default: 'Unknown' },
    blockedAt: { type: Date },
    blockedBy: { type: String },
    reason: { type: String, default: '' }
});

// System Settings Schema - Lưu cấu hình hệ thống (maintenance, backup settings, etc.)
const systemSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, default: 'System' }
});

// System Event Schema - Log các sự kiện hệ thống
const systemEventSchema = new mongoose.Schema({
    type: { type: String, enum: ['deploy', 'backup', 'security', 'warning', 'system', 'rollback', 'maintenance'], required: true },
    severity: { type: String, enum: ['success', 'warning', 'danger', 'info'], default: 'info' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedBy: { type: String, default: 'System' },
    createdAt: { type: Date, default: Date.now, index: true }
});

systemEventSchema.index({ type: 1, createdAt: -1 });

// User Activity Log Schema - Lịch sử hoạt động của user
const userActivityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true, index: true },
    action: { type: String, required: true }, // login, logout, study, exam, document, flashcard, etc.
    description: { type: String, required: true },
    ip: { type: String, default: '' },
    device: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
});

userActivityLogSchema.index({ userId: 1, createdAt: -1 });
userActivityLogSchema.index({ username: 1, action: 1 });

// Backup Record Schema - Lưu thông tin các bản backup
const backupRecordSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    filepath: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, enum: ['Tự động', 'Thủ công'], default: 'Thủ công' },
    status: { type: String, enum: ['Đang chạy', 'Hoàn tất', 'Lỗi'], default: 'Đang chạy' },
    tables: { type: Number, default: 0 },
    records: { type: Number, default: 0 },
    compression: { type: String, default: 'gzip' },
    duration: { type: String, default: '' },
    createdBy: { type: String, default: 'System' },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Post = mongoose.model('Post', postSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const QuickNote = mongoose.model('QuickNote', quickNoteSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Event = mongoose.model('Event', eventSchema);
const DeadlineTag = mongoose.model('DeadlineTag', deadlineTagSchema);
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const GpaModel = mongoose.model('Gpa', gpaSchema);

// Admin Models
const BlacklistIP = mongoose.model('BlacklistIP', blacklistIPSchema);
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
const SystemEvent = mongoose.model('SystemEvent', systemEventSchema);
const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);
const BackupRecord = mongoose.model('BackupRecord', backupRecordSchema);

// Auto-seed on startup
async function seedInitialData() {
    console.log('\n🔄 AUTO-SEED: Running automatic database seeding on startup...');
    await seedExamsFromJSON(false);
}

// ==================== JWT AUTHENTICATION MIDDLEWARE ====================
function logDeniedAdminAccess(req, reason, user = null) {
    const endpoint = req.originalUrl || req.url || req.path || 'unknown';
    if (!endpoint.startsWith('/api/admin')) {
        return;
    }

    const username = user?.username || req.user?.username || 'anonymous';
    const userId = user?.userId || req.user?.userId || null;
    const ip = extractClientIP(req) || normalizeIp(req.ip) || normalizeIp(req.connection?.remoteAddress) || 'unknown';

    console.warn('🚫 [ADMIN ACCESS DENIED]', JSON.stringify({
        timestamp: new Date().toISOString(),
        reason,
        method: req.method,
        endpoint,
        ip,
        user: username,
        userId
    }));
}

/**
 * verifyToken - Middleware xác thực JWT Token
 * Sử dụng: Thêm middleware này vào các route cần bảo vệ
 * Token được gửi trong header: Authorization: Bearer <token>
 * Sau khi verify, thông tin user sẽ có trong req.user
 */
function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            logDeniedAdminAccess(req, 'missing_authorization_header');
            return res.status(401).json({
                success: false,
                message: '⛔ Không tìm thấy token xác thực! Vui lòng đăng nhập.'
            });
        }

        // Token format: "Bearer <token>"
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            logDeniedAdminAccess(req, 'empty_or_malformed_token');
            return res.status(401).json({
                success: false,
                message: '⛔ Token không hợp lệ!'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Gắn thông tin user vào request để các route sau sử dụng
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };

        console.log(`🔐 Token verified for user: ${decoded.username}`);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logDeniedAdminAccess(req, 'expired_token');
            return res.status(401).json({
                success: false,
                message: '⛔ Token đã hết hạn! Vui lòng đăng nhập lại.',
                expired: true
            });
        }
        if (error.name === 'JsonWebTokenError') {
            logDeniedAdminAccess(req, 'invalid_jwt_token');
            return res.status(401).json({
                success: false,
                message: '⛔ Token không hợp lệ!'
            });
        }
        logDeniedAdminAccess(req, `token_verification_error:${error.name || 'unknown'}`);
        console.error('Token verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xác thực token'
        });
    }
}

/**
 * verifyAdmin - Middleware kiểm tra quyền Admin
 * Phải dùng sau verifyToken
 */
function verifyAdmin(req, res, next) {
    if (!req.user) {
        logDeniedAdminAccess(req, 'verify_admin_without_authenticated_user');
        return res.status(401).json({
            success: false,
            message: '⛔ Chưa xác thực!'
        });
    }

    if (req.user.role !== 'admin') {
        logDeniedAdminAccess(req, 'insufficient_role_not_admin');
        return res.status(403).json({
            success: false,
            message: '⛔ Bạn không có quyền Admin để thực hiện thao tác này!'
        });
    }

    next();
}

/**
 * optionalAuth - Middleware xác thực tùy chọn
 * Nếu có token thì verify, không có thì cho qua
 * Dùng cho các route public nhưng cần biết user nếu đã đăng nhập
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return next(); // Không có token, cho qua
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                role: decoded.role
            };
        }
        next();
    } catch (error) {
        // Token không hợp lệ, nhưng vẫn cho qua vì là optional
        next();
    }
}

console.log('🔐 JWT Authentication middleware initialized');

// ==================== 🛡️ ENTERPRISE INPUT VALIDATION MIDDLEWARE ====================
/**
 * sanitizeInput - Middleware escape các ký tự nguy hiểm trong input
 * Sử dụng cho các API như /api/posts, /api/comments, /api/quick-notes
 */
const sanitizeAndValidateInput = [
    // Validate & escape các field phổ biến
    body('content').optional().trim().escape(),
    body('title').optional().trim().escape(),
    body('message').optional().trim(), // Không escape để giữ markdown
    body('username').optional().trim().escape(),
    query('username').optional().trim().escape(),
    param('id').optional().trim().escape(),
];

/**
 * validateRequest - Kiểm tra kết quả validation và trả lỗi nếu có
 */
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn(`⚠️  Validation failed for ${req.path}:`, errors.array());
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ'
            // 🛡️ KHÔNG trả về chi tiết lỗi cho client (Error Cloaking)
        });
    }
    next();
}

/**
 * 🛡️ [ENTERPRISE] Dangerous payload patterns to block
 * Chặn các payload nguy hiểm trước khi xử lý
 */
const DANGEROUS_PATTERNS = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi, // Script tags
    /javascript:/gi, // JS protocol
    /on\w+\s*=/gi, // Inline event handlers (onclick, onerror, etc.)
    /\$\{.*\}/g, // Template literals injection
    /\$gt|\$lt|\$eq|\$ne|\$or|\$and|\$where|\$regex/gi, // NoSQL operators (backup layer)
    /eval\s*\(/gi, // eval() calls
    /document\.cookie/gi, // Cookie theft attempts
    /window\.location/gi, // Redirect attempts
];

function blockDangerousPayload(req, res, next) {
    const checkValue = (value, path) => {
        if (typeof value === 'string') {
            for (const pattern of DANGEROUS_PATTERNS) {
                if (pattern.test(value)) {
                    console.error(`🚨 [SECURITY] Dangerous payload blocked!`);
                    console.error(`   Path: ${req.path}`);
                    console.error(`   Field: ${path}`);
                    console.error(`   IP: ${req.ip}`);
                    console.error(`   Pattern: ${pattern}`);
                    return true;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            for (const key in value) {
                if (checkValue(value[key], `${path}.${key}`)) {
                    return true;
                }
            }
        }
        return false;
    };

    if (checkValue(req.body, 'body') || checkValue(req.query, 'query') || checkValue(req.params, 'params')) {
        return res.status(400).json({
            success: false,
            message: 'Yêu cầu không hợp lệ' // 🛡️ Error Cloaking - không tiết lộ lý do
        });
    }
    next();
}

// 🛡️ Áp dụng global cho tất cả API routes
app.use('/api/', blockDangerousPayload);
console.log('🛡️  Enterprise input validation & dangerous payload blocker enabled');

// ==================== EJS TEMPLATE ENGINE ====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fix encoding middleware
app.use((req, res, next) => {
    if (req.method === 'POST') {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].normalize('NFC');
            }
        }
    }
    next();
});

// File name decoding functions
function decodeFileName(filename) {
    try {
        if (!filename) return filename;
        if (/[\xC0-\xFF]/.test(filename)) {
            const buffer = Buffer.from(filename, 'latin1');
            return buffer.toString('utf8');
        }
        return filename;
    } catch (err) {
        console.error('Error decoding filename:', err);
        return filename;
    }
}

function normalizeFileName(str) {
    if (!str) return Date.now() + '-file';
    try {
        const ext = path.extname(str);
        let nameWithoutExt = path.basename(str, ext);
        let safeName = nameWithoutExt
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[-_]+|[-_]+$/g, '')
            .slice(0, 100);
        if (safeName.length < 1) {
            safeName = 'file-' + Date.now();
        }
        const timestamp = Date.now();
        return safeName + '-' + timestamp + ext;
    } catch (err) {
        console.error('Error normalizing filename:', err);
        return 'file-' + Date.now() + (str ? path.extname(str) : '');
    }
}

// ==================== CLOUDINARY STORAGE CONFIGURATION ====================
// 📌 Helper function to determine the correct resource_type for Cloudinary
// ⚠️ CRITICAL: This determines how Cloudinary stores and serves the file
//    - 'image': For images, supports transformations, served via /image/upload/
//    - 'video': For videos, supports streaming, served via /video/upload/
//    - 'raw': For all other files (PDF, Office, etc.), served via /raw/upload/
//            This is the MOST RELIABLE for direct file access/download
function getCloudinaryResourceType(filename) {
    const ext = path.extname(filename).toLowerCase();

    // Images: Use 'image' resource_type (Cloudinary optimizes these)
    const imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    if (imageFormats.includes(ext)) {
        return 'image';
    }

    // Videos: Use 'video' resource_type
    const videoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    if (videoFormats.includes(ext)) {
        return 'video';
    }

    // 🔥 PDFs: Use 'raw' for RELIABLE direct viewing/downloading
    // Using 'image' causes 401/404 errors when accessing directly
    // 'raw' gives us a direct downloadable link that works in browsers
    if (ext === '.pdf') {
        return 'raw';
    }

    // Everything else (Office, Archives, etc.): Use 'raw'
    // This ensures they're stored correctly and URLs work without modification
    return 'raw';
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        // Xử lý tên file tiếng Việt
        const decodedName = decodeFileName(file.originalname);
        const safeName = normalizeFileName(decodedName);

        // Lưu lại tên gốc
        file.decodedOriginalName = decodedName;

        // Determine the correct resource_type based on file extension
        const resourceType = getCloudinaryResourceType(file.originalname);

        console.log(`☁️ Cloudinary upload: ${file.originalname} → resource_type: ${resourceType}`);

        // Get file extension for proper handling
        const ext = path.extname(file.originalname).toLowerCase();

        return {
            folder: 'whalio-documents',
            resource_type: resourceType, // Explicitly set based on file type
            public_id: safeName,
            access_mode: 'public', // 🔥 CRITICAL: Allow public access to raw files
            type: 'upload', // Ensure it's a public upload, not private/authenticated
            // For raw files: preserve the original extension in the URL
            // This ensures the file is accessible with its proper extension
            ...(resourceType === 'raw' && { format: ext.replace('.', '') })
        };
    }
});

// ==================== MEMORY STORAGE FOR CHAT FILES & IMAGES ====================
// Sử dụng memoryStorage để lưu ảnh/file chat tạm vào RAM (không upload lên Cloudinary)
// Tối ưu tốc độ phản hồi cho chatbot
const chatFileStorage = multer.memoryStorage();

const chatFileUpload = multer({
    storage: chatFileStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Giới hạn 50MB cho file chat
    fileFilter: (req, file, cb) => {
        console.log(`📂 Checking chat file: ${file.originalname} (${file.mimetype})`);

        // Cho phép ảnh và các loại file phổ biến
        const allowedMimes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // Presentations
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Archives
            'application/zip',
            'application/x-rar-compressed',
            // Code files
            'application/javascript',
            'text/html',
            'text/css'
        ];

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.js', '.html', '.css'];
        const ext = require('path').extname(file.originalname).toLowerCase();

        if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            console.log(`   ✅ File allowed: ${file.originalname}`);
            cb(null, true);
        } else {
            console.log(`   ❌ File rejected: ${file.originalname} (${file.mimetype})`);
            cb(new Error('Loại file không được hỗ trợ! Chỉ chấp nhận: ảnh, PDF, Word, Excel, PowerPoint, ZIP, văn bản.'), false);
        }
    }
});

// 🛡️ [ENTERPRISE SECURITY] Bộ lọc upload siết chặt (kiểm tra CẢ mimetype VÀ extension)
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        console.log('📂 Đang xử lý file:', file.originalname, '| MIME:', file.mimetype);

        const ext = path.extname(file.originalname).toLowerCase();
        
        // 🛡️ [ENTERPRISE] DANH SÁCH ĐEN - CHẶN TRIỆT ĐỂ các file thực thi
        const BLOCKED_EXTENSIONS = [
            '.exe', '.bat', '.cmd', '.sh', '.bash', '.zsh', '.ps1', '.psm1',
            '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
            '.msi', '.msp', '.com', '.scr', '.pif', '.application', '.gadget',
            '.jar', '.hta', '.cpl', '.msc', '.dll', '.sys', '.drv',
            '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb',
            '.inf', '.reg', '.lnk', '.url', '.scf'
        ];
        
        // 🛡️ [ENTERPRISE] DANH SÁCH ĐEN - CHẶN các MIME type nguy hiểm
        const BLOCKED_MIMES = [
            'application/x-msdownload', 'application/x-msdos-program',
            'application/x-executable', 'application/x-sh', 'application/x-bash',
            'application/x-perl', 'application/x-python', 'application/x-ruby',
            'application/x-csh', 'application/x-shellscript',
            'application/hta', 'application/x-ms-application',
            'application/vnd.ms-htmlhelp', 'application/x-java-archive'
        ];
        
        // 🚨 KIỂM TRA DANH SÁCH ĐEN TRƯỚC
        if (BLOCKED_EXTENSIONS.includes(ext)) {
            console.error(`   🚨 [SECURITY] File thực thi bị chặn: ${file.originalname}`);
            return cb(new Error('Không được phép upload file thực thi!'), false);
        }
        
        if (BLOCKED_MIMES.includes(file.mimetype)) {
            console.error(`   🚨 [SECURITY] MIME nguy hiểm bị chặn: ${file.mimetype}`);
            return cb(new Error('Loại file này không được phép!'), false);
        }

        // 🛡️ Danh sách trắng - CẦN TRÚNG CẢ HAI điều kiện
        const ALLOWED_MAP = {
            // Images - KIỂM TRA KĨ mimetype để chống ngụy trang
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.png': ['image/png'],
            '.gif': ['image/gif'],
            '.webp': ['image/webp'],
            // Documents
            '.pdf': ['application/pdf'],
            '.doc': ['application/msword'],
            '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            '.txt': ['text/plain'],
            '.rtf': ['application/rtf', 'text/rtf'],
            // Spreadsheets
            '.xls': ['application/vnd.ms-excel'],
            '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            // Presentations
            '.ppt': ['application/vnd.ms-powerpoint'],
            '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            // Archives
            '.zip': ['application/zip', 'application/x-zip-compressed'],
            '.rar': ['application/x-rar-compressed', 'application/vnd.rar']
        };
        
        // 🛡️ KIỂM TRA CẢ HAI: extension PHẢI nằm trong whitelist VÀ mimetype PHẢI khớp
        const allowedMimesForExt = ALLOWED_MAP[ext];
        
        if (!allowedMimesForExt) {
            console.error(`   ❌ Đuôi file không hợp lệ: ${ext}`);
            return cb(new Error('Định dạng file không hỗ trợ!'), false);
        }
        
        // 🛡️ Cho phép octet-stream cho một số trường hợp (browser không nhận diện được MIME)
        const isOctetStream = file.mimetype === 'application/octet-stream';
        const isMimeValid = allowedMimesForExt.includes(file.mimetype) || isOctetStream;
        
        if (!isMimeValid) {
            console.error(`   🚨 [SECURITY] File ngụy trang bị phát hiện!`);
            console.error(`      Extension: ${ext}, MIME thực tế: ${file.mimetype}`);
            console.error(`      MIME mong đợi: ${allowedMimesForExt.join(', ')}`);
            return cb(new Error('File bị ngụy trang không hợp lệ!'), false);
        }
        
        console.log('   ✅ File hợp lệ! Extension và MIME khớp. Đang gửi lên Cloudinary...');
        return cb(null, true);
    }
});

// ==================== DOCUMENT UPLOAD WITH DIRECT CLOUDINARY SDK ====================
// 🔥 Sử dụng memory storage + Cloudinary SDK để có full control
// 🛡️ [ENTERPRISE] Áp dụng bảo mật tương tự upload chính
const documentMemoryStorage = multer.memoryStorage();
const documentUpload = multer({
    storage: documentMemoryStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        
        // 🛡️ [ENTERPRISE] CHẶN file thực thi
        const BLOCKED = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar', '.msi', '.dll', '.php', '.py'];
        if (BLOCKED.includes(ext)) {
            console.error(`🚨 [SECURITY] Document upload: File thực thi bị chặn: ${file.originalname}`);
            return cb(new Error('Không được phép upload file thực thi!'), false);
        }
        
        const allowedExtensions = [
            '.pdf', '.doc', '.docx', '.txt', '.rtf',
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar'
        ];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Định dạng file không hỗ trợ: ${ext}`), false);
        }
    }
});

// Helper: Upload buffer to Cloudinary with full control
async function uploadToCloudinary(buffer, originalFilename, mimeType) {
    const ext = path.extname(originalFilename).toLowerCase();
    const decodedName = decodeFileName(originalFilename);
    const safeName = normalizeFileName(decodedName);

    // ==================== RESOURCE TYPE LOGIC ====================
    // 📌 RULES:
    //    - Images (.jpg, .png, etc.) → 'image' → Keep /image/upload/ URL
    //    - PDFs → 'auto' → Cloudinary stores as 'image' → Keep /image/upload/ URL ✅
    //    - Videos → 'video' → Keep /video/upload/ URL
    //    - Office/Archives → 'auto' → Need to force /raw/upload/ for viewers

    const imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const videoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    // 🔥 Use 'auto' for all - Cloudinary will decide best storage
    let resourceType = 'auto';

    console.log(`☁️ Uploading to Cloudinary: ${originalFilename}`);
    console.log(`   → resource_type: ${resourceType}, extension: ${ext}`);

    // Convert buffer to base64 Data URI
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;

    try {
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'whalio-documents',
            resource_type: resourceType,
            public_id: safeName,
        });

        console.log(`✅ Cloudinary upload success!`);
        console.log(`   → URL: ${result.secure_url}`);
        console.log(`   → Resource type: ${result.resource_type}`);
        console.log(`   → Format: ${result.format}`);

        // ==================== URL FIX LOGIC ====================
        // 🔥 WHITELIST: Only these formats need /raw/upload/ for Microsoft Viewer
        const rawFormats = ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.rar', '.zip', '.7z'];

        // Use 'let' to allow reassignment
        let finalUrl = result.secure_url;

        if (rawFormats.includes(ext)) {
            // Office & Archive files: Force /raw/upload/ for Microsoft Office Viewer
            finalUrl = finalUrl.replace('/image/upload/', '/raw/upload/');
            console.log(`   📄 Office/Archive file → Fixed to RAW: ${finalUrl}`);
        } else if (ext === '.pdf') {
            // PDF: Keep original URL (/image/upload/) - Cloudinary allows PDF delivery
            console.log(`   📕 PDF file → Keep original: ${finalUrl}`);
        } else if (imageFormats.includes(ext)) {
            // Images: Keep original URL
            console.log(`   🖼️ Image file → Keep original: ${finalUrl}`);
        } else if (videoFormats.includes(ext)) {
            // Videos: Keep original URL
            console.log(`   🎬 Video file → Keep original: ${finalUrl}`);
        } else {
            // Unknown files: Force /raw/upload/ to be safe
            finalUrl = finalUrl.replace('/image/upload/', '/raw/upload/');
            console.log(`   📎 Other file → Fixed to RAW: ${finalUrl}`);
        }
        // ==================== END URL FIX LOGIC ====================

        return {
            ...result,
            secure_url: finalUrl,
            original_secure_url: result.secure_url
        };
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw error;
    }
}

// ==================== ACTIVITY LOGGING (MongoDB) ====================
async function logActivity(username, action, target, link, type, req = null) {
    try {
        const user = await User.findOne({ username });
        const activity = new Activity({
            user: user?.fullName || username,
            username: username,
            userAvatar: user?.avatar || null,
            action: action,
            target: target,
            link: link,
            type: type,
            time: new Date(),
            timestamp: Date.now()
        });
        await activity.save();

        const activityCount = await Activity.countDocuments();
        if (activityCount > 100) {
            const oldActivities = await Activity.find().sort({ timestamp: 1 }).limit(activityCount - 100);
            await Activity.deleteMany({ _id: { $in: oldActivities.map(a => a._id) } });
        }

        await logUserActivityLog({
            username,
            action: String(type || 'activity').trim() || 'activity',
            description: `${String(action || '').trim()} ${String(target || '').trim()}`.trim(),
            req,
            metadata: {
                target: String(target || '').trim(),
                link: String(link || '').trim(),
                activityType: String(type || 'activity').trim() || 'activity'
            }
        });

        console.log(`📌 Activity logged: ${username} ${action}`);
    } catch (err) {
        console.error('❌ Log activity error:', err);
    }
}

async function logUserActivityLog({
    username,
    action,
    description,
    req = null,
    metadata = {}
}) {
    try {
        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) return;

        const lowered = normalizedUsername.toLowerCase();
        if (lowered === 'guest' || lowered === 'ẩn danh') return;

        const user = await User.findOne({ username: normalizedUsername })
            .select('_id username lastIP lastCity lastCountry lastDevice')
            .lean();

        if (!user) return;

        const userAgent = String(req?.headers?.['user-agent'] || '').trim();
        const clientIP = req ? extractClientIP(req) : String(user.lastIP || '').trim();
        const geo = clientIP ? getGeoLocationFromIP(clientIP) : { country: '', city: '' };
        const resolvedCountry = String(user.lastCountry || geo.country || '').trim();
        const resolvedCity = String(user.lastCity || geo.city || '').trim();
        const resolvedDevice = String(
            (userAgent ? parseDeviceFromUA(userAgent) : '') ||
            user.lastDevice ||
            ''
        ).trim();

        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action: String(action || 'activity').trim() || 'activity',
            description: String(description || 'Người dùng thực hiện thao tác').trim(),
            ip: clientIP,
            device: resolvedDevice,
            userAgent,
            metadata: {
                ...metadata,
                lastCountry: resolvedCountry,
                lastCity: resolvedCity
            }
        });
    } catch (err) {
        console.error('❌ UserActivityLog write failed:', err);
    }
}

// ==================== LOGIC TÍNH TUẦN CHUẨN (ISO-8601) ====================

/**
 * Tính số tuần trong năm theo chuẩn ISO-8601
 * @param {Date} date - Ngày cần tính
 * @returns {number} - Số tuần (1-53)
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Chủ Nhật = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Đặt về Thứ 5 của tuần
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    console.log(`🔢 getWeekNumber(${date.toISOString().split('T')[0]}) = Week ${weekNo}`);
    return weekNo;
}

/**
 * Lấy mảng các tuần từ startDate đến endDate (Day-by-Day Iteration)
 * @param {string} startDateStr - Ngày bắt đầu (ISO format)
 * @param {string} endDateStr - Ngày kết thúc (ISO format)
 * @returns {number[]} - Mảng số tuần [1, 2, 3, ...]
 */
function getWeeksBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) {
        console.warn('⚠️ getWeeksBetween: Missing dates, returning []');
        return [];
    }

    const weeks = new Set();
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
        console.warn(`⚠️ getWeeksBetween: Start (${start.toISOString()}) > End (${end.toISOString()}), returning []`);
        return [];
    }

    let current = new Date(start);
    let iterations = 0;
    const maxIterations = 400; // Safety limit (400 days ≈ 1 year)

    while (current <= end && iterations < maxIterations) {
        const weekNum = getWeekNumber(current);
        weeks.add(weekNum);
        current.setDate(current.getDate() + 1); // +1 day
        iterations++;
    }

    const result = Array.from(weeks).sort((a, b) => a - b);
    console.log(`✅ getWeeksBetween(${startDateStr.split('T')[0]} → ${endDateStr.split('T')[0]}): [${result.join(', ')}] (${iterations} days scanned)`);
    return result;
}

// ==================== MAINTENANCE MODE MIDDLEWARE ====================
// Kiểm tra chế độ bảo trì - Chặn user khi isEnabled = true
// Admin vẫn truy cập được qua /api/admin/*
app.use(adminRouter.maintenanceCheck);
console.log('🔧 Maintenance mode middleware activated');

// ==================== API ROUTES ====================

// Keep-alive route for Render server
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// 🔐 API xác thực token - Kiểm tra token còn hợp lệ không
app.get('/api/verify-token', verifyToken, async (req, res) => {
    try {
        // Token hợp lệ (đã qua middleware verifyToken)
        // Lấy thông tin user mới nhất từ database
        const user = await User.findOne({ username: req.user.username })
            .select('-password')
            .lean();
        
        if (!user) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: 'User không tồn tại'
            });
        }

        // Kiểm tra tài khoản bị khóa
        if (user.isLocked) {
            return res.status(403).json({
                success: false,
                valid: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        res.json({
            success: true,
            valid: true,
            user: user
        });
    } catch (err) {
        console.error('Verify token error:', err);
        res.status(500).json({
            success: false,
            valid: false,
            message: 'Lỗi server'
        });
    }
});

// 🔐 API refresh token - Lấy token mới khi token cũ sắp hết hạn
app.post('/api/refresh-token', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user.username })
            .select('-password')
            .lean();
        
        if (!user || user.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'Không thể refresh token'
            });
        }

        // Tạo token mới
        const newToken = jwt.sign(
            {
                userId: user._id.toString(),
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token: newToken,
            user: user
        });
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// 1. Authentication APIs
// 🛡️ Áp dụng loginLimiter cho API đăng nhập (5 lần / 15 phút)
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password, clientContext = {} } = req.body;
        const rawUsername = String(username || '');
        const normalizedUsername = rawUsername.trim();
        const inputPassword = String(password || '');

        if (!normalizedUsername || !inputPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên đăng nhập và mật khẩu!'
            });
        }

        const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const usernameLooseRegex = new RegExp(`^\\s*${escapedUsername}\\s*$`);
        
        // Tìm user theo username (không so sánh password ở đây)
        const user = await User.findOne({
            $or: [
                { username: rawUsername },
                { username: normalizedUsername },
                { username: usernameLooseRegex }
            ]
        });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Tên đăng nhập hoặc mật khẩu không đúng!" 
            });
        }

        // 🔐 Hỗ trợ cả mật khẩu hash (mới) và plain text (legacy) rồi tự migrate
        const storedPassword = String(user.password || '');
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
        let isPasswordValid = false;
        let shouldMigratePasswordHash = false;

        if (isBcryptHash) {
            isPasswordValid = await bcrypt.compare(inputPassword, storedPassword);
        } else {
            isPasswordValid = inputPassword === storedPassword;
            shouldMigratePasswordHash = isPasswordValid;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: "Tên đăng nhập hoặc mật khẩu không đúng!" 
            });
        }
        
        // Kiểm tra tài khoản bị khóa
        if (user.isLocked) {
            return res.status(403).json({ 
                success: false, 
                message: "Tài khoản đã bị khóa. Vui lòng liên hệ Admin." 
            });
        }

        // Cập nhật thông tin đăng nhập
        if (shouldMigratePasswordHash) {
            user.password = await bcrypt.hash(inputPassword, BCRYPT_SALT_ROUNDS);
            console.log(`🔄 Legacy password migrated to bcrypt for user: ${user.username}`);
        }

        const clientIP = extractClientIP(req);
        const { country, city } = getGeoLocationFromIP(clientIP);
        const userAgent = req.headers['user-agent'] || '';
        const device = String(clientContext.device || '').trim() || parseDeviceFromUA(userAgent);
        const clientCountry = String(clientContext.country || '').trim().toUpperCase();
        const clientCity = String(clientContext.city || '').trim();
        const resolvedCountry = clientCountry || country;
        const resolvedCity = clientCity || city;
        
        user.lastIP = clientIP;
        user.lastCountry = resolvedCountry;
        user.lastCity = resolvedCity;
        user.lastDevice = device;
        user.lastLogin = new Date();
        await user.save();

        // Log activity
        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action: 'login',
            description: 'Đăng nhập thành công',
            ip: clientIP,
            device: device,
            userAgent: userAgent,
            metadata: {
                lastCountry: resolvedCountry,
                lastCity: resolvedCity
            }
        });

        // 🔑 Tạo JWT Token
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Trả về user info (không có password) và token
        const safeUser = user.toObject();
        delete safeUser.password;
        
        console.log(`✅ Login successful: ${username} | Token issued`);
        res.json({ 
            success: true, 
            user: safeUser,
            token: token  // 🔑 Gửi token về frontend
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/logout', async (req, res) => {
    try {
        const { username, clientContext = {} } = req.body || {};
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu username'
            });
        }

        const user = await User.findOne({ username: normalizedUsername })
            .select('_id username lastCountry lastCity')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const clientIP = extractClientIP(req);
        const { country, city } = getGeoLocationFromIP(clientIP);
        const userAgent = req.headers['user-agent'] || '';
        const device = String(clientContext.device || '').trim() || parseDeviceFromUA(userAgent);
        const clientCountry = String(clientContext.country || '').trim().toUpperCase();
        const clientCity = String(clientContext.city || '').trim();
        const resolvedCountry = clientCountry || user.lastCountry || country;
        const resolvedCity = clientCity || user.lastCity || city;

        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action: 'logout',
            description: 'Đăng xuất',
            ip: clientIP,
            device: device,
            userAgent: userAgent,
            metadata: {
                lastCountry: resolvedCountry,
                lastCity: resolvedCity
            }
        });

        return res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (err) {
        console.error('Logout log error:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// Helper: Get location info from IP using geoip-lite
function getGeoLocationFromIP(ip) {
    if (!ip) return { country: '', city: '' };
    const geo = geoip.lookup(ip);
    if (!geo) {
        return { country: '', city: '' };
    }

    return {
        country: String(geo.country || '').trim(),
        city: String(geo.city || '').trim()
    };
}

// Helper: Parse device details from User Agent (Vendor + Model + OS)
function parseDeviceFromUA(ua) {
    const parser = new UAParser(ua || '');
    const result = parser.getResult();

    const vendor = String(result?.device?.vendor || '').trim();
    const model = String(result?.device?.model || '').trim();
    const osName = String(result?.os?.name || '').trim();
    const osVersion = String(result?.os?.version || '').trim();
    const browserName = String(result?.browser?.name || '').trim();
    const browserVersion = String(result?.browser?.version || '').trim();

    const osLabel = [osName, osVersion].filter(Boolean).join(' ').trim();
    const browserLabel = String(browserName || '').trim();
    const engineLabel = String(result?.engine?.name || '').trim();

    if (model) {
        const deviceLabel = [vendor, model].filter(Boolean).join(' ').trim();
        return [deviceLabel, osLabel].filter(Boolean).join(' • ') || 'Unknown Device';
    }

    const fallbackLabel = [osLabel, browserLabel || engineLabel].filter(Boolean).join(' • ').trim();
    return fallbackLabel || 'Unknown Device';
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullName, email } = req.body;
        const normalizedUsername = String(username || '').trim();
        const normalizedPassword = String(password || '');
        const normalizedFullName = String(fullName || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        
        // Validate input
        if (!normalizedUsername || !normalizedPassword || !normalizedFullName || !normalizedEmail) {
            return res.status(400).json({ 
                success: false, 
                message: "Vui lòng điền đầy đủ thông tin!" 
            });
        }

        // Validate password strength
        if (normalizedPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: "Mật khẩu phải có ít nhất 6 ký tự!" 
            });
        }

        const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] });
        if (existingUser) {
            if (existingUser.username === normalizedUsername) {
                return res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
            }
            if (existingUser.email === normalizedEmail) {
                return res.status(400).json({ success: false, message: "Email này đã được sử dụng!" });
            }
        }

        // 🔐 Hash password trước khi lưu vào database
        const hashedPassword = await bcrypt.hash(normalizedPassword, BCRYPT_SALT_ROUNDS);
        console.log(`🔒 Password hashed for new user: ${normalizedUsername}`);

        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword, // Lưu hash, không lưu plain text
            fullName: normalizedFullName,
            email: normalizedEmail,
            avatar: '/img/avt.png',
            role: "member",
            savedDocs: []
        });
        await newUser.save();

        const safeUser = newUser.toObject();
        delete safeUser.password; // Không trả về password hash
        
        console.log(`✅ New user registered: ${normalizedUsername}`);
        res.json({ success: true, message: "Đăng ký thành công!", user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 2. Profile APIs
// 🔐 API cập nhật profile - Yêu cầu xác thực JWT
app.post('/api/update-profile', verifyToken, async (req, res) => {
    try {
        const username = req.user.username; // Lấy từ JWT token
        const { username: _, ...updateData } = req.body; // Bỏ qua username từ body
        
        // Không cho phép cập nhật password và role qua API này
        delete updateData.password;
        delete updateData.role;
        
        const user = await User.findOneAndUpdate(
            { username },
            { ...updateData, updatedAt: new Date() },
            { new: true }
        ).select('-password').lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        res.json({ success: true, user: user });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API đổi mật khẩu - Yêu cầu xác thực JWT
app.post('/api/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPass, newPass } = req.body;
        const username = req.user.username; // Lấy từ JWT token, không từ body
        
        // Validate input
        if (!oldPass || !newPass) {
            return res.status(400).json({ 
                success: false, 
                message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới!" 
            });
        }

        if (newPass.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: "Mật khẩu mới phải có ít nhất 6 ký tự!" 
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // 🔐 Kiểm tra mật khẩu cũ bằng bcrypt
        const isOldPasswordValid = await bcrypt.compare(oldPass, user.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
        }

        // 🔐 Hash mật khẩu mới
        const hashedNewPassword = await bcrypt.hash(newPass, BCRYPT_SALT_ROUNDS);
        user.password = hashedNewPassword;
        user.updatedAt = new Date();
        await user.save();

        console.log(`🔒 Password changed for user: ${username}`);
        res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 3. Upload Avatar - 🔐 Yêu cầu xác thực JWT
app.post('/api/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        const username = req.user.username; // Lấy từ JWT token
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Chưa chọn ảnh!" });
        }

        const avatarPath = file.path; // Cloudinary secure_url
        const user = await User.findOne({ username }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // TODO: Delete old avatar from Cloudinary if needed
        // Extract public_id from old avatar URL and call cloudinary.uploader.destroy(public_id)

        user.avatar = avatarPath;
        await user.save();

        res.json({ success: true, avatar: avatarPath, user: user.toObject() });
    } catch (err) {
        console.error('Upload avatar error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Quick Notes health check (debug route)
app.get('/api/quick-notes-health', (req, res) => {
    return res.json({
        success: true,
        route: '/api/quick-notes',
        serverTime: new Date().toISOString()
    });
});

// 4.1 Quick Notes APIs (MongoDB)
app.get('/api/quick-notes', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const notes = await QuickNote.find({ username })
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, notes });
    } catch (err) {
        console.error('Get quick notes error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.post('/api/quick-notes', async (req, res) => {
    try {
        const { username, title, content, color, source } = req.body;
        if (!username || !title || !content) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ghi chú' });
        }

        const newNote = new QuickNote({
            username: String(username).trim(),
            title: String(title).trim(),
            content: String(content).trim(),
            color: color || 'bg-yellow-100',
            source: source || 'dashboard'
        });
        await newNote.save();

        return res.json({ success: true, note: newNote });
    } catch (err) {
        console.error('Create quick note error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.delete('/api/quick-notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const deleted = await QuickNote.findOneAndDelete({ _id: id, username });
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ghi chú' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete quick note error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// 4.2 Announcement APIs (MongoDB)
app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find({})
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ createdAt: -1 })
            .lean();

        const formattedAnnouncements = announcements.map((item) => ({
            ...item,
            id: item._id.toString()
        }));

        return res.json({ success: true, announcements: formattedAnnouncements });
    } catch (err) {
        console.error('Get announcements error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server', announcements: [] });
    }
});

app.post('/api/announcements', upload.single('image'), async (req, res) => {
    try {
        const { username, title, content, type } = req.body;
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const user = await User.findOne({ username: normalizedUsername });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Chỉ admin mới được thêm thông báo' });
        }

        const normalizedTitle = String(title || '').trim();
        const normalizedContent = String(content || '').trim();
        if (!normalizedTitle || !normalizedContent) {
            return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung thông báo' });
        }

        const allowedTypes = ['new-feature', 'update', 'maintenance', 'other'];
        const normalizedType = allowedTypes.includes(type) ? type : 'other';

        const announcement = new Announcement({
            title: normalizedTitle,
            content: normalizedContent,
            type: normalizedType,
            image: req.file?.path || '',
            authorUsername: user.username,
            authorFullName: user.fullName || user.username,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await announcement.save();
        return res.json({
            success: true,
            announcement: {
                ...announcement.toObject(),
                id: announcement._id.toString()
            }
        });
    } catch (err) {
        console.error('Create announcement error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.put('/api/announcements/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, title, content, type, keepImage } = req.body;
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const user = await User.findOne({ username: normalizedUsername });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Chỉ admin mới được sửa thông báo' });
        }

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        const normalizedTitle = String(title || '').trim();
        const normalizedContent = String(content || '').trim();
        if (!normalizedTitle || !normalizedContent) {
            return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung thông báo' });
        }

        const allowedTypes = ['new-feature', 'update', 'maintenance', 'other'];
        const normalizedType = allowedTypes.includes(type) ? type : 'other';

        announcement.title = normalizedTitle;
        announcement.content = normalizedContent;
        announcement.type = normalizedType;

        if (req.file?.path) {
            announcement.image = req.file.path;
        } else if (String(keepImage) !== 'true') {
            announcement.image = '';
        }

        announcement.updatedAt = new Date();
        await announcement.save();

        return res.json({
            success: true,
            announcement: {
                ...announcement.toObject(),
                id: announcement._id.toString()
            }
        });
    } catch (err) {
        console.error('Update announcement error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.delete('/api/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body || {};
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const user = await User.findOne({ username: normalizedUsername });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Chỉ admin mới được xóa thông báo' });
        }

        const deleted = await Announcement.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete announcement error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// 4. Document APIs
// 🛡️ [ENTERPRISE] Data Minimization - loại bỏ __v và thông tin nhạy cảm
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await Document.find()
            .select('-__v') // 🛡️ Loại bỏ version key
            .sort({ createdAt: -1 })
            .lean();
        // Map _id to id for frontend compatibility
        const formattedDocs = docs.map(doc => ({
            ...doc,
            id: doc._id.toString()
        }));
        res.json(formattedDocs);
    } catch (err) {
        console.error('Get documents error:', err);
        res.status(500).json([]);
    }
});

// 📄 Document Detail View (Zen Mode Viewer)
app.get('/document/:id', async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id).lean();
        if (!doc) {
            return res.status(404).send('Không tìm thấy tài liệu');
        }
        // Add id field for frontend compatibility
        doc.id = doc._id.toString();
        res.render('document-detail', { document: doc });
    } catch (err) {
        console.error('Document detail error:', err);
        res.status(500).send('Lỗi server');
    }
});

app.post('/api/upload-document', (req, res, next) => {
    // 🔥 SỬ DỤNG MEMORY STORAGE + CLOUDINARY SDK TRỰC TIẾP
    documentUpload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn! Kích thước tối đa là 50MB.'
                });
            }
            // 🛡️ [ENTERPRISE] Error Cloaking - ẨN lỗi chi tiết upload
            return res.status(400).json({
                success: false,
                message: 'Không thể tải file lên. Vui lòng kiểm tra định dạng file.'
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { name, type, uploader, course, username, visibility } = req.body;
        const file = req.file;

        // CRITICAL: Check if file exists immediately
        if (!file) {
            console.error("UPLOAD ERROR: No file received");
            return res.status(400).json({ success: false, message: "Chưa chọn file!" });
        }

        const decodedOriginalName = decodeFileName(file.originalname);

        // 🔥 UPLOAD TRỰC TIẾP QUA CLOUDINARY SDK với full control
        const cloudinaryResult = await uploadToCloudinary(file.buffer, file.originalname, file.mimetype);
        let cloudinaryUrl = cloudinaryResult.secure_url;

        console.log(`☁️ Cloudinary result:`, {
            url: cloudinaryUrl,
            resource_type: cloudinaryResult.resource_type,
            format: cloudinaryResult.format,
            public_id: cloudinaryResult.public_id
        });

        const newDoc = new Document({
            name: name || decodedOriginalName.replace(/\.[^/.]+$/, ""),
            uploader: uploader || "Ẩn danh",
            uploaderUsername: username || null,
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            type: type || "other",
            path: cloudinaryUrl, // Store Cloudinary secure_url
            size: file.size,
            downloadCount: 0,
            course: course || '',
            visibility: visibility || 'public'
        });

        await newDoc.save();

        if (visibility !== 'private') {
            await logActivity(username || 'Ẩn danh', 'đã tải lên', newDoc.name, `#doc-${newDoc._id}`, 'upload', req);
        }

        // Return document with id field for frontend compatibility
        const docResponse = {
            ...newDoc.toObject(),
            id: newDoc._id.toString()
        };

        console.log(`✅ Document uploaded to Cloudinary: ${newDoc.name} (ID: ${newDoc._id})`);
        console.log(`🔗 Cloudinary URL: ${cloudinaryUrl}`);

        // Return status 200 with success
        return res.status(200).json({ success: true, document: docResponse });
    } catch (error) {
        // 🛡️ [ENTERPRISE] Log đầy đủ server-side, ẨN chi tiết client-side
        console.error("UPLOAD ERROR:", JSON.stringify(error, null, 2));
        console.error("UPLOAD ERROR STACK:", error.stack);
        return res.status(500).json({ success: false, message: "Đã xảy ra lỗi hệ thống khi tải file" });
    }
});

app.post('/api/toggle-save-doc', async (req, res) => {
    try {
        const { username, docId } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const docIndex = user.savedDocs.indexOf(docId);
        const action = docIndex === -1 ? "saved" : "unsaved";

        if (action === "saved") {
            user.savedDocs.push(docId);
        } else {
            user.savedDocs.splice(docIndex, 1);
        }

        await user.save();
        res.json({ success: true, action, savedDocs: user.savedDocs });
    } catch (err) {
        console.error('Toggle save doc error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API xóa tài liệu - Yêu cầu xác thực JWT
app.post('/api/delete-document', verifyToken, async (req, res) => {
    try {
        const { docId } = req.body;
        const username = req.user.username; // Lấy từ JWT token
        const userRole = req.user.role;
        
        const user = await User.findOne({ username }).select('-password');
        if (!user) {
            return res.status(403).json({ success: false, message: "Người dùng không tồn tại!" });
        }

        const doc = await Document.findById(docId);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        const isAdmin = userRole === 'admin';
        const isUploader = doc.uploaderUsername === username;
        const isLegacyUploader = !doc.uploaderUsername && doc.uploader === user.fullName;

        if (!isAdmin && !isUploader && !isLegacyUploader) {
            return res.status(403).json({ success: false, message: "⛔ Bạn không có quyền xóa tài liệu của người khác!" });
        }

        // Delete file from Cloudinary
        try {
            const urlParts = doc.path.split('/');
            const fileWithExt = urlParts[urlParts.length - 1];
            const publicId = `whalio-documents/${fileWithExt.split('.')[0]}`;
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            console.log(`✅ Deleted file from Cloudinary: ${publicId}`);
        } catch (err) {
            console.warn("Lỗi xóa file từ Cloudinary:", err.message);
        }

        await Document.findByIdAndDelete(docId);
        await logActivity(username, 'đã xóa tài liệu', doc.name, '#', 'delete', req);

        res.json({ success: true, message: "Đã xóa tài liệu vĩnh viễn!" });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API cập nhật tài liệu - Yêu cầu xác thực JWT
app.post('/api/update-document', verifyToken, async (req, res) => {
    try {
        const { docId, name, course, visibility } = req.body;
        const username = req.user.username; // Lấy từ JWT token
        const userRole = req.user.role;
        
        const user = await User.findOne({ username }).select('-password');
        const doc = await Document.findById(docId);

        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        const isAdmin = userRole === 'admin';
        let isOwner = false;
        if (doc.uploaderUsername) {
            isOwner = doc.uploaderUsername === username;
        } else {
            isOwner = doc.uploader === user?.fullName;
        }

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: "⛔ Bạn không có quyền sửa tài liệu của người khác!" });
        }

        if (name) doc.name = name.trim();
        if (course !== undefined) doc.course = course;
        if (visibility) doc.visibility = visibility;

        await doc.save();
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) {
        console.error('Update document error:', err);
        // 🛡️ [ENTERPRISE] Error Cloaking - ẨN thông tin lỗi chi tiết
        res.status(500).json({ success: false, message: "Đã xảy ra lỗi hệ thống" });
    }
});

// 5. Password Reset - Đặt lại mật khẩu (không cần token, dùng email xác minh)
app.post('/api/reset-password-force', async (req, res) => {
    try {
        const { username, email, newPass } = req.body;
        
        // Validate input
        if (!username || !email || !newPass) {
            return res.status(400).json({ 
                success: false, 
                message: "Vui lòng điền đầy đủ thông tin!" 
            });
        }

        if (newPass.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: "Mật khẩu mới phải có ít nhất 6 ký tự!" 
            });
        }

        const user = await User.findOne({ username, email });

        if (!user) {
            return res.status(400).json({ success: false, message: "Tên đăng nhập hoặc Email không chính xác!" });
        }

        // 🔐 Hash mật khẩu mới trước khi lưu
        const hashedPassword = await bcrypt.hash(newPass, BCRYPT_SALT_ROUNDS);
        user.password = hashedPassword;
        user.updatedAt = new Date();
        await user.save();

        console.log(`🔒 Password reset for user: ${username}`);
        res.json({ success: true, message: "Mật khẩu đã được đặt lại thành công!" });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 6. Stats API
app.get('/api/stats', async (req, res) => {
    try {
        const totalDocuments = await Document.countDocuments();
        const totalUsers = await User.countDocuments();
        const recentDocuments = await Document.find().sort({ createdAt: -1 }).limit(10).lean();
        const docs = await Document.find().lean();
        const storageUsed = docs.reduce((sum, doc) => sum + (doc.size || 0), 0);

        const stats = {
            totalDocuments,
            totalUsers,
            recentDocuments,
            storageUsed
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 7. Exam APIs
app.get('/api/exams', async (req, res) => {
    try {
        // Tuyệt chiêu: Lấy mọi thứ TRỪ questions và questionBank
        const exams = await Exam.find()
            .select('-questions -questionBank')
            .sort({ createdAt: -1 })
            .lean();

        // Giờ dữ liệu trả về cực nhẹ, Koyeb sẽ không bao giờ báo Unhealthy nữa
        res.json(exams);
    } catch (err) {
        console.error('Get exams error:', err);
        res.json([]);
    }
});

// Get single exam with questions
app.get('/api/exams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findOne({ examId: id }).lean();

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        res.json({
            success: true,
            exam: {
                id: exam.examId,
                title: exam.title,
                subject: exam.subject,
                questions: exam.questions,
                time: exam.time,
                image: exam.image,
                createdBy: exam.createdBy,
                questionBank: exam.questionBank || [],
                createdAt: exam.createdAt
            }
        });
    } catch (err) {
        console.error('Get exam error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/delete-exam', async (req, res) => {
    try {
        const { examId, username } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(403).json({ success: false, message: "⛔ Người dùng không tồn tại!" });
        }

        const exam = await Exam.findOne({ examId });
        if (!exam) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi!" });
        }

        const isAdmin = user.role === 'admin';
        const isCreator = exam.createdBy === username;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ success: false, message: "⛔ Bạn chỉ có thể xóa đề thi do chính mình tạo!" });
        }

        await Exam.findOneAndDelete({ examId });
        console.log(`🗑️ ${username} đã xóa đề thi ID: ${examId}`);
        res.json({ success: true, message: "Đã xóa đề thi thành công!" });
    } catch (err) {
        console.error('Delete exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi xóa đề" });
    }
});

app.post('/api/create-exam', async (req, res) => {
    try {
        const { id, title, time, limit, subject, questions, image, username } = req.body;

        const newExam = new Exam({
            examId: id,
            title: title,
            subject: subject || "Tự tạo",
            questions: limit,
            time: time,
            image: image || "./img/snvvnghen.png.png",
            createdBy: username || "Unknown",
            questionBank: questions
        });

        await newExam.save();
        console.log(`✅ Đã tạo đề thi mới: ${title} (ID: ${id}) bởi ${username}`);
        res.json({ success: true, message: "Đã lưu đề thi thành công!" });
    } catch (err) {
        console.error('Create exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi lưu đề thi" });
    }
});

// 8. Community APIs
app.get('/api/recent-activities', async (req, res) => {
    try {
        const activities = await Activity.find()
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
        res.json({ success: true, activities, count: activities.length });
    } catch (err) {
        console.error('Get recent activities error:', err);
        res.json({ success: true, activities: [], count: 0 });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find({ deleted: false })
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, posts });
    } catch (err) {
        console.error('Get posts error:', err);
        res.json({ success: true, posts: [] });
    }
});

app.post('/api/posts', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { content, username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ success: false, message: "Người dùng không tồn tại!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bài viết không được trống!" });
        }

        const images = req.files?.images ? req.files.images.map(f => f.path) : []; // Cloudinary URLs
        const files = req.files?.files
            ? req.files.files
                .filter(f => !f.mimetype.startsWith('video/'))
                .map(f => ({
                    originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                    name: f.decodedOriginalName || decodeFileName(f.originalname),
                    path: f.path, // Cloudinary secure_url
                    size: f.size,
                    mimeType: f.mimetype
                }))
            : [];

        if (req.files?.files && req.files.files.some(f => f.mimetype.startsWith('video/'))) {
            // Delete videos from Cloudinary
            for (let file of req.files.files) {
                if (file.mimetype.startsWith('video/')) {
                    try {
                        // Extract public_id from Cloudinary path
                        const publicId = file.filename; // Cloudinary public_id
                        await cloudinary.uploader.destroy(publicId);
                    } catch (e) {
                        console.warn('Failed to delete video from Cloudinary:', e.message);
                    }
                }
            }
            return res.status(400).json({ success: false, message: "❌ Không được phép đăng video!" });
        }

        const newPost = new Post({
            authorId: user._id,
            author: username,
            authorFullName: user.fullName || username,
            authorAvatar: user.avatar || null,
            content: content,
            images: images,
            files: files,
            likes: 0,
            likedBy: [],
            comments: [],
            savedBy: []
        });

        await newPost.save();
        await logActivity(username, 'đã đăng bài viết', 'trong Cộng đồng', `#post-${newPost._id}`, 'post', req);

        console.log(`✅ Bài viết mới từ ${username}: ID ${newPost._id}`);
        res.json({ success: true, message: "Đã đăng bài thành công!", post: newPost });
    } catch (err) {
        console.error('Create post error:', err);
        // 🛡️ [ENTERPRISE] Error Cloaking
        res.status(500).json({ success: false, message: "Đã xảy ra lỗi hệ thống" });
    }
});

app.post('/api/posts/like', async (req, res) => {
    try {
        const { postId, username } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const likeIndex = post.likedBy.indexOf(username);
        if (likeIndex === -1) {
            post.likedBy.push(username);
            post.likes = (post.likes || 0) + 1;
        } else {
            post.likedBy.splice(likeIndex, 1);
            post.likes = Math.max(0, (post.likes || 0) - 1);
        }

        await post.save();
        res.json({ success: true, likes: post.likes });
    } catch (err) {
        console.error('Like post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/comments', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { postId, content, username } = req.body;
        const user = await User.findOne({ username });
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const images = req.files?.images ? req.files.images.map(f => f.path) : []; // Cloudinary URLs
        const files = req.files?.files
            ? req.files.files.map(f => ({
                originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                name: f.decodedOriginalName || decodeFileName(f.originalname),
                path: f.path, // Cloudinary secure_url
                size: f.size,
                mimeType: f.mimetype
            }))
            : [];

        const comment = {
            id: Date.now(),
            author: username,
            authorFullName: user?.fullName || username,
            authorAvatar: user?.avatar || null,
            content: content,
            images: images,
            files: files,
            reactions: {},
            replies: [],
            createdAt: new Date()
        };

        post.comments.push(comment);
        await post.save();
        await logActivity(username, 'đã bình luận', `vào bài viết của ${post.author}`, `#post-${postId}`, 'comment', req);

        res.json({ success: true, comment: comment });
    } catch (err) {
        console.error('Comment post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API lưu bài viết - Yêu cầu xác thực JWT
app.post('/api/posts/save', verifyToken, async (req, res) => {
    try {
        const { postId } = req.body;
        const username = req.user.username; // Lấy từ JWT token
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const saveIndex = post.savedBy.indexOf(username);
        if (saveIndex === -1) {
            post.savedBy.push(username);
        } else {
            post.savedBy.splice(saveIndex, 1);
        }

        await post.save();
        res.json({ success: true, saved: saveIndex === -1 });
    } catch (err) {
        console.error('Save post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API xóa bài viết - Yêu cầu xác thực JWT
app.post('/api/posts/delete', verifyToken, async (req, res) => {
    try {
        const { postId } = req.body;
        const username = req.user.username; // Lấy từ JWT token
        const userRole = req.user.role;
        
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const isAdmin = userRole === 'admin';
        const isAuthor = post.author === username;

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bài viết này!" });
        }

        post.deleted = true;
        await post.save();
        res.json({ success: true, message: "Đã xóa bài viết" });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 🔐 API xóa bình luận - Yêu cầu xác thực JWT
app.post('/api/comments/delete', verifyToken, async (req, res) => {
    try {
        const { postId, commentId } = req.body;
        const username = req.user.username; // Lấy từ JWT token
        const userRole = req.user.role;
        
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        const isAdmin = userRole === 'admin';
        const isCommentAuthor = comment.author === username;

        if (!isAdmin && !isCommentAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bình luận này!" });
        }

        post.comments = post.comments.filter(c => c.id !== commentId);
        await post.save();
        res.json({ success: true, message: "Đã xóa bình luận" });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/posts/edit', async (req, res) => {
    try {
        // CRITICAL: Extract postId as STRING (MongoDB ObjectId)
        let { postId, content, username } = req.body;

        // DEFENSIVE: Ensure postId is always a string, never a number
        postId = String(postId);

        console.log('📝 Edit Post Request - postId:', postId, 'type:', typeof postId);
        console.log('📝 Edit Post Request - username:', username);
        console.log('📝 Edit Post Request - content length:', content?.length);

        // Validation
        if (!postId || postId === 'undefined' || postId === 'null') {
            console.error('❌ Invalid postId received:', postId);
            return res.status(400).json({ success: false, message: "ID bài viết không hợp lệ!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bài viết không được trống!" });
        }

        if (!username) {
            return res.status(401).json({ success: false, message: "Chưa đăng nhập!" });
        }

        // Find post by MongoDB ObjectId (as string)
        const post = await Post.findById(postId);

        if (!post) {
            console.error('❌ Post not found with ID:', postId);
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        // Verify ownership
        if (post.author !== username) {
            console.error('❌ Permission denied - author:', post.author, 'vs user:', username);
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bài viết này!" });
        }

        // Update post
        post.content = content;
        post.editedAt = new Date();
        await post.save();

        console.log('✅ Post updated successfully - ID:', postId);

        res.json({ success: true, message: "Đã cập nhật bài viết", post });
    } catch (err) {
        console.error('❌ Edit post error:', err);
        console.error('Error type:', err.name);
        console.error('Error message:', err.message);
        // 🛡️ [ENTERPRISE] Error Cloaking - Log đầy đủ server-side, ẨN chi tiết client-side
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi hệ thống"
            // 🛡️ KHÔNG trả về: errorType, err.message, err.stack
        });
    }
});

app.post('/api/edit-comment', async (req, res) => {
    try {
        const { postId, commentId, content, username } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        if (comment.author !== username) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bình luận này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bình luận không được trống!" });
        }

        comment.content = content;
        comment.editedAt = new Date();
        await post.save();

        res.json({ success: true, message: "Đã cập nhật bình luận", comment });
    } catch (err) {
        console.error('Edit comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/reply-comment', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { postId, parentCommentId, content, username } = req.body;
        const user = await User.findOne({ username });
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments.find(c => c.id == parentCommentId);
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        const images = req.files?.images ? req.files.images.map(f => f.path) : []; // Cloudinary URLs
        const files = req.files?.files
            ? req.files.files.map(f => ({
                originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                name: f.decodedOriginalName || decodeFileName(f.originalname),
                path: f.path, // Cloudinary secure_url
                size: f.size,
                mimeType: f.mimetype
            }))
            : [];

        const reply = {
            id: Date.now(),
            author: username,
            authorFullName: user?.fullName || username,
            authorAvatar: user?.avatar || null,
            content: content,
            images: images,
            files: files,
            reactions: {},
            createdAt: new Date(),
            replyTo: parentCommentId
        };

        if (!parentComment.replies) parentComment.replies = [];
        parentComment.replies.push(reply);

        await post.save();
        res.json({ success: true, message: "Trả lời thành công", reply });
    } catch (err) {
        console.error('Reply comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/add-emoji-reaction', async (req, res) => {
    try {
        const { postId, commentId, emoji, username } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        if (!comment.reactions) comment.reactions = {};

        if (comment.reactions[emoji]) {
            const userEmojis = comment.reactions[emoji].users || [];
            const userIndex = userEmojis.indexOf(username);
            if (userIndex > -1) {
                userEmojis.splice(userIndex, 1);
            }

            if (userEmojis.length === 0) {
                delete comment.reactions[emoji];
            } else {
                comment.reactions[emoji].count = userEmojis.length;
                comment.reactions[emoji].users = userEmojis;
            }
        } else {
            comment.reactions[emoji] = {
                count: 1,
                users: [username]
            };
        }

        await post.save();
        res.json({ success: true, message: "Thêm emoji thành công", reactions: comment.reactions });
    } catch (err) {
        console.error('Add emoji reaction error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/edit-reply', async (req, res) => {
    try {
        const { postId, parentCommentId, replyId, content, username } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments.find(c => c.id === parentCommentId);
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        const reply = parentComment.replies?.find(r => r.id === replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: "Trả lời không tồn tại!" });
        }

        if (reply.author !== username) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa trả lời này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung trả lời không được trống!" });
        }

        reply.content = content;
        reply.editedAt = new Date();

        await post.save();
        res.json({ success: true, message: "Đã cập nhật trả lời", reply });
    } catch (err) {
        console.error('Edit reply error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/delete-reply', async (req, res) => {
    try {
        const { postId, parentCommentId, replyId, username } = req.body;
        const user = await User.findOne({ username });
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments.find(c => c.id === parentCommentId);
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        const reply = parentComment.replies?.find(r => r.id === replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: "Trả lời không tồn tại!" });
        }

        const isAdmin = user && user.role === 'admin';
        const isReplyAuthor = reply.author === username;

        if (!isAdmin && !isReplyAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa trả lời này!" });
        }

        parentComment.replies = parentComment.replies.filter(r => r.id !== replyId);
        await post.save();
        res.json({ success: true, message: "Đã xóa trả lời" });
    } catch (err) {
        console.error('Delete reply error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// ==================== STUDY TIMER APIs ====================

// 1. Lưu phiên học (Gọi khi bấm Dừng hoặc Hết giờ)
app.post('/api/study/save', async (req, res) => {
    try {
        const { username, duration } = req.body; // duration tính bằng PHÚT
        if (!username || !duration) return res.status(400).json({ success: false });

        const newSession = new StudySession({
            username,
            duration,
            date: new Date()
        });

        await newSession.save();
        console.log(`⏱️ Đã lưu ${duration} phút học cho ${username}`);
        res.json({ success: true, message: "Đã lưu thời gian học!" });
    } catch (err) {
        console.error('Save study session error:', err);
        res.status(500).json({ success: false });
    }
});

// 2. Lấy dữ liệu cho Biểu đồ Dashboard (7 ngày gần nhất)
app.get('/api/study/stats', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ success: false });

        // Lấy dữ liệu 7 ngày qua
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sessions = await StudySession.find({
            username,
            date: { $gte: sevenDaysAgo }
        }).sort({ date: 1 });

        // Gom nhóm theo ngày (Format: DD/MM)
        const stats = {};

        // Tạo khung 7 ngày (để ngày nào không học vẫn hiện 0)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            stats[key] = 0;
        }

        // Cộng dồn thời gian
        sessions.forEach(session => {
            const key = new Date(session.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            if (stats[key] !== undefined) {
                stats[key] += session.duration;
            }
        });

        // Chuyển về mảng cho Recharts
        const chartData = Object.keys(stats).map(date => ({
            name: date,
            minutes: stats[date]
        }));

        res.json({ success: true, data: chartData });
    } catch (err) {
        console.error('Get study stats error:', err);
        res.status(500).json({ success: false });
    }
});

// 3. StudyTimer Task APIs
app.get('/api/study/tasks', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const tasks = await StudyTask.find({ username: String(username).trim() })
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, tasks });
    } catch (err) {
        console.error('Get study tasks error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.post('/api/study/tasks', async (req, res) => {
    try {
        const { username, title } = req.body;
        const normalizedUsername = String(username || '').trim();
        const normalizedTitle = String(title || '').trim();

        if (!normalizedUsername || !normalizedTitle) {
            return res.status(400).json({ success: false, message: 'Thiếu username hoặc title' });
        }

        const now = new Date();
        const task = new StudyTask({
            username: normalizedUsername,
            title: normalizedTitle,
            isDone: false,
            checkedAt: null,
            lastInteractedAt: now,
            createdAt: now,
            updatedAt: now
        });
        await task.save();
        return res.json({ success: true, task });
    } catch (err) {
        console.error('Create study task error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.patch('/api/study/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, title, isDone, checkedAt, lastInteractedAt } = req.body || {};
        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const update = { updatedAt: new Date() };
        if (typeof title === 'string' && title.trim()) {
            update.title = title.trim();
        }
        if (typeof isDone === 'boolean') {
            update.isDone = isDone;
        }
        if (checkedAt === null || checkedAt === '') {
            update.checkedAt = null;
        } else if (checkedAt) {
            const checkedDate = new Date(checkedAt);
            if (!Number.isNaN(checkedDate.getTime())) {
                update.checkedAt = checkedDate;
            }
        }
        if (lastInteractedAt) {
            const interactedDate = new Date(lastInteractedAt);
            if (!Number.isNaN(interactedDate.getTime())) {
                update.lastInteractedAt = interactedDate;
            }
        } else {
            update.lastInteractedAt = new Date();
        }

        const task = await StudyTask.findOneAndUpdate(
            { _id: id, username: normalizedUsername },
            { $set: update },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        }

        return res.json({ success: true, task });
    } catch (err) {
        console.error('Update study task error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.delete('/api/study/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const normalizedUsername = String(req.query.username || '').trim();
        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const deleted = await StudyTask.findOneAndDelete({ _id: id, username: normalizedUsername });
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete study task error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// 9. Timetable APIs
app.post('/api/timetable', async (req, res) => {
    try {
        const { username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange, startDate, endDate, dateRangeDisplay, teacher, notes } = req.body;

        if (!username) {
            return res.json({ success: false, message: '❌ Missing username' });
        }

        if (!subject || !room || !day || !session || !startPeriod || !numPeriods) {
            return res.json({ success: false, message: '❌ Thiếu thông tin bắt buộc' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: '❌ Người dùng không tồn tại' });
        }

        // 🔥 CRITICAL: Tính mảng weeks từ startDate/endDate
        let calculatedWeeks = [];
        if (startDate && endDate) {
            calculatedWeeks = getWeeksBetween(startDate, endDate);
            console.log(`📊 Calculated weeks for "${subject}": [${calculatedWeeks.join(', ')}]`);
        } else {
            console.warn(`⚠️ Class "${subject}" has NO startDate/endDate, weeks will be empty`);
        }

        const newClass = new Timetable({
            username,
            subject: subject.trim(),
            room: room.trim(),
            campus: campus || 'Cơ sở chính',
            day,
            session,
            startPeriod: parseInt(startPeriod),
            numPeriods: parseInt(numPeriods),
            timeRange,
            teacher: teacher ? teacher.trim() : '', // 🔥 MỚI: Lưu tên giáo viên
            notes: notes || [], // 🔥 MỚI: Lưu ghi chú
            weeks: calculatedWeeks, // 🔥 LƯU MẢNG TUẦN
            startDate: startDate || null,
            endDate: endDate || null,
            dateRangeDisplay: dateRangeDisplay || '',
        });

        await newClass.save();
        console.log(`✅ Created class: "${subject}" | Teacher: "${teacher || 'N/A'}" | Weeks: [${calculatedWeeks.join(', ')}]`);
        res.json({ success: true, message: 'Thêm lớp học thành công!', class: newClass });
    } catch (err) {
        console.error('❌ Create class error:', err);
        // 🛡️ [ENTERPRISE] Error Cloaking
        res.json({ success: false, message: 'Đã xảy ra lỗi hệ thống' });
    }
});

app.get('/api/timetable', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.json({ success: false, message: 'Missing username' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // �️ [ENTERPRISE] Data Minimization - loại bỏ __v
        let userClasses = await Timetable.find({ username })
            .select('-__v')
            .lean();

        // 🔥 CRITICAL FIX: Tính lại weeks nếu rỗng
        userClasses = userClasses.map(cls => {
            if ((!cls.weeks || cls.weeks.length === 0) && cls.startDate && cls.endDate) {
                console.warn(`⚠️ Class "${cls.subject}" has empty weeks, recalculating...`);
                cls.weeks = getWeeksBetween(cls.startDate, cls.endDate);
                console.log(`✅ Recalculated weeks: [${cls.weeks.join(', ')}]`);
            }
            return cls;
        });

        console.log(`📅 Loaded ${userClasses.length} classes for ${username}`);
        res.json({ success: true, timetable: userClasses });
    } catch (err) {
        console.error('❌ Load timetable error:', err);
        res.json({ success: false, message: 'Server error', timetable: [] });
    }
});

// 🔐 API xóa lớp học - Yêu cầu xác thực JWT
app.post('/api/timetable/delete', verifyToken, async (req, res) => {
    try {
        const { classId } = req.body;
        const username = req.user.username; // Lấy từ JWT token

        if (!classId) {
            return res.json({ success: false, message: '❌ Thiếu classId' });
        }

        const classToDelete = await Timetable.findById(classId);
        if (!classToDelete) {
            return res.json({ success: false, message: '❌ Không tìm thấy lớp học' });
        }

        // Kiểm tra quyền sở hữu
        if (classToDelete.username !== username) {
            return res.status(403).json({ success: false, message: '❌ Bạn không có quyền xóa lớp này' });
        }

        await Timetable.findByIdAndDelete(classId);
        console.log(`🗑️ Deleted class ${classId} by ${username}`);
        res.json({ success: true, message: 'Xóa lớp học thành công!' });
    } catch (err) {
        console.error('Error deleting class:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// 🔐 Xóa toàn bộ lịch học - Yêu cầu xác thực JWT
app.delete('/api/timetable/clear', verifyToken, async (req, res) => {
    try {
        const username = req.user.username; // Lấy từ JWT token

        // Xóa tất cả lịch học của user
        const result = await Timetable.deleteMany({ username: username });

        console.log(`🗑️ Cleared ${result.deletedCount} timetable entries for user: ${username}`);

        res.json({
            success: true,
            message: `Đã xóa ${result.deletedCount} lớp học`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error clearing timetable:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// 🔐 API cập nhật lớp học - Yêu cầu xác thực JWT
app.post('/api/timetable/update', verifyToken, async (req, res) => {
    try {
        const { classId, subject, room, campus, day, session, startPeriod, numPeriods, timeRange, startDate, endDate, dateRangeDisplay, teacher } = req.body;
        const username = req.user.username; // Lấy từ JWT token

        if (!classId) {
            return res.json({ success: false, message: '❌ Thiếu classId' });
        }

        const classToUpdate = await Timetable.findById(classId);
        if (!classToUpdate) {
            return res.json({ success: false, message: '❌ Không tìm thấy lớp học' });
        }

        // Kiểm tra quyền sở hữu
        if (classToUpdate.username !== username) {
            return res.status(403).json({ success: false, message: '❌ Bạn không có quyền sửa lớp này' });
        }

        // 🔥 Tính lại mảng weeks khi update
        let calculatedWeeks = [];
        if (startDate && endDate) {
            calculatedWeeks = getWeeksBetween(startDate, endDate);
            console.log(`📊 Recalculated weeks for "${subject}": [${calculatedWeeks.join(', ')}]`);
        }

        classToUpdate.subject = subject.trim();
        classToUpdate.room = room.trim();
        classToUpdate.campus = campus || 'Cơ sở chính';
        classToUpdate.day = day;
        classToUpdate.session = session;
        classToUpdate.startPeriod = parseInt(startPeriod);
        classToUpdate.numPeriods = parseInt(numPeriods);
        classToUpdate.timeRange = timeRange;
        classToUpdate.teacher = teacher ? teacher.trim() : '';
        classToUpdate.weeks = calculatedWeeks;
        classToUpdate.startDate = startDate || null;
        classToUpdate.endDate = endDate || null;
        classToUpdate.dateRangeDisplay = dateRangeDisplay || '';
        classToUpdate.updatedAt = new Date();

        await classToUpdate.save();
        console.log(`✅ Updated class "${subject}" | Teacher: "${teacher || 'N/A'}" | Weeks: [${calculatedWeeks.join(', ')}]`);
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
        console.error('❌ Update class error:', err);
        // 🛡️ [ENTERPRISE] Error Cloaking
        res.json({ success: false, message: 'Đã xảy ra lỗi hệ thống' });
    }
});

// 🔥 MỚI: API quản lý Notes cho Class
app.post('/api/timetable/update-note', async (req, res) => {
    try {
        const { classId, username, action, note } = req.body;
        // action: 'add' | 'update' | 'delete' | 'toggle'
        // note: { id, content, deadline, isDone }
        let deadlineLog = null;

        if (!classId || !username || !action) {
            return res.json({ success: false, message: '❌ Thiếu thông tin bắt buộc' });
        }

        const classToUpdate = await Timetable.findById(classId);
        if (!classToUpdate) {
            return res.json({ success: false, message: '❌ Không tìm thấy lớp học' });
        }

        if (classToUpdate.username !== username) {
            return res.json({ success: false, message: '❌ Bạn không có quyền sửa lớp này' });
        }

        // Đảm bảo notes là mảng
        if (!classToUpdate.notes) {
            classToUpdate.notes = [];
        }

        switch (action) {
            case 'add':
                if (!note || !note.content) {
                    return res.json({ success: false, message: '❌ Nội dung ghi chú không được trống' });
                }

                // 🔥 DEBUG: Log incoming deadline
                console.log(`📝 Received deadline from client:`, note.deadline, `(type: ${typeof note.deadline})`);

                const newNote = {
                    id: note.id || Date.now().toString(),
                    content: note.content.trim(),
                    deadline: note.deadline ? new Date(note.deadline) : null,
                    isDone: false,
                    createdAt: new Date()
                };

                // 🔥 DEBUG: Log saved deadline
                console.log(`📝 Saved deadline:`, newNote.deadline);

                classToUpdate.notes.push(newNote);
                console.log(`📝 Added note to "${classToUpdate.subject}": "${newNote.content}"`);

                if (newNote.deadline) {
                    deadlineLog = {
                        action: 'deadline_create',
                        description: `Thêm deadline môn ${classToUpdate.subject}: ${newNote.content}`
                    };
                }
                break;

            case 'update':
                if (!note || !note.id) {
                    return res.json({ success: false, message: '❌ Thiếu ID ghi chú' });
                }
                const noteToUpdate = classToUpdate.notes.find(n => n.id === note.id);
                if (noteToUpdate) {
                    if (note.content !== undefined) noteToUpdate.content = note.content.trim();
                    if (note.deadline !== undefined) noteToUpdate.deadline = note.deadline ? new Date(note.deadline) : null;
                    if (note.isDone !== undefined) noteToUpdate.isDone = note.isDone;
                    console.log(`✏️ Updated note "${note.id}" in "${classToUpdate.subject}"`);

                    if (note.deadline !== undefined) {
                        deadlineLog = {
                            action: 'deadline_update',
                            description: `Cập nhật deadline môn ${classToUpdate.subject}: ${noteToUpdate.content}`
                        };
                    }
                } else {
                    return res.json({ success: false, message: '❌ Không tìm thấy ghi chú' });
                }
                break;

            case 'delete':
                if (!note || !note.id) {
                    return res.json({ success: false, message: '❌ Thiếu ID ghi chú' });
                }
                const noteToDelete = classToUpdate.notes.find(n => n.id === note.id);
                const initialLength = classToUpdate.notes.length;
                classToUpdate.notes = classToUpdate.notes.filter(n => n.id !== note.id);
                if (classToUpdate.notes.length < initialLength) {
                    console.log(`🗑️ Deleted note "${note.id}" from "${classToUpdate.subject}"`);

                    if (noteToDelete?.deadline) {
                        deadlineLog = {
                            action: 'deadline_delete',
                            description: `Xóa deadline môn ${classToUpdate.subject}: ${noteToDelete.content}`
                        };
                    }
                } else {
                    return res.json({ success: false, message: '❌ Không tìm thấy ghi chú' });
                }
                break;

            case 'toggle':
                if (!note || !note.id) {
                    return res.json({ success: false, message: '❌ Thiếu ID ghi chú' });
                }
                const noteToToggle = classToUpdate.notes.find(n => n.id === note.id);
                if (noteToToggle) {
                    noteToToggle.isDone = !noteToToggle.isDone;
                    console.log(`🔄 Toggled note "${note.id}" in "${classToUpdate.subject}" to isDone=${noteToToggle.isDone}`);

                    if (noteToToggle.deadline) {
                        deadlineLog = {
                            action: noteToToggle.isDone ? 'deadline_complete' : 'deadline_reopen',
                            description: `${noteToToggle.isDone ? 'Hoàn thành' : 'Mở lại'} deadline môn ${classToUpdate.subject}: ${noteToToggle.content}`
                        };
                    }
                } else {
                    return res.json({ success: false, message: '❌ Không tìm thấy ghi chú' });
                }
                break;

            default:
                return res.json({ success: false, message: '❌ Action không hợp lệ' });
        }

        classToUpdate.updatedAt = new Date();
        await classToUpdate.save();

        if (deadlineLog) {
            await logUserActivityLog({
                username,
                action: deadlineLog.action,
                description: deadlineLog.description,
                req,
                metadata: {
                    classId: classToUpdate._id.toString(),
                    subject: classToUpdate.subject,
                    source: 'timetable-note'
                }
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật ghi chú thành công!',
            notes: classToUpdate.notes
        });
    } catch (err) {
        console.error('❌ Update note error:', err);
        // 🛡️ [ENTERPRISE] Error Cloaking
        res.json({ success: false, message: 'Đã xảy ra lỗi hệ thống' });
    }
});

// ==================== DEBUG & ADMIN ENDPOINTS ====================

// Manual seed trigger endpoint
app.get('/api/debug/seed-exams', async (req, res) => {
    console.log('\n🔧 DEBUG ENDPOINT: Manual seed triggered via API');
    console.log('   Request from:', req.ip);
    console.log('   Time:', new Date().toISOString());

    try {
        const forceReseed = req.query.force === 'true';
        const result = await seedExamsFromJSON(forceReseed);

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Database status endpoint
app.get('/api/debug/db-status', async (req, res) => {
    try {
        const examCount = await Exam.countDocuments();
        const exams = await Exam.find({}, 'examId title subject questions createdBy isDefault').limit(10).lean();

        res.json({
            success: true,
            database: {
                totalExams: examCount,
                connectionState: mongoose.connection.readyState,
                connectionName: mongoose.connection.name
            },
            sampleExams: exams,
            files: {
                examsJson: fs.existsSync(path.join(__dirname, 'exams.json')),
                questionsJson: fs.existsSync(path.join(__dirname, 'questions.json'))
            },
            paths: {
                dirname: __dirname,
                examsPath: path.join(__dirname, 'exams.json'),
                questionsPath: path.join(__dirname, 'questions.json')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== EVENT API ENDPOINTS ====================

// GET /api/events - Fetch user's events
app.get('/api/events', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.json({ success: false, message: 'Username is required' });
        }

        const events = await Event.find({ username })
            .select('-__v') // 🛡️ [ENTERPRISE] Data Minimization
            .sort({ date: 1 });
        console.log(`📅 Fetched ${events.length} events for ${username}`);
        res.json({ success: true, events });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// GET /api/deadline-tags - Fetch custom deadline tags by user
app.get('/api/deadline-tags', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.json({ success: false, message: 'Username is required' });
        }

        const tags = await DeadlineTag.find({ username })
            .sort({ createdAt: -1 })
            .select('name -_id');

        return res.json({
            success: true,
            tags: tags.map((tag) => tag.name),
        });
    } catch (err) {
        console.error('Error fetching deadline tags:', err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// POST /api/deadline-tags - Add custom deadline tag for user
app.post('/api/deadline-tags', async (req, res) => {
    try {
        const { username, name } = req.body;
        if (!username || !name) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const cleanedName = String(name).trim().slice(0, 40);
        if (!cleanedName) {
            return res.json({ success: false, message: 'Tag không hợp lệ' });
        }
        const normalizedName = cleanedName.toLowerCase();

        const existed = await DeadlineTag.findOne({ username, normalizedName });
        if (!existed) {
            await DeadlineTag.create({
                username,
                name: cleanedName,
                normalizedName,
            });

            await logUserActivityLog({
                username,
                action: 'deadline_tag_create',
                description: `Tạo nhãn deadline: ${cleanedName}`,
                req,
                metadata: { tag: cleanedName }
            });
        }

        const tags = await DeadlineTag.find({ username })
            .sort({ createdAt: -1 })
            .select('name -_id');

        return res.json({
            success: true,
            tags: tags.map((tag) => tag.name),
        });
    } catch (err) {
        console.error('Error creating deadline tag:', err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/deadline-tags - Delete custom deadline tag for user
app.delete('/api/deadline-tags', async (req, res) => {
    try {
        const { username, name } = req.body;
        if (!username || !name) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const cleanedName = String(name).trim();
        if (!cleanedName) {
            return res.json({ success: false, message: 'Tag không hợp lệ' });
        }

        const deletedTag = await DeadlineTag.deleteOne({
            username,
            normalizedName: cleanedName.toLowerCase(),
        });

        if (deletedTag.deletedCount > 0) {
            await logUserActivityLog({
                username,
                action: 'deadline_tag_delete',
                description: `Xóa nhãn deadline: ${cleanedName}`,
                req,
                metadata: { tag: cleanedName }
            });
        }

        const tags = await DeadlineTag.find({ username })
            .sort({ createdAt: -1 })
            .select('name -_id');

        return res.json({
            success: true,
            tags: tags.map((tag) => tag.name),
        });
    } catch (err) {
        console.error('Error deleting deadline tag:', err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// POST /api/events - Add a new event
app.post('/api/events', async (req, res) => {
    try {
        const { username, title, date, type, description, deadlineTag } = req.body;

        if (!username || !title || !date) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.json({ success: false, message: 'Ngày giờ deadline không hợp lệ' });
        }

        const normalizedType = ['exam', 'deadline', 'other'].includes(type)
            ? type
            : 'exam';

        const normalizedDescription = String(description || '').trim().slice(0, 300);
        const normalizedTag = String(deadlineTag || '').trim().slice(0, 40) || 'Công việc';

        const event = new Event({
            username,
            title: title.trim(),
            date: parsedDate,
            type: normalizedType,
            description: normalizedDescription,
            deadlineTag: normalizedTag,
        });

        await event.save();
        await logUserActivityLog({
            username,
            action: normalizedType === 'deadline' ? 'deadline_create' : 'event_create',
            description: `${normalizedType === 'deadline' ? 'Tạo deadline' : 'Tạo sự kiện'}: ${event.title}`,
            req,
            metadata: {
                eventId: event._id.toString(),
                type: normalizedType,
                deadlineTag: normalizedTag
            }
        });
        console.log(`✅ Event created: ${title} for ${username}`);
        res.json({ success: true, event });
    } catch (err) {
        console.error('Error creating event:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/events/:id - Delete an event
app.delete('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query;

        if (!username) {
            return res.json({ success: false, message: 'Username is required' });
        }

        const event = await Event.findById(id);

        if (!event) {
            return res.json({ success: false, message: 'Event not found' });
        }

        if (event.username !== username) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        const eventType = event.type;
        const eventTitle = event.title;
        await Event.findByIdAndDelete(id);
        await logUserActivityLog({
            username,
            action: eventType === 'deadline' ? 'deadline_delete' : 'event_delete',
            description: `${eventType === 'deadline' ? 'Xóa deadline' : 'Xóa sự kiện'}: ${eventTitle}`,
            req,
            metadata: {
                eventId: id,
                type: eventType
            }
        });
        console.log(`🗑️ Event deleted: ${id} by ${username}`);
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// PUT /api/events/:id - Update an event
app.put('/api/events/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === 'toggle') {
            console.log('[Events/:id] Forwarding to /api/events/toggle');
            return next();
        }
        const { username, title, date, type, description, deadlineTag } = req.body;

        if (!username || !title || !date) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.json({ success: false, message: 'Event not found' });
        }

        if (event.username !== username) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.json({ success: false, message: 'Ngày giờ deadline không hợp lệ' });
        }

        const normalizedType = ['exam', 'deadline', 'other'].includes(type)
            ? type
            : event.type || 'deadline';

        event.title = String(title || '').trim();
        event.date = parsedDate;
        event.type = normalizedType;
        event.description = String(description || '').trim().slice(0, 300);
        event.deadlineTag = String(deadlineTag || '').trim().slice(0, 40) || 'Công việc';

        await event.save();
        await logUserActivityLog({
            username,
            action: normalizedType === 'deadline' ? 'deadline_update' : 'event_update',
            description: `${normalizedType === 'deadline' ? 'Cập nhật deadline' : 'Cập nhật sự kiện'}: ${event.title}`,
            req,
            metadata: {
                eventId: event._id.toString(),
                type: normalizedType,
                deadlineTag: event.deadlineTag
            }
        });
        return res.json({ success: true, event });
    } catch (err) {
        console.error('Error updating event:', err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// PUT /api/events/toggle - Toggle completed status for an event
app.put('/api/events/toggle', async (req, res) => {
    try {
        const { id, username, isDone } = req.body;
        
        console.log('[Toggle] Request received:', { id, username, isDone });

        if (!id || !username) {
            console.log('[Toggle] Missing required fields');
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const event = await Event.findById(id);
        if (!event) {
            console.log('[Toggle] Event not found:', id);
            return res.json({ success: false, message: 'Event not found' });
        }

        if (event.username !== username) {
            console.log('[Toggle] Unauthorized access attempt by:', username);
            return res.json({ success: false, message: 'Unauthorized' });
        }

        const previousIsDone = event.isDone;
        if (typeof isDone === 'boolean') {
            event.isDone = isDone;
        } else {
            event.isDone = !Boolean(event.isDone);
        }
        
        await event.save();
        await logUserActivityLog({
            username,
            action: event.type === 'deadline'
                ? (event.isDone ? 'deadline_complete' : 'deadline_reopen')
                : (event.isDone ? 'event_complete' : 'event_reopen'),
            description: `${event.isDone ? 'Đánh dấu hoàn thành' : 'Bỏ hoàn thành'}: ${event.title}`,
            req,
            metadata: {
                eventId: event._id.toString(),
                type: event.type || 'event',
                isDone: event.isDone
            }
        });
        
        console.log('[Toggle] Success:', { 
            id, 
            previousIsDone, 
            newIsDone: event.isDone 
        });

        return res.json({ success: true, event });
    } catch (err) {
        console.error('[Toggle] Error toggling event:', err);
        return res.json({ success: false, message: 'Server error' });
    }
});

// ==================== WHALIO AI CHAT (GEMINI) ====================
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== EXPONENTIAL BACKOFF UTILITY ====================
// Utility function for exponential backoff retry
// OPTIMIZED: Tăng delay để giảm rate limit errors (2s → 5s → 10s)
async function retryWithExponentialBackoff(fn, maxRetries = 3, baseDelay = 2000) {
    let lastError;

    // Custom delays: 2s, 5s, 10s thay vì 2s, 4s, 8s
    const delays = [2000, 5000, 10000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable (429, quota, rate limit)
            const isRetryableError =
                error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('RATE_LIMIT') ||
                error.message?.includes('Resource has been exhausted');

            if (!isRetryableError || attempt === maxRetries - 1) {
                throw error; // Don't retry non-retryable errors or last attempt
            }

            // Use custom delay with small jitter
            const delay = delays[attempt] + Math.random() * 500;
            console.log(`🔄 Gemini API rate limited, retrying in ${(delay / 1000).toFixed(1)}s... (Attempt ${attempt + 1}/${maxRetries})`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// System instruction for Whalio Bot personality
let WHALIO_SYSTEM_INSTRUCTION;

try {
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, '..', 'whalio_prompt.txt');
    WHALIO_SYSTEM_INSTRUCTION = fs.readFileSync(promptPath, 'utf8');
    console.log('✅ Đã tải thành công Whalio System Prompt từ file');
} catch (error) {
    console.warn('⚠️ Không thể đọc file whalio_prompt.txt, sử dụng prompt mặc định:', error.message);
    // Fallback prompt ngắn gọn
    WHALIO_SYSTEM_INSTRUCTION = `
### DANH TÍNH & VAI TRÒ
Bạn là **Whalio** – Trợ lý AI thân thiện và hài hước của cộng đồng sinh viên Whalio Study.

### NHIỆM VỤ CHÍNH
1. Hướng dẫn sử dụng các tính năng của website Whalio Study
2. Tư vấn học tập và đời sống cho sinh viên

### GIỚI HẠN
- KHÔNG viết code hoặc giải thích kỹ thuật
- Chỉ hỗ trợ về các tính năng có thật của website

### PHONG CÁCH
- Thân thiện, hài hước, thấu cảm
- Sử dụng ngôn ngữ Gen Z phù hợp
- Đưa ra lời khuyên thẳng thắn nhưng xây dựng
`;
}

// ==================== CHAT SESSION APIs ====================

// GET /api/sessions - Lấy danh sách các cuộc trò chuyện (cho Sidebar)
app.get('/api/sessions', async (req, res) => {
    try {
        const { username, limit = 50 } = req.query;

        // SECURITY: Chỉ trả về sessions của user cụ thể
        // Nếu không có username, trả về mảng rỗng (guest không có lịch sử)
        if (!username) {
            return res.json({
                success: true,
                sessions: []
            });
        }

        const sessions = await ChatSession.find({ username })
            .select('sessionId title createdAt updatedAt')
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            sessions: sessions.map(s => ({
                sessionId: s.sessionId,
                title: s.title,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching sessions:', err);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách cuộc trò chuyện' });
    }
});

// GET /api/session/:id - Lấy chi tiết nội dung tin nhắn của một session
// GET /api/session/:id - Lấy chi tiết (ĐÃ BẢO MẬT)
app.get('/api/session/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query; // Lấy username người đang xem

        // 1. Tìm session theo ID trước
        const session = await ChatSession.findOne({ sessionId: id }).lean();

        if (!session) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện' });
        }

        // 2. 🔥 KIỂM TRA BẢO MẬT (QUAN TRỌNG) 🔥
        // Nếu session này có chủ sở hữu (không phải guest/ẩn danh)
        if (session.username && session.username !== 'guest') {
            // Nếu người xem không cung cấp username HOẶC username không khớp
            if (!username || session.username !== username) {
                console.warn(`⛔ Cảnh báo bảo mật: ${username || 'Ẩn danh'} cố xem chat của ${session.username}`);
                return res.status(403).json({
                    success: false,
                    message: '⛔ Bạn không có quyền xem cuộc trò chuyện này!'
                });
            }
        }

        res.json({
            success: true,
            session: {
                sessionId: session.sessionId,
                title: session.title,
                messages: session.messages,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }
        });
    } catch (err) {
        console.error('❌ Error fetching session:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// DELETE /api/session/:id - Xóa một cuộc trò chuyện
app.delete('/api/session/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query;

        // Build query - kiểm tra cả sessionId và username nếu có
        const query = { sessionId: id };
        if (username) {
            query.username = username;
        }

        const result = await ChatSession.findOneAndDelete(query);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cuộc trò chuyện'
            });
        }

        console.log(`🗑️ Chat session deleted: ${id}`);
        res.json({ success: true, message: 'Đã xóa cuộc trò chuyện' });
    } catch (err) {
        console.error('❌ Error deleting session:', err);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa cuộc trò chuyện' });
    }
});

// PUT /api/session/:id/title - Đổi tên cuộc trò chuyện
app.put('/api/session/:id/title', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });
        }

        const session = await ChatSession.findOneAndUpdate(
            { sessionId: id },
            { title: title.trim().substring(0, 100), updatedAt: new Date() },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện' });
        }

        res.json({ success: true, session: { sessionId: session.sessionId, title: session.title } });
    } catch (err) {
        console.error('❌ Error updating session title:', err);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tiêu đề' });
    }
});

// ==================== GPA APIs ====================

// 1. Lấy dữ liệu GPA của user
app.get('/api/gpa', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ success: false });

        let gpaData = await GpaModel.findOne({ username });

        // Nếu chưa có dữ liệu, trả về mảng rỗng để frontend tự tạo
        if (!gpaData) {
            return res.json({ success: true, semesters: [] });
        }

        res.json({ success: true, semesters: gpaData.semesters, targetGpa: gpaData.targetGpa || "" });
    } catch (err) {
        console.error('Get GPA error:', err);
        res.status(500).json({ success: false });
    }
});

// 2. Lưu dữ liệu GPA
app.post('/api/gpa', async (req, res) => {
    try {
        const { username, semesters, targetGpa } = req.body;

        // Dùng findOneAndUpdate với option upsert: true (Nếu chưa có thì tạo mới, có rồi thì update)
        await GpaModel.findOneAndUpdate(
            { username },
            {
                username,
                semesters,
                targetGpa: targetGpa || "", // Lưu targetGpa
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Đã lưu bảng điểm!' });
    } catch (err) {
        console.error('Save GPA error:', err);
        res.status(500).json({ success: false, message: 'Lỗi lưu dữ liệu' });
    }
});

// POST /api/chat - Chat with Whalio AI (Hỗ trợ Multimodal: Text + Image + Files + Session History)
// Sử dụng multipart/form-data thay vì JSON để hỗ trợ upload ảnh/file
// Field name phải là 'image' để khớp với frontend FormData
app.post('/api/chat', chatFileUpload.single('image'), async (req, res) => {
    try {
        if (!req.file && req.body.image && req.body.image.startsWith('data:')) {
            const matches = req.body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
                req.file = {
                    mimetype: matches[1],
                    buffer: Buffer.from(matches[2], 'base64'),
                    originalname: 'upload_image.png',
                    size: Buffer.from(matches[2], 'base64').length
                };
            }
        }
        const message = req.body.message;
        const sessionId = req.body.sessionId; // Optional: ID của session hiện tại
        const username = req.body.username; // Optional: username của user

        // Kiểm tra message (có thể rỗng nếu chỉ gửi file)
        if ((!message || typeof message !== 'string' || message.trim() === '') && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tin nhắn hoặc gửi file'
            });
        }

        // Check if API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not configured');
            return res.status(500).json({
                success: false,
                message: 'AI service is not configured'
            });
        }

        // ==================== SESSION MANAGEMENT ====================
        let session;
        let isNewSession = false;

        if (sessionId) {
            // Tìm session hiện có
            session = await ChatSession.findOne({ sessionId });
            if (!session) {
                console.log(`⚠️ Session ${sessionId} not found, creating new session`);
            }
        }

        if (!session) {
            // Tạo session mới
            isNewSession = true;
            const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // OPTIMIZED: Lấy 30 ký tự đầu của tin nhắn làm tiêu đề (KHÔNG dùng AI)
            // Tiết kiệm 50% request API so với việc gọi AI tạo title
            const messageText = message ? message.trim() : (req.file ? `Phân tích ${req.file.originalname}` : 'Cuộc trò chuyện mới');
            const autoTitle = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');

            session = new ChatSession({
                sessionId: newSessionId,
                username: username || null,
                title: autoTitle,
                messages: []
            });

            console.log(`🆕 Created new chat session: ${newSessionId} (Title: "${autoTitle}")`);
        }

        // ==================== BUILD GEMINI HISTORY ====================
        // OPTIMIZED: Chỉ gửi 20 tin nhắn gần nhất để tránh payload quá nặng và token limit
        // Convert stored messages to Gemini format for context
        const recentMessages = session.messages.slice(-20); // Lấy 20 tin nhắn cuối
        const geminiHistory = recentMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        if (session.messages.length > 20) {
            console.log(`📊 Session has ${session.messages.length} messages, sending last 20 to Gemini`);
        }

        // ==================== XÂY DỰNG MESSAGE CUỐI CÙNG ====================
        // Kết hợp history + message hiện tại để gửi cho AI Service
        let contentParts = [];
        let hasAttachment = false;
        let attachmentType = null;

        // Thêm text message (nếu có)
        const textMessage = message ? message.trim() : 'Hãy phân tích file này.';
        contentParts.push(textMessage);

        // Kiểm tra và xử lý file (nếu có)
        if (req.file) {
            hasAttachment = true;
            const mimetype = req.file.mimetype;
            const filename = req.file.originalname;
            const fileExt = path.extname(filename).toLowerCase();
            const fileSizeKB = (req.file.size / 1024).toFixed(2);
            const buffer = req.file.buffer;

            // Xác định loại attachment
            if (mimetype.startsWith('image/')) attachmentType = 'image';
            else if (mimetype.includes('pdf')) attachmentType = 'pdf';
            else if (mimetype.includes('word') || fileExt === '.doc' || fileExt === '.docx') attachmentType = 'word';
            else if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) attachmentType = 'excel';
            else if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) attachmentType = 'powerpoint';
            else attachmentType = 'other';

            console.log(`📎 Nhận được file: ${filename} (${mimetype}, ${fileSizeKB} KB)`);

            let extractedContent = null;
            let fileTypeIcon = '📁';

            try {
                // ==================== XỬ LÝ ẢNH ====================
                if (mimetype.startsWith('image/')) {
                    fileTypeIcon = '🖼️';
                    console.log(`   🖼️ Xử lý ảnh với Gemini Multimodal...`);
                    const base64Data = buffer.toString('base64');
                    contentParts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimetype
                        }
                    });
                }
                // ==================== XỬ LÝ PDF ====================
                else if (mimetype === 'application/pdf' || fileExt === '.pdf') {
                    fileTypeIcon = '📄';
                    console.log(`   📄 Đang đọc nội dung PDF...`);
                    const pdfData = await pdfParse(buffer);
                    extractedContent = pdfData.text;
                    console.log(`   ✅ Đã trích xuất ${extractedContent.length} ký tự từ PDF`);
                }
                // ==================== XỬ LÝ WORD (.docx) ====================
                else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExt === '.docx') {
                    fileTypeIcon = '📝';
                    console.log(`   📝 Đang đọc nội dung Word (.docx)...`);
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    extractedContent = result.value;
                    console.log(`   ✅ Đã trích xuất ${extractedContent.length} ký tự từ Word`);
                }
                // ==================== XỬ LÝ WORD CŨ (.doc) ====================
                else if (mimetype === 'application/msword' || fileExt === '.doc') {
                    fileTypeIcon = '📝';
                    console.log(`   📝 File Word cũ (.doc) - thử đọc như text...`);
                    // .doc cũ khó đọc hơn, thử extract text cơ bản
                    try {
                        const result = await mammoth.extractRawText({ buffer: buffer });
                        extractedContent = result.value;
                    } catch {
                        extractedContent = `[File .doc cũ - không thể đọc trực tiếp. Vui lòng chuyển sang .docx hoặc PDF]`;
                    }
                }
                // ==================== XỬ LÝ EXCEL (.xlsx, .xls) ====================
                else if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || fileExt === '.xlsx' || fileExt === '.xls') {
                    fileTypeIcon = '📊';
                    console.log(`   📊 Đang đọc nội dung Excel...`);
                    const workbook = XLSX.read(buffer, { type: 'buffer' });
                    let excelContent = '';

                    workbook.SheetNames.forEach((sheetName, index) => {
                        const sheet = workbook.Sheets[sheetName];
                        const csvData = XLSX.utils.sheet_to_csv(sheet);
                        excelContent += `\n--- Sheet ${index + 1}: ${sheetName} ---\n${csvData}\n`;
                    });

                    extractedContent = excelContent;
                    console.log(`   ✅ Đã trích xuất ${extractedContent.length} ký tự từ ${workbook.SheetNames.length} sheet Excel`);
                }
                // ==================== XỬ LÝ POWERPOINT ====================
                else if (mimetype.includes('presentation') || mimetype.includes('powerpoint') || fileExt === '.pptx' || fileExt === '.ppt') {
                    fileTypeIcon = '📽️';
                    console.log(`   📽️ File PowerPoint - không hỗ trợ đọc trực tiếp...`);
                    extractedContent = `[File PowerPoint: ${filename}]\nKích thước: ${fileSizeKB} KB\n\n⚠️ Hiện tại mình chưa hỗ trợ đọc nội dung PowerPoint trực tiếp. Bạn có thể:\n1. Chuyển sang PDF\n2. Copy nội dung text vào tin nhắn\n3. Chụp ảnh các slide quan trọng`;
                }
                // ==================== XỬ LÝ FILE TEXT ====================
                else if (mimetype.startsWith('text/') ||
                    mimetype === 'application/javascript' ||
                    mimetype === 'application/json' ||
                    mimetype === 'application/xml' ||
                    ['.txt', '.html', '.css', '.js', '.json', '.xml', '.csv', '.md', '.py', '.java', '.c', '.cpp', '.h', '.php', '.sql', '.sh', '.bat', '.yaml', '.yml', '.ini', '.cfg', '.log'].includes(fileExt)) {
                    fileTypeIcon = '📝';
                    console.log(`   📝 Đang đọc file text/code...`);
                    extractedContent = buffer.toString('utf-8');
                    console.log(`   ✅ Đã đọc ${extractedContent.length} ký tự`);
                }
                // ==================== XỬ LÝ ZIP/RAR ====================
                else if (mimetype.includes('zip') || mimetype.includes('rar') || fileExt === '.zip' || fileExt === '.rar') {
                    fileTypeIcon = '🗜️';
                    console.log(`   🗜️ File nén - không thể đọc nội dung...`);
                    extractedContent = `[File nén: ${filename}]\nKích thước: ${fileSizeKB} KB\n\n⚠️ Mình không thể đọc nội dung file nén. Vui lòng giải nén và gửi từng file riêng.`;
                }
                // ==================== FILE KHÁC ====================
                else {
                    console.log(`   ⚠️ Loại file không xác định: ${mimetype}`);
                    extractedContent = `[File: ${filename}]\nLoại: ${mimetype}\nKích thước: ${fileSizeKB} KB\n\n⚠️ Mình không thể đọc trực tiếp loại file này.`;
                }

                // Nếu có nội dung được trích xuất (không phải ảnh), thêm vào message
                if (extractedContent && !mimetype.startsWith('image/')) {
                    // Giới hạn độ dài để tránh quá tải
                    const maxLength = 100000; // 100K ký tự
                    const truncatedContent = extractedContent.length > maxLength
                        ? extractedContent.substring(0, maxLength) + '\n\n... [Nội dung đã được cắt bớt do quá dài]'
                        : extractedContent;

                    contentParts[0] = `${textMessage}\n\n${fileTypeIcon} Nội dung file "${filename}":\n\`\`\`\n${truncatedContent}\n\`\`\``;
                }

            } catch (parseError) {
                console.error(`   ❌ Lỗi khi đọc file:`, parseError.message);
                contentParts[0] = `${textMessage}\n\n📎 File đính kèm: ${filename}\n📊 Loại: ${mimetype}\n📏 Kích thước: ${fileSizeKB} KB\n\n⚠️ Đã xảy ra lỗi khi đọc file: ${parseError.message}`;
            }
        }

        // ==================== GỌI AI SERVICE (Gemini → DeepSeek Fallback) ====================
        // Kết hợp history context với message hiện tại
        let finalMessage = '';

        // Nếu có lịch sử chat, thêm context
        if (geminiHistory.length > 0) {
            finalMessage = '--- Lịch sử cuộc trò chuyện (để tham khảo context) ---\n';
            geminiHistory.forEach(msg => {
                const role = msg.role === 'user' ? '👤 User' : '🤖 Whalio';
                const content = msg.parts[0].text;
                finalMessage += `${role}: ${content}\n\n`;
            });
            finalMessage += '--- Tin nhắn hiện tại ---\n';
        }

        // Thêm tin nhắn hiện tại (có thể là text + nội dung file đã extract)
        if (typeof contentParts[0] === 'string') {
            finalMessage += contentParts[0];
        } else if (contentParts[0]?.text) {
            finalMessage += contentParts[0].text;
        }

        // Nếu có ảnh trong contentParts, xử lý riêng
        let hasImageData = false;
        if (contentParts.length > 1 && contentParts[1]?.inlineData) {
            // Với ảnh, ta cần fallback về Gemini trực tiếp (vì DeepSeek chưa hỗ trợ multimodal tốt)
            hasImageData = true;
            console.log('🖼️ Phát hiện ảnh - sẽ sử dụng Gemini trực tiếp (multimodal)');
        }

        let aiResponseText;
        let modelUsed = 'Unknown';

        // Nếu có ảnh, dùng Gemini trực tiếp (vì DeepSeek không tốt với vision)
        // Nếu có ảnh, dùng Gemini trước -> Nếu lỗi thì Fallback sang Groq Vision
        if (hasImageData) {
            console.log('📸 Xử lý ảnh: Thử Gemini Multimodal trước...');

            try {
                // --- LỚP 1: GEMINI VISION ---
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: WHALIO_SYSTEM_INSTRUCTION
                });

                const chat = model.startChat({
                    history: geminiHistory,
                });

                // Thử gọi Gemini
                const result = await chat.sendMessage(contentParts);
                const response = await result.response;
                aiResponseText = response.text();
                modelUsed = 'Gemini 2.5 Flash (Vision)';

            } catch (geminiErr) {
                console.warn(`⚠️ Gemini Vision lỗi: ${geminiErr.message}`);

                // Chỉ fallback nếu lỗi là quá tải (429) hoặc lỗi mạng
                if (geminiErr.message.includes('429') || geminiErr.message.includes('Rate Limit') || geminiErr.message.includes('fetch failed')) {
                    console.log('🔄 Đang chuyển sang Groq Vision (Llama 3.2)...');

                    try {
                        // --- LỚP 2: GROQ VISION (LLAMA 3.2) ---
                        // Cần chuẩn bị dữ liệu ảnh đúng chuẩn OpenAI/Groq
                        const base64Image = contentParts[1].inlineData.data; // Lấy lại base64 từ contentParts đã tạo ở trên
                        const mimeType = contentParts[1].inlineData.mimeType;

                        // Gọi Groq Vision
                        const OpenAI = require('openai');
                        const groq = new OpenAI({
                            apiKey: process.env.GROQ_API_KEY,
                            baseURL: 'https://api.groq.com/openai/v1'
                        });

                        const completion = await groq.chat.completions.create({
                            model: "meta-llama/llama-4-scout-17b-16e-instruct", // Model Vision Free của Groq
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: finalMessage || "Hãy phân tích hình ảnh này" },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: `data:${mimeType};base64,${base64Image}`
                                            }
                                        }
                                    ]
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 1024
                        });

                        aiResponseText = completion.choices[0].message.content;
                        modelUsed = 'Groq Llama 3.2 (Vision Fallback)';
                        console.log('✅ Groq Vision đã cứu bàn thua trông thấy!');

                    } catch (groqErr) {
                        console.error('❌ Groq Vision cũng thất bại:', groqErr.message);
                        throw geminiErr; // Ném lại lỗi cũ để báo User
                    }
                } else {
                    throw geminiErr; // Nếu lỗi khác (VD: ảnh sex, ảnh lỗi) thì không fallback
                }
            }
        } else {
            // Không có ảnh -> Dùng aiService với fallback thông minh
            console.log('💬 Gọi AI Service với Fallback (Gemini → DeepSeek)...');
            const aiResult = await generateAIResponse(finalMessage);

            if (!aiResult.success) {
                // Cả hai models đều thất bại
                console.error('❌ AI Service thất bại:', aiResult.error);
                return res.status(500).json({
                    success: false,
                    text: 'Đã xảy ra lỗi khi xử lý yêu cầu',
                    message: aiResult.message,
                    error: aiResult.error
                });
            }

            aiResponseText = aiResult.message;
            modelUsed = aiResult.model;

            // Log nếu đã fallback
            if (aiResult.fallback) {
                console.log(`🔄 Đã fallback sang ${modelUsed}`);
            }
        }

        // ==================== SAVE TO DATABASE ====================
        const userMessageContent = message ? message.trim() : '[Gửi file đính kèm]';

        // Thêm tin nhắn user vào session
        session.messages.push({
            role: 'user',
            content: userMessageContent,
            timestamp: new Date(),
            hasAttachment: hasAttachment,
            attachmentType: attachmentType
        });

        // Thêm phản hồi AI vào session
        session.messages.push({
            role: 'model',
            content: aiResponseText,
            timestamp: new Date()
        });

        // Cập nhật thời gian và lưu
        session.updatedAt = new Date();
        await session.save();

        const logMessage = message ? message.substring(0, 50) : '[Chỉ gửi file]';
        const hasFile = req.file ? ` + ${req.file.mimetype.startsWith('image/') ? '🖼️' : '📁'}` : '';
        console.log(`🤖 Whalio AI responded to: "${logMessage}..."${hasFile} [Session: ${session.sessionId}]`);

        res.json({
            success: true,
            text: aiResponseText,
            response: aiResponseText,
            sessionId: session.sessionId,
            isNewSession: isNewSession,
            modelUsed: modelUsed // Thông tin model đã sử dụng (Gemini hoặc DeepSeek)
        });

    } catch (err) {
        console.error('❌ Gemini AI Error:', err.message);

        // Handle specific error types
        if (err.message?.includes('API_KEY_INVALID')) {
            return res.status(500).json({
                success: false,
                message: 'Invalid API key configuration'
            });
        }

        if (err.message?.includes('SAFETY')) {
            return res.status(400).json({
                success: false,
                message: 'Xin lỗi, mình không thể trả lời câu hỏi này.',
                response: 'Xin lỗi, mình không thể trả lời câu hỏi này. Hãy thử hỏi điều khác nhé! 😊'
            });
        }

        if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests') || err.message?.includes('RATE_LIMIT') || err.message?.includes('Resource has been exhausted')) {
            return res.status(429).json({
                success: false,
                message: 'Hệ thống đang quá tải, bạn vui lòng đợi vài giây rồi thử lại nhé! 🐳',
                response: 'Hệ thống đang quá tải, bạn vui lòng đợi vài giây rồi thử lại nhé! 🐳'
            });
        }

        // Handle image-related errors
        if (err.message?.includes('image') || err.message?.includes('media')) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xử lý file này',
                response: 'Xin lỗi, mình không thể xử lý file này. Hãy thử với file khác nhé! 📁'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xử lý yêu cầu'
        });
    }
});

// ==================== 🛡️ ENTERPRISE ERROR CLOAKING ====================
// TUYỆT ĐỐI KHÔNG trả về err.message hoặc err.stack cho client
// Chỉ log chi tiết lỗi vào server console để debug
app.use((err, req, res, next) => {
    // 🚨 Log chi tiết lỗi vào server (KHÔNG gử́i cho client)
    console.error('='.repeat(60));
    console.error('🚨 [ENTERPRISE ERROR LOG]');
    console.error(`Path: ${req.method} ${req.path}`);
    console.error(`IP: ${req.ip}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Error Name: ${err.name}`);
    console.error(`Error Message: ${err.message}`);
    console.error(`Stack Trace: ${err.stack}`);
    console.error('='.repeat(60));

    // 🛡️ Trả về thông báo chung chung cho client
    if (req.path.startsWith('/api/')) {
        return res.status(err.status || 500).json({
            success: false,
            message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau'
            // 🛡️ KHÔNG BAO GIờ trả về: error: err.message, stack: err.stack
        });
    }

    // For non-API routes
    res.status(err.status || 500).send('Đã xảy ra lỗi hệ thống');
});
console.log('🛡️  Enterprise Error Cloaking enabled (sensitive info hidden)');

// ==================== DEBUG: CHECK AVAILABLE MODELS ====================
async function checkAvailableModels() {
    try {
        console.log("🔍 Đang kiểm tra danh sách Model từ Google...");
        const key = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ DANH SÁCH MODEL KHẢ DỤNG:");
            data.models.forEach(m => {
                // Chỉ hiện các model hỗ trợ generateContent
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`   - ${m.name.replace('models/', '')} (${m.displayName})`);
                }
            });
        } else {
            console.log("⚠️ Không lấy được danh sách model:", data);
        }
    } catch (error) {
        console.error("❌ Lỗi khi kiểm tra model:", error.message);
    }
}

// Gọi hàm này khi server chạy
checkAvailableModels();

// ==================== ADMIN API ROUTES ====================
app.use('/api/admin', verifyToken, verifyAdmin, adminRouter);
console.log('👑 Admin API routes mounted at /api/admin');

// ==================== SERVER START ====================
// Thêm cái '0.0.0.0' vào vị trí thứ 2
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 API ready at http://localhost:${PORT}`);
});

// Update Gemini version fix
