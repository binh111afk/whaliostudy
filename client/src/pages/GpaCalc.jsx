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

  components.forEach((comp) => {
    const w = parseFloat(comp.weight) || 0;
    if (comp.score !== "") {
      currentScore += parseFloat(comp.score) * (w / 100);
      currentWeight += w;
    } else {
      if (!missingComponent || w > missingComponent.weight) {
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

    setResult({
      gpa4,
      gpa10: totalCredits ? (totalScoreCredit / totalCredits).toFixed(2) : 0,
      totalCredits,
      passedCredits,
      prediction4,
      prediction10,
      predictionChar,
      pendingCredits,
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
      {/* TẦNG 1: OVERVIEW (Gọn - 1 thẻ duy nhất) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Title & Save */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary dark:text-blue-400">
                    <Calculator size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-800 dark:text-white">Hồ sơ học tập</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Quản lý GPA & Lộ trình</p>
                </div>
            </div>

            {/* Middle: Key Metrics Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">GPA Tích lũy</p>
                    <p className="text-2xl font-black text-primary dark:text-blue-400">{result.gpa4}</p>
                </div>
                <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Xếp loại</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${classification.bg} ${classification.color}`}>
                        {classification.label}
                    </span>
                </div>
                <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Mục tiêu GPA</p>
                    <input
                        type="number"
                        placeholder="3.6"
                        className="w-16 text-center bg-transparent font-bold text-gray-800 dark:text-white outline-none border-b border-dashed border-gray-300 focus:border-primary text-lg"
                        value={targetGpa}
                        onChange={(e) => setTargetGpa(e.target.value)}
                    />
                </div>
                <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Tín chỉ</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                        {result.totalCredits}<span className="text-gray-400 font-normal">/{targetCredits}</span>
                    </p>
                </div>
            </div>

            {/* Right: Save Button */}
            <button
                onClick={handleSaveGPA}
                disabled={isSaving}
                className={`px-4 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm shrink-0 ${
                    isSaving
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600"
                }`}
            >
                <Save size={16} />
                {isSaving ? "Đang lưu..." : "Lưu"}
            </button>
        </div>
      </div>

      {/* TẦNG 2: ACTIONABLE ALERT (Chỉ 1 khối) */}
      {priorityAlert && (
        <div className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 transition-all ${
            priorityAlert.severity === 'danger' ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-900 dark:text-red-200' :
            priorityAlert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500 text-amber-900 dark:text-amber-200' :
            priorityAlert.severity === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-900 dark:text-green-200' :
            'bg-blue-50 dark:bg-blue-900/10 border-blue-500 text-blue-900 dark:text-blue-200'
        }`}>
            <div className="mt-0.5 shrink-0">
                {priorityAlert.icon ? <span className="text-xl">{priorityAlert.icon}</span> : <AlertTriangle size={20} />}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm leading-tight">{priorityAlert.message}</p>
                {priorityAlert.action && <p className="text-xs mt-1 opacity-90 font-medium">{priorityAlert.action}</p>}
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
                className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 first:rounded-t-2xl"
                onClick={() => toggleSemester(sem.id)}
              >
                <div className="flex items-center gap-3">
                  {sem.isExpanded ? (
                    <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
                  )}
                  <input
                    className="font-bold text-gray-800 dark:text-white bg-transparent outline-none text-lg"
                    value={sem.name}
                    onClick={(e) => e.stopPropagation()} // Để không bị đóng tab khi sửa tên
                    onChange={(e) => {
                      const newSems = semesters.map((s) =>
                        s.id === sem.id ? { ...s, name: e.target.value } : s
                      );
                      setSemesters(newSems);
                    }}
                  />
                  <span className="text-xs bg-white dark:bg-gray-700 border dark:border-gray-600 px-2 py-1 rounded-full text-gray-500 dark:text-gray-400 font-medium">
                    {sem.subjects.length} môn
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSemester(sem.id);
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* NỘI DUNG KỲ HỌC */}
              {sem.isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                          <th className="p-3 font-bold w-1/4">
                            Tên môn & Loại
                          </th>
                          <th className="p-3 font-bold w-16 text-center">TC</th>
                          <th className="p-3 font-bold w-1/3">Thành phần</th>
                          <th className="p-3 font-bold w-48">Kết quả</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
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
                            predictions = predictNeededScores(
                              currentScore,
                              missingComponent.weight,
                              sub.type
                            );
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

                          return (
                            <React.Fragment key={sub.id}>
                            <tr
                              className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors align-top group ${
                                isCriticalSubject 
                                  ? 'bg-amber-50/50 dark:bg-amber-900/10 ring-2 ring-amber-200 dark:ring-amber-700 ring-inset' 
                                  : isTopCritical 
                                  ? 'bg-purple-50/30 dark:bg-purple-900/5' 
                                  : ''
                              }`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {isCriticalSubject && (
                                    <span className="text-amber-500" title="Môn có ảnh hưởng lớn nhất">
                                      <Star size={14} fill="currentColor" />
                                    </span>
                                  )}
                                  <input
                                    list="subject-suggestions"
                                    type="text"
                                    placeholder="Nhập tên môn..."
                                    className="w-full font-bold text-gray-700 dark:text-gray-200 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600 text-sm mb-1"
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
                                </div>
                                <div className="mt-1">
                                  <button
                                    onClick={() =>
                                      updateSubject(sem.id, sub.id, "type", sub.type === "general" ? "major" : "general")
                                    }
                                    className={`text-[11px] flex items-center gap-1 transition-all cursor-pointer font-medium ${
                                      sub.type === "major"
                                        ? "text-purple-600 dark:text-purple-400"
                                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                                    }`}
                                  >
                                    {sub.type === "major" ? (
                                        <>
                                            <Zap size={12} className="fill-current" />
                                            Chuyên ngành
                                        </>
                                    ) : (
                                        "Đại cương"
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  className="w-full text-center bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 font-bold text-gray-700 dark:text-white outline-none text-sm py-1 transition-all"
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
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {sub.components.map((comp) => (
                                    <div
                                      key={comp.id}
                                      className="flex items-center gap-1 group/comp"
                                    >
                                      <input
                                        type="number"
                                        placeholder="Điểm"
                                        className={`w-14 h-7 text-center font-bold text-sm bg-transparent border-b outline-none transition-all ${
                                          comp.score === ""
                                            ? "border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                                            : "border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white focus:border-blue-500"
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
                                      <span className="text-gray-300 dark:text-gray-600 text-xs mx-0.5">
                                        x
                                      </span>
                                      <div className="relative">
                                          <input
                                            type="number"
                                            placeholder="%"
                                            className="w-10 h-7 text-center text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-gray-100 dark:border-gray-700 outline-none focus:border-blue-500 focus:text-blue-600"
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
                                          <span className="absolute top-1 right-0 text-[9px] text-gray-300 pointer-events-none">%</span>
                                      </div>
                                      
                                      {sub.components.length > 1 && (
                                        <button
                                          onClick={() =>
                                            removeComponent(
                                              sem.id,
                                              sub.id,
                                              comp.id
                                            )
                                          }
                                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover/comp:opacity-100 transition-opacity ml-1"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addComponent(sem.id, sub.id)}
                                    className="text-xs text-primary/70 dark:text-blue-400/70 hover:text-primary font-medium flex items-center gap-1 cursor-pointer mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Plus size={10} /> Thêm
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                {isFull && gradeInfo ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-baseline gap-2">
                                      <span className={`text-lg font-black ${isPassed ? 'text-gray-800 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                                        {finalScore10.toFixed(1)}
                                      </span>
                                      <span className={`text-sm font-bold ${gradeInfo.color}`}>
                                        {gradeInfo.char} <span className="text-gray-400 dark:text-gray-600 font-normal text-[10px]">/ {gradeInfo.point}</span>
                                      </span>
                                    </div>
                                    {!isPassed && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                        <XCircle size={10} /> Học lại
                                      </span>
                                    )}
                                  </div>
                                ) : missingComponent ? (
                                  <div className="flex flex-wrap gap-1">
                                    {predictions.length > 0 ? (
                                      predictions.map((p, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-1 bg-white dark:bg-gray-700 border dark:border-gray-600 px-1.5 py-0.5 rounded shadow-sm"
                                        >
                                          <span
                                            className={`text-[10px] font-bold ${
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
                                          <span className="text-xs font-black text-gray-800 dark:text-white">
                                            {p.score}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-red-500 font-medium">
                                        Rớt chắc rồi 😭
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                                    ...
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  {/* Survival Mode Button - chỉ hiện khi có điểm đầy đủ */}
                                  {isFull && (
                                    <button
                                      onClick={() => handleOpenSurvivalMode(sub.id, parseFloat(finalScore10))}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        survivalMode.activeSubjectId === sub.id
                                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                          : 'text-gray-300 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                      }`}
                                      title="Survival Mode - Thử thay đổi điểm"
                                    >
                                      <Sliders size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => removeSubject(sem.id, sub.id)}
                                    className="text-gray-300 dark:text-gray-500 hover:text-red-500 p-1.5"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* Survival Mode Panel - inline expansion */}
                            {survivalMode.activeSubjectId === sub.id && isFull && (
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
                            )}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => addSubject(sem.id)}
                    className="w-full py-3 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-600"
                  >
                    <Plus size={16} /> Thêm môn vào {sem.name}
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addSemester}
            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 dark:text-gray-400 font-bold hover:border-primary hover:text-primary dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
          >
            <FolderPlus size={20} /> Thêm Học Kỳ Mới
          </button>
        </div>

        </div>

        {/* TẦNG 4: ADVANCED ANALYSIS (Collapsible) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm mt-8">
            <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        <BarChart3 size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-800 dark:text-white">Phân tích nâng cao & Chiến lược</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">GPA Map, Survival Mode, Gợi ý cải thiện điểm số</p>
                    </div>
                </div>
                {isAdvancedOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>

            {isAdvancedOpen && (
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 space-y-8">
                    {/* Scholarship Toggle */}
                    <ScholarshipToggle
                        scholarshipInfo={scholarshipInfo}
                        selectedLevel={selectedScholarshipLevel}
                        onLevelChange={setSelectedScholarshipLevel}
                        isScholarshipMode={isScholarshipMode}
                        onModeToggle={setIsScholarshipMode}
                    />

                    {/* MAIN ADVANCED GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         {/* COL 1: GPA Display Logic */}
                         <div className="space-y-4">
                            {!isScholarshipMode && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Chế độ xem</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGpaDisplayMode('cumulative')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                gpaDisplayMode === 'cumulative'
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            Tích lũy
                                        </button>
                                        <button
                                            onClick={() => setGpaDisplayMode('semester')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                gpaDisplayMode === 'semester'
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            Học kỳ
                                        </button>
                                    </div>
                                    
                                    {gpaDisplayMode === 'semester' && (
                                        <select
                                            value={selectedSemesterId || ''}
                                            onChange={(e) => setSelectedSemesterId(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">Chọn học kỳ</option>
                                            {semesterGpas.map((sem) => (
                                                <option key={sem.id} value={sem.id}>
                                                    {sem.name} {sem.totalCredits > 0 ? `(GPA: ${sem.semesterGpa4.toFixed(2)})` : '(Chưa có điểm)'}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Mini Display Card */}
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                                         <p className="text-xs text-gray-500 uppercase font-bold">
                                             {gpaDisplayMode === 'cumulative' ? 'GPA Tích lũy' : (displayedSemesterGpa ? displayedSemesterGpa.name : 'Chọn học kỳ')}
                                         </p>
                                         <p className="text-3xl font-black text-gray-800 dark:text-white my-1">
                                             {gpaDisplayMode === 'cumulative' 
                                                ? result.gpa4 
                                                : (displayedSemesterGpa ? displayedSemesterGpa.semesterGpa4.toFixed(2) : '0.00')}
                                         </p>
                                         <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${gpaDisplayMode === 'cumulative' ? classification.bg : 'bg-gray-200'} ${gpaDisplayMode === 'cumulative' ? classification.color : 'text-gray-600'}`}>
                                              {gpaDisplayMode === 'cumulative' 
                                                ? classification.label 
                                                : (displayedSemesterGpa ? getClassification(displayedSemesterGpa.semesterGpa4).label : 'N/A')}
                                         </span>
                                    </div>
                                </div>
                            )}
                         </div>

                         {/* COL 2: Strategy & Scenarios */}
                         <div className="space-y-4">
                            {!isScholarshipMode && targetGpa && strategyData.strategy?.feasibility && (
                                <div className={`p-4 rounded-xl border ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).bg} ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).border}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                                            <Target size={14} /> Mục tiêu {targetGpa}
                                        </p>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).bg} ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).text}`}>
                                            {getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).label}
                                        </span>
                                    </div>
                                    {result.prediction4 && result.prediction4 <= 4.0 ? (
                                        <div>
                                            <p className="text-sm font-bold">Cần đạt: <span className="text-purple-600">{result.prediction4.toFixed(2)}</span> / 4.0</p>
                                            <p className="text-xs text-gray-500 mt-1">~ {result.prediction10} (thang 10)</p>
                                            <p className="text-xs mt-2 italic opacity-80">{strategyData.strategy.feasibility.feasibilityMessage}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-red-500">Không khả thi</p>
                                    )}
                                </div>
                            )}

                            {!isScholarshipMode && strategyData.scenarios && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase text-gray-400">Kịch bản điểm số</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-green-50 rounded border border-green-100">
                                            <p className="text-[10px] font-bold text-green-700">An toàn</p>
                                            <p className="text-sm font-black text-green-800">{strategyData.scenarios.safe.requiredScore}</p>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                            <p className="text-[10px] font-bold text-blue-700">Mục tiêu</p>
                                            <p className="text-sm font-black text-blue-800">{strategyData.scenarios.balanced.requiredScore}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                         </div>

                         {/* COL 3: Critical & Stats */}
                         <div className="space-y-4">
                             {!isScholarshipMode && strategyData.criticalSubject && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                                    <p className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1 mb-1">
                                        <Star size={14} /> Môn trọng điểm
                                    </p>
                                    <p className="font-bold text-gray-800 dark:text-white text-sm">{strategyData.criticalSubject.subjectName}</p>
                                    <p className="text-xs text-amber-700 mt-1 italic">{strategyData.criticalSubject.suggestion}</p>
                                </div>
                             )}

                             <div className="space-y-2">
                                 <p className="text-xs font-bold uppercase text-gray-400">Thống kê</p>
                                 <div className="grid grid-cols-2 gap-2">
                                     <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                         <p className="text-[10px] text-gray-500">GPA (10)</p>
                                         <p className="font-bold">{result.gpa10}</p>
                                     </div>
                                     <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                         <p className="text-[10px] text-gray-500">Đã đạt</p>
                                         <p className="font-bold">{result.passedCredits} TC</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* GPA MAP */}
                    {(isScholarshipMode || targetGpa || survivalMode.activeSubjectId) && gpaMapData && (
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <GpaMapCard mapData={gpaMapData} />
                        </div>
                    )}

                    {/* ACTION STEPS (Reused from Strategy Panel) */}
                    {strategyData.strategy && (
                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                             <div 
                                className="flex items-center justify-between cursor-pointer mb-4"
                                onClick={() => setShowStrategyPanel(!showStrategyPanel)}
                              >
                                <div>
                                  <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Lightbulb className="text-yellow-500" size={20} />
                                    Gợi ý hành động chi tiết
                                  </h3>
                                </div>
                                <ChevronDown 
                                  size={20} 
                                  className={`text-gray-500 transition-transform ${showStrategyPanel ? 'rotate-180' : ''}`}
                                />
                              </div>

                              {showStrategyPanel && (
                                <div className="space-y-4 pl-2">
                                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                                      {strategyData.strategy.summary}
                                    </p>
                                  </div>

                                  {strategyData.strategy.actionSteps.length > 0 && (
                                    <ul className="space-y-2">
                                      {strategyData.strategy.actionSteps.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                          <span className="font-bold text-primary dark:text-blue-400 mt-0.5">{idx + 1}.</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  
                                  {strategyData.strategy.riskWarning && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                                      <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                                        <AlertOctagon size={12} /> Lưu ý quan trọng
                                      </p>
                                      <p className="text-sm text-red-700 dark:text-red-400">
                                        {strategyData.strategy.riskWarning}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                        </div>
                    )}
                    
                    {/* PRIORITY LIST (Reused from Top Critical Subjects) */}
                    {strategyData.topCriticalSubjects.length > 0 && (
                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-1">
                                <BarChart3 className="text-purple-500" size={20} />
                                Danh sách môn cần ưu tiên
                            </h3>
                            <div className="space-y-3 mt-4">
                                {strategyData.topCriticalSubjects.map((sub, idx) => {
                                  const isCritical = idx === 0;
                                  const getPriorityLabel = (score, index) => {
                                    if (index === 0) return { label: 'Ưu tiên cao', color: 'text-amber-600 dark:text-amber-400', stars: 3 };
                                    if (index <= 2) return { label: 'Ưu tiên', color: 'text-purple-600 dark:text-purple-400', stars: 2 };
                                    return { label: 'Theo dõi', color: 'text-gray-500 dark:text-gray-400', stars: 1 };
                                  };
                                  const priority = getPriorityLabel(sub.impactScore, idx);
                                  return (
                                    <div key={sub.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isCritical ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-700 border-transparent'}`}>
                                      <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCritical ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                                          {idx + 1}
                                        </span>
                                        <div>
                                          <p className="font-bold text-gray-800 dark:text-white text-sm">{sub.subjectName}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">{sub.credits} TC • {sub.isFull ? `Điểm hiện tại: ${sub.currentScore}/10` : 'Chưa có điểm'}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-xs font-bold flex items-center gap-1 justify-end ${priority.color}`}>
                                          {[...Array(priority.stars)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                          <span className="ml-1">{priority.label}</span>
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[150px] truncate">{sub.suggestion}</p>
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
