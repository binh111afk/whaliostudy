import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'; // 👈 Thêm dòng này
import "highlight.js/styles/atom-one-dark.css";
import { getFullApiUrl } from '../config/apiConfig';
import {
  Send,
  Paperclip,
  Plus,
  MessageSquare,
  MoreVertical,
  Trash2,
  X,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  Menu,
  Maximize2,
  Minimize2,
} from "lucide-react";

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

const AiChat = ({ onFullscreenChange = () => {} }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userDisplayName = user?.fullName || user?.name || user?.username || "Bạn";
  const userAvatarSrc = resolveAvatarSrc(user?.avatar);
  const userInitials = getInitials(userDisplayName, "QB");

  // --- STATE ---
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "model",
      text: "Chào bạn! Tôi là **Whalio AI**. Tôi có thể giúp gì cho việc học tập của ông hôm nay? (Giải toán, tâm sự, hay Lên kế hoạch ôn thi?)",
    },
  ]);
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
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
    setMessages([
      {
        id: 1,
        role: "model",
        text: "Chào bạn! Tôi là **Whalio AI**. Tôi có thể giúp gì cho việc học tập của ông hôm nay? (Giải toán, tâm sự, hay Lên kế hoạch ôn thi?)",
      },
    ]);
    setInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setShowScrollButton(false);
    isUserAtBottom.current = true;
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

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      onFullscreenChange(next);
      return next;
    });
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
      <div className="relative group my-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center bg-gray-800 px-4 py-1.5 text-xs text-gray-300 select-none">
          <span className="font-mono font-bold text-blue-300">{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} />
            )}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
        </div>
        <div className="overflow-x-auto bg-[#282c34]">
          <code className={className} {...props}>
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
      className={`relative flex h-full min-h-0 w-full overflow-hidden bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100 ${
        isFullscreen ? "rounded-none border-0" : "rounded-2xl border border-gray-200 dark:border-gray-700"
      }`}
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
              <X size={20} />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all font-bold shadow-sm group cursor-pointer"
          >
            <Plus
              size={18}
              className="group-hover:rotate-90 transition-transform"
            />{" "}
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
                <MessageSquare
                  size={16}
                  className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                />
                <span className="truncate flex-1 min-w-0">
                  {session.title || "Cuộc trò chuyện mới"}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(session.sessionId, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity shrink-0"
                >
                  <Trash2 size={14} />
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
            <MoreVertical size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
          </div>
        </div>
      </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col min-h-0 h-full">
          {/* SIMPLE HEADER - chỉ có logo và nút menu */}
          <div className="h-14 sm:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 bg-white dark:bg-gray-800 shrink-0">
          {/* Bên trái: Nút menu và logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              title="Mở lịch sử chat"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 dark:text-white text-base sm:text-lg flex items-center gap-2">
                Whalio AI{" "}
                <Sparkles
                  size={14}
                  className="text-yellow-500 fill-yellow-500"
                />
              </span>
              <span className="hidden sm:inline-flex text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-100 dark:border-blue-700">
                Flash 2.5
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            title={isFullscreen ? "Thu nhỏ AiChat" : "Phóng to AiChat"}
            aria-label={isFullscreen ? "Thu nhỏ AiChat" : "Phóng to AiChat"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Nút cuộn xuống */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 sm:bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 animate-bounce z-50 cursor-pointer text-sm"
          >
            <ChevronDown size={16} />
            Tin nhắn mới
          </button>
        )}

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-5 sm:space-y-8 bg-gray-50 dark:bg-gray-900"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-4 max-w-4xl mx-auto ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border overflow-hidden ${
                    msg.role === "model"
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400"
                    : "bg-blue-600 dark:bg-blue-500 border-transparent text-white"
                }`}
              >
                {msg.role === "model" ? (
                  <img
                    src="/logo.png"
                    alt="Whalio AI"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.currentTarget.src = "/img/logo.png";
                    }}
                  />
                ) : (
                  userAvatarSrc && !isUserAvatarBroken ? (
                    <img
                      src={userAvatarSrc}
                      alt={userDisplayName}
                      className="w-full h-full object-cover"
                      onError={() => setIsUserAvatarBroken(true)}
                    />
                  ) : (
                    <span className="text-[11px] font-bold">{userInitials}</span>
                  )
                )}
              </div>

              {/* Message Content */}
              <div className="group relative max-w-[92%] sm:max-w-[85%] min-w-0">
                <div
                  className={`text-xs font-bold mb-1 ${
                    msg.role === "user"
                      ? "text-right text-gray-400 dark:text-gray-500"
                      : "text-left text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {msg.role === "model" ? "Whalio AI" : "Bạn"}
                </div>

                <div
                  className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-sm leading-relaxed text-sm sm:text-[15px] break-words max-w-full ${
                    msg.role === "user"
                      ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tr-sm border border-gray-100 dark:border-gray-700"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-700"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Upload"
                      className="max-w-full md:max-w-xs h-auto rounded-lg mb-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                    />
                  )}

                  {msg.role === "model" ? (
                    <div className="prose prose-sm sm:prose-base max-w-none prose-blue prose-p:leading-7 prose-pre:my-0 break-words overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]} // Bắt buộc phải có để AI hiểu cú pháp bảng
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        components={{
                          code: CodeBlock,
                          // 👇 Ép các thẻ bảng dùng class Tailwind
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
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
                              className="px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase tracking-wider"
                              {...props}
                            />
                          ),
                          td: ({ node, ...props }) => (
                            <td
                              className="px-4 py-3 text-sm text-gray-600 border-t border-gray-100"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto animate-pulse">
              <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Whalio AI"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.src = "/img/logo.png";
                  }}
                />
              </div>
              <div className="bg-white dark:bg-gray-800 px-5 py-4 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Whalio đang suy nghĩ, bạn chịu khó đợi mình một chút nhé
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="max-w-4xl mx-auto p-3 sm:p-4 relative">
            {/* Preview ảnh */}
            {filePreview && (
              <div className="absolute bottom-full left-0 mb-3 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-2 shadow-lg z-10 max-w-[calc(100%-2rem)]">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="h-20 w-auto rounded-lg object-cover max-w-[180px]"
                />
                <button
                  onClick={removeFile}
                  className="p-1 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Thanh nhập liệu */}
            <div className="flex items-end gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm hover:shadow-md">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 sm:p-3 rounded-xl transition-colors shrink-0 cursor-pointer ${
                  selectedFile
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                title="Gửi ảnh"
              >
                {selectedFile ? (
                  <ImageIcon size={20} />
                ) : (
                  <Paperclip size={20} />
                )}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Hỏi Whalio bất kì điều gì ..."
                className="flex-1 bg-transparent text-gray-800 dark:text-gray-200 border-none outline-none resize-none py-2.5 sm:py-3 max-h-[120px] min-h-[44px] placeholder-gray-400 dark:placeholder-gray-400 text-sm sm:text-base break-words min-w-0 transition-colors"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />

              <button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className={`p-2.5 sm:p-3 rounded-xl shrink-0 transition-all cursor-pointer ${
                  (input.trim() || selectedFile) && !isLoading
                    ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md hover:shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }`}
                title="Gửi"
              >
                <Send size={18} />
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium">
              Whalio AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
