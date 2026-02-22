# 🧪 WHALIO STUDY - STRESS TEST GUIDE
## Hướng dẫn Stress Test Server cho Lenovo LOQ

---

## 📋 MỤC LỤC
1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Vô hiệu hóa Security Middleware](#2-vô-hiệu-hóa-security-middleware)
3. [Chạy Stress Test](#3-chạy-stress-test)
4. [Đọc hiểu kết quả](#4-đọc-hiểu-kết-quả)
5. [Khôi phục Security](#5-khôi-phục-security)

---

## 1. CHUẨN BỊ MÔI TRƯỜNG

### Bước 1.1: Cài đặt autocannon (nếu chưa có)
```powershell
cd c:\Users\Lenovo\Desktop\studyweb\server
npm install autocannon
```

### Bước 1.2: Đảm bảo MongoDB đang chạy
Server cần kết nối được MongoDB để endpoint `/api/stats` hoạt động.

---

## 2. VÔ HIỆU HÓA SECURITY MIDDLEWARE

⚠️ **QUAN TRỌNG**: Chỉ làm điều này trên localhost, KHÔNG BAO GIỜ trên production!

Mở file `server/index.js` và **comment out** các dòng sau:

### 2.1. Rate Limiting (Lines 715-716)
Tìm và comment dòng này:
```javascript
// TRƯỚC (bật Rate Limit)
app.use('/api/admin', adminDebugLimiter);
app.use('/api/', generalLimiter);

// SAU (tắt Rate Limit - thêm // phía trước)
// app.use('/api/admin', adminDebugLimiter);
// app.use('/api/', generalLimiter);
```

### 2.2. Blacklist IP Gatekeeper (Line 489)
```javascript
// TRƯỚC
app.use(blockIPGatekeeper);

// SAU
// app.use(blockIPGatekeeper);
```

### 2.3. (Tùy chọn) Helmet Security Headers (Lines 196-210)
Thường không cần tắt, nhưng nếu muốn test raw performance:
```javascript
// TRƯỚC
app.use(helmet({
    // ...config
}));

// SAU
// app.use(helmet({
//     // ...config
// }));
```

### 📍 TÓM TẮT VỊ TRÍ CÁC MIDDLEWARE CẦN TẮT:

| Middleware | Line | Mức độ ảnh hưởng | Cần tắt? |
|------------|------|------------------|----------|
| Rate Limiter | 715-716 | **RẤT CAO** | ✅ BẮT BUỘC |
| IP Blacklist | 489 | CAO | ✅ NÊN TẮT |
| Helmet | 196-210 | THẤP | ❌ Không cần |
| MongoDB Sanitize | 492-511 | THẤP | ❌ Không cần |
| XSS Clean | 524-627 | THẤP | ❌ Không cần |
| HPP | 631-633 | THẤP | ❌ Không cần |

---

## 3. CHẠY STRESS TEST

### Bước 3.1: Khởi động server (Terminal 1)
```powershell
cd c:\Users\Lenovo\Desktop\studyweb\server
$env:PORT=10000; node index.js
```

### Bước 3.2: Chạy stress test (Terminal 2)
```powershell
cd c:\Users\Lenovo\Desktop\studyweb\server
node stress-test.js
```

### Bước 3.3: Theo dõi kết quả
Script sẽ tự động:
- Test với 100, 200, 500, 1000, 2000, 3000, 5000 connections
- Mỗi đợt chạy 10 giây
- Nghỉ 5 giây giữa các đợt để server recovery
- Ghi nhận "Break Point" khi phát hiện lỗi

---

## 4. ĐỌC HIỂU KẾT QUẢ

### 4.1. Các chỉ số quan trọng

| Chỉ số | Ý nghĩa | Ngưỡng tốt |
|--------|---------|------------|
| **RPS (req/s)** | Số request server xử lý được mỗi giây | Càng cao càng tốt |
| **Latency P50** | 50% request có thời gian phản hồi ≤ giá trị này | < 100ms |
| **Latency P99** | 99% request có thời gian phản hồi ≤ giá trị này | < 500ms |
| **Errors** | Số lỗi kết nối | = 0 |
| **Timeouts** | Số request bị timeout | = 0 |

### 4.2. Ví dụ đọc kết quả

```
📊 KẾT QUẢ: 1000 connections
   ├─ Trạng thái: ✅ ỔN
   ├─ Throughput: 8,500 req/s        ← Server xử lý 8500 request/giây
   ├─ Latency (p50): 45ms            ← 50% request trả về trong 45ms
   ├─ Latency (p99): 320ms           ← 99% request trả về trong 320ms
   ├─ Errors: 0                      ← Không có lỗi
   ├─ Timeouts: 0                    ← Không có timeout
   └─ Error Rate: 0.00%              ← Tỷ lệ lỗi 0%
```

### 4.3. Xác định "Ngưỡng Tử Thần"

**Break Point** là mức connection mà server bắt đầu:
- ❌ Xuất hiện Errors > 0
- ❌ Xuất hiện Timeouts > 0  
- ❌ Latency P99 > 1000ms (1 giây)
- ❌ Error Rate > 1%

**Ví dụ:**
```
🔴 ĐIỂM GÃY (BREAK POINT):
   ├─ Connections: 2,000              ← Server gãy ở 2000 connections
   ├─ Lý do: High Latency             ← Do latency quá cao
   ├─ RPS tại điểm gãy: 5,200         ← Lúc gãy vẫn xử lý được 5200 req/s
   └─ Latency P99: 1,850ms            ← 99% request mất 1.85 giây
```

### 4.4. Tính toán capacity thực tế

Từ kết quả **Max Safe RPS**, bạn có thể tính:

| Metric | Công thức | Ví dụ (8500 RPS) |
|--------|-----------|------------------|
| Daily Capacity | RPS × 60 × 60 × 24 | ~734,400,000 req/ngày |
| Concurrent Users | RPS ÷ 2 | ~4,250 users online |
| Monthly Capacity | Daily × 30 | ~22 tỷ req/tháng |

---

## 5. KHÔI PHỤC SECURITY

⚠️ **BẮT BUỘC** sau khi test xong!

### Bỏ comment các dòng đã tắt:
```javascript
// Bật lại Rate Limiting
app.use('/api/admin', adminDebugLimiter);
app.use('/api/', generalLimiter);

// Bật lại IP Blacklist
app.use(blockIPGatekeeper);
```

### Kiểm tra server hoạt động bình thường:
```powershell
curl http://localhost:10000/api/stats
```

---

## 📁 FILE KẾT QUẢ

Sau khi test xong, kết quả được lưu tại:
```
server/stress-test-results-[timestamp].json
```

File này chứa:
- Cấu hình test
- Break point (nếu có)
- Kết quả từng đợt test
- Tóm tắt tổng quan

---

## 🆘 TROUBLESHOOTING

### "Connection refused"
- Kiểm tra server đang chạy
- Kiểm tra PORT đúng (10000)

### "Rate limit exceeded" trong khi test
- Bạn quên tắt Rate Limiting
- Comment dòng 715-716 trong index.js

### Test chạy chậm bất thường
- Kiểm tra MongoDB có kết nối được không
- Kiểm tra CPU/RAM của máy Lenovo LOQ

### Server crash giữa chừng
- Đây là "hard break point"
- Note lại số connections lúc crash
- Đó chính là giới hạn tuyệt đối của server

---

**Chúc bạn test thành công! 🚀**
