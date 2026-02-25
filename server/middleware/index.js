const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { body, param, query, validationResult } = require('express-validator');

const config = require('../config');
const { User, BlacklistIP, SystemEvent, UserActivityLog } = require('../models');
const utils = require('../utils');

// ==================== UPSTASH REDIS SETUP ====================
let UpstashRedis = null;
try {
    ({ Redis: UpstashRedis } = require('@upstash/redis'));
} catch (error) {
    console.warn('⚠️ @upstash/redis is not installed.');
}

let upstashRateLimitRedisClient = null;
let upstashSessionRedisClient = null;
let sessionStoreInstance = null;
let isUsingRedisSessionStore = false;

// Initialize Upstash Redis clients
function initializeRedisClients() {
    if (UpstashRedis && config.RATE_LIMIT_REDIS_URL && config.RATE_LIMIT_REDIS_TOKEN) {
        try {
            upstashRateLimitRedisClient = new UpstashRedis({
                url: config.RATE_LIMIT_REDIS_URL,
                token: config.RATE_LIMIT_REDIS_TOKEN
            });
            console.log('🧠 Upstash Redis client initialized for rate limiting.');
        } catch (error) {
            console.error(`❌ Failed to initialize Upstash Redis client: ${error.message}`);
        }
    }
    
    return { upstashRateLimitRedisClient };
}

// ==================== SESSION STORE ====================
class UpstashSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        this.client = options.client;
        this.prefix = options.prefix || config.SESSION_STORE_PREFIX;
        this.ttl = options.ttl || config.SESSION_DEFAULT_TTL_SECONDS;
        this.disableTouch = options.disableTouch || config.SESSION_DISABLE_TOUCH;
        this._localFallback = new Map();
        this._redisAvailable = true;
        this._lastErrorLogAt = 0;
    }

    _buildKey(sid) {
        return `${this.prefix}${sid}`;
    }

    _getTtlFromSession(sess) {
        if (sess && sess.cookie && typeof sess.cookie.maxAge === 'number' && sess.cookie.maxAge > 0) {
            return Math.ceil(sess.cookie.maxAge / 1000);
        }
        return this.ttl;
    }

    _logRedisError(action, error) {
        const now = Date.now();
        if (now - this._lastErrorLogAt >= config.RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS) {
            console.warn(`⚠️ [SessionStore] Redis ${action} failed: ${error.message}`);
            this._lastErrorLogAt = now;
        }
        this._redisAvailable = false;
    }

    _markRedisRecovery() {
        if (!this._redisAvailable) {
            console.log('✅ [SessionStore] Redis recovered.');
            this._redisAvailable = true;
        }
    }

    async get(sid, callback) {
        const key = this._buildKey(sid);
        try {
            if (this.client && this._redisAvailable) {
                const data = await this.client.get(key);
                if (data) {
                    this._markRedisRecovery();
                    const sess = typeof data === 'string' ? JSON.parse(data) : data;
                    return callback(null, sess);
                }
                this._markRedisRecovery();
                return callback(null, null);
            }
        } catch (error) {
            this._logRedisError('GET', error);
        }
        const localSess = this._localFallback.get(key);
        if (localSess && localSess.expiresAt > Date.now()) {
            return callback(null, localSess.data);
        }
        this._localFallback.delete(key);
        return callback(null, null);
    }

    async set(sid, sess, callback) {
        const key = this._buildKey(sid);
        const ttlSeconds = this._getTtlFromSession(sess);
        try {
            if (this.client && this._redisAvailable) {
                await this.client.set(key, JSON.stringify(sess), { ex: ttlSeconds });
                this._markRedisRecovery();
                this._localFallback.delete(key);
                return callback && callback(null);
            }
        } catch (error) {
            this._logRedisError('SET', error);
        }
        this._localFallback.set(key, {
            data: sess,
            expiresAt: Date.now() + ttlSeconds * 1000
        });
        callback && callback(null);
    }

    async destroy(sid, callback) {
        const key = this._buildKey(sid);
        try {
            if (this.client && this._redisAvailable) {
                await this.client.del(key);
                this._markRedisRecovery();
            }
        } catch (error) {
            this._logRedisError('DEL', error);
        }
        this._localFallback.delete(key);
        callback && callback(null);
    }

    async touch(sid, sess, callback) {
        if (this.disableTouch) {
            return callback && callback(null);
        }
        const key = this._buildKey(sid);
        const ttlSeconds = this._getTtlFromSession(sess);
        try {
            if (this.client && this._redisAvailable) {
                await this.client.expire(key, ttlSeconds);
                this._markRedisRecovery();
            }
        } catch (error) {
            this._logRedisError('TOUCH', error);
        }
        const localSess = this._localFallback.get(key);
        if (localSess) {
            localSess.expiresAt = Date.now() + ttlSeconds * 1000;
        }
        callback && callback(null);
    }
}

function initializeSessionStore() {
    if (UpstashRedis && config.SESSION_REDIS_URL && config.SESSION_REDIS_TOKEN) {
        try {
            upstashSessionRedisClient = new UpstashRedis({
                url: config.SESSION_REDIS_URL,
                token: config.SESSION_REDIS_TOKEN
            });
            sessionStoreInstance = new UpstashSessionStore({
                client: upstashSessionRedisClient,
                prefix: config.SESSION_STORE_PREFIX,
                ttl: config.SESSION_DEFAULT_TTL_SECONDS,
                disableTouch: config.SESSION_DISABLE_TOUCH
            });
            isUsingRedisSessionStore = true;
            console.log(`🗄️  Upstash Redis session store initialized`);
        } catch (error) {
            console.error(`❌ Failed to initialize session Redis: ${error.message}`);
        }
    }
    
    return { sessionStoreInstance, isUsingRedisSessionStore };
}

// ==================== RATE LIMIT STORE ====================
function createResilientUpstashRateLimitStore({ redisClient, keyPrefix, windowMs, label }) {
    const localStore = new Map();
    let redisDisabledUntil = 0;
    let lastRedisErrorLogAt = 0;
    let redisWasDown = false;

    const buildPrefixedKey = (rawKey) => `${keyPrefix}:${rawKey}`;

    const incrementLocalFallback = (prefixedKey) => {
        const now = Date.now();
        const existing = localStore.get(prefixedKey);
        if (!existing || existing.resetAt <= now) {
            const resetAt = now + windowMs;
            localStore.set(prefixedKey, { totalHits: 1, resetAt });
            return { totalHits: 1, resetTime: new Date(resetAt) };
        }
        existing.totalHits += 1;
        localStore.set(prefixedKey, existing);
        return { totalHits: existing.totalHits, resetTime: new Date(existing.resetAt) };
    };

    return {
        localKeys: false,
        init: () => {},
        async increment(key) {
            const prefixedKey = buildPrefixedKey(key);
            const now = Date.now();

            if (!redisClient || now < redisDisabledUntil) {
                return incrementLocalFallback(prefixedKey);
            }

            try {
                const totalHitsRaw = await redisClient.incr(prefixedKey);
                const totalHits = Number(totalHitsRaw);

                if (totalHits === 1) {
                    await redisClient.pexpire(prefixedKey, windowMs);
                }

                const ttlRaw = await redisClient.pttl(prefixedKey);
                const ttlMs = Number(ttlRaw);
                const effectiveTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs;

                localStore.delete(prefixedKey);
                return {
                    totalHits: Number.isFinite(totalHits) && totalHits > 0 ? totalHits : 1,
                    resetTime: new Date(now + effectiveTtlMs)
                };
            } catch (error) {
                redisDisabledUntil = now + config.RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS;
                return incrementLocalFallback(prefixedKey);
            }
        },
        async decrement(key) {
            const prefixedKey = buildPrefixedKey(key);
            if (redisClient && Date.now() >= redisDisabledUntil) {
                try {
                    await redisClient.decr(prefixedKey);
                } catch (error) {}
            }
            const existing = localStore.get(prefixedKey);
            if (!existing) return;
            existing.totalHits = Math.max(0, existing.totalHits - 1);
        },
        async resetKey(key) {
            const prefixedKey = buildPrefixedKey(key);
            if (redisClient) {
                try {
                    await redisClient.del(prefixedKey);
                } catch (error) {}
            }
            localStore.delete(prefixedKey);
        },
        async resetAll() {
            localStore.clear();
        }
    };
}

// ==================== PATH HELPERS ====================
function getRequestPath(req) {
    return String(req.originalUrl || req.url || req.path || '')
        .split('?')[0]
        .trim()
        .toLowerCase();
}

function shouldApplyHeavySecurity(req) {
    const requestPath = getRequestPath(req);
    if (!requestPath.startsWith('/api/')) return false;
    return config.HEAVY_SECURITY_ROUTE_PREFIXES.some((prefix) => (
        requestPath === prefix ||
        requestPath.startsWith(`${prefix}/`) ||
        requestPath.startsWith(prefix)
    ));
}

function runOnHeavySecurityRoutes(middleware) {
    return (req, res, next) => {
        if (!shouldApplyHeavySecurity(req)) {
            return next();
        }
        return middleware(req, res, next);
    };
}

// ==================== HELMET MIDDLEWARE ====================
const helmetMiddleware = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    hidePoweredBy: true,
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' }
});

// ==================== XSS PROTECTION ====================
const XSS_SUSPECT_PATTERN = /<|>|javascript:|vbscript:|on\w+=|data:text\/html/i;
const SENSITIVE_FIELDS = new Set(['password', 'oldPass', 'newPass', 'confirmPassword', 'token']);

const sanitizeXssString = (input, maxLength = config.XSS_SANITIZE_MAX_STRING_LENGTH) => {
    if (typeof input !== 'string') return input;
    const truncated = input.length > maxLength ? input.slice(0, maxLength) : input;
    if (!XSS_SUSPECT_PATTERN.test(truncated)) {
        return truncated;
    }
    return truncated
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

const deepSanitizeXssIterative = (rootValue, maxDepth = config.XSS_SANITIZE_MAX_DEPTH, maxNodes = config.XSS_SANITIZE_MAX_NODES) => {
    if (rootValue === null || rootValue === undefined) return rootValue;
    
    let nodeCount = 0;
    const stack = [{ value: rootValue, key: '', parent: null, parentKey: null, depth: 0 }];
    
    while (stack.length > 0) {
        const { value, key, parent, parentKey, depth } = stack.pop();
        nodeCount += 1;
        
        if (nodeCount > maxNodes) break;
        if (SENSITIVE_FIELDS.has(key)) continue;
        
        if (typeof value === 'string') {
            const sanitized = sanitizeXssString(value);
            if (parent !== null && parentKey !== null) {
                parent[parentKey] = sanitized;
            }
            continue;
        }
        
        if (depth >= maxDepth) continue;
        
        if (Array.isArray(value)) {
            for (let i = value.length - 1; i >= 0; i -= 1) {
                stack.push({ value: value[i], key, parent: value, parentKey: i, depth: depth + 1 });
            }
            continue;
        }
        
        if (value && typeof value === 'object') {
            const keys = Object.keys(value);
            for (let i = keys.length - 1; i >= 0; i -= 1) {
                const k = keys[i];
                stack.push({ value: value[k], key: k, parent: value, parentKey: k, depth: depth + 1 });
            }
        }
    }
    
    return rootValue;
};

function shouldSkipXssSanitize(req) {
    const requestPath = getRequestPath(req);
    return config.XSS_SKIP_ROUTE_PREFIXES.some((prefix) => (
        requestPath === prefix ||
        requestPath.startsWith(`${prefix}/`) ||
        requestPath.startsWith(prefix)
    ));
}

// XSS Sanitization Middleware (for use with app.use())
function xssSanitizeMiddleware(req, res, next) {
    // Skip XSS sanitize for configured routes (e.g., chat/AI)
    if (shouldSkipXssSanitize(req)) {
        return next();
    }
    
    if (req.body && typeof req.body === 'object') {
        deepSanitizeXssIterative(req.body);
    }
    if (req.params && typeof req.params === 'object') {
        deepSanitizeXssIterative(req.params);
    }
    if (req.query && typeof req.query === 'object') {
        deepSanitizeXssIterative(req.query);
    }

    next();
}

// Performance logging middleware (for use with app.use())
function performanceLoggingMiddleware(req, res, next) {
    const startedAt = process.hrtime.bigint();
    
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const durationText = `${durationMs.toFixed(1)}ms`;
        const prefix = durationMs > config.SLOW_REQUEST_THRESHOLD_MS ? '⚠️ [SLOW REQUEST]' : '⏱️ [REQ]';
        const logFn = durationMs > config.SLOW_REQUEST_THRESHOLD_MS ? console.warn : console.log;
        logFn(`${prefix} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationText})`);
    });
    next();
}

// ==================== DANGEROUS PAYLOAD BLOCKER ====================
const DANGEROUS_PATTERNS = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /\$\{.*\}/g,
    /\$gt|\$lt|\$eq|\$ne|\$or|\$and|\$where|\$regex/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
    /window\.location/gi,
];

function blockDangerousPayload(req, res, next) {
    const checkValue = (value, path) => {
        if (typeof value === 'string') {
            for (const pattern of DANGEROUS_PATTERNS) {
                pattern.lastIndex = 0;
                if (pattern.test(value)) {
                    console.error(`🚨 [SECURITY] Dangerous payload blocked at ${req.path}`);
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
            message: 'Yêu cầu không hợp lệ'
        });
    }
    next();
}

// ==================== JWT AUTHENTICATION ====================
async function loadUserByIdSafe(userId) {
    const id = String(userId || '').trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return User.findById(id)
        .select('username fullName email avatar whaleID role totalTargetCredits')
        .lean();
}

function resolveUsernameFromRequest(req) {
    const fromSessionUser = String(req.user?.username || '').trim();
    if (fromSessionUser) return fromSessionUser;
    const fromBody = String(req.body?.username || '').trim();
    if (fromBody) return fromBody;
    return String(req.query?.username || '').trim();
}

function logDeniedAdminAccess(req, reason, user = null) {
    const endpoint = req.originalUrl || req.url || req.path || 'unknown';
    if (!endpoint.startsWith('/api/admin')) return;

    const username = user?.username || req.user?.username || 'anonymous';
    const userId = user?.userId || req.user?.userId || null;
    const ip = utils.extractClientIP(req) || utils.normalizeIp(req.ip) || 'unknown';

    console.warn('🚫 [ADMIN ACCESS DENIED]', JSON.stringify({
        timestamp: new Date().toISOString(),
        reason,
        method: req.method,
        endpoint,
        ip,
        user: username
    }));

    if (mongoose.connection.readyState === 1) {
        void SystemEvent.create({
            type: 'security',
            severity: 'warning',
            title: 'Admin access denied',
            description: `${reason} - ${req.method} ${endpoint}`,
            details: { reason, method: req.method, endpoint, ip, user: username },
            performedBy: username
        }).catch(() => {});
    }
}

function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            logDeniedAdminAccess(req, 'missing_authorization_header');
            return res.status(401).json({
                success: false,
                message: '⛔ Không tìm thấy token xác thực!'
            });
        }

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

        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logDeniedAdminAccess(req, 'expired_token');
            return res.status(401).json({
                success: false,
                message: '⛔ Token đã hết hạn!',
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
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xác thực token'
        });
    }
}

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
            message: '⛔ Bạn không có quyền Admin!'
        });
    }

    next();
}

function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return next();

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (token) {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                role: decoded.role
            };
        }
        next();
    } catch (error) {
        next();
    }
}

async function ensureAuthenticated(req, res, next) {
    try {
        const isPassportAuthenticated = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;

        if (isPassportAuthenticated && req.user) {
            return next();
        }

        const sessionUserId = String(req.session?.passport?.user || '').trim();
        if (!req.user && sessionUserId && mongoose.Types.ObjectId.isValid(sessionUserId)) {
            const sessionUser = await loadUserByIdSafe(sessionUserId);
            if (sessionUser) {
                req.user = sessionUser;
                return next();
            }
        }

        const authHeader = String(req.headers?.authorization || '').trim();
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, config.JWT_SECRET);
                const tokenUserId = String(decoded?.userId || '').trim();
                
                if (tokenUserId && mongoose.Types.ObjectId.isValid(tokenUserId)) {
                    const tokenUser = await loadUserByIdSafe(tokenUserId);
                    if (tokenUser) {
                        req.user = tokenUser;
                        return next();
                    }
                }

                const tokenUsername = String(decoded?.username || '').trim();
                if (tokenUsername) {
                    const tokenUserByUsername = await User.findOne({ username: tokenUsername })
                        .select('username fullName email avatar whaleID role totalTargetCredits')
                        .lean();
                    if (tokenUserByUsername) {
                        req.user = tokenUserByUsername;
                        return next();
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [AUTH] JWT check failed: ${error.message}`);
            }
        }

        return res.status(401).json({
            success: false,
            authenticated: false,
            message: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'
        });
    } catch (error) {
        console.error('ensureAuthenticated error:', error.message);
        return res.status(500).json({
            success: false,
            authenticated: false,
            message: 'Lỗi xác thực phiên đăng nhập.'
        });
    }
}

async function isAdmin(req, res, next) {
    try {
        const originalAdminId = String(req.session?.adminId || '').trim();
        const passportUserId = String(req.session?.passport?.user || '').trim();

        let effectiveUser = req.user || null;
        if (!effectiveUser && passportUserId) {
            effectiveUser = await loadUserByIdSafe(passportUserId);
        }

        let adminActor = effectiveUser;
        if (originalAdminId) {
            adminActor = await loadUserByIdSafe(originalAdminId);
        }

        if (!adminActor) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập phiên Admin.'
            });
        }

        const adminEmail = String(adminActor.email || '').trim().toLowerCase();
        const hasAdminRole = adminActor.role === 'admin';
        const isAllowedEmail = config.ADMIN_EMAIL_ALLOWLIST.size > 0 && config.ADMIN_EMAIL_ALLOWLIST.has(adminEmail);

        if (!hasAdminRole && !isAllowedEmail) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền Admin.'
            });
        }

        req.adminActor = adminActor;
        req.effectiveUser = effectiveUser;
        req.isImpersonating = Boolean(originalAdminId);
        return next();
    } catch (error) {
        console.error('isAdmin middleware error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực quyền Admin.'
        });
    }
}

// ==================== INPUT VALIDATION ====================
const sanitizeAndValidateInput = [
    body('content').optional().trim().escape(),
    body('title').optional().trim().escape(),
    body('message').optional().trim(),
    body('username').optional().trim().escape(),
    query('username').optional().trim().escape(),
    param('id').optional().trim().escape(),
];

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn(`⚠️ Validation failed for ${req.path}`);
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ'
        });
    }
    next();
}

// ==================== PERFORMANCE LOGGING ====================
function performanceLogging(req, res, next) {
    if (!String(req.path || '').startsWith('/api/')) {
        return next();
    }
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const durationText = `${durationMs.toFixed(1)}ms`;
        const prefix = durationMs > config.SLOW_REQUEST_THRESHOLD_MS ? '⚠️ [SLOW REQUEST]' : '⏱️ [REQ]';
        const logFn = durationMs > config.SLOW_REQUEST_THRESHOLD_MS ? console.warn : console.log;
        logFn(`${prefix} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationText})`);
    });
    next();
}

// ==================== SESSION SAVE PROMISE ====================
function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save((error) => {
            if (error) return reject(error);
            return resolve();
        });
    });
}

// ==================== EXPORTS ====================
module.exports = {
    // Redis
    initializeRedisClients,
    initializeSessionStore,
    createResilientUpstashRateLimitStore,
    UpstashSessionStore,
    getRedisClient: () => upstashRateLimitRedisClient,
    getSessionStore: () => ({ sessionStoreInstance, isUsingRedisSessionStore }),
    
    // Middleware helpers
    getRequestPath,
    shouldApplyHeavySecurity,
    runOnHeavySecurityRoutes,
    
    // Security middleware
    helmetMiddleware,
    sanitizeXssString,
    deepSanitizeXssIterative,
    shouldSkipXssSanitize,
    xssSanitizeMiddleware,
    blockDangerousPayload,
    
    // Authentication
    loadUserByIdSafe,
    resolveUsernameFromRequest,
    verifyToken,
    verifyAdmin,
    optionalAuth,
    ensureAuthenticated,
    isAdmin,
    logDeniedAdminAccess,
    
    // Validation
    sanitizeAndValidateInput,
    validateRequest,
    
    // Performance
    performanceLogging,
    performanceLoggingMiddleware,
    
    // Session
    saveSession
};
