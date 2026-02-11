import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Maximize, X, Settings, CheckCircle } from 'lucide-react';
import { studyService } from '../services/studyService';

const StudyTimer = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  // --- STATE ---
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Mặc định 25 phút (tính bằng giây)
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(25 * 60); // Để reset
  const [isFocusMode, setIsFocusMode] = useState(false); // Chế độ toàn màn hình
  const [showSettings, setShowSettings] = useState(false);
  
  // Dùng để tính thời gian thực tế đã học (tránh bug khi user reload)
  const startTimeRef = useRef(null); 

  // --- LOGIC ĐỒNG HỒ ---
  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
        
        // Cập nhật Title trình duyệt
        const minutes = Math.floor((timeLeft - 1) / 60);
        const seconds = (timeLeft - 1) % 60;
        document.title = `(${minutes}:${seconds < 10 ? '0' : ''}${seconds}) Đang học...`;
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // HẾT GIỜ -> TỰ ĐỘNG LƯU
      handleFinish();
    } else {
      // Reset title khi dừng
      document.title = "Whalio Study";
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // --- HÀM XỬ LÝ ---

  const toggleTimer = () => {
    if (!isActive) {
        startTimeRef.current = Date.now();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
    document.title = "Whalio Study";
  };

  const handleFinish = async () => {
    setIsActive(false);
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play();

    // Tính thời gian đã học (phút)
    const learnedMinutes = Math.floor(initialTime / 60);
    
    if (user) {
        await studyService.saveSession(user.username, learnedMinutes);
        alert(`🎉 Chúc mừng! Bạn đã hoàn thành ${learnedMinutes} phút tập trung.`);
    }
    
    // Nếu đang ở Focus Mode thì thoát ra
    setIsFocusMode(false);
    resetTimer();
  };

  const changeTime = (minutes) => {
    const seconds = minutes * 60;
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(false);
    setShowSettings(false);
  };

  // Format thời gian: MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- GIAO DIỆN FOCUS MODE (OVERLAY) ---
  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 text-white flex flex-col items-center justify-center animate-fade-in">
        <button 
            onClick={() => setIsFocusMode(false)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
        >
            <X size={24}/>
        </button>

        <div className="text-center">
            <h2 className="text-2xl font-light text-blue-300 mb-4 tracking-widest uppercase">Chế độ tập trung</h2>
            <div className="text-[12rem] font-bold leading-none tabular-nums tracking-tighter">
                {formatTime(timeLeft)}
            </div>
            <div className="flex gap-6 justify-center mt-12">
                <button onClick={toggleTimer} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-full font-bold text-xl min-w-[160px] transition-all transform hover:scale-105">
                    {isActive ? 'Tạm dừng' : 'Tiếp tục'}
                </button>
                <button onClick={handleFinish} className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-full font-bold text-xl transition-all">
                    Kết thúc sớm
                </button>
            </div>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN THƯỜNG (Trong Tab) ---
  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 md:p-12 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pomodoro Timer</span>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Settings size={20}/>
                </button>
            </div>

            {/* Time Display */}
            <div className="text-8xl md:text-9xl font-black text-gray-800 dark:text-white mb-8 tabular-nums tracking-tighter">
                {formatTime(timeLeft)}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-4">
                <button 
                    onClick={toggleTimer}
                    className={`h-16 px-8 rounded-2xl flex items-center gap-2 font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 ${
                        isActive ? 'bg-orange-100 text-orange-600' : 'bg-blue-600 text-white'
                    }`}
                >
                    {isActive ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                    {isActive ? 'Tạm dừng' : 'Bắt đầu'}
                </button>

                <button onClick={resetTimer} className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                    <RotateCcw size={24} />
                </button>

                <button onClick={() => setIsFocusMode(true)} className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all" title="Toàn màn hình">
                    <Maximize size={24} />
                </button>
            </div>

            {/* Quick Settings */}
            {showSettings && (
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 animate-fade-in-up">
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 font-medium">Chọn thời gian nhanh (phút)</p>
                    <div className="flex justify-center gap-3">
                        {[15, 25, 45, 60].map(m => (
                            <button 
                                key={m} 
                                onClick={() => changeTime(m)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                    initialTime === m * 60 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <p className="mt-6 text-gray-400 dark:text-gray-500 text-sm">
        💡 Dữ liệu học tập sẽ được tự động đồng bộ vào biểu đồ Dashboard khi bạn hoàn thành.
      </p>
    </div>
  );
};

export default StudyTimer;