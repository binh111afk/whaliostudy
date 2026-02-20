import { getFullApiUrl } from '../config/apiConfig';

export const examService = {
    // 1. Lấy danh sách đề (Trộn JSON Client + MongoDB)
    async getExams() {
        let staticExams = [];
        let dbExams = [];

        // 👇 ĐỌC FILE TỪ THƯ MỤC PUBLIC CỦA CLIENT (Không cần Server URL)
        try {
            const resStatic = await fetch('/data/exams.json'); 
            if (resStatic.ok) {
                staticExams = await resStatic.json();
            }
        } catch (e) { 
            console.warn("⚠️ Không tìm thấy file exams.json trong client/public/data"); 
        }

        // Lấy đề user tạo (vẫn gọi API như bình thường)
        try {
            const resDb = await fetch(getFullApiUrl('/api/exams'));
            if (resDb.ok) dbExams = await resDb.json();
        } catch (e) { console.error("Lỗi API exams", e); }

        return [...staticExams, ...dbExams];
    },

    // 2. Lấy câu hỏi chi tiết
    async getQuestionsByExamId(examId, isStatic = false) {
        if (isStatic) {
            try {
                // 👇 ĐỌC FILE TỪ PUBLIC CLIENT
                const res = await fetch('/data/questions.json');
                const data = await res.json();
                
                // Tìm câu hỏi theo key (ID đề)
                // Lưu ý: ID trong JSON thường là string ("1"), examId có thể là number (1)
                return data[String(examId)] || [];
            } catch (e) {
                console.error("Lỗi đọc questions.json", e);
                return [];
            }
        } 
        
        // Logic cũ cho đề tự tạo (giữ nguyên)
        try {
            const res = await fetch(getFullApiUrl('/api/exams'));
            const exams = await res.json();
            const foundExam = exams.find(e => String(e.id) === String(examId));
            return foundExam ? (foundExam.questions || foundExam.questionBank || []) : [];
        } catch (e) {
            return [];
        }
    },

    // ... (Các hàm create/delete giữ nguyên)
    async createExam(examData) {
        const res = await fetch(getFullApiUrl('/api/create-exam'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(examData)
        });
        return await res.json();
    },

    async deleteExam(examId, username) {
        const res = await fetch(getFullApiUrl('/api/delete-exam'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId, username })
        });
        return await res.json();
    }
};