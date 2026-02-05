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
            const resDb = await fetch('/api/exams');
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
        
        // Logic cho đề tự tạo - gọi API chi tiết
        try {
            const res = await fetch(`/api/exams/${examId}`);
            if (!res.ok) return [];
            const data = await res.json();
            if (data.success && data.exam) {
                return data.exam.questionBank || [];
            }
            return [];
        } catch (e) {
            console.error("Lỗi lấy câu hỏi từ API:", e);
            return [];
        }
    },

    // ... (Các hàm create/delete giữ nguyên)
    async createExam(examData) {
        const res = await fetch('/api/create-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(examData)
        });
        return await res.json();
    },

    async deleteExam(examId, username) {
        try {
            const res = await fetch('/api/delete-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId, username })
            });
            
            if (!res.ok) {
                if (res.status === 404) {
                    return { success: false, message: "Không tìm thấy API xóa đề thi!" };
                }
                return { success: false, message: `Lỗi server: ${res.status}` };
            }
            
            return await res.json();
        } catch (error) {
            console.error("Lỗi kết nối API delete-exam:", error);
            return { success: false, message: "Không thể kết nối đến server!" };
        }
    }
};