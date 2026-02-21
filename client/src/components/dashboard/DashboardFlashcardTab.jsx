import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Layers,
  FileText,
  Library,
  GraduationCap,
  Pencil,
  Trash2,
  Plus,
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";

// --- HELPER ---
const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth < 640;

const getConfirmToastOptions = () => ({
  position: isMobileViewport() ? "bottom-center" : "top-center",
  duration: Infinity,
});

// --- COMPONENT: TAB FLASHCARD ---
const DashboardFlashcardTab = () => {
  const STORAGE_KEY = "whalio_flashcard_decks";
  const PROGRESS_KEY = "whalio_flashcard_progress";
  const [decks, setDecks] = useState([]);
  const [deckProgress, setDeckProgress] = useState({});
  const [view, setView] = useState("list"); // 'list' | 'study' | 'create'

  // State cho chế độ học
  const [currentDeck, setCurrentDeck] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // State cho chế độ tạo
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckColor, setNewDeckColor] = useState("blue");
  const [newCards, setNewCards] = useState([
    { term: "", def: "" },
    { term: "", def: "" },
    { term: "", def: "" },
  ]);

  // Load dữ liệu khi vào Tab
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDecks(JSON.parse(stored));
      } else {
        // Dữ liệu mẫu
        const defaultDecks = [
          {
            id: 1,
            title: "Tiếng Anh Cơ Bản",
            icon: "🇬🇧",
            color: "blue",
            cards: [
              { term: "Hello", def: "Xin chào" },
              { term: "Goodbye", def: "Tạm biệt" },
            ],
          },
          {
            id: 2,
            title: "Công Thức Toán",
            icon: "🔢",
            color: "green",
            cards: [
              { term: "Pythagore", def: "a² + b² = c²" },
              { term: "Hình tròn", def: "S = πr²" },
            ],
          },
        ];
        setDecks(defaultDecks);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDecks));
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu flashcard:", error);
    }

    try {
      const storedProgress = localStorage.getItem(PROGRESS_KEY);
      if (storedProgress) {
        setDeckProgress(JSON.parse(storedProgress));
      }
    } catch (error) {
      console.error("Lỗi đọc tiến độ flashcard:", error);
    }
  }, []);

  // --- LOGIC HỌC ---
  const startStudy = (deck) => {
    if (!deck.cards || deck.cards.length === 0)
      return alert("Bộ này chưa có thẻ nào!");
    setCurrentDeck(deck);
    setCardIndex(0);
    setIsFlipped(false);
    setView("study");
  };

  const nextCard = () => {
    if (cardIndex < currentDeck.cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((prev) => prev + 1), 150);
    }
  };

  const prevCard = () => {
    if (cardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((prev) => prev - 1), 150);
    }
  };

  // --- LOGIC TẠO MỚI ---
  const handleAddCardRow = () =>
    setNewCards([...newCards, { term: "", def: "" }]);
  const handleRemoveCardRow = (idx) =>
    setNewCards(newCards.filter((_, i) => i !== idx));

  const handleCardChange = (idx, field, value) => {
    const updated = [...newCards];
    updated[idx][field] = value;
    setNewCards(updated);
  };

  const saveDeck = () => {
    if (!newDeckTitle.trim()) return alert("Vui lòng nhập tên bộ thẻ!");
    const validCards = newCards.filter((c) => c.term.trim() && c.def.trim());
    if (validCards.length === 0)
      return alert("Cần ít nhất 1 thẻ đầy đủ thông tin!");

    const newDeck = {
      id: Date.now(),
      title: newDeckTitle,
      icon: "📝",
      color: newDeckColor,
      cards: validCards,
    };

    const updatedDecks = [...decks, newDeck];
    setDecks(updatedDecks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks));

    // Reset form
    setNewDeckTitle("");
    setNewCards([
      { term: "", def: "" },
      { term: "", def: "" },
    ]);
    setView("list");
  };

  const deleteDeck = (id) => {
    toast.custom(
      (t) => (
        <div className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-[360px] bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Xóa bộ thẻ?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
            Dữ liệu học tập của bộ này sẽ bị xóa vĩnh viễn.
          </p>

          <div className="flex w-full flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => toast.dismiss(t)}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Hủy
            </button>

            <button
              onClick={() => {
                toast.dismiss(t);
                const updated = decks.filter((d) => d.id !== id);
                setDecks(updated);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                toast.success("Đã xóa bộ thẻ thành công!", {
                  position: isMobileViewport() ? "bottom-center" : "top-center",
                });
              }}
              className="w-full flex-1 py-3 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      getConfirmToastOptions()
    );
  };

  // Mapping màu sắc
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    red: "bg-red-50 text-red-600 border-red-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  const deckThemeMap = {
    blue: {
      header: "from-blue-900 via-blue-700 to-cyan-500",
      progress: "from-blue-500 to-cyan-400",
      surface:
        "border-blue-200/80 bg-white shadow-[0_14px_32px_-20px_rgba(30,64,175,0.45)]",
      tag: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-white/20",
    },
    green: {
      header: "from-emerald-900 via-emerald-700 to-cyan-500",
      progress: "from-emerald-500 to-cyan-400",
      surface:
        "border-emerald-200/80 bg-white shadow-[0_14px_32px_-20px_rgba(6,95,70,0.45)]",
      tag: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-white/20",
    },
    purple: {
      header: "from-indigo-900 via-indigo-700 to-blue-500",
      progress: "from-indigo-500 to-blue-400",
      surface:
        "border-indigo-200/80 bg-white shadow-[0_14px_32px_-20px_rgba(49,46,129,0.45)]",
      tag: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-white/20",
    },
    red: {
      header: "from-rose-900 via-rose-700 to-orange-500",
      progress: "from-rose-500 to-orange-400",
      surface:
        "border-rose-200/80 bg-white shadow-[0_14px_32px_-20px_rgba(159,18,57,0.45)]",
      tag: "bg-rose-50 text-rose-700 border-rose-200",
      iconBg: "bg-white/20",
    },
    orange: {
      header: "from-orange-900 via-orange-700 to-amber-500",
      progress: "from-orange-500 to-amber-400",
      surface:
        "border-orange-200/80 bg-white shadow-[0_14px_32px_-20px_rgba(154,52,18,0.45)]",
      tag: "bg-orange-50 text-orange-700 border-orange-200",
      iconBg: "bg-white/20",
    },
  };

  const deckSoftThemeMap = {
    blue: {
      iconWrap: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
      ghostMastered: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
      ghostReviewing: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
    },
    green: {
      iconWrap: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
      ghostMastered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
      ghostReviewing: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
    },
    purple: {
      iconWrap: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
      ghostMastered: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
      ghostReviewing: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
    },
    red: {
      iconWrap: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
      ghostMastered: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
      ghostReviewing: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
    },
    orange: {
      iconWrap: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
      ghostMastered: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
      ghostReviewing: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200",
    },
  };

  const deckOutlineIconMap = {
    blue: BookOpen,
    green: GraduationCap,
    purple: Library,
    red: FileText,
    orange: Pencil,
  };

  const getCardKey = (card = {}) => {
    const term = String(card?.term || "").trim().toLowerCase();
    const def = String(card?.def || "").trim().toLowerCase();
    return `${term}::${def}`;
  };

  const getDeckStats = (deck = {}) => {
    const totalCards = deck.cards?.length || 0;
    const ratings = deckProgress?.[deck.id]?.ratings || {};

    if (totalCards === 0) {
      return {
        percent: 0,
        seen: 0,
        mastered: 0,
        reviewing: 0,
      };
    }

    let seen = 0;
    let score = 0;
    let mastered = 0;
    let reviewing = 0;

    (deck.cards || []).forEach((card) => {
      const rating = ratings[getCardKey(card)];
      if (!rating) return;
      seen += 1;
      if (rating === "mastered") {
        score += 1;
        mastered += 1;
      } else if (rating === "reviewing") {
        score += 0.5;
        reviewing += 1;
      }
    });

    return {
      percent: Math.round((score / totalCards) * 100),
      seen,
      mastered,
      reviewing,
    };
  };

  const updateDeckProgress = (updater) => {
    setDeckProgress((prev) => {
      const next = updater(prev);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleRateCard = (level) => {
    if (!currentDeck?.cards?.[cardIndex]) return;
    const cardKey = getCardKey(currentDeck.cards[cardIndex]);

    updateDeckProgress((prev) => {
      const current = prev[currentDeck.id] || { ratings: {} };
      return {
        ...prev,
        [currentDeck.id]: {
          ...current,
          ratings: {
            ...(current.ratings || {}),
            [cardKey]: level,
          },
          updatedAt: Date.now(),
        },
      };
    });

    if (cardIndex < currentDeck.cards.length - 1) {
      nextCard();
    }
  };

  const currentDeckTheme = deckThemeMap[currentDeck?.color] || deckThemeMap.blue;
  const currentDeckStats = getDeckStats(currentDeck || {});
  const totalCards = currentDeck?.cards?.length || 0;
  const studyProgress = totalCards > 0 ? Math.round(((cardIndex + 1) / totalCards) * 100) : 0;
  const currentRating = currentDeck?.cards?.[cardIndex]
    ? deckProgress?.[currentDeck.id]?.ratings?.[getCardKey(currentDeck.cards[cardIndex])]
    : null;

  return (
    <div className="animate-fade-in-up">
      {view === "list" && (
        <div className="space-y-6 rounded-2xl bg-slate-50 p-4 sm:p-6 dark:bg-slate-900/40">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-slate-700 dark:bg-slate-900">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Layers size={14} />
                Flashcard Studio
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:text-2xl">
                Bộ thẻ của bạn
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Quản lý bộ thẻ theo phong cách gọn nhẹ, dễ theo dõi tiến độ học.
              </p>
            </div>
            <button
              onClick={() => setView("create")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus size={16} />
              Tạo bộ mới
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <p className="text-lg font-semibold">Bạn chưa có bộ thẻ nào.</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Hãy tạo bộ flashcard đầu tiên để bắt đầu luyện tập.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[1025px]:grid-cols-2 2xl:grid-cols-3">
              {decks.map((deck) => {
                const softTheme = deckSoftThemeMap[deck.color] || deckSoftThemeMap.blue;
                const DeckIcon = deckOutlineIconMap[deck.color] || BookOpen;
                const stats = getDeckStats(deck);
                const total = deck.cards?.length || 0;

                return (
                  <article
                    key={deck.id}
                    onClick={() => startStudy(deck)}
                    className="group relative flex min-h-[140px] min-[1025px]:min-h-[124px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(deck.id);
                      }}
                      className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-slate-800"
                      aria-label={`Xóa bộ ${deck.title}`}
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="min-[1025px]:hidden">
                        <div className="mb-2">
                          <div
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${softTheme.iconWrap}`}
                          >
                            <DeckIcon size={24} strokeWidth={1.75} />
                          </div>
                        </div>
                        <div>
                          <h4 className="line-clamp-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                            {deck.title}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {total} thẻ thuật ngữ
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 ${softTheme.ghostMastered}`}
                          >
                            {stats.mastered} Đã thuộc
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 ${softTheme.ghostReviewing}`}
                          >
                            {stats.reviewing} Đang học
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {stats.seen}/{total} thẻ
                          </span>
                        </div>
                      </div>

                      <div className="hidden min-[1025px]:flex min-[1025px]:flex-col min-[1025px]:gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${softTheme.iconWrap}`}
                          >
                            <DeckIcon size={20} strokeWidth={1.75} />
                          </div>
                          <h4 className="line-clamp-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {deck.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm text-slate-500 dark:text-slate-400">{total} thẻ thuật ngữ</p>
                          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-medium">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 ${softTheme.ghostMastered}`}
                            >
                              {stats.mastered} Đã thuộc
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 ${softTheme.ghostReviewing}`}
                            >
                              {stats.reviewing} Đang học
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {stats.seen}/{total} thẻ
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-1 bg-blue-600 transition-all duration-500"
                        style={{ width: `${stats.percent}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "study" && currentDeck && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-2 backdrop-blur-md sm:p-4">
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-blue-100/70 bg-gradient-to-b from-blue-50 via-white to-sky-50 shadow-[0_30px_90px_-35px_rgba(30,64,175,0.75)] dark:border-blue-800/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <div className="pointer-events-none absolute -left-20 top-1/3 h-52 w-52 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-700/20" />
            <div className="pointer-events-none absolute -right-20 top-14 h-56 w-56 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-700/20" />

            <div className="relative flex items-center justify-between border-b border-blue-100/80 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("list")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
                  aria-label="Đóng chế độ học"
                >
                  <X size={20} />
                </button>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                    {currentDeck.title}
                  </h3>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Thẻ {cardIndex + 1}/{totalCards} • Đã học {currentDeckStats.percent}%
                  </p>
                </div>
              </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${currentDeckTheme.tag}`}>
                  Focus Mode
                </span>
            </div>

            <div className="relative px-4 pt-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                <span>Tiến độ học tập</span>
                <span>{studyProgress}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950/60">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${currentDeckTheme.progress} transition-all duration-500`}
                  style={{ width: `${studyProgress}%` }}
                />
              </div>
            </div>

            <div className="relative flex-1 px-3 pb-2 pt-4 sm:px-8">
              <div className="mx-auto h-full max-w-3xl [perspective:1400px]">
                <div
                  className="relative h-full min-h-[300px] cursor-pointer sm:min-h-[340px]"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div
                    className={`absolute inset-0 transition-all duration-500 [transform-style:preserve-3d] ${
                      isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    <div className="pointer-events-none absolute -bottom-4 left-6 right-6 h-6 rounded-full bg-blue-950/25 blur-xl" />

                    <div className="absolute inset-0 rounded-[30px] border border-blue-200 bg-white p-6 shadow-[0_24px_48px_-24px_rgba(37,99,235,0.6)] [backface-visibility:hidden] sm:p-10 dark:border-blue-800/70 dark:bg-slate-900">
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          Mặt trước
                        </span>
                        <h2 className="mt-6 text-2xl font-black leading-tight text-blue-900 dark:text-blue-100 sm:text-4xl">
                          {currentDeck.cards[cardIndex].term}
                        </h2>
                        <p className="mt-8 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <RotateCw size={13} />
                          Chạm vào thẻ để lật
                        </p>
                      </div>
                    </div>

                    <div className="absolute inset-0 rounded-[30px] border border-slate-200 bg-slate-50 p-6 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-10 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                          Mặt sau
                        </span>
                        <h2 className="mt-6 text-xl font-semibold leading-relaxed text-slate-700 dark:text-slate-100 sm:text-3xl">
                          {currentDeck.cards[cardIndex].def}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative space-y-4 border-t border-blue-100/80 bg-white/85 px-4 py-4 backdrop-blur sm:px-8 sm:py-5 dark:border-blue-900/60 dark:bg-slate-900/85">
              <div className="flex items-center justify-center gap-3 sm:gap-6">
                <button
                  onClick={prevCard}
                  disabled={cardIndex === 0}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-200"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg shadow-blue-300/40 transition-transform hover:scale-105 hover:bg-blue-800 dark:shadow-blue-900/40"
                >
                  <RotateCw size={24} />
                </button>
                <button
                  onClick={nextCard}
                  disabled={cardIndex === totalCards - 1}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-200"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => handleRateCard("forgot")}
                  disabled={!isFlipped}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                    currentRating === "forgot"
                      ? "border-rose-400 bg-rose-100 text-rose-700"
                      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  } ${!isFlipped ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  Chưa nhớ
                </button>
                <button
                  onClick={() => handleRateCard("reviewing")}
                  disabled={!isFlipped}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                    currentRating === "reviewing"
                      ? "border-amber-400 bg-amber-100 text-amber-700"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  } ${!isFlipped ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  Hơi nhớ
                </button>
                <button
                  onClick={() => handleRateCard("mastered")}
                  disabled={!isFlipped}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                    currentRating === "mastered"
                      ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  } ${!isFlipped ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  Đã thuộc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "create" && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-5 rounded-2xl bg-white px-4 py-4 shadow-sm sm:px-5 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setView("list")}
                className="mt-0.5 text-slate-500 transition-colors hover:text-blue-800 dark:text-slate-400 dark:hover:text-blue-300"
                aria-label="Quay lại"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h3 className="text-xl font-black text-blue-900 dark:text-blue-300 sm:text-2xl">
                  Tạo bộ Flashcard mới
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Điền thuật ngữ và định nghĩa để bắt đầu một bộ thẻ mới.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900">
              <div className="grid grid-cols-1 gap-4 min-[1025px]:grid-cols-[2fr_1fr]">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">
                    Tên bộ thẻ
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40"
                    placeholder="VD: Từ vựng Tiếng Anh Unit 1"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">
                    Màu chủ đạo
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["blue", "green", "purple", "red", "orange"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewDeckColor(c)}
                        className={`relative h-9 w-9 rounded-full border transition-transform ${
                          newDeckColor === c
                            ? "scale-110 border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900/50"
                            : "border-transparent"
                        } ${colorMap[c].split(" ")[0]}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {newCards.map((card, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => handleRemoveCardRow(idx)}
                      className="rounded-lg p-1.5 text-rose-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      aria-label={`Xóa thẻ ${idx + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40"
                      placeholder="Thuật ngữ"
                      value={card.term}
                      onChange={(e) => handleCardChange(idx, "term", e.target.value)}
                    />
                    <input
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40"
                      placeholder="Định nghĩa"
                      value={card.def}
                      onChange={(e) => handleCardChange(idx, "def", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAddCardRow}
                  className="rounded-2xl border-2 border-dashed border-blue-200 px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-slate-800"
                >
                  + Thêm thẻ
                </button>
                <button
                  onClick={saveDeck}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-800 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-300/40 transition-colors hover:bg-blue-900 dark:shadow-blue-900/40"
                >
                  <Save size={18} />
                  Lưu bộ thẻ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFlashcardTab;
