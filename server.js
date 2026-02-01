require('dotenv').config();
console.log("🔑 KEY CHECK:", process.env.GEMINI_API_KEY ? "Đã tìm thấy Key!" : "❌ KHÔNG THẤY KEY");
const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
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
        const examsFilePath = path.join(__dirname, 'exams.json');
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
    createdAt: { type: Date, default: Date.now },
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

// Event Schema
const eventSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User', index: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, default: 'exam', enum: ['exam', 'deadline', 'other'] },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Post = mongoose.model('Post', postSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const Event = mongoose.model('Event', eventSchema);

// Auto-seed on startup
async function seedInitialData() {
    console.log('\n🔄 AUTO-SEED: Running automatic database seeding on startup...');
    await seedExamsFromJSON(false);
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        // Xử lý tên file tiếng Việt
        const decodedName = decodeFileName(file.originalname);
        const safeName = normalizeFileName(decodedName);

        // Lưu lại tên gốc
        file.decodedOriginalName = decodedName;

        return {
            folder: 'whalio-documents',
            resource_type: 'auto', // Tự động nhận diện (Ảnh/Video/File)
            public_id: safeName,
        };
    }
});

// 2. Bộ lọc kiểm duyệt (Giữ nguyên cái xịn lúc nãy)
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        console.log('📂 Đang xử lý file:', file.originalname);

        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = [
            '.pdf', '.doc', '.docx', '.txt', '.rtf',
            '.jpg', '.jpeg', '.png', '.gif',
            '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar'
        ];

        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg', 'image/png', 'image/gif',
            'application/octet-stream',
            'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed'
        ];

        // Chỉ cần trúng 1 trong 2 điều kiện là cho qua
        if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
            console.log('   ✅ File hợp lệ! Đang gửi lên Cloudinary...');
            return cb(null, true);
        }

        console.error('   ❌ File bị chặn:', file.originalname);
        cb(new Error(`Định dạng file không hỗ trợ!`), false);
    }
});

// ==================== ACTIVITY LOGGING (MongoDB) ====================
async function logActivity(username, action, target, link, type) {
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
        console.log(`📌 Activity logged: ${username} ${action}`);
    } catch (err) {
        console.error('❌ Log activity error:', err);
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

// ==================== API ROUTES ====================

// Keep-alive route for Render server
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// 1. Authentication APIs
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password }).lean();
        if (user) {
            const { password: _, ...safeUser } = user;
            res.json({ success: true, user: safeUser });
        } else {
            res.status(401).json({ success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullName, email } = req.body;
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ success: false, message: "Email này đã được sử dụng!" });
            }
        }

        const newUser = new User({
            username,
            password,
            fullName,
            email,
            avatar: fullName.trim().charAt(0).toUpperCase(),
            role: "member",
            savedDocs: []
        });
        await newUser.save();

        const safeUser = newUser.toObject();
        delete safeUser.password;
        res.json({ success: true, message: "Đăng ký thành công!", user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 2. Profile APIs
app.post('/api/update-profile', async (req, res) => {
    try {
        const { username, ...updateData } = req.body;
        const user = await User.findOneAndUpdate(
            { username },
            { ...updateData, updatedAt: new Date() },
            { new: true }
        ).lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const { password: _, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPass, newPass } = req.body;
        const user = await User.findOne({ username, password: oldPass });

        if (!user) {
            return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
        }

        user.password = newPass;
        user.updatedAt = new Date();
        await user.save();

        res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 3. Upload Avatar
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { username } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Chưa chọn ảnh!" });
        }

        const avatarPath = file.path; // Cloudinary secure_url
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // TODO: Delete old avatar from Cloudinary if needed
        // Extract public_id from old avatar URL and call cloudinary.uploader.destroy(public_id)

        user.avatar = avatarPath;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;
        res.json({ success: true, avatar: avatarPath, user: safeUser });
    } catch (err) {
        console.error('Upload avatar error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 4. Document APIs
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await Document.find().sort({ createdAt: -1 }).lean();
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

app.post('/api/upload-document', (req, res, next) => {
    // Wrap multer middleware to catch errors and return JSON
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File quá lớn! Kích thước tối đa là 50MB.'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'Lỗi tải file lên'
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

        const decodedOriginalName = file.originalname || file.decodedOriginalName || decodeFileName(file.originalname);

        // Cloudinary provides the secure_url directly
        const cloudinaryUrl = file.path; // This is the secure_url from Cloudinary

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
            await logActivity(username || 'Ẩn danh', 'đã tải lên', newDoc.name, `#doc-${newDoc._id}`, 'upload');
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
        // Enhanced error logging with JSON.stringify
        console.error("UPLOAD ERROR:", JSON.stringify(error, null, 2));
        console.error("UPLOAD ERROR STACK:", error.stack);
        return res.status(500).json({ success: false, message: error.message || "Lỗi server không xác định" });
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

app.post('/api/delete-document', async (req, res) => {
    try {
        const { docId, username } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(403).json({ success: false, message: "Người dùng không tồn tại!" });
        }

        const doc = await Document.findById(docId);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        const isAdmin = user.role === 'admin';
        const isUploader = doc.uploaderUsername === username;
        const isLegacyUploader = !doc.uploaderUsername && doc.uploader === user.fullName;

        if (!isAdmin && !isUploader && !isLegacyUploader) {
            return res.status(403).json({ success: false, message: "⛔ Bạn không có quyền xóa tài liệu của người khác!" });
        }

        // Delete file from Cloudinary
        try {
            // Extract public_id from Cloudinary URL
            // URL format: https://res.cloudinary.com/[cloud]/[type]/upload/[version]/[folder]/[public_id].[ext]
            const urlParts = doc.path.split('/');
            const fileWithExt = urlParts[urlParts.length - 1];
            const publicId = `whalio-documents/${fileWithExt.split('.')[0]}`;
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            console.log(`✅ Deleted file from Cloudinary: ${publicId}`);
        } catch (err) {
            console.warn("Lỗi xóa file từ Cloudinary:", err.message);
        }

        await Document.findByIdAndDelete(docId);
        await logActivity(username, 'đã xóa tài liệu', doc.name, '#', 'delete');

        res.json({ success: true, message: "Đã xóa tài liệu vĩnh viễn!" });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/update-document', async (req, res) => {
    try {
        const { docId, name, course, username, visibility } = req.body;
        const user = await User.findOne({ username });
        const doc = await Document.findById(docId);

        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        const isAdmin = user && user.role === 'admin';
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
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
});

// 5. Password Reset
app.post('/api/reset-password-force', async (req, res) => {
    try {
        const { username, email, newPass } = req.body;
        const user = await User.findOne({ username, email });

        if (!user) {
            return res.status(400).json({ success: false, message: "Tên đăng nhập hoặc Email không chính xác!" });
        }

        user.password = newPass;
        user.updatedAt = new Date();
        await user.save();

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
        const exams = await Exam.find().sort({ createdAt: -1 }).lean();
        const examList = exams.map(e => ({
            id: e.examId,
            title: e.title,
            subject: e.subject,
            questions: e.questions,
            time: e.time,
            image: e.image,
            createdBy: e.createdBy,
            questionBank: e.questionBank || [], // Include question bank
            createdAt: e.createdAt
        }));
        res.json(examList);
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
        const activities = await Activity.find().sort({ timestamp: -1 }).limit(10).lean();
        res.json({ success: true, activities, count: activities.length });
    } catch (err) {
        console.error('Get recent activities error:', err);
        res.json({ success: true, activities: [], count: 0 });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find({ deleted: false }).sort({ createdAt: -1 }).lean();
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
        await logActivity(username, 'đã đăng bài viết', 'trong Cộng đồng', `#post-${newPost._id}`, 'post');

        console.log(`✅ Bài viết mới từ ${username}: ID ${newPost._id}`);
        res.json({ success: true, message: "Đã đăng bài thành công!", post: newPost });
    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
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
        await logActivity(username, 'đã bình luận', `vào bài viết của ${post.author}`, `#post-${postId}`, 'comment');

        res.json({ success: true, comment: comment });
    } catch (err) {
        console.error('Comment post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/posts/save', async (req, res) => {
    try {
        const { postId, username } = req.body;
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

app.post('/api/posts/delete', async (req, res) => {
    try {
        const { postId, username } = req.body;
        const user = await User.findOne({ username });
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const isAdmin = user && user.role === 'admin';
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

app.post('/api/comments/delete', async (req, res) => {
    try {
        const { postId, commentId, username } = req.body;
        const user = await User.findOne({ username });
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        const isAdmin = user && user.role === 'admin';
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
        console.error('Full error:', JSON.stringify(err, null, 2));
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + err.message,
            errorType: err.name
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
        res.json({ success: false, message: 'Lỗi server: ' + err.message });
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

        // 🔥 LẤY TẤT CẢ CLASSES (không lọc tuần ở backend)
        let userClasses = await Timetable.find({ username }).lean();

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

app.post('/api/timetable/delete', async (req, res) => {
    try {
        const { classId, username } = req.body;

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Missing required data' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: '❌ User not found' });
        }

        const classToDelete = await Timetable.findById(classId);
        if (!classToDelete) {
            return res.json({ success: false, message: '❌ Class not found' });
        }

        if (classToDelete.username !== username) {
            return res.json({ success: false, message: '❌ Unauthorized - You can only delete your own classes' });
        }

        await Timetable.findByIdAndDelete(classId);
        console.log(`🗑️ Deleted class ${classId} by ${username}`);
        res.json({ success: true, message: 'Xóa lớp học thành công!' });
    } catch (err) {
        console.error('Error deleting class:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// CRITICAL FIX: DELETE /api/timetable/clear - Clear all timetable data for a user
app.delete('/api/timetable/clear', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.json({ success: false, message: '❌ Username is required' });
        }

        // Delete all timetable entries for this user
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

app.post('/api/timetable/update', async (req, res) => {
    try {
        const { classId, username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange, startDate, endDate, dateRangeDisplay, teacher } = req.body;

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Thiếu thông tin định danh' });
        }

        const classToUpdate = await Timetable.findById(classId);
        if (!classToUpdate) {
            return res.json({ success: false, message: '❌ Không tìm thấy lớp học' });
        }

        if (classToUpdate.username !== username) {
            return res.json({ success: false, message: '❌ Bạn không có quyền sửa lớp này' });
        }

        // 🔥 CRITICAL: Tính lại mảng weeks khi update
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
        classToUpdate.teacher = teacher ? teacher.trim() : ''; // 🔥 MỚI: Cập nhật tên giáo viên
        classToUpdate.weeks = calculatedWeeks; // 🔥 CẬP NHẬT MẢNG TUẦN
        classToUpdate.startDate = startDate || null;
        classToUpdate.endDate = endDate || null;
        classToUpdate.dateRangeDisplay = dateRangeDisplay || '';
        classToUpdate.updatedAt = new Date();

        await classToUpdate.save();
        console.log(`✅ Updated class "${subject}" | Teacher: "${teacher || 'N/A'}" | Weeks: [${calculatedWeeks.join(', ')}]`);
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
        console.error('❌ Update class error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// 🔥 MỚI: API quản lý Notes cho Class
app.post('/api/timetable/update-note', async (req, res) => {
    try {
        const { classId, username, action, note } = req.body;
        // action: 'add' | 'update' | 'delete' | 'toggle'
        // note: { id, content, deadline, isDone }

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
                } else {
                    return res.json({ success: false, message: '❌ Không tìm thấy ghi chú' });
                }
                break;

            case 'delete':
                if (!note || !note.id) {
                    return res.json({ success: false, message: '❌ Thiếu ID ghi chú' });
                }
                const initialLength = classToUpdate.notes.length;
                classToUpdate.notes = classToUpdate.notes.filter(n => n.id !== note.id);
                if (classToUpdate.notes.length < initialLength) {
                    console.log(`🗑️ Deleted note "${note.id}" from "${classToUpdate.subject}"`);
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
                } else {
                    return res.json({ success: false, message: '❌ Không tìm thấy ghi chú' });
                }
                break;

            default:
                return res.json({ success: false, message: '❌ Action không hợp lệ' });
        }

        classToUpdate.updatedAt = new Date();
        await classToUpdate.save();

        res.json({ 
            success: true, 
            message: 'Cập nhật ghi chú thành công!',
            notes: classToUpdate.notes 
        });
    } catch (err) {
        console.error('❌ Update note error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
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

        const events = await Event.find({ username }).sort({ date: 1 });
        console.log(`📅 Fetched ${events.length} events for ${username}`);
        res.json({ success: true, events });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// POST /api/events - Add a new event
app.post('/api/events', async (req, res) => {
    try {
        const { username, title, date, type } = req.body;

        if (!username || !title || !date) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const event = new Event({
            username,
            title: title.trim(),
            date: new Date(date),
            type: type || 'exam'
        });

        await event.save();
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

        await Event.findByIdAndDelete(id);
        console.log(`🗑️ Event deleted: ${id} by ${username}`);
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// ==================== WHALIO AI CHAT (GEMINI) ====================
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instruction for Whalio Bot personality
const WHALIO_SYSTEM_INSTRUCTION = `Bạn là Whalio Bot, một trợ lý AI thân thiện dành cho sinh viên đại học. 
Hãy trả lời ngắn gọn, hữu ích và sử dụng giọng điệu khích lệ, động viên.
Sử dụng tiếng Việt để giao tiếp.
Bạn có thể giúp sinh viên với:
- Giải đáp thắc mắc về học tập
- Hướng dẫn sử dụng các tính năng của Whalio (GPA Calculator, Flashcard, Thời khóa biểu, Pomodoro Timer, Tài liệu)
- Đưa ra lời khuyên về phương pháp học tập hiệu quả
- Động viên khi sinh viên gặp khó khăn
Hãy sử dụng emoji phù hợp để tạo cảm giác thân thiện.`;

// POST /api/chat - Chat with Whalio AI
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
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

        // Initialize the model with system instruction
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            systemInstruction: WHALIO_SYSTEM_INSTRUCTION
        });

        // Generate response
        const result = await model.generateContent(message.trim());
        const response = await result.response;
        const text = response.text();

        console.log(`🤖 Whalio AI responded to: "${message.substring(0, 50)}..."`);

        res.json({
            success: true,
            response: text
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

        if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests')) {
            return res.status(429).json({
                success: false,
                message: 'Whalio đang bận, vui lòng thử lại sau vài giây nhé! 😊',
                response: 'Xin lỗi, mình đang nhận được quá nhiều tin nhắn. Hãy thử lại sau ít phút nhé! 🙏'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xử lý yêu cầu'
        });
    }
});

// ==================== GLOBAL ERROR HANDLER ====================
// This catches any errors not handled by route-specific error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Always return JSON for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Lỗi server không xác định'
        });
    }

    // For non-API routes, send generic error
    res.status(err.status || 500).send('Something went wrong!');
});

// ==================== SERVER START ====================
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 API ready at http://localhost:${PORT}`);
});

// Update Gemini version fix