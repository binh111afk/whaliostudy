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
        const nameWithoutExt = path.basename(str, ext);

        // Xóa dấu và ký tự đặc biệt
        let safeName = nameWithoutExt
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 50);

        // Nếu tên quá ngắn, thêm timestamp
        if (safeName.length < 3) {
            safeName = Date.now() + '-file';
        }

        return safeName + ext;
    } catch (err) {
        return Date.now() + '-file' + path.extname(str);
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
        const { docId, name, course } = req.body;
        console.log('Update request received:', { docId, name, course });
        
        const docs = await readJSON(DOCS_FILE);

        // 1. Tìm tài liệu - parse both as string and int for comparison
        const doc = docs.find(d => d.id === parseInt(docId) || d.id == docId);
        if (!doc) {
            console.error('Document not found:', docId);
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu!" });
        }

        // 2. Cập nhật thông tin
        doc.name = name.trim();
        doc.course = course || '';

        // 3. Lưu vào database
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

// --- API: XÓA ĐỀ THI (CHỈ ADMIN) ---
app.post('/api/delete-exam', async (req, res) => {
    try {
        const { examId, username } = req.body;

        // 1. Đọc dữ liệu Users để kiểm tra quyền Admin
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "⛔ Bạn không có quyền xóa đề thi!" });
        }

        // 2. Xóa khỏi danh sách exams.json
        let exams = await readJSON(EXAMS_FILE);
        const initialLength = exams.length;
        exams = exams.filter(e => e.id !== parseInt(examId) && e.id !== String(examId)); // Xử lý cả id số và chuỗi

        if (exams.length === initialLength) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi!" });
        }
        await writeJSON(EXAMS_FILE, exams);

        // 3. Xóa câu hỏi trong questions.json
        // (Questions file là Object, không phải Array)
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

        console.log(`🗑️ Admin ${username} đã xóa đề thi ID: ${examId}`);
        res.json({ success: true, message: "Đã xóa đề thi thành công!" });

    } catch (err) {
        console.error('Delete exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi xóa đề" });
    }
});

// API: Tạo đề thi mới (Lưu cả Metadata và Câu hỏi)
app.post('/api/create-exam', async (req, res) => {
    try {
        const { id, title, time, limit, subject, questions, image } = req.body;

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
            createdAt: new Date().toISOString()
        };
        exams.unshift(newExamMeta); // Thêm lên đầu danh sách

        // 3. Cập nhật ngân hàng câu hỏi (questions.json)
        // Key là ID đề thi, Value là mảng câu hỏi
        questionBank[String(id)] = questions;

        // 4. Ghi file
        await writeJSON(EXAMS_FILE, exams);
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questionBank, null, 2));

        console.log(`✅ Đã tạo đề thi mới: ${title} (ID: ${id})`);
        res.json({ success: true, message: "Đã lưu đề thi thành công!" });

    } catch (err) {
        console.error('Create exam error:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi lưu đề thi" });
    }
});

// Khởi động server
app.listen(PORT, async () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);

    // Tạo files user/docs nếu chưa tồn tại (Code cũ của bạn)
    try { await fs.access(USERS_FILE); } catch { await writeJSON(USERS_FILE, []); }
    try { await fs.access(DOCS_FILE); } catch { await writeJSON(DOCS_FILE, []); }

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