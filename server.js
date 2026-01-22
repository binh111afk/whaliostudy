require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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

// Timetable Schema
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
        const decodedName = decodeFileName(file.originalname);
        const safeName = normalizeFileName(decodedName);
        // Store original name for later use
        file.decodedOriginalName = decodedName;
        
        return {
            folder: 'whalio-documents',
            resource_type: 'auto',
            public_id: safeName.replace(path.extname(safeName), ''),
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar']
        };
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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

// ==================== API ROUTES ====================

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

app.post('/api/upload-document', upload.single('file'), async (req, res) => {
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
            createdAt: e.createdAt
        }));
        res.json(examList);
    } catch (err) {
        console.error('Get exams error:', err);
        res.json([]);
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
        const { postId, content, username } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        if (post.author !== username) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bài viết này!" });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Nội dung bài viết không được trống!" });
        }

        post.content = content;
        post.editedAt = new Date();
        await post.save();

        res.json({ success: true, message: "Đã cập nhật bài viết", post });
    } catch (err) {
        console.error('Edit post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
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
app.get('/api/timetable', async (req, res) => {
    try {
        const username = req.query.username;

        if (!username) {
            return res.json({ success: false, message: 'Missing username' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const userClasses = await Timetable.find({ username }).lean();
        console.log(`📅 Loaded ${userClasses.length} classes for ${username}`);
        res.json({ success: true, timetable: userClasses });
    } catch (err) {
        console.error('Error loading timetable:', err);
        res.json({ success: false, message: 'Server error', timetable: [] });
    }
});

app.post('/api/timetable', async (req, res) => {
    try {
        const { username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange } = req.body;

        if (!username) {
            return res.json({ success: false, message: '❌ Missing username' });
        }

        if (!subject || !room || !day || !session || !startPeriod || !numPeriods) {
            return res.json({ success: false, message: '❌ Thiếu thông tin bắt buộc' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, message: '❌ Người dùng không tồn tại - Vui lòng đăng nhập lại' });
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
            timeRange
        });

        await newClass.save();
        console.log(`✅ Added class: ${subject} for ${username}`);
        res.json({ success: true, message: 'Thêm lớp học thành công!', class: newClass });
    } catch (err) {
        console.error('Error creating class:', err);
        res.json({ success: false, message: 'Lỗi server: ' + err.message });
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

app.post('/api/timetable/update', async (req, res) => {
    try {
        const { classId, username, subject, room, campus, day, session, startPeriod, numPeriods, timeRange } = req.body;

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

        classToUpdate.subject = subject.trim();
        classToUpdate.room = room.trim();
        classToUpdate.campus = campus || 'Cơ sở chính';
        classToUpdate.day = day;
        classToUpdate.session = session;
        classToUpdate.startPeriod = parseInt(startPeriod);
        classToUpdate.numPeriods = parseInt(numPeriods);
        classToUpdate.timeRange = timeRange;
        classToUpdate.updatedAt = new Date();

        await classToUpdate.save();
        console.log(`✏️ Updated class ${classId} by ${username}`);
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
        console.error('Error updating class:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// ==================== SERVER START ====================
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📡 API ready at http://localhost:${PORT}`);
});
