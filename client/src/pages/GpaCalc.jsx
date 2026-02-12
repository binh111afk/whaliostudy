import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import AuthModal from '../components/AuthModal';

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

  // SỬA DÒNG NÀY: Dùng roundScore thay vì toFixed trực tiếp
  const finalScore10 = isFull ? roundScore(currentScore).toFixed(1) : null;

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
    predictionChar: null, // Thêm dự báo hệ 10
  });

  const [isSaving, setIsSaving] = useState(false);

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
      return toast.error("Bạn chưa đăng nhập!", {
        description: "Đăng nhập để hệ thống lưu điểm cho ông nhé.",
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        duration: 5000,
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
    });
  }, [semesters, targetGpa]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 rounded-2xl flex items-center gap-3 animate-pulse-slow shadow-sm">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
          <AlertTriangle size={20} />
        </div>
        <p className="text-amber-800 dark:text-amber-200 text-sm font-bold leading-relaxed">
          ⚠️ <span className="uppercase text-amber-900 dark:text-amber-100">Cảnh báo:</span> Bạn nhớ
          bấm{" "}
          <span className="underline decoration-2 underline-offset-4 text-amber-900 dark:text-amber-100">
            "Lưu tất cả"
          </span>{" "}
          trước khi thoát tab, nếu không toàn bộ dữ liệu điểm vừa nhập sẽ "bay
          màu" hết đấy nhé!
        </p>
      </div>
      {/* HEADER: Mục tiêu GPA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
            <Calculator className="text-primary dark:text-blue-400" /> Tính GPA (Theo Kỳ)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Quản lý lộ trình học tập chi tiết từng học kỳ.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-700">
          <Target className="text-blue-600 dark:text-blue-400" size={20} />
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">
              Mục tiêu GPA
            </p>
            <input
              type="number"
              placeholder="VD: 3.6"
              className="bg-transparent font-black text-blue-800 dark:text-blue-300 w-20 outline-none text-lg placeholder-blue-300 dark:placeholder-blue-600"
              value={targetGpa}
              onChange={(e) => setTargetGpa(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSaveGPA} // 👈 Gắn hàm lưu vào đây
          disabled={isSaving} // 👈 Chặn bấm liên tục khi đang lưu
          className={`px-5 py-2 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
            isSaving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600"
          }`}
        >
          <Save size={18} />
          {isSaving ? "Đang lưu..." : "Lưu tất cả"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CỘT TRÁI: DANH SÁCH HỌC KỲ */}
        <div className="lg:col-span-3 space-y-6">
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

                          return (
                            <tr
                              key={sub.id}
                              className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors align-top group"
                            >
                              <td className="p-3">
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
                                <div className="flex gap-1">
                                  {["general", "major"].map((t) => (
                                    <button
                                      key={t}
                                      onClick={() =>
                                        updateSubject(sem.id, sub.id, "type", t)
                                      }
                                      className={`text-[12px] px-1.5 py-0.5 my-2 rounded border transition-all cursor-pointer font-bold ${
                                        sub.type === t
                                          ? t === "general"
                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700"
                                          : "text-gray-400 border-gray-200 hover:bg-gray-50"
                                      }`}
                                    >
                                      {t === "general"
                                        ? "Đại cương"
                                        : "Chuyên ngành"}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  className="w-full text-center bg-gray-50 dark:bg-gray-700 rounded p-1 font-bold text-gray-700 dark:text-white outline-none text-sm border border-transparent focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
                                      className="flex items-center gap-1"
                                    >
                                      <input
                                        type="number"
                                        placeholder="?"
                                        className={`w-17 h-8 border rounded px-1 py-0.5 text-xs font-bold outline-none text-center text-[16px] ${
                                          comp.score === ""
                                            ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-gray-800 dark:text-gray-200"
                                            : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
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
                                      <span className="text-gray-300 dark:text-gray-500 text-[17px]">
                                        x
                                      </span>
                                      <input
                                        type="number"
                                        placeholder="%"
                                        className="w-13 h-8 bg-gray-50 dark:bg-gray-700 border-none rounded px-1 py-0.5 text-xs text-center text-[16px] text-gray-800 dark:text-gray-200"
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
                                      {sub.components.length > 1 && (
                                        <button
                                          onClick={() =>
                                            removeComponent(
                                              sem.id,
                                              sub.id,
                                              comp.id
                                            )
                                          }
                                          className="text-gray-300 dark:text-gray-500 hover:text-red-500"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addComponent(sem.id, sub.id)}
                                    className="text-[14px] text-primary dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer mx-5 py-2"
                                  >
                                    <Plus size={12} /> Thêm cột
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 align-top">
                                {isFull && gradeInfo ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg font-black text-gray-800 dark:text-white">
                                        {finalScore10}
                                      </span>
                                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                        ({gradeInfo.point})
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[14px] font-bold ${gradeInfo.bg} ${gradeInfo.color}`}
                                      >
                                        {gradeInfo.char}
                                      </span>
                                    </div>
                                    {isPassed ? (
                                      <span className="flex items-center gap-1 text-[15px] font-bold text-green-600 ">
                                        <CheckCircle size={13} /> Qua môn
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[15px] font-bold text-red-500">
                                        <XCircle size={13} /> Học lại
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
                                <button
                                  onClick={() => removeSubject(sem.id, sub.id)}
                                  className="text-gray-300 dark:text-gray-500 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
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

        {/* CỘT PHẢI: TỔNG KẾT (Sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-blue-100 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 sticky top-24 space-y-6">
            <div className="text-center py-6 bg-gradient-to-br from-primary to-blue-600 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="opacity-80 font-medium text-xs uppercase tracking-widest">
                  GPA Tích lũy
                </p>
                <div className="text-6xl font-black mt-1 tracking-tighter">
                  {result.gpa4}
                </div>
                {/* XẾP LOẠI HỌC LỰC */}
                <div
                  className={`inline-block mt-2 px-3 py-1 rounded-lg font-bold text-sm bg-white/20 backdrop-blur-md border border-white/30`}
                >
                  {classification.label}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            </div>

            {/* DỰ BÁO GPA TỔNG (ĐÃ SỬA: HIỆN THANG 10) */}
            {targetGpa && (
              <div
                className={`p-4 rounded-xl border ${
                  result.prediction4 <= 4.0
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                }`}
              >
                <p className="text-xs font-bold uppercase mb-2 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Target size={14} /> Để đạt GPA {targetGpa}
                </p>
                {result.prediction4 ? (
                  result.prediction4 <= 4.0 ? (
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-tight">
                        Các môn chưa có điểm cần trung bình:
                      </p>

                      {/* Dòng 1: Điểm hệ 4 */}
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">
                        {result.prediction4.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                          / 4.0
                        </span>
                      </p>

                      {/* Dòng 2: QUY ĐỔI RA HỆ 10 (THEO YÊU CẦU CỦA ÔNG) */}
                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tương đương:</p>
                        <p className="font-bold text-purple-800 dark:text-purple-300 text-sm flex items-center gap-1">
                          ~ {result.prediction10} thang 10 (
                          {result.predictionChar})
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-red-600 flex gap-1">
                      <AlertTriangle size={14} /> Không thể đạt được!
                    </div>
                  )
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    Nhập thêm môn...
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                  Hệ 10
                </span>
                <span className="font-bold text-gray-800 dark:text-white text-lg">
                  {result.gpa10}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                  Tín chỉ
                </span>
                <span className="font-bold text-gray-800 dark:text-white">
                  {result.totalCredits}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <span className="text-green-600 dark:text-green-400 text-xs font-bold uppercase">
                  Tích lũy
                </span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {result.passedCredits}
                </span>
              </div>
            </div>
          </div>
        </div>
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
