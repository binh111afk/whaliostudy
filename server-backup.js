const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MONGODB CONNECTION ====================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whalio';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('🚀 Whalio is now connected to MongoDB Cloud');
})
.catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
});

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
            replyTo: Number
        }],
        createdAt: { type: Date, default: Date.now }
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

// Timetable Schema
const timetableSchema = new mongoose.Schema({
    username: { type: String, required: true, ref: 'User' },
    subject: { type: String, required: true },
    room: { type: String, required: true },
    campus: { type: String, default: 'Cơ sở chính' },
    day: { type: String, required: true },
    session: { type: String, required: true },
    startPeriod: { type: Number, required: true },
    numPeriods: { type: Number, required: true },
    timeRange: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

// Create Models
const User = mongoose.model('User', userSchema);
const Document = mongoose.model('Document', documentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Post = mongoose.model('Post', postSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Timetable = mongoose.model('Timetable', timetableSchema);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Hàm chuẩn hóa tên file
// Thêm middleware để fix encoding
app.use((req, res, next) => {
    // Fix encoding cho POST requests
    if (req.method === 'POST') {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].normalize('NFC');
            }
        }
    }
    next();
});

// Hàm decode tên file đúng cách từ multer
function decodeFileName(filename) {
    try {
        // Multer có thể gửi filename với encoding sai, cần decode đúng cách
        // Nếu filename đã là UTF-8 thì giữ nguyên
        if (!filename) return filename;

        // Kiểm tra xem có phải là Latin1 encoding không (encoding mặc định của HTTP headers)
        // Nếu có ký tự lạ thì decode từ Latin1 sang UTF-8
        if (/[\xC0-\xFF]/.test(filename)) {
            // Convert từ Latin1 (ISO-8859-1) sang UTF-8
            const buffer = Buffer.from(filename, 'latin1');
            return buffer.toString('utf8');
        }

        return filename;
    } catch (err) {
        console.error('Error decoding filename:', err);
        return filename; // Fallback to original
    }
}

// Sửa lại hàm normalizeFileName để xử lý encoding tốt hơn và giữ lại tên file có dấu
function normalizeFileName(str) {
    if (!str) return Date.now() + '-file';

    try {
        const ext = path.extname(str);
        let nameWithoutExt = path.basename(str, ext);

        // Chỉ xóa các ký tự không an toàn cho filesystem, giữ lại dấu tiếng Việt
        let safeName = nameWithoutExt
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')  // Xóa ký tự không hợp lệ cho filesystem
            .replace(/\s+/g, '-')                    // Thay khoảng trắng bằng dấu gạch ngang
            .replace(/-+/g, '-')                     // Thay nhiều dấu gạch ngang liên tiếp bằng một
            .replace(/^[-_]+|[-_]+$/g, '')          // Xóa dấu gạch ngang/underscore ở đầu và cuối
            .slice(0, 100);                         // Giới hạn độ dài tên

        // Nếu tên quá ngắn hoặc rỗng sau khi xử lý, thêm timestamp
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

// Cấu hình upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = 'uploads/';
        try {
            await fs.mkdir(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            cb(err, dir);
        }
    },
    filename: (req, file, cb) => {
        // Decode tên file đúng cách trước
        const decodedName = decodeFileName(file.originalname);
        const safeName = normalizeFileName(decodedName);

        // Lưu tên gốc đã decode vào metadata
        file.decodedOriginalName = decodedName;

        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ==================== ACTIVITY LOGGING SYSTEM (MongoDB) ====================
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

        // Keep only last 100 activities
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

// API Routes

// 1. Authentication APIs
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password }).lean();

        if (user) {
            // Không trả password về client
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

        // Kiểm tra trùng
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ success: false, message: "Email này đã được sử dụng!" });
            }
        }

        // Tạo user mới
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
        const users = await readJSON(USERS_FILE);
        const index = users.findIndex(u => u.username === username);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        users[index] = { ...users[index], ...updateData, updatedAt: new Date().toISOString() };
        await writeJSON(USERS_FILE, users);

        const { password: _, ...safeUser } = users[index];
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPass, newPass } = req.body;
        const users = await readJSON(USERS_FILE);
        const index = users.findIndex(u => u.username === username);

        if (index === -1 || users[index].password !== oldPass) {
            return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
        }

        users[index].password = newPass;
        users[index].updatedAt = new Date().toISOString();
        await writeJSON(USERS_FILE, users);

        res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 3. File Upload APIs
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { username } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Chưa chọn ảnh!" });
        }

        const avatarPath = '/uploads/' + file.filename;
        const users = await readJSON(USERS_FILE);
        const index = users.findIndex(u => u.username === username);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // Xóa ảnh cũ nếu có
        const oldAvatar = users[index].avatar;
        if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
            try {
                await fs.unlink(path.join(__dirname, oldAvatar));
            } catch (err) {
                console.warn('Không thể xóa ảnh cũ:', err.message);
            }
        }

        users[index].avatar = avatarPath;
        await writeJSON(USERS_FILE, users);

        const { password: _, ...safeUser } = users[index];
        res.json({ success: true, avatar: avatarPath, user: safeUser });
    } catch (err) {
        console.error('Upload avatar error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 4. Document APIs
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await readJSON(DOCS_FILE);
        res.json(docs);
    } catch (err) {
        console.error('Get documents error:', err);
        res.status(500).json([]);
    }
});

app.post('/api/upload-document', upload.single('file'), async (req, res) => {
    try {
        const { name, type, uploader, course, username, visibility } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Chưa chọn file!" });
        }

        // Decode tên file gốc
        const decodedOriginalName = file.decodedOriginalName || decodeFileName(file.originalname);

        const newDoc = {
            id: Date.now(),
            name: name || decodedOriginalName.replace(/\.[^/.]+$/, ""),
            uploader: uploader || "Ẩn danh",
            uploaderUsername: username || null, // Thêm username
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            type: type || "other",
            path: '/uploads/' + file.filename,
            size: file.size,
            downloadCount: 0,
            course: course || '',
            visibility: visibility || 'public',
            createdAt: new Date().toISOString()
        };

        const docs = await readJSON(DOCS_FILE);
        docs.unshift(newDoc); // Thêm lên đầu
        await writeJSON(DOCS_FILE, docs);

        // 🔔 Log activity
        // 🔔 Log activity (CHỈ GHI NẾU KHÔNG PHẢI RIÊNG TƯ)
        if (visibility !== 'private') { 
            await logActivity(
                username || 'Ẩn danh',
                'đã tải lên',
                newDoc.name,
                `#doc-${newDoc.id}`,
                'upload'
            );
        }

        res.json({ success: true, document: newDoc });
    } catch (err) {
        console.error('Upload document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

app.post('/api/toggle-save-doc', async (req, res) => {
    try {
        const { username, docId } = req.body;
        const users = await readJSON(USERS_FILE);
        const index = users.findIndex(u => u.username === username);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // Khởi tạo savedDocs nếu chưa có
        if (!users[index].savedDocs) {
            users[index].savedDocs = [];
        }

        const docIndex = users[index].savedDocs.indexOf(docId);
        const action = docIndex === -1 ? "saved" : "unsaved";

        if (action === "saved") {
            users[index].savedDocs.push(docId);
        } else {
            users[index].savedDocs.splice(docIndex, 1);
        }

        await writeJSON(USERS_FILE, users);

        res.json({
            success: true,
            action,
            savedDocs: users[index].savedDocs
        });
    } catch (err) {
        console.error('Toggle save doc error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 5. Password Reset API
app.post('/api/reset-password-force', async (req, res) => {
    try {
        const { username, email, newPass } = req.body;
        const users = await readJSON(USERS_FILE);
        const index = users.findIndex(u => u.username === username && u.email === email);

        if (index === -1) {
            return res.status(400).json({ success: false, message: "Tên đăng nhập hoặc Email không chính xác!" });
        }

        users[index].password = newPass;
        users[index].updatedAt = new Date().toISOString();
        await writeJSON(USERS_FILE, users);

        res.json({ success: true, message: "Mật khẩu đã được đặt lại thành công!" });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 6. Stats API (Tùy chọn)
app.get('/api/stats', async (req, res) => {
    try {
        const docs = await readJSON(DOCS_FILE);
        const users = await readJSON(USERS_FILE);

        const stats = {
            totalDocuments: docs.length,
            totalUsers: users.length,
            recentDocuments: docs.slice(0, 10),
            storageUsed: docs.reduce((sum, doc) => sum + (doc.size || 0), 0)
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// --- BỔ SUNG API XÓA TÀI LIỆU (Dán vào cuối danh sách API, trước phần Khởi động server) ---

// POST /api/delete-document
app.post('/api/delete-document', async (req, res) => {
    try {
        const { docId, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const docs = await readJSON(DOCS_FILE);

        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(403).json({ success: false, message: "Người dùng không tồn tại!" });
        }

        // 1. Tìm tài liệu trước
        const docIndex = docs.findIndex(d => d.id === parseInt(docId));
        if (docIndex === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }
        
        const doc = docs[docIndex];

        // 2. 👇 KIỂM TRA QUYỀN: Là Admin HOẶC Là người up file (so sánh username)
        const isAdmin = user.role === 'admin';
        const isUploader = doc.uploaderUsername === username; 
        
        // Nếu file cũ chưa có uploaderUsername, so sánh tạm bằng tên hiển thị (uploader)
        const isLegacyUploader = !doc.uploaderUsername && doc.uploader === user.fullName;

        if (!isAdmin && !isUploader && !isLegacyUploader) {
            return res.status(403).json({ success: false, message: "⛔ Bạn không có quyền xóa tài liệu của người khác!" });
        }

        // 3. Xóa file vật lý
        const filePath = path.join(__dirname, doc.path);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.warn("Lỗi xóa file vật lý:", err.message);
        }

        // 4. Xóa trong database
        docs.splice(docIndex, 1);
        await writeJSON(DOCS_FILE, docs);

        // 🔔 Log activity
        await logActivity(username, 'đã xóa tài liệu', doc.name, '#', 'delete');

        res.json({ success: true, message: "Đã xóa tài liệu vĩnh viễn!" });

    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// API: Cập nhật thông tin tài liệu (ĐÃ FIX BẢO MẬT)
app.post('/api/update-document', async (req, res) => {
    try {
        const { docId, name, course, username, visibility } = req.body;
        console.log('Update request received:', { docId, name, course, username });

        const docs = await readJSON(DOCS_FILE);
        const users = await readJSON(USERS_FILE);

        // 1. Tìm tài liệu
        const doc = docs.find(d => d.id === parseInt(docId) || d.id == docId);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        // 2. 👇 KIỂM TRA QUYỀN (BẮT BUỘC CHO MỌI THAO TÁC)
        const user = users.find(u => u.username === username);
        const isAdmin = user && user.role === 'admin';
        
        let isOwner = false;
        // Ưu tiên so sánh username (cho file mới)
        if (doc.uploaderUsername) {
            isOwner = doc.uploaderUsername === username; 
        } else {
            // Fallback: So sánh tên hiển thị (cho file cũ)
            isOwner = doc.uploader === user?.fullName;   
        }

        // Nếu không phải Admin và không phải chủ sở hữu -> CHẶN NGAY
        if (!isAdmin && !isOwner) {
            console.log(`⛔ Blocked edit attempt by ${username} on doc ${docId}`);
            return res.status(403).json({ 
                success: false, 
                message: "⛔ Bạn không có quyền sửa tài liệu của người khác!" 
            });
        }

        // 3. Nếu qua được bước trên mới cho phép cập nhật
        if (name) doc.name = name.trim();
        if (course) doc.course = course || ''; // Cho phép chọn 'Khác' hoặc rỗng
        if (visibility) doc.visibility = visibility;

        // 4. Lưu vào database
        await writeJSON(DOCS_FILE, docs);
        console.log(`✏️ Document updated successfully: ${doc.id} by ${username}`);

        res.json({ success: true, message: "Cập nhật thành công!" });

    } catch (err) {
        console.error('Update document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
});

// ==========================================
// 7. EXAM APIs (API CHO ĐỀ THI) - MỚI
// ==========================================

// API: Lấy danh sách đề thi (cho trang chủ hiển thị)
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await readJSON(EXAMS_FILE);
        res.json(exams);
    } catch (err) {
        console.error('Get exams error:', err);
        res.json([]);
    }
});

// --- API: XÓA ĐỀ THI (USER CÓ THỂ XÓA ĐỀ CỦA MÌNH, ADMIN XÓA BẤT KÌ ĐỀ NÀO) ---
app.post('/api/delete-exam', async (req, res) => {
    try {
        const { examId, username } = req.body;

        // 1. Đọc dữ liệu Users để kiểm tra quyền
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(403).json({ success: false, message: "⛔ Người dùng không tồn tại!" });
        }

        // 2. Tìm đề thi và kiểm tra quyền
        let exams = await readJSON(EXAMS_FILE);
        const exam = exams.find(e => e.id == examId || e.id === String(examId));

        if (!exam) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi!" });
        }

        // 3. Kiểm tra quyền xóa
        // Admin có thể xóa bất kì đề nào, user chỉ có thể xóa đề của mình
        const isAdmin = user.role === 'admin';
        const isCreator = exam.createdBy === user.username;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ success: false, message: "⛔ Bạn chỉ có thể xóa đề thi do chính mình tạo!" });
        }

        // 4. Xóa khỏi danh sách exams.json
        exams = exams.filter(e => e.id != examId && e.id !== String(examId));
        await writeJSON(EXAMS_FILE, exams);

        // 5. Xóa câu hỏi trong questions.json
        try {
            const qData = await fs.readFile(QUESTIONS_FILE, 'utf8');
            let questionBank = JSON.parse(qData || "{}");

            if (questionBank[String(examId)]) {
                delete questionBank[String(examId)]; // Xóa key
                await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questionBank, null, 2));
            }
        } catch (e) {
            console.error("Lỗi khi xóa câu hỏi (không ảnh hưởng):", e);
        }

        console.log(`🗑️ ${username} đã xóa đề thi ID: ${examId} (Tạo bởi: ${exam.createdBy})`);
        res.json({ success: true, message: "Đã xóa đề thi thành công!" });

    } catch (err) {
        console.error('Delete exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi xóa đề" });
    }
});

// API: Tạo đề thi mới (Lưu cả Metadata và Câu hỏi)
app.post('/api/create-exam', async (req, res) => {
    try {
        const { id, title, time, limit, subject, questions, image, username } = req.body;

        // 1. Đọc dữ liệu cũ
        const exams = await readJSON(EXAMS_FILE);

        // Riêng Questions file là Object {}, cần đọc kỹ hơn
        let questionBank = {};
        try {
            const qData = await fs.readFile(QUESTIONS_FILE, 'utf8');
            questionBank = JSON.parse(qData || "{}");
        } catch (e) {
            questionBank = {}; // Nếu lỗi hoặc file chưa có thì tạo object rỗng
        }

        // 2. Cập nhật danh sách đề (exams.json)
        const newExamMeta = {
            id: id,
            title: title,
            subject: subject || "Tự tạo",
            questions: limit,
            time: time, // Client gửi lên số hoặc chuỗi đều được
            image: image || "./img/snvvnghen.png.png",
            createdBy: username || "Unknown",
            createdAt: new Date().toISOString()
        };
        exams.unshift(newExamMeta); // Thêm lên đầu danh sách

        // 3. Cập nhật ngân hàng câu hỏi (questions.json)
        // Key là ID đề thi, Value là mảng câu hỏi
        questionBank[String(id)] = questions;

        // 4. Ghi file
        await writeJSON(EXAMS_FILE, exams);
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questionBank, null, 2));

        console.log(`✅ Đã tạo đề thi mới: ${title} (ID: ${id}) bởi ${username}`);
        res.json({ success: true, message: "Đã lưu đề thi thành công!" });

    } catch (err) {
        console.error('Create exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi lưu đề thi" });
    }
});

// ==========================================
// 8. COMMUNITY APIs (API CHO CỘNG ĐỒNG)
// ==========================================

// File paths
const POSTS_FILE = 'posts.json';

// API: Lấy hoạt động gần đây (đọc từ activities.json)
app.get('/api/recent-activities', async (req, res) => {
    try {
        // Đọc từ activities.json
        let activities = [];
        try {
            const data = await fs.readFile(ACTIVITIES_FILE, 'utf8');
            activities = JSON.parse(data || '[]');
        } catch (err) {
            activities = [];
        }

        // Sắp xếp theo thời gian mới nhất và lấy 10 hoạt động
        activities.sort((a, b) => b.timestamp - a.timestamp);
        const recentActivities = activities.slice(0, 10);

        res.json({ success: true, activities: recentActivities, count: recentActivities.length });
    } catch (err) {
        console.error('Get recent activities error:', err);
        res.json({ success: true, activities: [], count: 0 });
    }
});

// Lấy danh sách bài viết
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await readJSON(POSTS_FILE);
        res.json({ success: true, posts: posts });
    } catch (err) {
        console.error('Get posts error:', err);
        res.json({ success: true, posts: [] });
    }
});

// Tạo bài viết mới
app.post('/api/posts', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ success: false, message: "Người dùng không tồn tại!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bài viết không được trống!" });
        }

        const posts = await readJSON(POSTS_FILE);

        // Xử lý images
        const images = req.files?.images
            ? req.files.images.map(f => `/uploads/${f.filename}`)
            : [];

        // Xử lý files (không được có video)
        const files = req.files?.files
            ? req.files.files
                .filter(f => !f.mimetype.startsWith('video/'))
                .map(f => ({
                    originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                    name: f.decodedOriginalName || decodeFileName(f.originalname),
                    path: `/uploads/${f.filename}`,
                    size: f.size,
                    mimeType: f.mimetype
                }))
            : [];

        // Kiểm tra video trong files
        if (req.files?.files && req.files.files.some(f => f.mimetype.startsWith('video/'))) {
            // Xóa video files vừa upload
            for (let file of req.files.files) {
                if (file.mimetype.startsWith('video/')) {
                    try {
                        await fs.unlink(file.path);
                    } catch (e) { }
                }
            }
            return res.status(400).json({ success: false, message: "❌ Không được phép đăng video!" });
        }

        const newPost = {
            id: Date.now(),
            authorId: user.id,
            author: user.username,
            authorFullName: user.fullName || user.username,
            authorAvatar: user.avatar || null,
            content: content,
            images: images,
            files: files,
            likes: 0,
            likedBy: [],
            comments: [],
            savedBy: [],
            createdAt: new Date().toISOString(),
            deleted: false
        };

        posts.unshift(newPost);
        await writeJSON(POSTS_FILE, posts);

        // 🔔 Log activity
        await logActivity(
            username,
            'đã đăng bài viết',
            'trong Cộng đồng',
            `#post-${newPost.id}`,
            'post'
        );

        console.log(`✅ Bài viết mới từ ${username}: ID ${newPost.id}`);
        res.json({ success: true, message: "Đã đăng bài thành công!", post: newPost });

    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
});

// Like bài viết
app.post('/api/posts/like', async (req, res) => {
    try {
        const { postId, username } = req.body;
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

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

        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, likes: post.likes });

    } catch (err) {
        console.error('Like post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Bình luận bài viết
app.post('/api/comments', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { postId, content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id == postId);  // Dùng == để so sánh loose

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        // Xử lý images
        const images = req.files?.images
            ? req.files.images.map(f => `/uploads/${f.filename}`)
            : [];

        // Xử lý files
        const files = req.files?.files
            ? req.files.files.map(f => ({
                originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                name: f.decodedOriginalName || decodeFileName(f.originalname),
                path: `/uploads/${f.filename}`,
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
            createdAt: new Date().toISOString()
        };

        if (!post.comments) post.comments = [];
        post.comments.push(comment);

        await writeJSON(POSTS_FILE, posts);

        // 🔔 Log activity
        await logActivity(
            username,
            'đã bình luận',
            `vào bài viết của ${post.author}`,
            `#post-${postId}`,
            'comment'
        );

        res.json({ success: true, comment: comment });

    } catch (err) {
        console.error('Comment post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Lưu bài viết
app.post('/api/posts/save', async (req, res) => {
    try {
        const { postId, username } = req.body;
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        if (!post.savedBy) post.savedBy = [];

        const saveIndex = post.savedBy.indexOf(username);
        if (saveIndex === -1) {
            post.savedBy.push(username);
        } else {
            post.savedBy.splice(saveIndex, 1);
        }

        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, saved: saveIndex === -1 });

    } catch (err) {
        console.error('Save post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Xóa bài viết
app.post('/api/posts/delete', async (req, res) => {
    try {
        const { postId, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const isAdmin = user && user.role === 'admin';
        const isAuthor = post.author === username;

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bài viết này!" });
        }

        post.deleted = true;
        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, message: "Đã xóa bài viết" });

    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Xóa bình luận
app.post('/api/comments/delete', async (req, res) => {
    try {
        const { postId, commentId, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments?.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        const isAdmin = user && user.role === 'admin';
        const isCommentAuthor = comment.author === username;

        if (!isAdmin && !isCommentAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bình luận này!" });
        }

        // Remove comment from array
        post.comments = post.comments.filter(c => c.id !== commentId);
        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, message: "Đã xóa bình luận" });

    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Chỉnh sửa bài viết
app.post('/api/posts/edit', async (req, res) => {
    try {
        const { postId, content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        // CHỈ người đăng mới được sửa bài viết của mình
        const isAuthor = post.author === username;

        if (!isAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bài viết này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bài viết không được trống!" });
        }

        post.content = content;
        post.editedAt = new Date().toISOString();

        await writeJSON(POSTS_FILE, posts);
        console.log(`✏️ Bài viết ${postId} được chỉnh sửa bởi ${username}`);
        res.json({ success: true, message: "Đã cập nhật bài viết", post: post });

    } catch (err) {
        console.error('Edit post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Chỉnh sửa bình luận
app.post('/api/edit-comment', async (req, res) => {
    try {
        const { postId, commentId, content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments?.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        // CHỈ người đăng mới được sửa bình luẫn của mình
        const isCommentAuthor = comment.author === username;

        if (!isCommentAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bình luận này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bình luận không được trống!" });
        }

        comment.content = content;
        comment.editedAt = new Date().toISOString();

        await writeJSON(POSTS_FILE, posts);
        console.log(`✏️ Bình luận ${commentId} của bài viết ${postId} được chỉnh sửa bởi ${username}`);
        res.json({ success: true, message: "Đã cập nhật bình luận", comment: comment });

    } catch (err) {
        console.error('Edit comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Trả lời bình luận (nested comment/reply)
app.post('/api/reply-comment', upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { postId, parentCommentId, content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id == postId);  // Dùng == để so sánh loose

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments?.find(c => c.id == parentCommentId);  // Dùng == để so sánh loose
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        // Xử lý images
        const images = req.files?.images
            ? req.files.images.map(f => `/uploads/${f.filename}`)
            : [];

        // Xử lý files
        const files = req.files?.files
            ? req.files.files.map(f => ({
                originalName: f.decodedOriginalName || decodeFileName(f.originalname),
                name: f.decodedOriginalName || decodeFileName(f.originalname),
                path: `/uploads/${f.filename}`,
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
            createdAt: new Date().toISOString(),
            replyTo: parentCommentId
        };

        if (!parentComment.replies) parentComment.replies = [];
        parentComment.replies.push(reply);

        await writeJSON(POSTS_FILE, posts);
        console.log(`↩️ Trả lời bình luận ${parentCommentId} trong bài ${postId} từ ${username}`);
        res.json({ success: true, message: "Trả lời thành công", reply: reply });

    } catch (err) {
        console.error('Reply comment error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Thêm emoji reaction vào bình luận
app.post('/api/add-emoji-reaction', async (req, res) => {
    try {
        const { postId, commentId, emoji, username } = req.body;
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = post.comments?.find(c => c.id === commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: "Bình luận không tồn tại!" });
        }

        if (!comment.reactions) comment.reactions = {};

        // Toggle emoji (if already added, remove it)
        if (comment.reactions[emoji]) {
            // Remove this user from the emoji
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

        await writeJSON(POSTS_FILE, posts);
        console.log(`😊 ${username} thêm ${emoji} vào bình luận ${commentId}`);
        res.json({ success: true, message: "Thêm emoji thành công", reactions: comment.reactions });

    } catch (err) {
        console.error('Add emoji reaction error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Chỉnh sửa trả lời bình luận
app.post('/api/edit-reply', async (req, res) => {
    try {
        const { postId, parentCommentId, replyId, content, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments?.find(c => c.id === parentCommentId);
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        const reply = parentComment.replies?.find(r => r.id === replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: "Trả lời không tồn tại!" });
        }

        // CHỈ người đăng mới được sửa trả lời của mình
        const isReplyAuthor = reply.author === username;

        if (!isReplyAuthor) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa trả lời này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung trả lời không được trống!" });
        }

        reply.content = content;
        reply.editedAt = new Date().toISOString();

        await writeJSON(POSTS_FILE, posts);
        console.log(`✏️ Trả lời ${replyId} của bình luận ${parentCommentId} trong bài viết ${postId} được chỉnh sửa bởi ${username}`);
        res.json({ success: true, message: "Đã cập nhật trả lời", reply: reply });

    } catch (err) {
        console.error('Edit reply error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Xóa trả lời bình luận
app.post('/api/delete-reply', async (req, res) => {
    try {
        const { postId, parentCommentId, replyId, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments?.find(c => c.id === parentCommentId);
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

        // Remove reply from array
        parentComment.replies = parentComment.replies.filter(r => r.id !== replyId);
        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, message: "Đã xóa trả lời" });

    } catch (err) {
        console.error('Delete reply error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// ==================== TIMETABLE ENDPOINTS ====================

// GET /api/timetable - Lấy thời khóa biểu của user
app.get('/api/timetable', async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.json({ success: false, message: 'Missing username' });
        }

        // Verify user exists
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Get user's classes
        const allTimetables = await readJSON(TIMETABLE_FILE);
        const userClasses = allTimetables.filter(cls => cls.username === username);

        console.log(`📅 Loaded ${userClasses.length} classes for ${username}`);
        res.json({ success: true, timetable: userClasses });

    } catch (err) {
        console.error('Error loading timetable:', err);
        res.json({ success: false, message: 'Server error', timetable: [] });
    }
});

// POST /api/timetable - Add new class (using username in body)
app.post('/api/timetable', async (req, res) => {
    try {
        const { username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange } = req.body;

        // Validate required fields
        if (!username) {
            return res.json({ success: false, message: '❌ Missing username' });
        }

        if (!subject || !room || !day || !session || !startPeriod || !numPeriods) {
            return res.json({ success: false, message: '❌ Thiếu thông tin bắt buộc' });
        }

        // Verify user exists
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.json({ success: false, message: '❌ Người dùng không tồn tại - Vui lòng đăng nhập lại' });
        }

        // Create new class
        const newClass = {
            id: Date.now(),
            username: username,
            subject: subject.trim(),
            room: room.trim(),
            campus: campus || 'Cơ sở chính',
            day,
            session,
            startPeriod: parseInt(startPeriod),
            numPeriods: parseInt(numPeriods),
            timeRange,
            createdAt: new Date().toISOString()
        };

        // Save to database
        const timetables = await readJSON(TIMETABLE_FILE);
        timetables.push(newClass);
        await writeJSON(TIMETABLE_FILE, timetables);

        console.log(`✅ Added class: ${subject} for ${username}`);
        res.json({ success: true, message: 'Thêm lớp học thành công!', class: newClass });

    } catch (err) {
        console.error('Error creating class:', err);
        res.json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// POST /api/timetable - Thêm lớp học mới
/*app.post('/api/timetable', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.json({ success: false, message: 'Unauthorized - Vui lòng đăng nhập lại' });
        }

        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.token === token);
        if (!user) {
            return res.json({ success: false, message: 'User not found - Vui lòng đăng xuất và đăng nhập lại' });
        }

        const { subject, room, day, session, startPeriod, numPeriods, timeRange } = req.body;

        if (!subject || !room || !day || !session || !startPeriod || !numPeriods) {
            return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }

        const newClass = {
            id: Date.now(),
            username: user.username,
            subject,
            room,
            day,
            session,
            startPeriod: parseInt(startPeriod),
            numPeriods: parseInt(numPeriods),
            timeRange,
            createdAt: new Date().toISOString()
        };

        const timetables = await readJSON(TIMETABLE_FILE);
        timetables.push(newClass);
        await writeJSON(TIMETABLE_FILE, timetables);

        console.log(`✅ Thêm lớp học: ${subject} cho user ${user.username}`);
        res.json({ success: true, message: 'Thêm lớp học thành công!' });
    } catch (err) {
        console.error('Error creating class:', err);
        res.json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});*/

// POST /api/timetable/delete - Xóa lớp học
app.post('/api/timetable/delete', async (req, res) => {
    try {
        const { classId, username } = req.body;

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Missing required data' });
        }

        // Verify user exists
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.json({ success: false, message: '❌ User not found' });
        }

        // Load timetables
        let timetables = await readJSON(TIMETABLE_FILE);

        // Find class to delete
        const classToDelete = timetables.find(cls => String(cls.id) === String(classId));

        if (!classToDelete) {
            return res.json({ success: false, message: '❌ Class not found' });
        }

        // Security: Only allow deleting own classes
        if (classToDelete.username !== username) {
            return res.json({ success: false, message: '❌ Unauthorized - You can only delete your own classes' });
        }

        // Delete class
        timetables = timetables.filter(cls => cls.id != classId);
        await writeJSON(TIMETABLE_FILE, timetables);

        console.log(`🗑️ Deleted class ${classId} by ${username}`);
        res.json({ success: true, message: 'Xóa lớp học thành công!' });

    } catch (err) {
        console.error('Error deleting class:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// POST /api/timetable/update - Cập nhật lớp học
app.post('/api/timetable/update', async (req, res) => {
    try {
        const { classId, username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange } = req.body;

        if (!classId || !username) {
            return res.json({ success: false, message: '❌ Thiếu thông tin định danh' });
        }

        // Load timetables
        let timetables = await readJSON(TIMETABLE_FILE);

        // Tìm lớp cần sửa
        const index = timetables.findIndex(cls => String(cls.id) === String(classId));

        if (index === -1) {
            return res.json({ success: false, message: '❌ Không tìm thấy lớp học' });
        }

        // Security: Chỉ cho phép sửa lớp của chính mình
        if (timetables[index].username !== username) {
            return res.json({ success: false, message: '❌ Bạn không có quyền sửa lớp này' });
        }

        // Cập nhật thông tin (giữ lại id và createdAt cũ)
        timetables[index] = {
            ...timetables[index],
            subject: subject.trim(),
            room: room.trim(),
            campus: campus || 'Cơ sở chính',
            day,
            session,
            startPeriod: parseInt(startPeriod),
            numPeriods: parseInt(numPeriods),
            timeRange,
            updatedAt: new Date().toISOString()
        };

        await writeJSON(TIMETABLE_FILE, timetables);

        console.log(`✏️ Updated class ${classId} by ${username}`);
        res.json({ success: true, message: 'Cập nhật thành công!' });

    } catch (err) {
        console.error('Error updating class:', err);
        res.json({ success: false, message: 'Server error' });
    }
});
// ==================== SERVER START ====================

// Khởi động server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Tạo files user/docs nếu chưa tồn tại (Code cũ của bạn)
    try { await fs.access(USERS_FILE); } catch { await writeJSON(USERS_FILE, []); }
    try { await fs.access(DOCS_FILE); } catch { await writeJSON(DOCS_FILE, []); }
    try { await fs.access(POSTS_FILE); } catch { await writeJSON(POSTS_FILE, []); }
    try { await fs.access(ACTIVITIES_FILE); } catch { await writeJSON(ACTIVITIES_FILE, []); console.log('📌 activities.json created'); }

    // --- THÊM ĐOẠN NÀY ĐỂ TẠO FILE ĐỀ THI ---
    try {
        await fs.access(EXAMS_FILE);
    } catch {
        await writeJSON(EXAMS_FILE, []); // Mảng rỗng cho danh sách đề
        console.log('📄 Đã tạo exams.json');
    }

    try {
        await fs.access(QUESTIONS_FILE);
    } catch {
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify({}, null, 2)); // Object rỗng {} cho câu hỏi
        console.log('📄 Đã tạo questions.json');
    }

    try {
        await fs.access(TIMETABLE_FILE);
    } catch {
        await writeJSON(TIMETABLE_FILE, []);
        console.log('📅 Đã tạo timetable.json');
    }
    // ----------------------------------------

    console.log('✅ Database files đã sẵn sàng');
});