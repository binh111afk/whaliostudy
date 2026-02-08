import React, { useState, useEffect } from 'react';
import { studyService } from '../services/studyService';
import AddDeadlineModal from '../components/AddDeadlineModal';
import { 
  BookOpen, Clock, CheckSquare, Calendar, Layers, FileText, Library, GraduationCap, TrendingUp, ArrowDown, Trash2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// --- HELPER: Lấy ngày giờ Việt Nam chuẩn ---
const getVNDate = () => {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('vi-VN', options);
};

// --- HELPER: Format thời gian hiển thị cho deadline ---
const formatDeadlineTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Đã quá hạn";
    if (diffDays === 0) return `Hôm nay, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (diffDays === 1) return `Ngày mai, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ` lúc ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// --- HELPER: Tính điểm hệ 4 từ hệ 10 (Quy chế tín chỉ phổ biến) ---
const convertToGPA4 = (score10) => {
    if (score10 >= 8.5) return 4.0;
    if (score10 >= 8.0) return 3.5;
    if (score10 >= 7.0) return 3.0;
    if (score10 >= 6.5) return 2.5;
    if (score10 >= 5.5) return 2.0;
    if (score10 >= 5.0) return 1.5;
    if (score10 >= 4.0) return 1.0;
    return 0;
};

// --- SUB-COMPONENTS ---
const ResourceCard = ({ title, count, icon: Icon, color, bg }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <div>
      <h4 className="font-bold text-gray-700 group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-sm text-gray-400">{count} mục</p>
    </div>
  </div>
);

// --- MAIN DASHBOARD ---
const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview'); 
  const [chartData, setChartData] = useState([]); 
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  
  // State cho Deadline
  const [deadlines, setDeadlines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 👇 STATE MỚI CHO GPA & TÍN CHỈ
  const [gpaMetrics, setGpaMetrics] = useState({
      current: 0.0, // GPA kỳ này
      last: 0.0,    // GPA kỳ trước
      diff: 0.0,    // Chênh lệch
      totalCredits: 0 // Tổng tín chỉ tích lũy
  });

  // --- 1. LOAD DỮ LIỆU ---
  useEffect(() => {
    if (user) {
        loadStats();
        loadDeadlines();
        loadGpaData(); // 👇 Gọi hàm load GPA
    }
  }, [user]);

  const loadStats = () => {
      studyService.getStats(user.username).then(res => {
          if (res.success) {
              let totalMinutes = 0;
              const formattedData = res.data.map(item => {
                  totalMinutes += item.minutes;
                  return {
                      name: item.name, 
                      hours: parseFloat((item.minutes / 60).toFixed(1))
                  };
              });
              setChartData(formattedData);
              setTotalStudyHours((totalMinutes / 60).toFixed(1));
          }
      });
  };

  // Hàm tải Deadline
  const loadDeadlines = async () => {
      try {
          const res = await fetch(`/api/events?username=${user.username}`);
          const data = await res.json();
          if (data.success) {
              const sorted = data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
              setDeadlines(sorted);
          }
      } catch (error) {
          console.error("Lỗi tải deadline:", error);
      }
  };

  // 👇 HÀM TẢI VÀ TÍNH TOÁN GPA
  const loadGpaData = async () => {
      try {
          const res = await fetch(`/api/gpa?username=${user.username}`);
          const data = await res.json();
          
          if (data.success && data.semesters && data.semesters.length > 0) {
              calculateGpaMetrics(data.semesters);
          }
      } catch (error) {
          console.error("Lỗi tải GPA:", error);
      }
  };

  // 👇 LOGIC TÍNH TOÁN GPA (QUAN TRỌNG)
  const calculateGpaMetrics = (semesters) => {
      let totalCreditsAccumulated = 0;
      let semesterGPAs = [];

      // Duyệt qua từng kỳ học
      semesters.forEach(sem => {
          let semTotalScore = 0;
          let semTotalCredits = 0;

          if (sem.subjects) {
              sem.subjects.forEach(sub => {
                  // 1. Tính điểm trung bình môn hệ 10
                  let subScore10 = 0;
                  let totalWeight = 0;
                  
                  if (sub.components && sub.components.length > 0) {
                      sub.components.forEach(comp => {
                          const score = parseFloat(comp.score);
                          const weight = parseFloat(comp.weight);
                          if (!isNaN(score) && !isNaN(weight)) {
                              subScore10 += score * (weight / 100);
                              totalWeight += weight;
                          }
                      });
                  }

                  // Chỉ tính nếu môn có điểm và đã nhập đủ đầu điểm (tổng trọng số ~ 100%)
                  // Hoặc đơn giản là có điểm > 0
                  if (subScore10 > 0) {
                      // 2. Quy đổi sang hệ 4
                      const subScore4 = convertToGPA4(subScore10);
                      const credits = parseFloat(sub.credits) || 0;

                      // Cộng dồn để tính GPA kỳ
                      semTotalScore += subScore4 * credits;
                      semTotalCredits += credits;

                      // Tính tổng tín chỉ tích lũy (Nếu qua môn: điểm hệ 4 >= 1.0)
                      if (subScore4 >= 1.0) {
                          totalCreditsAccumulated += credits;
                      }
                  }
              });
          }

          // Tính GPA của kỳ này
          const semGpa = semTotalCredits > 0 ? (semTotalScore / semTotalCredits) : 0;
          semesterGPAs.push(semGpa);
      });

      // Lấy GPA 2 kỳ gần nhất
      const currentGpa = semesterGPAs.length > 0 ? semesterGPAs[semesterGPAs.length - 1] : 0;
      const lastGpa = semesterGPAs.length > 1 ? semesterGPAs[semesterGPAs.length - 2] : 0;
      const diff = currentGpa - lastGpa;

      setGpaMetrics({
          current: currentGpa.toFixed(2),
          last: lastGpa.toFixed(2),
          diff: diff.toFixed(2),
          totalCredits: totalCreditsAccumulated
      });
  };

  const handleDeleteDeadline = async (id) => {
      if(!confirm("Bạn có chắc muốn xóa công việc này?")) return;
      try {
          const res = await fetch(`/api/events/${id}?username=${user.username}`, { method: 'DELETE' });
          const data = await res.json();
          if(data.success) {
              loadDeadlines(); 
          }
      } catch (error) {
          console.error("Lỗi xóa deadline:", error);
      }
  };

  const handleToggleDeadline = async (task) => {
      const newDeadlines = deadlines.map(d => 
          d._id === task._id ? { ...d, isDone: !d.isDone } : d
      );
      setDeadlines(newDeadlines);

      try {
          await fetch('/api/events/toggle', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: task._id, username: user.username })
          });
      } catch (error) {
          console.error("Lỗi lưu trạng thái:", error);
          loadDeadlines();
      }
  };

  const isIncrease = parseFloat(gpaMetrics.diff) >= 0;

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
        <h1 className="text-3xl font-black text-gray-800">
            {user ? (
              <>
                Xin chào, <span className="text-blue-600">{user.fullName}</span> 👋
              </>
            ) : (
              <span className="text-blue-600">Chào mừng bạn đến với Whalio!</span>
            )}
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            {getVNDate()}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50">
            Tùy chỉnh
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all flex items-center gap-2 cursor-pointer"
          >
            + Thêm Deadline
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Tổng quan', icon: GraduationCap },
            { id: 'exams', label: 'Đề thi', icon: FileText },
            { id: 'documents', label: 'Tài liệu môn học', icon: Library },
            { id: 'flashcards', label: 'Flashcard', icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* CARD 1: GPA (ĐÃ DYNAMIC) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold z-10">
                 {gpaMetrics.current}
               </div>
               <div className="z-10">
                 <p className="text-xs text-gray-400 font-bold uppercase">GPA Kỳ này</p>
                 <div className={`flex items-center text-sm font-bold ${isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                   {isIncrease ? <TrendingUp size={14} className="mr-1"/> : <ArrowDown size={14} className="mr-1"/>}
                   {isIncrease ? 'Tăng' : 'Giảm'} {Math.abs(gpaMetrics.diff)}
                 </div>
               </div>
               <div className={`absolute right-0 bottom-0 w-16 h-16 rounded-tl-full opacity-10 ${isIncrease ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

             {/* CARD 2: Tín chỉ (ĐÃ DYNAMIC) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold">
                 {gpaMetrics.totalCredits}
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Tín chỉ</p>
                 <p className="text-gray-700 font-bold">Đã hoàn thành</p>
               </div>
            </div>

            {/* CARD 3: Đề thi (Giữ nguyên) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-bold">12</div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Đề thi</p>
                 <p className="text-gray-700 font-bold">Đã luyện tập</p>
               </div>
            </div>

             {/* CARD 4: Giờ học (Đã Dynamic) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold">
                 <Clock size={24} />
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Tổng giờ học</p>
                 <p className="text-gray-700 font-bold">{totalStudyHours} giờ</p>
               </div>
            </div>
          </div>

          {/* Main Grid: Chart & Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Biểu đồ học tập */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-800">Hoạt động học tập (7 ngày qua)</h3>
               </div>
               <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#134691" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#134691" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="hours" stroke="#134691" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cột phải: To-Do List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Deadline sắp tới</h3>
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">
                    {deadlines.length} task
                </span>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[300px]">
                {deadlines.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <p>Không có deadline nào.</p>
                        <p className="text-xs">Thư giãn đi! 🎉</p>
                    </div>
                ) : (
                    deadlines.map((task) => (
                    <div key={task._id} className={`flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group relative ${task.isDone ? 'opacity-60' : ''}`}>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDeadline(task._id); }}
                            className="absolute right-2 top-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <Trash2 size={14} />
                        </button>

                        <div className="mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="checkbox"
                                checked={task.isDone || false}
                                onChange={() => handleToggleDeadline(task)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                        </div>

                        <div onClick={() => handleToggleDeadline(task)} className="flex-1">
                            <p className={`text-sm font-semibold transition-all ${task.isDone ? 'text-gray-400 line-through decoration-gray-400' : 'text-gray-700'}`}>
                                {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {task.type === 'exam' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">THI</span>}
                                <p className={`text-xs font-medium ${task.type === 'exam' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {formatDeadlineTime(task.date)}
                                </p>
                            </div>
                        </div>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Giao diện khi bấm vào Tab khác */}
      {activeTab !== 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
           <ResourceCard title="Ngân hàng Đề thi" count="128" icon={FileText} bg="bg-blue-50" color="text-blue-600" />
           <ResourceCard title="Tài liệu Đại cương" count="45" icon={Library} bg="bg-green-50" color="text-green-600" />
           <ResourceCard title="Tài liệu Chuyên ngành" count="32" icon={BookOpen} bg="bg-purple-50" color="text-purple-600" />
           <ResourceCard title="Flashcard Tiếng Anh" count="500+" icon={Layers} bg="bg-yellow-50" color="text-yellow-600" />
           <ResourceCard title="Flashcard Thuật ngữ" count="120" icon={Layers} bg="bg-red-50" color="text-red-600" />
        </div>
      )}

      <AddDeadlineModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadDeadlines}
        username={user?.username}
      />

    </div>
  );
};

export default Dashboard;