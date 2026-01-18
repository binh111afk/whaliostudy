const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;

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

// Sửa lại hàm normalizeFileName để xử lý encoding tốt hơn
function normalizeFileName(str) {
    if (!str) return Date.now() + '-file';

    try {
        // Chuyển về Unicode chuẩn
        str = str.normalize('NFC');

        // Lấy phần mở rộng
        const ext = path.extname(str);
        let nameWithoutExt = path.basename(str, ext);

        // Chuẩn hóa tiếng Việt và ký tự đặc biệt
        // Bảng chuyển đổi tiếng Việt
        const vietnameseMap = {
            'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
            'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
            'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
            'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
            'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
            'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
            'đ': 'd',
            'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
            'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
            'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
            'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
            'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
            'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
            'Đ': 'D'
        };

        // Thay thế các ký tự tiếng Việt
        nameWithoutExt = nameWithoutExt.split('').map(char => vietnameseMap[char] || char).join('');

        // Xóa các ký tự đặc biệt, chỉ giữ lại chữ cái, số, dấu gạch ngang và underscore
        let safeName = nameWithoutExt
            .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // Xóa ký tự đặc biệt
            .replace(/\s+/g, '-')                 // Thay khoảng trắng bằng dấu gạch ngang
            .replace(/-+/g, '-')                   // Thay nhiều dấu gạch ngang liên tiếp bằng một
            .replace(/^[-_]+|[-_]+$/g, '')        // Xóa dấu gạch ngang/underscore ở đầu và cuối
            .toLowerCase()
            .slice(0, 50);                        // Giới hạn độ dài

        // Nếu tên quá ngắn hoặc rỗng sau khi xử lý, thêm timestamp
        if (safeName.length < 3) {
            safeName = Date.now() + '-file';
        }

        return safeName + ext;
    } catch (err) {
        console.error('Error normalizing filename:', err);
        return Date.now() + '-file' + (str ? path.extname(str) : '');
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
        const safeName = normalizeFileName(file.originalname);
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// File paths
const USERS_FILE = 'users.json';
const DOCS_FILE = 'documents.json';
const EXAMS_FILE = 'exams.json';         // Lưu danh sách đề thi (Metadata)
const QUESTIONS_FILE = 'questions.json'; // Lưu nội dung câu hỏi (Object)

// Helper functions
async function readJSON(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data || "[]");
    } catch (err) {
        return [];
    }
}

async function writeJSON(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// API Routes

// 1. Authentication APIs
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username && u.password === password);

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
        const users = await readJSON(USERS_FILE);

        // Kiểm tra trùng
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
        }

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: "Email này đã được sử dụng!" });
        }

        // Tạo user mới
        const newUser = {
            id: Date.now(),
            username,
            password,
            fullName,
            email,
            avatar: fullName.trim().charAt(0).toUpperCase(),
            role: "member",
            savedDocs: [],
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await writeJSON(USERS_FILE, users);

        const { password: _, ...safeUser } = newUser;
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
        const { name, type, uploader, course } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "Chưa chọn file!" });
        }

        const newDoc = {
            id: Date.now(),
            name: name || file.originalname.replace(/\.[^/.]+$/, ""),
            uploader: uploader || "Ẩn danh",
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            type: type || "other",
            path: '/uploads/' + file.filename,
            size: file.size,
            downloadCount: 0,
            course: course || '',
            createdAt: new Date().toISOString()
        };

        const docs = await readJSON(DOCS_FILE);
        docs.unshift(newDoc); // Thêm lên đầu
        await writeJSON(DOCS_FILE, docs);

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

app.post('/api/delete-document', async (req, res) => {
    try {
        const { docId, username } = req.body;
        const users = await readJSON(USERS_FILE);
        const docs = await readJSON(DOCS_FILE);

        // 1. Kiểm tra quyền Admin
        const user = users.find(u => u.username === username);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa tài liệu!" });
        }

        // 2. Tìm tài liệu
        const docIndex = docs.findIndex(d => d.id === parseInt(docId));
        if (docIndex === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        // 3. Xóa file vật lý trong thư mục uploads
        const filePath = path.join(__dirname, docs[docIndex].path);
        try {
            await fs.unlink(filePath); // Xóa file
        } catch (err) {
            console.warn("Lỗi xóa file vật lý (có thể file không tồn tại):", err.message);
        }

        // 4. Xóa trong database JSON
        docs.splice(docIndex, 1);
        await writeJSON(DOCS_FILE, docs);

        res.json({ success: true, message: "Đã xóa tài liệu vĩnh viễn!" });

    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// API: Cập nhật thông tin tài liệu (tên và môn học)
app.post('/api/update-document', async (req, res) => {
    try {
        const { docId, name, course, username } = req.body;
        console.log('Update request received:', { docId, name, course, username });
        
        const docs = await readJSON(DOCS_FILE);
        const users = await readJSON(USERS_FILE);

        // 1. Tìm tài liệu
        const doc = docs.find(d => d.id === parseInt(docId) || d.id == docId);
        if (!doc) {
            console.error('Document not found:', docId);
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        // 2. Kiểm tra quyền sửa tag (course)
        // Chỉ admin hoặc người upload lên mới có quyền sửa tag
        if (course && course !== doc.course) {
            const user = users.find(u => u.username === username);
            const isAdmin = user && user.role === 'admin';
            const isUploader = doc.uploader === user?.fullName;

            if (!isAdmin && !isUploader) {
                return res.status(403).json({ 
                    success: false, 
                    message: "❌ Chỉ admin hoặc người upload tài liệu mới có quyền thay đổi tag môn!" 
                });
            }
        }

        // 3. Cập nhật thông tin
        doc.name = name.trim();
        doc.course = course || '';

        // 4. Lưu vào database
        await writeJSON(DOCS_FILE, docs);
        console.log('Document updated successfully:', doc.id);

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

// Lấy danh sách bài viết
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await readJSON(POSTS_FILE);
        res.json(posts);
    } catch (err) {
        console.error('Get posts error:', err);
        res.json([]);
    }
});

// Tạo bài viết mới
app.post('/api/create-post', upload.fields([
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
                    originalName: f.originalname,
                    name: f.originalname,
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
                    } catch (e) {}
                }
            }
            return res.status(400).json({ success: false, message: "❌ Không được phép đăng video!" });
        }

        const newPost = {
            id: Date.now(),
            authorId: user.id,
            author: user.username,
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

        console.log(`✅ Bài viết mới từ ${username}: ID ${newPost.id}`);
        res.json({ success: true, message: "Đã đăng bài thành công!", post: newPost });

    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server: " + err.message });
    }
});

// Like bài viết
app.post('/api/like-post', async (req, res) => {
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
app.post('/api/comment-post', async (req, res) => {
    try {
        const { postId, content, username } = req.body;
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const comment = {
            id: Date.now(),
            author: username,
            content: content,
            createdAt: new Date().toISOString()
        };

        if (!post.comments) post.comments = [];
        post.comments.push(comment);

        await writeJSON(POSTS_FILE, posts);
        res.json({ success: true, comment: comment });

    } catch (err) {
        console.error('Comment post error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// Lưu bài viết
app.post('/api/save-post', async (req, res) => {
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
app.post('/api/delete-post', async (req, res) => {
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
app.post('/api/delete-comment', async (req, res) => {
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
app.post('/api/edit-post', async (req, res) => {
    try {
        const { postId, content, username } = req.body;
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

        const isAdmin = user && user.role === 'admin';
        const isCommentAuthor = comment.author === username;

        if (!isAdmin && !isCommentAuthor) {
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
app.post('/api/reply-comment', async (req, res) => {
    try {
        const { postId, parentCommentId, content, username } = req.body;
        const posts = await readJSON(POSTS_FILE);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ success: false, message: "Bài viết không tồn tại!" });
        }

        const parentComment = post.comments?.find(c => c.id === parentCommentId);
        if (!parentComment) {
            return res.status(404).json({ success: false, message: "Bình luận gốc không tồn tại!" });
        }

        const reply = {
            id: Date.now(),
            author: username,
            content: content,
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

        const isAdmin = user && user.role === 'admin';
        const isReplyAuthor = reply.author === username;

        if (!isAdmin && !isReplyAuthor) {
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

// Khởi động server
app.listen(PORT, async () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);

    // Tạo files user/docs nếu chưa tồn tại (Code cũ của bạn)
    try { await fs.access(USERS_FILE); } catch { await writeJSON(USERS_FILE, []); }
    try { await fs.access(DOCS_FILE); } catch { await writeJSON(DOCS_FILE, []); }
    try { await fs.access(POSTS_FILE); } catch { await writeJSON(POSTS_FILE, []); }

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
    // ----------------------------------------

    console.log('✅ Database files đã sẵn sàng');
});