import React, { useState } from 'react';
import mammoth from 'mammoth';
import { Upload, Save, X, Trash2, Check, FileText } from 'lucide-react';

export const ExamCreator = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Toán học');
    const [time, setTime] = useState(45);
    const [questions, setQuestions] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- LOGIC PARSE WORD (COPY TỪ CODE CŨ) ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const result = await mammoth.convertToHtml({ arrayBuffer });
                parseHTML(result.value, file.name);
            } catch (err) {
                alert('Lỗi đọc file!');
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const parseHTML = (htmlContent, fileName) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const paragraphs = doc.body.querySelectorAll('p');

        let parsedQuestions = [];
        let currentQ = null;
        const regexQuestion = /^(Câu\s+\d+|Bài\s+\d+|Question\s+\d+|\d+\.)[\s:.]/i;

        paragraphs.forEach(p => {
            let text = p.innerText.trim();
            const html = p.innerHTML;
            if (!text) return;

            if (regexQuestion.test(text)) {
                if (currentQ) parsedQuestions.push(currentQ);

                // Tách nội dung câu hỏi và đáp án A. nếu nó nằm cùng dòng
                let content = text;
                const firstOptIndex = text.search(/A\./);
                if (firstOptIndex > 0) {
                    content = text.substring(0, firstOptIndex).trim();
                }

                currentQ = {
                    question: content,
                    options: [],
                    answer: -1, // Mặc định chưa có đáp án
                    explanation: "",
                    type: 'multiple_choice'
                };
            } else if (currentQ && /^[A-D]\./.test(text)) {
                // Đây là đáp án
                const cleanOpt = text.replace(/^[A-D]\./, '').trim();
                currentQ.options.push(cleanOpt);
                
                // Logic nhận diện đáp án đúng (Bôi đỏ, gạch chân, in đậm...)
                if (html.includes('color:') || html.includes('strong') || html.includes('<u>') || html.includes('mark')) {
                    currentQ.answer = currentQ.options.length - 1;
                }
            }
        });
        if (currentQ) parsedQuestions.push(currentQ);

        if (parsedQuestions.length === 0) {
            alert("Không tìm thấy câu hỏi! File cần đúng định dạng 'Câu 1:', 'A.', 'B.'...");
            setIsProcessing(false);
            return;
        }

        setQuestions(parsedQuestions);
        setTitle(fileName.replace('.docx', ''));
        setStep(2); // Sang bước review
        setIsProcessing(false);
    };

    const handleSubmit = () => {
        if(!title) return alert("Nhập tên đề thi!");
        const payload = {
            id: Date.now(),
            title,
            subject,
            time: `${time} phút`,
            questions,
            limit: questions.length,
            image: getImageForSubject(subject)
        };
        onSuccess(payload);
    };

    const getImageForSubject = (subj) => {
        // Mapping ảnh giả lập
        const map = {
            'Toán học': 'https://cdn-icons-png.flaticon.com/512/3771/3771278.png',
            'Vật lý': 'https://cdn-icons-png.flaticon.com/512/2933/2933886.png',
            'Hóa học': 'https://cdn-icons-png.flaticon.com/512/995/995447.png',
            'Tiếng Anh': 'https://cdn-icons-png.flaticon.com/512/3269/3269817.png'
        };
        return map[subj] || 'https://cdn-icons-png.flaticon.com/512/2997/2997270.png';
    };

    if(step === 1) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6">
                    <h3 className="font-bold text-xl mb-4">Tạo đề thi mới</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer relative">
                        <input type="file" accept=".docx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                        <Upload size={32} className="mx-auto text-blue-500 mb-2"/>
                        <p className="font-medium">Tải lên file Word (.docx)</p>
                        <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động tách câu hỏi</p>
                    </div>
                    {isProcessing && <p className="text-center text-blue-600 mt-4 animate-pulse">Đang xử lý file...</p>}
                    <button onClick={onClose} className="w-full mt-4 py-2 text-gray-500">Hủy</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-xl">Cấu hình đề thi</h3>
                <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600">Chọn file khác</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2"><Save size={18}/> Lưu đề thi</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Tên đề thi</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Môn học</label>
                        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border rounded-lg">
                            <option>Toán học</option><option>Vật lý</option><option>Hóa học</option><option>Tiếng Anh</option><option>Sinh học</option><option>Lịch sử</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Thời gian (phút)</label>
                        <input type="number" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border rounded-lg"/>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-bold text-gray-700">Review câu hỏi ({questions.length})</h4>
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200">
                            <div className="font-bold mb-2 flex justify-between">
                                <span>Câu {idx+1}</span>
                                <button onClick={() => {
                                    const newQ = [...questions]; newQ.splice(idx, 1); setQuestions(newQ);
                                }} text-red-500><Trash2 size={16}/></button>
                            </div>
                            <textarea className="w-full p-2 border rounded mb-2 text-sm" value={q.question} onChange={e => {
                                const newQ = [...questions]; newQ[idx].question = e.target.value; setQuestions(newQ);
                            }}/>
                            <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className={`flex items-center gap-2 p-2 rounded border ${q.answer === optIdx ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                                        <input type="radio" name={`q-${idx}`} checked={q.answer === optIdx} onChange={() => {
                                             const newQ = [...questions]; newQ[idx].answer = optIdx; setQuestions(newQ);
                                        }}/>
                                        <input className="bg-transparent w-full outline-none text-sm" value={opt} onChange={e => {
                                            const newQ = [...questions]; newQ[idx].options[optIdx] = e.target.value; setQuestions(newQ);
                                        }}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};