/**
 * GPA Advanced Service
 * Logic cho các tính năng nâng cao: Survival Mode, Risk Alert, Scholarship Mode
 */

// Thang điểm chuẩn
const GRADE_SCALE = [
  { char: "A", min: 8.5, max: 10, point: 4.0 },
  { char: "B+", min: 7.8, max: 8.49, point: 3.5 },
  { char: "B", min: 7.0, max: 7.79, point: 3.0 },
  { char: "C+", min: 6.3, max: 6.99, point: 2.5 },
  { char: "C", min: 5.5, max: 6.29, point: 2.0 },
  { char: "D+", min: 4.8, max: 5.49, point: 1.5 },
  { char: "D", min: 4.0, max: 4.79, point: 1.0 },
  { char: "F+", min: 3.0, max: 3.99, point: 0.5 },
  { char: "F", min: 0.0, max: 2.99, point: 0.0 },
];

// Ngưỡng học bổng phổ biến
export const SCHOLARSHIP_THRESHOLDS = {
  excellent: { gpa: 3.6, label: 'Xuất sắc', reward: '100%' },
  good: { gpa: 3.2, label: 'Giỏi', reward: '75%' },
  fair: { gpa: 2.8, label: 'Khá', reward: '50%' },
  pass: { gpa: 2.0, label: 'Tốt nghiệp', reward: null },
};

// Làm tròn điểm đến 1 chữ số thập phân (đồng bộ với GpaCalc.jsx)
const roundScore = (num) => Math.round((num + Number.EPSILON) * 10) / 10;

// Làm tròn GPA đến 2 chữ số thập phân
const roundGpa = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Lấy điểm hệ 4 từ điểm hệ 10
 */
const getPoint4FromScore10 = (score10) => {
  const grade = GRADE_SCALE.find((g) => score10 >= g.min);
  return grade ? grade.point : 0;
};

/**
 * Tính trạng thái môn học (đồng bộ với GpaCalc.jsx)
 */
const calculateSubjectStatus = (components) => {
  let currentScore = 0;
  let currentWeight = 0;

  components.forEach((comp) => {
    const w = parseFloat(comp.weight) || 0;
    if (comp.score !== "" && comp.score !== null && comp.score !== undefined) {
      currentScore += parseFloat(comp.score) * (w / 100);
      currentWeight += w;
    }
  });

  const isFull = currentWeight >= 99.9;
  const finalScore10 = isFull ? roundScore(currentScore) : null;

  return { currentScore, currentWeight, isFull, finalScore10 };
};

// ============================================================================
// 1. SURVIVAL MODE - What-if Simulation
// ============================================================================

/**
 * Tính GPA khi thay đổi điểm 1 môn
 * @param {Object} params - { semesters, targetSubjectId, newScore, currentGpa4, totalCredits }
 * @returns {Object} - { newGpa4, gpaDelta, percentToTarget, originalScore }
 */
export function simulateGpaChange({ semesters, targetSubjectId, newScore, targetGpa }) {
  let totalPointCredit = 0;
  let totalCredits = 0;
  let targetSubject = null;
  let originalScore = null;

  semesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;

      if (sub.id === targetSubjectId) {
        targetSubject = sub;
        originalScore = status.finalScore10;
        // Sử dụng điểm mới để tính
        const newPoint4 = getPoint4FromScore10(newScore);
        totalPointCredit += newPoint4 * credits;
        totalCredits += credits;
      } else if (status.isFull && status.finalScore10 !== null) {
        const grade = GRADE_SCALE.find((g) => status.finalScore10 >= g.min);
        totalPointCredit += (grade?.point || 0) * credits;
        totalCredits += credits;
      }
    });
  });

  const newGpa4 = totalCredits > 0 ? roundGpa(totalPointCredit / totalCredits) : 0;
  
  // Tính GPA gốc
  let originalTotalPointCredit = 0;
  semesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;
      if (status.isFull && status.finalScore10 !== null) {
        const grade = GRADE_SCALE.find((g) => status.finalScore10 >= g.min);
        originalTotalPointCredit += (grade?.point || 0) * credits;
      }
    });
  });
  const originalGpa4 = totalCredits > 0 ? roundGpa(originalTotalPointCredit / totalCredits) : 0;

  const gpaDelta = roundGpa(newGpa4 - originalGpa4);
  const percentToTarget = targetGpa > 0 
    ? roundGpa((newGpa4 / targetGpa) * 100) 
    : 0;

  return {
    newGpa4,
    originalGpa4,
    gpaDelta,
    percentToTarget,
    originalScore,
    newScore,
    targetSubject: targetSubject ? {
      name: targetSubject.name,
      credits: targetSubject.credits,
    } : null,
  };
}

/**
 * Tính impact của môn học (% ảnh hưởng đến GPA)
 */
export function calculateSubjectImpact(subject, totalCredits) {
  const credits = parseFloat(subject.credits) || 0;
  if (totalCredits <= 0) return 0;
  return roundGpa((credits / totalCredits) * 100);
}

// ============================================================================
// 2. EARLY RISK ALERT
// ============================================================================

/**
 * Phân tích và tạo cảnh báo rủi ro có tính hành động
 * @param {Object} params - { semesters, currentGpa4, targetGpa, totalCredits }
 * @returns {Array<{type, message, severity, icon, action}>} - Tối đa 2 cảnh báo
 */
export function analyzeRisks({ semesters, currentGpa4, targetGpa, totalCredits }) {
  const alerts = [];
  
  // Thu thập dữ liệu môn học
  const subjectAnalysis = [];
  let totalPointCredit = 0; // Tổng điểm * tín chỉ hiện tại
  
  semesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;
      
      subjectAnalysis.push({
        id: sub.id,
        name: sub.name || 'Chưa đặt tên',
        credits,
        type: sub.type,
        score: status.finalScore10,
        isFull: status.isFull,
        currentWeight: status.currentWeight,
      });

      // Tính tổng điểm hiện tại
      if (status.isFull && status.finalScore10 !== null) {
        const point4 = getPoint4FromScore10(status.finalScore10);
        totalPointCredit += point4 * credits;
      }
    });
  });

  // Danh sách các mốc GPA quan trọng (học lực)
  const academicMilestones = [
    { gpa: 3.6, label: 'Xuất sắc' },
    { gpa: 3.2, label: 'Giỏi' },
    { gpa: 2.5, label: 'Khá' },
    { gpa: 2.0, label: 'Trung bình' },
  ];

  // Tìm mốc học lực hiện tại (mốc cao nhất mà GPA >= mốc đó)
  // Duyệt từ cao xuống thấp, lấy mốc đầu tiên thỏa điều kiện
  let currentMilestone = null;
  for (let i = 0; i < academicMilestones.length; i++) {
    if (currentGpa4 >= academicMilestones[i].gpa) {
      currentMilestone = academicMilestones[i];
      break;
    }
  }
  
  // Tìm mốc cao hơn gần nhất (mốc thấp nhất mà GPA < mốc đó)
  const nextHigherMilestone = academicMilestones.find(m => currentGpa4 < m.gpa);
  
  // Tìm mốc thấp hơn gần nhất (mốc ngay dưới currentMilestone)
  let nextLowerMilestone = null;
  if (currentMilestone) {
    const currentIndex = academicMilestones.findIndex(m => m.gpa === currentMilestone.gpa);
    if (currentIndex < academicMilestones.length - 1) {
      nextLowerMilestone = academicMilestones[currentIndex + 1];
    }
  }

  // === PHÂN TÍCH CÁC MÔN CHƯA CÓ ĐIỂM ===
  const ungradedSubjects = subjectAnalysis.filter(s => !s.isFull && s.credits > 0);
  
  // Chỉ tính cảnh báo thông minh nếu đã có GPA (có ít nhất 1 môn hoàn thành)
  if (ungradedSubjects.length > 0 && currentGpa4 > 0) {
    const totalUngradedCredits = ungradedSubjects.reduce((sum, s) => sum + s.credits, 0);
    const totalAllCredits = totalCredits + totalUngradedCredits;
    const subjectNames = ungradedSubjects.map(s => s.name || 'Chưa đặt tên').join(', ');
    
    let primaryAlertCreated = false;
    
    // === 1. CẢNH BÁO NGUY CƠ TỤT MỐC (ƯU TIÊN CAO NHẤT) ===
    if (currentMilestone) {
      const gapToCurrentMilestone = currentGpa4 - currentMilestone.gpa;
      
      // Ngưỡng nguy hiểm: GPA cách mốc < 0.4 (VD: 3.29 vs 3.2, 2.55 vs 2.5)
      if (gapToCurrentMilestone < 0.4) {
        // Tính điểm an toàn để giữ mốc
        const minTotalPointCredit = currentMilestone.gpa * totalAllCredits;
        const neededPoint4ToMaintain = (minTotalPointCredit - totalPointCredit) / totalUngradedCredits;
        
        let safeScore10 = 0;
        for (let score = 10; score >= 0; score -= 0.1) {
          const p4 = getPoint4FromScore10(score);
          if (p4 >= neededPoint4ToMaintain) {
            safeScore10 = Math.floor(score * 10) / 10;
            break;
          }
        }
        
        // Dự đoán GPA nếu các môn đạt 7.0 điểm (TB khá)
        const testPoint4_7 = getPoint4FromScore10(7.0);
        const projected_7 = roundGpa((totalPointCredit + testPoint4_7 * totalUngradedCredits) / totalAllCredits);
        
        // Xác định xếp loại sau khi giảm - duyệt từ cao xuống thấp
        let fallLabel = 'Yếu';
        for (let i = 0; i < academicMilestones.length; i++) {
          if (projected_7 >= academicMilestones[i].gpa) {
            fallLabel = academicMilestones[i].label;
            break;
          }
        }

        // CHỈ CẢNH BÁO NẾU THỰC SỰ TỤT MỐC (Xuất sắc→Giỏi, Giỏi→Khá, v.v...)
        if (fallLabel !== currentMilestone.label) {
          alerts.push({
            type: 'danger-warning',
            message: `CẢNH BÁO: GPA ${currentGpa4.toFixed(2)} đang sát mốc ${currentMilestone.label} (${currentMilestone.gpa})! Nếu ${ungradedSubjects.length === 1 ? 'môn' : 'các môn'} ${subjectNames} dưới 7.0 điểm thì GPA sẽ xuống ${projected_7.toFixed(2)} (${fallLabel})`,
            action: `An toàn: từ ${safeScore10.toFixed(1)} điểm trở lên`,
            severity: 'danger',
            icon: '🚨',
          });
          primaryAlertCreated = true;
        }
      }
    }
    
    // === 2. DỰ ĐOÁN GPA THEO KỊCH BẢN (Luôn hiển thị nếu có môn chưa hoàn thành) ===
    if (alerts.length < 2) {
      // Tính GPA với 3 kịch bản: 8.5, 7.5, 6.5
      const scenarios = [
        { score: 8.5, label: 'Tốt' },
        { score: 7.5, label: 'Khá' },
        { score: 6.5, label: 'TB' }
      ];
      
      const predictions = scenarios.map(s => {
        const point4 = getPoint4FromScore10(s.score);
        const gpa = roundGpa((totalPointCredit + point4 * totalUngradedCredits) / totalAllCredits);
        // Tìm mốc học lực: duyệt từ cao xuống thấp, lấy mốc đầu tiên mà GPA >= mốc đó
        let milestone = null;
        for (let i = 0; i < academicMilestones.length; i++) {
          if (gpa >= academicMilestones[i].gpa) {
            milestone = academicMilestones[i].label;
            break;
          }
        }
        return { ...s, gpa, milestone: milestone || 'Yếu' };
      });
      
      // Tìm kịch bản tốt nhất và trung bình
      const bestScenario = predictions[0];
      const midScenario = predictions[1];
      const worstScenario = predictions[2];
      
      if (primaryAlertCreated) {
        // Đã có cảnh báo nguy hiểm → hiển thị kịch bản tích cực
        alerts.push({
          type: 'optimistic-scenario',
          message: `Dự đoán: ${ungradedSubjects.length === 1 ? 'Môn' : 'Các môn'} ${subjectNames} đạt ${bestScenario.score} điểm để đạt GPA ${bestScenario.gpa.toFixed(2)} (${bestScenario.milestone})`,
          action: `${ungradedSubjects.length} môn (${totalUngradedCredits} tín chỉ) chưa hoàn thành`,
          severity: 'info',
          icon: '📊',
        });
      } else {
        // Chưa có cảnh báo nguy hiểm → hiển thị kịch bản đầy đủ
        const avgScore = ((bestScenario.score + worstScenario.score) / 2).toFixed(1);
        alerts.push({
          type: 'scenario-prediction',
          message: `Dự đoán: ${ungradedSubjects.length === 1 ? 'Môn' : 'Các môn'} ${subjectNames} đạt trung bình ${avgScore} điểm sẽ có GPA ${midScenario.gpa.toFixed(2)} (${midScenario.milestone}). Đạt ${bestScenario.score} điểm sẽ có GPA ${bestScenario.gpa.toFixed(2)} (${bestScenario.milestone})`,
          action: `${ungradedSubjects.length} môn (${totalUngradedCredits} tín chỉ) chưa hoàn thành`,
          severity: 'warning',
          icon: '📊',
        });
      }
    }
  }

  // Cảnh báo môn điểm thấp (chỉ thêm nếu chưa đủ 2 cảnh báo)
  if (alerts.length < 2) {
    const failingSubjects = subjectAnalysis.filter(
      s => s.isFull && ((s.type === 'major' && s.score < 5.5) || (s.type === 'general' && s.score < 4.0))
    );
    
    if (failingSubjects.length > 0) {
      alerts.push({
        type: 'failing',
        message: `❌ ${failingSubjects.length} môn có nguy cơ học lại. Cần ưu tiên cải thiện.`,
        action: `Xem lại môn "${failingSubjects[0].name}"`,
        severity: 'danger',
        icon: '❌',
      });
    }
  }

  // Sắp xếp theo severity và trả về tối đa 2
  const severityOrder = { danger: 0, warning: 1, info: 2, success: 3 };
  return alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 2);
}

// ============================================================================
// 3. SCHOLARSHIP / GRADUATION MODE
// ============================================================================

/**
 * Tính GPA của một học kỳ cụ thể
 * @param {Object} semester - Dữ liệu học kỳ
 * @returns {Object} - { semesterGpa4, semesterGpa10, totalCredits }
 */
export function calculateSemesterGpa(semester) {
  let totalPointCredit = 0;
  let totalCredits = 0;
  let totalScore10Credit = 0;

  semester.subjects.forEach((sub) => {
    const status = calculateSubjectStatus(sub.components);
    const credits = parseFloat(sub.credits) || 0;

    if (status.isFull && status.finalScore10 !== null) {
      const score10 = parseFloat(status.finalScore10);
      const point4 = getPoint4FromScore10(score10);
      
      totalPointCredit += point4 * credits;
      totalScore10Credit += score10 * credits;
      totalCredits += credits;
    }
  });

  const semesterGpa4 = totalCredits > 0 ? roundGpa(totalPointCredit / totalCredits) : 0;
  const semesterGpa10 = totalCredits > 0 ? roundGpa(totalScore10Credit / totalCredits) : 0;

  return {
    semesterGpa4,
    semesterGpa10,
    totalCredits,
  };
}

/**
 * Tính toán thông tin học bổng (dựa trên GPA học kỳ gần nhất)
 * @param {Object} params - { semesters, targetScholarship }
 * @returns {Object}
 */
export function calculateScholarshipInfo({ 
  semesters,
  targetScholarship = 'excellent',
}) {
  const threshold = SCHOLARSHIP_THRESHOLDS[targetScholarship];
  if (!threshold) return null;

  // Lấy học kỳ gần nhất có điểm
  const lastSemesterWithGrades = [...semesters].reverse().find(sem => {
    const semGpa = calculateSemesterGpa(sem);
    return semGpa.totalCredits > 0;
  });

  if (!lastSemesterWithGrades) {
    return {
      targetGpa: threshold.gpa,
      label: threshold.label,
      reward: threshold.reward,
      gap: threshold.gpa,
      isAchieved: false,
      requiredAvgScore: null,
      probability: 0,
      lastSemesterGpa: 0,
      semesterName: 'Chưa có',
    };
  }

  const { semesterGpa4, semesterName } = {
    ...calculateSemesterGpa(lastSemesterWithGrades),
    semesterName: lastSemesterWithGrades.name,
  };

  const targetGpa = threshold.gpa;
  const gap = roundGpa(targetGpa - semesterGpa4);
  const isAchieved = semesterGpa4 >= targetGpa;

  // Ước tính xác suất dựa trên GPA hiện tại
  let probability = 100;
  if (!isAchieved) {
    if (gap > 1.0) probability = 5;
    else if (gap > 0.5) probability = 25;
    else if (gap > 0.3) probability = 50;
    else if (gap > 0.1) probability = 75;
    else probability = 90;
  }

  return {
    targetGpa,
    label: threshold.label,
    reward: threshold.reward,
    gap: gap > 0 ? gap : 0,
    isAchieved,
    requiredAvgScore: null, // Không áp dụng cho scholarship mode mới
    probability: isAchieved ? 100 : probability,
    lastSemesterGpa: semesterGpa4,
    semesterName,
  };
}

/**
 * Lấy tất cả mức học bổng có thể đạt (dựa trên GPA học kỳ gần nhất)
 */
export function getReachableScholarships({ semesters }) {
  const results = [];
  
  for (const [key] of Object.entries(SCHOLARSHIP_THRESHOLDS)) {
    const info = calculateScholarshipInfo({
      semesters,
      targetScholarship: key,
    });
    
    if (info) {
      results.push({
        key,
        ...info,
      });
    }
  }

  return results;
}

// ============================================================================
// 4. GPA MAP - Visual Summary
// ============================================================================

/**
 * Tính toán dữ liệu cho GPA Map
 */
export function calculateGpaMapData({ currentGpa4, targetGpa, pendingCredits, totalCredits }) {
  const progress = targetGpa > 0 ? roundGpa((currentGpa4 / targetGpa) * 100) : 0;
  
  // Dự đoán GPA cuối kỳ (giả định giữ phong độ)
  let projectedGpa = currentGpa4;
  let trend = 'stable';

  if (pendingCredits > 0 && totalCredits > 0) {
    // Dự đoán dựa trên điểm TB hiện tại
    const avgPoint4 = currentGpa4; // Giả định duy trì
    const totalAllCredits = totalCredits + pendingCredits;
    const projectedTotalPoint = currentGpa4 * totalCredits + avgPoint4 * pendingCredits;
    projectedGpa = roundGpa(projectedTotalPoint / totalAllCredits);

    // Xác định xu hướng
    if (projectedGpa > currentGpa4) trend = 'up';
    else if (projectedGpa < currentGpa4) trend = 'down';
  }

  // Tính khoảng cách đến các mốc quan trọng
  const milestones = [
    { gpa: 3.6, label: 'Xuất sắc' },
    { gpa: 3.2, label: 'Giỏi' },
    { gpa: 2.5, label: 'Khá' },
    { gpa: 2.0, label: 'TB' },
  ];

  const nearestMilestone = milestones.find((m) => currentGpa4 < m.gpa);
  // Tìm mốc hiện tại: duyệt từ cao xuống thấp
  let currentMilestone = null;
  for (let i = 0; i < milestones.length; i++) {
    if (currentGpa4 >= milestones[i].gpa) {
      currentMilestone = milestones[i];
      break;
    }
  }

  return {
    currentGpa4,
    targetGpa,
    progress: Math.min(progress, 100),
    projectedGpa,
    trend,
    nearestMilestone,
    currentMilestone,
    gapToTarget: targetGpa > 0 ? roundGpa(targetGpa - currentGpa4) : 0,
  };
}
