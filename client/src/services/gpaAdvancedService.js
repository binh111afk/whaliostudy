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
  const currentMilestone = [...academicMilestones].reverse().find(m => currentGpa4 >= m.gpa);
  
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
    const subjectNames = ungradedSubjects.map(s => s.name).join(', ');
    
    // Ưu tiên kiểm tra nguy cơ tụt mốc (cảnh báo đỏ)
    let dangerAlertCreated = false;
    if (currentMilestone && nextLowerMilestone) {
      const gapToCurrentMilestone = currentGpa4 - currentMilestone.gpa;
      
      // Nếu GPA gần mốc hiện tại → nguy cơ tụt (mở rộng ngưỡng để bắt nhiều trường hợp hơn)
      if (gapToCurrentMilestone < 0.6) {
        // Tính điểm thấp nhất cần đạt để giữ mốc hiện tại
        const minTotalPointCredit = currentMilestone.gpa * totalAllCredits;
        const neededPoint4ToMaintain = (minTotalPointCredit - totalPointCredit) / totalUngradedCredits;
        
        // Quy đổi về điểm hệ 10
        let thresholdScore10 = 0;
        for (let score = 10; score >= 0; score -= 0.1) {
          const p4 = getPoint4FromScore10(score);
          if (p4 >= neededPoint4ToMaintain) {
            thresholdScore10 = Math.floor(score * 10) / 10; // Làm tròn xuống
            break;
          }
        }
        
        // Tính GPA sẽ rơi xuống nếu đạt điểm dưới ngưỡng
        const testLowScore = Math.max(0, thresholdScore10 - 0.1);
        const testPoint4 = getPoint4FromScore10(testLowScore);
        const projectedTotalPointCredit = totalPointCredit + (testPoint4 * totalUngradedCredits);
        const projectedGpa = roundScore(projectedTotalPointCredit / totalAllCredits);

        alerts.push({
          type: 'danger-warning',
          message: `🚨 Cảnh báo! GPA của bạn đang là ${currentGpa4.toFixed(2)}. Chỉ cần ${ungradedSubjects.length === 1 ? 'môn' : 'các môn'} ${subjectNames} <${thresholdScore10.toFixed(1)} điểm là bạn sẽ xuống ${projectedGpa.toFixed(2)} (${nextLowerMilestone.label})`,
          action: `An toàn: ≥ ${thresholdScore10.toFixed(1)} điểm`,
          severity: 'danger',
          icon: '🚨',
        });
        dangerAlertCreated = true;
      }
    }
    
    // Nếu chưa có cảnh báo nguy hiểm, kiểm tra cơ hội đạt mốc cao hơn (cảnh báo xanh)
    if (!dangerAlertCreated && nextHigherMilestone) {
      // LUÔN tạo cảnh báo tích cực nếu có mốc cao hơn
      const targetTotalPointCredit = nextHigherMilestone.gpa * totalAllCredits;
      const neededPoint4 = (targetTotalPointCredit - totalPointCredit) / totalUngradedCredits;
      
      // Quy đổi về điểm hệ 10
      let requiredScore10 = 10;
      for (let score = 0; score <= 10; score += 0.1) {
        const p4 = getPoint4FromScore10(score);
        if (p4 >= neededPoint4) {
          requiredScore10 = Math.ceil(score * 10) / 10; // Làm tròn lên
          break;
        }
      }

      if (requiredScore10 <= 10) {
        alerts.push({
          type: 'positive-opportunity',
          message: `🎉 Tuyệt vời! GPA hiện tại của bạn là ${currentGpa4.toFixed(2)}. ${ungradedSubjects.length === 1 ? 'Môn' : 'Các môn'} ${subjectNames} cần ≥${requiredScore10.toFixed(1)} điểm để đạt GPA ${nextHigherMilestone.gpa} (${nextHigherMilestone.label}), bạn hãy cố gắng hơn nhé!`,
          action: `Mục tiêu: ${requiredScore10.toFixed(1)}+ điểm`,
          severity: 'info',
          icon: '✨',
        });
      }
    }
  }

  // === CẢNH BÁO VỀ CÁC MÔN CHƯA CÓ ĐIỂM (TỔNG QUÁT) ===
  if (alerts.length < 2 && ungradedSubjects.length > 0) {
    const totalUngradedCredits = ungradedSubjects.reduce((sum, s) => sum + s.credits, 0);
    alerts.push({
      type: 'ungraded-info',
      message: `💡 Còn ${ungradedSubjects.length} môn chưa có điểm (${totalUngradedCredits} tín chỉ). Tập trung hoàn thiện để dự đoán GPA chính xác hơn.`,
      action: `Môn gần nhất: ${ungradedSubjects[0].name}`,
      severity: 'info',
      icon: '💡',
    });
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
  const severityOrder = { danger: 0, warning: 1, info: 2 };
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

  const semesterGpa4 = totalCredits > 0 ? roundScore(totalPointCredit / totalCredits) : 0;
  const semesterGpa10 = totalCredits > 0 ? roundScore(totalScore10Credit / totalCredits) : 0;

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
  const gap = roundScore(targetGpa - semesterGpa4);
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
