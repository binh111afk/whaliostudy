const mongoose = require('mongoose');

// ==================== User Schema ====================
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

// ==================== Study Session Schema ====================
const studySessionSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
studySessionSchema.index({ username: 1, date: -1 });

// ==================== Study Task Schema ====================
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

// ==================== GPA Schema ====================
const gpaSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    targetGpa: { type: String, default: "" },
    semesters: [{
        id: Number,
        name: String,
        isExpanded: { type: Boolean, default: true },
        subjects: [{
            id: Number,
            name: String,
            credits: Number,
            type: { type: String, default: 'general' },
            components: [{
                id: Number,
                score: String,
                weight: Number
            }]
        }]
    }],
    updatedAt: { type: Date, default: Date.now }
});

// ==================== Document Schema ====================
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

// ==================== Exam Schema ====================
const examSchema = new mongoose.Schema({
    examId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subject: { type: String, default: 'Tự tạo' },
    questions: { type: Number, required: true },
    time: { type: Number, required: true },
    image: { type: String, default: './img/snvvnghen.png.png' },
    createdBy: { type: String, ref: 'User' },
    questionBank: [{ type: mongoose.Schema.Types.Mixed }],
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// ==================== Post Schema ====================
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

// ==================== Activity Schema ====================
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

// ==================== Timetable Schema ====================
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
    teacher: { type: String, default: '' },
    notes: [{
        id: { type: String, required: true },
        content: { type: String, required: true },
        deadline: { type: Date },
        isDone: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    weeks: {
        type: [Number],
        default: [],
        validate: {
            validator: function (arr) {
                return arr.every(w => w >= 1 && w <= 52);
            },
            message: 'Tuần phải từ 1-52'
        }
    },
    startDate: { type: Date },
    endDate: { type: Date },
    dateRangeDisplay: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});
timetableSchema.index({ username: 1, weeks: 1 });

// ==================== Quick Notes Schema ====================
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

// ==================== Announcement Schema ====================
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

// ==================== Portal Config Schema ====================
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

// ==================== Event Schema ====================
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

// ==================== Deadline Tag Schema ====================
const deadlineTagSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    normalizedName: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
});
deadlineTagSchema.index({ username: 1, normalizedName: 1 }, { unique: true });

// ==================== Chat Session Schema ====================
const chatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    },
    username: { type: String, ref: 'User', index: true },
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
        attachmentType: { type: String }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
chatSessionSchema.index({ createdAt: -1 });
chatSessionSchema.index({ username: 1, createdAt: -1 });

// ==================== Admin Panel Schemas ====================
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

const systemSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, default: 'System' }
});

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

const userActivityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true, index: true },
    action: { type: String, required: true },
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

// ==================== Create Models ====================
const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Post = mongoose.model('Post', postSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const QuickNote = mongoose.model('QuickNote', quickNoteSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const PortalConfig = mongoose.model('PortalConfig', portalConfigSchema);
const Event = mongoose.model('Event', eventSchema);
const DeadlineTag = mongoose.model('DeadlineTag', deadlineTagSchema);
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const GpaModel = mongoose.model('Gpa', gpaSchema);
const StudySession = mongoose.model('StudySession', studySessionSchema);
const StudyTask = mongoose.model('StudyTask', studyTaskSchema);

// Admin Models
const BlacklistIP = mongoose.model('BlacklistIP', blacklistIPSchema);
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
const SystemEvent = mongoose.model('SystemEvent', systemEventSchema);
const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);
const BackupRecord = mongoose.model('BackupRecord', backupRecordSchema);

module.exports = {
    User,
    Document,
    Exam,
    Post,
    Activity,
    Timetable,
    QuickNote,
    Announcement,
    PortalConfig,
    Event,
    DeadlineTag,
    ChatSession,
    GpaModel,
    StudySession,
    StudyTask,
    BlacklistIP,
    SystemSettings,
    SystemEvent,
    UserActivityLog,
    BackupRecord
};
