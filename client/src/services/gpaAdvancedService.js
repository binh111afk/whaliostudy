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

const roundScore = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Lấy điểm hệ 4 từ điểm hệ 10
 */
const getPoint4FromScore10 = (score10) => {
  const grade = GRADE_SCALE.find((g) => score10 >= g.min);
  return grade ? grade.point : 0;
};

/**
 * Tính trạng thái môn học
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

  const newGpa4 = totalCredits > 0 ? roundScore(totalPointCredit / totalCredits) : 0;
  
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
  const originalGpa4 = totalCredits > 0 ? roundScore(originalTotalPointCredit / totalCredits) : 0;

  const gpaDelta = roundScore(newGpa4 - originalGpa4);
  const percentToTarget = targetGpa > 0 
    ? roundScore((newGpa4 / targetGpa) * 100) 
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
  return roundScore((credits / totalCredits) * 100);
}

// ============================================================================
// 2. EARLY RISK ALERT
// ============================================================================

/**
 * Phân tích và tạo cảnh báo rủi ro
 * @param {Object} params - { semesters, currentGpa4, targetGpa, totalCredits }
 * @returns {Array<{type, message, severity, icon}>} - Tối đa 3 cảnh báo
 */
export function analyzeRisks({ semesters, currentGpa4, targetGpa, totalCredits }) {
  const alerts = [];

  // Thu thập dữ liệu môn học
  const subjectAnalysis = [];
  semesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;
      const impact = totalCredits > 0 ? (credits / totalCredits) * 100 : 0;
      
      subjectAnalysis.push({
        id: sub.id,
        name: sub.name || 'Chưa đặt tên',
        credits,
        type: sub.type,
        score: status.finalScore10,
        isFull: status.isFull,
        impact: roundScore(impact),
      });
    });
  });

  // 1. Cảnh báo môn chiếm >30% impact
  const highImpactSubjects = subjectAnalysis.filter((s) => s.impact > 30);
  if (highImpactSubjects.length > 0) {
    const top = highImpactSubjects[0];
    alerts.push({
      type: 'high-dependency',
      message: `"${top.name}" chiếm ${top.impact}% GPA - phụ thuộc cao`,
      severity: 'warning',
      icon: '⚠️',
    });
  }

  // 2. Cảnh báo môn có thể làm trượt mục tiêu
  if (targetGpa > 0) {
    const riskySubjects = subjectAnalysis.filter((s) => {
      if (!s.isFull || !s.score) return false;
      // Tính xem nếu môn này điểm thấp hơn 1 mức thì có trượt target không
      const potentialLoss = (s.credits / totalCredits) * 0.5; // Mất ~0.5 điểm hệ 4
      return currentGpa4 - potentialLoss < targetGpa;
    });

    if (riskySubjects.length > 0 && riskySubjects.length <= 3) {
      alerts.push({
        type: 'target-risk',
        message: `${riskySubjects.length} môn có thể ảnh hưởng mục tiêu GPA ${targetGpa}`,
        severity: 'danger',
        icon: '🚨',
      });
    }
  }

  // 3. Cảnh báo GPA sát mốc học bổng
  const scholarshipLevels = [3.6, 3.2, 2.8, 2.0];
  for (const threshold of scholarshipLevels) {
    const gap = Math.abs(currentGpa4 - threshold);
    if (gap > 0 && gap < 0.1) {
      const direction = currentGpa4 > threshold ? 'trên' : 'dưới';
      alerts.push({
        type: 'scholarship-edge',
        message: `GPA cách mốc ${threshold} chỉ ${gap.toFixed(2)} điểm (${direction})`,
        severity: currentGpa4 < threshold ? 'danger' : 'info',
        icon: currentGpa4 < threshold ? '📉' : '📈',
      });
      break;
    }
  }

  // 4. Cảnh báo có môn điểm thấp
  const lowScoreSubjects = subjectAnalysis.filter((s) => s.isFull && s.score < 5.5);
  if (lowScoreSubjects.length > 0) {
    alerts.push({
      type: 'low-score',
      message: `${lowScoreSubjects.length} môn dưới 5.5 - nguy cơ học lại`,
      severity: 'danger',
      icon: '❌',
    });
  }

  // 5. Cảnh báo môn chuyên ngành điểm thấp
  const lowMajorSubjects = subjectAnalysis.filter(
    (s) => s.isFull && s.type === 'major' && s.score < 6.5
  );
  if (lowMajorSubjects.length > 0 && !alerts.find(a => a.type === 'low-score')) {
    alerts.push({
      type: 'major-warning',
      message: `${lowMajorSubjects.length} môn chuyên ngành cần cải thiện`,
      severity: 'warning',
      icon: '📚',
    });
  }

  // Sắp xếp theo severity và trả về tối đa 3
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  return alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 3);
}

// ============================================================================
// 3. SCHOLARSHIP / GRADUATION MODE
// ============================================================================

/**
 * Tính toán thông tin học bổng
 * @param {Object} params - { currentGpa4, targetScholarship, totalCredits, pendingCredits }
 * @returns {Object}
 */
export function calculateScholarshipInfo({ 
  currentGpa4, 
  targetScholarship = 'excellent',
  totalCredits,
  pendingCredits 
}) {
  const threshold = SCHOLARSHIP_THRESHOLDS[targetScholarship];
  if (!threshold) return null;

  const targetGpa = threshold.gpa;
  const gap = roundScore(targetGpa - currentGpa4);
  const isAchieved = currentGpa4 >= targetGpa;

  // Tính điểm TB cần đạt cho các môn còn lại
  let requiredAvgScore = null;
  let probability = 100;

  if (!isAchieved && pendingCredits > 0) {
    const totalAllCredits = totalCredits + pendingCredits;
    const currentTotalPoint4 = currentGpa4 * totalCredits;
    const neededTotalPoint4 = targetGpa * totalAllCredits;
    const neededPoint4 = (neededTotalPoint4 - currentTotalPoint4) / pendingCredits;

    // Quy đổi về điểm hệ 10
    if (neededPoint4 <= 4.0 && neededPoint4 >= 0) {
      const grade = [...GRADE_SCALE].reverse().find((g) => g.point >= neededPoint4);
      requiredAvgScore = grade ? grade.min : 10;
    } else if (neededPoint4 > 4.0) {
      requiredAvgScore = 11; // Không thể đạt
    } else {
      requiredAvgScore = 0; // Đã đạt
    }

    // Ước tính xác suất đạt (rule-based)
    if (requiredAvgScore > 10) {
      probability = 0;
    } else if (requiredAvgScore <= 6) {
      probability = 95;
    } else if (requiredAvgScore <= 7) {
      probability = 85;
    } else if (requiredAvgScore <= 8) {
      probability = 65;
    } else if (requiredAvgScore <= 9) {
      probability = 35;
    } else {
      probability = 10;
    }
  }

  return {
    targetGpa,
    label: threshold.label,
    reward: threshold.reward,
    gap: gap > 0 ? gap : 0,
    isAchieved,
    requiredAvgScore,
    probability: isAchieved ? 100 : probability,
    pendingCredits,
  };
}

/**
 * Lấy tất cả mức học bổng có thể đạt
 */
export function getReachableScholarships({ currentGpa4, totalCredits, pendingCredits }) {
  const results = [];
  
  for (const [key] of Object.entries(SCHOLARSHIP_THRESHOLDS)) {
    const info = calculateScholarshipInfo({
      currentGpa4,
      targetScholarship: key,
      totalCredits,
      pendingCredits,
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
  const progress = targetGpa > 0 ? roundScore((currentGpa4 / targetGpa) * 100) : 0;
  
  // Dự đoán GPA cuối kỳ (giả định giữ phong độ)
  let projectedGpa = currentGpa4;
  let trend = 'stable';

  if (pendingCredits > 0 && totalCredits > 0) {
    // Dự đoán dựa trên điểm TB hiện tại
    const avgPoint4 = currentGpa4; // Giả định duy trì
    const totalAllCredits = totalCredits + pendingCredits;
    const projectedTotalPoint = currentGpa4 * totalCredits + avgPoint4 * pendingCredits;
    projectedGpa = roundScore(projectedTotalPoint / totalAllCredits);

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
  const currentMilestone = [...milestones].reverse().find((m) => currentGpa4 >= m.gpa);

  return {
    currentGpa4,
    targetGpa,
    progress: Math.min(progress, 100),
    projectedGpa,
    trend,
    nearestMilestone,
    currentMilestone,
    gapToTarget: targetGpa > 0 ? roundScore(targetGpa - currentGpa4) : 0,
  };
}
