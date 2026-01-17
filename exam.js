// ============================================================================
// PHẦN 1: EXAM RUNNER (HỆ THỐNG CHẠY BÀI THI)
// ============================================================================
const ExamRunner = {
    // --- STATE ---
    currentExamId: null,
    currentMode: 'practice',
    userAnswers: {},
    timerInterval: null,
    remainingSeconds: 0,
    isSubmitted: false,
    currentQuestions: [],
    questionBank: {},
    allExamsMetadata: [], // [QUAN TRỌNG] Lưu thông tin đề (Time, Title...) để dùng khi thi

    // --- KHỞI TẠO (FIX LỖI F5 MẤT ĐỀ) ---
    async init() {
        try {
            console.log("🚀 Đang khởi động hệ thống thi...");

            // 1. Tải nội dung câu hỏi
            const qResponse = await fetch('questions.json');
            if (qResponse.ok) {
                this.questionBank = await qResponse.json();
            } else {
                this.questionBank = {}; // Tạo rỗng nếu chưa có file
            }

            // 2. [QUAN TRỌNG] Tải danh sách đề thi từ Server ngay lập tức
            // Để đảm bảo khi F5, danh sách đề vẫn hiện ra
            if (window.ExamCreator) {
                await ExamCreator.loadAndRenderExams();
            }

            console.log("✅ Hệ thống đã sẵn sàng!");
        } catch (error) {
            console.error("❌ Lỗi khởi tạo:", error);
        }
    },

    // --- UTILS ---
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // --- MODAL & SETUP ---
    openModeModal(examId) {
        this.currentExamId = examId;

        // Kiểm tra xem đề này có câu hỏi chưa
        const checkData = () => {
            const data = this.questionBank[String(examId)];
            if (!data || data.length === 0) {
                // Nếu chưa thấy, thử tải lại lần nữa (phòng khi mạng lag)
                this.init().then(() => {
                    if (!this.questionBank[String(examId)]) {
                        alert("⚠️ Đề thi này chưa có dữ liệu câu hỏi! (ID: " + examId + ")");
                    } else {
                        document.getElementById('examModeModal').classList.add('active');
                    }
                });
            } else {
                document.getElementById('examModeModal').classList.add('active');
            }
        };
        checkData();
    },

    closeModeModal() {
        document.getElementById('examModeModal').classList.remove('active');
    },

    closeConfirmModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // --- BẮT ĐẦU THI (FIX LỖI MẤT THỜI GIAN) ---
    startExam(mode) {
        this.closeModeModal();
        this.currentMode = mode;
        this.userAnswers = {};
        this.isSubmitted = false;

        // 1. Lấy nội dung câu hỏi
        const rawData = this.questionBank[String(this.currentExamId)];
        if (!rawData || rawData.length === 0) { alert("Lỗi dữ liệu câu hỏi!"); return; }

        // 2. [FIX] Lấy cấu hình Thời gian & Số câu từ biến allExamsMetadata
        // Tìm đề thi hiện tại trong danh sách đã tải từ server
        const examConfig = this.allExamsMetadata.find(e => e.id == this.currentExamId);

        let limit = rawData.length; // Mặc định
        let durationMinutes = 45;   // Mặc định

        if (examConfig) {
            // Nếu tìm thấy config, lấy thông tin chuẩn
            if (examConfig.questions) limit = parseInt(examConfig.questions);
            if (examConfig.time) durationMinutes = parseInt(examConfig.time);
        }

        console.log(`🏁 Bắt đầu thi: ID=${this.currentExamId}, Time=${durationMinutes}p, Limit=${limit} câu`);

        // 3. Trộn và cắt câu hỏi
        let questionsToShuffle = JSON.parse(JSON.stringify(rawData));
        questionsToShuffle = this.shuffleArray(questionsToShuffle);

        if (questionsToShuffle.length > limit) {
            questionsToShuffle = questionsToShuffle.slice(0, limit);
        }

        // 4. Trộn đáp án
        this.currentQuestions = questionsToShuffle.map((q, index) => {
            const correctContent = q.options[q.answer];
            const shuffledOptions = this.shuffleArray([...q.options]);
            return {
                ...q,
                id: index + 1,
                options: shuffledOptions,
                answer: shuffledOptions.indexOf(correctContent)
            };
        });

        // 5. Chuyển giao diện
        this.switchUI('exam');
        this.renderQuestions();
        this.renderQuestionMap();

        const barEl = document.getElementById('main-progress-bar');
        const percentTextEl = document.getElementById('progress-percent-text');
        if (barEl) barEl.style.width = '0%';
        if (percentTextEl) percentTextEl.textContent = '0%';

        // 6. Xử lý đồng hồ
        const timerEl = document.getElementById('exam-timer');
        this.stopTimer();

        if (this.currentMode === 'real') {
            if (timerEl) timerEl.style.display = 'flex';
            this.remainingSeconds = durationMinutes * 60; // Set thời gian chuẩn
            this.startTimer();
        } else {
            if (timerEl) timerEl.style.display = 'none';
        }
    },

    switchUI(view) {
        const sections = ['exams-list-container', 'docs-filter', 'page-header', 'sidebar-right'];
        const examUI = document.getElementById('active-exam-wrapper');
        const container = document.querySelector('.container');

        if (view === 'exam') {
            sections.forEach(cls => {
                const el = document.querySelector('.' + cls) || document.getElementById(cls);
                if (el) el.style.display = 'none';
            });
            container.classList.add('exam-mode-active');

            const examContainer = document.getElementById('exams-section');
            const template = document.getElementById('exam-interface-template').innerHTML;

            if (!examUI) {
                const wrapper = document.createElement('div');
                wrapper.id = 'active-exam-wrapper';
                examContainer.appendChild(wrapper);
                wrapper.innerHTML = template;
            } else {
                examUI.style.display = 'block';
                examUI.innerHTML = template;
            }
        } else {
            // Quay về Dashboard
            sections.forEach(cls => {
                const el = document.querySelector('.' + cls) || document.getElementById(cls);
                if (el) el.style.display = (cls === 'exams-list-container') ? 'grid' : 'flex';
            });
            if (examUI) examUI.style.display = 'none';
            container.classList.remove('exam-mode-active');
        }
    },

    renderQuestions() {
        const container = document.getElementById('questions-container');
        container.innerHTML = this.currentQuestions.map((q, index) => `
            <div class="question-card" id="q-card-${q.id}">
                <div class="question-header">
                    <div class="q-number">${index + 1}</div>
                    <div class="q-text">${q.question}</div>
                </div>
                <div class="options-list">
                    ${q.options.map((opt, optIndex) => `
                        <div class="option-item" id="opt-${q.id}-${optIndex}" onclick="ExamRunner.selectOption(${q.id}, ${optIndex})">
                            <div class="option-label">${String.fromCharCode(65 + optIndex)}</div>
                            <div class="option-content">${opt}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="explanation-box" id="explain-${q.id}">
                    <strong>💡 Giải thích:</strong> ${q.explanation || "Không có giải thích chi tiết."}
                </div>
            </div>
        `).join('');
        this.updateProgress();
    },

    renderQuestionMap() {
        const mapContainer = document.getElementById('question-map-grid');
        if (!mapContainer) return;
        mapContainer.innerHTML = this.currentQuestions.map((q) => `
            <div class="map-node" id="map-node-${q.id}" onclick="ExamRunner.scrollToQuestion(${q.id})">${q.id}</div>
        `).join('');
    },

    scrollToQuestion(questionId) {
        document.getElementById(`q-card-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    selectOption(questionId, optionIndex) {
        if (this.isSubmitted) return;
        this.userAnswers[questionId] = optionIndex;

        const qCard = document.getElementById(`q-card-${questionId}`);
        qCard.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
        document.getElementById(`opt-${questionId}-${optionIndex}`).classList.add('selected');

        const mapNode = document.getElementById(`map-node-${questionId}`);

        if (this.currentMode === 'practice') {
            const question = this.currentQuestions.find(q => q.id === questionId);
            if (optionIndex === question.answer) {
                document.getElementById(`opt-${questionId}-${optionIndex}`).classList.add('correct');
                if (mapNode) { mapNode.classList.remove('done', 'wrong'); mapNode.classList.add('correct'); }
            } else {
                document.getElementById(`opt-${questionId}-${optionIndex}`).classList.add('wrong');
                document.getElementById(`opt-${questionId}-${question.answer}`).classList.add('correct');
                if (mapNode) { mapNode.classList.remove('done', 'correct'); mapNode.classList.add('wrong'); }
            }
            document.getElementById(`explain-${questionId}`).style.display = 'block';
            qCard.querySelectorAll('.option-item').forEach(opt => opt.style.pointerEvents = 'none');
        } else {
            if (mapNode) mapNode.classList.add('done');
        }
        this.updateProgress();
    },

    submitExam(isAutoSubmit = false) {
        if (this.currentMode === 'real' && !isAutoSubmit) {
            const answeredCount = Object.keys(this.userAnswers).length;
            if (answeredCount < this.currentQuestions.length) {
                alert(`Bạn mới làm ${answeredCount}/${this.currentQuestions.length} câu. Hãy hoàn thành hết nhé!`);
                return;
            }
        }
        if (isAutoSubmit) this.confirmSubmit();
        else document.getElementById('submitConfirmModal').classList.add('active');
    },

    confirmSubmit() {
        this.closeConfirmModal('submitConfirmModal');
        this.isSubmitted = true;
        this.stopTimer();
        let correctCount = 0;

        this.currentQuestions.forEach(q => {
            const userChoice = this.userAnswers[q.id];
            document.getElementById(`explain-${q.id}`).style.display = 'block';
            document.getElementById(`opt-${q.id}-${q.answer}`).classList.add('correct');

            const mapNode = document.getElementById(`map-node-${q.id}`);
            if (mapNode) mapNode.classList.remove('done');

            if (userChoice !== undefined) {
                if (userChoice === q.answer) {
                    correctCount++;
                    if (mapNode) mapNode.classList.add('correct');
                } else {
                    document.getElementById(`opt-${q.id}-${userChoice}`).classList.add('wrong');
                    if (mapNode) mapNode.classList.add('wrong');
                }
            } else {
                if (mapNode) mapNode.classList.add('wrong');
            }
        });

        document.querySelectorAll('.option-item').forEach(opt => opt.style.pointerEvents = 'none');
        this.showResultPopup(correctCount);
    },

    showResultPopup(score) {
        const modal = document.getElementById('examResultModal');
        document.getElementById('result-score').textContent = `${score}/${this.currentQuestions.length}`;
        document.getElementById('result-percent').textContent = `${Math.round((score / this.currentQuestions.length) * 100)}%`;
        modal.classList.add('active');
    },

    reviewExam() {
        document.getElementById('examResultModal').classList.remove('active');
        const btn = document.querySelector('.btn-submit-exam');
        if (btn) { btn.textContent = "Thi lại"; btn.classList.add('retry-mode'); btn.onclick = () => this.retryExam(); }
        document.querySelector('.documents-page').scrollIntoView({ behavior: 'smooth' });
    },

    retryExam() {
        this.exitExam(true);
        this.openModeModal(this.currentExamId);
    },

    exitExam(silent = false) {
        if (!silent && !this.isSubmitted && Object.keys(this.userAnswers).length > 0) {
            document.getElementById('exitConfirmModal').classList.add('active');
        } else {
            this.confirmExit();
        }
    },

    confirmExit() {
        this.closeConfirmModal('exitConfirmModal');
        this.stopTimer();
        this.switchUI('dashboard');
    },

    updateProgress() {
        const done = Object.keys(this.userAnswers).length;
        const total = this.currentQuestions.length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        const txt = document.getElementById('progress-text');
        if (txt) txt.textContent = `${done}/${total}`;

        const bar = document.getElementById('main-progress-bar');
        if (bar) bar.style.width = `${percent}%`;

        const pTxt = document.getElementById('progress-percent-text');
        if (pTxt) pTxt.textContent = `${percent}%`;
    },

    startTimer() {
        clearInterval(this.timerInterval);
        const timerEl = document.getElementById('exam-timer');
        this.updateTimerDisplay(timerEl);
        this.timerInterval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.updateTimerDisplay(timerEl);
            } else {
                this.stopTimer();
                alert("Hết giờ!");
                this.submitExam(true);
            }
        }, 1000);
    },

    updateTimerDisplay(timerEl) {
        if (!timerEl) return;
        const mins = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
        const secs = (this.remainingSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        if (this.remainingSeconds < 300) {
            timerEl.style.color = '#dc2626';
            timerEl.style.backgroundColor = '#fef2f2';
            timerEl.style.borderColor = '#fca5a5';
        } else {
            timerEl.style.color = '';
            timerEl.style.backgroundColor = '';
            timerEl.style.borderColor = '';
        }
    },

    stopTimer() { clearInterval(this.timerInterval); }
};

// ============================================================================
// PHẦN 2: EXAM CREATOR (TẠO ĐỀ & QUẢN LÝ ĐỀ THI)
// ============================================================================
const ExamCreator = {
    // --- STATE ---
    tempQuestions: [],
    currentStep: 'upload',

    // Biến tạm để xử lý xóa đề
    pendingDeleteId: null,
    pendingDeleteUser: null,

    // 1. MỞ/ĐÓNG MODAL TẠO ĐỀ
    open() {
        const modal = document.getElementById('createExamModal');
        if (!modal) return alert("Thiếu HTML modal tạo đề!");
        modal.classList.add('active');
        this.setStep('upload');
        document.getElementById('exam-file-upload').value = '';
    },

    close() {
        document.getElementById('createExamModal').classList.remove('active');
    },

    // 2. CHUYỂN BƯỚC (Upload -> Review -> Config)
    setStep(stepName) {
        this.currentStep = stepName;
        ['upload', 'review', 'config'].forEach(id => {
            document.getElementById(`step-${id}`).style.display = 'none';
        });
        const target = document.getElementById(`step-${stepName}`);
        if (target) target.style.display = (stepName === 'review') ? 'flex' : 'block';

        // Cập nhật nút bấm Footer
        const btnBack = document.getElementById('btn-back-step');
        const btnMain = document.getElementById('btn-main-action');

        if (stepName === 'upload') {
            btnBack.style.display = 'none';
            btnMain.style.display = 'none';
        } else if (stepName === 'review') {
            btnBack.style.display = 'block';
            btnBack.textContent = "Chọn file khác";
            btnBack.onclick = () => this.setStep('upload');

            btnMain.style.display = 'block';
            btnMain.textContent = "Tiếp tục cấu hình ➔";
            btnMain.onclick = () => this.goToConfig();
        } else if (stepName === 'config') {
            btnBack.style.display = 'block';
            btnBack.textContent = "Quay lại xem đề";
            btnBack.onclick = () => this.setStep('review');

            btnMain.style.display = 'block';
            btnMain.textContent = "Lưu & Tạo Đề Ngay";
            btnMain.onclick = () => this.saveFromUI();
        }
    },

    // 3. XỬ LÝ FILE WORD (MAMMOTH)
    handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Cấu hình để bắt Highlight và định dạng
            const options = { styleMap: ["highlight => mark", "b => strong", "i => em", "u => u", "strike => del"] };
            mammoth.convertToHtml({ arrayBuffer: e.target.result }, options)
                .then((result) => this.parseHTML(result.value, file.name))
                .catch((err) => alert("Lỗi đọc file!"));
        };
        reader.readAsArrayBuffer(file);
    },

    // 4. PHÂN TÍCH HTML -> JSON
    parseHTML(htmlContent, fileName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const paragraphs = doc.body.querySelectorAll('p');

        let questions = [];
        let currentQ = null;

        // Regex thông minh
        const regexQuestion = /^(Câu\s+\d+|Bài\s+\d+|Question\s+\d+|\d+\.)[\s:.]/i;

        paragraphs.forEach(p => {
            let text = p.innerText.trim();
            const html = p.innerHTML;
            if (!text) return;

            // Phát hiện câu hỏi
            if (regexQuestion.test(text)) {
                if (currentQ) questions.push(currentQ);

                // Logic tách nếu đáp án dính liền (A. B. C. D.)
                let content = text;
                let extractedOptions = [];
                const firstOptIndex = text.search(/A\./);

                if (firstOptIndex > 0) {
                    content = text.substring(0, firstOptIndex).trim();
                    const optionsPart = text.substring(firstOptIndex);
                    // Mẹo: Thêm xuống dòng trước mỗi đáp án để tách dễ hơn
                    const splitText = optionsPart.replace(/([A-D]\.)/g, '\n$1');
                    extractedOptions = splitText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                }

                currentQ = {
                    id: questions.length + 1,
                    question: content,
                    options: [],
                    answer: -1,
                    explanation: ""
                };

                if (extractedOptions.length > 0) {
                    extractedOptions.forEach((optStr) => {
                        currentQ.options.push(optStr.replace(/^[A-D]\./, '').trim());
                    });
                    currentQ.answer = 0; // Mặc định A nếu tự tách
                }
            }
            // Phát hiện đáp án
            else if (currentQ && /^[A-D]\./.test(text)) {
                // Tách nếu 1 dòng có nhiều đáp án
                const splitText = text.replace(/([A-D]\.)/g, '\n$1');
                const parts = splitText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

                parts.forEach(part => {
                    const cleanOpt = part.replace(/^[A-D]\./, '').trim();
                    currentQ.options.push(cleanOpt);

                    // Logic nhận diện đáp án đúng (Màu đỏ, In đậm, Highlight, Gạch chân)
                    if (html.includes('<mark>') || html.includes('color:') || html.includes('strong') || html.includes('<u>')) {
                        currentQ.answer = currentQ.options.length - 1;
                    }
                });
            }
        });
        if (currentQ) questions.push(currentQ);

        if (questions.length === 0) { alert("Không tìm thấy câu hỏi! File cần đúng định dạng."); return; }

        this.tempQuestions = questions;
        document.getElementById('new-exam-title').value = fileName.replace('.docx', '');

        this.renderReviewUI();
        this.setStep('review');
    },

    // 5. RENDER GIAO DIỆN REVIEW
    renderReviewUI() {
        const container = document.getElementById('review-list');
        if (!container) return;
        container.innerHTML = '';

        this.tempQuestions.forEach((q, idx) => {
            const item = document.createElement('div');
            item.className = 'review-item';

            let optionsHTML = '';
            if (!q.options || q.options.length === 0) q.options = ["", "", "", ""];

            q.options.forEach((opt, optIdx) => {
                const isChecked = (optIdx === q.answer) ? 'checked' : '';
                const activeClass = (optIdx === q.answer) ? 'correct' : '';
                const label = String.fromCharCode(65 + optIdx);

                optionsHTML += `
                    <div class="review-opt ${activeClass}" onclick="ExamCreator.selectAnswer(${idx}, ${optIdx})">
                        <input type="radio" name="radio-${idx}" ${isChecked}>
                        <span style="font-weight:bold; color:#6b7280; width: 20px;">${label}.</span>
                        <input type="text" class="review-opt-input" value="${opt}" onchange="ExamCreator.updateOptionText(${idx}, ${optIdx}, this.value)" placeholder="Nhập đáp án...">
                    </div>
                `;
            });

            item.innerHTML = `
                <div class="review-item-header">
                    <span class="review-q-label">Câu ${idx + 1}</span>
                    <div class="btn-del-q" onclick="ExamCreator.deleteQuestion(${idx})">🗑️ Xóa</div>
                </div>
                <textarea class="review-q-input" onchange="ExamCreator.updateQuestionText(${idx}, this.value)">${q.question}</textarea>
                <div class="review-opts-list">${optionsHTML}</div>
            `;
            container.appendChild(item);
        });
    },

    // --- Helpers Review ---
    selectAnswer(qIdx, optIdx) {
        this.tempQuestions[qIdx].answer = optIdx;
        this.renderReviewUI();
    },
    updateQuestionText(idx, val) { this.tempQuestions[idx].question = val; },
    updateOptionText(qIdx, optIdx, val) { this.tempQuestions[qIdx].options[optIdx] = val; },
    deleteQuestion(index) {
        if (!confirm("Xóa câu này?")) return;
        this.tempQuestions.splice(index, 1);
        this.renderReviewUI();
        document.getElementById('found-questions').innerText = this.tempQuestions.length;
    },

    // 6. CẤU HÌNH & LƯU
    goToConfig() {
        if (this.tempQuestions.length === 0) { alert("Đề thi trống!"); return; }
        document.getElementById('found-questions').innerText = this.tempQuestions.length;
        document.getElementById('new-exam-limit').value = this.tempQuestions.length;
        this.setStep('config');
    },

    async saveFromUI() {
        const title = document.getElementById('new-exam-title').value;
        const time = document.getElementById('new-exam-time').value;
        const limit = parseInt(document.getElementById('new-exam-limit').value);
        const subject = document.getElementById('new-exam-subject').value;

        if (!title) { alert("Nhập tên đề thi!"); return; }

        // --- 1. LOGIC CHỌN ẢNH THEO MÔN HỌC ---
        // Bạn có thể thay đổi đường dẫn ảnh cho khớp với folder ./img/ của bạn
        let examImage = "./img/snvvnghen.png"; // Mặc định

        switch (subject) {
            case "Pháp luật":
                examImage = "./img/pldc-pic.png";
                break;
            case "Tâm lý":
                examImage = "./img/tlhdc-pic.png";
                break;
            case "Toán":
                examImage = "./img/trr-pic.png";
                break;
            case "Triết học":
                examImage = "./img/triethoc-pic.png";
                break;
            case "Văn":
                examImage = "https://cdn-icons-png.flaticon.com/512/3976/3976625.png"; // Ví dụ ảnh mạng
                break;
            case "Anh":
                examImage = "https://cdn-icons-png.flaticon.com/512/3269/3269817.png";
                break;
            default:
                examImage = "./img/snvvnghen.png";
        }
        // ----------------------------------------

        const payload = {
            id: Date.now(),
            title: title,
            // Xử lý luôn chữ "phút" ở đây để đồng bộ
            time: time.toString().includes("phút") ? time : `${time} phút`,
            limit: limit,
            subject: subject,
            image: examImage, // <--- Gửi ảnh lên server
            questions: this.tempQuestions
        };

        try {
            const response = await fetch('/api/create-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                alert("✅ Đã tạo đề thi thành công!");
                this.close();
                this.switchToExamsTab();
                // Reload dữ liệu để ExamRunner cập nhật metadata mới
                if (window.ExamRunner) await ExamRunner.init();
            } else {
                alert("Lỗi: " + result.message);
            }
        } catch (error) {
            alert("Lỗi kết nối Server!");
        }
    },

    async switchToExamsTab() {
        // Ẩn/Hiện các section
        document.getElementById('main-dashboard').style.display = 'none';
        document.getElementById('profile-section').style.display = 'none';
        document.getElementById('documents-section').style.display = 'none';
        document.getElementById('exams-section').style.display = 'block';

        // Active sidebar menu - "Thi online" là phần tử thứ 4 (index 3)
        const sidebarLinks = document.querySelectorAll('.sidebar-left .nav-menu a');
        if (sidebarLinks && sidebarLinks[3]) {
            document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
            sidebarLinks[3].classList.add('active');
        }

        await this.loadAndRenderExams();
    },

    // 7. LOAD DANH SÁCH ĐỀ THI (CÓ NÚT XÓA + FIX TIME)
    async loadAndRenderExams() {
        try {
            // Lấy thông tin user để check quyền Admin
            const currentUserStr = localStorage.getItem('currentUser');
            let isAdmin = false;
            let currentUsername = "";

            if (currentUserStr) {
                const user = JSON.parse(currentUserStr);
                if (user.role === 'admin') {
                    isAdmin = true;
                    currentUsername = user.username;
                }
            }

            const response = await fetch('/api/exams');
            if (!response.ok) throw new Error("Không thể tải danh sách đề");

            const exams = await response.json();

            // Lưu vào biến toàn cục của ExamRunner để dùng khi thi (Timer chuẩn)
            if (window.ExamRunner) {
                window.ExamRunner.allExamsMetadata = exams;
            }

            const container = document.getElementById('exams-list-container');
            if (!container) return;
            container.innerHTML = '';

            exams.forEach(exam => {
                // --- XỬ LÝ NÚT XÓA (ADMIN ONLY) ---
                let deleteBtnHTML = '';
                if (isAdmin) {
                    // Dùng class 'btn-delete-exam' để CSS xử lý hover
                    // Gọi hàm mở Modal Xóa thay vì confirm()
                    deleteBtnHTML = `
                        <button class="btn-delete-exam"
                                onclick="event.stopPropagation(); ExamCreator.openDeleteModal(${exam.id}, '${currentUsername}')" 
                                title="Xóa đề thi (Admin)">
                            🗑️
                        </button>
                    `;
                }

                // --- XỬ LÝ HIỂN THỊ THỜI GIAN (FIX LỖI THIẾU CHỮ PHÚT) ---
                let displayTime = exam.time;
                // Nếu chỉ là số (ví dụ: "45" hoặc 45), cộng thêm chữ "phút"
                // Nếu đã có chữ (ví dụ: "45 phút"), giữ nguyên
                if (!String(displayTime).toLowerCase().includes('phút')) {
                    displayTime = `${displayTime} phút`;
                }

                const card = document.createElement('div');
                card.className = 'exam-card';
                card.style.position = 'relative'; // Để định vị nút xóa

                card.innerHTML = `
                    ${deleteBtnHTML}
                    <div class="exam-thumb-wrapper">
                        <span class="exam-tag">${exam.subject}</span>
                        <img src="${exam.image || './img/snvvnghen.png'}" class="exam-thumb">
                    </div>
                    <div class="exam-content">
                        <h3 class="exam-title">${exam.title}</h3>
                        <p class="exam-desc">Thời gian: ${displayTime} • Số câu: ${exam.questions}</p>
                        <div class="exam-meta">
                            <div>📝 ${exam.questions} câu</div>
                            <div>⏱️ ${displayTime}</div>
                        </div>
                        <button class="btn-start-exam" onclick="ExamRunner.openModeModal(${exam.id})">Làm bài ngay ➔</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Lỗi tải danh sách đề:", error);
        }
    },

    // 8. CÁC HÀM XỬ LÝ XÓA (MODAL MỚI)

    // Mở Modal xác nhận
    openDeleteModal(examId, username) {
        this.pendingDeleteId = examId;
        this.pendingDeleteUser = username;
        // Giả sử bạn đã thêm HTML Modal vào index.html
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) modal.classList.add('active');
        else {
            // Fallback nếu chưa có Modal HTML thì dùng confirm thường
            if (confirm("Bạn muốn xóa đề thi này chứ?")) {
                this.confirmDeleteAction();
            }
        }
    },

    // Đóng Modal
    closeDeleteModal() {
        this.pendingDeleteId = null;
        this.pendingDeleteUser = null;
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) modal.classList.remove('active');
    },

    // Thực thi API Xóa
    async confirmDeleteAction() {
        if (!this.pendingDeleteId) return;

        const examId = this.pendingDeleteId;
        const username = this.pendingDeleteUser;

        // Hiệu ứng nút bấm
        const modalBtn = document.querySelector('#deleteConfirmModal button:last-child');
        if (modalBtn) modalBtn.textContent = "Đang xóa...";

        try {
            const response = await fetch('/api/delete-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId, username })
            });

            const result = await response.json();

            if (result.success) {
                // Xóa thành công
                this.closeDeleteModal();
                await this.loadAndRenderExams(); // Load lại danh sách ngay lập tức
            } else {
                alert("❌ Lỗi: " + result.message);
                this.closeDeleteModal();
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối Server!");
            this.closeDeleteModal();
        } finally {
            if (modalBtn) modalBtn.textContent = "Xóa ngay"; // Reset nút
        }
    }
};

// Gán vào window
window.ExamRunner = ExamRunner;
window.ExamCreator = ExamCreator;

// [QUAN TRỌNG] GỌI HÀM INIT KHI TRANG WEB VỪA TẢI XONG
// Điều này đảm bảo dù F5 thì dữ liệu vẫn được tải lại ngay lập tức
ExamRunner.init();