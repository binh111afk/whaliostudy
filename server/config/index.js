const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const os = require('os');

// ==================== HELPER FUNCTIONS ====================
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

// ==================== SERVER CONFIGURATION ====================
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== SECURITY CONSTANTS ====================
const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'whalio_super_secret_key_change_in_production_2024';
const JWT_EXPIRES_IN = '7d';
const SESSION_SECRET = String(
    process.env.SESSION_SECRET || process.env.JWT_SECRET || 'whalio_session_secret_change_me'
).trim();

// ==================== REQUEST LIMITS ====================
const REQUEST_BODY_LIMIT = process.env.EXPRESS_BODY_LIMIT || '1mb';
const API_COMPRESSION_THRESHOLD_BYTES = parsePositiveInt(process.env.API_COMPRESSION_THRESHOLD_BYTES, 1024);

// ==================== REDIS CONFIGURATION ====================
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

// ==================== CHAT CONFIGURATION ====================
const CHAT_CONTEXT_MAX_MESSAGES = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_MESSAGES, 8);
const CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE, 700);
const CHAT_CONTEXT_MAX_TOTAL_CHARS = parsePositiveInt(process.env.CHAT_CONTEXT_MAX_TOTAL_CHARS, 6000);
const CHAT_QUEUE_CONCURRENCY = Math.max(1, parsePositiveInt(process.env.CHAT_QUEUE_CONCURRENCY, 2));
const CHAT_QUEUE_MAX_PENDING = Math.max(1, parsePositiveInt(process.env.CHAT_QUEUE_MAX_PENDING, 50));
const CHAT_FILE_PARSE_WORKER_TIMEOUT_MS = Math.max(1000, parsePositiveInt(process.env.CHAT_FILE_PARSE_WORKER_TIMEOUT_MS, 30000));

// ==================== UPLOAD CONFIGURATION ====================
const SERVER_TMP_DIR = process.env.RENDER_TMP_DIR || os.tmpdir();
const UPLOAD_TMP_DIR = path.join(SERVER_TMP_DIR, 'whalio-uploads');

// ==================== CACHE CONFIGURATION ====================
const PORTAL_CACHE_TTL_SECONDS = parsePositiveInt(process.env.PORTAL_CACHE_TTL_SECONDS, 120);
const USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS = parsePositiveInt(process.env.USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS, 30);
const STUDY_STATS_CACHE_TTL_SECONDS = parsePositiveInt(process.env.STUDY_STATS_CACHE_TTL_SECONDS, 30);
const CHAT_RESPONSE_CACHE_TTL_SECONDS = parsePositiveInt(process.env.CHAT_RESPONSE_CACHE_TTL_SECONDS, 90);
const CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS = parsePositiveInt(process.env.CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS, 2000);

// ==================== PERFORMANCE CONFIGURATION ====================
const SLOW_REQUEST_THRESHOLD_MS = parsePositiveInt(process.env.SLOW_REQUEST_THRESHOLD_MS, 200);
const ACTIVITY_LOG_QUEUE_CONCURRENCY = Math.max(1, parsePositiveInt(process.env.ACTIVITY_LOG_QUEUE_CONCURRENCY, 8));

// ==================== XSS CONFIGURATION ====================
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

// ==================== SECURITY ROUTE CONFIGURATION ====================
const HEAVY_SECURITY_ROUTE_PREFIXES = Array.from(new Set([
    '/api/admin',
    '/api/upload',
    ...String(process.env.HEAVY_SECURITY_ROUTE_PREFIXES || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
]));

// ==================== MEMORY CONFIGURATION ====================
const RENDER_MEMORY_LIMIT_MB = parsePositiveInt(process.env.RENDER_MEMORY_LIMIT_MB, 512);
const EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT = Math.min(
    99,
    Math.max(1, parsePositiveInt(process.env.EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT, 85))
);
const EMERGENCY_HEAP_CHECK_INTERVAL_MS = parsePositiveInt(process.env.EMERGENCY_HEAP_CHECK_INTERVAL_MS, 60 * 1000);
const EMERGENCY_HEAP_THRESHOLD_BYTES =
    Math.floor(RENDER_MEMORY_LIMIT_MB * 1024 * 1024 * (EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT / 100));

// ==================== RATE LIMIT CONFIGURATION ====================
const GENERAL_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const GENERAL_RATE_LIMIT_MAX = parsePositiveInt(process.env.GENERAL_RATE_LIMIT_MAX, 400);
const ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const ADMIN_DEBUG_RATE_LIMIT_MAX = parsePositiveInt(process.env.ADMIN_DEBUG_RATE_LIMIT_MAX, 2000);

// ==================== CORS CONFIGURATION ====================
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

// ==================== GOOGLE OAUTH CONFIGURATION ====================
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

// ==================== ADMIN EMAIL ALLOWLIST ====================
const ADMIN_EMAIL_ALLOWLIST = new Set(
    String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

// ==================== MONGODB CONFIGURATION ====================
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/whalio';
const MONGO_MAX_POOL_SIZE = parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, 20);
const MONGO_MIN_POOL_SIZE = parsePositiveInt(process.env.MONGO_MIN_POOL_SIZE, 2);
const MONGO_SERVER_SELECTION_TIMEOUT_MS = parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000);
const MONGO_SOCKET_TIMEOUT_MS = parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000);

// ==================== CLOUDINARY CONFIGURATION ====================
const CLOUDINARY_CONFIG = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};

// ==================== BLOCKED IP CONFIGURATION ====================
const BLOCKED_IP_FORBIDDEN_MESSAGE = 'Địa chỉ IP của bạn đã bị chặn do vi phạm chính sách bảo mật. Vui lòng liên hệ Admin Whalio để được hỗ trợ.';
const BLOCKED_IP_CACHE_REFRESH_MS = 5 * 60 * 1000;
const BLOCKED_IP_CACHE_MAX_ENTRIES = parsePositiveInt(process.env.BLOCKED_IP_CACHE_MAX_ENTRIES, 50000);

module.exports = {
    // Helpers
    parsePositiveInt,
    parseEnvBoolean,
    
    // Server
    PORT,
    NODE_ENV,
    
    // Security
    BCRYPT_SALT_ROUNDS,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    SESSION_SECRET,
    
    // Request limits
    REQUEST_BODY_LIMIT,
    API_COMPRESSION_THRESHOLD_BYTES,
    
    // Redis
    RATE_LIMIT_REDIS_URL,
    RATE_LIMIT_REDIS_TOKEN,
    SESSION_REDIS_URL,
    SESSION_REDIS_TOKEN,
    SESSION_STORE_PREFIX,
    SESSION_DEFAULT_TTL_SECONDS,
    SESSION_DISABLE_TOUCH,
    RATE_LIMIT_REDIS_FAILURE_BACKOFF_MS,
    RATE_LIMIT_REDIS_ERROR_LOG_INTERVAL_MS,
    RATE_LIMIT_LOCAL_FALLBACK_MAX_KEYS,
    
    // Chat
    CHAT_CONTEXT_MAX_MESSAGES,
    CHAT_CONTEXT_MAX_CHARS_PER_MESSAGE,
    CHAT_CONTEXT_MAX_TOTAL_CHARS,
    CHAT_QUEUE_CONCURRENCY,
    CHAT_QUEUE_MAX_PENDING,
    CHAT_FILE_PARSE_WORKER_TIMEOUT_MS,
    
    // Upload
    SERVER_TMP_DIR,
    UPLOAD_TMP_DIR,
    
    // Cache
    PORTAL_CACHE_TTL_SECONDS,
    USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS,
    STUDY_STATS_CACHE_TTL_SECONDS,
    CHAT_RESPONSE_CACHE_TTL_SECONDS,
    CHAT_RESPONSE_CACHE_MAX_PROMPT_CHARS,
    
    // Performance
    SLOW_REQUEST_THRESHOLD_MS,
    ACTIVITY_LOG_QUEUE_CONCURRENCY,
    
    // XSS
    XSS_SANITIZE_MAX_DEPTH,
    XSS_SANITIZE_MAX_NODES,
    XSS_SANITIZE_MAX_STRING_LENGTH,
    XSS_SKIP_ROUTE_PREFIXES,
    
    // Security routes
    HEAVY_SECURITY_ROUTE_PREFIXES,
    
    // Memory
    RENDER_MEMORY_LIMIT_MB,
    EMERGENCY_HEAP_USAGE_THRESHOLD_PERCENT,
    EMERGENCY_HEAP_CHECK_INTERVAL_MS,
    EMERGENCY_HEAP_THRESHOLD_BYTES,
    
    // Rate limit
    GENERAL_RATE_LIMIT_WINDOW_MS,
    GENERAL_RATE_LIMIT_MAX,
    ADMIN_DEBUG_RATE_LIMIT_WINDOW_MS,
    ADMIN_DEBUG_RATE_LIMIT_MAX,
    ADMIN_RATE_LIMIT_ORIGINS,
    
    // CORS
    ALLOWED_CORS_ORIGINS,
    
    // Google OAuth
    WHALIO_WEB_BASE_URL,
    GOOGLE_CALLBACK_URL,
    GOOGLE_OAUTH_STATE_PARAM,
    isGoogleOAuthEnabled,
    
    // Admin
    ADMIN_EMAIL_ALLOWLIST,
    
    // MongoDB
    MONGO_URI,
    MONGO_MAX_POOL_SIZE,
    MONGO_MIN_POOL_SIZE,
    MONGO_SERVER_SELECTION_TIMEOUT_MS,
    MONGO_SOCKET_TIMEOUT_MS,
    
    // Cloudinary
    CLOUDINARY_CONFIG,
    
    // Blocked IP
    BLOCKED_IP_FORBIDDEN_MESSAGE,
    BLOCKED_IP_CACHE_REFRESH_MS,
    BLOCKED_IP_CACHE_MAX_ENTRIES
};
