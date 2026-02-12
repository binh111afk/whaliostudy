import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { communityService } from "../services/communityService";
import PostCard from "../components/PostCard";
import AuthModal from "../components/AuthModal";
import { CreatePostModal, CommentModal } from "../components/CommunityModals";
import ImageModal from "../components/ImageModal";
import { Plus, Users, Bookmark, Shield, TrendingUp, Menu } from "lucide-react";

const Community = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [postToEdit, setPostToEdit] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // State bật/tắt sidebar trên mobile (nếu cần sau này)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Load Posts
  const loadPosts = async () => {
    try {
      const data = await communityService.getPosts();
      if (data.success) setPosts(data.posts);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Handlers
  const handleCreateOrEdit = async (formData, isEdit) => {
    if (user) {
      formData.append("username", user.username);
      const res = isEdit
        ? await communityService.editPost(Object.fromEntries(formData))
        : await communityService.createPost(formData);

      if (res.success) loadPosts();
    }
  };

  const handleLike = async (postId) => {
    if (!user) {
      return toast("Nhắc nhẹ một chút...", {
        // Dùng toast() thường, không dùng .error
        description: "Đăng nhập để like bài viết nhé bạn!",
        duration: 6000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        // Chỉnh class để nó "thoáng" và "pro" hơn
        classNames: {
          toast:
            "group ![align-items:center] !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !p-4 !rounded-2xl !shadow-xl",
          title: "!text-gray-800 dark:!text-white !font-bold !text-base",
          description: "!text-gray-500 dark:!text-gray-400 !text-sm",
          actionButton:
            "!bg-blue-600 !text-white !rounded-xl !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all",
        },
      });
    }
    await communityService.likePost(postId, user.username);
    loadPosts();
  };

  const handleSave = async (postId) => {
    if (!user) {
      return toast("Nhắc nhẹ một chút...", {
        // Dùng toast() thường, không dùng .error
        description: "Đăng nhập để lưu bài viết nhé bạn!",
        duration: 6000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        // Chỉnh class để nó "thoáng" và "pro" hơn
        classNames: {
          toast:
            "group ![align-items:center] !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !p-4 !rounded-2xl !shadow-xl",
          title: "!text-gray-800 dark:!text-white !font-bold !text-base",
          description: "!text-gray-500 dark:!text-gray-400 !text-sm",
          actionButton:
            "!bg-blue-600 !text-white !rounded-xl !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all",
        },
      });
    }
    await communityService.savePost(postId, user.username);
    loadPosts();
  };

  const handleDelete = async (postId) => {
    if (!confirm("Xóa bài viết này?")) return;
    await communityService.deletePost(postId, user.username);
    loadPosts();
  };

  const handleSubmitComment = async (postId, content) => {
    if (!user) {
      return toast("Nhắc nhẹ một chút...", {
        // Dùng toast() thường, không dùng .error
        description: "Đăng nhập để bình luận nhé bạn!",
        duration: 6000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        // Chỉnh class để nó "thoáng" và "pro" hơn
        classNames: {
          toast:
            "group ![align-items:center] !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !p-4 !rounded-2xl !shadow-xl",
          title: "!text-gray-800 dark:!text-white !font-bold !text-base",
          description: "!text-gray-500 dark:!text-gray-400 !text-sm",
          actionButton:
            "!bg-blue-600 !text-white !rounded-xl !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all",
        },
      });
    }
    const formData = new FormData();
    formData.append("postId", postId);
    formData.append("content", content);
    formData.append("username", user.username);

    await communityService.addComment(formData);
    await loadPosts();

    setPosts((prevPosts) => {
      const updatedPost = prevPosts.find((p) => (p._id || p.id) === postId);
      if (updatedPost) setSelectedPostForComment(updatedPost);
      return prevPosts;
    });
  };

  const handleReplyComment = async (postId, parentCommentId, content) => {
    if (!user) {
      return toast("Nhắc nhẹ một chút...", {
        // Dùng toast() thường, không dùng .error
        description: "Đăng nhập để đăng bài nhé!",
        duration: 6000,
        action: {
          label: "Đăng nhập ngay",
          onClick: () => setIsAuthModalOpen(true),
        },
        // Chỉnh class để nó "thoáng" và "pro" hơn
        classNames: {
          toast:
            "group ![align-items:center] !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !p-4 !rounded-2xl !shadow-xl",
          title: "!text-gray-800 dark:!text-white !font-bold !text-base",
          description: "!text-gray-500 dark:!text-gray-400 !text-sm",
          actionButton:
            "!bg-blue-600 !text-white !rounded-xl !px-4 !py-2 !font-semibold hover:!bg-blue-700 transition-all",
        },
      });
    }
    const formData = new FormData();
    formData.append("postId", postId);
    formData.append("parentCommentId", parentCommentId);
    formData.append("content", content);
    formData.append("username", user.username);

    await communityService.replyComment(formData);
    await loadPosts();

    setPosts((prevPosts) => {
      const updatedPost = prevPosts.find((p) => (p._id || p.id) === postId);
      if (updatedPost) setSelectedPostForComment(updatedPost);
      return prevPosts;
    });
  };

  const handleDeleteComment = async (postId, commentId) => {
    await communityService.deleteComment(postId, commentId, user.username);
    await loadPosts();
    setPosts((prevPosts) => {
      const updatedPost = prevPosts.find((p) => (p._id || p.id) === postId);
      if (updatedPost) setSelectedPostForComment(updatedPost);
      return prevPosts;
    });
  };

  // Filter Posts
  const displayedPosts =
    activeTab === "feed"
      ? posts.filter((p) => !p.deleted)
      : posts.filter((p) => p.savedBy?.includes(user?.username) && !p.deleted);

  return (
    // 👇 SỬA LAYOUT: max-w-7xl và px-4 để có lề an toàn
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
      {/* 👇 CHIA GRID AN TOÀN: Sidebar chỉ hiện khi màn hình > 1280px (xl) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* === CỘT CHÍNH (FEED) === */}
        {/* Chiếm full màn hình nhỏ, chiếm 3/4 khi màn hình lớn */}
        <div className="xl:col-span-3 w-full max-w-3xl mx-auto xl:max-w-none space-y-6">
          {/* Header Tabs */}
          <div className="flex items-center justify-between top-[5px] bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur z-20 py-2 rounded-xl">
            <div className="flex bg-white dark:bg-gray-700 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setActiveTab("feed")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "feed"
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Users size={18} />{" "}
                <span className="hidden sm:inline cursor-pointer">
                  Cộng đồng
                </span>
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "saved"
                    ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Bookmark size={18} />{" "}
                <span className="hidden sm:inline cursor-pointer">Đã lưu</span>
              </button>
            </div>

            <button
              onClick={() => {
                setPostToEdit(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={20} /> <span>Đăng bài</span>
            </button>
          </div>

          {/* Posts List */}
          <div className="flex flex-col gap-4">
            {displayedPosts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                  <Users size={32} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Chưa có bài viết nào ở đây...
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Hãy là người đầu tiên đăng bài!
                </button>
              </div>
            ) : (
              displayedPosts.map((post) => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                  currentUser={user}
                  onLike={handleLike}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onEdit={(p) => {
                    setPostToEdit(p);
                    setCreateModalOpen(true);
                  }}
                  onComment={(p) => setSelectedPostForComment(p)}
                  onViewImage={(src) => setPreviewImage(src)}
                />
              ))
            )}
          </div>
        </div>

        {/* === CỘT PHỤ (SIDEBAR) === */}
        {/* Ẩn hoàn toàn trên Mobile/Laptop nhỏ, chỉ hiện trên Desktop lớn (xl:block) */}
        <div className="hidden xl:block xl:col-span-1 space-y-6 sticky top-24">
          {/* Widget 1: Intro */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                <Users size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg truncate">
                  Cộng đồng Whalio
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Nơi chia sẻ kiến thức
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-gray-100 dark:border-gray-700">
              <div>
                <div className="font-black text-gray-800 dark:text-white text-lg">
                  {posts.length}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                  Bài viết
                </div>
              </div>
              <div>
                <div className="font-black text-gray-800 dark:text-white text-lg">
                  {posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                  Thảo luận
                </div>
              </div>
              <div>
                <div className="font-black text-gray-800 dark:text-white text-lg">
                  {posts.filter((p) => p.author === user?.username).length}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">
                  Của bạn
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: Rules */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Shield size={18} className="text-green-600" /> Quy tắc
            </h4>
            <ul className="space-y-3">
              <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 font-bold">1.</span>
                Tôn trọng, không spam.
              </li>
              <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 font-bold">2.</span>
                Chia sẻ kiến thức bổ ích.
              </li>
            </ul>
          </div>

          {/* Widget 3: Trending */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 rounded-2xl shadow-lg text-white">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={18} /> Nổi bật
            </h4>
            <div className="flex flex-wrap gap-2">
              {["#GiaiTich1", "#C++", "#LichSuDang", "#TiengAnh", "#IT"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs cursor-pointer transition-colors backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          <p className="text-xs text-center text-gray-400">
            © 2026 Whalio Study
          </p>
        </div>
      </div>

      {/* MODALS */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateOrEdit}
        postToEdit={postToEdit}
      />

      <CommentModal
        isOpen={!!selectedPostForComment}
        onClose={() => setSelectedPostForComment(null)}
        post={
          posts.find((p) => p._id === selectedPostForComment?._id) ||
          selectedPostForComment
        }
        currentUser={user}
        onSubmitComment={handleSubmitComment}
        onDeleteComment={handleDeleteComment}
        onReplyComment={handleReplyComment}
      />

      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(userData) => {
          localStorage.setItem("user", JSON.stringify(userData));
          setIsAuthModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Community;
