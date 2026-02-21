import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from 'sonner';
import { getFullApiUrl } from '../config/apiConfig';
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
  Minus,
  Info,
  ArrowRight,
  Sparkles,
  School,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Unlock,
  Lock,
  Trophy,
  BarChart3,
  Sliders,
  Star,
  Lightbulb,
  AlertOctagon,
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
    color: "text-green-700",
    bg: "bg-green-50",
  },
  {
    char: "B+",
    min: 7.8,
    max: 8.49,
    point: 3.5,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    char: "B",
    min: 7.0,
    max: 7.79,
    point: 3.0,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    char: "C+",
    min: 6.3,
    max: 6.99,
    point: 2.5,
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
  {
    char: "C",
    min: 5.5,
    max: 6.29,
    point: 2.0,
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
  {
    char: "D+",
    min: 4.8,
    max: 5.49,
    point: 1.5,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    char: "D",
    min: 4.0,
    max: 4.79,
    point: 1.0,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    char: "F+",
    min: 3.0,
    max: 3.99,
    point: 0.5,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    char: "F",
    min: 0.0,
    max: 2.99,
    point: 0.0,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

// Xếp loại học lực
const getClassification = (gpa) => {
  if (gpa >= 3.6)
    return { label: "Xuất sắc", color: "text-green-700", bg: "bg-green-50" };
  if (gpa >= 3.2)
    return { label: "Giỏi", color: "text-blue-600", bg: "bg-blue-50" };
  if (gpa >= 2.5)
    return { label: "Khá", color: "text-gray-600", bg: "bg-gray-50" };
  if (gpa >= 2.0)
    return {
      label: "Trung bình",
      color: "text-gray-600",
      bg: "bg-gray-50",
    };
  return { label: "Yếu", color: "text-orange-600", bg: "bg-orange-50" };
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
  const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);
  const semesterDropdownRef = useRef(null);

  // State for Layout
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedReminderDetails, setShowUnsavedReminderDetails] =
    useState(true);

  // Load dữ liệu từ Server khi vào trang
  useEffect(() => {
    if (user) {
      fetch(getFullApiUrl(`/api/gpa?username=${user.username}`))
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (data.semesters && data.semesters.length > 0) {
              setSemesters(data.semesters);
            }
            if (data.targetGpa) {
              setTargetGpa(data.targetGpa);
            }
          }
        })
        .catch((err) => console.error("Lỗi tải GPA:", err));
    }
  }, []); // Chạy 1 lần khi mount

  // Track unsaved changes whenever semesters or targetGpa changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [semesters, targetGpa]);

  useEffect(() => {
    if (hasUnsavedChanges) setShowUnsavedReminderDetails(true);
  }, [hasUnsavedChanges]);

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
      const res = await fetch(getFullApiUrl("/api/gpa"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          semesters,
          targetGpa // 🔥 Gửi thêm targetGpa
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Đã lưu bảng điểm thành công!");
        setHasUnsavedChanges(false); // Reset unsaved changes flag
      } else {
        toast.error("Lỗi: " + data.message);
      }
    } catch (err) {
      toast.error("Lỗi kết nối Server!");
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
    // Toggle: if clicking the same subject, close it
    if (survivalMode.activeSubjectId === subjectId) {
      setSurvivalMode({
        activeSubjectId: null,
        simulatedScore: null,
      });
    } else {
      setSurvivalMode({
        activeSubjectId: subjectId,
        simulatedScore: currentScore ?? 5,
      });
    }
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target)) {
        setIsSemesterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (gpaDisplayMode !== 'semester') {
      setIsSemesterDropdownOpen(false);
    }
  }, [gpaDisplayMode]);

  // Get currently displayed semester GPA
  const displayedSemesterGpa = useMemo(() => {
    if (gpaDisplayMode === 'semester' && selectedSemesterId) {
      return semesterGpas.find(s => s.id === selectedSemesterId);
    }
    return null;
  }, [gpaDisplayMode, selectedSemesterId, semesterGpas]);

  const handleSelectSemester = (semesterId) => {
    setSelectedSemesterId(semesterId);
    setIsSemesterDropdownOpen(false);
  };

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
      {/* TẦNG 1: HERO OVERVIEW (Redesigned for Density & Wow Factor) */}
      <div className="mb-8">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6 md:p-8">
          {/* Subtle Background Decoration */}
          <div className="absolute -z-0 right-0 top-0 h-64 w-64 rounded-bl-[100px] bg-gradient-to-br from-blue-50/50 to-cyan-50/40 opacity-60 dark:from-blue-900/30 dark:to-cyan-900/20"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

            {/* 1. VISUAL GPA INDICATOR (Left - 4 Cols) */}
            <div className="relative flex flex-col items-center justify-center md:col-span-4">
              <div className="relative flex h-44 w-44 items-center justify-center sm:h-48 sm:w-48 md:h-56 md:w-56">
                <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="6" />
                  {/* Indicator */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#134691"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (Math.min(4, parseFloat(result.gpa4)) / 4))}`}
                    className="transition-all duration-1000 ease-out drop-shadow-sm"
                  />
                </svg>

                {/* Inner Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">GPA Tích lũy</span>
                  <h1 className="text-5xl font-black tracking-tighter text-[#134691] drop-shadow-sm dark:text-blue-400 sm:text-6xl md:text-7xl">
                    {result.gpa4}
                  </h1>
                  <div className="mt-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {classification.label}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. METRICS & GROWTH (Middle - 4 Cols) */}
            <div className="flex flex-col justify-center space-y-6 pl-0 md:col-span-4 md:border-l md:border-gray-100 md:pl-4 dark:md:border-gray-700">

              {/* Growth / Momentum Card */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-700/60">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">So với kỳ trước</h4>
                  <div className={`text-lg font-bold flex items-center gap-2 ${result.momentum?.trend === 'up' ? 'text-green-600' :
                    result.momentum?.trend === 'down' ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                    {result.momentum ? (
                      <>
                        {result.momentum.trend === 'up' ? <TrendingUp size={20} /> :
                          result.momentum.trend === 'down' ? <TrendingDown size={20} /> : <Minus size={20} />}
                        <span>{result.momentum.delta > 0 ? '+' : ''}{result.momentum.delta}</span>
                      </>
                    ) : (
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Chưa có dữ liệu</span>
                      )}
                    </div>
                  </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500">
                  <BarChart3 size={20} />
                </div>
              </div>

              {/* Credits Detail */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Tín chỉ tích lũy</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{result.totalCredits}<span className="text-sm font-medium text-gray-400 dark:text-gray-500">/{targetCredits}</span></span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-[#134691] to-blue-500 rounded-full shadow-sm"
                    style={{ width: `${Math.min(100, (result.totalCredits / targetCredits) * 100)}%` }}
                  ></div>
                </div>
              </div>

            </div>

            {/* 3. TARGET & ACTIONS (Right - 4 Cols) */}
            <div className="flex h-full flex-col justify-between space-y-6 md:col-span-4 md:pl-4">

              {/* Target Input Block */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20 sm:p-5">
                <label className="mb-3 block text-xs font-semibold uppercase text-blue-800 dark:text-blue-300">Mục tiêu GPA ra trường</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={targetGpa}
                      onChange={(e) => setTargetGpa(e.target.value)}
                      onBlur={handleSaveGPA} // 🔥 Auto-save on blur
                      placeholder="3.6"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-lg font-bold text-blue-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-400 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-200"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-300 dark:text-blue-500">/ 4.0</span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 shadow-sm dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300">
                    <Target size={24} />
                  </div>
                </div>

                {/* Target Progress */}
                {targetGpa && parseFloat(targetGpa) > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-semibold text-blue-400 mb-1">
                      <span>Tiến độ</span>
                      <span>{Math.round((parseFloat(result.gpa4) / parseFloat(targetGpa)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/60">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(100, (parseFloat(result.gpa4) / parseFloat(targetGpa)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveGPA}
                disabled={isSaving}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-0.5 ${isSaving
                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                  : "bg-[#134691] text-white hover:bg-[#0f3570]"
                  }`}
              >
                <Save size={18} />
                {isSaving ? "Đang lưu..." : "Lưu lộ trình học tập"}
              </button>

            </div>

          </div>
        </div>
      </div>

      {/* TẦNG 2: SMART PRIORITY ALERT - Subtle */}
      {priorityAlert && (
        <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 transition-all ${priorityAlert.severity === 'danger'
          ? 'border-red-100 bg-red-50/40 text-red-900 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-200'
          : 'border-blue-100 bg-blue-50/40 text-blue-900 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-200'
          }`}>
          <div className={`p-2 rounded-lg shrink-0 ${priorityAlert.severity === 'danger'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
            }`}>
            {priorityAlert.icon ? <span className="text-base">{priorityAlert.icon}</span> : <AlertTriangle size={16} />}
          </div>
          <div className="flex-1 py-0.5">
            <p className="font-semibold text-sm leading-relaxed">{priorityAlert.message}</p>
            {priorityAlert.action && <p className="mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">{priorityAlert.action}</p>}
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
                className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                onClick={() => toggleSemester(sem.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`transition-all duration-200 ${sem.isExpanded ? 'text-[#134691] rotate-90' : 'text-gray-400'}`}>
                    <ChevronRight size={18} />
                  </div>
                  <input
                    className="max-w-[220px] flex-1 bg-transparent text-lg font-bold text-gray-800 outline-none transition-colors placeholder-gray-400 hover:text-blue-600 dark:text-white sm:max-w-[300px]"
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
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md shadow-sm">
                      {sem.subjects.length} môn
                    </span>
                    {sem.subjects.length > 0 && calculateSemesterGpa(sem).totalCredits > 0 && (
                      <span className="text-xs font-bold text-[#134691] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-md shadow-sm">
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
                            className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 p-5 ${statusBorderClass}`}
                          >
                            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-6">
                              {/* 1. SUBJECT NAME & TYPE (Anchor) */}
                              <div className="w-full flex-1 min-w-0 md:min-w-[30%]">
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
                                      className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded transition-all cursor-pointer inline-flex items-center gap-1.5 ${sub.type === "major"
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
                                        : "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
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
                              <div className="flex w-full flex-[2] flex-col gap-2 md:min-w-[200px]">
                                {sub.components.map((comp) => (
                                  <div
                                    key={comp.id}
                                    className="flex items-center gap-2 text-sm group/comp relative pl-2"
                                  >
                                    {/* Score Input (Swapped: Now First) */}
                                    <div className="relative">
                                      <input
                                        type="number"
                                        placeholder="Nhập điểm..."
                                        className={`w-20 font-bold bg-transparent outline-none transition-all ${comp.score === ""
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
                                    </div>

                                    {/* Actions */}
                                    {sub.components.length > 1 && (
                                      <button
                                        onClick={() =>
                                          removeComponent(
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
                              <div className="flex w-full justify-start md:min-w-[140px] md:w-auto md:justify-end">
                                {isFull && gradeInfo ? (
                                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 ${isPassed
                                    ? `${gradeInfo.bg} border-gray-100 ${gradeInfo.char === 'A' ? 'shadow-md shadow-green-100' : ''}`
                                    : 'bg-red-50 border-red-100'
                                    }`}>
                                    <div>
                                      <div className={`text-2xl font-black leading-none ${gradeInfo.color}`}>
                                        {finalScore10.toFixed(1)}
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-1 text-center">
                                        Thang 10
                                      </div>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="flex flex-col items-center">
                                      <span className={`text-lg font-black ${gradeInfo.color}`}>
                                        {gradeInfo.char}
                                      </span>
                                      <span className="text-[10px] font-semibold text-gray-500">
                                        {gradeInfo.point}
                                      </span>
                                    </div>
                                  </div>
                                ) : missingComponent ? (
                                  <div className="flex flex-col gap-2 items-end">
                                    <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">Cần đạt tối thiểu:</span>
                                    <div className="flex flex-wrap justify-end gap-2">
                                      {predictions.length > 0 ? (
                                        predictions.map((p, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
                                          >
                                            <span
                                              className={`text-xs font-bold ${p.char === "A"
                                                ? "text-green-700"
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
                                        <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-lg whitespace-nowrap">
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
                              <div className="flex flex-row items-center justify-end gap-1 self-end border-t border-gray-100 pt-3 md:ml-4 md:flex-col md:self-auto md:border-l md:border-t-0 md:pl-4 md:pt-0 dark:border-gray-700">
                                {isFull && (
                                  <button
                                    onClick={() => handleOpenSurvivalMode(sub.id, parseFloat(finalScore10))}
                                    className={`p-2 rounded-lg transition-all ${survivalMode.activeSubjectId === sub.id
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
                    className="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-semibold hover:border-[#134691] hover:text-[#134691] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 group"
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
            className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 dark:text-gray-500 font-semibold hover:border-[#134691] hover:text-[#134691] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-3 group"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <FolderPlus size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            Thêm Học Kỳ Mới
          </button>
        </div>

      </div>

      {/* TẦNG 4: ADVANCED ANALYSIS (Collapsible) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 mt-8">
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-all duration-200 ${isAdvancedOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <BarChart3 size={22} strokeWidth={2} />
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg transition-colors ${isAdvancedOpen ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Phân tích nâng cao</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-0.5">Chiến lược, Giả lập điểm & Bản đồ GPA</p>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isAdvancedOpen ? 'bg-gray-100 rotate-180 text-gray-900' : 'text-gray-400'}`}>
            <ChevronDown size={20} />
          </div>
        </button>

        {isAdvancedOpen && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 space-y-8">
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

            {/* CONTROL BAR: Display Mode & Semester Selection */}
            <div className="flex flex-col min-[1025px]:flex-row min-[1025px]:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex min-w-0 items-center gap-2 px-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Layers size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-bold uppercase">Chế độ xem</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200 break-words">
                    {gpaDisplayMode === 'cumulative' ? 'Tích lũy toàn khóa' : 'Chi tiết học kỳ'}
                  </p>
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center min-[1025px]:w-auto min-[1025px]:justify-end">
                {/* Semester Dropdown (Only in Semester Mode) */}
                {gpaDisplayMode === 'semester' && (
                  <div ref={semesterDropdownRef} className="relative w-full min-w-0 sm:min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => setIsSemesterDropdownOpen((prev) => !prev)}
                      className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-sm font-bold border transition-all duration-200 text-left cursor-pointer ${isSemesterDropdownOpen
                        ? 'bg-white dark:bg-gray-800 border-[#134691]/40 ring-2 ring-[#134691]/20 shadow-md'
                        : 'bg-gray-50 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 hover:border-[#134691]/40 hover:bg-white dark:hover:bg-gray-700'
                        } text-gray-800 dark:text-white`}
                    >
                      <span className="block truncate pr-2">
                      {selectedSemesterId
                        ? semesterGpas.find((sem) => sem.id === selectedSemesterId)?.name
                        : 'Chọn học kỳ...'}
                      </span>
                    </button>
                    <ChevronDown
                      size={16}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-transform duration-200 ${isSemesterDropdownOpen ? 'rotate-180' : ''}`}
                    />

                    {isSemesterDropdownOpen && (
                      <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
                        <button
                          type="button"
                          onClick={() => handleSelectSemester(null)}
                          className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${selectedSemesterId === null
                            ? 'bg-[#134691] text-white'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700'
                            }`}
                        >
                          Chọn học kỳ...
                        </button>
                        <div className="max-h-56 overflow-y-auto">
                          {semesterGpas.map((sem) => (
                            <button
                              key={sem.id}
                              type="button"
                              onClick={() => handleSelectSemester(sem.id)}
                              className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${selectedSemesterId === sem.id
                                ? 'bg-[#134691] text-white'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700'
                                }`}
                            >
                              {sem.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex w-full min-w-0 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl sm:w-auto">
                  <button
                    onClick={() => setGpaDisplayMode('cumulative')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${gpaDisplayMode === 'cumulative'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                  >
                    Tích lũy
                  </button>
                  <button
                    onClick={() => setGpaDisplayMode('semester')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${gpaDisplayMode === 'semester'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                  >
                    Học kỳ
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN ADVANCED GRID */}
            <div className="grid grid-cols-1 min-[1025px]:grid-cols-3 gap-4">
              {/* COL 1: WHERE I AM (Current Status) */}
              <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"></div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  Hiện trạng
                </h4>

                <div className="flex flex-col items-center justify-center flex-1 py-4">
                  <div className="relative mb-4">
                    <Calculator size={40} className="text-indigo-600 dark:text-indigo-400 opacity-20" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${gpaDisplayMode === 'cumulative' ? classification.bg.replace('bg-', 'bg-') : 'bg-gray-400'}`}></div>
                  </div>

                  <p className="text-sm font-bold text-gray-500 uppercase mb-2">
                    {gpaDisplayMode === 'cumulative' ? 'GPA Tích lũy' : (displayedSemesterGpa?.name || 'Chưa chọn học kỳ')}
                  </p>
                  <span className="text-6xl font-black text-gray-800 dark:text-white tracking-tighter mb-4">
                    {gpaDisplayMode === 'cumulative'
                      ? result.gpa4
                      : (displayedSemesterGpa ? displayedSemesterGpa.semesterGpa4.toFixed(2) : '0.00')}
                  </span>

                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border ${gpaDisplayMode === 'cumulative' ? classification.bg + ' ' + classification.color + ' ' + classification.border : 'bg-gray-100 text-gray-500'}`}>
                    {gpaDisplayMode === 'cumulative'
                      ? classification.label
                      : (displayedSemesterGpa ? getClassification(displayedSemesterGpa.semesterGpa4).label : 'N/A')}
                  </span>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 w-full">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tín chỉ hoàn thành</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{result.passedCredits} TC</span>
                  </div>
                </div>
              </div>

              {/* COL 2: THE GAP (Target & Gap) - Highlighted */}
              <div className="flex flex-col h-full space-y-4 min-[1025px]:-mt-4 min-[1025px]:mb-4">
                {/* Visual Connector (Desktop only) */}
                <div className="hidden min-[1025px]:flex justify-center items-center h-8 text-gray-300">
                  <ArrowRight size={20} className="rotate-90 min-[1025px]:rotate-0 text-gray-300 dark:text-gray-600" />
                </div>

                {!isScholarshipMode && (
                  <div className={`flex-1 p-6 rounded-3xl border-2 bg-white dark:bg-gray-800 shadow-xl transition-all relative overflow-hidden ${targetGpa
                    ? (strategyData.strategy?.feasibility ? getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).border : 'border-indigo-100')
                    : 'border-dashed border-gray-200 dark:border-gray-700'
                    }`}>
                    {targetGpa && strategyData.strategy?.feasibility && (
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${getFeasibilityColors(strategyData.strategy.feasibility.feasibilityLevel).bg.replace('bg-', 'bg-')}`}></div>
                    )}

                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      Mục tiêu & Khoảng cách
                    </h4>

                    {!targetGpa ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-60 min-h-[200px]">
                        <Target size={32} className="text-gray-400 mb-3" />
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Chưa có mục tiêu</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nhập mục tiêu ở trên để xem phân tích</p>
                      </div>
                    ) : (
                      result.prediction4 && result.prediction4 <= 4.0 ? (
                        <>
                          <div className="flex items-center justify-between mb-8">
                            <div className="text-left">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Muốn đạt tích lũy</p>
                              <div className="flex items-baseline gap-1">
                                <Target size={16} className="text-gray-400 self-center" />
                                <span className="text-3xl font-black text-gray-700 dark:text-gray-300">{targetGpa}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex flex-col items-end`}>
                                <span className={`text-xs font-bold uppercase mb-1 ${strategyData.strategy.feasibility.feasibilityLevel === 'hard' ? 'text-red-500' :
                                  strategyData.strategy.feasibility.feasibilityLevel === 'medium' ? 'text-orange-500' : 'text-green-500'
                                  }`}>Độ khó</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${strategyData.strategy.feasibility.feasibilityLevel === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                  strategyData.strategy.feasibility.feasibilityLevel === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
                                  }`}>
                                  {strategyData.strategy.feasibility.feasibilityLevel === 'hard' ? 'Thử thách' :
                                    strategyData.strategy.feasibility.feasibilityLevel === 'medium' ? 'Trung bình' : 'Khả thi'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cần đạt kỳ này</p>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-5xl font-black tracking-tight ${result.prediction4 > 3.6 ? 'text-red-600' :
                                result.prediction4 > 3.2 ? 'text-orange-600' :
                                  result.prediction4 > 2.5 ? 'text-blue-600' : 'text-green-600'
                                }`}>
                                {result.prediction4.toFixed(2)}
                              </span>
                              <span className="text-sm font-bold text-gray-400">/ 4.0</span>
                            </div>
                          </div>

                          <p className="text-xs text-center text-gray-500 leading-relaxed italic bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                            "Chênh lệch <strong>{(result.prediction4 - result.gpa4).toFixed(2)}</strong> điểm so với mức hiện tại."
                          </p>
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <XCircle size={40} className="text-red-500 mx-auto mb-4" />
                          <p className="font-bold text-red-600">Không khả thi</p>
                          <p className="text-xs text-gray-500 mt-2">Dù đạt 4.0 cũng không đủ để kéo tích lũy lên {targetGpa}</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* COL 3: WHAT TO DO (Actions) */}
              <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-400"></div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  Chiến lược hành động
                </h4>

                {/* Critical Subject Suggestion */}
                {strategyData.criticalSubject ? (
                  <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-500">
                      <Star size={14} fill="currentColor" />
                      <span className="text-[10px] font-bold uppercase">Môn trọng điểm</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm mb-1">{strategyData.criticalSubject.subjectName}</p>
                    <p className="text-xs text-amber-800 dark:text-amber-400 italic leading-relaxed opacity-80">
                      "{strategyData.criticalSubject.suggestion}"
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Chưa có gợi ý môn học</p>
                  </div>
                )}

                {/* Scenarios */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Kịch bản thay thế</p>
                  {strategyData.scenarios ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 hover:border-green-200 transition-colors group cursor-default">
                        <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase group-hover:text-green-800 dark:group-hover:text-green-300">An toàn</span>
                        <span className="text-sm font-black text-green-800 dark:text-green-300">{strategyData.scenarios.safe.requiredScore}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 hover:border-blue-200 transition-colors group cursor-default">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase group-hover:text-blue-800 dark:group-hover:text-blue-300">Cân bằng</span>
                        <span className="text-sm font-black text-blue-800 dark:text-blue-300">{strategyData.scenarios.balanced.requiredScore}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center italic mt-4">Nhập mục tiêu để xem kịch bản</p>
                  )}
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
                      <div key={sub.id} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${isCritical ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'} sm:flex-row sm:items-center sm:justify-between`}>
                        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isCritical ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 dark:text-white text-base break-words leading-snug">{sub.subjectName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub.credits} TC • {sub.isFull ? `Điểm: ${sub.currentScore}/10` : 'Chưa có điểm'}</p>
                          </div>
                        </div>
                        <div className="w-full pl-11 text-left sm:w-auto sm:pl-0 sm:text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${priority.color}`}>
                            {priority.label}
                          </span>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 break-words leading-relaxed sm:max-w-[220px]">{sub.suggestion}</p>
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

      {/* Sticky Save Reminder - Floating Box */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white p-4 shadow-2xl dark:border-orange-800/50 dark:bg-gray-800">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
            </div>
            {showUnsavedReminderDetails && (
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  Chưa lưu thay đổi
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Đừng quên lưu lại bạn nhé
                </p>
              </div>
            )}
            <button
              onClick={() => setShowUnsavedReminderDetails((prev) => !prev)}
              className="ml-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label={showUnsavedReminderDetails ? "Thu gọn cảnh báo" : "Mở rộng cảnh báo"}
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  showUnsavedReminderDetails ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GpaCalc;
