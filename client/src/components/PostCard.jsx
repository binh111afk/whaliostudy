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
import { getFullApiUrl } from "../config/apiConfig";

const resolveAvatarSrc = (avatar) => {
  const raw = String(avatar || "").trim();
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
  const resolvedAvatar = resolveAvatarSrc(displayAvatar);
  const totalCommentCount = (post.comments || []).reduce(
    (acc, cmt) => acc + 1 + (cmt.replies?.length || 0),
    0
  );

  // Hàm xử lý thời gian
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return Math.floor(seconds / 60) + " phút trước";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " giờ trước";
    return Math.floor(seconds / 86400) + " ngày trước";
  };

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {/* Thay post.authorAvatar bằng displayAvatar */}
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
            {resolvedAvatar && (
              <img
                src={resolvedAvatar}
                alt="Avt" // 👈 Dùng biến displayAvatar
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            )}
            <div
              className="flex h-full w-full items-center justify-center font-bold text-gray-500 dark:text-gray-300"
              style={{
                display: resolvedAvatar ? "none" : "flex",
              }} // 👈 Dùng biến displayAvatar
            >
              {post.author?.charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">
              {post.authorFullName || post.author}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(post._id || post.id)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="mb-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">
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
               className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
            >
               <div className="rounded-lg bg-white p-2 text-blue-500 shadow-sm dark:bg-gray-800">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="truncate text-sm font-medium text-gray-700 group-hover:text-blue-700 dark:text-gray-200 dark:group-hover:text-blue-300">
                   {file.originalName || file.name}
                 </p>
                 <p className="text-xs text-gray-400 dark:text-gray-500">Nhấn để tải về</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ACTIONS FOOTER */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <button
          onClick={() => onLike(post._id || post.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isLiked
              ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
              : "text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          <Heart size={18} className={isLiked ? "fill-red-500" : ""} />{" "}
          {post.likes || 0} lượt thích
        </button>

        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
        >
          <MessageCircle size={18} /> {totalCommentCount} bình luận
        </button>

        <button
          onClick={() => onSave(post._id || post.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSaved
              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          <Bookmark size={18} className={isSaved ? "fill-blue-600" : ""} /> Lưu
        </button>
      </div>
    </div>
  );
};

export default PostCard;
