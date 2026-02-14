/**
 * GPA Strategy Module
 * Công cụ phân tích và tạo chiến lược học tập thông minh
 * 
 * @module gpaStrategy
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * @typedef {'green' | 'yellow' | 'red'} FeasibilityLevel
 */

/**
 * @typedef {Object} FeasibilityResult
 * @property {number} requiredScore - Điểm cần đạt
 * @property {FeasibilityLevel} feasibilityLevel - Mức độ khả thi
 * @property {string} feasibilityMessage - Thông điệp tư vấn
 */

/**
 * @typedef {Object} Scenario
 * @property {number} requiredScore - Điểm cần đạt cho kịch bản này
 * @property {string} description - Mô tả kịch bản
 * @property {FeasibilityLevel} feasibilityLevel - Mức độ khả thi
 */

/**
 * @typedef {Object} ScenarioSet
 * @property {Scenario} safe - Kịch bản an toàn (target + 0.3)
 * @property {Scenario} balanced - Kịch bản cân bằng (đúng target)
 * @property {Scenario} risky - Kịch bản rủi ro (target - 0.3)
 */

/**
 * @typedef {Object} CriticalSubject
 * @property {string} subjectName - Tên môn học
 * @property {number} credits - Số tín chỉ
 * @property {number} impactScore - Điểm ảnh hưởng đến GPA
 * @property {string} suggestion - Đề xuất cải thiện
 * @property {number} potentialGpaGain - Tiềm năng tăng GPA nếu cải thiện 1 điểm
 */

/**
 * @typedef {Object} Strategy
 * @property {string} summary - Tóm tắt chiến lược
 * @property {string[]} actionSteps - Các bước hành động cụ thể
 * @property {string} [riskWarning] - Cảnh báo rủi ro (nếu có)
 */

/**
 * @typedef {Object} SubjectData
 * @property {number} id
 * @property {string} name
 * @property {number} credits
 * @property {string} type - 'general' | 'major'
 * @property {Array<{id: number, score: string, weight: number}>} components
 */

/**
 * @typedef {Object} SemesterData
 * @property {number} id
 * @property {string} name
 * @property {boolean} isExpanded
 * @property {SubjectData[]} subjects
 */

// Cấu hình ngưỡng khả thi (có thể điều chỉnh)
export const FEASIBILITY_THRESHOLDS = {
  green: 8.0,   // <= 8.0 là khả thi
  yellow: 9.0,  // 8.0 - 9.0 là khó nhưng có thể
  // > 9.0 là gần như không thể
};

// Thông điệp khả thi - phong cách hỗ trợ và rõ ràng
const FEASIBILITY_MESSAGES = {
  green: "Bạn hoàn toàn có thể đạt được mục tiêu này với nỗ lực học tập ổn định.",
  yellow: "Mục tiêu này đòi hỏi nỗ lực cao hơn mức trung bình, nhưng vẫn khả thi nếu bạn tập trung.",
  red: "Mục tiêu này vượt quá khả năng với dữ liệu hiện tại. Hãy cân nhắc điều chỉnh mục tiêu hoặc tìm cách cải thiện các môn đã học.",
};

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Làm tròn điểm số với độ chính xác 1 chữ số
 * @param {number} num 
 * @returns {number}
 */
const roundScore = (num) => Math.round((num + Number.EPSILON) * 10) / 10;

/**
 * Lấy điểm chữ từ điểm hệ 10
 * @param {number} score10 
 * @returns {Object|null}
 */
const getGradeFromScore = (score10) => {
  return GRADE_SCALE.find(g => score10 >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
};

/**
 * Lấy điểm hệ 10 tối thiểu từ điểm hệ 4
 * @param {number} point4 
 * @returns {Object|null}
 */
const getGradeFromPoint4 = (point4) => {
  return [...GRADE_SCALE].reverse().find(g => g.point >= point4);
};

/**
 * Tính trạng thái môn học
 * @param {Array} components - Các thành phần điểm
 * @returns {Object}
 */
const calculateSubjectStatus = (components) => {
  let currentScore = 0;
  let currentWeight = 0;
  let missingComponent = null;

  components.forEach((comp) => {
    const w = parseFloat(comp.weight) || 0;
    if (comp.score !== "" && comp.score !== null && comp.score !== undefined) {
      currentScore += parseFloat(comp.score) * (w / 100);
      currentWeight += w;
    } else {
      if (!missingComponent || w > missingComponent.weight) {
        missingComponent = { ...comp, weight: w };
      }
    }
  });

  const isFull = currentWeight >= 99.9;
  const finalScore10 = isFull ? roundScore(currentScore) : null;

  return {
    currentScore,
    currentWeight,
    missingComponent,
    isFull,
    finalScore10,
    missingWeight: 100 - currentWeight,
  };
};

// ============================================================================
// 1. FEASIBILITY ASSESSMENT
// ============================================================================

/**
 * Đánh giá mức độ khả thi của điểm cần đạt
 * @param {number} requiredScore - Điểm cần đạt
 * @param {Object} [thresholds] - Ngưỡng tùy chỉnh
 * @returns {FeasibilityResult}
 */
export function assessFeasibility(requiredScore, thresholds = FEASIBILITY_THRESHOLDS) {
  let feasibilityLevel;
  let feasibilityMessage;

  if (requiredScore <= thresholds.green) {
    feasibilityLevel = 'green';
    feasibilityMessage = FEASIBILITY_MESSAGES.green;
  } else if (requiredScore <= thresholds.yellow) {
    feasibilityLevel = 'yellow';
    feasibilityMessage = FEASIBILITY_MESSAGES.yellow;
  } else {
    feasibilityLevel = 'red';
    feasibilityMessage = FEASIBILITY_MESSAGES.red;
  }

  return {
    requiredScore: roundScore(requiredScore),
    feasibilityLevel,
    feasibilityMessage,
  };
}

/**
 * Lấy màu hiển thị cho mức độ khả thi
 * @param {FeasibilityLevel} level 
 * @returns {Object}
 */
export function getFeasibilityColors(level) {
  const colors = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-700 dark:text-green-400',
      icon: '🟢',
      label: 'Có thể đạt được',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-700',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: '🟡',
      label: 'Cần nỗ lực cao',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-700',
      text: 'text-red-700 dark:text-red-400',
      icon: '🔴',
      label: 'Vượt khả năng',
    },
  };
  return colors[level] || colors.green;
}

// ============================================================================
// 2. SCENARIO SYSTEM
// ============================================================================

/**
 * Tạo các kịch bản dự đoán GPA
 * @param {number} currentGpa4 - GPA hiện tại (hệ 4)
 * @param {number} currentCredits - Tín chỉ đã có điểm
 * @param {number} pendingCredits - Tín chỉ chưa có điểm
 * @param {number} targetGpa - GPA mục tiêu
 * @param {number} [scenarioOffset=0.3] - Độ lệch giữa các kịch bản
 * @returns {ScenarioSet|null}
 */
export function generateScenarios(
  currentGpa4,
  currentCredits,
  pendingCredits,
  targetGpa,
  scenarioOffset = 0.3
) {
  if (pendingCredits <= 0 || !targetGpa) return null;

  const totalAllCredits = currentCredits + pendingCredits;
  const currentTotalPoint4 = currentGpa4 * currentCredits;

  // Tính điểm hệ 4 cần đạt cho từng kịch bản
  const calculateNeededPoint4 = (target) => {
    const neededTotalPoint4 = target * totalAllCredits;
    return (neededTotalPoint4 - currentTotalPoint4) / pendingCredits;
  };

  // Quy đổi điểm hệ 4 về hệ 10
  const convertToScale10 = (point4) => {
    if (point4 > 4.0) return 11; // Không thể đạt
    if (point4 < 0) return 0;
    const grade = getGradeFromPoint4(point4);
    return grade ? grade.min : 10;
  };

  const safeTarget = targetGpa + scenarioOffset;
  const riskyTarget = targetGpa - scenarioOffset;

  const safePoint4 = calculateNeededPoint4(safeTarget);
  const balancedPoint4 = calculateNeededPoint4(targetGpa);
  const riskyPoint4 = calculateNeededPoint4(riskyTarget);

  const safeScore10 = convertToScale10(safePoint4);
  const balancedScore10 = convertToScale10(balancedPoint4);
  const riskyScore10 = convertToScale10(riskyPoint4);

  return {
    safe: {
      requiredScore: roundScore(safeScore10),
      requiredPoint4: roundScore(safePoint4),
      targetGpa: safeTarget,
      description: `Để đạt GPA ${safeTarget.toFixed(1)} (an toàn), bạn cần trung bình ${roundScore(safeScore10)} điểm cho các môn còn lại.`,
      ...assessFeasibility(safeScore10),
    },
    balanced: {
      requiredScore: roundScore(balancedScore10),
      requiredPoint4: roundScore(balancedPoint4),
      targetGpa: targetGpa,
      description: `Để đạt GPA ${targetGpa.toFixed(1)} (mục tiêu), bạn cần trung bình ${roundScore(balancedScore10)} điểm.`,
      ...assessFeasibility(balancedScore10),
    },
    risky: {
      requiredScore: roundScore(riskyScore10),
      requiredPoint4: roundScore(riskyPoint4),
      targetGpa: riskyTarget,
      description: `Nếu chấp nhận GPA ${riskyTarget.toFixed(1)} (rủi ro), bạn chỉ cần ${roundScore(riskyScore10)} điểm.`,
      ...assessFeasibility(riskyScore10),
    },
  };
}

// ============================================================================
// 3. CRITICAL SUBJECT ANALYSIS
// ============================================================================

/**
 * Phân tích ảnh hưởng của từng môn học đến GPA
 * @param {SemesterData[]} semesters - Danh sách học kỳ
 * @returns {CriticalSubject[]}
 */
export function analyzeSubjectImpact(semesters) {
  const subjectAnalysis = [];
  let totalCredits = 0;

  // Thu thập tất cả môn học
  semesters.forEach(sem => {
    sem.subjects.forEach(sub => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;
      
      if (status.isFull && status.finalScore10 !== null) {
        totalCredits += credits;
      }

      subjectAnalysis.push({
        id: sub.id,
        semesterId: sem.id,
        semesterName: sem.name,
        subjectName: sub.name || 'Chưa đặt tên',
        credits,
        type: sub.type,
        currentScore: status.finalScore10,
        isFull: status.isFull,
        missingWeight: status.missingWeight,
        currentWeight: status.currentWeight,
        partialScore: status.currentScore,
      });
    });
  });

  // Tính impact score cho mỗi môn
  // Impact = (credits / totalCredits) * (potential improvement)
  const analyzedSubjects = subjectAnalysis.map(sub => {
    // Tính tiềm năng cải thiện GPA nếu tăng 1 điểm
    const potentialGpaGain = totalCredits > 0 
      ? (sub.credits / totalCredits) * (1 / 2.5) // 1 điểm hệ 10 ≈ 0.4 điểm hệ 4
      : 0;

    // Impact score dựa trên tín chỉ và trạng thái hoàn thành
    let impactScore = sub.credits * 10; // Base impact
    
    if (!sub.isFull) {
      // Môn chưa có điểm có impact cao hơn vì còn có thể thay đổi
      impactScore *= 1.5;
    } else if (sub.currentScore && sub.currentScore < 7.0) {
      // Môn điểm thấp có potential cải thiện cao
      impactScore *= 1.2;
    }

    // Môn chuyên ngành thường quan trọng hơn
    if (sub.type === 'major') {
      impactScore *= 1.1;
    }

    return {
      ...sub,
      impactScore: roundScore(impactScore),
      potentialGpaGain: roundScore(potentialGpaGain * 100) / 100,
    };
  });

  // Sắp xếp theo impact score giảm dần
  return analyzedSubjects.sort((a, b) => b.impactScore - a.impactScore);
}

/**
 * Tìm môn có ảnh hưởng lớn nhất
 * @param {SemesterData[]} semesters 
 * @returns {CriticalSubject|null}
 */
export function findMostCriticalSubject(semesters) {
  const analyzed = analyzeSubjectImpact(semesters);
  
  if (analyzed.length === 0) return null;

  const critical = analyzed[0];
  
  // Tạo suggestion dựa trên trạng thái môn học
  let suggestion = '';
  
  if (!critical.isFull) {
    suggestion = `Môn này chưa có điểm cuối. Với ${critical.credits} tín chỉ, đây là cơ hội tốt để cải thiện GPA.`;
  } else if (critical.currentScore < 5.5) {
    suggestion = `Điểm hiện tại khá thấp. Cân nhắc học lại để cải thiện GPA đáng kể.`;
  } else if (critical.currentScore < 7.0) {
    suggestion = `Nếu cải thiện môn này thêm 1 điểm, GPA của bạn tăng khoảng ${critical.potentialGpaGain.toFixed(2)}.`;
  } else {
    suggestion = `Môn này đã có điểm tốt. Duy trì hoặc tập trung vào môn khác.`;
  }

  return {
    subjectName: critical.subjectName,
    credits: critical.credits,
    impactScore: critical.impactScore,
    suggestion,
    potentialGpaGain: critical.potentialGpaGain,
    currentScore: critical.currentScore,
    isFull: critical.isFull,
    type: critical.type,
  };
}

/**
 * Lấy top N môn có ảnh hưởng lớn nhất
 * @param {SemesterData[]} semesters 
 * @param {number} [topN=5]
 * @returns {CriticalSubject[]}
 */
export function getTopCriticalSubjects(semesters, topN = 5) {
  const analyzed = analyzeSubjectImpact(semesters);
  return analyzed.slice(0, topN).map(sub => {
    let suggestion = '';
    
    if (!sub.isFull) {
      suggestion = `Chưa có điểm - ${sub.credits} tín chỉ có thể ảnh hưởng đáng kể.`;
    } else if (sub.currentScore < 7.0) {
      suggestion = `Cải thiện 1 điểm → GPA +${sub.potentialGpaGain.toFixed(2)}`;
    } else {
      suggestion = `Điểm tốt, duy trì phong độ.`;
    }

    return {
      ...sub,
      suggestion,
    };
  });
}

// ============================================================================
// 4. STRATEGY GENERATION
// ============================================================================

/**
 * Tạo chiến lược học tập dựa trên dữ liệu hiện tại
 * @param {SemesterData[]} semesters - Dữ liệu học kỳ
 * @param {number} targetGpa - GPA mục tiêu
 * @param {Object} currentResult - Kết quả tính toán hiện tại
 * @returns {Strategy}
 */
export function generateStrategy(semesters, targetGpa, currentResult) {
  const { gpa4, totalCredits } = currentResult;
  
  // Thu thập thông tin chi tiết
  let pendingCredits = 0;
  let lowScoreSubjects = [];
  let highCreditSubjects = [];
  let incompleteSubjects = [];

  semesters.forEach(sem => {
    sem.subjects.forEach(sub => {
      const status = calculateSubjectStatus(sub.components);
      const credits = parseFloat(sub.credits) || 0;

      if (!status.isFull) {
        pendingCredits += credits;
        incompleteSubjects.push({
          name: sub.name || 'Chưa đặt tên',
          credits,
          partialScore: status.currentScore,
          missingWeight: status.missingWeight,
        });
      } else if (status.finalScore10 < 6.5) {
        lowScoreSubjects.push({
          name: sub.name || 'Chưa đặt tên',
          credits,
          score: status.finalScore10,
        });
      }

      if (credits >= 3) {
        highCreditSubjects.push({
          name: sub.name || 'Chưa đặt tên',
          credits,
          score: status.finalScore10,
          isFull: status.isFull,
        });
      }
    });
  });

  // Tính điểm cần đạt
  let neededScore = null;
  let feasibility = null;

  if (targetGpa && pendingCredits > 0) {
    const totalAllCredits = totalCredits + pendingCredits;
    const currentTotalPoint4 = gpa4 * totalCredits;
    const neededTotalPoint4 = targetGpa * totalAllCredits;
    const neededPoint4 = (neededTotalPoint4 - currentTotalPoint4) / pendingCredits;
    
    const grade = getGradeFromPoint4(neededPoint4);
    neededScore = grade ? grade.min : (neededPoint4 > 4 ? 10 : 0);
    feasibility = assessFeasibility(neededScore);
  }

  // Tạo strategy dựa trên feasibility level
  let summary = '';
  let actionSteps = [];
  let riskWarning = null;

  if (!targetGpa) {
    summary = 'Hãy đặt mục tiêu GPA để nhận được chiến lược cụ thể.';
    actionSteps = [
      'Nhập GPA mục tiêu vào ô "Mục tiêu GPA"',
      'Hoàn thiện điểm các môn đang học',
      'Xem lại kết quả dự đoán',
    ];
  } else if (pendingCredits === 0) {
    if (gpa4 >= targetGpa) {
      summary = `🎉 Chúc mừng! Bạn đã đạt mục tiêu GPA ${targetGpa}.`;
      actionSteps = [
        'Duy trì phong độ học tập hiện tại',
        'Cân nhắc nâng cao mục tiêu cho kỳ tiếp theo',
      ];
    } else {
      summary = `Tất cả các môn đã có điểm. GPA hiện tại là ${gpa4}.`;
      actionSteps = [
        'Cân nhắc học cải thiện các môn điểm thấp',
        'Đặt mục tiêu mới cho học kỳ tiếp theo',
      ];
      riskWarning = lowScoreSubjects.length > 0
        ? `Có ${lowScoreSubjects.length} môn điểm dưới 6.5 có thể học cải thiện.`
        : null;
    }
  } else if (feasibility) {
    switch (feasibility.feasibilityLevel) {
      case 'green':
        summary = `✨ Mục tiêu GPA ${targetGpa} hoàn toàn khả thi với nỗ lực vừa phải.`;
        actionSteps = [
          `Duy trì điểm trung bình ${neededScore} cho ${pendingCredits} tín chỉ còn lại`,
          'Ưu tiên hoàn thành tốt các bài tập và điểm chuyên cần',
          'Không bỏ trống bất kỳ thành phần điểm nào',
        ];
        
        if (highCreditSubjects.filter(s => !s.isFull && s.credits >= 3).length > 0) {
          actionSteps.push('Tập trung vào môn có từ 3 tín chỉ trở lên để tối ưu GPA');
        }
        break;

      case 'yellow':
        summary = `⚡ Mục tiêu GPA ${targetGpa} cần nỗ lực cao hơn mức trung bình.`;
        actionSteps = [
          `Phấn đấu điểm ${neededScore}+ cho tất cả môn còn lại`,
          'Ưu tiên tuyệt đối môn nhiều tín chỉ',
          'Tận dụng tối đa điểm chuyên cần và giữa kỳ',
          'Nếu giữa kỳ dưới 6, cần đạt tối thiểu 8.5 cuối kỳ',
        ];
        
        riskWarning = 'Cần duy trì phong độ ổn định suốt học kỳ. Một môn điểm thấp có thể ảnh hưởng đáng kể.';
        break;

      case 'red':
        summary = `🎯 Mục tiêu GPA ${targetGpa} rất khó đạt với tình trạng hiện tại.`;
        actionSteps = [
          '📉 Cân nhắc điều chỉnh mục tiêu xuống mức thực tế hơn',
          'Tập trung toàn lực vào môn có nhiều tín chỉ nhất',
          'Đảm bảo không rớt bất kỳ môn nào',
        ];
        
        // Tìm môn có thể học cải thiện
        if (lowScoreSubjects.length > 0) {
          const topLow = lowScoreSubjects.sort((a, b) => b.credits - a.credits)[0];
          actionSteps.push(`Cân nhắc học cải thiện môn "${topLow.name}" (${topLow.credits} tín chỉ, điểm ${topLow.score})`);
        }
        
        riskWarning = `Cần điểm trung bình ${neededScore} - vượt quá khả năng thông thường. Nên xem xét lại chiến lược.`;
        break;
    }
  }

  // Thêm action steps cho incomplete subjects
  if (incompleteSubjects.length > 0) {
    const topIncomplete = incompleteSubjects
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 2);
    
    topIncomplete.forEach(sub => {
      if (sub.partialScore > 0 && sub.missingWeight > 0) {
        const currentAvg = sub.partialScore / ((100 - sub.missingWeight) / 100);
        if (currentAvg < 5) {
          actionSteps.push(`⚠️ Môn "${sub.name}": Giữa kỳ thấp, cần ${((7 - sub.partialScore) / (sub.missingWeight / 100)).toFixed(1)} cuối kỳ để qua môn`);
        }
      }
    });
  }

  return {
    summary,
    actionSteps: actionSteps.slice(0, 6), // Tối đa 6 action steps
    riskWarning,
    feasibility,
    stats: {
      pendingCredits,
      completedCredits: totalCredits,
      lowScoreCount: lowScoreSubjects.length,
      incompleteCount: incompleteSubjects.length,
      neededScore,
    },
  };
}

// ============================================================================
// 5. UTILITY EXPORTS
// ============================================================================

/**
 * Tính tiến độ GPA (% so với mục tiêu)
 * @param {number} currentGpa 
 * @param {number} targetGpa 
 * @returns {Object}
 */
export function calculateGpaProgress(currentGpa, targetGpa) {
  if (!targetGpa || targetGpa <= 0) {
    return { percentage: 0, status: 'no-target', message: 'Chưa đặt mục tiêu' };
  }

  const percentage = Math.min((currentGpa / targetGpa) * 100, 100);
  let status, message;

  if (currentGpa >= targetGpa) {
    status = 'achieved';
    message = 'Đã đạt mục tiêu!';
  } else if (percentage >= 90) {
    status = 'close';
    message = 'Gần đạt mục tiêu';
  } else if (percentage >= 70) {
    status = 'on-track';
    message = 'Đang trên đường';
  } else {
    status = 'behind';
    message = 'Cần cố gắng hơn';
  }

  return {
    percentage: roundScore(percentage),
    status,
    message,
    gap: roundScore(targetGpa - currentGpa),
  };
}

/**
 * Export tất cả các hàm utility để test
 */
export const __testUtils = {
  roundScore,
  getGradeFromScore,
  getGradeFromPoint4,
  calculateSubjectStatus,
  GRADE_SCALE,
};
