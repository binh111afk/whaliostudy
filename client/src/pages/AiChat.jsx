import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'; // 👈 Thêm dòng này
import "highlight.js/styles/atom-one-dark.css";
import { getFullApiUrl } from '../config/apiConfig';
import Tooltip from "../components/Tooltip";
import AvatarWithFrame from "../components/AvatarWithFrame";

const resolveAvatarSrc = (avatar) => {
  const raw = String(avatar || "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (normalized.startsWith("/img/") || normalized.startsWith("/uploads/")) {
    return getFullApiUrl(normalized);
  }

  return normalized;
};

const getInitials = (name, fallback = "U") => {
  const normalized = String(name || "").trim();
  if (!normalized) return fallback;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
};

const GEMINI_SUGGESTIONS = [
  { id: "image", text: "Tạo hình ảnh" },
  { id: "study", text: "Giúp tôi học" },
  { id: "write", text: "Viết bất cứ thứ gì" },
  { id: "plan", text: "Lập kế hoạch ôn thi" },
];

const SuggestionIcon = ({ type }) => {
  if (type === "image") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 16l4.4-4.4a1 1 0 0 1 1.4 0L14 16" />
        <path d="M13 15l2.6-2.6a1 1 0 0 1 1.4 0L20 15" />
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="10" r="1.4" />
      </svg>
    );
  }
  if (type === "study") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M6 10v4.5c0 1.8 2.7 3.5 6 3.5s6-1.7 6-3.5V10" />
      </svg>
    );
  }
  if (type === "write") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M12.5 7.5l4 4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v4" />
      <path d="M12 16v4" />
      <path d="M4 12h4" />
      <path d="M16 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

const IconMenu = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const IconClose = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

const IconChat = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
  </svg>
);

const IconTrash = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M7 7l1 12h8l1-12" />
  </svg>
);

const IconMore = ({ className = "h-[18px] w-[18px]" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const IconCopy = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <rect x="4" y="4" width="11" height="11" rx="2" />
  </svg>
);

const IconCheck = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const IconChevronDown = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconAttach = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const IconImage = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth="1.8" strokeLinecap="round">
    <defs>
      <linearGradient id="img-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="url(#img-grad)" />
    <circle cx="9" cy="10" r="1.4" stroke="url(#img-grad)" />
    <path d="M4 16l4.5-4.5a1 1 0 0 1 1.4 0L14 16" stroke="url(#img-grad)" />
    <path d="M13 15l2.8-2.8a1 1 0 0 1 1.4 0L20 15" stroke="url(#img-grad)" />
  </svg>
);

const IconSend = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.66,12a2,2,0,0,1-1.14,1.81L5.87,20.75A2.08,2.08,0,0,1,5,21a2,2,0,0,1-1.82-2.82L5.46,13H11a1,1,0,0,0,0-2H5.46L3.18,5.87A2,2,0,0,1,5.86,3.25h0l14.65,6.94A2,2,0,0,1,21.66,12Z" />
  </svg>
);

const AiChat = ({ onFullscreenChange = () => {} }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userDisplayName = user?.fullName || user?.name || user?.username || "Bạn";
  const userAvatarSrc = resolveAvatarSrc(user?.avatar);
  const userInitials = getInitials(userDisplayName, "QB");

  // --- STATE ---
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserAvatarBroken, setIsUserAvatarBroken] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isUserAtBottom = useRef(true);

  useEffect(() => {
    setIsUserAvatarBroken(false);
  }, [userAvatarSrc]);

  useEffect(() => {
    return () => {
      onFullscreenChange(false);
    };
  }, [onFullscreenChange]);

  // 1. LOAD SESSIONS
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. THEO DÕI VỊ TRÍ CUỘN
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      isUserAtBottom.current = distanceToBottom <= 50;

      if (isUserAtBottom.current) {
        setShowScrollButton(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. LOGIC CUỘN THÔNG MINH
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.role === "user" || isUserAtBottom.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: lastMessage.role === "user" ? "smooth" : "auto",
            block: "end",
          });
        }
      }, 50);
    } else if (lastMessage.role === "model") {
      setShowScrollButton(true);
    }
  }, [messages]);

  // --- API FUNCTIONS ---
  const loadSessions = async () => {
    try {
      const res = await fetch(getFullApiUrl(`/api/sessions?username=${user.username}`));
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err);
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (sessionId === currentSessionId) return;

    // 1. Tạm thời set ID để UI phản hồi
    setCurrentSessionId(sessionId);
    setIsLoading(true);

    try {
      const currentUsername = user ? user.username : "guest";
      const res = await fetch(
        getFullApiUrl(`/api/session/${sessionId}?username=${currentUsername}`)
      );
      const data = await res.json();

      if (data.success && data.session) {
        // ✅ TRƯỜNG HỢP 1: LẤY ĐƯỢC DỮ LIỆU -> HIỂN THỊ
        const formattedMessages = data.session.messages.map((msg) => ({
          id: msg._id,
          text: msg.content,
          role: msg.role === "user" ? "user" : "model",
          image:
            msg.hasAttachment && msg.attachmentType === "image"
              ? msg.attachmentUrl
              : null,
        }));
        setMessages(formattedMessages);

        if (window.innerWidth < 768) setSidebarOpen(false);
      } else {
        // ❌ TRƯỜNG HỢP 2: LỖI (KHÔNG QUYỀN / KHÔNG TÌM THẤY)
        // 👉 Thay vì alert, ta coi như đây là một cuộc hội thoại mới tinh
        console.warn("Không thể truy cập session:", data.message);

        // Reset về trạng thái "Chat mới"
        handleNewChat();

        // (Tùy chọn) Xóa luôn cái session bị lỗi đó khỏi danh sách sidebar để đỡ ngứa mắt
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      }
    } catch (err) {
      console.error("Lỗi kết nối:", err);
      handleNewChat(); // Lỗi mạng cũng reset luôn cho sạch
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setShowScrollButton(false);
    isUserAtBottom.current = true;
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion.text);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleTextareaResize = (target) => {
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm("Bạn muốn xóa cuộc trò chuyện này?")) return;

    try {
      const res = await fetch(
        getFullApiUrl(`/api/session/${sessionId}?username=${user.username}`),
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setSessions(sessions.filter((s) => s.sessionId !== sessionId));
        if (currentSessionId === sessionId) handleNewChat();
      }
    } catch (err) {
      alert("Lỗi khi xóa!");
    }
  };

  // --- HANDLERS ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        alert("Chỉ hỗ trợ file ảnh (JPG, PNG) thôi ông ơi!");
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
      isUserAtBottom.current = true;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    isUserAtBottom.current = true;
    setShowScrollButton(false);

    const userMsg = {
      id: Date.now(),
      role: "user",
      text: input,
      image: filePreview,
    };

    setMessages((prev) => [...prev, userMsg]);

    const msgToSend = input;
    const fileToSend = selectedFile;

    setInput("");
    removeFile();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", msgToSend);
      formData.append("username", user ? user.username : "guest");

      if (currentSessionId) {
        formData.append("sessionId", currentSessionId);
      }
      if (fileToSend) {
        formData.append("image", fileToSend);
      }

      const res = await fetch(getFullApiUrl("/api/chat"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const aiResponse = {
          id: Date.now() + 1,
          role: "model",
          text: data.response,
        };

        setMessages((prev) => [...prev, aiResponse]);

        if (!currentSessionId || data.isNewSession) {
          setCurrentSessionId(data.sessionId);
          loadSessions();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "model",
            text: "⚠️ Lỗi: " + data.message,
          },
        ]);
      }
    } catch (error) {
      console.error("Lỗi kết nối server:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "model",
          text: "🔌 Không thể kết nối với Whalio Brain. Ông nhớ chạy `node index.js` ở thư mục server chưa?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return !inline && match ? (
      <div className="relative group my-4 max-w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center bg-gray-800 px-4 py-1.5 text-xs text-gray-300 select-none">
          <span className="font-mono font-bold text-blue-300">{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? (
              <IconCheck className="h-[14px] w-[14px] text-green-400" />
            ) : (
              <IconCopy className="h-[14px] w-[14px]" />
            )}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
        </div>
        <div className="max-w-full overflow-x-auto bg-[#282c34]">
          <code className={`${className} block min-w-max`} {...props}>
            {children}
          </code>
        </div>
      </div>
    ) : (
      <code
        className={`${className} bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono border border-gray-200 dark:border-gray-600`}
        {...props}
      >
        {children}
      </code>
    );
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full overflow-hidden rounded-none border-0 bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    >
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng danh sách cuộc trò chuyện"
          className="absolute inset-0 z-30 bg-black/35"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR LỊCH SỬ CHAT - HIỆN/ẨN BẰNG NÚT MENU */}
      <div
        className={`${
          isMobile
            ? sidebarOpen
              ? "absolute inset-y-0 left-0 z-40 w-[85vw] max-w-xs"
              : "hidden"
            : sidebarOpen
              ? "w-64"
              : "w-0"
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-full shrink-0 overflow-hidden`}
      >
        <div className="p-4 shrink-0 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Lịch sử chat</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all font-bold shadow-sm group cursor-pointer"
          >
            <span className="group-hover:rotate-90 transition-transform text-blue-500">
              <IconAttach className="h-[18px] w-[18px]" />
            </span>{" "}
            Đoạn chat mới
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1 py-4">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 mt-10 text-sm px-3">
              Chưa có lịch sử
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => handleSelectSession(session.sessionId)}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors text-sm font-medium ${
                  currentSessionId === session.sessionId
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"
                }`}
              >
                <span className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <IconChat className="h-4 w-4" />
                </span>
                <span className="truncate flex-1 min-w-0">
                  {session.title || "Cuộc trò chuyện mới"}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(session.sessionId, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity shrink-0"
                >
                  <IconTrash className="h-[14px] w-[14px]" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {userAvatarSrc && !isUserAvatarBroken ? (
                <img
                  src={userAvatarSrc}
                  alt={userDisplayName}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setIsUserAvatarBroken(true)}
                />
              ) : (
                userInitials
              )}
            </div>
            <div className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-200 truncate min-w-0">
              {user ? user.username : "Quang Bình"}
            </div>
            <span className="text-gray-400 dark:text-gray-500 shrink-0">
              <IconMore className="h-[18px] w-[18px]" />
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="h-12 shrink-0 bg-transparent px-3 sm:px-4 flex items-center">
          <div className="flex items-center gap-2.5">
            <Tooltip text={sidebarOpen ? "Thu gọn" : "Mở rộng"}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/60"
              >
                <IconMenu className="h-5 w-5" />
              </button>
            </Tooltip>
            <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Whalio AI
            </span>
          </div>
        </div>

        {/* Messages (only scrollable area) */}
        <div
          ref={chatContainerRef}
          className="relative flex-1 overflow-y-auto bg-gray-50 px-3 pt-3 pb-4 dark:bg-gray-900 sm:px-4 sm:pt-4"
        >
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div
                key="start-screen"
                className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center px-4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.86, y: -72 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-[35%] -translate-y-[40%] rounded-full bg-violet-500/20 blur-[130px]" />

                <motion.div
                  className="relative z-10 flex w-full max-w-3xl flex-col items-center"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.h2
                    className="text-center text-xl font-semibold text-transparent"
                    style={{
                      fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif",
                      backgroundImage:
                        "linear-gradient(90deg, #60a5fa 0%, #c084fc 50%, #f472b6 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                  >
                    Xin chào {userDisplayName}!
                  </motion.h2>

                  <h1
                    className="mt-3 text-center text-4xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-5xl"
                    style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
                  >
                    Chúng ta nên bắt đầu từ đâu nhỉ?
                  </h1>

                  <div className="mt-8 w-full max-w-3xl">
                    {filePreview && (
                      <div className="mb-3 flex max-w-[calc(100%-2rem)] items-start gap-2 rounded-xl border border-slate-700 bg-[#1e1e1e] p-2 shadow-lg">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="h-20 w-auto max-w-[180px] rounded-lg object-cover"
                        />
                        <button
                          onClick={removeFile}
                          className="shrink-0 rounded-full bg-slate-700/80 p-1 text-slate-300 transition-colors hover:bg-red-900/30 hover:text-red-300"
                        >
                          <IconClose className="h-[14px] w-[14px]" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white/95 p-2.5 shadow-[0_10px_40px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-[#1e1e1e] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                      />

                      <Tooltip text="Thêm tệp">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                        >
                          {selectedFile ? <IconImage className="h-5 w-5" /> : <IconAttach className="h-5 w-5" />}
                        </button>
                      </Tooltip>

                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Hỏi Whalio..."
                        className="min-h-[44px] max-h-[120px] min-w-0 flex-1 resize-none border-none bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400 sm:text-base"
                        rows={1}
                        onInput={(e) => handleTextareaResize(e.target)}
                      />

                      <div className="flex items-center pr-1">
                        <Tooltip text="Gửi">
                          <button
                            onClick={handleSend}
                            disabled={(!input.trim() && !selectedFile) || isLoading}
                            className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                              (input.trim() || selectedFile) && !isLoading
                                ? "bg-blue-50 border border-blue-200 text-blue-600 shadow-sm hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
                                : "bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-700/80 dark:border-slate-600 dark:text-slate-500"
                            }`}
                            aria-label="Gửi"
                          >
                            <IconSend className="h-[15px] w-[15px]" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    className="mt-5 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.22, delay: 0.06 }}
                  >
                    {GEMINI_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-[#1e1e1e] dark:text-white/80 dark:hover:border-slate-600 dark:hover:text-white"
                      >
                        <span className="text-slate-500 dark:text-slate-300">
                          <SuggestionIcon type={suggestion.id} />
                        </span>
                        <span>{suggestion.text}</span>
                      </button>
                    ))}
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="chat-content"
                className="space-y-5 sm:space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mx-auto flex w-full gap-2 sm:max-w-4xl sm:gap-4 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {msg.role === "model" ? (
                      <div className="hidden sm:flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white text-blue-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-blue-400 items-center justify-center">
                        <img
                          src="/logo.png"
                          alt="Whalio AI"
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.src = "/img/logo.png";
                          }}
                        />
                      </div>
                    ) : (
                      <AvatarWithFrame
                        src={userAvatarSrc && !isUserAvatarBroken ? userAvatarSrc : null}
                        name={userDisplayName}
                        sizeClass="w-8 h-8 sm:w-9 sm:h-9"
                        avatarClassName="border border-transparent"
                        fallbackClassName="text-[11px] font-bold bg-blue-600 text-white"
                      />
                    )}

                    <div className={`group relative min-w-0 ${msg.role === "model" ? "w-full" : "max-w-[80%] sm:max-w-[78%]"}`}>
                      <div
                        className={`mb-1 text-xs font-bold ${
                          msg.role === "user"
                            ? "text-right text-gray-400 dark:text-gray-500"
                            : "text-left text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {msg.role === "model" ? "Whalio AI" : "Bạn"}
                      </div>

                      <div
                        className={`max-w-full break-words leading-relaxed ${
                          msg.role === "user"
                            ? "rounded-2xl rounded-tr-sm bg-white px-4 py-3 text-sm text-gray-800 dark:bg-slate-800/80 dark:text-gray-100 sm:px-5 sm:text-[15px]"
                            : "w-full bg-transparent px-0 py-0 text-base text-slate-800 dark:text-slate-100 whitespace-pre-wrap [overflow-wrap:anywhere]"
                        }`}
                      >
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Upload"
                            className="mb-4 h-auto max-w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700 md:max-w-xs"
                          />
                        )}

                        {msg.role === "model" ? (
                          <div
                            className="prose prose-sm sm:prose-base prose-blue w-full max-w-full break-words [overflow-wrap:anywhere] prose-p:leading-7 prose-pre:my-0 prose-pre:max-w-full prose-pre:overflow-x-auto"
                            style={{ fontFamily: "'Google Sans', 'Product Sans', 'Inter', sans-serif" }}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight, rehypeRaw]}
                              components={{
                                code: CodeBlock,
                                table: ({ node, ...props }) => (
                                  <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
                                    <table
                                      className="min-w-full divide-y divide-gray-200"
                                      {...props}
                                    />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead className="bg-gray-50" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th
                                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-blue-600"
                                    {...props}
                                  />
                                ),
                                td: ({ node, ...props }) => (
                                  <td
                                    className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600"
                                    {...props}
                                  />
                                ),
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="mx-auto flex max-w-4xl gap-4 animate-pulse">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 flex items-center justify-center">
                      <img
                        src="/logo.png"
                        alt="Whalio AI"
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.src = "/img/logo.png";
                        }}
                      />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                        <div className="delay-75 h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                        <div className="delay-150 h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                        Whalio đang suy nghĩ, bạn chịu khó đợi mình một chút nhé
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>

          {showScrollButton && messages.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 transform cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-sm text-white shadow-lg transition-all hover:bg-blue-700 flex items-center gap-2"
            >
              <IconChevronDown className="h-4 w-4" />
              Tin nhắn mới
            </button>
          )}
        </div>

        {/* Input Area */}
        {messages.length > 0 && (
          <div className="shrink-0 p-4">
            <div className="relative mx-auto max-w-3xl">
              {filePreview && (
                <div className="absolute bottom-full left-0 z-10 mb-3 flex max-w-[calc(100%-2rem)] items-start gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-20 w-auto max-w-[180px] rounded-lg object-cover"
                  />
                  <button
                    onClick={removeFile}
                    className="shrink-0 rounded-full bg-gray-100 p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <IconClose className="h-[14px] w-[14px]" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-full border border-slate-200/70 bg-slate-100/50 p-2 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/80 focus-within:ring-4 focus-within:ring-blue-500/10">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                />

                <Tooltip text="Gửi ảnh">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      selectedFile
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                        : "text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                    }`}
                  >
                    {selectedFile ? <IconImage className="h-[18px] w-[18px]" /> : <IconAttach className="h-[18px] w-[18px]" />}
                  </button>
                </Tooltip>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Hỏi Whalio bất kì điều gì ..."
                  className="min-h-[44px] max-h-[120px] min-w-0 flex-1 resize-none border-none bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition-colors dark:text-slate-100 dark:placeholder:text-slate-400 sm:text-base"
                  rows={1}
                  onInput={(e) => handleTextareaResize(e.target)}
                />

                <Tooltip text="Gửi">
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedFile) || isLoading}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                      (input.trim() || selectedFile) && !isLoading
                        ? "bg-blue-50 border border-blue-200 text-blue-600 shadow-sm hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        : "cursor-not-allowed bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-500"
                    }`}
                  >
                    <IconSend className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChat;
