import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'; // 👈 Thêm dòng này
import "highlight.js/styles/atom-one-dark.css";
import {
  Send,
  Paperclip,
  User,
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
} from "lucide-react";

const AiChat = () => {
  const user = JSON.parse(localStorage.getItem("user"));

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isUserAtBottom = useRef(true);

  // 1. LOAD SESSIONS
  useEffect(() => {
    if (user) {
      loadSessions();
    }
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
      const res = await fetch(`/api/sessions?username=${user.username}`);
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
        `/api/session/${sessionId}?username=${currentUsername}`
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
        `/api/session/${sessionId}?username=${user.username}`,
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

      const res = await fetch("/api/chat", {
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
        className={`${className} bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono border border-gray-200`}
        {...props}
      >
        {children}
      </code>
    );
  };

  return (
    <div className="absolute inset-0 flex bg-white text-gray-800 overflow-hidden">
      {/* SIDEBAR LỊCH SỬ CHAT - HIỆN/ẨN BẰNG NÚT MENU */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full shrink-0 overflow-hidden`}
      >
        <div className="p-4 shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">LỊCH SỬ CHAT</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-600 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-blue-500 transition-all font-bold shadow-sm group cursor-pointer"
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
            <div className="text-center text-gray-400 mt-10 text-sm px-3">
              Chưa có lịch sử
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => handleSelectSession(session.sessionId)}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors text-sm font-medium ${
                  currentSessionId === session.sessionId
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <MessageSquare
                  size={16}
                  className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors"
                />
                <span className="truncate flex-1 min-w-0">
                  {session.title || "Cuộc trò chuyện mới"}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(session.sessionId, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
              {user ? user.username.substring(0, 2).toUpperCase() : "QB"}
            </div>
            <div className="flex-1 text-sm font-bold text-gray-700 truncate min-w-0">
              {user ? user.username : "Quang Bình"}
            </div>
            <MoreVertical size={18} className="text-gray-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-h-0 h-full">
        {/* SIMPLE HEADER - chỉ có logo và nút menu */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
          {/* Bên trái: Nút menu và logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Mở lịch sử chat"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-lg flex items-center gap-2">
                Whalio AI{" "}
                <Sparkles
                  size={16}
                  className="text-yellow-500 fill-yellow-500"
                />
              </span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                Flash 2.5
              </span>
            </div>
          </div>
        </div>

        {/* Nút cuộn xuống */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 animate-bounce z-50 cursor-pointer"
          >
            <ChevronDown size={16} />
            Tin nhắn mới
          </button>
        )}

        {/* Chat Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 space-y-8"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 max-w-4xl mx-auto ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                  msg.role === "model"
                    ? "bg-white border-gray-200 text-blue-600"
                    : "bg-blue-600 border-transparent text-white"
                }`}
              >
                {msg.role === "model" ? (
                  <Sparkles size={18} className="fill-blue-600" />
                ) : (
                  <User size={18} />
                )}
              </div>

              {/* Message Content */}
              <div className="group relative max-w-[85%] min-w-0">
                <div
                  className={`text-xs font-bold mb-1 ${
                    msg.role === "user"
                      ? "text-right text-gray-400"
                      : "text-left text-blue-600"
                  }`}
                >
                  {msg.role === "model" ? "Whalio AI" : "Bạn"}
                </div>

                <div
                  className={`px-6 py-4 rounded-2xl shadow-sm leading-relaxed text-[15px] break-words max-w-full ${
                    msg.role === "user"
                      ? "bg-white text-gray-800 rounded-tr-sm border border-gray-100"
                      : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Upload"
                      className="max-w-full md:max-w-xs h-auto rounded-lg mb-4 border border-gray-200 shadow-sm"
                    />
                  )}

                  {msg.role === "model" ? (
                    <div className="prose prose-sm max-w-none prose-blue prose-p:leading-7 prose-pre:my-0 break-words overflow-hidden">
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
              <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-blue-600" />
              </div>
              <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-sm border border-gray-100 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white shrink-0">
          <div className="max-w-4xl mx-auto p-4 relative">
            {/* Preview ảnh */}
            {filePreview && (
              <div className="absolute bottom-full left-0 mb-3 p-2 bg-white rounded-xl border border-gray-200 flex items-start gap-2 shadow-lg z-10 max-w-[calc(100%-2rem)]">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="h-20 w-auto rounded-lg object-cover max-w-[180px]"
                />
                <button
                  onClick={removeFile}
                  className="p-1 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Thanh nhập liệu */}
            <div className="flex items-end gap-2 bg-white p-2 rounded-2xl border border-gray-200 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm hover:shadow-md">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-xl transition-colors shrink-0 cursor-pointer ${
                  selectedFile
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-400 hover:text-blue-600 hover:bg-gray-50"
                }`}
                title="Gửi ảnh"
              >
                {selectedFile ? (
                  <ImageIcon size={22} />
                ) : (
                  <Paperclip size={22} />
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
                className="flex-1 bg-transparent text-gray-800 border-none outline-none resize-none py-3 max-h-[120px] min-h-[48px] placeholder-gray-400 text-base break-words min-w-0"
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
                className={`p-3 rounded-xl shrink-0 transition-all cursor-pointer ${
                  (input.trim() || selectedFile) && !isLoading
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
                title="Gửi"
              >
                <Send size={20} />
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3 font-medium">
              Whalio AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
