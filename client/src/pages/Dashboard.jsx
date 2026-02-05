import React, { useState, useEffect } from 'react';
import { studyService } from '../services/studyService'; // Import service
import { 
  BookOpen, Clock, AlertCircle, CheckSquare, 
  MoreHorizontal, ArrowUp, ArrowDown, Calendar, Layers, FileText, Library, GraduationCap, TrendingUp
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// --- HELPER: Lấy ngày giờ Việt Nam chuẩn ---
const getVNDate = () => {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('vi-VN', options);
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
  const [chartData, setChartData] = useState([]); // State lưu dữ liệu biểu đồ
  const [totalStudyHours, setTotalStudyHours] = useState(0); // Tổng giờ học

  // --- 1. LOAD DỮ LIỆU TỪ SERVER ---
  useEffect(() => {
    if (user) {
        // Gọi API lấy thống kê học tập
        studyService.getStats(user.username).then(res => {
            if (res.success) {
                // Backend trả về phút, ta đổi sang giờ cho biểu đồ đẹp hơn
                let totalMinutes = 0;
                
                const formattedData = res.data.map(item => {
                    totalMinutes += item.minutes;
                    return {
                        name: item.name, // Ngày (VD: 04/02)
                        hours: parseFloat((item.minutes / 60).toFixed(1)) // Đổi phút -> giờ (lấy 1 số thập phân)
                    };
                });

                setChartData(formattedData);
                setTotalStudyHours((totalMinutes / 60).toFixed(1));
            }
        });
    }
  }, [user]);

  // --- GIẢ LẬP DỮ LIỆU GPA ---
  const gpaCurrent = 3.85; 
  const gpaLast = 3.60;    
  const gpaDiff = (gpaCurrent - gpaLast).toFixed(2); 
  const isIncrease = gpaDiff >= 0;

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
          <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all">
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
              
             {/* CARD 1: GPA */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold z-10">
                 {gpaCurrent}
               </div>
               <div className="z-10">
                 <p className="text-xs text-gray-400 font-bold uppercase">GPA Kỳ này</p>
                 <div className={`flex items-center text-sm font-bold ${isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                   {isIncrease ? <TrendingUp size={14} className="mr-1"/> : <ArrowDown size={14} className="mr-1"/>}
                   {isIncrease ? 'Tăng' : 'Giảm'} {Math.abs(gpaDiff)}
                 </div>
               </div>
               <div className={`absolute right-0 bottom-0 w-16 h-16 rounded-tl-full opacity-10 ${isIncrease ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

             {/* CARD 2: Tín chỉ */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold">85</div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Tín chỉ</p>
                 <p className="text-gray-700 font-bold">Đã hoàn thành</p>
               </div>
            </div>

             {/* CARD 3: Đề thi */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-bold">12</div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Đề thi</p>
                 <p className="text-gray-700 font-bold">Đã luyện tập</p>
               </div>
            </div>

             {/* CARD 4: Giờ học (DỮ LIỆU THẬT TỪ SERVER) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold">
                 <Clock size={24} />
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase">Tổng giờ học</p>
                 {/* 👇 Hiển thị tổng giờ học thật */}
                 <p className="text-gray-700 font-bold">{totalStudyHours} giờ</p>
               </div>
            </div>
          </div>

          {/* Main Grid: Chart & Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Biểu đồ học tập (DỮ LIỆU THẬT) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-800">Hoạt động học tập (7 ngày qua)</h3>
                 <select className="bg-gray-50 border-none text-sm font-medium rounded-lg px-3 py-1 outline-none">
                   <option>Giờ học</option>
                 </select>
               </div>
               <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {/* 👇 Đã sửa data={chartData} */}
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#134691" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#134691" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    {/* 👇 dataKey="name" là ngày (04/02) */}
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    {/* 👇 dataKey="hours" là số giờ học */}
                    <Area type="monotone" dataKey="hours" stroke="#134691" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cột phải: To-Do List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Deadline sắp tới</h3>
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">3 task</span>
              </div>
              <div className="space-y-3">
                {[
                  { title: 'Tiểu luận Triết học', time: 'Hôm nay, 23:59', done: false },
                  { title: 'Bài tập nhóm C++', time: 'Ngày mai', done: false },
                  { title: 'Đăng ký môn học', time: 'Đã xong', done: true },
                ].map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                    <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {task.done && <CheckSquare size={14} className="text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${task.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</p>
                      <p className="text-xs text-gray-400">{task.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Giao diện khi bấm vào Tab khác (Đề thi / Tài liệu...) */}
      {activeTab !== 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
           <ResourceCard title="Ngân hàng Đề thi" count="128" icon={FileText} bg="bg-blue-50" color="text-blue-600" />
           <ResourceCard title="Tài liệu Đại cương" count="45" icon={Library} bg="bg-green-50" color="text-green-600" />
           <ResourceCard title="Tài liệu Chuyên ngành" count="32" icon={BookOpen} bg="bg-purple-50" color="text-purple-600" />
           <ResourceCard title="Flashcard Tiếng Anh" count="500+" icon={Layers} bg="bg-yellow-50" color="text-yellow-600" />
           <ResourceCard title="Flashcard Thuật ngữ" count="120" icon={Layers} bg="bg-red-50" color="text-red-600" />
        </div>
      )}

    </div>
  );
};

export default Dashboard;