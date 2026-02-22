# 🚀 WHALIO STUDY - TỐI ƯU HÓA SERVER
## 3 Điểm Sửa Ngay Để Tăng Gấp Đôi Khả Năng Chịu Tải

---

## 📊 PHÂN TÍCH HIỆN TRẠNG

Dựa trên phân tích `index.js`, endpoint `/api/stats` hiện tại có vấn đề:

```javascript
// HIỆN TẠI: Mỗi request gọi 4 query MongoDB
app.get('/api/stats', async (req, res) => {
    const [totalDocuments, totalUsers, recentDocuments, storageAgg] = await Promise.all([
        Document.countDocuments(),        // Query 1
        User.countDocuments(),            // Query 2
        Document.find()...limit(10),      // Query 3
        Document.aggregate([...])         // Query 4 (nặng nhất!)
    ]);
});
```

**Vấn đề:** 1000 request/giây = **4000 query MongoDB/giây** → Bottleneck!

---

## 🔧 TỐI ƯU 1: THÊM CACHING CHO /api/stats

### Vị trí: Line 3965-3997 trong `index.js`

### Code cũ:
```javascript
app.get('/api/stats', async (req, res) => {
    try {
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

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});
```

### Code mới (có caching):
```javascript
// Cache key cho stats
const STATS_CACHE_KEY = 'api:stats:global';
const STATS_CACHE_TTL = 30; // 30 giây - stats không cần real-time

app.get('/api/stats', async (req, res) => {
    try {
        // Kiểm tra cache trước
        const cachedStats = runtimeCache.get(STATS_CACHE_KEY);
        if (cachedStats) {
            return res.json({ success: true, stats: cachedStats, cached: true });
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

        // Lưu vào cache
        runtimeCache.set(STATS_CACHE_KEY, stats, STATS_CACHE_TTL);

        res.json({ success: true, stats });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});
```

### Hiệu quả: **Tăng ~50-100x throughput** cho endpoint này!

---

## 🔧 TỐI ƯU 2: THÊM INDEX MONGODB

### Vấn đề: 
- `countDocuments()` quét toàn bộ collection nếu không có index
- `sort({ createdAt: -1 })` chậm với data lớn
- `aggregate()` grouping cần scan toàn bộ documents

### Giải pháp: Chạy các lệnh sau trong MongoDB Shell hoặc tạo migration script

```javascript
// Tạo file: server/scripts/create-indexes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    // Index cho Document collection
    console.log('Creating indexes for documents...');
    await db.collection('documents').createIndexes([
        { key: { createdAt: -1 }, name: 'idx_documents_createdAt' },
        { key: { size: 1 }, name: 'idx_documents_size' },
        { key: { course: 1, visibility: 1 }, name: 'idx_documents_course_visibility' }
    ]);
    
    // Index cho User collection
    console.log('Creating indexes for users...');
    await db.collection('users').createIndexes([
        { key: { username: 1 }, name: 'idx_users_username', unique: true },
        { key: { email: 1 }, name: 'idx_users_email', sparse: true }
    ]);
    
    // Index cho Exam collection
    console.log('Creating indexes for exams...');
    await db.collection('exams').createIndexes([
        { key: { examId: 1 }, name: 'idx_exams_examId', unique: true },
        { key: { createdAt: -1 }, name: 'idx_exams_createdAt' }
    ]);
    
    console.log('✅ All indexes created successfully!');
    await mongoose.disconnect();
}

createIndexes().catch(console.error);
```

### Chạy script:
```powershell
cd server
node scripts/create-indexes.js
```

### Hiệu quả: **Tăng 5-20x tốc độ query** tùy kích thước data

---

## 🔧 TỐI ƯU 3: TĂNG CONNECTION POOL & COMPRESSION

### 3A. Tăng MongoDB Connection Pool

**Vị trí:** Line ~735 trong `index.js`

```javascript
// HIỆN TẠI
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 20,  // ← Giới hạn 20 connections
    // ...
});

// TỐI ƯU (cho máy Lenovo LOQ với RAM 16GB+)
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 50,           // ← Tăng lên 50
    minPoolSize: 10,           // ← Tăng pool tối thiểu
    maxIdleTimeMS: 30000,      // ← Connection timeout
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // Thêm write concern optimization
    writeConcern: {
        w: 1,                  // Chỉ cần 1 node xác nhận (nhanh hơn)
        j: false               // Không cần journal (nhanh hơn nhưng có risk nhỏ)
    }
});
```

### 3B. Thêm Compression Middleware

Thêm vào đầu file `index.js` (sau dòng require):

```javascript
const compression = require('compression');
```

Thêm middleware (sau CORS, trước các route):

```javascript
// Thêm sau dòng: app.use(cors(corsOptions));
app.use(compression({
    level: 6,                    // Mức nén (1-9, 6 là cân bằng)
    threshold: 1024,             // Chỉ nén response > 1KB
    filter: (req, res) => {
        // Không nén nếu client không hỗ trợ
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));
console.log('📦 Response compression enabled');
```

**Cài đặt:**
```powershell
cd server
npm install compression
```

### Hiệu quả: 
- Connection pool: **Tăng 2-3x concurrent capacity**
- Compression: **Giảm 60-80% response size** → Network nhanh hơn

---

## 📊 TỔNG KẾT HIỆU QUẢ

| Tối ưu | Công sức | Hiệu quả | Gấp bao nhiêu |
|--------|----------|----------|---------------|
| 1. Cache /api/stats | Thấp | Rất cao | **50-100x** |
| 2. MongoDB Indexes | Trung bình | Cao | **5-20x** |
| 3. Pool + Compression | Thấp | Trung bình | **2-3x** |

**Tổng cộng dự kiến: Tăng gấp 2-5 lần khả năng chịu tải!**

---

## ⚡ QUICK APPLY - Copy & Paste

### Bước 1: Cài compression
```powershell
cd c:\Users\Lenovo\Desktop\studyweb\server
npm install compression
```

### Bước 2: Sửa index.js

**Thêm require (đầu file):**
```javascript
const compression = require('compression');
```

**Thêm middleware (sau CORS):**
```javascript
app.use(compression({ level: 6, threshold: 1024 }));
```

**Sửa /api/stats (line 3965):** Copy code mới từ TỐI ƯU 1 ở trên.

**Sửa MongoDB connection (line 735):** Thay đổi maxPoolSize và thêm options.

### Bước 3: Chạy lại stress test
```powershell
node stress-test.js
```

So sánh kết quả mới với kết quả cũ!

---

## 🎯 MỤC TIÊU SAU TỐI ƯU

| Metric | Trước | Sau (dự kiến) |
|--------|-------|---------------|
| Break Point | ~1000 conn | ~3000-5000 conn |
| Max RPS | ~5000 | ~15000-25000 |
| Latency P99 | ~500ms | ~100-200ms |

**Good luck! 🚀**
