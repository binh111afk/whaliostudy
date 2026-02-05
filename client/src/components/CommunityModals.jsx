import React, { useState, useEffect } from 'react';
import { X, Image, Paperclip, Send, Trash2, FileText, CornerDownRight } from 'lucide-react';

// --- MODAL ĐĂNG BÀI / SỬA BÀI ---
export const CreatePostModal = ({ isOpen, onClose, onSubmit, postToEdit }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form mỗi khi mở modal hoặc đổi postToEdit
  useEffect(() => {
    if (isOpen) {
        if (postToEdit) {
            setContent(postToEdit.content);
            // Lưu ý: Không load lại ảnh cũ vào input file được vì lý do bảo mật browser
            // Nếu muốn sửa ảnh cũ thì logic phức tạp hơn (backend phải hỗ trợ xóa ảnh cũ/thêm ảnh mới)
            // Tạm thời chỉ hỗ trợ sửa nội dung text
            setImages([]); 
            setFiles([]);
        } else {
            resetForm();
        }
    }
  }, [isOpen, postToEdit]);

  const resetForm = () => {
    setContent('');
    setImages([]);
    setFiles([]);
  };

  const handleImageSelect = (e) => {
    if (e.target.files) {
        setImages(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return alert('Vui lòng nhập nội dung!');
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('content', content);
    if (postToEdit) formData.append('postId', postToEdit._id || postToEdit.id);
    
    images.forEach(img => formData.append('images', img));
    files.forEach(file => formData.append('files', file));

    await onSubmit(formData, !!postToEdit);
    
    setIsSubmitting(false);
    resetForm(); // Xóa dữ liệu sau khi đăng xong
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-lg">{postToEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h3>
            <button onClick={onClose}><X className="text-gray-400 hover:text-red-500 cursor-pointer"/></button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
            <textarea 
                value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full h-32 p-3 bg-gray-50 rounded-xl border-none outline-none resize-none placeholder-gray-400 text-base"
                placeholder="Bạn đang nghĩ gì thế?..."
                autoFocus
            />
            
            {/* Preview Ảnh (Có hiện ảnh thật + nút xóa) */}
            {images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img src={URL.createObjectURL(img)} alt="Preview" className="w-full h-full object-cover"/>
                            <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors cursor-pointer">
                                <X size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview File (Có tên file + nút xóa) */}
            {files.length > 0 && (
                <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 truncate">
                                <FileText size={16} className="text-gray-500"/>
                                <span className="text-xs text-gray-700 truncate max-w-[200px]">{f.name}</span>
                            </div>
                            <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <label className="p-2 hover:bg-blue-50 rounded-full cursor-pointer text-blue-500 transition-colors" title="Thêm ảnh">
                        <Image size={22}/><input type="file" hidden accept="image/*" multiple onChange={handleImageSelect} />
                    </label>
                    <label className="p-2 hover:bg-green-50 rounded-full cursor-pointer text-green-500 transition-colors" title="Thêm tài liệu">
                        <Paperclip size={22}/><input type="file" hidden multiple onChange={handleFileSelect} />
                    </label>
                </div>
                <button 
                    onClick={handleSubmit} disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/30 cursor-pointer"
                >
                    {isSubmitting ? 'Đang lưu...' : (postToEdit ? 'Cập nhật' : 'Đăng bài')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MODAL BÌNH LUẬN & TRẢ LỜI ---
export const CommentModal = ({ isOpen, onClose, post, currentUser, onSubmitComment, onDeleteComment, onReplyComment }) => {
    const [text, setText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); 
    const [replyText, setReplyText] = useState('');

    if (!isOpen || !post) return null;

    const handleReplySubmit = async (parentCommentId) => {
        if (!replyText.trim()) return;
        await onReplyComment(post._id || post.id, parentCommentId, replyText);
        setReplyText('');
        setReplyingTo(null);
    };

    // Helper: Logic chọn Avatar (Ưu tiên currentUser nếu là chính mình để Real-time)
    const getDisplayAvatar = (authorName, authorAvatar) => {
        if (currentUser && authorName === currentUser.username) {
            return currentUser.avatar;
        }
        return authorAvatar;
    };

    // Helper: Component Avatar nhỏ gọn để tái sử dụng
    const SmartAvatar = ({ src, name, size = "w-8 h-8", fontSize = "text-xs" }) => (
        <div className={`${size} rounded-full border border-gray-200 overflow-hidden relative bg-gray-100 shrink-0`}>
            {src && src.includes('/') && (
                <img 
                    src={src} alt="Avt" 
                    className="w-full h-full object-cover"
                    onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}
                />
            )}
            <div 
                className={`w-full h-full flex items-center justify-center font-bold text-gray-500 ${fontSize}`} 
                style={{display: (src && src.includes('/')) ? 'none' : 'flex'}}
            >
                {name?.charAt(0).toUpperCase()}
            </div>
        </div>
    );

    // Xác định Avatar cho bài viết gốc
    const postAvatar = getDisplayAvatar(post.author, post.authorAvatar);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white z-10">
                <h3 className="font-bold text-lg text-gray-800">Bình luận</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="text-gray-500"/></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-0 bg-gray-50 scroll-smooth">
                {/* 1. Preview Bài viết gốc */}
                <div className="bg-white p-5 border-b border-gray-100 mb-2">
                    <div className="flex gap-3 mb-3">
                        {/* Avatar Post */}
                        <SmartAvatar src={postAvatar} name={post.author} size="w-10 h-10" fontSize="text-sm"/>
                        
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{post.authorFullName || post.author}</p>
                            <p className="text-xs text-gray-500">Tác giả</p>
                        </div>
                    </div>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                    
                    {/* Ảnh bài gốc */}
                    {post.images && post.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {post.images.map((img, i) => <img key={i} src={img} className="w-full h-32 object-cover rounded-lg border border-gray-200"/>)}
                        </div>
                    )}
                    {/* File bài gốc */}
                    {post.files && post.files.length > 0 && (
                        <div className="space-y-1">
                            {post.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-blue-600">
                                    <FileText size={14}/> {f.originalName || f.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Danh sách Comment */}
                <div className="p-4 space-y-5">
                    {post.comments?.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}
                    
                    {post.comments?.map(cmt => {
                        const cmtAvatar = getDisplayAvatar(cmt.author, cmt.authorAvatar);
                        
                        return (
                        <div key={cmt.id} className="group">
                            {/* Comment cha */}
                            <div className="flex gap-3">
                                {/* Avatar Comment */}
                                <SmartAvatar src={cmtAvatar} name={cmt.author} />
                                
                                <div className="flex-1">
                                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-100 inline-block min-w-[200px]">
                                        <span className="font-bold text-sm block text-gray-900">{cmt.author}</span>
                                        <span className="text-sm text-gray-700 whitespace-pre-wrap">{cmt.content}</span>
                                    </div>
                                    <div className="flex gap-4 mt-1.5 ml-2 text-xs text-gray-500 font-medium">
                                        <button onClick={() => setReplyingTo(replyingTo === cmt.id ? null : cmt.id)} className="hover:text-blue-600 transition-colors">Trả lời</button>
                                        {(currentUser?.username === cmt.author || currentUser?.role === 'admin') && (
                                            <button onClick={() => onDeleteComment(post._id || post.id, cmt.id)} className="text-red-400 hover:text-red-600 transition-colors">Xóa</button>
                                        )}
                                        <span>• Vừa xong</span>
                                    </div>

                                    {/* Form Trả lời */}
                                    {replyingTo === cmt.id && (
                                        <div className="mt-3 flex gap-2 animate-fade-in-up">
                                            <div className="border-l-2 border-gray-200 ml-4 pl-3 flex-1">
                                                <input 
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                                    placeholder={`Trả lời ${cmt.author}...`}
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(cmt.id)}
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-200 rounded-full">Hủy</button>
                                                    <button onClick={() => handleReplySubmit(cmt.id)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700">Gửi</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Danh sách Reply (Comment con) */}
                            {cmt.replies && cmt.replies.length > 0 && (
                                <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-100 pl-3">
                                    {cmt.replies.map(reply => {
                                        const replyAvatar = getDisplayAvatar(reply.author, reply.authorAvatar);
                                        
                                        return (
                                        <div key={reply.id} className="flex gap-2">
                                            {/* Avatar Reply */}
                                            <SmartAvatar src={replyAvatar} name={reply.author} size="w-6 h-6" fontSize="text-[10px]"/>
                                            
                                            <div>
                                                <div className="bg-gray-100 rounded-xl rounded-tl-none px-3 py-2">
                                                    <span className="font-bold text-xs block text-gray-900">{reply.author}</span>
                                                    <span className="text-xs text-gray-700">{reply.content}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>

            {/* Input Footer (Bình luận cấp 1) */}
            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <div className="flex gap-2 items-center">
                    {/* Avatar Input của User hiện tại */}
                    <SmartAvatar src={currentUser?.avatar} name={currentUser?.fullName || currentUser?.username} />
                    
                    <div className="flex-1 relative">
                        <input 
                            value={text} onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (onSubmitComment(post._id || post.id, text), setText(''))}
                            className="w-full bg-gray-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white border border-transparent focus:border-blue-200 transition-all text-sm"
                            placeholder="Viết bình luận công khai..."
                        />
                        <button 
                            onClick={() => { onSubmitComment(post._id || post.id, text); setText(''); }}
                            disabled={!text.trim()}
                            className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={14}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
};