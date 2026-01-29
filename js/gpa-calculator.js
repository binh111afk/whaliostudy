/**
 * Semester Subject Manager - GPA Calculator with Dynamic Components
 * Based on HCMUE (Trường ĐH Sư phạm TP.HCM) Grading Scale
 */

// ========== GRADING SCALE CONFIGURATION (HCMUE STRICT RULES) ==========
const GRADE_SCALE = {
    'A': { min: 8.5, max: 10, point: 4.0 },
    'B+': { min: 7.8, max: 8.49, point: 3.5 },
    'B': { min: 7.0, max: 7.79, point: 3.0 },
    'C+': { min: 6.3, max: 6.99, point: 2.5 },
    'C': { min: 5.5, max: 6.29, point: 2.0 },
    'D+': { min: 4.8, max: 5.49, point: 1.5 },
    'D': { min: 4.0, max: 4.79, point: 1.0 },
    'F+': { min: 3.0, max: 3.99, point: 0.5 },
    'F': { min: 0, max: 2.99, point: 0.0 }
};

// GPA Classification
const GPA_CLASSIFICATION = [
    { min: 3.6, max: 4.0, label: 'Xuất sắc', className: 'excellent' },
    { min: 3.2, max: 3.59, label: 'Giỏi', className: 'very-good' },
    { min: 2.5, max: 3.19, label: 'Khá', className: 'good' },
    { min: 2.0, max: 2.49, label: 'Trung bình', className: 'average' },
    { min: 0, max: 1.99, label: 'Yếu/Kém', className: 'poor' }
];

// LocalStorage key
const STORAGE_KEY = 'my_semester_grades';

// ========== CORE CALCULATION FUNCTIONS ==========

/**
 * Convert 10-scale score to 4-scale grade point
 */
function convertTo4Scale(score) {
    for (const [grade, range] of Object.entries(GRADE_SCALE)) {
        if (score >= range.min && score <= range.max) {
            return { grade, point: range.point };
        }
    }
    return { grade: 'F', point: 0.0 };
}

/**
 * Get GPA classification
 */
function getGPAClassification(gpa) {
    for (const classification of GPA_CLASSIFICATION) {
        if (gpa >= classification.min && gpa <= classification.max) {
            return classification;
        }
    }
    return GPA_CLASSIFICATION[GPA_CLASSIFICATION.length - 1];
}

/**
 * Calculate final score from components
 */
function calculateFinalScore(components) {
    if (!components || !Array.isArray(components)) return 0;
    
    let totalScore = 0;
    
    for (const comp of components) {
        if (comp.score !== null && comp.score !== '' && !isNaN(parseFloat(comp.score))) {
            const score = parseFloat(comp.score);
            const weight = parseFloat(comp.weight) || 0;
            totalScore += (score * weight / 100);
        }
    }
    
    return Math.round(totalScore * 10) / 10;
}

/**
 * Get total weight from components
 */
function getTotalWeight(components) {
    return components.reduce((sum, comp) => {
        const weight = parseFloat(comp.weight);
        return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
}

/**
 * Check if subject is complete (all components have scores and weights sum to 100)
 */
function isSubjectComplete(components) {
    const totalWeight = getTotalWeight(components);

    if (Math.abs(totalWeight - 100) > 0.01) {
        return false;
    }

    return components.every(comp => {
        const score = parseFloat(comp.score);
        return !isNaN(score) && score !== null && score !== '';
    });
}

/**
 * Get prediction data for subject with one missing component
 */
function getPredictionData(components, subjectType = 'standard') {
    if (!components || !Array.isArray(components)) return null;
    const totalWeight = getTotalWeight(components);
    
    // Chỉ dự đoán khi tổng trọng số đã đủ 100%
    if (Math.abs(totalWeight - 100) > 0.01) return null;
    
    // Tìm cột điểm trống
    let missingIndex = -1;
    let missingCount = 0;
    let currentScore = 0;
    
    components.forEach((comp, index) => {
        const score = parseFloat(comp.score);
        const weight = parseFloat(comp.weight) || 0;
        
        if (isNaN(score) || score === null || score === '') {
            missingIndex = index;
            missingCount++;
        } else {
            currentScore += (score * weight / 100);
        }
    });
    
    if (missingCount !== 1 || missingIndex === -1) return null;
    
    const missingWeight = parseFloat(components[missingIndex].weight) || 0;
    if (missingWeight === 0) return null;
    
    const passThreshold = subjectType === 'major' ? 5.5 : 4.0;
    const targets = [];

    // 1. Tính toán cho các mốc điểm CHÍNH (A, B+, B, C+, C)
    // Duyệt danh sách điểm chuẩn
    for (const [grade, range] of Object.entries(GRADE_SCALE)) {
        // Bỏ qua các điểm quá thấp (D, F) vì ít ai target
        if (['D', 'D+', 'F', 'F+'].includes(grade)) continue;

        const targetTotal = range.min;
        const requiredScore = (targetTotal - currentScore) * 100 / missingWeight;
        
        targets.push({
            label: grade,
            className: `grade-${grade.toLowerCase()}`, // Class màu cũ
            required: requiredScore,
            achievable: requiredScore <= 10,
            isPass: false
        });
    }

    // 2. Tính toán mốc "Qua môn"
    const passRequired = (passThreshold - currentScore) * 100 / missingWeight;
    
    // Kiểm tra xem mốc Qua môn có trùng với mốc nào ở trên không (để đỡ hiện trùng)
    // Ví dụ chuyên ngành 5.5 trùng với B -> Không cần hiện dòng Qua môn riêng nữa
    // Đại cương 4.0 trùng C+ -> Không cần hiện riêng
    const isDuplicate = targets.some(t => Math.abs(t.required - passRequired) < 0.1);

    if (!isDuplicate) {
        targets.push({
            label: 'Qua môn',
            className: 'status-pass', // Class màu xanh lá
            required: passRequired,
            achievable: passRequired <= 10,
            isPass: true
        });
    }

    // 3. SẮP XẾP VÀ LỌC
    // Sắp xếp: Điểm cần đạt từ CAO xuống THẤP (A -> B+ -> B -> Qua môn)
    // Để người dùng thấy được mục tiêu cao nhất trước
    return {
        missingIndex,
        currentScore,
        targets: targets
            .filter(t => t.achievable) // Chỉ lấy những cái làm được (<= 10đ)
            .sort((a, b) => b.required - a.required) // Cao xếp trên, thấp xếp dưới
    };
}

// ========== DATA MANAGEMENT ==========

class SemesterDataManager {
    constructor() {
        this.subjects = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.subjects = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading semester data:', e);
                this.subjects = [];
            }
        }
    }

    saveToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.subjects));
        
        // Auto-update analytics charts when GPA data changes
        if (window.AnalyticsManager && typeof window.AnalyticsManager.updateCharts === 'function') {
            console.log('🔄 GPA data saved, refreshing analytics charts...');
            window.AnalyticsManager.updateCharts();
        }
    }

    addSubject() {
        this.subjects.push({
            name: '',
            credits: 3,
            components: [
                { score: '', weight: 30 },
                { score: '', weight: 70 }
            ]
        });
        this.saveToStorage();
    }

    updateSubject(index, field, value) {
        if (this.subjects[index]) {
            this.subjects[index][field] = value;
            this.saveToStorage();
        }
    }

    updateComponent(subjectIndex, componentIndex, field, value) {
        if (this.subjects[subjectIndex] && this.subjects[subjectIndex].components[componentIndex]) {
            this.subjects[subjectIndex].components[componentIndex][field] = value;
            this.saveToStorage();
        }
    }

    addComponent(subjectIndex) {
        if (this.subjects[subjectIndex]) {
            this.subjects[subjectIndex].components.push({ score: '', weight: 0 });
            this.saveToStorage();
        }
    }

    removeComponent(subjectIndex, componentIndex) {
        if (this.subjects[subjectIndex] && this.subjects[subjectIndex].components.length > 1) {
            this.subjects[subjectIndex].components.splice(componentIndex, 1);
            this.saveToStorage();
        }
    }

    deleteSubject(index) {
        this.subjects.splice(index, 1);
        this.saveToStorage();
    }

    clearAll() {
        this.subjects = [];
        this.saveToStorage();
    }

    getSubjects() {
        return this.subjects;
    }

    getCompletedSubjects() {
        return this.subjects.filter(s => isSubjectComplete(s.components));
    }

    calculateCurrentGPA() {
        const completed = this.getCompletedSubjects();

        if (completed.length === 0) {
            return { gpa: 0, totalCredits: 0, classification: null };
        }

        let totalPoints = 0;
        let totalCredits = 0;

        for (const subject of completed) {
            const finalScore = calculateFinalScore(subject.components);
            const gradeInfo = convertTo4Scale(finalScore);
            const credits = parseFloat(subject.credits) || 0;

            totalPoints += gradeInfo.point * credits;
            totalCredits += credits;
        }

        const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
        const classification = getGPAClassification(gpa);

        return { gpa, totalCredits, classification };
    }
}

const dataManager = new SemesterDataManager();

// ========== UI RENDERING ==========

/**
 * Open Semester Manager Modal
 */
function openGPACalculator() {
    const modalHTML = `
        <div id="gpa-calculator-modal" class="gpa-modal">
            <div class="gpa-modal-content">
                <div class="gpa-modal-header">
                    <h2>
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                        </svg>
                        Quản lý Môn học & Tính GPA
                    </h2>
                    <button class="gpa-close-btn" onclick="closeGPACalculator()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="gpa-modal-body">
                    <div class="gpa-actions">
                        <button class="gpa-btn gpa-btn-primary" onclick="addNewSubjectRow()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Thêm môn học
                        </button>
                        <button class="gpa-btn gpa-btn-secondary" onclick="calculateSemesterGPA()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                            Tính toán
                        </button>
                        <button class="gpa-btn gpa-btn-target" onclick="toggleTargetGPAPredictor()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            Dự đoán GPA Học kỳ
                        </button>
                        <button class="gpa-btn gpa-btn-danger" onclick="clearAllSubjectsConfirm()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Xóa tất cả
                        </button>
                        <button class="gpa-btn gpa-btn-guide" onclick="showUserGuide()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Hướng dẫn
                        </button>
                    </div>

                    <div class="gpa-content-area">
                        <div id="target-gpa-container" class="target-gpa-container" style="display: none;">
                            <div class="target-gpa-card">
                                <h4>Dự đoán điểm cần thiết để đạt GPA mục tiêu</h4>
                                <div class="target-gpa-input-group">
                                    <div class="target-input-wrapper">
                                        <label>GPA mong muốn (thang 4.0):</label>
                                        <input type="number" id="target-gpa-input" min="0" max="4" step="0.01" placeholder="Ví dụ: 3.2, 3.6">
                                    </div>
                                    <button class="gpa-btn gpa-btn-predict" onclick="predictRequiredScores()">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                        Tìm phương án
                                    </button>
                                    <button class="gpa-btn gpa-btn-reset" onclick="resetPredictedScores()">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                        </svg>
                                        Reset dự đoán
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="gpa-table-container">
                            <table class="gpa-table" id="semester-table">
                                <thead>
                                    <tr>
                                        <th style="width: 20%;">Tên môn học</th>
                                        <th style="width: 15%;">Loại môn</th>
                                        <th style="width: 8%;">Tín chỉ</th>
                                        <th style="width: 45%;">Các thành phần điểm</th>
                                        <th style="width: 22%;">Kết quả</th>
                                        <th style="width: 5%;"></th>
                                    </tr>
                                </thead>
                                <tbody id="semester-table-body">
                                    <!-- Rows will be rendered here -->
                                </tbody>
                            </table>
                        </div>

                        <div id="gpa-summary" class="gpa-summary">
                            <!-- Summary will be displayed here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('gpa-calculator-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add CSS styles
    addGPAStyles();

    // Render table
    renderSemesterTable();
    calculateSemesterGPA();
}

/**
 * Close GPA Calculator Modal
 */
function closeGPACalculator() {
    const modal = document.getElementById('gpa-calculator-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Render semester table (UPDATED: Subject Type & Pass/Fail Logic)
 */
function renderSemesterTable() {
    const tbody = document.getElementById('semester-table-body');
    const subjects = dataManager.getSubjects();

    if (subjects.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 12px; opacity: 0.5;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                    <p>Chưa có môn học nào</p>
                    <p style="font-size: 14px; color: #d1d5db; margin-top: 4px;">Nhấn "Thêm môn học" để bắt đầu</p>
                </td>
            </tr>
        `;
        return;
    }

    const rowsHTML = subjects.map((subject, index) => {
        if (!subject.components) subject.components = [];
        const subjectType = subject.type || 'standard';
        const passThreshold = subjectType === 'major' ? 5.5 : 4.0;
        const totalWeight = getTotalWeight(subject.components);
        const isComplete = isSubjectComplete(subject.components);
        const predictionData = getPredictionData(subject.components, subjectType);
        
        // Render inputs (Giữ nguyên)
        const componentsHTML = subject.components.map((comp, compIndex) => `
            <div class="component-row" data-component-index="${compIndex}">
                <input type="number" class="comp-score-input" placeholder="Điểm" min="0" max="10" step="0.1" value="${comp.score}" onchange="updateComponentField(${index}, ${compIndex}, 'score', this.value)">
                <input type="number" class="comp-weight-input" placeholder="%" min="0" max="100" step="1" value="${comp.weight}" onchange="updateComponentField(${index}, ${compIndex}, 'weight', this.value)">
                <span class="comp-weight-label">%</span>
                ${subject.components.length > 1 ? `<button class="comp-remove-btn" onclick="removeComponentFromSubject(${index}, ${compIndex})"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>` : ''}
            </div>
        `).join('');
        
        let weightWarning = '';
        if (Math.abs(totalWeight - 100) > 0.1) weightWarning = `<div class="weight-warning">⚠️ Tổng tỷ trọng: ${totalWeight.toFixed(0)}%</div>`;
        
        let resultHTML = '';

        if (isComplete) {
            // (Giữ nguyên phần hiển thị kết quả đã hoàn thành)
            const finalScore = calculateFinalScore(subject.components);
            const gradeInfo = convertTo4Scale(finalScore);
            const isPass = finalScore >= passThreshold;
            const statusBadge = isPass 
                ? `<span class="status-badge status-pass">Đã qua môn</span>` 
                : `<span class="status-badge status-fail">Học lại</span>`;
            
            resultHTML = `
                <div class="result-complete">
                    <div class="result-grade grade-${gradeInfo.grade.toLowerCase()}">${gradeInfo.grade}</div>
                    <div class="result-details" style="display:flex; flex-direction:column; justify-content:center;">
                        <div class="result-gpa">${gradeInfo.point.toFixed(1)} <span style="font-weight:400; color:#6b7280; font-size:12px;">(${finalScore.toFixed(2)})</span></div>
                        ${statusBadge}
                    </div>
                </div>
            `;
        } else if (predictionData) {
            // --- PHẦN SỬA CHÍNH: HIỂN THỊ DỰ ĐOÁN ĐÚNG STYLE CŨ ---
            
            // Lấy tối đa 4 mục tiêu cao nhất (A, B+, B, C+...)
            const targetList = predictionData.targets.slice(0, 5).map(t => {
                // Logic màu sắc: Dùng đúng class cũ để có màu (grade-a, grade-b+...)
                // Nếu là 'Qua môn' thì dùng màu xanh riêng
                let labelClass = t.isPass ? 'status-pass-text' : t.className;
                
                // Nếu điểm <= 0 nghĩa là đã đạt rồi
                const scoreValue = t.required <= 0 ? 
                    '<span style="color:#059669; font-size:11px;">Đã đạt</span>' : 
                    t.required.toFixed(1);

                return `
                    <div class="target-item">
                        <span class="target-grade ${labelClass}">${t.label}:</span>
                        <span class="target-score">${scoreValue}</span>
                    </div>`;
            }).join('');
            
            resultHTML = `
                <div class="result-targets">
                    <div class="targets-title">Cần đạt (Cuối kỳ):</div>
                    ${targetList || '<span style="color:#9ca3af; font-size:12px;">Không khả thi</span>'}
                </div>
            `;
        } else {
            resultHTML = `<div class="result-empty">-</div>`;
        }

        return `
            <tr data-index="${index}">
                <td><input type="text" class="subject-input" placeholder="Tên môn học" value="${subject.name}" onchange="updateSubjectField(${index}, 'name', this.value)"></td>
                <td>
                    <select class="subject-type-select" onchange="updateSubjectField(${index}, 'type', this.value)">
                        <option value="standard" ${subjectType === 'standard' ? 'selected' : ''}>Đại cương (≥4.0)</option>
                        <option value="major" ${subjectType === 'major' ? 'selected' : ''}>Chuyên ngành (≥5.5)</option>
                    </select>
                </td>
                <td><input type="number" class="subject-input text-center" placeholder="TC" min="1" max="6" value="${subject.credits}" onchange="updateSubjectField(${index}, 'credits', this.value)"></td>
                <td class="components-cell"><div class="components-container">${componentsHTML}<button class="add-component-btn" onclick="addComponentToSubject(${index})"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Thêm thành phần</button>${weightWarning}</div></td>
                <td class="result-cell">${resultHTML}</td>
                <td><button class="delete-btn" onclick="deleteSubjectRow(${index})"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHTML;
}

/**
 * Calculate and display semester GPA (STRICT MODE)
 */
function calculateSemesterGPA() {
    const subjects = dataManager.getSubjects();
    const summaryDiv = document.getElementById('gpa-summary');

    // 1. Kiểm tra nếu chưa có môn nào
    if (subjects.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Chưa có môn học',
            text: 'Vui lòng thêm ít nhất một môn học để tính toán.',
            confirmButtonColor: '#3b82f6'
        });
        summaryDiv.innerHTML = '';
        return; // Dừng lại
    }

    // 2. VALIDATION LOOP: Kiểm tra từng môn xem đã nhập đủ chưa
    for (let i = 0; i < subjects.length; i++) {
        const sub = subjects[i];
        const subName = sub.name || `Môn thứ ${i + 1}`;
        let totalWeight = 0;

        // Kiểm tra từng thành phần điểm
        for (const comp of sub.components) {
            // Kiểm tra bỏ trống điểm hoặc trọng số
            if (comp.score === '' || comp.score === null || comp.weight === '' || comp.weight === null) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Chưa nhập đủ thông tin!',
                    html: `Môn <b>"${subName}"</b> vẫn còn ô điểm hoặc trọng số bị bỏ trống.<br>Vui lòng nhập đầy đủ trước khi tính toán.`,
                    confirmButtonText: 'Đã hiểu',
                    confirmButtonColor: '#f59e0b'
                });
                return; // Dừng tính toán ngay lập tức
            }
            totalWeight += parseFloat(comp.weight);
        }

        // Kiểm tra tổng trọng số phải là 100%
        if (Math.abs(totalWeight - 100) > 0.1) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi trọng số!',
                html: `Tổng phần trăm của môn <b>"${subName}"</b> hiện là <b>${totalWeight}%</b>.<br>Tổng phải bằng đúng <b>100%</b>.`,
                confirmButtonText: 'Kiểm tra lại',
                confirmButtonColor: '#ef4444'
            });
            return; // Dừng lại
        }
    }

    // 3. Nếu vượt qua hết các bước trên thì mới bắt đầu tính toán
    const completed = dataManager.getCompletedSubjects();
    const gpaData = dataManager.calculateCurrentGPA();

    const classificationHTML = gpaData.classification
        ? `<span class="classification ${gpaData.classification.className}">${gpaData.classification.label}</span>`
        : '<span class="classification">-</span>';

    summaryDiv.innerHTML = `
        <div class="summary-card">
            <div class="summary-header">
                <h3>Tổng kết học kỳ</h3>
            </div>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-label">Môn hoàn thành</div>
                    <div class="stat-value">${completed.length}/${subjects.length}</div>
                </div>
                <div class="stat-item highlight">
                    <div class="stat-label">GPA hiện tại</div>
                    <div class="stat-value">${gpaData.gpa.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Xếp loại</div>
                    <div class="stat-value">${classificationHTML}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tổng tín chỉ</div>
                    <div class="stat-value">${gpaData.totalCredits}</div>
                </div>
            </div>
        </div>
    `;

    // Re-render table to show results
    renderSemesterTable();

    // Thông báo thành công nhẹ nhàng (Option)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
    });
    Toast.fire({
        icon: 'success',
        title: 'Đã tính toán xong!'
    });
}

/**
 * Add new subject row
 */
window.addNewSubjectRow = function () {
    dataManager.addSubject();
    renderSemesterTable();
}

/**
 * Update subject field
 */
window.updateSubjectField = function (index, field, value) {
    dataManager.updateSubject(index, field, value);
    renderSemesterTable();
}

/**
 * Update component field
 */
window.updateComponentField = function (subjectIndex, componentIndex, field, value) {
    dataManager.updateComponent(subjectIndex, componentIndex, field, value);
    renderSemesterTable();
}

/**
 * Add component to subject
 */
window.addComponentToSubject = function (subjectIndex) {
    dataManager.addComponent(subjectIndex);
    renderSemesterTable();
}

/**
 * Remove component from subject
 */
window.removeComponentFromSubject = function (subjectIndex, componentIndex) {
    const subject = dataManager.getSubjects()[subjectIndex];

    if (subject.components.length <= 1) {
        Swal.fire({
            icon: 'warning',
            title: 'Không thể xóa',
            text: 'Phải có ít nhất một thành phần điểm'
        });
        return;
    }

    dataManager.removeComponent(subjectIndex, componentIndex);
    renderSemesterTable();
}

/**
 * Delete subject row
 */
window.deleteSubjectRow = function (index) {
    dataManager.deleteSubject(index);
    renderSemesterTable();
    calculateSemesterGPA();
}

/**
 * Clear all subjects with confirmation
 */
window.clearAllSubjectsConfirm = async function () {
    const subjects = dataManager.getSubjects();
    if (subjects.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Thông báo',
            text: 'Chưa có môn học nào để xóa'
        });
        return;
    }

    const result = await Swal.fire({
        title: 'Xác nhận xóa tất cả?',
        text: 'Bạn có chắc chắn muốn xóa tất cả môn học?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa tất cả',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#dc2626'
    });

    if (result.isConfirmed) {
        dataManager.clearAll();
        renderSemesterTable();
        calculateSemesterGPA();

        Swal.fire({
            icon: 'success',
            title: 'Đã xóa!',
            text: 'Đã xóa tất cả môn học',
            timer: 1500,
            showConfirmButton: false
        });
    }
}

/**
 * Show User Guide Modal (FINAL MIX: Style cũ + Bảng mới)
 */
window.showUserGuide = function() {
    // 1. CHUẨN BỊ DỮ LIỆU BẢNG (Giữ nguyên logic bảng màu)
    let tableRows = '';
    let index = 0;
    
    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return '#10b981';
        if (grade.startsWith('B')) return '#3b82f6';
        if (grade.startsWith('C')) return '#f59e0b';
        if (grade.startsWith('D')) return '#ea580c';
        return '#ef4444';
    };

    Object.entries(GRADE_SCALE).forEach(([grade, data]) => {
        const bgRow = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        const color = getGradeColor(grade);
        
        tableRows += `
            <tr style="background: ${bgRow}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: 800; color: ${color}; font-size: 15px;">${grade}</td>
                <td style="padding: 10px; color: #374151; font-family: monospace; font-size: 13px;">${data.min} - ${data.max}</td>
                <td style="padding: 10px; font-weight: 600; color: #1f2937;">${data.point}</td>
            </tr>
        `;
        index++;
    });

    // 2. HIỂN THỊ (Style HTML cũ cho 3 mục đầu)
    Swal.fire({
        title: '📖 Hướng dẫn sử dụng',
        width: '700px',
        html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #374151;">
                
                <div style="margin-bottom: 20px; border-bottom: 1px dashed #d1d5db; padding-bottom: 15px;">
                    <strong style="color: #3b82f6; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="background:#dbeafe; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">1</span>
                        Thiết lập môn học
                    </strong>
                    <ul style="margin: 8px 0 0 34px; padding: 0; list-style-type: disc; color: #4b5563;">
                        <li><b>Chọn Loại môn:</b> Rất quan trọng để xét Đậu/Rớt.
                            <br>🔹 <i>Đại cương:</i> Cần tổng kết <b>≥ 4.0</b> để qua.
                            <br>🔸 <i>Chuyên ngành:</i> Cần tổng kết <b>≥ 5.5</b> để qua.
                        </li>
                        <li><b>Nhập điểm:</b> Nhập đủ hệ số 10 và trọng số %.</li>
                    </ul>
                </div>

                <div style="margin-bottom: 20px; border-bottom: 1px dashed #d1d5db; padding-bottom: 15px;">
                    <strong style="color: #8b5cf6; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="background:#f3e8ff; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">2</span>
                        Xem điểm cần thi ("Cần đạt")
                    </strong>
                    <ul style="margin: 8px 0 0 34px; padding: 0; list-style-type: disc; color: #4b5563;">
                        <li>👉 Hãy <b>ĐỂ TRỐNG</b> ô điểm cuối kỳ.</li>
                        <li>Nhìn cột <b>Kết quả</b>: Nếu hiện <span style="color:#059669; font-weight:700; background:#ecfdf5; padding:0 4px; border-radius:4px; font-size:11px;">Đã đạt</span> nghĩa là bạn đã qua mức đó.</li>
                    </ul>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 5px;">
                    <strong style="color: #10b981; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="background:#d1fae5; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">3</span>
                        Dự đoán GPA (Tính ngược)
                    </strong>
                    <ul style="margin: 8px 0 0 34px; padding: 0; list-style-type: disc; color: #4b5563;">
                        <li>Bấm nút <b>🎯 Dự đoán GPA</b>, nhập mục tiêu (ví dụ 3.6). Hệ thống sẽ tự điền điểm vào các ô trống.</li>
                    </ul>
                </div>

                <div style="margin-top: 25px;">
                    <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); color: white; padding: 10px 15px; border-top-left-radius: 12px; border-top-right-radius: 12px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-size: 13px;">
                        Bảng quy đổi điểm HCMUE
                    </div>
                    
                    <div style="border: 1px solid #e5e7eb; border-top: none; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse; text-align: center;">
                            <thead style="background: #f3f4f6; color: #6b7280; font-size: 12px; text-transform: uppercase;">
                                <tr>
                                    <th style="padding: 10px;">Điểm Chữ</th>
                                    <th style="padding: 10px;">Thang 10</th>
                                    <th style="padding: 10px;">Thang 4</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        `,
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#2563eb',
        showCloseButton: true
    });
}

/**
 * Add CSS Styles
 */
/**
 * Add CSS Styles - RESTORED TABLE STYLE & NEW SUMMARY STYLE
 */
function addGPAStyles() {
    if (document.getElementById('gpa-calculator-styles')) {
        return;
    }

    const styles = document.createElement('style');
    styles.id = 'gpa-calculator-styles';
    styles.textContent = `
        /* --- 1. CÁC STYLE CƠ BẢN (MODAL, BUTTON, INPUT) --- */
        .gpa-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; backdrop-filter: blur(4px); }
        .gpa-modal-content { background: white; border-radius: 16px; width: 100%; max-width: 1400px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); animation: gpaModalSlideIn 0.3s ease-out; }
        @keyframes gpaModalSlideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .gpa-modal-header { padding: 24px 30px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .gpa-modal-header h2 { margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 12px; }
        .gpa-close-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: #6b7280; }
        .gpa-close-btn:hover { background: #f3f4f6; color: #1f2937; }
        .gpa-modal-body { padding: 0; overflow: hidden; flex: 1; display: flex; flex-direction: column; }
        
        /* Sticky Actions Bar */
        .gpa-actions { 
            display: flex; 
            gap: 12px; 
            margin: 0; 
            flex-wrap: wrap;
            padding: 20px 30px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            position: sticky;
            top: 0;
            z-index: 100;
            flex-shrink: 0;
        }
        
        /* Scrollable Content Area */
        .gpa-content-area {
            flex: 1;
            overflow-y: auto;
            padding: 0 30px 30px 30px;
        }
        
        /* Buttons */
        .gpa-btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .gpa-btn svg { width: 20px; height: 20px; }
        .gpa-btn-primary { background: #3b82f6; color: white; } .gpa-btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .gpa-btn-secondary { background: #10b981; color: white; } .gpa-btn-secondary:hover { background: #059669; transform: translateY(-1px); }
        .gpa-btn-danger { background: #ef4444; color: white; } .gpa-btn-danger:hover { background: #dc2626; transform: translateY(-1px); }
        .gpa-btn-target { background: #8b5cf6; color: white; } .gpa-btn-target:hover { background: #7c3aed; transform: translateY(-1px); }
        .gpa-btn-predict { background: #3b82f6; color: white; padding: 8px 16px; font-size: 13px; }
        .gpa-btn-reset { background: #6b7280; color: white; padding: 8px 16px; font-size: 13px; }

        /* Target GPA Input Section */
        .target-gpa-container { margin-bottom: 20px; animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .target-gpa-card { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border: 2px solid #a855f7; border-radius: 12px; padding: 20px; }
        .target-gpa-input-group { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .target-input-wrapper { flex: 1; min-width: 200px; }
        .target-input-wrapper label { display: block; margin-bottom: 6px; color: #6b21a8; font-weight: 600; }
        .target-input-wrapper input { width: 100%; padding: 10px; border-radius: 8px; border: 2px solid #a855f7; }

        /* Table & Inputs with Sticky Header */
        .gpa-table-container { 
            border-radius: 12px; 
            border: 1px solid #e5e7eb; 
            margin-bottom: 24px; 
            max-height: 400px;
            overflow-y: auto;
            position: relative;
        }
        
        .gpa-table { width: 100%; border-collapse: separate; border-spacing: 0; background: white; }
        
        .gpa-table thead { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .gpa-table th { 
            padding: 16px 12px; 
            text-align: left; 
            font-weight: 600; 
            font-size: 13px; 
            text-transform: uppercase;
            border-bottom: 2px solid #4c1d95;
        }
        
        .gpa-table tbody tr { border-bottom: 1px solid #e5e7eb; }
        .gpa-table tbody tr:hover { background: #f9fafb; }
        .gpa-table td { padding: 12px; vertical-align: top; }
        
        .subject-input { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
        .components-container { display: flex; flex-direction: column; gap: 8px; }
        .component-row { display: flex; align-items: center; gap: 6px; padding: 6px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
        .comp-score-input, .comp-weight-input { width: 60px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center; }
        .comp-score-input.predicted-value { background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); border: 2px dashed #a855f7 !important; color: #7c3aed; font-weight: 700; }
        .comp-remove-btn { margin-left: auto; background: #fee2e2; color: #dc2626; border: none; padding: 4px; border-radius: 4px; cursor: pointer; }
        .add-component-btn { margin-top: 4px; background: #e0e7ff; color: #3b82f6; border: 1px dashed #3b82f6; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 12px; }

        /* --- 2. KHÔI PHỤC STYLE KẾT QUẢ (TABLE) GIỐNG ẢNH CŨ --- */
        .result-cell { vertical-align: middle !important; }
        
        .result-complete { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .result-grade { font-size: 15px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: #f3f4f6; min-width: 35px; text-align: center; }
        .result-gpa { font-weight: 600; color: #374151; font-size: 15px; }
        .result-score { font-size: 13px; color: #6b7280; }

        /* Style cho phần dự đoán "Cần đạt" (Khôi phục giống ảnh image_ba53e0) */
        .result-targets {
            font-size: 13px;
            width: 100%;
        }
        .targets-title {
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .target-item {
            display: flex;
            justify-content: space-between; /* Đẩy chữ sang trái, số sang phải */
            align-items: center;
            padding: 4px 0;
            margin-bottom: 2px;
        }
        .target-grade {
            font-weight: 700;
            font-size: 14px;
        }
        .target-score {
            font-weight: 700;
            color: #1f2937;
            font-size: 14px;
        }

        /* Grade Colors */
        .grade-a { color: #10b981; } .grade-b\\+ { color: #059669; } .grade-b { color: #2563eb; } 
        .grade-c\\+ { color: #4f46e5; } .grade-c { color: #d97706; } .grade-d { color: #ef4444; }

        /* --- 3. STYLE CHO SUMMARY CARD (GRID 4 CỘT + DARK GLASS) --- */
        .gpa-summary { margin-top: 24px; }
        
        .summary-card {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            padding: 32px;
            color: white;
            box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5);
        }

        .summary-header h3 {
            margin: 0 0 24px 0;
            font-size: 22px;
            font-weight: 800;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Layout 4 cột */
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            align-items: stretch;
        }

        /* Item con: Căn giữa tuyệt đối & Nền tối */
        .gpa-summary .stat-item {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 15px 10px;
            background: rgba(0, 0, 0, 0.25); /* Nền tối */
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            min-height: 100px;
            transition: all 0.3s ease;
        }

        .gpa-summary .stat-item:hover {
            transform: translateY(-4px);
            background: rgba(0, 0, 0, 0.3);
        }

        .gpa-summary .stat-label {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #e0e7ff;
            margin: 0 0 8px 0;
            text-align: center;
            line-height: 1.2;
        }

        .gpa-summary .stat-value {
            font-size: 30px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1;
            margin: 0;
            text-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }

        /* GPA màu vàng nổi bật */
        .gpa-summary .stat-item.highlight .stat-value {
            color: #fbbf24;
            font-size: 36px;
            text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
        }

        .classification {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .classification.excellent { color: #f472b6; }
        .classification.very-good { color: #60a5fa; }

        /* ========== MOBILE RESPONSIVE - CARD LAYOUT ========== */
        @media (max-width: 768px) {
            /* MODAL: Full width, no border-radius, no side margins */
            .gpa-modal {
                padding: 0;
                align-items: flex-start;
            }
            
            .gpa-modal-content { 
                width: 100%;
                max-width: 100%;
                max-height: 100vh;
                min-height: 100vh;
                margin: 0;
                border-radius: 0;
                animation: none;
            }
            
            .gpa-modal-header { 
                padding: 16px; 
                position: sticky;
                top: 0;
                background: white;
                z-index: 200;
            }
            
            .gpa-modal-header h2 { 
                font-size: 16px;
                gap: 8px;
            }
            
            .gpa-modal-header h2 svg {
                width: 20px;
                height: 20px;
            }
            
            /* ACTIONS: Grid 2 columns */
            .gpa-actions { 
                padding: 12px 16px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .gpa-btn { 
                padding: 10px 12px; 
                font-size: 13px;
                justify-content: center;
                border-radius: 10px;
            }
            
            .gpa-btn svg { 
                width: 18px; 
                height: 18px; 
            }
            
            /* Nút Hướng dẫn full width dưới cùng */
            .gpa-btn-guide { 
                grid-column: 1 / -1; 
            }
            
            /* Content area */
            .gpa-content-area {
                padding: 0 12px 20px 12px;
            }
            
            /* ========== TABLE TO CARD CONVERSION ========== */
            .gpa-table-container { 
                max-height: none;
                border: none;
                background: transparent;
                overflow: visible;
            }
            
            /* Hide table header on mobile */
            .gpa-table thead {
                display: none !important;
            }
            
            .gpa-table {
                display: block;
                background: transparent;
            }
            
            .gpa-table tbody {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            /* Each row becomes a card - using CSS Grid for layout */
            .gpa-table tbody tr {
                display: grid;
                grid-template-columns: 1fr auto auto;
                grid-template-areas:
                    "name credits delete"
                    "type type type"
                    "components components components"
                    "results results results";
                gap: 10px;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                position: relative;
            }
            
            .gpa-table tbody tr:hover {
                border-color: #3b82f6;
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
            }
            
            /* Hide default td styling */
            .gpa-table td {
                display: block;
                padding: 0;
                border: none;
                width: 100% !important;
            }
            
            /* ROW 1: Course name */
            .gpa-table td:first-child {
                grid-area: name;
            }
            
            .gpa-table td:first-child .subject-input {
                width: 100%;
                padding: 12px;
                font-size: 15px;
                font-weight: 600;
                border: 2px solid #d1d5db;
                border-radius: 10px;
                background: #f9fafb;
                min-height: 48px;
            }
            
            .gpa-table td:first-child .subject-input:focus {
                border-color: #3b82f6;
                background: white;
                outline: none;
            }
            
            /* ROW 1: Credits - same row as name */
            .gpa-table td:nth-child(3) {
                grid-area: credits;
                display: flex;
                align-items: center;
            }
            
            .gpa-table td:nth-child(3) .subject-input {
                width: 50px;
                padding: 12px 4px;
                font-size: 16px;
                text-align: center;
                border: 2px solid #d1d5db;
                border-radius: 10px;
                min-height: 48px;
                background: white;
            }
            
            /* ROW 1: Delete button - same row */
            .gpa-table td:last-child {
                grid-area: delete;
                display: flex;
                align-items: center;
            }
            
            .delete-btn {
                padding: 12px;
                background: #fef2f2;
                border: 2px solid #fecaca;
                border-radius: 10px;
                color: #dc2626;
                cursor: pointer;
                transition: all 0.2s;
                min-height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .delete-btn:hover {
                background: #fee2e2;
                border-color: #f87171;
            }
            
            .delete-btn svg {
                width: 18px;
                height: 18px;
            }
            
            /* ROW 2: Subject type */
            .gpa-table td:nth-child(2) {
                grid-area: type;
            }
            
            .gpa-table td:nth-child(2) .subject-type-select {
                width: 100%;
                padding: 10px 12px;
                font-size: 14px;
                border: 2px solid #d1d5db;
                border-radius: 10px;
                min-height: 44px;
            }
            
            /* ROW 3: Components (Score fields) - flex layout */
            .gpa-table td:nth-child(4) {
                grid-area: components;
            }
            
            .gpa-table td:nth-child(4)::before {
                content: "Thành phần điểm:";
                font-weight: 600;
                color: #374151;
                font-size: 13px;
                display: block;
                margin-bottom: 8px;
            }
            
            .components-container {
                gap: 8px;
            }
            
            .component-row {
                display: flex;
                gap: 8px;
                padding: 10px;
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 1px solid #bae6fd;
                border-radius: 10px;
                align-items: center;
                flex-wrap: nowrap;
            }
            
            .component-row::before {
                display: none;
            }
            
            .comp-score-input {
                flex: 1;
                padding: 12px 8px;
                font-size: 16px;
                min-height: 44px;
                border: 2px solid #d1d5db;
                border-radius: 8px;
                text-align: center;
                min-width: 0;
            }
            
            .comp-score-input::placeholder {
                color: #9ca3af;
            }
            
            .comp-weight-input {
                width: 60px;
                padding: 12px 6px;
                font-size: 16px;
                min-height: 44px;
                border: 2px solid #d1d5db;
                border-radius: 8px;
                text-align: center;
                flex-shrink: 0;
            }
            
            .comp-weight-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 14px;
                flex-shrink: 0;
                margin-right: 2px;
            }
            
            .comp-remove-btn {
                padding: 8px;
                border-radius: 8px;
                min-width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .add-component-btn {
                padding: 12px;
                font-size: 13px;
                border-radius: 10px;
                margin-top: 8px;
            }
            
            .weight-warning {
                margin-top: 8px;
                padding: 8px 12px;
                border-radius: 8px;
                font-si4e: 13px;
            }
            
            /* ROW 4: Results */
            .gpa-table td:nth-child(5) {
                grid-area: results;
                padding: 10px;
                background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
                border: 1px solid #e9d5ff;
                border-radius: 10px;
            }
            
            .gpa-table td:nth-child(5)::before {
                content: "Kết quả:";
                font-weight: 700;
                color: #7c3aed;
                font-size: 12px;
                display: block;
                margin-bottom: 6px;
            }
            
            .result-complete {
                flex-direction: row;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .result-grade {
                font-size: 16px;
                padding: 4px 10px;
            }
            
            .result-gpa {
                font-size: 14px;
            }
            
            .result-targets {
                font-size: 13px;
            }
            
            .targets-title {
                font-size: 12px;
                margin-bottom: 6px;
            }
            
            .target-item {
                padding: 4px 0;
            }
            
            .target-grade, .target-score {
                font-size: 13px;
            }
            
            /* Empty row styling */
            .gpa-table tbody tr.empty-row {
                display: block;
                text-align: center;
                padding: 40px 20px;
            }
            
            .gpa-table tbody tr.empty-row td {
                display: block;
            }
            
            .gpa-table tbody tr.empty-row td::before {
                display: none;
            }
            
            /* Summary section */
            .summary-stats { 
                grid-template-columns: repeat(2, 1fr); 
            }
            
            .summary-card { 
                padding: 20px 16px; 
                border-radius: 16px;
            }
            
            .summary-header h3 { 
                font-size: 18px; 
                margin-bottom: 16px;
            }
            
            .gpa-summary .stat-item { 
                padding: 14px 10px; 
                min-height: 90px;
            }
            
            .gpa-summary .stat-label { 
                font-size: 11px; 
            }
            
            .gpa-summary .stat-value { 
                font-size: 26px; 
            }
            
            .gpa-summary .stat-item.highlight .stat-value { 
                font-size: 30px; 
            }
            
            /* Target GPA section */
            .target-gpa-container {
                margin-top: 16px;
            }
            
            .target-gpa-card { 
                padding: 16px;
                border-radius: 12px;
            }
            
            .target-gpa-card h4 {
                font-size: 14px;
                margin-bottom: 12px;
            }
            
            .target-gpa-input-group { 
                flex-direction: column;
                gap: 10px;
            }
            
            .target-input-wrapper { 
                width: 100%; 
            }
            
            .target-input-wrapper label {
                font-size: 13px;
            }
            
            .target-input-wrapper input {
                padding: 12px;
                font-size: 16px;
                min-height: 48px;
            }
            
            .gpa-btn-predict, 
            .gpa-btn-reset { 
                width: 100%;
                justify-content: center;
                padding: 12px;
                font-size: 14px;
            }
        }
        
        /* Extra small screens (< 480px) */
        @media (max-width: 480px) {
            .gpa-modal-header h2 {
                font-size: 14px;
            }
            
            .gpa-actions { 
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                padding: 10px 12px;
            }
            
            .gpa-btn { 
                font-size: 11px;
                padding: 8px 10px;
            }
            
            .gpa-btn svg {
                width: 16px;
                height: 16px;
            }
            
            .gpa-table tbody tr {
                padding: 14px;
            }
            
            .component-row {
                gap: 6px;
                padding: 8px;
            }
            
            .comp-score-input,
            .comp-weight-input {
                padding: 10px 6px;
                font-size: 15px;
                min-height: 44px;
            }
            
            .summary-stats { 
                grid-template-columns: repeat(2, 1fr); 
                gap: 8px;
            }
            
            .gpa-summary .stat-item {
                min-height: 80px;
                padding: 12px 8px;
            }
            
            .gpa-summary .stat-value {
                font-size: 22px;
            }
            
            .gpa-summary .stat-item.highlight .stat-value {
                font-size: 26px;
            }
        }

        /* Menu chọn loại môn */
        .subject-type-select {
            width: 100%;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background-color: #f9fafb;
            font-size: 13px;
            color: #374151;
            cursor: pointer;
        }
        .subject-type-select:focus { border-color: #3b82f6; outline: none; }

        /* Nhãn Đậu/Rớt */
        .status-badge {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            display: inline-block;
            margin-top: 4px;
        }
        .status-pass { background-color: #d1fae5; color: #059669; border: 1px solid #a7f3d0; } /* Màu xanh */
        .status-fail { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; } /* Màu đỏ */

        /* Thêm vào addGPAStyles */
        .status-pass-text { color: #059669; font-weight: 700; }
        .target-grade { font-weight: 700; font-size: 14px; min-width: 35px; }

        /* Style riêng cho nút Hướng dẫn */
        .gpa-btn-guide {
            background: #0ea5e9; /* Màu xanh dương nhạt (Sky Blue) */
            color: white;
            margin-left: auto; /* QUAN TRỌNG: Đẩy tất cả các nút phía sau dồn sang phải */
        }
        .gpa-btn-guide:hover {
            background: #0284c7;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }

        /* Desktop: Push guide button to right */
        @media (min-width: 769px) {
            .gpa-btn-guide {
                margin-left: auto;
            }
        }
    `;

    document.head.appendChild(styles);
}

// ========== TARGET GPA PREDICTION ==========

/**
 * Toggle target GPA predictor visibility
 */
window.toggleTargetGPAPredictor = function () {
    const container = document.getElementById('target-gpa-container');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Calculate semester GPA with simulated scores for empty components
 */
function simulateSemesterGPA(testScore) {
    const subjects = dataManager.getSubjects();

    if (subjects.length === 0) {
        return 0;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const subject of subjects) {
        // Create temporary components with test score filled in empty slots
        const tempComponents = subject.components.map(comp => {
            const score = parseFloat(comp.score);
            return {
                score: isNaN(score) || comp.score === '' ? testScore : comp.score,
                weight: comp.weight
            };
        });

        // Check if all components have valid weights totaling 100%
        const totalWeight = getTotalWeight(tempComponents);
        if (Math.abs(totalWeight - 100) > 0.01) {
            continue; // Skip subjects with invalid weights
        }

        const finalScore = calculateFinalScore(tempComponents);
        const gradeInfo = convertTo4Scale(finalScore);
        const credits = parseFloat(subject.credits) || 0;

        totalPoints += gradeInfo.point * credits;
        totalCredits += credits;
    }

    return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

/**
 * Find required score across all empty components to achieve target GPA
 */
window.predictRequiredScores = function () {
    const targetGPAInput = document.getElementById('target-gpa-input');
    const targetGPA = parseFloat(targetGPAInput.value);

    if (isNaN(targetGPA) || targetGPA < 0 || targetGPA > 4) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: 'Vui lòng nhập GPA mục tiêu hợp lệ (0-4.0)'
        });
        return;
    }

    // Check if there are any empty components
    const subjects = dataManager.getSubjects();
    let hasEmptyComponents = false;

    for (const subject of subjects) {
        for (const comp of subject.components) {
            const score = parseFloat(comp.score);
            if (isNaN(score) || comp.score === '') {
                hasEmptyComponents = true;
                break;
            }
        }
        if (hasEmptyComponents) break;
    }

    if (!hasEmptyComponents) {
        Swal.fire({
            icon: 'info',
            title: 'Thông báo',
            text: 'Tất cả các điểm đã được điền. Không có thành phần nào để dự đoán.'
        });
        return;
    }

    // Iterative search for required score
    let foundScore = null;

    for (let testScore = 0; testScore <= 10; testScore += 0.1) {
        const simulatedGPA = simulateSemesterGPA(testScore);

        if (simulatedGPA >= targetGPA) {
            foundScore = testScore;
            break;
        }
    }

    if (foundScore === null) {
        Swal.fire({
            icon: 'error',
            title: 'Mục tiêu quá cao!',
            text: 'Không thể đạt được GPA mục tiêu ngay cả khi đạt 10 điểm ở tất cả các thành phần còn thiếu.',
            confirmButtonText: 'Đã hiểu'
        });
        return;
    }

    // Fill all empty components with the found score
    subjects.forEach((subject, subjectIndex) => {
        subject.components.forEach((comp, compIndex) => {
            const score = parseFloat(comp.score);
            if (isNaN(score) || comp.score === '') {
                dataManager.updateComponent(subjectIndex, compIndex, 'score', foundScore.toFixed(1));
            }
        });
    });

    // Re-render table
    renderSemesterTable();
    calculateSemesterGPA();

    // Add predicted-value class to all inputs with the predicted score
    setTimeout(() => {
        const inputs = document.querySelectorAll('.comp-score-input');
        inputs.forEach(input => {
            if (input.value === foundScore.toFixed(1)) {
                input.classList.add('predicted-value');
            }
        });
    }, 100);

    const classification = getGPAClassification(targetGPA);

    Swal.fire({
        icon: 'success',
        title: 'Tìm thấy phương án!',
        html: `
            <div style="text-align: left; padding: 20px;">
                <p style="margin-bottom: 12px;">Để đạt GPA <strong style="color: #3b82f6;">${targetGPA.toFixed(2)}</strong> (${classification.label}), bạn cần đạt trung bình:</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <div style="font-size: 48px; font-weight: 800;">${foundScore.toFixed(1)}</div>
                    <div style="font-size: 16px; margin-top: 8px; opacity: 0.9;">điểm (thang 10)</div>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 12px;">💡 Các ô điểm được tô màu tím là dự đoán. Bạn có thể chỉnh sửa hoặc nhấn "Reset dự đoán" để xóa.</p>
            </div>
        `,
        confirmButtonText: 'Đã hiểu',
        width: '500px'
    });
}

/**
 * Reset all predicted scores
 */
window.resetPredictedScores = function () {
    const inputs = document.querySelectorAll('.comp-score-input.predicted-value');

    if (inputs.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Thông báo',
            text: 'Không có điểm dự đoán nào để xóa'
        });
        return;
    }

    Swal.fire({
        title: 'Xác nhận reset?',
        text: `Xóa ${inputs.length} điểm dự đoán?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            inputs.forEach(input => {
                const row = input.closest('tr');
                const subjectIndex = parseInt(row.dataset.index);
                const componentRow = input.closest('.component-row');
                const componentIndex = parseInt(componentRow.dataset.componentIndex);

                dataManager.updateComponent(subjectIndex, componentIndex, 'score', '');
            });

            renderSemesterTable();
            calculateSemesterGPA();

            Swal.fire({
                icon: 'success',
                title: 'Đã reset!',
                text: 'Đã xóa tất cả điểm dự đoán',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

// ========== INITIALIZATION ==========

/**
 * Initialize GPA Calculator
 */
function initGPACalculator() {
    // Find the GPA button in nav
    const gpaButton = document.querySelector('[data-tooltip="Tính GPA"]');

    if (gpaButton) {
        gpaButton.addEventListener('click', (e) => {
            e.preventDefault();
            openGPACalculator();
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGPACalculator);
} else {
    initGPACalculator();
}

// Export for global access
window.openGPACalculator = openGPACalculator;
window.closeGPACalculator = closeGPACalculator;
window.calculateSemesterGPA = calculateSemesterGPA;
