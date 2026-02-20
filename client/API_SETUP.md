# Cấu hình API cho Whalio Frontend

## Tổng quan

Whalio đã được cấu hình để sử dụng biến môi trường cho API URL, giúp dễ dàng chuyển đổi giữa môi trường development và production.

## Cấu trúc

### 1. API Config (`src/config/apiConfig.js`)

File này chứa logic để lấy API URL từ biến môi trường:

- **Production**: Sử dụng `VITE_API_URL` từ file `.env`
- **Development**: Sử dụng relative path (chuỗi rỗng) để tận dụng Vite proxy

### 2. Environment Files

#### `.env` (Production - cho Render Static Site)
```env
VITE_API_URL=https://whaliostudy.onrender.com
```

#### `.env.development` (Local Development)
```env
VITE_API_URL=
```
Để trống để sử dụng Vite proxy (xem `vite.config.js`)

#### `.env.example` (Template)
File mẫu để chia sẻ cấu hình mà không lộ thông tin nhạy cảm.

### 3. Vite Proxy Configuration

File `vite.config.js` đã được cấu hình proxy cho local development:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

## Cách sử dụng

### Development (Local)

1. **Khởi động backend server** (port 3000):
   ```bash
   cd server
   node index.js
   ```

2. **Khởi động frontend dev server**:
   ```bash
   cd client
   npm run dev
   ```

3. Các API call sẽ tự động được proxy đến `http://localhost:3000`

### Production (Render)

1. **Build frontend**:
   ```bash
   cd client
   npm run build
   ```

2. **Deploy lên Render Static Site**:
   - Upload folder `dist/`
   - Render sẽ serve các file static
   - Frontend sẽ gọi API đến `https://whaliostudy.onrender.com`

## Thay đổi đã thực hiện

### Files đã cập nhật:

#### Services (Tất cả đã được cập nhật):
- ✅ `src/services/authService.js`
- ✅ `src/services/communityService.js`
- ✅ `src/services/documentService.js`
- ✅ `src/services/examService.js`
- ✅ `src/services/announcementService.js`
- ✅ `src/services/userService.js`
- ✅ `src/services/timetableService.js`
- ✅ `src/services/studyService.js`
- ✅ `src/services/portalService.js`
- ✅ `src/services/backupService.js`

#### Pages (Các page có direct fetch calls):
- ✅ `src/pages/StudyTimer.jsx`
- ✅ `src/pages/Dashboard.jsx`
- ✅ `src/pages/AiChat.jsx`
- ✅ `src/pages/Profile.jsx`
- ✅ `src/pages/GpaCalc.jsx`
- ✅ `src/pages/DocumentViewer.jsx`

#### Components (Các component có direct fetch calls):
- ✅ `src/components/AddEventModal.jsx`
- ✅ `src/components/AddDeadlineModal.jsx`
- ✅ `src/components/dashboard/DashboardScheduleTab.jsx`
- ✅ `src/components/dashboard/DashboardNotesTab.jsx`

### Cấu trúc thay đổi:

**Trước:**
```javascript
const res = await fetch('/api/login', { ... });
```

**Sau:**
```javascript
import { getFullApiUrl } from '../config/apiConfig';

const res = await fetch(getFullApiUrl('/api/login'), { ... });
```

## Lưu ý quan trọng

### CORS (Cross-Origin Resource Sharing)

Khi frontend và backend ở 2 domain khác nhau (production), backend cần cấu hình CORS:

```javascript
// server/index.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite dev server
    'https://your-frontend.onrender.com' // Production frontend
  ],
  credentials: true
}));
```

### Kiểm tra backend đã deploy

Trước khi deploy frontend, đảm bảo:
1. ✅ Backend đã deploy thành công trên https://whaliostudy.onrender.com
2. ✅ Backend có cấu hình CORS cho phép frontend domain
3. ✅ Tất cả API endpoints hoạt động đúng

### Test trước khi deploy

```bash
# Test với production API URL
cd client
VITE_API_URL=https://whaliostudy.onrender.com npm run dev
```

## Troubleshooting

### Lỗi kết nối API

1. Kiểm tra backend có đang chạy không
2. Kiểm tra CORS configuration
3. Kiểm tra Network tab trong DevTools
4. Kiểm tra Console logs

### Lỗi trong development

1. Backend phải chạy ở port 3000 (hoặc cập nhật `vite.config.js`)
2. Xóa cache: `npm run dev -- --force`

### Lỗi trong production

1. Kiểm tra file `.env` có đúng URL không
2. Rebuild: `npm run build`
3. Kiểm tra build output trong folder `dist/`

## Port mặc định

- **Backend**: 3000 (local), 10000 (Render)
- **Frontend Dev**: 5173 (Vite default)
- **Frontend Prod**: Static files (Render serve)

---

**Lưu ý**: File `.env` chứa thông tin production nên thêm vào `.gitignore` và không commit lên Git. Chỉ commit file `.env.example`.
