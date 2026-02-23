import * as XLSX from 'xlsx';

// --- HẰNG SỐ ---
export const PERIOD_TIMES = {
    1: { start: '06:30', end: '07:20' },
    2: { start: '07:20', end: '08:10' },
    3: { start: '08:10', end: '09:00' },
    4: { start: '09:10', end: '10:00' },
    5: { start: '10:00', end: '10:50' },
    6: { start: '10:50', end: '11:40' },
    7: { start: '12:30', end: '13:20' },
    8: { start: '13:20', end: '14:10' },
    9: { start: '14:10', end: '15:00' },
    10: { start: '15:10', end: '16:00' },
    11: { start: '16:00', end: '16:50' },
    12: { start: '16:50', end: '17:40' },
    13: { start: '17:50', end: '18:40' },
    14: { start: '18:40', end: '19:30' },
    15: { start: '19:50', end: '20:40' }
};

// Map giờ -> tiết (để xử lý trường hợp chỉ có giờ, không có số tiết)
const TIME_TO_PERIOD = {
    '6h30': 1, '06h30': 1, '6:30': 1, '06:30': 1,
    '7h20': 2, '07h20': 2, '7:20': 2, '07:20': 2,
    '8h10': 3, '08h10': 3, '8:10': 3, '08:10': 3,
    '9h00': 3, '09h00': 3, '9:00': 3, '09:00': 3, // end of period 3
    '9h10': 4, '09h10': 4, '9:10': 4, '09:10': 4,
    '10h00': 5, '10:00': 5,
    '10h50': 6, '10:50': 6,
    '11h40': 6, '11:40': 6, // end of period 6
    '12h30': 7, '12:30': 7,
    '13h20': 8, '13:20': 8,
    '14h10': 9, '14:10': 9,
    '15h00': 9, '15:00': 9, // end of period 9
    '15h10': 10, '15:10': 10,
    '16h00': 11, '16:00': 11,
    '16h50': 12, '16:50': 12,
    '17h40': 12, '17:40': 12, // end of period 12
    '17h50': 13, '17:50': 13,
    '18h40': 14, '18:40': 14,
    '19h30': 14, '19:30': 14, // end of period 14
    '19h50': 15, '19:50': 15,
    '20h40': 15, '20:40': 15, // end of period 15
};

export const PASTEL_COLORS = [
    '#FFE5E5', '#E5F3FF', '#FFF5E5', '#E5FFE5', 
    '#F5E5FF', '#FFE5F5', '#E5FFFF', '#FFFFE5'
];

// --- HÀM XỬ LÝ NGÀY THÁNG ---
export const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const formatDateDisplay = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- LOGIC LỌC TUẦN (Quan trọng nhất) ---
export const isClassInWeek = (cls, weekStart) => {
    if (!weekStart) return true;
    
    // Nếu không có ngày bắt đầu/kết thúc (data cũ) -> Hiện luôn
    if (!cls.startDate || !cls.endDate) return true;

    const start = new Date(cls.startDate);
    const end = new Date(cls.endDate);
    
    // Tính khoảng thời gian của tuần đang chọn
    const currentWeekStart = new Date(weekStart);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Logic giao nhau: (StartA <= EndB) and (EndA >= StartB)
    return (start <= currentWeekEnd && end >= currentWeekStart);
};

// --- LOGIC IMPORT EXCEL (Cải tiến để xử lý file phức tạp từ trường) ---

/**
 * Parse cột Thứ (day) - Chuẩn hóa về '2'-'7' hoặc 'CN'
 */
const parseDayString = (dayStr) => {
    if (!dayStr) return null;
    
    // Xử lý wrap text: "Thứ\nHai" -> "Thứ Hai"
    let s = String(dayStr).replace(/[\n\r]+/g, ' ').toLowerCase().trim();
    
    // Loại bỏ "thứ " ở đầu
    s = s.replace(/^thứ\s*/i, '');
    
    // Map tên ngày sang số
    if (s.includes('hai') || s === '2') return '2';
    if (s.includes('ba') || s === '3') return '3';
    if (s.includes('tư') || s.includes('tu') || s === '4') return '4';
    if (s.includes('năm') || s.includes('nam') || s === '5') return '5';
    if (s.includes('sáu') || s.includes('sau') || s === '6') return '6';
    if (s.includes('bảy') || s.includes('bay') || s === '7') return '7';
    if (s.includes('chủ') || s.includes('chu') || s.includes('cn') || s === 'cn') return 'CN';
    
    return null;
};

/**
 * Parse cột Tiết - Trích xuất startPeriod và numPeriods
 * Các format có thể gặp:
 * - "1 (6h30)->3 (9h00)"
 * - "13 (17h50)->15 (20h40)"
 * - "13 (17h50)->13"
 * - "(18h40)" - chỉ có giờ
 * - "7 (12h30)->9 (15h00)"
 */
const parsePeriodString = (periodStr) => {
    if (!periodStr) return null;
    
    const str = String(periodStr).trim();
    
    // Pattern 1: Có số tiết rõ ràng
    // VD: "1 (6h30)->3 (9h00)", "13 (17h50)->15", "7->9"
    const periodPattern = /(\d+)\s*(?:[\(（][^)）]*[\)）])?\s*[-→>]+\s*(\d+)/;
    let match = str.match(periodPattern);
    
    if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        
        // Kiểm tra nếu số hợp lệ (tiết từ 1-15)
        if (start >= 1 && start <= 15 && end >= 1 && end <= 15) {
            return {
                startPeriod: start,
                numPeriods: Math.max(1, end - start + 1)
            };
        }
    }
    
    // Pattern 2: Chỉ có một số tiết (VD: "13 (17h50)")
    const singlePeriodPattern = /^(\d{1,2})\s*(?:[\(（]|$)/;
    match = str.match(singlePeriodPattern);
    if (match) {
        const period = parseInt(match[1]);
        if (period >= 1 && period <= 15) {
            return { startPeriod: period, numPeriods: 1 };
        }
    }
    
    // Pattern 3: Chỉ có giờ - cố gắng map về tiết
    // VD: "(18h40)", "(17h50)->15 (20h40)"
    const timePattern = /(\d{1,2})[hH:](\d{2})/g;
    const times = [...str.matchAll(timePattern)];
    
    if (times.length > 0) {
        const firstTimeStr = `${times[0][1]}h${times[0][2]}`;
        const startPeriod = TIME_TO_PERIOD[firstTimeStr];
        
        if (startPeriod) {
            let endPeriod = startPeriod;
            if (times.length > 1) {
                const lastTimeStr = `${times[times.length - 1][1]}h${times[times.length - 1][2]}`;
                endPeriod = TIME_TO_PERIOD[lastTimeStr] || startPeriod;
            }
            return {
                startPeriod,
                numPeriods: Math.max(1, endPeriod - startPeriod + 1)
            };
        }
    }
    
    // Không parse được
    return null;
};

/**
 * Parse cột Ngày - Chuyển đổi về YYYY-MM-DD
 * Các format có thể gặp:
 * - "19/01/2026->11/05/2026"
 * - "2026-01-19->2026-05-11"
 * - "19/01/2026"
 * - "2026-01-19 00:00:00"
 * - "29/01/2026" (chỉ một ngày)
 */
const parseDateRange = (dateStr) => {
    if (!dateStr) return { startDate: '', endDate: '' };
    
    const raw = String(dateStr).trim();
    
    // Tách theo "->" hoặc "→"
    const parts = raw.split(/[-→>]+/).map(p => p.trim()).filter(p => p);
    
    const parseOneDate = (s) => {
        if (!s) return '';
        
        // Format DD/MM/YYYY hoặc DD-MM-YYYY
        let match = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }
        
        // Format YYYY-MM-DD (có thể có HH:MM:SS)
        match = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return '';
    };
    
    const startDate = parseOneDate(parts[0]);
    const endDate = parts.length > 1 ? parseOneDate(parts[1]) : startDate;
    
    return { startDate, endDate };
};

/**
 * Tìm dòng header trong dữ liệu Excel
 * Trả về chỉ số dòng chứa "STT" ở cột B (hoặc cột khác)
 */
const findHeaderRow = (jsonData) => {
    for (let i = 0; i < Math.min(30, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        // Tìm ô chứa "STT" (thường ở cột B = index 1)
        for (let j = 0; j < Math.min(10, row.length); j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            if (cell === 'stt') {
                return { rowIndex: i, sttColIndex: j };
            }
        }
    }
    return null;
};

/**
 * Xác định chỉ số cột dựa trên header row
 * Trả về mapping các cột quan trọng
 */
const mapColumns = (headerRow, sttColIndex) => {
    const colMap = {
        stt: sttColIndex,
        subject: -1,
        teacher: -1,
        credits: -1,
        classCode: -1,
        day: -1,
        period: -1,
        room: -1,
        dateRange: -1,
        campus: -1
    };
    
    if (!headerRow) return colMap;
    
    for (let i = 0; i < headerRow.length; i++) {
        const cell = String(headerRow[i] || '').toLowerCase().trim();
        
        // Mã LHP/Tên LHP
        if (cell.includes('lhp') || cell.includes('tên lhp') || cell.includes('môn')) {
            if (colMap.subject === -1) colMap.subject = i;
        }
        // Giảng viên
        else if (cell.includes('gv') || cell.includes('giảng viên') || cell.includes('giáo viên')) {
            if (colMap.teacher === -1) colMap.teacher = i;
        }
        // Số tín chỉ
        else if (cell === 'stc' || cell.includes('tín chỉ')) {
            if (colMap.credits === -1) colMap.credits = i;
        }
        // Mã lớp
        else if (cell === 'mã lớp' || cell.includes('mã lớp')) {
            if (colMap.classCode === -1) colMap.classCode = i;
        }
        // Thứ
        else if (cell === 'thứ' || cell.includes('thứ')) {
            if (colMap.day === -1) colMap.day = i;
        }
        // Tiết
        else if (cell.includes('tiết') || cell.includes('giờ') || cell.includes('bắt đầu')) {
            if (colMap.period === -1) colMap.period = i;
        }
        // Phòng
        else if (cell.includes('phòng')) {
            if (colMap.room === -1) colMap.room = i;
        }
        // Ngày
        else if (cell.includes('ngày') || cell.includes('từ ngày')) {
            if (colMap.dateRange === -1) colMap.dateRange = i;
        }
        // Cơ sở
        else if (cell.includes('cơ sở') || cell === 'campus') {
            if (colMap.campus === -1) colMap.campus = i;
        }
    }
    
    return colMap;
};

/**
 * Trích xuất tên môn sạch từ chuỗi "Mã-Tên môn"
 * VD: "2521EDUC280121-Phương pháp học tập hiệu quả" -> "Phương pháp học tập hiệu quả"
 */
const extractSubjectName = (raw) => {
    if (!raw) return '';
    
    let str = String(raw).trim();
    
    // Xử lý wrap text
    str = str.replace(/[\n\r]+/g, ' ');
    
    // Nếu có dạng "Mã-Tên môn", lấy phần sau dấu "-"
    if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length > 1) {
            // Kiểm tra phần đầu có phải mã môn không (bắt đầu bằng số hoặc chữ cái)
            const firstPart = parts[0].trim();
            if (/^[A-Z0-9]{4,}/.test(firstPart)) {
                return parts.slice(1).join('-').trim();
            }
        }
    }
    
    return str.trim();
};

/**
 * Hàm chính xử lý file Excel phức tạp từ trường học
 */
export const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Đọc tất cả dữ liệu dưới dạng mảng 2D
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1, 
                    defval: '',
                    raw: false, // Chuyển đổi tất cả về string để xử lý nhất quán
                    blankrows: true // Giữ lại dòng trống để duy trì index
                });
                
                // Tìm dòng header
                const headerInfo = findHeaderRow(jsonData);
                
                if (!headerInfo) {
                    console.warn('Không tìm thấy dòng header (STT), sử dụng fallback');
                }
                
                const headerRowIndex = headerInfo?.rowIndex ?? 0;
                const sttColIndex = headerInfo?.sttColIndex ?? 1;
                
                // Map các cột
                const colMap = mapColumns(jsonData[headerRowIndex], sttColIndex);
                
                // Fallback cho các cột quan trọng nếu không tìm thấy
                // Dựa trên cấu trúc file mẫu: B=STT, C=Subject, D=Teacher, E=STC, F=ClassCode, G=Day, H=Period, I=Room, J=Date, K=Campus
                if (colMap.subject === -1) colMap.subject = sttColIndex + 1;
                if (colMap.teacher === -1) colMap.teacher = sttColIndex + 2;
                if (colMap.credits === -1) colMap.credits = sttColIndex + 3;
                if (colMap.classCode === -1) colMap.classCode = sttColIndex + 4;
                if (colMap.day === -1) colMap.day = sttColIndex + 5;
                if (colMap.period === -1) colMap.period = sttColIndex + 6;
                if (colMap.room === -1) colMap.room = sttColIndex + 7;
                if (colMap.dateRange === -1) colMap.dateRange = sttColIndex + 8;
                if (colMap.campus === -1) colMap.campus = sttColIndex + 9;
                
                const importedClasses = [];
                const warnings = [];
                
                // Context hiện tại (lưu thông tin môn học khi gặp STT mới)
                let currentContext = {
                    subject: '',
                    teacher: '',
                    credits: '',
                    classCode: ''
                };
                
                // Duyệt từ dòng sau header đến hết
                for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;
                    
                    // Lấy giá trị từ các cột
                    const sttValue = String(row[colMap.stt] || '').trim();
                    const subjectValue = String(row[colMap.subject] || '').trim();
                    const teacherValue = String(row[colMap.teacher] || '').trim();
                    const creditsValue = String(row[colMap.credits] || '').trim();
                    const classCodeValue = String(row[colMap.classCode] || '').trim();
                    const dayValue = String(row[colMap.day] || '').trim();
                    const periodValue = String(row[colMap.period] || '').trim();
                    const roomValue = String(row[colMap.room] || '').trim();
                    const dateRangeValue = String(row[colMap.dateRange] || '').trim();
                    const campusValue = String(row[colMap.campus] || '').trim();
                    
                    // Kiểm tra xem có phải dòng bắt đầu môn học mới không (có STT là số)
                    if (sttValue && /^\d+$/.test(sttValue)) {
                        // Cập nhật context mới
                        if (subjectValue) {
                            currentContext.subject = extractSubjectName(subjectValue);
                        }
                        if (teacherValue) {
                            currentContext.teacher = teacherValue.split(/[\n\r]/)[0].trim();
                        }
                        if (creditsValue) {
                            currentContext.credits = creditsValue;
                        }
                        if (classCodeValue) {
                            currentContext.classCode = classCodeValue;
                        }
                    }
                    
                    // Kiểm tra xem dòng có thông tin lịch học không
                    const day = parseDayString(dayValue);
                    const periodInfo = parsePeriodString(periodValue);
                    
                    // Chỉ tạo lớp học khi có đủ thông tin tối thiểu
                    if (day === null || periodInfo === null) {
                        // Bỏ qua dòng này nhưng không báo lỗi nếu là dòng trống hoàn toàn
                        const allEmpty = !sttValue && !subjectValue && !dayValue && !periodValue;
                        if (!allEmpty && (dayValue || periodValue)) {
                            warnings.push(`Dòng ${i + 1}: Thiếu thông tin Thứ hoặc Tiết (Day: "${dayValue}", Period: "${periodValue}")`);
                        }
                        continue;
                    }
                    
                    // Phải có context môn học
                    if (!currentContext.subject) {
                        warnings.push(`Dòng ${i + 1}: Không có tên môn học`);
                        continue;
                    }
                    
                    // Parse ngày
                    const dateInfo = parseDateRange(dateRangeValue);
                    
                    // Tính session dựa trên tiết bắt đầu
                    let session = 'morning';
                    if (periodInfo.startPeriod >= 13) session = 'evening';
                    else if (periodInfo.startPeriod >= 7) session = 'afternoon';
                    
                    // Tạo object lớp học
                    const classObj = {
                        subject: currentContext.subject,
                        teacher: currentContext.teacher,
                        room: roomValue || 'Online',
                        campus: campusValue || 'Cơ sở chính',
                        day: day,
                        session: session,
                        startPeriod: periodInfo.startPeriod,
                        numPeriods: periodInfo.numPeriods,
                        startDate: dateInfo.startDate ? new Date(dateInfo.startDate + 'T00:00:00').toISOString() : null,
                        endDate: dateInfo.endDate ? new Date(dateInfo.endDate + 'T23:59:59').toISOString() : null,
                        dateRangeDisplay: dateInfo.startDate && dateInfo.endDate 
                            ? `${dateInfo.startDate} - ${dateInfo.endDate}` 
                            : '',
                        notes: []
                    };
                    
                    importedClasses.push(classObj);
                }
                
                // Log warnings
                if (warnings.length > 0) {
                    console.warn(`Import Excel - ${warnings.length} dòng không thể xử lý:`);
                    warnings.forEach(w => console.warn(w));
                }
                
                // Nếu có quá nhiều lỗi, có thể cần thông báo
                if (warnings.length > 10) {
                    console.warn(`CẢNH BÁO: Có ${warnings.length} dòng không được import. Vui lòng kiểm tra lại file.`);
                }
                
                resolve(importedClasses);
                
            } catch (error) {
                console.error('Lỗi xử lý file Excel:', error);
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Không thể đọc file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
};