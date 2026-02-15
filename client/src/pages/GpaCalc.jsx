import React, { useState, useEffect, useMemo } from "react";
import { toast } from 'sonner';
import {
  Calculator,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Award,
  Target,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FolderPlus,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  AlertOctagon,
  Lightbulb,
  BarChart3,
  Star,
  Sliders,
} from "lucide-react";
import AuthModal from '../components/AuthModal';
import {
  getFeasibilityColors,
  generateScenarios,
  findMostCriticalSubject,
  getTopCriticalSubjects,
  generateStrategy,
  calculateGpaProgress,
} from '../utils/gpaStrategy';
import {
  simulateGpaChange,
  analyzeRisks,
  calculateScholarshipInfo,
  calculateGpaMapData,
  calculateSemesterGpa,
  getPriorityAlert,
  calculateGpaMomentum,
} from '../services/gpaAdvancedService';
import { SurvivalModePanel, RiskAlertCard, GpaMapCard, ScholarshipToggle } from '../components/gpa';

// --- 1. DỮ LIỆU CẤU HÌNH ---
const SUGGESTED_SUBJECTS = [
  { name: "Triết học Mác - Lênin", credits: 3, type: "general" },
  { name: "Kinh tế chính trị Mác - Lênin", credits: 2, type: "general" },
  { name: "Chủ nghĩa xã hội khoa học", credits: 2, type: "general" },
  { name: "Tiếng Anh 1", credits: 3, type: "general" },
  { name: "Pháp luật đại cương", credits: 2, type: "general" },
  { name: "Cấu trúc dữ liệu và giải thuật", credits: 4, type: "major" },
  { name: "Cơ sở dữ liệu", credits: 3, type: "major" },
  { name: "Lập trình Web", credits: 3, type: "major" },
];

// Thang điểm chuẩn
const GRADE_SCALE = [
  {
    char: "A",
    min: 8.5,
    max: 10,
    point: 4.0,
    color: "text-green-600",
    bg: "bg-green-100",
  },
  {
    char: "B+",
    min: 7.8,
    max: 8.49,
    point: 3.5,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    char: "B",
    min: 7.0,
    max: 7.79,
    point: 3.0,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    char: "C+",
    min: 6.3,
    max: 6.99,
    point: 2.5,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  {
    char: "C",
    min: 5.5,
    max: 6.29,
    point: 2.0,
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    char: "D+",
    min: 4.8,
    max: 5.49,
    point: 1.5,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    char: "D",
    min: 4.0,
    max: 4.79,
    point: 1.0,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    char: "F+",
    min: 3.0,
    max: 3.99,
    point: 0.5,
    color: "text-red-600",
    bg: "bg-red-100",
  },
  {
    char: "F",
    min: 0.0,
    max: 2.99,
    point: 0.0,
    color: "text-red-500",
    bg: "bg-red-50",
  },
];

// Xếp loại học lực
const getClassification = (gpa) => {
  if (gpa >= 3.6)
    return { label: "Xuất sắc", color: "text-green-600", bg: "bg-green-100" };
  if (gpa >= 3.2)
    return { label: "Giỏi", color: "text-blue-600", bg: "bg-blue-100" };
  if (gpa >= 2.5)
    return { label: "Khá", color: "text-yellow-600", bg: "bg-yellow-100" };
  if (gpa >= 2.0)
    return {
      label: "Trung bình",
      color: "text-orange-600",
      bg: "bg-orange-100",
    };
  return { label: "Yếu", color: "text-red-600", bg: "bg-red-100" };
};

const roundScore = (num) => {
  return Math.round((num + Number.EPSILON) * 10) / 10;
};

// --- 2. LOGIC TÍNH TOÁN CORE ---

const calculateSubjectStatus = (components) => {
  let currentScore = 0;
  let currentWeight = 0;
  let missingComponent = null;

  // Sắp xếp component để tìm component cuối cùng bị thiếu nếu có nhiều cái thiếu
  // Logic cũ: tìm cái nặng nhất. Logic mới fix: tìm cái cuối cùng bị thiếu (thường là thi cuối kỳ)
  // Thực ra logic cũ tìm heaviest weight cũng make sense, nhưng để trực quan khi nhập liệu
  // ta sẽ ưu tiên component *chưa nhập* mà có weight lớn nhất, hoặc nếu bằng nhau thì lấy cái sau cùng.
  
  components.forEach((comp) => {
    const w = parseFloat(comp.weight) || 0;
    if (comp.score !== "") {
      currentScore += parseFloat(comp.score) * (w / 100);
      currentWeight += w;
    } else {
       // Ưu tiên lấy component có weight lớn nhất. 
       // Nếu weight bằng nhau, lấy cái sau cùng (ghi đè).
      if (!missingComponent || w >= missingComponent.weight) {
        missingComponent = { ...comp, weight: w };
      }
    }
  });

  const isFull = currentWeight >= 99.9;

  // Làm tròn điểm đến 1 chữ số thập phân (giữ dạng số, không dùng toFixed)
  const finalScore10 = isFull ? roundScore(currentScore) : null;

  return {
    currentScore,
    currentWeight,
    missingComponent,
    isFull,
    finalScore10,
  };
};

const predictNeededScores = (currentScore, missingWeight, type) => {
  if (missingWeight <= 0) return [];
  const minPassChar = type === "major" ? "C" : "D";
  const targets = GRADE_SCALE.filter(
    (g) => g.point >= GRADE_SCALE.find((s) => s.char === minPassChar).point
  );

  return targets
    .map((grade) => {
      const needed = (grade.min - currentScore) / (missingWeight / 100);
      return needed <= 10 && needed >= 0
        ? { char: grade.char, score: needed.toFixed(1) }
        : null;
    })
    .filter(Boolean)
    .reverse();
};



const GpaCalc = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // --- STATE CẤU TRÚC MỚI: Mảng các Học kỳ ---
  const [semesters, setSemesters] = useState([
    {
      id: 1,
      name: "Học kỳ 1",
      isExpanded: true,
      subjects: [
        {
          id: 101,
          name: "",
          credits: 3,
          type: "general",
          components: [
            { id: 1, score: "", weight: 30 },
            { id: 2, score: "", weight: 70 },
          ],
        },
      ],
    },
  ]);
  const [targetGpa, setTargetGpa] = useState("");

  const [result, setResult] = useState({
    gpa4: 0,
    gpa10: 0,
    totalCredits: 0,
    passedCredits: 0,
    prediction4: null,
    prediction10: null,
    predictionChar: null,
    pendingCredits: 0,
    momentum: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showStrategyPanel, setShowStrategyPanel] = useState(true);

  // Strategy analysis results
  const [strategyData, setStrategyData] = useState({
    scenarios: null,
    criticalSubject: null,
    topCriticalSubjects: [],
    strategy: null,
    gpaProgress: null,
  });

  // === ADVANCED FEATURES STATE ===
  // Survival Mode - What-if simulation
  const [survivalMode, setSurvivalMode] = useState({
    activeSubjectId: null,
    simulatedScore: null,
  });

  // Scholarship Mode
  const [isScholarshipMode, setIsScholarshipMode] = useState(false);
  const [selectedScholarshipLevel, setSelectedScholarshipLevel] = useState('excellent');

  // Risk Alerts
  const [riskAlerts, setRiskAlerts] = useState([]);

  // GPA Map Data
  const [gpaMapData, setGpaMapData] = useState(null);

  // Scholarship Info
  const [scholarshipInfo, setScholarshipInfo] = useState(null);

  // GPA Display Mode - 'cumulative' or 'semester'
  const [gpaDisplayMode, setGpaDisplayMode] = useState('cumulative');
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  
  // State for Layout
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Load dữ liệu từ Server khi vào trang
  useEffect(() => {
    if (user) {
      fetch(`/api/gpa?username=${user.username}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.semesters && data.semesters.length > 0) {
            // Nếu có dữ liệu cũ thì nạp vào
            setSemesters(data.semesters);
          }
        })
        .catch((err) => console.error("Lỗi tải GPA:", err));
    }
  }, []); // Chạy 1 lần khi mount

  // Hàm Lưu dữ liệu lên Server
  const handleSaveGPA = async () => {
    if (!user) {
      return toast("Nhắc nhẹ một chút...", { // Dùng toast() thường, không dùng .error
        description: "Đăng nhập để Whalio lưu lại bảng điểm này nhé bạn!",
        duration: 6000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        // Chỉnh class để nó "thoáng" và "pro" hơn
        classNames: {
          toast: "group ![align-items:center] !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !p-4 !rounded-2xl !shadow-xl",
          title: "!text-gray-800 dark:!text-white !font-bold !text-base",
          description: "!text-gray-500 dark:!text-gray-400 !text-sm",
          actionButton: "!bg-blue-600 !text-white !rounded-xl !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all",
        },
      });
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/gpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username, semesters }),
      });
      const data = await res.json();

      if (data.success) {
        alert("✅ Đã lưu bảng điểm thành công!");
      } else {
        alert("❌ Lỗi: " + data.message);
      }
    } catch (err) {
      alert("❌ Lỗi kết nối Server!");
    } finally {
      setIsSaving(false);
    }
  };

  // --- LOGIC TÍNH TOÁN TOÀN CỤC ---
  useEffect(() => {
    let totalPointCredit = 0;
    let totalScoreCredit = 0;
    let totalCredits = 0;
    let passedCredits = 0;

    let pendingCredits = 0; // Tín chỉ chưa có điểm (để dự báo)
    let currentTotalPoint4 = 0;

    semesters.forEach((sem) => {
      sem.subjects.forEach((sub) => {
        const { finalScore10, isFull } = calculateSubjectStatus(sub.components);
        const credits = parseFloat(sub.credits) || 0;

        if (isFull && finalScore10 !== null) {
          const score10 = parseFloat(finalScore10);
          const grade =
            GRADE_SCALE.find((g) => score10 >= g.min) ||
            GRADE_SCALE[GRADE_SCALE.length - 1];

          totalPointCredit += grade.point * credits;
          totalScoreCredit += score10 * credits;
          totalCredits += credits;
          currentTotalPoint4 += grade.point * credits;

          const isPassed =
            sub.type === "major" ? score10 >= 5.5 : score10 >= 4.0;
          if (isPassed) passedCredits += credits;
        } else {
          pendingCredits += credits;
        }
      });
    });

    const gpa4 = totalCredits
      ? (totalPointCredit / totalCredits).toFixed(2)
      : 0;

    // --- LOGIC DỰ BÁO NGƯỢC (TARGET GPA) ---
    let prediction4 = null;
    let prediction10 = null;
    let predictionChar = null;

    if (targetGpa && pendingCredits > 0) {
      const target = parseFloat(targetGpa);
      const totalAllCredits = totalCredits + pendingCredits;

      // 1. Tính điểm hệ 4 trung bình cần đạt cho các môn còn lại
      const neededTotalPoint4 = target * totalAllCredits;
      prediction4 = (neededTotalPoint4 - currentTotalPoint4) / pendingCredits;

      // 2. Quy đổi ngược từ Hệ 4 về Hệ 10 (Ước lượng)
      if (prediction4 <= 4.0) {
        // Tìm mốc điểm chữ phù hợp nhất (Lấy cận dưới)
        // Ví dụ: Cần 3.2 -> Tìm mốc >= 3.2 (B+) -> Min hệ 10 là 7.8
        const targetGrade = [...GRADE_SCALE]
          .reverse()
          .find((g) => g.point >= prediction4);
        if (targetGrade) {
          predictionChar = targetGrade.char;
          prediction10 = targetGrade.min; // Lấy điểm sàn của mức đó
        }
      }
    }

    // --- MOMENTUM CALCULATION ---
    const momentum = calculateGpaMomentum({ semesters });

    setResult({
      gpa4,
      gpa10: totalCredits ? (totalScoreCredit / totalCredits).toFixed(2) : 0,
      totalCredits,
      passedCredits,
      prediction4,
      prediction10,
      predictionChar,
      pendingCredits,
      momentum,
    });

    // --- STRATEGY ANALYSIS ---
    const gpa4Num = parseFloat(gpa4) || 0;
    const targetNum = parseFloat(targetGpa) || 0;

    // Calculate scenarios
    const scenarios = targetNum > 0 && pendingCredits > 0
      ? generateScenarios(gpa4Num, totalCredits, pendingCredits, targetNum)
      : null;

    // Find critical subjects
    const criticalSubject = findMostCriticalSubject(semesters);
    const topCriticalSubjects = getTopCriticalSubjects(semesters, 5);

    // Generate strategy
    const strategy = generateStrategy(semesters, targetNum, {
      gpa4: gpa4Num,
      totalCredits,
      passedCredits,
    });

    // Calculate GPA progress
    const gpaProgress = calculateGpaProgress(gpa4Num, targetNum);

    setStrategyData({
      scenarios,
      criticalSubject,
      topCriticalSubjects,
      strategy,
      gpaProgress,
    });

    // === ADVANCED FEATURES CALCULATIONS ===
    // Risk Alerts
    const alerts = analyzeRisks({
      semesters,
      currentGpa4: gpa4Num,
      targetGpa: targetNum,
      totalCredits,
    });

    // Momentum Alert (Priority 5)
    if (momentum && momentum.trend === 'up' && momentum.delta >= 0.05) {
       alerts.push({
         type: 'positive-momentum',
         message: `Phong độ ấn tượng! GPA tăng +${momentum.delta} so với kỳ trước.`,
         action: 'Giữ vững đà này nhé! 🚀',
         severity: 'success',
         icon: '📈'
       });
    }

    setRiskAlerts(alerts);

    // GPA Map Data
    const mapData = calculateGpaMapData({
      currentGpa4: gpa4Num,
      targetGpa: targetNum,
      pendingCredits,
      totalCredits,
    });
    setGpaMapData(mapData);

  }, [semesters, targetGpa]);

  // === SCHOLARSHIP INFO EFFECT ===
  useEffect(() => {
    const info = calculateScholarshipInfo({
      semesters,
      targetScholarship: selectedScholarshipLevel,
    });
    setScholarshipInfo(info);
  }, [semesters, selectedScholarshipLevel]);

  // === SURVIVAL MODE SIMULATION ===
  const simulationResult = useMemo(() => {
    if (!survivalMode.activeSubjectId || survivalMode.simulatedScore === null) {
      return null;
    }
    return simulateGpaChange({
      semesters,
      targetSubjectId: survivalMode.activeSubjectId,
      newScore: survivalMode.simulatedScore,
      targetGpa: parseFloat(targetGpa) || 0,
    });
  }, [semesters, survivalMode, targetGpa]);

  // Survival Mode handlers
  const handleOpenSurvivalMode = (subjectId, currentScore) => {
    setSurvivalMode({
      activeSubjectId: subjectId,
      simulatedScore: currentScore ?? 5,
    });
  };

  const handleCloseSurvivalMode = () => {
    setSurvivalMode({
      activeSubjectId: null,
      simulatedScore: null,
    });
  };

  const handleSimulatedScoreChange = (score) => {
    setSurvivalMode(prev => ({
      ...prev,
      simulatedScore: score,
    }));
  };

  const handleResetSimulation = () => {
    const activeSubject = semesters
      .flatMap(s => s.subjects)
      .find(sub => sub.id === survivalMode.activeSubjectId);
    
    if (activeSubject) {
      const status = calculateSubjectStatus(activeSubject.components);
      setSurvivalMode(prev => ({
        ...prev,
        simulatedScore: status.finalScore10 ?? 5,
      }));
    }
  };

  // === SEMESTER GPA CALCULATIONS ===
  const semesterGpas = useMemo(() => {
    return semesters.map(sem => ({
      id: sem.id,
      name: sem.name,
      ...calculateSemesterGpa(sem),
    }));
  }, [semesters]);

  // Auto-select most recent semester with grades
  useEffect(() => {
    if (gpaDisplayMode === 'semester' && !selectedSemesterId) {
      const lastSemesterWithGrades = [...semesterGpas].reverse().find(s => s.totalCredits > 0);
      if (lastSemesterWithGrades) {
        setSelectedSemesterId(lastSemesterWithGrades.id);
      }
    }
  }, [gpaDisplayMode, selectedSemesterId, semesterGpas]);

  // Get currently displayed semester GPA
  const displayedSemesterGpa = useMemo(() => {
    if (gpaDisplayMode === 'semester' && selectedSemesterId) {
      return semesterGpas.find(s => s.id === selectedSemesterId);
    }
    return null;
  }, [gpaDisplayMode, selectedSemesterId, semesterGpas]);

  // --- ACTIONS ---

  // 1. Quản lý Học kỳ
  const addSemester = () => {
    const newId = semesters.length + 1;
    setSemesters([
      ...semesters,
      {
        id: Date.now(),
        name: `Học kỳ ${newId}`,
        isExpanded: true,
        subjects: [],
      },
    ]);
  };

  const toggleSemester = (semId) => {
    setSemesters(
      semesters.map((s) =>
        s.id === semId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );
  };

  const removeSemester = (semId) => {
    if (confirm("Xóa nguyên học kỳ này là mất hết môn bên trong đó nha?")) {
      setSemesters(semesters.filter((s) => s.id !== semId));
    }
  };

  // 2. Quản lý Môn học trong Kỳ
  const addSubject = (semId) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          return {
            ...s,
            subjects: [
              ...s.subjects,
              {
                id: Date.now(),
                name: "",
                credits: 3,
                type: "general",
                components: [
                  { id: Date.now() + 1, score: "", weight: 30 },
                  { id: Date.now() + 2, score: "", weight: 70 },
                ],
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const updateSubject = (semId, subId, field, value) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          const newSubs = s.subjects.map((sub) => {
            if (sub.id === subId) {
              if (field === "name") {
                const suggested = SUGGESTED_SUBJECTS.find(
                  (sg) => sg.name === value
                );
                if (suggested)
                  return {
                    ...sub,
                    name: value,
                    credits: suggested.credits,
                    type: suggested.type || "general",
                  };
              }
              return { ...sub, [field]: value };
            }
            return sub;
          });
          return { ...s, subjects: newSubs };
        }
        return s;
      })
    );
  };

  const removeSubject = (semId, subId) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          return {
            ...s,
            subjects: s.subjects.filter((sub) => sub.id !== subId),
          };
        }
        return s;
      })
    );
  };

  // 3. Quản lý Thành phần điểm (Giữ nguyên logic cũ nhưng lồng trong Semesters)
  const updateComponent = (semId, subId, compId, field, value) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          const newSubs = s.subjects.map((sub) => {
            if (sub.id === subId) {
              const newComps = sub.components.map((c) =>
                c.id === compId ? { ...c, [field]: value } : c
              );
              return { ...sub, components: newComps };
            }
            return sub;
          });
          return { ...s, subjects: newSubs };
        }
        return s;
      })
    );
  };

  const addComponent = (semId, subId) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          const newSubs = s.subjects.map((sub) => {
            if (sub.id === subId) {
              return {
                ...sub,
                components: [
                  ...sub.components,
                  { id: Date.now(), score: "", weight: 0 },
                ],
              };
            }
            return sub;
          });
          return { ...s, subjects: newSubs };
        }
        return s;
      })
    );
  };

  const removeComponent = (semId, subId, compId) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === semId) {
          const newSubs = s.subjects.map((sub) => {
            if (sub.id === subId && sub.components.length > 1) {
              return {
                ...sub,
                components: sub.components.filter((c) => c.id !== compId),
              };
            }
            return sub;
          });
          return { ...s, subjects: newSubs };
        }
        return s;
      })
    );
  };

  const classification = getClassification(result.gpa4);

  const priorityAlert = getPriorityAlert(riskAlerts, scholarshipInfo?.alerts);
  const targetCredits = user?.totalTargetCredits || 150;
  const missingCredits = Math.max(0, targetCredits - result.totalCredits);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* TẦNG 1: HERO OVERVIEW (Premium Academic Dashboard) */}
      <div className="mb-2">
        <div className="relative overflow-hidden bg-[#F7FAFF] rounded-3xl border border-blue-100/60 shadow-sm p-10 md:p-12">
          <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative grid grid-cols-1 md:grid-cols-10 gap-10 items-center">
            {/* LEFT SIDE: GPA Focus (60% width) */}
            <div className="md:col-span-6 text-center md:text-left">
              <div className="mb-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-500">GPA Tích lũy</span>
              </div>
              
              {/* GPA - True Center */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 justify-center md:justify-start">
                <h1 className="text-8xl md:text-9xl font-black tracking-tight text-blue-700">
                  {result.gpa4}
                </h1>
                
                {/* Classification Badge - Small & Subtle */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-700 border border-blue-100">
                    {classification.label}
                  </span>
                </div>
              </div>

              {/* Momentum - Small & Below */}
              {result.momentum && (
                <div className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${
                  result.momentum.trend === 'up' 
                    ? 'text-green-600' 
                    : result.momentum.trend === 'down' 
                    ? 'text-red-600' 
                    : 'text-gray-500'
                }`}>
                  {result.momentum.trend === 'up' ? <TrendingUp size={14} /> : 
                   result.momentum.trend === 'down' ? <TrendingDown size={14} /> : 
                   <div className="w-3 h-0.5 bg-gray-400 rounded-full"></div>}
                  <span className="font-semibold">
                    {result.momentum.delta > 0 ? '+' : ''}{result.momentum.delta}
                  </span>
                  <span className="text-xs text-gray-400">vs kỳ trước</span>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Metrics & Actions (40% width) */}
            <div className="md:col-span-4 space-y-6">
              {/* Credits Accumulated */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tín chỉ tích lũy</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">{result.totalCredits}</span>
                    <span className="text-sm font-medium text-gray-400 ml-0.5">/{targetCredits}</span>
                  </div>
                </div>
                {/* Thin progress bar - 6px */}
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (result.totalCredits / targetCredits) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-blue-100/60"></div>

              {/* Target GPA */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Mục tiêu GPA</div>
                    <div className="text-xl font-bold text-gray-900">
                      {targetGpa ? targetGpa : <span className="text-gray-400 text-sm font-normal italic">Chưa đặt</span>}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="4.0"
                    className="w-20 text-center bg-white px-3 py-2 rounded-lg font-semibold text-gray-800 outline-none border border-blue-100 focus:border-blue-500 text-sm transition-all"
                    value={targetGpa}
                    onChange={(e) => setTargetGpa(e.target.value)}
                  />
                </div>
                {/* Target progress bar - only show if target is set */}
                {targetGpa && parseFloat(targetGpa) > 0 && (
                  <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(100, (parseFloat(result.gpa4) / parseFloat(targetGpa)) * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveGPA}
                disabled={isSaving}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                  isSaving
                    ? "bg-gray-200 cursor-not-allowed text-gray-400"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm"
                }`}
              >
                <Save size={16} />
                {isSaving ? "Đang lưu..." : "Lưu lộ trình"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TẦNG 2: SMART PRIORITY ALERT - Subtle & Harmonized */}
      {priorityAlert && (
        <div className={`mx-1 mb-6 p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          priorityAlert.severity === 'danger'
            ? 'bg-red-50/50 border-red-200/60 text-red-900'
            : 'bg-blue-50/50 border-blue-100/80 text-blue-900'
        }`}>
          <div className={`p-2 rounded-lg shrink-0 ${
            priorityAlert.severity === 'danger'
              ? 'bg-red-100/80 text-red-600'
              : 'bg-blue-100/70 text-blue-600'
          }`}>
            {priorityAlert.icon ? <span className="text-base">{priorityAlert.icon}</span> : <AlertTriangle size={16} />}
          </div>
          <div className="flex-1 py-0.5">
            <p className="font-semibold text-sm leading-relaxed">{priorityAlert.message}</p>
            {priorityAlert.action && <p className="text-xs mt-1.5 opacity-75 font-medium">{priorityAlert.action}</p>}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* TẦNG 3: MAIN ZONE (Trung tâm) */}
        <div className="w-full space-y-6">
          {semesters.map((sem) => (
            <div
              key={sem.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all">
              {/* HEADER KỲ HỌC (Click để ẩn/hiện) */}
              <div
                className="p-4 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all border-b border-gray-100 dark:border-gray-700 backdrop-blur-sm first:rounded-t-2xl"
                onClick={() => toggleSemester(sem.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${sem.isExpanded ? 'bg-blue-100/50 text-blue-600 rotate-90' : 'bg-transparent text-gray-400'}`}>
                    <ChevronRight size={18} />
                  </div>
                  <input
                    className="font-bold text-gray-800 dark:text-white bg-transparent outline-none text-lg hover:text-blue-600 transition-colors placeholder-gray-400 flex-1 max-w-[300px]"
                    value={sem.name}
                    placeholder="Tên học kỳ..."
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => {
                      const newSems = semesters.map((s) =>
                        s.id === sem.id ? { ...s, name: e.target.value } : s
                      );
                      setSemesters(newSems);
                    }}
                  />
                  <div className="hidden sm:flex items-center gap-2">
                     <span className="text-[10px] uppercase font-bold text-gray-400 bg-white border border-gray-100 dark:bg-gray-700 dark:border-gray-600 px-2 py-1 rounded-md">
                        {sem.subjects.length} môn
                     </span>
                     {sem.subjects.length > 0 && calculateSemesterGpa(sem).totalCredits > 0 && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${
                            calculateSemesterGpa(sem).semesterGpa4 >= 3.2 
                            ? 'bg-green-50 text-green-600 border-green-100' 
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                           GPA: {calculateSemesterGpa(sem).semesterGpa4.toFixed(2)}
                        </span>
                     )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSemester(sem.id);
                  }}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors ml-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* NỘI DUNG KỲ HỌC */}
              {sem.isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 p-4">
                  <div className="flex flex-col gap-3">
                        {sem.subjects.map((sub) => {
                          const {
                            currentScore,
                            missingComponent,
                            isFull,
                            finalScore10,
                          } = calculateSubjectStatus(sub.components);

                          let gradeInfo = null;
                          let predictions = [];

                          if (isFull) {
                            gradeInfo =
                              GRADE_SCALE.find(
                                (g) => parseFloat(finalScore10) >= g.min
                              ) || GRADE_SCALE[GRADE_SCALE.length - 1];
                          } else if (missingComponent) {
                            // Logic cũ: luôn predict dựa trên missingComponent
                            // Nhưng cóp-py từ code cũ thì nó chỉ hiển thị nếu missingComponent tồn tại
                            predictions = predictNeededScores(
                              currentScore,
                              missingComponent.weight,
                              sub.type
                            );
                            
                            // MOD: Nếu không thể tìm thấy prediction hợp lệ (ví dụ cần > 10 điểm)
                            // Ta vẫn nên hiển thị cái gì đó hữu ích hơn là trống trơn
                            if (predictions.length === 0 && missingComponent.weight > 0) {
                                // Tính điểm max có thể đạt được
                                const maxPossible = currentScore + (10 * (missingComponent.weight / 100));
                                // Nếu max < 4.0 (trượt) -> Cảnh báo
                                if (maxPossible < 4.0) {
                                     // Special handling for "Impossible to pass"
                                }
                            }
                          }
                          const isPassed =
                            isFull &&
                            (sub.type === "major"
                              ? parseFloat(finalScore10) >= 5.5
                              : parseFloat(finalScore10) >= 4.0);

                          // Check if this is a critical subject
                          const isCriticalSubject = strategyData.criticalSubject?.subjectName === sub.name;
                          const isTopCritical = strategyData.topCriticalSubjects.slice(0, 3).some(
                            cs => cs.id === sub.id
                          );
                          
                          // Determine border color based on status (subtle for "Emotional Feedback")
                          let statusBorderClass = "border-l-4 border-l-transparent";
                          if (isFull && gradeInfo) {
                             if (gradeInfo.point >= 3.6) statusBorderClass = "border-l-4 border-l-green-400"; // Excellent
                             else if (gradeInfo.point < 2.0) statusBorderClass = "border-l-4 border-l-red-400"; // Low
                             else if (gradeInfo.point < 2.5) statusBorderClass = "border-l-4 border-l-orange-400"; // Warning
                          }

                          return (
                            <React.Fragment key={sub.id}>
                            <div
                              className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 p-5 ${statusBorderClass} ${
                                isCriticalSubject 
                                  ? 'bg-amber-50/20 dark:bg-amber-900/5' 
                                  : isTopCritical 
                                  ? 'bg-purple-50/10 dark:bg-purple-900/5' 
                                  : ''
                              }`}
                            >
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* 1. SUBJECT NAME & TYPE (Anchor) */}
                                <div className="flex-1 min-w-[30%]">
                                  <div className="flex items-start gap-3">
                                    {isCriticalSubject && (
                                      <div className="mt-1.5 text-amber-500 animate-pulse" title="Môn trọng điểm">
                                        <Star size={16} fill="currentColor" />
                                      </div>
                                    )}
                                    <div className="w-full space-y-2">
                                        <input
                                          list="subject-suggestions"
                                          type="text"
                                          placeholder="Tên môn học..."
                                          className="w-full font-bold text-gray-800 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600 text-lg group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors"
                                          value={sub.name}
                                          onChange={(e) =>
                                            updateSubject(
                                              sem.id,
                                              sub.id,
                                              "name",
                                              e.target.value
                                            )
                                          }
                                        />
                                        <button
                                          onClick={() =>
                                            updateSubject(sem.id, sub.id, "type", sub.type === "general" ? "major" : "general")
                                          }
                                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                            sub.type === "major"
                                              ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                            : "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100"
                                        }`}
                                      >
                                        {sub.type === "major" ? (
                                            <>
                                                <Zap size={10} className="fill-current" />
                                                CHUYÊN NGÀNH
                                            </>
                                        ) : (
                                            <>
                                                <Layers size={10} className="fill-current" />
                                                ĐẠI CƯƠNG
                                            </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. CREDITS (Informational Pill) */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide hidden md:inline-block">Số TC</span>
                                    <div className="relative group/credits">
                                      <input
                                        type="number"
                                        className="w-10 text-center bg-gray-50 dark:bg-gray-700/50 rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:bg-white focus:border-blue-200 dark:focus:border-blue-800 font-bold text-gray-600 dark:text-gray-300 outline-none text-sm py-1 transition-all"
                                        value={sub.credits}
                                        onChange={(e) =>
                                          updateSubject(
                                            sem.id,
                                            sub.id,
                                            "credits",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                </div>

                                {/* 3. GRADE COMPONENTS (Clean Rows) */}
                                <div className="flex-[2] flex flex-col gap-2 min-w-[200px]">
                                  {sub.components.map((comp) => (
                                    <div
                                      key={comp.id}
                                      className="flex items-center gap-3 text-sm group/comp relative pl-2 border-l-2 border-transparent hover:border-gray-200 transition-all"
                                    >
                                       {/* Score Input (Swapped: Now First) */}
                                      <div className="relative flex-1">
                                          <input
                                            type="number"
                                            placeholder="Nhập điểm..."
                                            className={`w-20 font-bold bg-transparent outline-none transition-all ${
                                              comp.score === ""
                                                ? "text-gray-400 placeholder-gray-300 text-sm"
                                                : "text-gray-800 dark:text-white text-base"
                                            }`}
                                            value={comp.score}
                                            onChange={(e) =>
                                              updateComponent(
                                                sem.id,
                                                sub.id,
                                                comp.id,
                                                "score",
                                                e.target.value
                                              )
                                            }
                                          />
                                      </div>

                                      {/* Separator */}
                                      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>

                                      {/* Weight Pill (Swapped: Now Second) */}
                                      <div className="flex items-center relative w-12 justify-end">
                                          <input
                                            type="number"
                                            className="w-full text-right text-xs font-bold text-gray-500 dark:text-gray-400 bg-transparent outline-none focus:text-blue-600"
                                            value={comp.weight}
                                            onChange={(e) =>
                                              updateComponent(
                                                sem.id,
                                                sub.id,
                                                comp.id,
                                                "weight",
                                                e.target.value
                                              )
                                            }
                                          />
                                          <span className="text-[10px] text-gray-400 ml-0.5">%</span>
                                              sem.id,
                                              sub.id,
                                              comp.id
                                            )
                                          }
                                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover/comp:opacity-100 transition-opacity p-1"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                      
                                      <div 
                                        className={`absolute bottom-0 left-0 right-16 h-[2px] bg-gray-100 rounded-full overflow-hidden opacity-0 group-hover/comp:opacity-100 transition-opacity`}
                                      >
                                          <div 
                                            className={`h-full ${parseFloat(comp.score) >= 8.5 ? 'bg-green-400' : parseFloat(comp.score) >= 7 ? 'bg-blue-400' : parseFloat(comp.score) >= 5 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                                            style={{ width: `${parseFloat(comp.score) * 10}%` }}
                                          ></div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <button
                                    onClick={() => addComponent(sem.id, sub.id)}
                                    className="text-[10px] text-blue-500/80 hover:text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity mt-1 ml-2"
                                  >
                                    <Plus size={12} /> Thêm cột điểm
                                  </button>
                                </div>

                                {/* 4. RESULT AREA (Capsule) */}
                                <div className="min-w-[140px] flex justify-end">
                                  {isFull && gradeInfo ? (
                                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
                                        isPassed 
                                        ? `bg-${gradeInfo.color.split('-')[1]}-50/50 border-${gradeInfo.color.split('-')[1]}-100` 
                                        : 'bg-red-50 border-red-100'
                                    } ${gradeInfo.char === 'A' ? 'ring-2 ring-green-100 shadow-md scale-105' : ''}`}>
                                      <div>
                                          <div className={`text-2xl font-black leading-none ${gradeInfo.color}`}>
                                            {finalScore10.toFixed(1)}
                                          </div>
                                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1 text-center">
                                            Thang 10
                                          </div>
                                      </div>
                                      <div className="w-px h-8 bg-current opacity-20"></div>
                                      <div className="flex flex-col items-center">
                                          <span className={`text-lg font-black ${gradeInfo.color}`}>
                                            {gradeInfo.char}
                                          </span>
                                          <span className="text-[10px] font-bold text-gray-500">
                                            {gradeInfo.point}
                                          </span>
                                      </div>
                                    </div>
                                  ) : missingComponent ? (
                                    <div className="flex flex-col gap-2 items-end">
                                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">Cần đạt tối thiểu:</span>
                                      <div className="flex flex-wrap justify-end gap-2">
                                        {predictions.length > 0 ? (
                                          predictions.map((p, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
                                            >
                                              <span
                                                className={`text-xs font-black ${
                                                  p.char === "A"
                                                    ? "text-green-600"
                                                    : "text-blue-600"
                                                }`}
                                              >
                                                {p.char}
                                              </span>
                                              <span className="text-gray-300 dark:text-gray-500 text-[10px]">
                                                →
                                              </span>
                                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                {p.score}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg whitespace-nowrap">
                                            Rớt chắc rồi 😭
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-600 text-xs font-medium italic">
                                      Đang tính toán...
                                    </span>
                                  )}
                                </div>
                                
                                {/* 5. ACTIONS (Always visible but subtle, no overlap) */}
                                <div className="flex flex-col items-center justify-center gap-1 ml-4 border-l border-gray-100 dark:border-gray-700 pl-4">
                                  {isFull && (
                                    <button
                                      onClick={() => handleOpenSurvivalMode(sub.id, parseFloat(finalScore10))}
                                      className={`p-2 rounded-lg transition-all ${
                                        survivalMode.activeSubjectId === sub.id
                                          ? 'bg-blue-100 text-blue-600'
                                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                      title="Giả lập điểm (Survival Mode)"
                                    >
                                      <Sliders size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => removeSubject(sem.id, sub.id)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    title="Xóa môn học"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                              </div>
                            </div>
                            
                            {/* Survival Mode Panel (Embedded below card) */}
                            {survivalMode.activeSubjectId === sub.id && isFull && (
                                <div className="mt-2 ml-4 border-l-2 border-blue-100 pl-4 animate-in fade-in slide-in-from-top-2">
                                  <SurvivalModePanel
                                    subject={sub}
                                    currentScore={parseFloat(finalScore10)}
                                    simulatedScore={survivalMode.simulatedScore}
                                    onScoreChange={handleSimulatedScoreChange}
                                    onReset={handleResetSimulation}
                                    onClose={handleCloseSurvivalMode}
                                    simulationResult={simulationResult}
                                    targetGpa={parseFloat(targetGpa) || 0}
                                  />
                                </div>
                            )}
                          </React.Fragment>
                          );
                        })}
                  </div>
                  <button
                    onClick={() => addSubject(sem.id)}
                    className="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 group"
                  >
                    <div className="p-1 rounded-md bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 transition-colors">
                        <Plus size={16} />
                    </div>
                    Thêm môn học mới
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addSemester}
            className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400 dark:text-gray-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-3 group"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                <FolderPlus size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            Thêm Học Kỳ Mới
          </button>
        </div>

        </div>

        {/* TẦNG 4: ADVANCED ANALYSIS (Premium Collapsible) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 mt-8 group">
            <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-5">
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${isAdvancedOpen ? 'bg-purple-100 text-purple-600 rotate-3 scale-110 shadow-sm' : 'bg-gray-100 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'}`}>
                        <BarChart3 size={24} strokeWidth={isAdvancedOpen ? 2.5 : 2} />
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-lg transition-colors ${isAdvancedOpen ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Phân tích nâng cao</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-0.5">Chiến lược, Giả lập điểm & Bản đồ GPA</p>
                    </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isAdvancedOpen ? 'bg-gray-100 rotate-180 text-gray-900' : 'text-gray-400 group-hover:bg-gray-50'}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {isAdvancedOpen && (
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Scholarship Toggle */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                        <ScholarshipToggle
                            scholarshipInfo={scholarshipInfo}
                            selectedLevel={selectedScholarshipLevel}
                            onLevelChange={setSelectedScholarshipLevel}
                            isScholarshipMode={isScholarshipMode}
                            onModeToggle={setIsScholarshipMode}
                        />
                    </div>

                    {/* MAIN ADVANCED GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         {/* COL 1: GPA Display Logic */}
                         <div className="flex flex-col h-full">
                            {!isScholarshipMode && (
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Layers size={14} /> Chế độ hiển thị
                                    </h4>
                                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-6">
                                        <button
                                            onClick={() => setGpaDisplayMode('cumulative')}
                                            className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                                gpaDisplayMode === 'cumulative'
                                                    ? 'bg-white text-primary shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                        >
                                            Tích lũy
                                        </button>
                                        <button
                                            onClick={() => setGpaDisplayMode('semester')}
                                            className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                                gpaDisplayMode === 'semester'
                                                    ? 'bg-white text-primary shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                            }`}
                                        >
                                            Học kỳ
                                        </button>
                                    </div>
                                    
                                    {gpaDisplayMode === 'semester' && (
                                        <div className="mb-6 relative">
                                            <select
                                                value={selectedSemesterId || ''}
                                                onChange={(e) => setSelectedSemesterId(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 pr-10 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer hover:border-primary/50"
                                            >
                                                <option value="">Chọn học kỳ...</option>
                                                {semesterGpas.map((sem) => (
                                                    <option key={sem.id} value={sem.id}>
                                                        {sem.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Mini Display Card */}
                                    <div className="mt-auto p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center relative overflow-hidden group/mini">
                                         <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/mini:opacity-20 transition-opacity">
                                            <Calculator size={48} />
                                         </div>
                                         <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">
                                             {gpaDisplayMode === 'cumulative' ? 'GPA Tích lũy' : (displayedSemesterGpa ? displayedSemesterGpa.name : 'Chọn học kỳ')}
                                         </p>
                                         <p className="text-4xl font-black text-gray-800 dark:text-white my-2 tracking-tight">
                                             {gpaDisplayMode === 'cumulative' 
                                                ? result.gpa4 
                                                : (displayedSemesterGpa ? displayedSemesterGpa.semesterGpa4.toFixed(2) : '0.00')}
                                         </p>
                                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${gpaDisplayMode === 'cumulative' ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-100 border-transparent'} ${gpaDisplayMode === 'cumulative' ? classification.color : 'text-gray-500'}`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${gpaDisplayMode === 'cumulative' ? classification.bg.replace('bg-', 'bg-') : 'bg-gray-400'}`}></span>
                                              {gpaDisplayMode === 'cumulative' 
                                                ? classification.label 
                                                : (displayedSemesterGpa ? getClassification(displayedSemesterGpa.semesterGpa4).label : 'N/A')}
                                         </span>
                                    </div>
                                </div>
                            )}
                         </div>

                         {/* COL 2: Strategy & Scenarios */}
                         <div className="flex flex-col h-full space-y-4">
                            {!isScholarshipMode && targetGpa && strategyData.strategy?.feasibility && (
                                <div className={`p-5 rounded-2xl border bg-white dark:bg-gray-800 shadow-sm transition-all ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).border}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500">
                                                <Target size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mục tiêu {targetGpa}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).bg} ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).text}`}>
                                            {getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).label}
                                        </span>
                                    </div>
                                    
                                    {result.prediction4 && result.prediction4 <= 4.0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-end gap-2">
                                                <span className="text-3xl font-black text-gray-800 dark:text-white">{result.prediction4.toFixed(2)}</span>
                                                <span className="text-sm font-medium text-gray-400 mb-1">/ 4.0</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(result.prediction4 / 4) * 100}%` }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed pl-2 border-l-2 border-purple-200">
                                                {strategyData.strategy.feasibility.feasibilityMessage}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm font-bold text-red-500">Mục tiêu không khả thi</p>
                                            <p className="text-xs text-gray-400 mt-1">Cần > 4.0 để đạt được</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isScholarshipMode && strategyData.scenarios && (
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex-1">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Sliders size={14} /> Kịch bản điểm số
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100 hover:border-green-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="text-xs font-bold text-green-700 uppercase">An toàn</span>
                                            </div>
                                            <span className="text-lg font-black text-green-800">{strategyData.scenarios.safe.requiredScore}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="text-xs font-bold text-blue-700 uppercase">Cân bằng</span>
                                            </div>
                                            <span className="text-lg font-black text-blue-800">{strategyData.scenarios.balanced.requiredScore}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                         </div>

                         {/* COL 3: Critical & Stats */}
                         <div className="flex flex-col h-full space-y-4">
                             {!isScholarshipMode && strategyData.criticalSubject && (
                                <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/50 shadow-sm">
                                    <h4 className="text-xs font-bold text-amber-600/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Star size={14} fill="currentColor" /> Môn trọng điểm
                                    </h4>
                                    <p className="font-bold text-gray-800 dark:text-white text-base leading-tight">{strategyData.criticalSubject.subjectName}</p>
                                    <div className="mt-3 pt-3 border-t border-amber-200/50">
                                        <p className="text-xs text-amber-800 dark:text-amber-400 font-medium italic leading-relaxed">"{strategyData.criticalSubject.suggestion}"</p>
                                    </div>
                                </div>
                             )}

                             <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex-1">
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Thống kê nhanh</h4>
                                 <div className="grid grid-cols-2 gap-3">
                                     <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                         <p className="text-[10px] text-gray-400 font-bold uppercase">GPA Hệ 10</p>
                                         <p className="text-xl font-black text-gray-700 dark:text-gray-200 mt-1">{result.gpa10}</p>
                                     </div>
                                     <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                         <p className="text-[10px] text-gray-400 font-bold uppercase">Đã đạt</p>
                                         <p className="text-xl font-black text-gray-700 dark:text-gray-200 mt-1">{result.passedCredits} <span className="text-xs font-medium text-gray-400">TC</span></p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* GPA MAP - Conditional Render */}
                    {(isScholarshipMode || targetGpa || survivalMode.activeSubjectId) && gpaMapData && (
                        <div className="mt-6 pt-8 border-t border-gray-200 dark:border-gray-700 border-dashed">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <RotateCcw size={18} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Bản đồ GPA</h3>
                            </div>
                            <GpaMapCard mapData={gpaMapData} />
                        </div>
                    )}

                    {/* ACTION STEPS */}
                    {strategyData.strategy && (
                        <div className="mt-6 pt-8 border-t border-gray-200 dark:border-gray-700 border-dashed">
                             <button 
                                className="w-full flex items-center justify-between group"
                                onClick={() => setShowStrategyPanel(!showStrategyPanel)}
                              >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg group-hover:bg-yellow-200 transition-colors">
                                        <Lightbulb size={18} className="fill-current" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">
                                        Gợi ý hành động chi tiết
                                    </h3>
                                </div>
                                <div className={`p-2 rounded-full bg-gray-50 text-gray-400 transition-all ${showStrategyPanel ? 'rotate-180 bg-gray-100 text-gray-600' : ''}`}>
                                    <ChevronDown size={20} />
                                </div>
                              </button>

                              {showStrategyPanel && (
                                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                    <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                                      {strategyData.strategy.summary}
                                    </p>
                                  </div>

                                  {strategyData.strategy.actionSteps.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {strategyData.strategy.actionSteps.map((step, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shadow-sm">
                                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold mt-0.5">{idx + 1}</span>
                                          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{step}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {strategyData.strategy.riskWarning && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-start gap-3">
                                      <AlertOctagon size={20} className="text-red-500 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">
                                            Lưu ý quan trọng
                                        </p>
                                        <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                                            {strategyData.strategy.riskWarning}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                        </div>
                    )}
                    
                    {/* PRIORITY LIST */}
                    {strategyData.topCriticalSubjects.length > 0 && (
                        <div className="mt-6 pt-8 border-t border-gray-200 dark:border-gray-700 border-dashed">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <BarChart3 size={18} />
                                </div>
                                Danh sách môn cần ưu tiên
                            </h3>
                            <div className="space-y-3">
                                {strategyData.topCriticalSubjects.map((sub, idx) => {
                                  const isCritical = idx === 0;
                                  const getPriorityLabel = (score, index) => {
                                    if (index === 0) return { label: 'Ưu tiên cao', color: 'text-amber-600 bg-amber-100', stars: 3 };
                                    if (index <= 2) return { label: 'Ưu tiên', color: 'text-purple-600 bg-purple-100', stars: 2 };
                                    return { label: 'Theo dõi', color: 'text-gray-500 bg-gray-100', stars: 1 };
                                  };
                                  const priority = getPriorityLabel(sub.impactScore, idx);
                                  return (
                                    <div key={sub.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isCritical ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'}`}>
                                      <div className="flex items-center gap-4">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isCritical ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                          {idx + 1}
                                        </span>
                                        <div>
                                          <p className="font-bold text-gray-800 dark:text-white text-base">{sub.subjectName}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub.credits} TC • {sub.isFull ? `Điểm: ${sub.currentScore}/10` : 'Chưa có điểm'}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${priority.color}`}>
                                          {priority.label}
                                        </span>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 max-w-[200px] truncate">{sub.suggestion}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

      <datalist id="subject-suggestions">
        {SUGGESTED_SUBJECTS.map((s, index) => (
          <option key={index} value={s.name} />
        ))}
      </datalist>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(userData) => {
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default GpaCalc;
