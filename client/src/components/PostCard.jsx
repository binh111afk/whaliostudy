import React from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreVertical,
  FileText,
  Trash2,
  Edit2,
} from "lucide-react";

const PostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onSave,
  onDelete,
  onEdit,
  onViewImage,
}) => {
  const isLiked = post.likedBy?.includes(currentUser?.username);
  const isSaved = post.savedBy?.includes(currentUser?.username);
  const isAuthor = post.author === currentUser?.username;
  const isAdmin = currentUser?.role === "admin";
  const displayAvatar = isAuthor ? currentUser?.avatar : post.authorAvatar;

  // Hàm xử lý thời gian
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return Math.floor(seconds / 60) + " phút trước";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " giờ trước";
    return Math.floor(seconds / 86400) + " ngày trước";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-shadow">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {/* Thay post.authorAvatar bằng displayAvatar */}
          <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden relative bg-gray-100">
            {displayAvatar && displayAvatar.includes("/") && (
              <img
                src={displayAvatar}
                alt="Avt" // 👈 Dùng biến displayAvatar
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            )}
            <div
              className="w-full h-full flex items-center justify-center font-bold text-gray-500"
              style={{
                display:
                  displayAvatar && displayAvatar.includes("/")
                    ? "none"
                    : "flex",
              }} // 👈 Dùng biến displayAvatar
            >
              {post.author?.charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 text-sm">
              {post.authorFullName || post.author}
            </h4>
            <p className="text-xs text-gray-500">
              {getTimeAgo(post.createdAt)}{" "}
              {post.editedAt && <span className="italic">(đã sửa)</span>}
            </p>
          </div>
        </div>

        {/* MENU OPTIONS */}
        {(isAuthor || isAdmin) && (
          <div className="flex gap-2">
            {isAuthor && (
              <button
                onClick={() => onEdit(post)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(post._id || post.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="mb-4">
        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* IMAGES GRID */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-2 mb-4 rounded-xl overflow-hidden ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="Post"
              onClick={() => onViewImage(img)} // Bấm vào thì mở Modal
              className="w-full h-64 object-cover hover:brightness-90 transition-all cursor-zoom-in"
            />
          ))}
        </div>
      )}

      {/* FILES LIST */}
      {post.files && post.files.length > 0 && (
        <div className="space-y-2 mb-4">
          {post.files.map((file, idx) => (
            <a
              key={idx}
              href={file.path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-700">
                  {file.originalName || file.name}
                </p>
                <p className="text-xs text-gray-400">Nhấn để tải về</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ACTIONS FOOTER */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <button
          onClick={() => onLike(post._id || post.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isLiked
              ? "text-red-500 bg-red-50"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Heart size={18} className={isLiked ? "fill-red-500" : ""} />{" "}
          {post.likes || 0} lượt thích
        </button>

        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        >
          <MessageCircle size={18} /> {post.comments?.length || 0} bình luận
        </button>

        <button
          onClick={() => onSave(post._id || post.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSaved
              ? "text-blue-600 bg-blue-50"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Bookmark size={18} className={isSaved ? "fill-blue-600" : ""} /> Lưu
        </button>
      </div>
    </div>
  );
};

export default PostCard;
