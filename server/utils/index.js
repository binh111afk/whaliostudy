const path = require('path');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const config = require('../config');

// ==================== DEEP CLONE ====================
const deepCloneSafe = (value) => {
    if (value === null || value === undefined) return value;

    if (typeof global.structuredClone === 'function') {
        try {
            return global.structuredClone(value);
        } catch (error) {
            // Fallback
        }
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        return value;
    }
};

// ==================== CACHE SETUP ====================
const runtimeCache = new NodeCache({
    stdTTL: config.PORTAL_CACHE_TTL_SECONDS,
    checkperiod: Math.max(30, Math.floor(config.PORTAL_CACHE_TTL_SECONDS / 2)),
    useClones: false
});

const userDashboardBatchCache = new NodeCache({
    stdTTL: config.USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(config.USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS / 2)),
    useClones: false
});

const studyStatsCache = new NodeCache({
    stdTTL: config.STUDY_STATS_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(config.STUDY_STATS_CACHE_TTL_SECONDS / 2)),
    useClones: false
});

const chatResponseCache = new NodeCache({
    stdTTL: config.CHAT_RESPONSE_CACHE_TTL_SECONDS,
    checkperiod: Math.max(10, Math.floor(config.CHAT_RESPONSE_CACHE_TTL_SECONDS / 2)),
    useClones: false
});

// ==================== USER DASHBOARD BATCH CACHE ====================
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
    userDashboardBatchCache.set(cacheKey, deepCloneSafe(payload), config.USER_DASHBOARD_BATCH_CACHE_TTL_SECONDS);
}

function invalidateUserDashboardBatchCache(username) {
    const cacheKey = getUserDashboardBatchCacheKey(username);
    if (!cacheKey) return;
    userDashboardBatchCache.del(cacheKey);
}

// ==================== STUDY STATS CACHE ====================
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
    studyStatsCache.set(cacheKey, deepCloneSafe(payload), config.STUDY_STATS_CACHE_TTL_SECONDS);
}

function invalidateStudyStatsCache(username) {
    const cacheKey = getStudyStatsCacheKey(username);
    if (!cacheKey) return;
    studyStatsCache.del(cacheKey);
}

// ==================== CHAT RESPONSE CACHE ====================
function buildChatResponseCacheKey(rawPrompt) {
    const normalized = String(rawPrompt || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    if (!normalized) return '';
    const digest = crypto.createHash('sha256').update(normalized).digest('hex');
    return `chat:response:${digest}`;
}

// ==================== PORTAL CACHE ====================
const PORTAL_CACHE_KEY = 'portal:categories';

function getPortalFromCache() {
    const cached = runtimeCache.get(PORTAL_CACHE_KEY);
    return cached ? deepCloneSafe(cached) : null;
}

function setPortalCache(categories) {
    runtimeCache.set(PORTAL_CACHE_KEY, deepCloneSafe(categories), config.PORTAL_CACHE_TTL_SECONDS);
}

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

// ==================== IP HELPER FUNCTIONS ====================
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

// ==================== WEEK CALCULATION (ISO-8601) ====================
function getWeekNumber(date) {
    return getIsoWeekInfo(date).week;
}

function getIsoWeekInfo(inputDate) {
    const date = new Date(inputDate);
    if (Number.isNaN(date.getTime())) {
        return { week: 0, isoYear: 0 };
    }

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const isoYear = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    return { week, isoYear };
}

function getIsoWeeksInYear(isoYear) {
    const dec28 = new Date(Date.UTC(isoYear, 11, 28));
    return getIsoWeekInfo(dec28).week;
}

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
        console.warn(`⚠️ getWeeksBetween: Start > End, returning []`);
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
    return result;
}

// ==================== FILE UTILITIES ====================
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

function getCloudinaryResourceType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    if (imageFormats.includes(ext)) {
        return 'image';
    }
    const videoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    if (videoFormats.includes(ext)) {
        return 'video';
    }
    if (ext === '.pdf') {
        return 'raw';
    }
    return 'raw';
}

// ==================== MEMORY UTILITIES ====================
function toMB(bytes) {
    return Number((Number(bytes || 0) / (1024 * 1024)).toFixed(2));
}

function isExposeGcEnabled() {
    const fromExecArgv = Array.isArray(process.execArgv) && process.execArgv.some((arg) => String(arg).includes('--expose-gc'));
    const fromNodeOptions = String(process.env.NODE_OPTIONS || '').includes('--expose-gc');
    return fromExecArgv || fromNodeOptions;
}

// ==================== STUDY STATS BUILDER ====================
function buildStudyStatsForLastSevenDays(sessions = []) {
    const stats = {};

    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        stats[key] = 0;
    }

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

module.exports = {
    // Deep clone
    deepCloneSafe,
    
    // Caches
    runtimeCache,
    userDashboardBatchCache,
    studyStatsCache,
    chatResponseCache,
    
    // User dashboard batch cache
    getUserDashboardBatchCacheKey,
    getUserDashboardBatchFromCache,
    setUserDashboardBatchCache,
    invalidateUserDashboardBatchCache,
    
    // Study stats cache
    normalizeCacheUsername,
    getStudyStatsCacheKey,
    getStudyStatsFromCache,
    setStudyStatsCache,
    invalidateStudyStatsCache,
    
    // Chat response cache
    buildChatResponseCacheKey,
    
    // Portal cache
    PORTAL_CACHE_KEY,
    getPortalFromCache,
    setPortalCache,
    normalizePortalCategories,
    
    // IP utilities
    normalizeIp,
    isPrivateIp,
    extractClientIP,
    getGeoLocationFromIP,
    parseDeviceFromUA,
    
    // Week utilities
    getWeekNumber,
    getIsoWeekInfo,
    getIsoWeeksInYear,
    getWeeksBetween,
    
    // File utilities
    decodeFileName,
    normalizeFileName,
    getCloudinaryResourceType,
    
    // Memory utilities
    toMB,
    isExposeGcEnabled,
    
    // Study stats
    buildStudyStatsForLastSevenDays
};
