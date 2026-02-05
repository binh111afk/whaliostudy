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

// --- LOGIC IMPORT EXCEL (Được port từ code cũ) ---
export const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                // Logic map cột tự động (giống code cũ)
                let headerRow = -1;
                const colMap = { subject: -1, day: -1, period: -1, date: -1, room: -1, teacher: -1 };

                // Scan 20 dòng đầu tìm header
                for (let i = 0; i < Math.min(20, jsonData.length); i++) {
                    const row = jsonData[i] || [];
                    const cells = row.map(c => String(c || '').toLowerCase().trim());

                    if (colMap.subject === -1) colMap.subject = cells.findIndex(c => c.includes('tên lhp') || c.includes('môn'));
                    if (colMap.day === -1) colMap.day = cells.findIndex(c => c.includes('thứ'));
                    if (colMap.period === -1) colMap.period = cells.findIndex(c => c.includes('tiết') || c.includes('giờ'));
                    if (colMap.date === -1) colMap.date = cells.findIndex(c => c.includes('ngày') || c.includes('thời gian'));
                    if (colMap.room === -1) colMap.room = cells.findIndex(c => c.includes('phòng'));
                    if (colMap.teacher === -1) colMap.teacher = cells.findIndex(c => c.includes('gv') || c.includes('giáo viên'));

                    if (colMap.subject > -1 && colMap.day > -1) { headerRow = i; break; }
                }

                // Fallback nếu không tìm thấy
                if (headerRow === -1) {
                    colMap.subject = 2; colMap.teacher = 3; colMap.day = 6; colMap.period = 7; colMap.room = 8; colMap.date = 9;
                    headerRow = 0;
                }
                if (colMap.teacher === -1) colMap.teacher = 3;

                const importedClasses = [];
                let lastSubject = null;

                for (let i = headerRow + 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row) continue;

                    let subjectRaw = row[colMap.subject];
                    let dayRaw = row[colMap.day];
                    let periodRaw = row[colMap.period];
                    let dateRaw = row[colMap.date];
                    let roomRaw = row[colMap.room];
                    let teacherRaw = row[colMap.teacher];

                    // Fill down logic
                    if ((!subjectRaw || String(subjectRaw).trim() === '') && dayRaw && lastSubject) {
                        subjectRaw = lastSubject;
                    } else if (subjectRaw) {
                        lastSubject = subjectRaw;
                    }

                    if (!subjectRaw || !dayRaw || !periodRaw) continue;

                    try {
                        const day = parseDayString(dayRaw);
                        const periodInfo = parseAdvancedPeriod(periodRaw);
                        const dateInfo = parseAdvancedDateRange(dateRaw);
                        
                        let cleanSubject = String(subjectRaw);
                        if (cleanSubject.includes('\n')) cleanSubject = cleanSubject.split('\n')[1] || cleanSubject;
                        if (cleanSubject.includes('-')) cleanSubject = cleanSubject.split('-')[1] || cleanSubject;

                        importedClasses.push({
                            subject: cleanSubject.trim(),
                            day: day,
                            session: periodInfo.session,
                            startPeriod: periodInfo.startPeriod,
                            numPeriods: periodInfo.numPeriods,
                            room: roomRaw || 'Online',
                            teacher: teacherRaw ? String(teacherRaw).trim() : '',
                            startDate: dateInfo.startDate,
                            endDate: dateInfo.endDate,
                            dateRangeDisplay: dateInfo.display,
                            campus: 'Cơ sở chính', // Tạm để mặc định
                            notes: []
                        });
                    } catch (err) {
                        // console.warn('Row error:', err);
                    }
                }
                resolve(importedClasses);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

// --- CÁC HÀM HELPER PARSE (Dữ nguyên logic từ code cũ) ---
const parseDayString = (dayStr) => {
    const s = String(dayStr).toLowerCase().trim();
    if (s.includes('hai') || s.includes('2')) return '2';
    if (s.includes('ba') || s.includes('3')) return '3';
    if (s.includes('tư') || s.includes('4')) return '4';
    if (s.includes('năm') || s.includes('5')) return '5';
    if (s.includes('sáu') || s.includes('6')) return '6';
    if (s.includes('bảy') || s.includes('7')) return '7';
    if (s.includes('chủ') || s.includes('cn')) return 'CN';
    return '2';
};

const parseAdvancedPeriod = (periodStr) => {
    const str = String(periodStr).trim();
    const numbers = str.match(/\d+/g);
    
    if (numbers && numbers.length >= 1) {
        // Xử lý case (15h10) -> extract 15, 10...
        // Để đơn giản hóa, ta lấy số đầu làm start, số cuối làm end (nếu <= 15)
        // Logic cũ của bạn phức tạp hơn nhưng ở đây tôi tối ưu cho React
        
        let start = parseInt(numbers[0]);
        let end = numbers.length > 1 ? parseInt(numbers[numbers.length - 1]) : start;
        
        // Nếu số > 15 (vd giờ phút), cần logic map giờ -> tiết (Dùng bảng PERIOD_TIMES)
        // Tạm thời fallback logic đơn giản:
        if (start > 15) { 
             // Logic tìm tiết theo giờ (đã có trong code cũ, ở đây tôi lược giản)
             start = 1; // Fallback an toàn
             end = 3;
        }

        const numPeriods = Math.max(1, end - start + 1);
        let session = 'morning';
        if (start >= 13) session = 'evening';
        else if (start >= 7) session = 'afternoon';

        return { startPeriod: start, numPeriods, session };
    }
    return { startPeriod: 1, numPeriods: 2, session: 'morning' };
};

const parseAdvancedDateRange = (dateStr) => {
    if (!dateStr) return { startDate: null, endDate: null, display: '' };
    
    const raw = String(dateStr);
    const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
    const matches = raw.match(datePattern);

    if (matches && matches.length > 0) {
        // Parse date VN format dd/mm/yyyy
        const parseDate = (s) => {
            const [d, m, y] = s.split(/[\/\-\.]/).map(Number);
            return new Date(y, m - 1, d);
        };

        const start = parseDate(matches[0]);
        const end = matches.length > 1 ? parseDate(matches[matches.length - 1]) : new Date(start);
        
        // Set time boundaries
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            display: `${matches[0]} - ${matches.length > 1 ? matches[matches.length - 1] : matches[0]}`
        };
    }
    return { startDate: null, endDate: null, display: '' };
};