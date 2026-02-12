import React, { useState } from 'react';
import { 
    Search, ExternalLink, Globe, Book, CreditCard, 
    Wrench, Heart, Copy, Edit, Check, Plus, ShieldCheck, Trash2,
    Monitor, Coffee, Library, Bus, School
} from 'lucide-react';

const Portal = ({ user }) => {
    // --- STATE QUẢN LÝ ---
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [formData, setFormData] = useState({ name: '', url: '', desc: '', categoryId: '' });

    // --- 🔐 LOGIC CHECK QUYỀN ADMIN ---
    // User là Admin nếu role là 'admin' HOẶC username là 'binhdzvl' (Account của ông)
    const isAdmin = user?.role === 'admin' || user?.username === 'binhdzvl';

    // --- DỮ LIỆU ĐẦY ĐỦ 5 DANH MỤC (BOX) ---
    const initialData = [
        {
            id: 'admin',
            category: "Hành chính & Đào tạo",
            icon: <Globe size={24} className="text-blue-600 dark:text-blue-400" />,
            bg: "bg-blue-50 dark:bg-blue-900/20",
            links: [
                { 
                    id: 101, 
                    name: "Cổng thông tin Đào tạo", 
                    url: "https://daotao.vnu.edu.vn", 
                    desc: "Đăng ký tín chỉ, xem điểm thi, lịch thi học kỳ" 
                },
                { 
                    id: 102, 
                    name: "Hệ thống LMS (E-learning)", 
                    url: "https://lms.vnu.edu.vn", 
                    desc: "Nộp bài tập, học online, thi giữa kỳ" 
                },
                { 
                    id: 103, 
                    name: "Email Sinh viên (Outlook)", 
                    url: "https://outlook.office.com", 
                    desc: "Nhận thông báo quan trọng từ nhà trường" 
                },
                { 
                    id: 104, 
                    name: "Phòng Công tác Sinh viên", 
                    url: "#", 
                    desc: "Quy chế, điểm rèn luyện, xin giấy xác nhận" 
                }
            ]
        },
        {
            id: 'finance',
            category: "Tài chính & Dịch vụ",
            icon: <CreditCard size={24} className="text-green-600 dark:text-green-400" />,
            bg: "bg-green-50 dark:bg-green-900/20",
            links: [
                { 
                    id: 201, 
                    name: "Cổng thanh toán học phí", 
                    url: "#", 
                    desc: "Tra cứu công nợ, thanh toán online qua ViettelPay/Momo" 
                },
                { 
                    id: 202, 
                    name: "Đăng ký Ký túc xá", 
                    url: "#", 
                    desc: "Hồ sơ nội trú, xem hóa đơn điện nước hàng tháng" 
                },
                { 
                    id: 203, 
                    name: "Bảo hiểm Y tế", 
                    url: "#", 
                    desc: "Tra cứu hạn sử dụng thẻ BHYT, nơi đăng ký KCB" 
                },
                { 
                    id: 204, 
                    name: "Xe buýt trường học", 
                    url: "#", 
                    desc: "Lộ trình, giờ chạy xe buýt nội khu ĐHQG" 
                }
            ]
        },
        {
            id: 'library',
            category: "Tài nguyên Học tập",
            icon: <Library size={24} className="text-purple-600 dark:text-purple-400" />,
            bg: "bg-purple-50 dark:bg-purple-900/20",
            links: [
                { 
                    id: 301, 
                    name: "Thư viện số (Digital Lib)", 
                    url: "#", 
                    desc: "Tải giáo trình, luận văn, đồ án mẫu các khóa trước" 
                },
                { 
                    id: 302, 
                    name: "Cơ sở dữ liệu Khoa học", 
                    url: "#", 
                    desc: "ScienceDirect, Scopus (Truy cập bằng IP trường)" 
                },
                { 
                    id: 303, 
                    name: "Kho đề thi cũ", 
                    url: "#", 
                    desc: "Tổng hợp đề thi các môn Đại cương và Chuyên ngành" 
                }
            ]
        },
        {
            id: 'tools',
            category: "Công cụ Sinh viên",
            icon: <Wrench size={24} className="text-orange-600 dark:text-orange-400" />,
            bg: "bg-orange-50 dark:bg-orange-900/20",
            links: [
                { 
                    id: 401, 
                    name: "iLovePDF", 
                    url: "https://www.ilovepdf.com/vi", 
                    desc: "Nén, gộp, chuyển đổi PDF sang Word miễn phí" 
                },
                { 
                    id: 402, 
                    name: "Canva Pro (Edu)", 
                    url: "https://www.canva.com", 
                    desc: "Thiết kế slide thuyết trình, poster sự kiện" 
                },
                { 
                    id: 403, 
                    name: "TopCV", 
                    url: "https://www.topcv.vn", 
                    desc: "Tạo CV thực tập, tìm việc làm thêm Part-time" 
                },
                { 
                    id: 404, 
                    name: "GitHub Student Pack", 
                    url: "https://education.github.com/pack", 
                    desc: "Gói công cụ lập trình miễn phí (JetBrains, Domain...)" 
                }
            ]
        },
        {
            id: 'community',
            category: "Cộng đồng & Đời sống",
            icon: <Heart size={24} className="text-pink-600 dark:text-pink-400" />,
            bg: "bg-pink-50 dark:bg-pink-900/20",
            links: [
                { 
                    id: 501, 
                    name: "Confessions Trường", 
                    url: "#", 
                    desc: "Hóng drama, tìm đồ thất lạc, tâm sự tuổi hồng" 
                },
                { 
                    id: 502, 
                    name: "CLB Guitar & Âm nhạc", 
                    url: "#", 
                    desc: "Đăng ký tham gia, lịch sinh hoạt hàng tuần" 
                },
                { 
                    id: 503, 
                    name: "Góc Review Môn học", 
                    url: "#", 
                    desc: "Hỏi đáp về giảng viên, môn học dễ/khó" 
                },
                { 
                    id: 504, 
                    name: "Tìm trọ sinh viên", 
                    url: "#", 
                    desc: "Hỗ trợ tìm phòng trọ giá rẻ khu vực Làng ĐH" 
                }
            ]
        }
    ];

    const [portalData, setPortalData] = useState(initialData);

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN (HANDLERS) ---

    // Xử lý Copy Link
    const handleCopy = (e, url, id) => {
        e.preventDefault(); 
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        // Tắt icon check sau 2 giây
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Xử lý Sửa Link (Chỉ Admin)
    const handleEdit = (e, link, categoryId) => {
        e.preventDefault(); 
        e.stopPropagation();
        setEditingLink({ ...link, categoryId });
        setFormData({ 
            name: link.name, 
            url: link.url, 
            desc: link.desc, 
            categoryId: categoryId 
        });
        setIsModalOpen(true);
    };

    // Xử lý Xóa Link (Chỉ Admin)
    const handleDelete = (e, linkId, categoryId) => {
        e.preventDefault(); 
        e.stopPropagation();
        if(confirm("Bạn chắc chắn muốn xóa link này?")) {
            setPortalData(prevData => 
                prevData.map(section => {
                    if (section.id === categoryId) {
                        return {
                            ...section,
                            links: section.links.filter(link => link.id !== linkId)
                        };
                    }
                    return section;
                })
            );
        }
    }

    // Xử lý Thêm Link Mới (Chỉ Admin)
    const handleAddNew = () => {
        setEditingLink(null);
        setFormData({ name: '', url: '', desc: '', categoryId: portalData[0].id });
        setIsModalOpen(true);
    }

    // Xử lý Lưu Link (Thêm mới hoặc Cập nhật)
    const handleSave = () => {
        if (!formData.name || !formData.url || !formData.desc || !formData.categoryId) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (editingLink) {
            // Cập nhật link hiện có
            setPortalData(prevData => 
                prevData.map(section => {
                    if (section.id === formData.categoryId) {
                        return {
                            ...section,
                            links: section.links.map(link => 
                                link.id === editingLink.id
                                    ? { ...link, name: formData.name, url: formData.url, desc: formData.desc }
                                    : link
                            )
                        };
                    }
                    return section;
                })
            );
        } else {
            // Thêm link mới
            const newId = Math.max(...portalData.flatMap(s => s.links.map(l => l.id))) + 1;
            setPortalData(prevData => 
                prevData.map(section => {
                    if (section.id === formData.categoryId) {
                        return {
                            ...section,
                            links: [...section.links, { 
                                id: newId, 
                                name: formData.name, 
                                url: formData.url, 
                                desc: formData.desc 
                            }]
                        };
                    }
                    return section;
                })
            );
        }

        setIsModalOpen(false);
        setEditingLink(null);
        setFormData({ name: '', url: '', desc: '', categoryId: '' });
    }

    // --- LOGIC TÌM KIẾM ---
    // Lọc danh mục và link bên trong dựa trên từ khóa tìm kiếm
    const filteredData = portalData.map(section => ({
        ...section,
        links: section.links.filter(link => 
            link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            link.desc.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(section => section.links.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-4 md:p-8 animate-fade-in-up">
            <div className="max-w-7xl mx-auto">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                            <span className="bg-blue-600 text-white p-2 rounded-xl"><Monitor size={24}/></span>
                            Cổng Tiện Ích
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                            Tất cả liên kết bạn cần, ở ngay đây.
                            {/* Hiển thị Badge Admin nếu có quyền */}
                            {isAdmin && (
                                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1 animate-pulse">
                                    <ShieldCheck size={12}/> Admin Mode
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        {/* Ô TÌM KIẾM */}
                        <div className="relative flex-1 md:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors"/>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
                                placeholder="Tìm kiếm tiện ích (VD: điểm, lms...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* NÚT THÊM MỚI (CHỈ ADMIN THẤY) */}
                        {isAdmin && (
                            <button 
                                onClick={handleAddNew}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all transform hover:scale-105"
                                title="Thêm liên kết mới"
                            >
                                <Plus size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* --- MAIN CONTENT (GRID 5 BOX) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    {filteredData.length > 0 ? (
                        filteredData.map((section) => (
                            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300 h-fit">
                                
                                {/* Header của từng Box */}
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                                    <div className={`p-3 rounded-xl ${section.bg}`}>
                                        {section.icon}
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                        {section.category}
                                    </h3>
                                </div>

                                {/* Danh sách Link trong Box */}
                                <div className="space-y-3">
                                    {section.links.map((link) => (
                                        <a 
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group relative block p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all"
                                        >
                                            <div className="flex justify-between items-start">
                                                {/* Tên Link */}
                                                <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-14">
                                                    {link.name}
                                                </span>

                                                {/* --- KHU VỰC NÚT BẤM (Góc phải) --- */}
                                                <div className="absolute top-3 right-3 flex items-center gap-1">
                                                    {/* Nút Copy */}
                                                    <button
                                                        onClick={(e) => handleCopy(e, link.url, link.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                                                        title="Copy Link"
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check size={14} className="text-green-500" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </button>

                                                    {/* Icon Open Link */}
                                                    <div className="p-1.5 text-gray-300 group-hover:text-blue-500 transition-colors">
                                                        <ExternalLink size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Mô tả link */}
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                                                {link.desc}
                                            </p>

                                            {/* Nút Admin (Ở dưới mô tả) */}
                                            {isAdmin && (
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleEdit(e, link, section.id)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/30 transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit size={12} />
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, link.id, section.id)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={12} />
                                                        Xóa
                                                    </button>
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Coffee size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Không tìm thấy tiện ích nào khớp với từ khóa này.</p>
                            <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 hover:underline font-bold text-sm">Xóa tìm kiếm</button>
                        </div>
                    )}
                </div>

                {/* MODAL THÊM/SỬA LINK (CHỈ ADMIN) */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                                {editingLink ? '✏️ Sửa Link' : '➕ Thêm Link Mới'}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Danh mục</label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        {portalData.map(section => (
                                            <option key={section.id} value={section.id}>{section.category}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên Link</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="VD: Cổng thông tin Đào tạo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</label>
                                    <textarea
                                        value={formData.desc}
                                        onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows="3"
                                        placeholder="Mô tả ngắn gọn về link này"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingLink(null);
                                        setFormData({ name: '', url: '', desc: '', categoryId: '' });
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    {editingLink ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Portal;