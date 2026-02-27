const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
console.log("🔑 KEY CHECK:", process.env.GEMINI_API_KEY ? "Đã tìm thấy Key!" : "❌ KHÔNG THẤY KEY");
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = fs.promises;
const multer = require('multer');
const os = require('os');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
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
let cookieParser = null;
try {
    cookieParser = require('cookie-parser');
} catch (error) {
    console.warn('⚠️ cookie-parser is not installed. Run `npm i cookie-parser` in server/ for full cookie parsing support.');
}
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const helmet = require('helmet');
let UpstashRedis = null;
try {
    ({ Redis: UpstashRedis } = require('@upstash/redis'));
} catch (error) {
    console.warn('⚠️ @upstash/redis is not installed. Rate limit storage will fallback to in-memory.');
}
let compression = null;
try {
    compression = require('compression');
} catch (error) {
    console.warn('⚠️ compression is not installed. Run `npm i compression` in server/ to enable API response compression.');
}
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp'); // 🛡️ [ENTERPRISE] Chống HTTP Parameter Pollution
const { body, param, query, validationResult } = require('express-validator'); // 🛡️ [ENTERPRISE] Input Validation

// ==================== SECURITY CONSTANTS ====================
const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'whalio_super_secret_key_change_in_production_2024';
const JWT_EXPIRES_IN = '7d'; // Token hết hạn sau 7 ngày

// ==================== AI SERVICE ====================
const { generateAIResponse } = require('./aiService'); // Bỏ cái /js/ đi là xong

// ==================== ADMIN ROUTER ====================
const adminRouter = require('./routes/admin-refactored');

const app = express();
app.set('trust proxy', true);

const parsePositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseEnvBoolean = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const deepCloneSafe = (value) => {
    if (value === null || value === undefined) return value;

    if (typeof global.structuredClone === 'function') {
        try {
            return global.structuredClone(value);
        } catch (error) {
            // Fallback sang JSON clone cho dữ liệu plain object/array.
        }
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        return value;
    }
};

const normalizeObjectIdInput = (rawId) => {
    if (!rawId) return '';

    if (typeof rawId === 'string') {
        return rawId.trim();
    }

    if (typeof rawId === 'object') {
        if (typeof rawId.$oid === 'string') {
            return rawId.$oid.trim();
        }

        if (typeof rawId.toHexString === 'function') {
            try {
                return String(rawId.toHexString()).trim();
            } catch (error) {
                // Fallback below
            }
        }

        const rawBuffer = rawId.buffer;
        if (rawBuffer) {
            const toHex = (items) => items
                .map((value) => Number(value).toString(16).padStart(2, '0'))
                .join('');

            if (Array.isArray(rawBuffer)) {
                return toHex(rawBuffer);
            }

            if (rawBuffer instanceof Uint8Array) {
                return toHex(Array.from(rawBuffer));
            }

            if (typeof rawBuffer === 'object') {
                const orderedBytes = Object.keys(rawBuffer)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((key) => Number(rawBuffer[key]))
                    .filter((value) => Number.isFinite(value));
                if (orderedBytes.length > 0) {
                    return toHex(orderedBytes);
                }
            }
        }
    }

    try {
        const fallback = String(rawId).trim();
        return fallback === '[object Object]' ? '' : fallback;
    } catch (error) {
        return '';
    }
};

const REQUEST_BODY_LIMIT = process.env.EXPRESS_BODY_LIMIT || '1mb';
const API_COMPRESSION_THRESHOLD_BYTES = parsePositiveInt(process.env.API_COMPRESSION_THRESHOLD_BYTES, 1024);
const RATE_LIMIT_REDIS_URL = String(
    process.env.UPSTASH_REDIS_REST_URL || process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_REST_URL || ''
).trim();
const RATE_LIMIT_REDIS_TOKEN = String(
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.RATE_LIMIT_REDIS_TOKEN || process.env.REDIS_REST_TOKEN || ''
).trim();
const SESSION_REDIS_URL = String(
    process.env.SESSION_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_REST_URL || ''
).trim();
const SESSION_REDIS_TOKEN = String(
    process.env.SESSION_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.RATE_LIMIT_REDIS_TOKEN || process.env.REDIS_REST_TOKEN || ''
).trim();
const SESSION_STORE_PREFIX = String(process.env.SESSION_STORE_PREFIX || 'sess:').trim() || 'sess:';
const SESSION_DEFAULT_TTL_SECONDS = parsePositiveInt(process.env.SESSION_REDIS_TTL_SECONDS, 7 * 24 * 60 * 60);
const SESSION_DISABLE_TOUCH = parseEnvBoolean(process.env.SESSION_DISABLE_TOUCH, false);
const RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS = parsePositiveInt(process.env.RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS, 30 * 1000);
const RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS = parsePositiveInt(process.env.RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS, 60 * 1000);
const RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS = parsePositiveInt(process.env.RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS, 5000);
const CHAT_CONTEXT_MAX_MESSAGES = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_MESSAGES, 8);
const CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE, 700);
const CHAT_CONTEXT_MAX_TOTAL_CHARS = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_TOTAL_CHARS, 6000);
const SERVER_TMP_DIR = process.env.RENDER_TMP_DIR || os.tmpdir();
const UPLOAD_TMP_DIR = path.join(SERVER_TMP_DIR, 'whalio-uploads');
const PORTAL_CACHE_TTL_SECONDS = parsePositiveInt(process.env.PORTAL_CACHE_TTL_SECONDS, 120);
const SLOW_REQUEST_THRESHOLD_MS = parsePositiveInt(process.env.SLOW_REQUEST_THRESHOLD_MS, 200);
const USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS = parsePositiveInt(process.env.USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS, 30);
const STUDY_STATS_CACHE_TTL_SECONDS = parsePositiveInt(process.env.STUDY_STATS_CACHE_TTL_SECONDS, 30);
const CHAT_RESPONSE_CACHE_TTL_SECONDS = parsePositiveInt(process.env.CHAT_RESPONSE_CACHE_TTL_SECONDS, 90);
const CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS = parsePositiveInt(process.env.CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS, 2000);
const XSS_SANITIZE_MAX_DEPTH = parsePositiveInt(process.env.XSS_SANITIZE_MAX_DEPTH, 6);
const XSS_SANITIZE_MAX_NODES = parsePositiveInt(process.env.XSS_SANITIZE_MAX_NODES, 400);
const XSS_SANITIZE_MAX_STRING_LENGTH = parsePositiveInt(process.env.XSS_SANITIZE_MAX_STRING_LENGTH, 4000);
const XSS_SKIP_ROUTE_PREFIXES = Array.from(new Set([
    '/api/chat',
    '/api/ai',
    ...String(process.env.XSS_SKIP_ROUTE_PREFIXES || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
]));
const runtimeCache = new NodeCache({
    stdTTL: PORTAL_CACHE_TTL_SECONDS,
    checkperiod: Math.max(30, Math.floor(PORTAL_CACHE_TTL_SECONDS / 2)),
    useClones: false
});
const userDashboardBatchCache = new NodeCache({
    stdTTL: USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS / 2)),
    useClones: false
});
const studyStatsCache = new NodeCache({
    stdTTL: STUDY_STATS_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(STUDY_STATS_CACHE_TTL_SECONDS / 2)),
    useClones: false
});
const chatResponseCache = new NodeCache({
    stdTTL: CHAT_RESPONSE_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(CHAT_RESPONSE_CACHE_TTL_SECONDS / 2)),
    useClones: false
});
const HEAVY_SECURITY_ROUTE_PREFIXES = Array.from(new Set([
    '/api/admin',
    '/api/upload',
    ...String(process.env.HEAVY_SECURITY_ROUTE_PREFIXES || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
]));
const RENDER_MEMORY_LIMIT_MB = parsePositiveInt(process.env.RENDER_MEMORY_LIMIT_MB, 512);
const EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT = Math.min(
    99,
    Math.max(1, parsePositiveInt(process.env.EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT, 85))
);
const EMERGENCY_HEAP_CHECK_INTERVAL_MS = parsePositiveInt(process.env.EMERGENCY_HEAP_CHECK_INTERVAL_MS, 60 * 1000);
const EMERGENCY_HEAP_THRESHOLD_BYTES =
    Math.floor(RENDER_MEMORY_LIMIT_MB * 1024 * 1024 * (EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT / 100));
const CHAT_QUEUE_CONCURRENCY = Math.max(1, parsePositiveInt(process.env.CHAT_QUEUE_CONCURRENCY, 2));
const CHAT_QUEUE_MAX_PENDING = Math.max(1, parsePositiveInt(process.env.CHAT_QUEUE_MAX_PENDING, 50));
const CHAT_FILE_PARSE_WORKER_TIMEOUT_MS = Math.max(1000, parsePositiveInt(process.env.CHAT_FILE_PARSE_WORKER_TIMEOUT_MS, 30000));
const ACTIVITY_LOG_QUEUE_CONCURRENCY = Math.max(1, parsePositiveInt(process.env.ACTIVITY_LOG_QUEUE_CONCURRENCY, 8));
const chatQueue = new PQueue({ concurrency: CHAT_QUEUE_CONCURRENCY });
const activityLogQueue = new PQueue({ concurrency: ACTIVITY_LOG_QUEUE_CONCURRENCY });

const getUserDashboardBatchCacheKey = (username) => {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername) return '';
    return `user:dashboard-batch:${normalizedUsername}`;
};

function getUserDashboardBatchFromCache(username) {
    const cacheKey = getUserDashboardBatchCacheKey(username);
    if (!cacheKey) return null;
    const cached = userDashboardBatchCache.get(cacheKey);
    return cached ? deepCloneSafe(cached) : null;
}

function setUserDashboardBatchCache(username, payload) {
    const cacheKey = getUserDashboardBatchCacheKey(username);
    if (!cacheKey) return;
    userDashboardBatchCache.set(cacheKey, deepCloneSafe(payload), USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS);
}

function invalidateUserDashboardBatchCache(username) {
    const cacheKey = getUserDashboardBatchCacheKey(username);
    if (!cacheKey) return;
    userDashboardBatchCache.del(cacheKey);
}

const normalizeCacheUsername = (username) => String(username || '').trim().toLowerCase();

function getStudyStatsCacheKey(username) {
    const normalizedUsername = normalizeCacheUsername(username);
    if (!normalizedUsername) return '';
    return `study:stats:${normalizedUsername}`;
}

function getStudyStatsFromCache(username) {
    const cacheKey = getStudyStatsCacheKey(username);
    if (!cacheKey) return null;
    const cached = studyStatsCache.get(cacheKey);
    return cached ? deepCloneSafe(cached) : null;
}

function setStudyStatsCache(username, payload) {
    const cacheKey = getStudyStatsCacheKey(username);
    if (!cacheKey) return;
    studyStatsCache.set(cacheKey, deepCloneSafe(payload), STUDY_STATS_CACHE_TTL_SECONDS);
}

function invalidateStudyStatsCache(username) {
    const cacheKey = getStudyStatsCacheKey(username);
    if (!cacheKey) return;
    studyStatsCache.del(cacheKey);
}

function buildChatResponseCacheKey(rawPrompt) {
    const normalized = String(rawPrompt || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    if (!normalized) return '';
    const digest = crypto.createHash('sha256').update(normalized).digest('hex');
    return `chat:response:${digest}`;
}

async function getChatResponseFromCache(cacheKey) {
    if (!cacheKey) return null;

    const memoryCached = chatResponseCache.get(cacheKey);
    if (memoryCached) return deepCloneSafe(memoryCached);

    if (!upstashRateLimitRedisClient) return null;
    try {
        const redisCached = await upstashRateLimitRedisClient.get(cacheKey);
        if (!redisCached) return null;
        const parsed = typeof redisCached === 'string'
            ? JSON.parse(redisCached)
            : redisCached;
        if (!parsed || typeof parsed !== 'object') return null;
        chatResponseCache.set(cacheKey, parsed, CHAT_RESPONSE_CACHE_TTL_SECONDS);
        return deepCloneSafe(parsed);
    } catch (error) {
        console.warn(`⚠️ AI response cache read failed (${cacheKey}): ${error.message}`);
        return null;
    }
}

async function setChatResponseToCache(cacheKey, payload) {
    if (!cacheKey || !payload || typeof payload !== 'object') return;

    chatResponseCache.set(cacheKey, deepCloneSafe(payload), CHAT_RESPONSE_CACHE_TTL_SECONDS);
    if (!upstashRateLimitRedisClient) return;

    try {
        await upstashRateLimitRedisClient.set(cacheKey, JSON.stringify(payload), { ex: CHAT_RESPONSE_CACHE_TTL_SECONDS });
    } catch (error) {
        console.warn(`⚠️ AI response cache write failed (${cacheKey}): ${error.message}`);
    }
}

try {
    fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
} catch (err) {
    console.error('❌ Failed to initialize temporary upload directory:', err.message);
}

let upstashRateLimitRedisClient = null;
if (UpstashRedis && RATE_LIMIT_REDIS_URL && RATE_LIMIT_REDIS_TOKEN) {
    try {
        upstashRateLimitRedisClient = new UpstashRedis({
            url: RATE_LIMIT_REDIS_URL,
            token: RATE_LIMIT_REDIS_TOKEN
        });
        if (typeof upstashRateLimitRedisClient.ping === 'function') {
            void upstashRateLimitRedisClient
                .ping()
                .then(() => {
                    console.log('🧠 Upstash Redis connected for rate limiting.');
                })
                .catch((error) => {
                    console.warn(`⚠️ Upstash Redis ping failed at startup. Falling back to memory until retry: ${error.message}`);
                });
        } else {
            console.log('🧠 Upstash Redis client initialized for rate limiting.');
        }
    } catch (error) {
        console.error(`❌ Failed to initialize Upstash Redis client: ${error.message}`);
        upstashRateLimitRedisClient = null;
    }
} else {
    console.log('ℹ️ Upstash Redis credentials not found. Rate limiting uses in-memory store.');
}

// ==================== UPSTASH SESSION STORE ====================
// Custom express-session store using @upstash/redis REST API
// Supports TTL sync with cookie.maxAge, resilient fallback to MemoryStore
let upstashSessionRedisClient = null;
let sessionStoreInstance = null;
let isUsingRedisSessionStore = false;

class UpstashSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        this.client = options.client;
        this.prefix = options.prefix || SESSION_STORE_PREFIX;
        this.ttl = options.ttl || SESSION_DEFAULT_TTL_SECONDS;
        this.disableTouch = options.disableTouch || SESSION_DISABLE_TOUCH;
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
        if (now - this._lastErrorLogAt >= RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS) {
            console.warn(`⚠️ [SessionStore] Redis ${action} failed: ${error.message}. Using memory fallback.`);
            this._lastErrorLogAt = now;
        }
        this._redisAvailable = false;
    }

    _markRedisRecovery() {
        if (!this._redisAvailable) {
            console.log('✅ [SessionStore] Redis recovered. Using Redis store again.');
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
        // Fallback to memory
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
        // Fallback to memory with TTL
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
        // Update local fallback TTL if exists
        const localSess = this._localFallback.get(key);
        if (localSess) {
            localSess.expiresAt = Date.now() + ttlSeconds * 1000;
        }
        callback && callback(null);
    }

    // Periodic cleanup for memory fallback
    _cleanupExpiredLocal() {
        const now = Date.now();
        for (const [key, value] of this._localFallback.entries()) {
            if (!value || value.expiresAt <= now) {
                this._localFallback.delete(key);
            }
        }
    }
}

// Initialize session Redis client (can use separate credentials from rate limit)
if (UpstashRedis && SESSION_REDIS_URL && SESSION_REDIS_TOKEN) {
    try {
        upstashSessionRedisClient = new UpstashRedis({
            url: SESSION_REDIS_URL,
            token: SESSION_REDIS_TOKEN
        });
        // Create the session store instance
        sessionStoreInstance = new UpstashSessionStore({
            client: upstashSessionRedisClient,
            prefix: SESSION_STORE_PREFIX,
            ttl: SESSION_DEFAULT_TTL_SECONDS,
            disableTouch: SESSION_DISABLE_TOUCH
        });
        isUsingRedisSessionStore = true;
        // Test connection
        if (typeof upstashSessionRedisClient.ping === 'function') {
            void upstashSessionRedisClient
                .ping()
                .then(() => {
                    console.log(`🗄️  Upstash Redis connected for session store (prefix: ${SESSION_STORE_PREFIX}, TTL: ${SESSION_DEFAULT_TTL_SECONDS}s)`);
                })
                .catch((error) => {
                    console.warn(`⚠️ Session Redis ping failed at startup. Store will fallback to memory: ${error.message}`);
                });
        } else {
            console.log(`🗄️  Upstash Redis client initialized for session store (prefix: ${SESSION_STORE_PREFIX})`);
        }
    } catch (error) {
        console.error(`❌ Failed to initialize session Redis client: ${error.message}`);
        upstashSessionRedisClient = null;
        sessionStoreInstance = null;
        isUsingRedisSessionStore = false;
    }
} else {
    console.log('ℹ️ Session Redis credentials not found. Sessions will use MemoryStore (not recommended for production).');
}

function createResilientUpstashRateLimitStore({ redisClient, keyPrefix, windowMs, label }) {
    const localStore = new Map();
    let redisDisabledUntil = 0;
    let lastRedisErrorLogAt = 0;
    let redisWasDown = false;

    const cleanupExpiredLocalEntries = (now) => {
        if (localStore.size <= RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS) {
            return;
        }

        for (const [storedKey, storedValue] of localStore.entries()) {
            if (!storedValue || storedValue.resetAt <= now) {
                localStore.delete(storedKey);
            }
            if (localStore.size <= RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS) {
                break;
            }
        }
    };

    const buildPrefixedKey = (rawKey) => `${keyPrefix}:${rawKey}`;

    const incrementLocalFallback = (prefixedKey) => {
        const now = Date.now();
        cleanupExpiredLocalEntries(now);

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

    const markRedisFailure = (error) => {
        const now = Date.now();
        redisDisabledUntil = now + RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS;

        if (now - lastRedisErrorLogAt >= RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS) {
            console.warn(
                `⚠️ [RateLimit:${label}] Upstash unavailable. Using local fallback for ${RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS}ms. Reason: ${error.message}`
            );
            lastRedisErrorLogAt = now;
        }
        redisWasDown = true;
    };

    const markRedisRecovery = () => {
        if (!redisWasDown) return;
        redisWasDown = false;
        console.log(`✅ [RateLimit:${label}] Upstash recovered. Using Redis store again.`);
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
                markRedisRecovery();
                return {
                    totalHits: Number.isFinite(totalHits) && totalHits > 0 ? totalHits : 1,
                    resetTime: new Date(now + effectiveTtlMs)
                };
            } catch (error) {
                markRedisFailure(error);
                return incrementLocalFallback(prefixedKey);
            }
        },
        async decrement(key) {
            const prefixedKey = buildPrefixedKey(key);
            const now = Date.now();

            if (redisClient && now >= redisDisabledUntil) {
                try {
                    await redisClient.decr(prefixedKey);
                    markRedisRecovery();
                } catch (error) {
                    markRedisFailure(error);
                }
            }

            const existing = localStore.get(prefixedKey);
            if (!existing) return;
            existing.totalHits = Math.max(0, existing.totalHits - 1);
            if (existing.totalHits <= 0 || existing.resetAt <= now) {
                localStore.delete(prefixedKey);
                return;
            }
            localStore.set(prefixedKey, existing);
        },
        async resetKey(key) {
            const prefixedKey = buildPrefixedKey(key);

            if (redisClient) {
                try {
                    await redisClient.del(prefixedKey);
                    markRedisRecovery();
                } catch (error) {
                    markRedisFailure(error);
                }
            }
            localStore.delete(prefixedKey);
        },
        async resetAll() {
            localStore.clear();
        }
    };
}

// ==================== MIDDLEWARE CONFIGURATION ====================
// 🔧 [CRITICAL] JSON/URL Parsing PHẢI ĐẶT TRƯỚC TẤT CẢ MIDDLEWARE BẢO MẬT
// Lý do: Các middleware bảo mật (mongoSanitize, xss, hpp) cần req.body đã được parse
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// 🔧 [EXPRESS 5.x FIX] Kích hoạt query parser TRƯỚC mongoSanitize
// Express 5.x không tự động parse query string, gây lỗi "Cannot set property query"
app.set('query parser', 'extended');

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, '../img')));
console.log(`✅  Request parsing enabled (JSON + URL-encoded + Query, max ${REQUEST_BODY_LIMIT})`);
if (!String(process.env.NODE_OPTIONS || '').includes('--max-old-space-size')) {
    console.log('💡 Memory hint: set NODE_OPTIONS="--max-old-space-size=512" on Render for tighter GC behavior.');
}

// 1. CORS Configuration (cross-domain frontend -> backend with credentials)
const ALLOWED_CORS_ORIGINS = [
    'https://whaliostudy.io.vn',
    'https://www.whaliostudy.io.vn',
    'https://weblogwhalio.onrender.com',
    'https://whaliostudying.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || ALLOWED_CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
console.log(`✅  CORS enabled. Credentials: true. Origins: ${ALLOWED_CORS_ORIGINS.join(', ')}`);
if (compression) {
    app.use('/api', compression({
        threshold: API_COMPRESSION_THRESHOLD_BYTES
    }));
    console.log(`🗜️  API compression enabled (threshold ${API_COMPRESSION_THRESHOLD_BYTES} bytes)`);
}

// Performance logging middleware: theo dõi thời gian phản hồi cho từng request
app.use((req, res, next) => {
    if (!String(req.path || '').startsWith('/api/')) {
        return next();
    }
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const durationText = `${durationMs.toFixed(1)}ms`;
        const prefix = durationMs > SLOW_REQUEST_THRESHOLD_MS ? '⚠️ [SLOW REQUEST]' : '⏱️ [REQ]';
        const logFn = durationMs > SLOW_REQUEST_THRESHOLD_MS ? console.warn : console.log;
        logFn(`${prefix} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationText})`);
    });
    next();
});

const SESSION_SECRET = String(
    process.env.SESSION_SECRET || process.env.JWT_SECRET || 'whalio_session_secret_change_me'
).trim();
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ SESSION_SECRET is not set. Using fallback secret from env/default.');
}

if (cookieParser) {
    app.use(cookieParser(SESSION_SECRET));
    console.log('✅  cookie-parser enabled');
}

// Build session configuration with Redis store if available
const sessionConfig = {
    name: 'whalio.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
};

// Use Redis store if available, otherwise fallback to default MemoryStore
if (sessionStoreInstance && isUsingRedisSessionStore) {
    sessionConfig.store = sessionStoreInstance;
    // Sync TTL with cookie maxAge
    if (sessionStoreInstance.ttl && sessionConfig.cookie.maxAge) {
        const cookieTtlSeconds = Math.ceil(sessionConfig.cookie.maxAge / 1000);
        if (cookieTtlSeconds !== sessionStoreInstance.ttl) {
            sessionStoreInstance.ttl = cookieTtlSeconds;
        }
    }
    console.log(`🗄️  Session using Redis store (prefix: ${SESSION_STORE_PREFIX}, TTL synced with cookie.maxAge)`);
} else {
    console.log('⚠️  Session using MemoryStore (not recommended for production - sessions lost on restart)');
}

app.use(session(sessionConfig));
console.log(`✅  express-session enabled (proxy=true, SameSite=None, Secure=true, store=${isUsingRedisSessionStore ? 'Redis' : 'Memory'})`);

// ⚡ Health Check Endpoint - Đặt ở đây để bypass middleware nặng (cho monitoring)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// OAuth (Google) middleware
app.use(passport.initialize());
app.use(passport.session());

function getRequestPath(req) {
    return String(req.originalUrl || req.url || req.path || '')
        .split('?')[0]
        .trim()
        .toLowerCase();
}

function shouldApplyHeavySecurity(req) {
    const requestPath = getRequestPath(req);
    if (!requestPath.startsWith('/api/')) return false;
    return HEAVY_SECURITY_ROUTE_PREFIXES.some((prefix) => (
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

// ==================== SECURITY MIDDLEWARE ====================
// 🛡️ [ENTERPRISE SECURITY - LAYER 1] HELMET - HTTP Security Headers
// Ẩn giấu dấu vết server, chống clickjacking, XSS, MIME sniffing
const helmetMiddleware = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Cho phép tải resource từ domain khác
    contentSecurityPolicy: false, // Tắt CSP để tránh conflict với frontend
    hidePoweredBy: true, // 🛡️ Xóa header X-Powered-By
    xFrameOptions: { action: 'deny' }, // Chống clickjacking
    xContentTypeOptions: true, // Chống MIME-sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' }
});
app.use(runOnHeavySecurityRoutes(helmetMiddleware));
// 🛡️ Đảm bảo xóa X-Powered-By hoàn toàn
app.disable('x-powered-by');
console.log(`🛡️  Helmet security headers enabled for sensitive APIs: ${HEAVY_SECURITY_ROUTE_PREFIXES.join(', ')}`);

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
const BLOCKED_IP_CACHE_MAX_ENTRIES = parsePositiveInt(process.env.BLOCKED_IP_CACHE_MAX_ENTRIES, 50000);
let blockedIPCacheSet = new Set();
let blockedIPCacheLastUpdatedAt = 0;
let blockedIPCacheRefreshPromise = null;
let blockedIPCacheRefreshInterval = null;
let blockedIPCacheCleanupRegistered = false;
let emergencyMemoryMonitorInterval = null;
let emergencyMemoryCleanupInProgress = false;

function toMB(bytes) {
    return Number((Number(bytes || 0) / (1024 * 1024)).toFixed(2));
}

function isExposeGcEnabled() {
    const fromExecArgv = Array.isArray(process.execArgv) && process.execArgv.some((arg) => String(arg).includes('--expose-gc'));
    const fromNodeOptions = String(process.env.NODE_OPTIONS || '').includes('--expose-gc');
    return fromExecArgv || fromNodeOptions;
}

async function logEmergencyMemoryCleanupEvent(payload = {}) {
    if (mongoose.connection.readyState !== 1) return;
    try {
        await SystemEvent.create({
            type: 'warning',
            severity: 'danger',
            title: 'Emergency memory cleanup executed',
            description: `heapUsed vượt ngưỡng ${EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT}% (${RENDER_MEMORY_LIMIT_MB} MB plan)`,
            details: payload,
            performedBy: 'System/MemoryMonitor'
        });
    } catch (error) {
        console.error('❌ Failed to persist emergency memory cleanup event:', error.message);
    }
}

async function runEmergencyMemoryCleanupCheck() {
    if (emergencyMemoryCleanupInProgress) return;

    const before = process.memoryUsage();
    if (before.heapUsed <= EMERGENCY_HEAP_THRESHOLD_BYTES) return;

    emergencyMemoryCleanupInProgress = true;
    const startTs = Date.now();
    const actions = {
        runtimeCacheFlushed: false,
        studyStatsCacheFlushed: false,
        chatResponseCacheFlushed: false,
        adminCachesReset: false,
        gcRequested: false,
        gcInvoked: false
    };

    try {
        runtimeCache.flushAll();
        actions.runtimeCacheFlushed = true;
        studyStatsCache.flushAll();
        actions.studyStatsCacheFlushed = true;
        chatResponseCache.flushAll();
        actions.chatResponseCacheFlushed = true;

        if (typeof adminRouter.resetAdminRuntimeCaches === 'function') {
            adminRouter.resetAdminRuntimeCaches();
            actions.adminCachesReset = true;
        }

        const gcEnabled = isExposeGcEnabled();
        actions.gcRequested = gcEnabled;
        if (gcEnabled && typeof global.gc === 'function') {
            global.gc();
            actions.gcInvoked = true;
        }
    } catch (error) {
        console.error('❌ Emergency memory cleanup failed:', error.message);
    } finally {
        const after = process.memoryUsage();
        const payload = {
            timestamp: new Date().toISOString(),
            threshold: {
                renderPlanMemoryMB: RENDER_MEMORY_LIMIT_MB,
                thresholdPercent: EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT,
                thresholdMB: toMB(EMERGENCY_HEAP_THRESHOLD_BYTES)
            },
            heapUsedBeforeMB: toMB(before.heapUsed),
            heapUsedAfterMB: toMB(after.heapUsed),
            rssBeforeMB: toMB(before.rss),
            rssAfterMB: toMB(after.rss),
            heapTotalBeforeMB: toMB(before.heapTotal),
            heapTotalAfterMB: toMB(after.heapTotal),
            osTotalMemoryMB: toMB(os.totalmem()),
            osFreeMemoryMB: toMB(os.freemem()),
            durationMs: Date.now() - startTs,
            actions
        };

        console.warn('🚨 Emergency memory cleanup triggered:', payload);
        await logEmergencyMemoryCleanupEvent(payload);
        emergencyMemoryCleanupInProgress = false;
    }
}

function startEmergencyMemoryMonitor() {
    if (emergencyMemoryMonitorInterval) return;

    emergencyMemoryMonitorInterval = setInterval(() => {
        void runEmergencyMemoryCleanupCheck();
    }, EMERGENCY_HEAP_CHECK_INTERVAL_MS);

    if (typeof emergencyMemoryMonitorInterval.unref === 'function') {
        emergencyMemoryMonitorInterval.unref();
    }
}

function stopEmergencyMemoryMonitor() {
    if (!emergencyMemoryMonitorInterval) return;
    clearInterval(emergencyMemoryMonitorInterval);
    emergencyMemoryMonitorInterval = null;
}

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

            const nextCache = new Set();
            const cursor = BlacklistIP.find({ status: 'blocked' })
                .select('ip -_id')
                .lean()
                .cursor();

            for await (const entry of cursor) {
                const normalizedIp = normalizeBlacklistIP(entry?.ip);
                if (!normalizedIp) continue;
                nextCache.add(normalizedIp);
                if (nextCache.size >= BLOCKED_IP_CACHE_MAX_ENTRIES) {
                    break;
                }
            }

            blockedIPCacheSet.clear();
            nextCache.forEach((ip) => blockedIPCacheSet.add(ip));
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

function stopBlockedIPCacheAutoRefresh() {
    if (blockedIPCacheRefreshInterval) {
        clearInterval(blockedIPCacheRefreshInterval);
        blockedIPCacheRefreshInterval = null;
    }
}

function startBlockedIPCacheAutoRefresh() {
    if (blockedIPCacheRefreshInterval) return;

    blockedIPCacheRefreshInterval = setInterval(() => {
        void refreshBlockedIPCache({ force: true });
    }, BLOCKED_IP_CACHE_REFRESH_MS);

    if (typeof blockedIPCacheRefreshInterval.unref === 'function') {
        blockedIPCacheRefreshInterval.unref();
    }

    if (!blockedIPCacheCleanupRegistered) {
        process.once('SIGTERM', stopBlockedIPCacheAutoRefresh);
        process.once('SIGINT', stopBlockedIPCacheAutoRefresh);
        process.once('exit', stopBlockedIPCacheAutoRefresh);
        blockedIPCacheCleanupRegistered = true;
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
app.use(runOnHeavySecurityRoutes((req, res, next) => {
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
}));
console.log('🛡️  MongoDB Sanitization enabled for sensitive APIs (Enterprise Layer 2)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 3] XSS CLEAN (OPTIMIZED)
// Tự động lọc mọi thẻ <script>, mã độc HTML trong req.body, req.query, req.params
// OPTIMIZATIONS:
// 1. Iterative approach với giới hạn (max depth, max nodes, max string length) để chặn CPU spike
// 2. Fast-path: chuỗi không có dấu hiệu XSS thì bỏ qua, không chạy regex nặng  
// 3. Skip configurable routes (mặc định skip chat/AI vì payload dài và ít rủi ro XSS ở tầng input)

// Fast-path regex để detect potential XSS patterns (chỉ chạy full sanitize nếu match)
const XSS_SUSPECT_PATTERN = /<|>|javascript:|vbscript:|on\w+=|data:text\/html/i;

const sanitizeXssString = (input, maxLength = XSS_SANITIZE_MAX_STRING_LENGTH) => {
    if (typeof input !== 'string') return input;
    
    // Truncate extremely long strings to prevent ReDoS
    const truncated = input.length > maxLength ? input.slice(0, maxLength) : input;
    
    // Fast-path: skip regex processing if no XSS indicators found
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

const SENSITIVE_FIELDS = new Set(['password', 'oldPass', 'newPass', 'confirmPassword', 'token']);

// Iterative XSS sanitizer with limits to prevent CPU spike on deeply nested/large payloads
const deepSanitizeXssIterative = (rootValue, maxDepth = XSS_SANITIZE_MAX_DEPTH, maxNodes = XSS_SANITIZE_MAX_NODES) => {
    if (rootValue === null || rootValue === undefined) return rootValue;
    
    let nodeCount = 0;
    // Stack stores { value, key, parent, parentKey, depth }
    const stack = [{ value: rootValue, key: '', parent: null, parentKey: null, depth: 0 }];
    
    while (stack.length > 0) {
        const { value, key, parent, parentKey, depth } = stack.pop();
        nodeCount += 1;
        
        // Limit check: stop processing if exceeds max nodes
        if (nodeCount > maxNodes) {
            break;
        }
        
        // Skip sensitive fields
        if (SENSITIVE_FIELDS.has(key)) {
            continue;
        }
        
        // Process string values
        if (typeof value === 'string') {
            const sanitized = sanitizeXssString(value);
            if (parent !== null && parentKey !== null) {
                parent[parentKey] = sanitized;
            }
            continue;
        }
        
        // Skip deeper levels to prevent recursion DoS
        if (depth >= maxDepth) {
            continue;
        }
        
        // Process arrays
        if (Array.isArray(value)) {
            for (let i = value.length - 1; i >= 0; i -= 1) {
                stack.push({ value: value[i], key, parent: value, parentKey: i, depth: depth + 1 });
            }
            continue;
        }
        
        // Process objects
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

// Check if route should skip XSS sanitization
function shouldSkipXssSanitize(req) {
    const requestPath = getRequestPath(req);
    return XSS_SKIP_ROUTE_PREFIXES.some((prefix) => (
        requestPath === prefix ||
        requestPath.startsWith(`${prefix}/`) ||
        requestPath.startsWith(prefix)
    ));
}

app.use(runOnHeavySecurityRoutes((req, res, next) => {
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
}));
console.log(`🛡️  XSS Clean protection enabled (iterative, maxDepth=${XSS_SANITIZE_MAX_DEPTH}, maxNodes=${XSS_SANITIZE_MAX_NODES}, skip: ${XSS_SKIP_ROUTE_PREFIXES.join(', ')})`);

// 🛡️ [ENTERPRISE SECURITY - LAYER 4] HTTP PARAMETER POLLUTION
// Chặn tấn công gử́i nhiều tham số trùng lặp (VD: ?username=admin&username=hacker)
app.use(runOnHeavySecurityRoutes(hpp({
    whitelist: ['images', 'files'] // Cho phép một số field có thể có nhiều giá trị (file upload)
})));
console.log('🛡️  HTTP Parameter Pollution protection enabled for sensitive APIs (Enterprise Layer 4)');

// 🛡️ [ENTERPRISE SECURITY - LAYER 5] RATE LIMITING
const GENERAL_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const GENERAL_RATE_LIMIT_MAX = parsePositiveInt(process.env.GENERAL_RATE_LIMIT_MAX, 400);
const ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const ADMIN_DEBUG_RATE_LIMIT_MAX = parsePositiveInt(process.env.ADMIN_DEBUG_RATE_LIMIT_MAX, 2000);
const ADMIN_RATE_LIMIT_ORIGINS = Array.from(new Set([
    'https://weblogwhalio.onrender.com',
    'https://whaliostudying.onrender.com',
    'https://whaliostudy.io.vn',
    'https://www.whaliostudy.io.vn',
    ...String(process.env.ADMIN_DEBUG_RATE_LIMIT_ORIGINS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
]));
const ADMIN_DEBUG_RATE_LIMIT_IPS = Array.from(new Set(
    String(process.env.ADMIN_DEBUG_RATE_LIMIT_IPS || '')
        .split(',')
        .map((item) => normalizeIp(item))
        .filter(Boolean)
));

function isAdminDebugOriginRequest(req) {
    const origin = String(req.headers.origin || '').trim();
    const referer = String(req.headers.referer || '').trim();
    return ADMIN_RATE_LIMIT_ORIGINS.some((allowedOrigin) => (
        origin === allowedOrigin || referer.startsWith(`${allowedOrigin}/`) || referer === allowedOrigin
    ));
}

function isAdminDebugIpRequest(req) {
    if (ADMIN_DEBUG_RATE_LIMIT_IPS.length === 0) return false;
    const ip = extractClientIP(req) || normalizeIp(req.ip) || normalizeIp(req.connection?.remoteAddress) || '';
    return Boolean(ip) && ADMIN_DEBUG_RATE_LIMIT_IPS.includes(ip);
}

function isAdminDebugWhitelistedRequest(req) {
    return isAdminDebugOriginRequest(req) || isAdminDebugIpRequest(req);
}

function isAdminApiPath(req) {
    const fullPath = String(req.originalUrl || req.url || req.path || '').toLowerCase();
    return fullPath.startsWith('/api/admin');
}

const buildRateLimiterStore = (windowMs, keyPrefix, label) => {
    if (!upstashRateLimitRedisClient) return undefined;
    return createResilientUpstashRateLimitStore({
        redisClient: upstashRateLimitRedisClient,
        keyPrefix,
        windowMs,
        label
    });
};

// Chống Brute Force & DDoS - Rate limiter cho tất cả API
const generalLimiter = rateLimit({
    windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
    max: GENERAL_RATE_LIMIT_MAX,
    store: buildRateLimiterStore(GENERAL_RATE_LIMIT_WINDOW_MS, 'ratelimit:general', 'general'),
    message: {
        success: false,
        message: '⛔ Quá nhiều yêu cầu! Vui lòng thử lại sau 15 phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Không tính preflight request.
        if (req.method === 'OPTIONS') return true;
        // Nới hạn mức cho Admin Dashboard origin khi gọi Admin API để debug.
        return isAdminApiPath(req) && isAdminDebugWhitelistedRequest(req);
    },
    keyGenerator: (req) => rateLimit.ipKeyGenerator(
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    )
});

// Burst limiter riêng cho Admin Dashboard origin để debug mà không khóa nhầm.
const adminDebugLimiter = rateLimit({
    windowMs: ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS,
    max: ADMIN_DEBUG_RATE_LIMIT_MAX,
    store: buildRateLimiterStore(ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS, 'ratelimit:admin-debug', 'admin-debug'),
    message: {
        success: false,
        message: '⛔ Quá nhiều yêu cầu từ Admin Dashboard. Vui lòng thử lại sau ít phút.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !isAdminDebugWhitelistedRequest(req),
    keyGenerator: (req) => rateLimit.ipKeyGenerator(
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    )
});

// Rate limiter nghiêm ngặt cho đăng nhập (5 lần / 15 phút)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // Chỉ cho phép 5 lần thử
    store: buildRateLimiterStore(15 * 60 * 1000, 'ratelimit:login', 'login'),
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

// Áp dụng burst limiter cho Admin Dashboard trước, rồi general limiter cho toàn bộ API.
app.use('/api/admin', adminDebugLimiter);
app.use('/api/', generalLimiter);
console.log(`🛡️  Rate limiting enabled (${GENERAL_RATE_LIMIT_MAX} req/${Math.round(GENERAL_RATE_LIMIT_WINDOW_MS / 60000)}min general, ${ADMIN_DEBUG_RATE_LIMIT_MAX} req/${Math.round(ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS / 60000)}min admin debug burst, 5 req/15min login) - Enterprise Layer 5`);
console.log(`🗄️  Rate limit store: ${upstashRateLimitRedisClient ? 'Upstash Redis (with automatic local fallback)' : 'In-memory (default)'}`);
console.log(`🧪 Admin debug whitelist origins: ${ADMIN_RATE_LIMIT_ORIGINS.join(', ') || '(none)'}`);
console.log(`🧪 Admin debug whitelist IPs: ${ADMIN_DEBUG_RATE_LIMIT_IPS.join(', ') || '(none configured)'}`);

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
    useUnifiedTopology: true,
    maxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, 20),
    minPoolSize: parsePositiveInt(process.env.MONGO_MIN_POOL_SIZE, 2),
    serverSelectionTimeoutMS: parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
    socketTimeoutMS: parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000)
})
    .then(() => {
        console.log('🚀 Whalio is now connected to MongoDB Cloud');
        
        // Khởi tạo Blacklist IP cache và auto-refresh
        refreshBlockedIPCache({ force: true }).then(() => {
            startBlockedIPCacheAutoRefresh();
            startEmergencyMemoryMonitor();
            void runEmergencyMemoryCleanupCheck();
            console.log('🚫 Blacklist IP cache initialized and auto-refresh started');
            console.log(
                `🧠 Memory monitor started: check every ${Math.round(EMERGENCY_HEAP_CHECK_INTERVAL_MS / 1000)}s, threshold ${toMB(EMERGENCY_HEAP_THRESHOLD_BYTES)} MB heapUsed`
            );
        });
        
        seedInitialData(); // Automatically seed data on startup
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔁 MongoDB reconnected');
});

async function gracefulShutdown(signal) {
    try {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        stopBlockedIPCacheAutoRefresh();
        stopEmergencyMemoryMonitor();
        runtimeCache.close();
        userDashboardBatchCache.close();
        studyStatsCache.close();
        chatResponseCache.close();
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
            await mongoose.connection.close(false);
            console.log('✅ MongoDB connection closed');
        }
    } catch (error) {
        console.error('❌ Graceful shutdown error:', error.message);
    } finally {
        process.exit(0);
    }
}

process.once('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});
process.once('SIGINT', () => {
    void gracefulShutdown('SIGINT');
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
    googleId: { type: String, unique: true, sparse: true, index: true },
    whaleID: { type: String, unique: true, sparse: true, index: true },
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
    totalTargetCredits: { type: Number, default: 150, min: 1 },
    
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
studySessionSchema.index({ username: 1, date: -1 });

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
documentSchema.index({ uploaderUsername: 1, createdAt: -1 });

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

// Code Snippet Schema (Kho Code)
const codeSnippetTestCaseSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true, trim: true, maxlength: 12000 },
    score: { type: Number, required: true, min: 0 }
}, { _id: false });

const codeSnippetSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    cardTitle: { type: String, required: true, trim: true, maxlength: 200 },
    subjectName: { type: String, default: '', trim: true, maxlength: 120 },
    exerciseName: { type: String, default: '', trim: true, maxlength: 220 },
    assignmentName: { type: String, default: '', trim: true, maxlength: 220 },
    formattedDescription: { type: String, default: '', trim: true, maxlength: 12000 },
    assignmentDescription: { type: String, default: '', trim: true, maxlength: 12000 },
    code: { type: String, default: '' },
    language: { type: String, default: 'plaintext', trim: true, maxlength: 60 },
    testCases: { type: [codeSnippetTestCaseSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

codeSnippetSchema.index({ username: 1, createdAt: -1 });

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

// Portal Schema (cấu hình cổng tiện ích, dữ liệu ít thay đổi)
const portalLinkSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    desc: { type: String, default: '', trim: true }
}, { _id: false });

const portalCategorySchema = new mongoose.Schema({
    id: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    icon: { type: String, default: 'Globe', trim: true },
    bg: { type: String, default: 'bg-blue-50 dark:bg-blue-900/20', trim: true },
    links: { type: [portalLinkSchema], default: [] }
}, { _id: false });

const portalConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true, default: 'main' },
    categories: { type: [portalCategorySchema], default: [] },
    updatedBy: { type: String, default: 'system' },
    updatedAt: { type: Date, default: Date.now }
});

portalConfigSchema.index({ key: 1 }, { unique: true });

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
eventSchema.index({ username: 1, date: 1 });

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
userActivityLogSchema.index({ action: 1, createdAt: -1 });

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
const CodeSnippet = mongoose.model('CodeSnippet', codeSnippetSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const PortalConfig = mongoose.model('PortalConfig', portalConfigSchema);
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

passport.serializeUser((user, done) => {
    const userId = String(user?._id || '').trim();
    if (!userId) {
        return done(new Error('Cannot serialize user session without _id'));
    }
    return done(null, userId);
});

passport.deserializeUser(async (userId, done) => {
    try {
        const user = await User.findById(userId)
            .select('username fullName email avatar whaleID role totalTargetCredits')
            .lean();
        return done(null, user || false);
    } catch (error) {
        return done(error, null);
    }
});

const ADMIN_EMAIL_ALLOWLIST = new Set(
    String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

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

async function ensureAuthenticated(req, res, next) {
    try {
        const isPassportAuthenticated =
            typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;

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

        const requestedUsername = resolveUsernameFromRequest(req);
        const authHeader = String(req.headers?.authorization || '').trim();
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : authHeader;
        let tokenUserId = '';
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                tokenUserId = String(decoded?.userId || '').trim();
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
                console.warn(`⚠️ [AUTH DEBUG] JWT check failed in ensureAuthenticated: ${error.message}`);
            }
        }

        console.warn('⚠️ [AUTH DEBUG] ensureAuthenticated failed', JSON.stringify({
            method: req.method,
            path: req.originalUrl || req.path || '',
            sessionUserId: sessionUserId || null,
            tokenUserId: tokenUserId || null,
            requestedUsername: requestedUsername || null,
            hasReqUser: Boolean(req.user),
            passportAuthenticated: isPassportAuthenticated
        }));

        return res.status(401).json({
            success: false,
            authenticated: false,
            message: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.'
        });
    } catch (error) {
        console.error('ensureAuthenticated middleware error:', error.message);
        return res.status(500).json({
            success: false,
            authenticated: false,
            message: 'Lỗi xác thực phiên đăng nhập.'
        });
    }
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save((error) => {
            if (error) return reject(error);
            return resolve();
        });
    });
}

const PORTAL_CACHE_KEY = 'portal:categories';

function normalizePortalCategories(rawCategories = []) {
    if (!Array.isArray(rawCategories)) return [];

    return rawCategories.map((category, categoryIndex) => {
        const links = Array.isArray(category?.links) ? category.links : [];
        return {
            id: String(category?.id || `category_${categoryIndex + 1}`).trim(),
            category: String(category?.category || 'Danh mục').trim(),
            icon: String(category?.icon || 'Globe').trim(),
            bg: String(category?.bg || 'bg-blue-50 dark:bg-blue-900/20').trim(),
            links: links
                .map((link, linkIndex) => ({
                    id: Number.isFinite(Number(link?.id)) ? Number(link.id) : Date.now() + linkIndex,
                    name: String(link?.name || '').trim(),
                    url: String(link?.url || '#').trim(),
                    desc: String(link?.desc || '').trim()
                }))
                .filter((link) => link.name && link.url)
        };
    }).filter((category) => category.id && category.category);
}

function getPortalFromCache() {
    const cached = runtimeCache.get(PORTAL_CACHE_KEY);
    return cached ? deepCloneSafe(cached) : null;
}

function setPortalCache(categories) {
    runtimeCache.set(PORTAL_CACHE_KEY, deepCloneSafe(categories), PORTAL_CACHE_TTL_SECONDS);
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
        const isAllowedEmail = ADMIN_EMAIL_ALLOWLIST.size > 0 && ADMIN_EMAIL_ALLOWLIST.has(adminEmail);

        if (!hasAdminRole && !isAllowedEmail) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền Admin để dùng tính năng nhập vai.'
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

// ==================== GOOGLE OAUTH HELPERS ====================
const resolveBaseUrl = (url, fallback) => {
    const value = String(url || '').trim();
    if (!value) return fallback;
    return value.replace(/\/+$/, '');
};

const WHALIO_WEB_BASE_URL = resolveBaseUrl(
    process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL,
    'https://whaliostudy.io.vn'
);
const GOOGLE_CALLBACK_URL = String(
    process.env.GOOGLE_CALLBACK_URL || 'https://whaliostudy.onrender.com/auth/google/callback'
).trim();
const GOOGLE_OAUTH_STATE_PARAM = 'googleAuth';
const isGoogleOAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function normalizeAuthUser(rawUser) {
    const source = rawUser?.toObject ? rawUser.toObject() : { ...(rawUser || {}) };
    const userId = String(source._id || source.userId || '').trim();
    const username = String(source.username || '').trim();
    const email = String(source.email || '').trim().toLowerCase();
    const role = String(source.role || 'member').trim() || 'member';
    const displayName = String(source.fullName || source.name || username || 'Whalio User').trim();
    const parsedTargetCredits = Number(source.totalTargetCredits);
    const totalTargetCredits = Number.isFinite(parsedTargetCredits) && parsedTargetCredits > 0
        ? Math.round(parsedTargetCredits)
        : 150;

    return {
        _id: userId || null,
        username,
        email,
        role,
        name: displayName,
        fullName: displayName,
        avatar: source.avatar || '/img/avt.png',
        whaleID: source.whaleID || null,
        totalTargetCredits
    };
}

function issueJwtForUser(rawUser) {
    const normalizedUser = normalizeAuthUser(rawUser);
    return jwt.sign(
        {
            userId: normalizedUser._id || '',
            username: normalizedUser.username || '',
            role: normalizedUser.role || 'member'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function buildAuthResponsePayload(rawUser) {
    const user = normalizeAuthUser(rawUser);
    return {
        user,
        token: issueJwtForUser(user)
    };
}

function createUsernameBaseFromEmail(email) {
    const localPart = String(email || '').split('@')[0] || '';
    const sanitized = localPart.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!sanitized) return 'whalio';
    return sanitized.slice(0, 18);
}

async function generateUniqueUsername(baseUsername) {
    const base = String(baseUsername || '').trim().toLowerCase() || 'whalio';
    const existingBase = await User.exists({ username: base });
    if (!existingBase) return base;

    for (let i = 0; i < 30; i += 1) {
        const suffix = Math.floor(100 + Math.random() * 900);
        const candidate = `${base}${suffix}`.slice(0, 24);
        const exists = await User.exists({ username: candidate });
        if (!exists) return candidate;
    }

    return `whalio${Date.now().toString().slice(-6)}`;
}

async function generateUniqueWhaleID() {
    for (let i = 0; i < 40; i += 1) {
        const randomPart = String(Math.floor(10000 + Math.random() * 90000));
        const candidate = `WHALIO-${randomPart}`;
        const exists = await User.exists({ whaleID: candidate });
        if (!exists) return candidate;
    }

    return `WHALIO-${Date.now().toString().slice(-5)}`;
}

async function findOrCreateGoogleUser(googleProfile) {
    const googleId = String(googleProfile?.id || '').trim();
    const email = String(googleProfile?.emails?.[0]?.value || '').trim().toLowerCase();
    const fullName = String(
        googleProfile?.displayName ||
        googleProfile?.name?.givenName ||
        googleProfile?.name?.familyName ||
        'Whalio User'
    ).trim();
    const avatar = String(googleProfile?.photos?.[0]?.value || '/img/avt.png').trim();

    if (!googleId) {
        throw new Error('Google profile missing id');
    }
    if (!email) {
        throw new Error('Google profile missing email');
    }

    const existingByGoogleId = await User.findOne({ googleId });
    if (existingByGoogleId) {
        if (!existingByGoogleId.whaleID) {
            existingByGoogleId.whaleID = await generateUniqueWhaleID();
            await existingByGoogleId.save();
        }
        return existingByGoogleId;
    }

    // Nếu email đã tồn tại từ tài khoản local thì liên kết Google vào tài khoản đó
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
        existingByEmail.googleId = googleId;
        if (avatar) existingByEmail.avatar = avatar;
        if (fullName) existingByEmail.fullName = fullName;
        if (!existingByEmail.whaleID) {
            existingByEmail.whaleID = await generateUniqueWhaleID();
        }
        existingByEmail.updatedAt = new Date();
        await existingByEmail.save();
        return existingByEmail;
    }

    const username = await generateUniqueUsername(createUsernameBaseFromEmail(email));
    const whaleID = await generateUniqueWhaleID();
    const generatedPassword = await bcrypt.hash(
        `google_oauth_${googleId}_${Date.now()}`,
        BCRYPT_SALT_ROUNDS
    );

    const newUser = new User({
        username,
        password: generatedPassword,
        fullName: fullName || username,
        email,
        avatar: avatar || '/img/avt.png',
        googleId,
        whaleID,
        role: 'member',
        savedDocs: []
    });
    await newUser.save();

    return newUser;
}

function buildGoogleSuccessRedirect(user) {
    const authPayload = buildAuthResponsePayload(user);

    const encodedUser = encodeURIComponent(
        Buffer.from(JSON.stringify(authPayload.user), 'utf8').toString('base64')
    );
    const encodedToken = encodeURIComponent(authPayload.token);
    return `${WHALIO_WEB_BASE_URL}/?${GOOGLE_OAUTH_STATE_PARAM}=success&user=${encodedUser}&token=${encodedToken}`;
}

const googleFailureRedirect = `${WHALIO_WEB_BASE_URL}/?${GOOGLE_OAUTH_STATE_PARAM}=failed`;

if (isGoogleOAuthEnabled) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const user = await findOrCreateGoogleUser(profile);
                    if (!user || !user._id) {
                        return done(new Error('Google OAuth user mapping failed: missing user _id'), null);
                    }
                    return done(null, user);
                } catch (error) {
                    console.error('GoogleStrategy verify callback error:', error.message);
                    return done(error, null);
                }
            }
        )
    );
    console.log(`✅ Google OAuth configured. Callback URL: ${GOOGLE_CALLBACK_URL}`);
} else {
    console.warn('⚠️ Google OAuth disabled. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
}

async function ensurePerformanceIndexes() {
    const startedAt = Date.now();
    const indexTasks = [
        { model: StudySession, fields: { username: 1, date: -1 }, name: 'study_session_username_date_idx' },
        { model: Event, fields: { username: 1, date: 1 }, name: 'event_username_date_idx' },
        { model: Document, fields: { uploaderUsername: 1, createdAt: -1 }, name: 'document_uploader_createdAt_idx' },
        { model: UserActivityLog, fields: { action: 1, createdAt: -1 }, name: 'user_activity_action_createdAt_idx' }
    ];

    const results = await Promise.all(indexTasks.map(async ({ model, fields, name }) => {
        const indexName = await model.collection.createIndex(fields, { name });
        return { modelName: model.modelName, indexName };
    }));

    const durationMs = Date.now() - startedAt;
    console.log(`⚙️  Performance indexes ensured (${results.length}) in ${durationMs}ms`);
    return results;
}

// Auto-seed on startup
async function seedInitialData() {
    console.log('\n🔄 AUTO-SEED: Running automatic database seeding on startup...');
    await ensurePerformanceIndexes();
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

    // Lưu vào DB để truy vết dài hạn trên admin dashboard
    if (mongoose.connection.readyState === 1) {
        void SystemEvent.create({
            type: 'security',
            severity: 'warning',
            title: 'Admin access denied',
            description: `${reason} - ${req.method} ${endpoint}`,
            details: {
                reason,
                method: req.method,
                endpoint,
                ip,
                user: username,
                userId,
                userAgent: req.get('User-Agent') || ''
            },
            performedBy: username
        }).catch((err) => {
            console.error('❌ Failed to persist denied admin access event:', err.message);
        });

        const activityUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
        if (activityUserId && username && username !== 'anonymous') {
            void UserActivityLog.create({
                userId: activityUserId,
                username,
                action: 'admin_access_denied',
                description: `Truy cập Admin API bị từ chối: ${reason}`,
                ip,
                device: 'Admin API',
                userAgent: req.get('User-Agent') || '',
                metadata: {
                    reason,
                    method: req.method,
                    endpoint
                }
            }).catch((err) => {
                console.error('❌ Failed to persist denied admin access user activity:', err.message);
            });
        }
    }
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
                pattern.lastIndex = 0;
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

// 🛡️ Chỉ bật cho route nhạy cảm để giảm overhead toàn cục
app.use('/api/', runOnHeavySecurityRoutes(blockDangerousPayload));
console.log('🛡️  Enterprise dangerous payload blocker enabled for sensitive APIs');

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

// ==================== TEMP DISK STORAGE FOR CHAT/DOCUMENT ====================
// Lưu file vào thư mục tạm thay vì RAM để tránh memory spike khi upload file lớn.
const tempDiskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_TMP_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '';
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        cb(null, `${uniqueSuffix}${safeExt}`);
    }
});

async function safeRemoveTempFile(filePath) {
    if (!filePath) return;
    try {
        await fsp.unlink(filePath);
    } catch (err) {
        if (err?.code !== 'ENOENT') {
            console.warn(`⚠️ Failed to remove temp file "${filePath}": ${err.message}`);
        }
    }
}

function parseFileInWorker({ filePath, mimetype, fileExt, filename, fileSizeKB }) {
    return new Promise((resolve, reject) => {
        let worker;
        try {
            worker = new Worker(path.join(__dirname, 'file-parser-worker.js'), {
                workerData: {
                    filePath,
                    mimetype: String(mimetype || ''),
                    fileExt: String(fileExt || '').toLowerCase(),
                    filename: String(filename || ''),
                    fileSizeKB: String(fileSizeKB || '')
                }
            });
        } catch (error) {
            reject(error);
            return;
        }
        let settled = false;
        let timeout = null;

        const finalize = (handler, value) => {
            if (settled) return;
            settled = true;
            if (timeout) clearTimeout(timeout);
            handler(value);
        };

        timeout = setTimeout(() => {
            worker.terminate().catch(() => {});
            finalize(reject, new Error(`Worker parse timeout after ${CHAT_FILE_PARSE_WORKER_TIMEOUT_MS}ms`));
        }, CHAT_FILE_PARSE_WORKER_TIMEOUT_MS);

        worker.on('message', (payload) => {
            if (!payload || typeof payload !== 'object') {
                return finalize(reject, new Error('Worker returned invalid payload'));
            }
            if (payload.error) {
                return finalize(reject, new Error(payload.error));
            }
            finalize(resolve, payload);
        });

        worker.on('error', (error) => finalize(reject, error));
        worker.on('exit', (code) => {
            if (code !== 0) {
                finalize(reject, new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

function enqueueActivityLog(task, label = 'activity') {
    setImmediate(() => {
        activityLogQueue.add(task).catch((err) => {
            console.error(`❌ Async ${label} queue error:`, err);
        });
    });
}

async function createTempUploadFromDataUri(dataUri, fallbackName = 'upload_image.png') {
    const matches = String(dataUri || '').match(/^data:([A-Za-z-+\/.]+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1];
    const base64Payload = matches[2];
    const extByMime = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp'
    };
    const ext = extByMime[mimeType] || path.extname(fallbackName || '') || '.bin';
    const tempPath = path.join(
        UPLOAD_TMP_DIR,
        `datauri-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    );

    const buffer = Buffer.from(base64Payload, 'base64');
    await fsp.writeFile(tempPath, buffer);

    return {
        mimetype: mimeType,
        originalname: fallbackName,
        size: buffer.length,
        path: tempPath,
        filename: path.basename(tempPath)
    };
}

const chatFileUpload = multer({
    storage: tempDiskStorage,
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
        const ext = path.extname(file.originalname).toLowerCase();

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
// 🔥 Sử dụng temporary disk storage + Cloudinary SDK để tránh giữ file lớn trong RAM
// 🛡️ [ENTERPRISE] Áp dụng bảo mật tương tự upload chính
const documentUpload = multer({
    storage: tempDiskStorage,
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

// Helper: Upload file path to Cloudinary with full control
async function uploadToCloudinary(filePath, originalFilename) {
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

    try {
        const result = await cloudinary.uploader.upload(filePath, {
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
async function writeActivityLog(username, action, target, link, type, req = null) {
    try {
        const user = await User.findOne({ username }).select('fullName avatar').lean();
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
            const oldActivities = await Activity.find()
                .select('_id')
                .sort({ timestamp: 1 })
                .limit(activityCount - 100)
                .lean();
            await Activity.deleteMany({ _id: { $in: oldActivities.map(a => a._id) } });
        }

        await writeUserActivityLog({
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

async function writeUserActivityLog({
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

function logActivity(username, action, target, link, type, req = null) {
    enqueueActivityLog(
        () => writeActivityLog(username, action, target, link, type, req),
        'activity'
    );
}

function logUserActivityLog(payload) {
    enqueueActivityLog(
        () => writeUserActivityLog(payload || {}),
        'user-activity'
    );
}

// ==================== LOGIC TÍNH TUẦN CHUẨN (ISO-8601) ====================

/**
 * Tính số tuần trong năm theo chuẩn ISO-8601
 * @param {Date} date - Ngày cần tính
 * @returns {number} - Số tuần (1-53)
 */
function getWeekNumber(date) {
    return getIsoWeekInfo(date).week;
}

function getIsoWeekInfo(inputDate) {
    const date = new Date(inputDate);
    if (Number.isNaN(date.getTime())) {
        return { week: 0, isoYear: 0 };
    }

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Chủ Nhật = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Đặt về Thứ 5 của tuần
    const isoYear = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    return { week, isoYear };
}

function getIsoWeeksInYear(isoYear) {
    const dec28 = new Date(Date.UTC(isoYear, 11, 28));
    return getIsoWeekInfo(dec28).week;
}

/**
 * Lấy mảng các tuần từ startDate đến endDate (O(số tuần), không quét từng ngày)
 * @param {string} startDateStr - Ngày bắt đầu (ISO format)
 * @param {string} endDateStr - Ngày kết thúc (ISO format)
 * @returns {number[]} - Mảng số tuần [1, 2, 3, ...]
 */
function getWeeksBetween(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) {
        console.warn('⚠️ getWeeksBetween: Missing dates, returning []');
        return [];
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        console.warn('⚠️ getWeeksBetween: Invalid date input, returning []');
        return [];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
        console.warn(`⚠️ getWeeksBetween: Start (${start.toISOString()}) > End (${end.toISOString()}), returning []`);
        return [];
    }

    const startInfo = getIsoWeekInfo(start);
    const endInfo = getIsoWeekInfo(end);
    if (!startInfo.week || !endInfo.week) return [];

    const weeks = [];

    if (startInfo.isoYear === endInfo.isoYear) {
        if (startInfo.week <= endInfo.week) {
            for (let week = startInfo.week; week <= endInfo.week; week++) {
                weeks.push(week);
            }
        } else {
            // Rare edge-case cuối năm theo ISO nhưng cùng ISO year.
            const totalWeeks = getIsoWeeksInYear(startInfo.isoYear);
            for (let week = startInfo.week; week <= totalWeeks; week++) {
                weeks.push(week);
            }
            for (let week = 1; week <= endInfo.week; week++) {
                weeks.push(week);
            }
        }
    } else {
        const startYearTotalWeeks = getIsoWeeksInYear(startInfo.isoYear);
        for (let week = startInfo.week; week <= startYearTotalWeeks; week++) {
            weeks.push(week);
        }

        for (let year = startInfo.isoYear + 1; year < endInfo.isoYear; year++) {
            const totalWeeks = getIsoWeeksInYear(year);
            for (let week = 1; week <= totalWeeks; week++) {
                weeks.push(week);
            }
        }

        for (let week = 1; week <= endInfo.week; week++) {
            weeks.push(week);
        }
    }

    const result = Array.from(new Set(weeks)).sort((a, b) => a - b);
    console.log(`✅ getWeeksBetween(${startDateStr.split('T')[0]} → ${endDateStr.split('T')[0]}): [${result.join(', ')}]`);
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
app.get('/auth/google', (req, res, next) => {
    if (!isGoogleOAuthEnabled) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth chưa được cấu hình trên server.'
        });
    }

    return passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
    if (!isGoogleOAuthEnabled) {
        return res.redirect(googleFailureRedirect);
    }

    return passport.authenticate('google', {
        failureRedirect: googleFailureRedirect
    })(req, res, next);
}, (req, res) => {
    try {
        return res.redirect(buildGoogleSuccessRedirect(req.user));
    } catch (error) {
        console.error('Google callback redirect error:', error.message);
        return res.redirect(googleFailureRedirect);
    }
});

app.get('/auth/user', (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Chưa đăng nhập',
            user: null
        });
    }

    const authPayload = buildAuthResponsePayload(req.user);
    return res.json({
        success: true,
        user: authPayload.user,
        token: authPayload.token
    });
});

app.options('/api/admin/impersonate/:userId', cors(corsOptions), (req, res) => {
    return res.sendStatus(200);
});

const startImpersonationHandler = async (req, res) => {
    try {
        const targetUserId = String(req.params.userId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({
                success: false,
                message: 'userId không hợp lệ.'
            });
        }

        const targetUser = await loadUserByIdSafe(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng mục tiêu.'
            });
        }

        const adminId = String(req.session?.adminId || req.user?.userId || '').trim();
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'Không xác định được tài khoản Admin.'
            });
        }

        if (!req.session.passport) {
            req.session.passport = {};
        }

        if (!req.session.adminId) {
            req.session.adminId = adminId;
        }

        req.session.passport.user = String(targetUser._id);
        await saveSession(req);

        return res.json({
            success: true,
            message: 'Bắt đầu nhập vai thành công.',
            impersonating: true,
            adminId,
            user: {
                id: String(targetUser._id),
                name: targetUser.fullName || targetUser.username || 'Whalio User',
                avatar: targetUser.avatar || '/img/avt.png',
                whaleID: targetUser.whaleID || null
            }
        });
    } catch (error) {
        console.error('Impersonate start error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể bắt đầu nhập vai.'
        });
    }
};

app.get('/api/admin/impersonate/:userId', verifyToken, verifyAdmin, startImpersonationHandler);
app.post('/api/admin/impersonate/:userId', verifyToken, verifyAdmin, startImpersonationHandler);

app.post('/api/admin/stop-impersonating', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const adminId = String(req.session?.adminId || req.user?.userId || '').trim();
        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: 'Không xác định được tài khoản Admin để khôi phục.'
            });
        }

        const adminUser = await loadUserByIdSafe(adminId);
        if (!adminUser) {
            delete req.session.adminId;
            await saveSession(req);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản Admin gốc để khôi phục phiên.'
            });
        }

        if (!req.session.passport) {
            req.session.passport = {};
        }

        req.session.passport.user = String(adminUser._id);
        delete req.session.adminId;
        await saveSession(req);

        return res.json({
            success: true,
            message: 'Đã dừng nhập vai và quay lại tài khoản Admin.',
            impersonating: false,
            user: {
                id: String(adminUser._id),
                name: adminUser.fullName || adminUser.username || 'Admin',
                avatar: adminUser.avatar || '/img/avt.png',
                whaleID: adminUser.whaleID || null
            }
        });
    } catch (error) {
        console.error('Impersonate stop error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể dừng nhập vai.'
        });
    }
});

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
        }).select('_id username password fullName email avatar role googleId whaleID savedDocs isLocked status lastIP lastCountry lastCity lastDevice lastLogin totalStudyMinutes totalTargetCredits createdAt updatedAt');
        
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
        const whaleID = await generateUniqueWhaleID();

        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword, // Lưu hash, không lưu plain text
            fullName: normalizedFullName,
            email: normalizedEmail,
            whaleID,
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

        if (Object.prototype.hasOwnProperty.call(updateData, 'totalTargetCredits')) {
            const parsedTargetCredits = Number(updateData.totalTargetCredits);
            if (!Number.isFinite(parsedTargetCredits) || parsedTargetCredits <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Mục tiêu tín chỉ phải là số lớn hơn 0'
                });
            }
            updateData.totalTargetCredits = Math.round(parsedTargetCredits);
        }
        
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

// 4.0 Portal APIs (MongoDB + cache)
app.get('/api/portal', ensureAuthenticated, async (req, res) => {
    try {
        const requestedUsername = resolveUsernameFromRequest(req);
        if (!requestedUsername) {
            console.warn(`⚠️ [Portal] Missing username after authentication. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(200).json({
                success: false,
                authenticated: false,
                data: [],
                message: 'User not found'
            });
        }

        const cachedCategories = getPortalFromCache();
        if (cachedCategories) {
            return res.json({
                success: true,
                authenticated: true,
                data: cachedCategories,
                cached: true
            });
        }

        const portalConfig = await PortalConfig.findOne({ key: 'main' })
            .select('categories updatedAt -_id')
            .lean();
        const categories = normalizePortalCategories(portalConfig?.categories || []);
        setPortalCache(categories);

        return res.json({
            success: true,
            authenticated: true,
            data: categories,
            cached: false
        });
    } catch (error) {
        console.error('Get portal data error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể tải dữ liệu portal'
        });
    }
});

app.post('/api/portal/update', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const categories = normalizePortalCategories(req.body?.categories || []);
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu categories không hợp lệ.'
            });
        }

        const updated = await PortalConfig.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    categories,
                    updatedAt: new Date(),
                    updatedBy: req.user?.username || 'admin'
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
            .select('categories updatedAt updatedBy -_id')
            .lean();

        setPortalCache(updated?.categories || categories);

        return res.json({
            success: true,
            data: updated?.categories || categories,
            updatedAt: updated?.updatedAt || new Date()
        });
    } catch (error) {
        console.error('Update portal data error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật dữ liệu portal'
        });
    }
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

        const user = await User.findOne({ username: normalizedUsername })
            .select('username fullName role')
            .lean();
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

        const user = await User.findOne({ username: normalizedUsername })
            .select('username fullName role')
            .lean();
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

        const user = await User.findOne({ username: normalizedUsername })
            .select('username fullName role')
            .lean();
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

// 4.3 Code Snippet APIs (MongoDB)
const CODE_SNIPPET_TOTAL_SCORE = 10;
const CODE_SNIPPET_DEFAULT_TEST_CASE_COUNT = 5;
const CODE_SNIPPET_MAX_TEST_CASES = Math.min(
    12,
    Math.max(1, parsePositiveInt(process.env.CODE_SNIPPET_MAX_TEST_CASES, CODE_SNIPPET_DEFAULT_TEST_CASE_COUNT))
);

const sanitizeSnippetTestCaseText = (value, limit = 8000) =>
    String(value === undefined || value === null ? '' : value)
        .replace(/\r\n/g, '\n')
        .trim()
        .slice(0, limit);

const roundSnippetScore = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Number(parsed.toFixed(2));
};

const distributeScoreEvenly = (count, totalScore = CODE_SNIPPET_TOTAL_SCORE) => {
    const normalizedCount = Math.max(0, Number(count) || 0);
    if (normalizedCount <= 0) return [];

    const baseScore = roundSnippetScore(totalScore / normalizedCount);
    const scores = Array.from({ length: normalizedCount }, () => baseScore);
    const subtotal = roundSnippetScore(baseScore * Math.max(0, normalizedCount - 1));
    scores[normalizedCount - 1] = roundSnippetScore(totalScore - subtotal);
    return scores;
};

const tryParseJsonCandidate = (rawText) => {
    const candidate = String(rawText || '').trim();
    if (!candidate) return null;
    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
};

const extractAiJsonPayload = (rawText) => {
    const text = String(rawText || '').trim();
    if (!text) return null;

    const directParsed = tryParseJsonCandidate(text);
    if (directParsed) return directParsed;

    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        const fencedParsed = tryParseJsonCandidate(fencedMatch[1]);
        if (fencedParsed) return fencedParsed;
    }

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch?.[0]) {
        const arrayParsed = tryParseJsonCandidate(arrayMatch[0]);
        if (arrayParsed) return arrayParsed;
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
        const objectParsed = tryParseJsonCandidate(objectMatch[0]);
        if (objectParsed) return objectParsed;
    }

    return null;
};

const readExpectedOutputFromRawTestCase = (rawCase) => {
    if (!rawCase || typeof rawCase !== 'object') return undefined;
    const expectedKeys = ['expectedOutput', 'expected', 'output', 'expected_output'];
    for (const key of expectedKeys) {
        if (Object.prototype.hasOwnProperty.call(rawCase, key)) {
            return rawCase[key];
        }
    }
    return undefined;
};

const readInputFromRawTestCase = (rawCase) => {
    if (!rawCase || typeof rawCase !== 'object') return '';
    const inputKeys = ['input', 'stdin', 'in'];
    for (const key of inputKeys) {
        if (Object.prototype.hasOwnProperty.call(rawCase, key)) {
            return rawCase[key];
        }
    }
    return '';
};

const normalizeAiTestCases = (rawCases) => {
    if (!Array.isArray(rawCases) || rawCases.length === 0) return [];

    const normalizedCases = [];
    const uniqueSet = new Set();

    for (const rawCase of rawCases) {
        if (!rawCase || typeof rawCase !== 'object') continue;

        const expectedRaw = readExpectedOutputFromRawTestCase(rawCase);
        if (expectedRaw === undefined || expectedRaw === null) continue;

        const input = sanitizeSnippetTestCaseText(readInputFromRawTestCase(rawCase), 4000);
        const expectedOutput = sanitizeSnippetTestCaseText(expectedRaw, 4000);
        const signature = `${input}__${expectedOutput}`;
        if (uniqueSet.has(signature)) continue;

        uniqueSet.add(signature);
        normalizedCases.push({ input, expectedOutput });
        if (normalizedCases.length >= CODE_SNIPPET_MAX_TEST_CASES) break;
    }

    const distributedScores = distributeScoreEvenly(normalizedCases.length, CODE_SNIPPET_TOTAL_SCORE);
    return normalizedCases.map((item, index) => ({
        ...item,
        score: distributedScores[index] || 0
    }));
};

const generateCodeSnippetTestCases = async ({
    cardTitle,
    subjectName,
    assignmentName,
    assignmentDescription
}) => {
    const normalizedDescription = sanitizeSnippetTestCaseText(assignmentDescription, 12000);
    if (!normalizedDescription) {
        return {
            success: true,
            testCases: [],
            modelUsed: '',
            generated: false
        };
    }

    const prompt = [
        'Bạn là chuyên gia tạo test case cho bài tập lập trình.',
        'Nhiệm vụ:',
        `1) Phân tích đề và tự suy luận logic đúng của bài.`,
        `2) Tạo ${CODE_SNIPPET_DEFAULT_TEST_CASE_COUNT} test case đại diện (bao gồm cả edge case).`,
        '3) Chỉ trả về JSON hợp lệ, không giải thích thêm, không dùng markdown code fence.',
        '',
        'Định dạng JSON bắt buộc:',
        '{"testCases":[{"input":"...","expectedOutput":"..."}]}',
        '',
        'Quy tắc dữ liệu:',
        '- input: chuỗi input gửi vào stdin, có thể rỗng.',
        '- expectedOutput: output mong đợi chính xác (bao gồm xuống dòng nếu cần).',
        '- Không thêm thuộc tính khác ngoài input, expectedOutput.',
        '',
        `Tên card: ${sanitizeSnippetTestCaseText(cardTitle, 200) || '(trống)'}`,
        `Môn học: ${sanitizeSnippetTestCaseText(subjectName, 120) || '(trống)'}`,
        `Tên bài tập: ${sanitizeSnippetTestCaseText(assignmentName, 220) || '(trống)'}`,
        'Nội dung đề bài:',
        normalizedDescription
    ].join('\n');

    const aiResult = await generateAIResponse(prompt);
    if (!aiResult?.success) {
        return {
            success: false,
            message: aiResult?.message || 'Không thể tạo test case bằng AI'
        };
    }

    const parsedPayload = extractAiJsonPayload(aiResult.message || '');
    const rawCases = Array.isArray(parsedPayload)
        ? parsedPayload
        : Array.isArray(parsedPayload?.testCases)
            ? parsedPayload.testCases
            : [];

    const normalizedCases = normalizeAiTestCases(rawCases);
    if (normalizedCases.length === 0) {
        return {
            success: false,
            message: 'AI không trả về test case hợp lệ để lưu bài tập',
            modelUsed: aiResult.model || ''
        };
    }

    return {
        success: true,
        generated: true,
        testCases: normalizedCases,
        modelUsed: aiResult.model || ''
    };
};

app.get('/api/code-snippets', async (req, res) => {
    try {
        const normalizedUsername = String(req.query.username || '').trim();
        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username', snippets: [] });
        }

        const snippets = await CodeSnippet.find({ username: normalizedUsername })
            .select('-__v')
            .sort({ createdAt: -1 })
            .lean();

        const formattedSnippets = snippets.map((item) => ({
            ...item,
            title: String(item.title || item.cardTitle || '').trim(),
            cardTitle: String(item.cardTitle || item.title || '').trim(),
            exerciseName: String(item.exerciseName || item.assignmentName || '').trim(),
            assignmentName: String(item.assignmentName || item.exerciseName || '').trim(),
            formattedDescription: String(item.formattedDescription || item.assignmentDescription || '').trim(),
            assignmentDescription: String(item.assignmentDescription || item.formattedDescription || '').trim(),
            id: item._id.toString()
        }));

        return res.json({ success: true, snippets: formattedSnippets });
    } catch (err) {
        console.error('Get code snippets error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server', snippets: [] });
    }
});

app.post('/api/code-snippets', async (req, res) => {
    try {
        const {
            username,
            title,
            cardTitle,
            subjectName,
            exerciseName,
            assignmentName,
            formattedDescription,
            assignmentDescription,
            code,
            language
        } = req.body || {};

        const normalizedUsername = String(username || '').trim();
        const normalizedTitle = String(title || cardTitle || '').trim();
        const normalizedSubjectName = String(subjectName || '').trim();
        const normalizedExerciseName = String(exerciseName || assignmentName || '').trim();
        const normalizedFormattedDescription = String(
            formattedDescription || assignmentDescription || ''
        ).trim();

        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }
        if (!normalizedTitle) {
            return res.status(400).json({ success: false, message: 'Tên card là bắt buộc' });
        }

        const testCaseResult = await generateCodeSnippetTestCases({
            cardTitle: normalizedTitle,
            subjectName: normalizedSubjectName,
            assignmentName: normalizedExerciseName,
            assignmentDescription: normalizedFormattedDescription
        });
        if (!testCaseResult.success) {
            return res.status(502).json({
                success: false,
                message: testCaseResult.message || 'Không thể tạo test case tự động cho bài tập'
            });
        }

        const now = new Date();
        const snippet = new CodeSnippet({
            username: normalizedUsername,
            title: normalizedTitle,
            cardTitle: normalizedTitle,
            subjectName: normalizedSubjectName,
            exerciseName: normalizedExerciseName,
            assignmentName: normalizedExerciseName,
            formattedDescription: normalizedFormattedDescription,
            assignmentDescription: normalizedFormattedDescription,
            code: String(code || ''),
            language: String(language || 'plaintext').trim() || 'plaintext',
            testCases: testCaseResult.testCases,
            createdAt: now,
            updatedAt: now
        });

        await snippet.save();
        return res.json({
            success: true,
            snippet: {
                ...snippet.toObject(),
                id: snippet._id.toString()
            },
            testCaseGeneration: {
                generated: Boolean(testCaseResult.generated),
                count: Array.isArray(testCaseResult.testCases) ? testCaseResult.testCases.length : 0,
                totalScore: CODE_SNIPPET_TOTAL_SCORE,
                modelUsed: String(testCaseResult.modelUsed || '')
            }
        });
    } catch (err) {
        console.error('Create code snippet error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

const WANDBOX_API_URL =
    String(process.env.WANDBOX_API_URL || 'https://wandbox.org/api/compile.json').trim() ||
    'https://wandbox.org/api/compile.json';
const WANDBOX_LIST_URL =
    String(process.env.WANDBOX_LIST_URL || 'https://wandbox.org/api/list.json').trim() ||
    'https://wandbox.org/api/list.json';
const WANDBOX_TIMEOUT_MS = parsePositiveInt(process.env.WANDBOX_TIMEOUT_MS, 20000);
const WANDBOX_LIST_CACHE_MS = parsePositiveInt(process.env.WANDBOX_LIST_CACHE_MS, 300000);

const sanitizeRunnerText = (value, limit = 20000) => String(value || '').slice(0, limit);

const mapToWandboxLanguage = (language) => {
    const normalized = String(language || '').trim().toLowerCase();
    const map = {
        cpp: 'cpp',
        'c++': 'cpp',
        cxx: 'cpp',
        javascript: 'javascript',
        js: 'javascript',
        typescript: 'typescript',
        ts: 'typescript',
        python: 'python',
        py: 'python',
        java: 'java',
        sql: 'sql'
    };
    return map[normalized] || '';
};

const WANDBOX_LANGUAGE_TO_LABEL = {
    cpp: 'C++',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    sql: 'SQL'
};

const WANDBOX_COMPILER_PREFERENCES = {
    cpp: ['gcc-head', 'clang-head'],
    javascript: ['nodejs-20.17.0', 'nodejs-18.20.4'],
    typescript: ['typescript-5.6.2'],
    python: ['cpython-head', 'cpython-3.13.8', 'cpython-3.12.7'],
    java: ['openjdk-jdk-22+36', 'openjdk-jdk-21+35'],
    sql: ['sqlite-3.46.1', 'sqlite-3.35.5']
};

let wandboxListCache = {
    fetchedAt: 0,
    items: []
};

const normalizeWandboxListItem = (item) => {
    const name = String(item?.name || '').trim();
    const language = String(item?.language || '').trim();
    if (!name || !language) return null;
    return { name, language };
};

const fetchWandboxCompilerList = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && now - wandboxListCache.fetchedAt <= WANDBOX_LIST_CACHE_MS && wandboxListCache.items.length > 0) {
        return {
            success: true,
            status: 200,
            source: 'cache',
            items: wandboxListCache.items
        };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(WANDBOX_TIMEOUT_MS, 15000));

    try {
        const response = await fetch(WANDBOX_LIST_URL, {
            method: 'GET',
            signal: controller.signal
        });

        let body = [];
        try {
            const parsed = await response.json();
            body = Array.isArray(parsed) ? parsed : [];
        } catch {
            body = [];
        }

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                message: `Wandbox list lỗi HTTP ${response.status}`,
                items: []
            };
        }

        const normalizedItems = body
            .map((item) => normalizeWandboxListItem(item))
            .filter(Boolean);

        if (normalizedItems.length === 0) {
            return {
                success: false,
                status: response.status,
                message: 'Wandbox list không trả về compiler hợp lệ',
                items: []
            };
        }

        wandboxListCache = {
            fetchedAt: now,
            items: normalizedItems
        };

        return {
            success: true,
            status: response.status,
            source: 'remote',
            items: normalizedItems
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            message: error?.name === 'AbortError'
                ? `Wandbox list timeout sau ${Math.min(WANDBOX_TIMEOUT_MS, 15000)}ms`
                : String(error?.message || 'Không thể tải danh sách compiler từ Wandbox'),
            items: []
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

const selectWandboxCompiler = async (language) => {
    const normalizedLanguage = mapToWandboxLanguage(language);
    const label = WANDBOX_LANGUAGE_TO_LABEL[normalizedLanguage] || '';
    if (!normalizedLanguage || !label) {
        return {
            success: false,
            status: 400,
            message: 'Ngôn ngữ chưa hỗ trợ chạy qua Wandbox'
        };
    }

    const listResult = await fetchWandboxCompilerList();
    const byLanguage = listResult.success
        ? listResult.items.filter((item) => item.language === label).map((item) => item.name)
        : [];

    const availableCompilers = Array.from(new Set(byLanguage));
    const preferredCompilers = WANDBOX_COMPILER_PREFERENCES[normalizedLanguage] || [];
    const sortedAvailableCompilers = [...availableCompilers].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    let compiler = preferredCompilers.find((name) => availableCompilers.includes(name)) || '';
    if (!compiler && availableCompilers.length > 0) {
        const headCompiler = availableCompilers.find((name) => /-head(?:-[a-z]+)?$/i.test(name));
        compiler = headCompiler || sortedAvailableCompilers[sortedAvailableCompilers.length - 1];
    }
    if (!compiler && preferredCompilers.length > 0) {
        compiler = preferredCompilers[0];
    }

    if (!compiler) {
        return {
            success: false,
            status: 503,
            message: 'Không tìm được compiler phù hợp trên Wandbox'
        };
    }

    return {
        success: true,
        language: normalizedLanguage,
        compiler,
        listSource: listResult.success ? listResult.source : 'fallback',
        listMessage: listResult.success ? '' : String(listResult.message || '').trim()
    };
};

const buildWandboxPayload = async ({ language, code, input }) => {
    const selected = await selectWandboxCompiler(language);
    if (!selected.success) {
        return selected;
    }

    const source = String(code || '');
    const stdin = String(input || '');
    const normalizedLanguage = selected.language;
    let finalCode = source;
    let finalStdin = stdin;

    if (normalizedLanguage === 'java') {
        // Wandbox compiles/runs Java as prog.java/prog by default.
        finalCode = finalCode.replace(/\bpublic\s+class\s+[A-Za-z_]\w*\b/, 'public class prog');
        finalCode = finalCode.replace(/\bclass\s+[A-Za-z_]\w*\b/, 'class prog');
    }

    if (normalizedLanguage === 'sql') {
        // Input box acts as seed SQL, then execute main query/script from editor.
        finalCode = [stdin, source].filter(Boolean).join('\n');
        finalStdin = '';
    }

    return {
        success: true,
        language: normalizedLanguage,
        compiler: selected.compiler,
        listSource: selected.listSource,
        listMessage: selected.listMessage,
        payload: {
            code: finalCode,
            compiler: selected.compiler,
            stdin: finalStdin,
            save: false
        }
    };
};

const executeWandboxRun = async (payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WANDBOX_TIMEOUT_MS);

    try {
        const response = await fetch(WANDBOX_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        let body = null;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok) {
            const message = String(
                body?.message ||
                body?.error ||
                `Wandbox lỗi HTTP ${response.status}`
            ).trim();
            return {
                success: false,
                status: response.status,
                message,
                data: body
            };
        }

        return {
            success: true,
            status: response.status,
            data: body
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            message: error?.name === 'AbortError'
                ? `Wandbox timeout sau ${WANDBOX_TIMEOUT_MS}ms`
                : String(error?.message || 'Không thể kết nối Wandbox')
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

const detectWandboxErrorType = (errorText, hasCompilerError) => {
    if (hasCompilerError) return 'compiler_error';
    if (/(timeout|time limit|timed out|execution timed out|tle|quá lâu)/i.test(String(errorText || ''))) {
        return 'time_limit';
    }
    return 'runtime_error';
};

const checkWandboxHealth = async () => {
    const listResult = await fetchWandboxCompilerList({ force: true });
    const languages = listResult.success
        ? Array.from(new Set(listResult.items.map((item) => item.language))).sort()
        : [];

    return [{
        provider: 'wandbox',
        url: WANDBOX_LIST_URL,
        ok: listResult.success,
        status: listResult.status || 0,
        languages,
        message: listResult.success ? '' : String(listResult.message || 'Không thể kiểm tra trạng thái Wandbox')
    }];
};

app.post('/api/code-snippets/run', async (req, res) => {
    try {
        const language = String(req.body?.language || '').trim().toLowerCase();
        const code = String(req.body?.code || '');
        const input = String(req.body?.input || '');

        if (!language) {
            return res.status(400).json({ success: false, message: 'Thiếu language' });
        }
        if (!code.trim()) {
            return res.status(400).json({ success: false, message: 'Thiếu code để chạy' });
        }

        const payloadResult = await buildWandboxPayload({ language, code, input });
        if (!payloadResult.success) {
            const status = payloadResult.status >= 400 ? payloadResult.status : 400;
            return res.status(status).json({
                success: false,
                message: payloadResult.message || 'Không thể chuẩn bị payload chạy code',
                provider: 'wandbox'
            });
        }

        const runResult = await executeWandboxRun(payloadResult.payload);
        if (!runResult.success) {
            return res.status(runResult.status >= 400 ? runResult.status : 502).json({
                success: false,
                message: runResult.message || 'Không thể chạy code với Wandbox',
                provider: 'wandbox',
                status: runResult.status || 0
            });
        }

        const data = runResult.data || {};
        const status = String(data?.status || '');
        const stdout = sanitizeRunnerText(data?.program_output || '');
        const compilerError = sanitizeRunnerText(data?.compiler_error || '');
        const programError = sanitizeRunnerText(data?.program_error || '');
        const compilerMessage = sanitizeRunnerText(data?.compiler_message || '');
        const programMessage = sanitizeRunnerText(data?.program_message || '');
        const hasCompilerError = Boolean(compilerError.trim());
        const nonZeroStatus = status && status !== '0';
        let errorText = [compilerError, programError].filter(Boolean).join('\n').trim();

        if (!errorText && nonZeroStatus && programMessage && programMessage !== stdout) {
            errorText = programMessage;
        }
        if (!errorText && nonZeroStatus && compilerMessage) {
            errorText = compilerMessage;
        }
        if (!errorText && nonZeroStatus) {
            errorText = `Wandbox trả về status ${status}`;
        }

        if (errorText) {
            const errorType = detectWandboxErrorType(errorText, hasCompilerError);
            return res.json({
                success: false,
                output: stdout || '(Không có output)',
                error: errorText,
                errorType,
                compilerError: hasCompilerError,
                compiler_error: compilerError,
                language: payloadResult.language,
                provider: 'wandbox',
                compiler: payloadResult.compiler,
                signal: String(data?.signal || '')
            });
        }

        return res.json({
            success: true,
            output: stdout || '(Không có output)',
            language: payloadResult.language,
            provider: 'wandbox',
            compiler: payloadResult.compiler,
            signal: String(data?.signal || '')
        });
    } catch (err) {
        console.error('Run code snippet error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi chạy code' });
    }
});

app.get('/api/code-snippets/runner-health', async (req, res) => {
    try {
        const checks = await checkWandboxHealth();
        const online = checks.some((item) => item.ok);

        return res.json({
            success: online,
            online,
            provider: 'wandbox',
            checks
        });
    } catch (err) {
        console.error('Runner health check error:', err);
        return res.status(500).json({
            success: false,
            online: false,
            provider: 'wandbox',
            checks: [],
            message: 'Không thể kiểm tra trạng thái runner'
        });
    }
});

app.post('/api/code-snippets/format-assignment', async (req, res) => {
    try {
        const rawText = String(req.body?.text || '').trim();
        if (!rawText) {
            return res.status(400).json({ success: false, message: 'Thiếu nội dung cần format' });
        }

        const prompt = [
            'Bạn là trợ lý format đề bài lập trình.',
            'Hãy chuyển đoạn văn bản thô sau thành Markdown rõ ràng, dễ đọc.',
            '- Giữ nguyên ý nghĩa gốc, không bịa thêm dữ liệu.',
            '- Dùng heading/list hợp lý.',
            '- Các phần Input/Output/Ví dụ phải ưu tiên biểu diễn bằng bảng Markdown nếu có thể.',
            '- Chỉ trả về nội dung Markdown, không thêm giải thích ngoài lề, không dùng khung ```.',
            '',
            'Nội dung gốc:',
            rawText
        ].join('\n');

        const aiResult = await generateAIResponse(prompt);
        if (!aiResult?.success) {
            return res.status(500).json({
                success: false,
                message: aiResult?.message || 'Không thể format nội dung bằng AI'
            });
        }

        let formattedText = String(aiResult.message || '').trim();
        formattedText = formattedText.replace(/^```(?:markdown|md)?\s*/i, '');
        formattedText = formattedText.replace(/\s*```$/i, '').trim();

        return res.json({
            success: true,
            formattedText,
            modelUsed: aiResult.model || ''
        });
    } catch (err) {
        console.error('Format assignment by AI error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.patch('/api/code-snippets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            username,
            title,
            cardTitle,
            subjectName,
            exerciseName,
            assignmentName,
            formattedDescription,
            assignmentDescription,
            code,
            language
        } = req.body || {};

        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const update = { updatedAt: new Date() };

        const incomingTitle = typeof title === 'string'
            ? title
            : typeof cardTitle === 'string'
                ? cardTitle
                : null;
        if (incomingTitle !== null) {
            const value = incomingTitle.trim();
            if (!value) {
                return res.status(400).json({ success: false, message: 'Tên card không được để trống' });
            }
            update.title = value;
            update.cardTitle = value;
        }

        if (typeof subjectName === 'string') update.subjectName = subjectName.trim();
        const incomingExerciseName = typeof exerciseName === 'string'
            ? exerciseName
            : typeof assignmentName === 'string'
                ? assignmentName
                : null;
        if (incomingExerciseName !== null) {
            const value = incomingExerciseName.trim();
            update.exerciseName = value;
            update.assignmentName = value;
        }

        const incomingDescription = typeof formattedDescription === 'string'
            ? formattedDescription
            : typeof assignmentDescription === 'string'
                ? assignmentDescription
                : null;
        if (incomingDescription !== null) {
            const value = incomingDescription.trim();
            update.formattedDescription = value;
            update.assignmentDescription = value;
        }
        if (typeof code === 'string') update.code = code;
        if (typeof language === 'string') {
            const normalizedLanguage = language.trim();
            update.language = normalizedLanguage || 'plaintext';
        }

        const snippet = await CodeSnippet.findOneAndUpdate(
            { _id: id, username: normalizedUsername },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!snippet) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy card code' });
        }

        return res.json({
            success: true,
            snippet: {
                ...snippet.toObject(),
                id: snippet._id.toString()
            }
        });
    } catch (err) {
        console.error('Update code snippet error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.delete('/api/code-snippets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const normalizedUsername = String(req.query.username || '').trim();

        if (!normalizedUsername) {
            return res.status(400).json({ success: false, message: 'Thiếu username' });
        }

        const deleted = await CodeSnippet.findOneAndDelete({
            _id: id,
            username: normalizedUsername
        });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy card code' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete code snippet error:', err);
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
    // 🔥 SỬ DỤNG TEMP DISK STORAGE + CLOUDINARY SDK TRỰC TIẾP
    documentUpload.single('file')(req, res, (err) => {
        if (err) {
            void safeRemoveTempFile(req.file?.path);
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
    const tempFilePath = req.file?.path;
    try {
        const { name, type, uploader, course, username, visibility } = req.body;
        const file = req.file;

        // CRITICAL: Check if file exists immediately
        if (!file) {
            console.error("UPLOAD ERROR: No file received");
            return res.status(400).json({ success: false, message: "Chưa chọn file!" });
        }

        const decodedOriginalName = decodeFileName(file.originalname);

        // 🔥 Upload trực tiếp từ file tạm (disk) lên Cloudinary để giảm RAM
        const cloudinaryResult = await uploadToCloudinary(file.path, file.originalname);
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
            void logActivity(username || 'Ẩn danh', 'đã tải lên', newDoc.name, `#doc-${newDoc._id}`, 'upload', req);
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
    } finally {
        await safeRemoveTempFile(tempFilePath);
    }
});

app.post('/api/toggle-save-doc', async (req, res) => {
    try {
        const { username, docId } = req.body;
        const user = await User.findOne({ username }).select('savedDocs');

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
        
        const user = await User.findOne({ username }).select('fullName').lean();
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
        void logActivity(username, 'đã xóa tài liệu', doc.name, '#', 'delete', req);

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
        
        const user = await User.findOne({ username }).select('fullName').lean();
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

        const user = await User.findOne({ username, email }).select('password updatedAt');

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

// 6. Stats API (🚀 OPTIMIZED with caching)
const STATS_CACHE_KEY = 'api:stats:global';
const STATS_CACHE_TTL = 30; // 30 giây - stats không cần real-time

app.get('/api/stats', async (req, res) => {
    try {
        // 🚀 Check cache first (tăng throughput 50-100x)
        const cachedStats = runtimeCache.get(STATS_CACHE_KEY);
        if (cachedStats) {
            return res.json({ success: true, stats: deepCloneSafe(cachedStats), cached: true });
        }

        // Cache miss → Query từ DB
        const [totalDocuments, totalUsers, recentDocuments, storageAgg] = await Promise.all([
            Document.countDocuments(),
            User.countDocuments(),
            Document.find()
                .select('name uploader date time type path size downloadCount course visibility createdAt')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            Document.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSize: { $sum: { $ifNull: ['$size', 0] } }
                    }
                }
            ])
        ]);
        const storageUsed = storageAgg[0]?.totalSize || 0;

        const stats = {
            totalDocuments,
            totalUsers,
            recentDocuments,
            storageUsed
        };

        // 🚀 Save to cache
        runtimeCache.set(STATS_CACHE_KEY, deepCloneSafe(stats), STATS_CACHE_TTL);

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 7. Exam APIs
app.get('/api/exams', async (req, res) => {
    try {
        // Data minimization: chỉ trả các field list cần cho UI, không kéo questionBank vào RAM
        const exams = await Exam.find()
            .select('examId title subject questions time image createdBy createdAt')
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
        // Chỉ endpoint chi tiết này mới lấy questionBank để bắt đầu làm bài.
        const exam = await Exam.findOne({ examId: id })
            .select('examId title subject questions time image createdBy questionBank createdAt')
            .lean();

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
        const user = await User.findOne({ username }).select('role').lean();
        if (!user) {
            return res.status(403).json({ success: false, message: "⛔ Người dùng không tồn tại!" });
        }

        const exam = await Exam.findOne({ examId }).select('createdBy').lean();
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
        void logActivity(username, 'đã đăng bài viết', 'trong Cộng đồng', `#post-${newPost._id}`, 'post', req);

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
        void logActivity(username, 'đã bình luận', `vào bài viết của ${post.author}`, `#post-${postId}`, 'comment', req);

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

function buildStudyStatsForLastSevenDays(sessions = []) {
    const stats = {};

    // Tạo khung 7 ngày (để ngày nào không học vẫn hiện 0)
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        stats[key] = 0;
    }

    // Cộng dồn thời gian
    sessions.forEach((session) => {
        const key = new Date(session.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (stats[key] !== undefined) {
            stats[key] += Number(session.duration) || 0;
        }
    });

    const chartData = Object.keys(stats).map((date) => ({
        name: date,
        minutes: stats[date]
    }));
    const totalMinutes = chartData.reduce((sum, day) => sum + (Number(day.minutes) || 0), 0);

    return { chartData, totalMinutes };
}

async function getStudyStatsPayload(username) {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
        return { chartData: [], totalMinutes: 0, cached: false };
    }

    const cachedStats = getStudyStatsFromCache(normalizedUsername);
    if (cachedStats) {
        return {
            chartData: Array.isArray(cachedStats.chartData) ? cachedStats.chartData : [],
            totalMinutes: Number(cachedStats.totalMinutes) || 0,
            cached: true
        };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await StudySession.find({
        username: normalizedUsername,
        date: { $gte: sevenDaysAgo }
    })
        .select('duration date')
        .sort({ date: 1 })
        .lean();

    const computed = buildStudyStatsForLastSevenDays(sessions);
    setStudyStatsCache(normalizedUsername, computed);
    return {
        chartData: computed.chartData,
        totalMinutes: computed.totalMinutes,
        cached: false
    };
}

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
        invalidateUserDashboardBatchCache(username);
        invalidateStudyStatsCache(username);
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

        const studyStats = await getStudyStatsPayload(username);
        res.json({ success: true, data: studyStats.chartData, cached: studyStats.cached });
    } catch (err) {
        console.error('Get study stats error:', err);
        res.status(500).json({ success: false });
    }
});

// User dashboard batch (GPA + study stats + upcoming events)
app.get('/api/user/dashboard-batch', verifyToken, async (req, res) => {
    try {
        const username = String(req.query.username || '').trim();
        if (!username) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        const requesterUsername = String(req.user?.username || '').trim();
        const requesterRole = String(req.user?.role || '').trim();
        if (!requesterUsername || (requesterUsername !== username && requesterRole !== 'admin')) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const cachedPayload = getUserDashboardBatchFromCache(username);
        if (cachedPayload) {
            return res.json({
                success: true,
                cached: true,
                data: cachedPayload
            });
        }

        const now = new Date();
        const [gpaData, studyStats, upcomingEvents] = await Promise.all([
            GpaModel.findOne({ username })
                .select('semesters targetGpa updatedAt')
                .lean(),
            getStudyStatsPayload(username),
            Event.find({
                username,
                date: { $gte: now }
            })
                .select('-__v')
                .sort({ date: 1 })
                .lean()
        ]);

        const payload = {
            gpa: {
                semesters: Array.isArray(gpaData?.semesters) ? gpaData.semesters : [],
                targetGpa: String(gpaData?.targetGpa || '')
            },
            study: {
                chartData: Array.isArray(studyStats?.chartData) ? studyStats.chartData : [],
                totalMinutes: Number(studyStats?.totalMinutes) || 0
            },
            events: Array.isArray(upcomingEvents) ? upcomingEvents : []
        };

        setUserDashboardBatchCache(username, payload);

        return res.json({
            success: true,
            cached: false,
            data: payload
        });
    } catch (err) {
        console.error('Get user dashboard batch error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
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
app.post('/api/timetable', ensureAuthenticated, async (req, res) => {
    try {
        const { subject, room, campus, day, session, startPeriod, numPeriods, timeRange, startDate, endDate, dateRangeDisplay, teacher, notes } = req.body;
        const username = resolveUsernameFromRequest(req);

        if (!username) {
            console.warn(`⚠️ [Timetable] Missing username. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: '❌ Missing username' });
        }

        if (!subject || !room || !day || !session || !startPeriod || !numPeriods) {
            return res.json({ success: false, message: '❌ Thiếu thông tin bắt buộc' });
        }

        const user = req.user || await User.findOne({ username }).select('username').lean();
        if (!user) {
            console.warn(`⚠️ [Timetable] User not found for username=${username}. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: '❌ Người dùng không tồn tại' });
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

app.get('/api/timetable', ensureAuthenticated, async (req, res) => {
    try {
        const username = resolveUsernameFromRequest(req);

        if (!username) {
            console.warn(`⚠️ [Timetable] Missing username on load. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing username' });
        }

        const user = req.user || await User.findOne({ username }).select('username').lean();
        if (!user) {
            console.warn(`⚠️ [Timetable] User not found on load. username=${username} sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'User not found' });
        }

        // �️ [ENTERPRISE] Data Minimization - loại bỏ __v
        const userClasses = await Timetable.find({ username })
            .select('-__v')
            .lean();

        // Không tính lại weeks khi load để tránh tốn CPU trên request path.
        // weeks được tính và lưu từ lúc create/update.

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
        const username = resolveUsernameFromRequest(req);

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Thiếu classId hoặc username' });
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
        const username = resolveUsernameFromRequest(req);

        if (!username) {
            return res.json({ success: false, message: '❌ Thiếu username' });
        }

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
        const username = resolveUsernameFromRequest(req);

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Thiếu classId hoặc username' });
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
app.post('/api/timetable/update-note', ensureAuthenticated, async (req, res) => {
    try {
        const { classId, action, note } = req.body;
        const username = resolveUsernameFromRequest(req);
        // action: 'add' | 'update' | 'delete' | 'toggle'
        // note: { id, content, deadline, isDone }
        let deadlineLog = null;

        if (!classId || !username || !action) {
            console.warn(`⚠️ [Timetable] update-note missing fields. username=${username || 'none'} sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: '❌ Thiếu thông tin bắt buộc' });
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
            void logUserActivityLog({
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
app.get('/api/events', ensureAuthenticated, async (req, res) => {
    try {
        const username = resolveUsernameFromRequest(req);

        if (!username) {
            console.warn(`⚠️ [Events] Missing username. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Username is required' });
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
app.get('/api/deadline-tags', ensureAuthenticated, async (req, res) => {
    try {
        const username = resolveUsernameFromRequest(req);
        if (!username) {
            console.warn(`⚠️ [DeadlineTags] Missing username. sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Username is required' });
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
app.post('/api/deadline-tags', ensureAuthenticated, async (req, res) => {
    try {
        const { name } = req.body;
        const username = resolveUsernameFromRequest(req);
        if (!username || !name) {
            console.warn(`⚠️ [DeadlineTags] create missing fields. username=${username || 'none'} sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing required fields' });
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

            void logUserActivityLog({
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
app.delete('/api/deadline-tags', ensureAuthenticated, async (req, res) => {
    try {
        const { name } = req.body;
        const username = resolveUsernameFromRequest(req);
        if (!username || !name) {
            console.warn(`⚠️ [DeadlineTags] delete missing fields. username=${username || 'none'} sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing required fields' });
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
            void logUserActivityLog({
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
app.post('/api/events', ensureAuthenticated, async (req, res) => {
    try {
        const { title, date, type, description, deadlineTag } = req.body;
        const username = resolveUsernameFromRequest(req);

        if (!username || !title || !date) {
            console.warn(`⚠️ [Events] create missing fields. username=${username || 'none'} sessionUserId=${req.session?.passport?.user || 'none'}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing required fields' });
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
        invalidateUserDashboardBatchCache(username);
        void logUserActivityLog({
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
app.delete('/api/events/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const username = resolveUsernameFromRequest(req);

        if (!username) {
            console.warn(`⚠️ [Events] delete missing username. sessionUserId=${req.session?.passport?.user || 'none'} eventId=${id}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Username is required' });
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
        invalidateUserDashboardBatchCache(username);
        void logUserActivityLog({
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
app.put('/api/events/:id', ensureAuthenticated, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === 'toggle') {
            console.log('[Events/:id] Forwarding to /api/events/toggle');
            return next();
        }
        const { title, date, type, description, deadlineTag } = req.body;
        const username = resolveUsernameFromRequest(req);

        if (!username || !title || !date) {
            console.warn(`⚠️ [Events] update missing fields. username=${username || 'none'} sessionUserId=${req.session?.passport?.user || 'none'} eventId=${id}`);
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing required fields' });
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
        invalidateUserDashboardBatchCache(username);
        void logUserActivityLog({
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
app.put('/api/events/toggle', ensureAuthenticated, async (req, res) => {
    try {
        const { id, isDone } = req.body;
        const normalizedEventId = normalizeObjectIdInput(id);
        const username = resolveUsernameFromRequest(req);
        
        console.log('[Toggle] Request received:', { id: normalizedEventId || id, username, isDone });

        if (!normalizedEventId || !username) {
            console.log('[Toggle] Missing required fields');
            return res.status(401).json({ success: false, authenticated: false, message: 'Missing required fields' });
        }

        const event = await Event.findById(normalizedEventId);
        if (!event) {
            console.log('[Toggle] Event not found:', normalizedEventId);
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
        invalidateUserDashboardBatchCache(username);
        void logUserActivityLog({
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
            id: normalizedEventId, 
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
        invalidateUserDashboardBatchCache(username);

        res.json({ success: true, message: 'Đã lưu bảng điểm!' });
    } catch (err) {
        console.error('Save GPA error:', err);
        res.status(500).json({ success: false, message: 'Lỗi lưu dữ liệu' });
    }
});

// POST /api/chat - Chat with Whalio AI (Hỗ trợ Multimodal: Text + Image + Files + Session History)
// Sử dụng multipart/form-data thay vì JSON để hỗ trợ upload ảnh/file
// Field name phải là 'image' để khớp với frontend FormData
async function processChat(req, res) {
    let tempChatFilePath = req.file?.path || '';
    try {
        if (!req.file && req.body.image && req.body.image.startsWith('data:')) {
            const tempDataUriFile = await createTempUploadFromDataUri(req.body.image, 'upload_image.png');
            if (tempDataUriFile) {
                req.file = tempDataUriFile;
                tempChatFilePath = tempDataUriFile.path;
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

        // ==================== BUILD COMPACT GEMINI HISTORY ====================
        // Giới hạn số lượng + độ dài context để giảm peak RAM khi serialize JSON.
        const recentMessages = session.messages.slice(-CHAT_CONTEXT_MAX_MESSAGES);
        const geminiHistory = [];
        let remainingChars = CHAT_CONTEXT_MAX_TOTAL_CHARS;

        for (const msg of recentMessages) {
            if (remainingChars <= 0) break;
            const normalizedText = String(msg?.content || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (!normalizedText) continue;

            const clippedPerMessage = normalizedText.length > CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE
                ? `${normalizedText.slice(0, CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE)}...`
                : normalizedText;

            const finalText = clippedPerMessage.length > remainingChars
                ? `${clippedPerMessage.slice(0, Math.max(remainingChars - 3, 0))}...`
                : clippedPerMessage;

            if (!finalText) break;

            geminiHistory.push({
                role: msg.role,
                parts: [{ text: finalText }]
            });
            remainingChars -= finalText.length;
        }

        if (session.messages.length > CHAT_CONTEXT_MAX_MESSAGES) {
            console.log(`📊 Session has ${session.messages.length} messages, compacting to last ${CHAT_CONTEXT_MAX_MESSAGES}`);
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
            const filePath = req.file.path;

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
                    const base64Data = await fsp.readFile(filePath, { encoding: 'base64' });
                    contentParts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimetype
                        }
                    });
                }
                // ==================== XỬ LÝ PDF / WORD / EXCEL BẰNG WORKER THREAD ====================
                else if (
                    mimetype === 'application/pdf' ||
                    fileExt === '.pdf' ||
                    mimetype === 'application/msword' ||
                    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    fileExt === '.doc' ||
                    fileExt === '.docx' ||
                    mimetype.includes('spreadsheet') ||
                    mimetype.includes('excel') ||
                    fileExt === '.xlsx' ||
                    fileExt === '.xls'
                ) {
                    const parserLabel = (fileExt === '.pdf' || mimetype === 'application/pdf')
                        ? 'PDF'
                        : ((fileExt === '.doc' || fileExt === '.docx' || mimetype.includes('word')) ? 'Word' : 'Excel');
                    console.log(`   ⚙️ Đang parse ${parserLabel} bằng worker thread...`);

                    const workerResult = await parseFileInWorker({
                        filePath,
                        mimetype,
                        fileExt,
                        filename,
                        fileSizeKB
                    });

                    fileTypeIcon = workerResult.fileTypeIcon || fileTypeIcon;
                    extractedContent = String(workerResult.extractedContent || '');
                    console.log(`   ✅ Worker parse thành công: ${extractedContent.length} ký tự`);
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
                    extractedContent = await fsp.readFile(filePath, 'utf-8');
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
        const finalMessageParts = [];
        if (geminiHistory.length > 0) {
            const contextLines = geminiHistory.map((msg) => {
                const role = msg.role === 'user' ? '👤 User' : '🤖 Whalio';
                const content = msg.parts?.[0]?.text || '';
                return `${role}: ${content}`;
            });
            finalMessageParts.push('--- Lịch sử cuộc trò chuyện (đã nén để tiết kiệm RAM) ---');
            finalMessageParts.push(contextLines.join('\n'));
            finalMessageParts.push('--- Tin nhắn hiện tại ---');
        }

        // Thêm tin nhắn hiện tại (có thể là text + nội dung file đã extract)
        if (typeof contentParts[0] === 'string') {
            finalMessageParts.push(contentParts[0]);
        } else if (contentParts[0]?.text) {
            finalMessageParts.push(contentParts[0].text);
        }
        const finalMessage = finalMessageParts.join('\n');

        // Nếu có ảnh trong contentParts, xử lý riêng
        let hasImageData = false;
        if (contentParts.length > 1 && contentParts[1]?.inlineData) {
            // Với ảnh, ta cần fallback về Gemini trực tiếp (vì DeepSeek chưa hỗ trợ multimodal tốt)
            hasImageData = true;
            console.log('🖼️ Phát hiện ảnh - sẽ sử dụng Gemini trực tiếp (multimodal)');
        }

        let aiResponseText;
        let modelUsed = 'Unknown';
        const canUseAiResponseCache = (
            !hasImageData &&
            !hasAttachment &&
            geminiHistory.length === 0 &&
            finalMessage.length > 0 &&
            finalMessage.length <= CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS
        );
        const aiResponseCacheKey = canUseAiResponseCache
            ? buildChatResponseCacheKey(finalMessage)
            : '';
        let cachedAiResponse = null;

        if (aiResponseCacheKey) {
            cachedAiResponse = await getChatResponseFromCache(aiResponseCacheKey);
            if (cachedAiResponse?.message) {
                aiResponseText = String(cachedAiResponse.message);
                modelUsed = String(cachedAiResponse.model || 'AI') + ' (Cached)';
                console.log(`⚡ Chat response cache hit: ${aiResponseCacheKey.slice(0, 24)}...`);
            }
        }

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
        } else if (!cachedAiResponse?.message) {
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

            if (aiResponseCacheKey && aiResponseText) {
                await setChatResponseToCache(aiResponseCacheKey, {
                    message: aiResponseText,
                    model: modelUsed,
                    cachedAt: new Date().toISOString()
                });
                console.log(`🧠 Chat response cached: ${aiResponseCacheKey.slice(0, 24)}...`);
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

        if (res.headersSent || res.writableEnded) {
            return;
        }

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
    } finally {
        await safeRemoveTempFile(tempChatFilePath);
    }
}

app.post('/api/chat', chatFileUpload.single('image'), (req, res) => {
    const totalQueuedJobs = chatQueue.size + chatQueue.pending;
    if (totalQueuedJobs >= CHAT_QUEUE_MAX_PENDING) {
        void safeRemoveTempFile(req.file?.path);
        return res.status(503).json({
            success: false,
            message: 'Hệ thống đang quá tải, vui lòng thử lại sau.'
        });
    }

    chatQueue.add(async () => {
        if (req.aborted || res.writableEnded) {
            await safeRemoveTempFile(req.file?.path);
            return;
        }
        await processChat(req, res);
    })
        .catch((err) => {
            console.error('Chat queue error:', err);
            void safeRemoveTempFile(req.file?.path);
            if (!res.headersSent && !res.writableEnded) {
                res.status(503).json({
                    success: false,
                    message: 'Hệ thống đang quá tải, vui lòng thử lại sau.'
                });
            }
        });
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

// API 404 fallback: luôn trả JSON thay vì trang HTML mặc định
app.use('/api', (req, res) => {
    return res.status(404).json({ error: 'Not Found' });
});

// ==================== SERVER START ====================
// Thêm cái '0.0.0.0' vào vị trí thứ 2
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 API ready at http://localhost:${PORT}`);
});

// Update Gemini version fix
