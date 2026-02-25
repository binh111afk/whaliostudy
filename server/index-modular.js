/**
 * Whalio Study Server - Modular Entry Point
 * 
 * File này là phiên bản modular của server đã được tách thành nhiều file nhỏ:
 * - config/index.js: Cấu hình và biến môi trường
 * - models/index.js: Các Mongoose schemas và models
 * - utils/index.js: Các hàm tiện ích và cache
 * - middleware/index.js: Middleware xác thực và bảo mật
 * - services/index.js: Services xử lý nghiệp vụ
 * 
 * Để chạy server này thay cho index.js cũ:
 * node index-modular.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

// ==================== CORE IMPORTS ====================
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = fs.promises;
const multer = require('multer');
const os = require('os');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PQueue = require('p-queue').default;
const { Worker } = require('worker_threads');

// ==================== SECURITY LIBRARIES ====================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const crypto = require('crypto');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { body, param, query, validationResult } = require('express-validator');

// ==================== OPTIONAL DEPENDENCIES ====================
let cookieParser = null;
try {
    cookieParser = require('cookie-parser');
} catch (error) {
    console.warn('⚠️ cookie-parser is not installed.');
}

let UpstashRedis = null;
try {
    ({ Redis: UpstashRedis } = require('@upstash/redis'));
} catch (error) {
    console.warn('⚠️ @upstash/redis is not installed.');
}

let compression = null;
try {
    compression = require('compression');
} catch (error) {
    console.warn('⚠️ compression is not installed.');
}

// ==================== MODULAR IMPORTS ====================
const config = require('./config');
const models = require('./models');
const utils = require('./utils');
const middleware = require('./middleware');
const services = require('./services');

// ==================== AI SERVICE ====================
const { generateAIResponse } = require('./aiService');

// ==================== ADMIN ROUTER ====================
const adminRouter = require('./routes/admin-refactored');

// ==================== EXTRACT FROM MODULES ====================
const {
    User, Document, Exam, Post, Activity, Timetable, QuickNote,
    Announcement, PortalConfig, Event, DeadlineTag, ChatSession,
    GpaModel, StudySession, StudyTask, BlacklistIP, SystemSettings,
    SystemEvent, UserActivityLog, BackupRecord
} = models;

const {
    deepCloneSafe, extractClientIP, getGeoLocationFromIP, parseDeviceFromUA,
    getWeekNumber, getWeeksBetween, decodeFileName, normalizeFileName,
    getCloudinaryResourceType, toMB, isExposeGcEnabled, buildStudyStatsForLastSevenDays,
    invalidateUserDashboardBatchCache, invalidateStudyStatsCache,
    getUserDashboardBatchFromCache, setUserDashboardBatchCache,
    getStudyStatsFromCache, setStudyStatsCache, chatResponseCache,
    getPortalFromCache, setPortalCache, normalizePortalCategories, buildChatResponseCacheKey
} = utils;

const { logActivity, logUserActivityLog, seedInitialData, getStudyStatsPayload, activityLogQueue } = services;

// ==================== EXPRESS APP SETUP ====================
const app = express();
app.set('trust proxy', true);

// ==================== MIDDLEWARE CHAIN ====================
// 1. Body parsing
app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: config.REQUEST_BODY_LIMIT }));

// 2. Compression (if available)
if (compression) {
    app.use(compression({
        threshold: config.API_COMPRESSION_THRESHOLD_BYTES,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        }
    }));
    console.log('📦 API Response Compression enabled');
}

// 3. Security middleware
app.use(middleware.helmetMiddleware);
app.use(mongoSanitize());
app.use(hpp());
console.log('🛡️  Security middleware (Helmet, MongoSanitize, HPP) enabled');

// 4. CORS
const corsOptions = {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 5. Cookie parser (if available)
if (cookieParser) {
    app.use(cookieParser());
}

// 6. Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// ==================== INITIALIZE SERVICES ====================
// Initialize Redis clients for session and rate limiting
middleware.initializeRedisClients(UpstashRedis);

// ==================== SESSION SETUP ====================
const sessionStore = middleware.initializeSessionStore(session, UpstashRedis);
app.use(session({
    store: sessionStore,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.SESSION_DEFAULT_TTL_SECONDS * 1000,
        sameSite: 'lax'
    }
}));

// ==================== PASSPORT SETUP ====================
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password').lean();
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy (if configured)
const isGoogleOAuthEnabled = !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_CALLBACK_URL);
if (isGoogleOAuthEnabled) {
    passport.use(new GoogleStrategy({
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                user = await User.findOne({ email: profile.emails?.[0]?.value });
                if (user) {
                    user.googleId = profile.id;
                    await user.save();
                } else {
                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        fullName: profile.displayName || 'Google User',
                        username: `google_${profile.id}`,
                        avatar: profile.photos?.[0]?.value || '/img/avt.png',
                        role: 'member'
                    });
                }
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
    console.log('🔐 Google OAuth strategy configured');
}

// ==================== RATE LIMITERS ====================
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, message },
        standardHeaders: true,
        legacyHeaders: false
    });
};

const globalLimiter = createRateLimiter(config.RATE_LIMIT_GLOBAL_WINDOW_MS, config.RATE_LIMIT_GLOBAL_MAX, 'Quá nhiều request, vui lòng thử lại sau');
const loginLimiter = createRateLimiter(config.RATE_LIMIT_LOGIN_WINDOW_MS, config.RATE_LIMIT_LOGIN_MAX, 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.');
const chatLimiter = createRateLimiter(config.RATE_LIMIT_CHAT_WINDOW_MS, config.RATE_LIMIT_CHAT_MAX, 'Bạn đang gửi tin nhắn quá nhanh');

app.use(globalLimiter);

// ==================== XSS SANITIZATION ====================
app.use(middleware.xssSanitizeMiddleware);
console.log('🛡️  XSS Sanitization middleware enabled');

// ==================== PERFORMANCE LOGGING ====================
app.use(middleware.performanceLoggingMiddleware);

// ==================== CLOUDINARY CONFIG ====================
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'whalio-uploads',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'mp3', 'zip', 'rar'],
        resource_type: 'auto'
    }
});

const upload = multer({ storage });

// ==================== DATABASE CONNECTION ====================
mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2
})
.then(() => {
    console.log('✅ MongoDB connected');
    // Seed initial data after connection
    seedInitialData();
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

// ==================== HELPER FUNCTIONS ====================
const { verifyToken, verifyAdmin, optionalAuth, ensureAuthenticated } = middleware;

function resolveUsernameFromRequest(req) {
    return req.user?.username || req.query?.username || req.body?.username || '';
}

async function generateUniqueWhaleID() {
    const prefix = 'WHL';
    let whaleID;
    let isUnique = false;
    
    while (!isUnique) {
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        whaleID = `${prefix}${randomPart}`;
        const existing = await User.findOne({ whaleID });
        if (!existing) isUnique = true;
    }
    
    return whaleID;
}

// ==================== ROUTES ====================
// Note: Routes should be imported from separate route files
// For now, keeping routes in this file for backward compatibility

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==================== AUTH ROUTES ====================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullName, email } = req.body;
        const normalizedUsername = String(username || '').trim();
        const normalizedPassword = String(password || '');
        const normalizedFullName = String(fullName || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        
        if (!normalizedUsername || !normalizedPassword || !normalizedFullName || !normalizedEmail) {
            return res.status(400).json({ 
                success: false, 
                message: "Vui lòng điền đầy đủ thông tin!" 
            });
        }

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

        const hashedPassword = await bcrypt.hash(normalizedPassword, config.BCRYPT_SALT_ROUNDS);
        const whaleID = await generateUniqueWhaleID();

        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword,
            fullName: normalizedFullName,
            email: normalizedEmail,
            whaleID,
            avatar: '/img/avt.png',
            role: "member",
            savedDocs: []
        });
        await newUser.save();

        const safeUser = newUser.toObject();
        delete safeUser.password;
        
        console.log(`✅ New user registered: ${normalizedUsername}`);
        res.json({ success: true, message: "Đăng ký thành công!", user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password, clientContext = {} } = req.body;
        const normalizedUsername = String(username || '').trim();
        const inputPassword = String(password || '');

        if (!normalizedUsername || !inputPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên đăng nhập và mật khẩu!'
            });
        }
        
        const user = await User.findOne({ username: normalizedUsername });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Tên đăng nhập hoặc mật khẩu không đúng!" 
            });
        }

        const storedPassword = String(user.password || '');
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
        let isPasswordValid = false;

        if (isBcryptHash) {
            isPasswordValid = await bcrypt.compare(inputPassword, storedPassword);
        } else {
            isPasswordValid = inputPassword === storedPassword;
            if (isPasswordValid) {
                user.password = await bcrypt.hash(inputPassword, config.BCRYPT_SALT_ROUNDS);
            }
        }

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: "Tên đăng nhập hoặc mật khẩu không đúng!" 
            });
        }
        
        if (user.isLocked) {
            return res.status(403).json({ 
                success: false, 
                message: "Tài khoản đã bị khóa. Vui lòng liên hệ Admin." 
            });
        }

        const clientIP = extractClientIP(req);
        const { country, city } = getGeoLocationFromIP(clientIP);
        const userAgent = req.headers['user-agent'] || '';
        const device = String(clientContext.device || '').trim() || parseDeviceFromUA(userAgent);
        
        user.lastIP = clientIP;
        user.lastCountry = country;
        user.lastCity = city;
        user.lastDevice = device;
        user.lastLogin = new Date();
        await user.save();

        logUserActivityLog({
            username: user.username,
            action: 'login',
            description: 'Đăng nhập thành công',
            req,
            metadata: { lastCountry: country, lastCity: city }
        });

        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        const safeUser = user.toObject();
        delete safeUser.password;
        
        console.log(`✅ Login successful: ${normalizedUsername}`);
        res.json({ success: true, user: safeUser, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Google OAuth routes
if (isGoogleOAuthEnabled) {
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    
    app.get('/auth/google/callback', 
        passport.authenticate('google', { failureRedirect: config.GOOGLE_FAILURE_REDIRECT }),
        (req, res) => {
            const token = jwt.sign(
                { userId: req.user._id.toString(), username: req.user.username, role: req.user.role },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES_IN }
            );
            res.redirect(`${config.GOOGLE_SUCCESS_REDIRECT}?token=${token}`);
        }
    );
}

// ==================== ADMIN ROUTES ====================
app.use('/api/admin', verifyToken, verifyAdmin, adminRouter);
console.log('👑 Admin API routes mounted at /api/admin');

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err.message);
    
    if (req.path.startsWith('/api/')) {
        return res.status(err.status || 500).json({
            success: false,
            message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau'
        });
    }
    
    res.status(err.status || 500).send('Đã xảy ra lỗi hệ thống');
});

// ==================== 404 HANDLER ====================
app.use('/api', (req, res) => {
    return res.status(404).json({ error: 'Not Found' });
});

// ==================== SERVER START ====================
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 API ready at http://localhost:${PORT}`);
    console.log('📦 Modular structure loaded:');
    console.log('   - config/index.js');
    console.log('   - models/index.js');
    console.log('   - utils/index.js');
    console.log('   - middleware/index.js');
    console.log('   - services/index.js');
});

module.exports = app;
