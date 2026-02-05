import { ICON_CLIPBOARD, ICON_CLOCK } from './icons.js';

// ==================== EXAM RUNNER (HỆ THỐNG CHẠY BÀI THI) ====================
export const ExamRunner = {
    // --- STATE ---
    currentExamId: null,
    currentMode: 'practice',
    userAnswers: {},
    timerInterval: null,
    remainingSeconds: 0,
    isSubmitted: false,
    currentQuestions: [],
    questionBank: {},
    allExamsMetadata: [],

    // --- KHỞI TẠO ---
    async init() {
        try {
            console.log("🚀 Đang khởi động hệ thống thi...");

            // Load exams from MongoDB API
            await this.loadExamsAndQuestions();

            if (window.ExamCreator) {
                await ExamCreator.loadAndRenderExams();
            }

            console.log("✅ Hệ thống đã sẵn sàng!");
        } catch (error) {
            console.error("❌ Lỗi khởi tạo:", error);
        }
    },

    async loadExamsAndQuestions() {
        try {
            const response = await fetch('/api/exams');
            if (!response.ok) {
                console.error('Failed to load exams from API');
                this.questionBank = {};
                this.allExamsMetadata = [];
                return;
            }

            const exams = await response.json();
            
            // Build question bank from exams
            this.questionBank = {};
            this.allExamsMetadata = exams;
            
            exams.forEach(exam => {
                if (exam.questionBank && exam.questionBank.length > 0) {
                    this.questionBank[String(exam.id)] = exam.questionBank;
                }
            });

            console.log(`✅ Loaded ${exams.length} exams with ${Object.keys(this.questionBank).length} question banks from MongoDB`);
        } catch (error) {
            console.error('Error loading exams and questions:', error);
            this.questionBank = {};
            this.allExamsMetadata = [];
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    openModeModal(examId) {
        this.currentExamId = examId;

        const checkData = () => {
            const data = this.questionBank[String(examId)];
            if (!data || data.length === 0) {
                // Reload from API if data not found
                this.loadExamsAndQuestions().then(() => {
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

    startExam(mode) {
        this.closeModeModal();
        this.currentMode = mode;
        this.userAnswers = {};
        this.isSubmitted = false;

        const rawData = this.questionBank[String(this.currentExamId)];
        if (!rawData || rawData.length === 0) { alert("Lỗi dữ liệu câu hỏi!"); return; }

        const examConfig = this.allExamsMetadata.find(e => e.id == this.currentExamId);

        let limit = rawData.length;
        let durationMinutes = 45;

        if (examConfig) {
            if (examConfig.questions) limit = parseInt(examConfig.questions);
            if (examConfig.time) durationMinutes = parseInt(examConfig.time);
        }

        console.log(`🏁 Bắt đầu thi: ID=${this.currentExamId}, Time=${durationMinutes}p, Limit=${limit} câu`);

        let questionsToShuffle = JSON.parse(JSON.stringify(rawData));
        questionsToShuffle = this.shuffleArray(questionsToShuffle);

        if (questionsToShuffle.length > limit) {
            questionsToShuffle = questionsToShuffle.slice(0, limit);
        }

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

        this.switchUI('exam');
        this.renderQuestions();
        this.renderQuestionMap();

        const barEl = document.getElementById('main-progress-bar');
        const percentTextEl = document.getElementById('progress-percent-text');
        if (barEl) barEl.style.width = '0%';
        if (percentTextEl) percentTextEl.textContent = '0%';

        const timerEl = document.getElementById('exam-timer');
        this.stopTimer();

        if (this.currentMode === 'real') {
            if (timerEl) timerEl.style.display = 'flex';
            this.remainingSeconds = durationMinutes * 60;
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
        container.innerHTML = this.currentQuestions.map((q, index) => {
            // Essay question rendering
            if (q.type === 'essay') {
                return `
                    <div class="question-card" id="q-card-${q.id}">
                        <div class="question-header">
                            <div class="q-number">${index + 1}</div>
                            <div class="q-text">${q.question}</div>
                        </div>
                        <div class="essay-answer-area" style="margin-top: 16px;">
                            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px;">📝 Câu trả lời của bạn:</label>
                            <textarea 
                                id="essay-${q.id}" 
                                class="essay-textarea" 
                                placeholder="Nhập câu trả lời của bạn vào đây..."
                                oninput="ExamRunner.saveEssayAnswer(${q.id}, this.value)"
                                style="width: 100%; min-height: 150px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"
                            >${this.userAnswers[q.id] || ''}</textarea>
                        </div>
                        <div class="explanation-box" id="explain-${q.id}" style="display: none;">
                            <strong>💡 Gợi ý:</strong> ${q.explanation || "Câu hỏi tự luận, không có đáp án chuẩn."}
                        </div>
                    </div>
                `;
            }
            
            // Multiple choice rendering (existing)
            return `
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
            `;
        }).join('');
        this.updateProgress();
    },

    saveEssayAnswer(questionId, text) {
        this.userAnswers[questionId] = text;
        const mapNode = document.getElementById(`map-node-${questionId}`);
        if (mapNode) {
            if (text.trim().length > 0) {
                mapNode.classList.add('done');
            } else {
                mapNode.classList.remove('done');
            }
        }
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

// ==================== EXAM CREATOR ====================
export const ExamCreator = {
    tempQuestions: [],
    currentStep: 'mode-selection',
    selectedMode: 'multiple_choice', // 'multiple_choice' or 'essay'
    allExamsMetadata: [],
    pendingDeleteId: null,
    pendingDeleteUser: null,

    open() {
        const modal = document.getElementById('createExamModal');
        if (!modal) return alert("Thiếu HTML modal tạo đề!");
        modal.classList.add('active');
        this.setStep('mode-selection');
        this.selectedMode = 'multiple_choice';
        document.getElementById('exam-file-upload').value = '';
    },

    selectMode(mode) {
        this.selectedMode = mode;
        console.log('📌 Selected exam mode:', mode);
        this.setStep('upload');
    },

    close() {
        document.getElementById('createExamModal').classList.remove('active');
    },

    setStep(stepName) {
        this.currentStep = stepName;
        ['mode-selection', 'upload', 'review', 'config'].forEach(id => {
            const el = document.getElementById(`step-${id}`);
            if (el) el.style.display = 'none';
        });
        const target = document.getElementById(`step-${stepName}`);
        if (target) target.style.display = (stepName === 'review') ? 'flex' : 'block';

        const btnBack = document.getElementById('btn-back-step');
        const btnMain = document.getElementById('btn-main-action');

        if (stepName === 'mode-selection') {
            btnBack.style.display = 'none';
            btnMain.style.display = 'none';
        } else if (stepName === 'upload') {
            btnBack.style.display = 'block';
            btnBack.textContent = "← Quay lại";
            btnBack.onclick = () => this.setStep('mode-selection');
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

    handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const options = { styleMap: ["highlight => mark", "b => strong", "i => em", "u => u", "strike => del"] };
            mammoth.convertToHtml({ arrayBuffer: e.target.result }, options)
                .then((result) => this.parseHTML(result.value, file.name))
                .catch((err) => alert("Lỗi đọc file!"));
        };
        reader.readAsArrayBuffer(file);
    },

    parseHTML(htmlContent, fileName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const paragraphs = doc.body.querySelectorAll('p');

        let questions = [];
        let currentQ = null;

        const regexQuestion = /^(Câu\s+\d+|Bài\s+\d+|Question\s+\d+|\d+\.)[\s:.]/i;
        // Essay mode: simpler parsing without looking for A/B/C/D
        if (this.selectedMode === 'essay') {
            paragraphs.forEach(p => {
                let text = p.innerText.trim();
                if (!text) return;

                if (regexQuestion.test(text)) {
                    if (currentQ) questions.push(currentQ);

                    currentQ = {
                        id: questions.length + 1,
                        question: text,
                        options: [], // Empty for essay
                        answer: -1, // No correct answer for essay
                        explanation: "",
                        type: 'essay'
                    };
                } else if (currentQ) {
                    // Append additional paragraphs to question text
                    currentQ.question += '\n' + text;
                }
            });
            if (currentQ) questions.push(currentQ);

            if (questions.length === 0) { 
                alert("Không tìm thấy câu hỏi! File cần có định dạng: 'Câu 1:', 'Bài 1:', etc."); 
                return; 
            }

            this.tempQuestions = questions;
            document.getElementById('new-exam-title').value = fileName.replace('.docx', '') + ' (Tự luận)';
            this.renderReviewUI();
            this.setStep('review');
            return;
        }

        // Multiple choice mode: existing logic
        paragraphs.forEach(p => {
            let text = p.innerText.trim();
            const html = p.innerHTML;
            if (!text) return;

            if (regexQuestion.test(text)) {
                if (currentQ) questions.push(currentQ);

                let content = text;
                let extractedOptions = [];
                const firstOptIndex = text.search(/A\./);

                if (firstOptIndex > 0) {
                    content = text.substring(0, firstOptIndex).trim();
                    const optionsPart = text.substring(firstOptIndex);
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
                    currentQ.answer = 0;
                }
            }
            else if (currentQ && /^[A-D]\./.test(text)) {
                const splitText = text.replace(/([A-D]\.)/g, '\n$1');
                const parts = splitText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

                parts.forEach(part => {
                    const cleanOpt = part.replace(/^[A-D]\./, '').trim();
                    currentQ.options.push(cleanOpt);

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

    renderReviewUI() {
        const container = document.getElementById('review-list');
        if (!container) return;
        container.innerHTML = '';

        this.tempQuestions.forEach((q, idx) => {
            const item = document.createElement('div');
            item.className = 'review-item';
            
            // Essay question rendering
            if (q.type === 'essay') {
                item.innerHTML = `
                    <div class="review-q-header">
                        <span class="review-q-num">📝 Câu ${idx + 1}</span>
                        <div class="btn-del-q" onclick="ExamCreator.deleteQuestion(${idx})">🗑️ Xóa</div>
                    </div>
                    <textarea class="review-q-input" onchange="ExamCreator.updateQuestionText(${idx}, this.value)" 
                        style="min-height: 100px;">${q.question}</textarea>
                    <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 13px; color: #166534;">
                        <b>💡 Dạng tự luận:</b> Học sinh sẽ nhập câu trả lời vào ô văn bản.
                    </div>
                `;
                container.appendChild(item);
                return;
            }
            
            // Multiple choice question rendering (existing code)

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

        let examImage = "./img/snvvnghen.png";

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
                examImage = "https://cdn-icons-png.flaticon.com/512/3976/3976625.png";
                break;
            case "Anh":
                examImage = "https://cdn-icons-png.flaticon.com/512/3269/3269817.png";
                break;
            default:
                examImage = "./img/snvvnghen.png";
        }

        const payload = {
            id: Date.now(),
            title: title,
            time: time.toString().includes("phút") ? time : `${time} phút`,
            limit: limit,
            subject: subject,
            type: this.selectedMode, // 'multiple_choice' or 'essay'
            image: examImage,
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
                // Show success notification
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: 'Đề thi mới đã được tạo.',
                    confirmButtonText: 'OK',
                    confirmButtonColor: 'var(--primary-color)',
                    didClose: () => {
                        this.close();
                        this.switchToExamsTab();
                        if (window.ExamRunner) ExamRunner.init();
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: result.message || 'Không thể tạo đề thi.',
                    confirmButtonColor: 'var(--primary-color)'
                });
            }
        } catch (error) {
            alert("Lỗi kết nối Server!");
        }
    },

    async switchToExamsTab() {
        document.getElementById('main-dashboard').style.display = 'none';
        document.getElementById('profile-section').style.display = 'none';
        document.getElementById('documents-section').style.display = 'none';
        document.getElementById('exams-section').style.display = 'block';

        const sidebarLinks = document.querySelectorAll('.sidebar-left .nav-menu a');
        if (sidebarLinks && sidebarLinks[3]) {
            document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
            sidebarLinks[3].classList.add('active');
        }

        await this.loadAndRenderExams();
    },

    async loadAndRenderExams() {
        try {
            const currentUserStr = localStorage.getItem('currentUser');
            let isAdmin = false;
            let currentUsername = "";
            let currentUserRole = "";

            if (currentUserStr) {
                const user = JSON.parse(currentUserStr);
                currentUsername = user.username;
                currentUserRole = user.role;
                if (user.role === 'admin') {
                    isAdmin = true;
                }
            }

            const response = await fetch('/api/exams');
            if (!response.ok) throw new Error("Không thể tải danh sách đề");

            const exams = await response.json();

            if (window.ExamRunner) {
                window.ExamRunner.allExamsMetadata = exams;
            }
            this.allExamsMetadata = exams;

            const container = document.getElementById('exams-list-container');
            if (!container) return;
            container.innerHTML = '';

            exams.forEach(exam => {
                let deleteBtnHTML = '';
                
                const isCreator = currentUsername === exam.createdBy;
                const canDelete = isAdmin || isCreator;

                if (canDelete) {
                    const deleteTitle = isAdmin ? "Xóa đề thi (Admin)" : "Xóa đề thi";
                    deleteBtnHTML = `
                        <button class="btn-delete-exam"
                                onclick="event.stopPropagation(); ExamCreator.openDeleteModal(${exam.id}, '${currentUsername}')" 
                                title="${deleteTitle}">
                            🗑️
                        </button>
                    `;
                }

                let displayTime = exam.time;
                if (!String(displayTime).toLowerCase().includes('phút')) {
                    displayTime = `${displayTime} phút`;
                }

                const card = document.createElement('div');
                card.className = 'exam-card';
                card.style.position = 'relative';

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

    openDeleteModal(examId, username) {
        const exam = this.allExamsMetadata.find(e => e.id == examId);
        if (!exam) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Không tìm thấy đề thi!',
                confirmButtonColor: 'var(--primary-color)'
            });
            return;
        }

        const userStr = localStorage.getItem('currentUser');
        if (!userStr) {
            Swal.fire({
                icon: 'warning',
                title: 'Chưa đăng nhập',
                text: 'Vui lòng đăng nhập để thực hiện thao tác này!',
                confirmButtonColor: 'var(--primary-color)'
            });
            return;
        }

        const currentUser = JSON.parse(userStr);
        const isAdmin = currentUser.role === 'admin';
        const isCreator = currentUser.username === exam.createdBy;

        if (!isAdmin && !isCreator) {
            Swal.fire({
                icon: 'error',
                title: 'Không có quyền!',
                text: 'Bạn chỉ có thể xóa đề thi do chính mình tạo!',
                confirmButtonColor: 'var(--primary-color)'
            });
            return;
        }

        // Show SweetAlert2 delete confirmation
        Swal.fire({
            icon: 'warning',
            title: 'Bạn chắc chắn chứ?',
            text: 'Đề thi này sẽ bị xóa vĩnh viễn và không thể khôi phục!',
            showCancelButton: true,
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                this.pendingDeleteId = examId;
                this.pendingDeleteUser = username;
                this.confirmDeleteAction();
            }
        });
    },

    closeDeleteModal() {
        this.pendingDeleteId = null;
        this.pendingDeleteUser = null;
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) modal.classList.remove('active');
    },

    async confirmDeleteAction() {
        if (!this.pendingDeleteId) return;

        const examId = this.pendingDeleteId;
        const username = this.pendingDeleteUser;

        try {
            const response = await fetch('/api/delete-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId, username })
            });

            const result = await response.json();

            if (result.success) {
                // Show success toast
                Swal.fire({
                    icon: 'success',
                    title: 'Đã xóa!',
                    text: 'Đề thi đã được xóa thành công.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    position: 'top-end'
                });
                
                // Reload exams list
                await this.loadAndRenderExams();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: result.message || 'Không thể xóa đề thi.',
                    confirmButtonColor: 'var(--primary-color)'
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Lỗi kết nối Server!',
                confirmButtonColor: 'var(--primary-color)'
            });
        } finally {
            this.pendingDeleteId = null;
            this.pendingDeleteUser = null;
        }
    }
};

// ==================== EXAM MANAGER (FOR COMPATIBILITY) ====================
export const ExamManager = {
    renderExams() {
        if (ExamCreator.loadAndRenderExams) {
            ExamCreator.loadAndRenderExams();
        }
    },
    searchExams(keyword) {
        console.log('Search exams:', keyword);
    },
    filterBySubject(subject) {
        console.log('Filter by subject:', subject);
    }
};

module.exports = mongoose.model('Exam', examSchema);