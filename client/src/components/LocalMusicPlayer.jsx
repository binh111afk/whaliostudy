import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import localforage from "localforage";
import Marquee from "react-fast-marquee";
import { Music2, Play, Pause, SkipBack, SkipForward, Plus, X, Volume2, Disc3, ChevronUp, ChevronDown } from "lucide-react";

const musicDB = localforage.createInstance({
  name: "whalio_local_db",
  storeName: "music_library",
});

const PLAYLIST_META_KEY = "__playlist_meta_v1__";
const ALLOWED_EXT = [".mp3", ".mp4"];
const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/mp4", "video/mp4"];

const isValidAudioFile = (file) => {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  const hasAllowedExt = ALLOWED_EXT.some((ext) => name.endsWith(ext));
  const hasAllowedMime = ALLOWED_MIME.includes(type);
  return hasAllowedExt || hasAllowedMime;
};

const LocalMusicPlayer = () => {
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const playlistRef = useRef(null);
  const autoCycleStartIndexRef = useRef(null);
  const autoRemainingIndexesRef = useRef([]);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetAutoCycle = useCallback(() => {
    autoCycleStartIndexRef.current = null;
    autoRemainingIndexesRef.current = [];
  }, []);

  const savePlaylistOrder = useCallback(async (nextTracks) => {
    try {
      await musicDB.setItem(PLAYLIST_META_KEY, {
        orderIds: nextTracks.map((track) => track.id),
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error("Save playlist order error:", err);
    }
  }, []);

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = [];
      await musicDB.iterate((value, key) => {
        if (key === PLAYLIST_META_KEY) return;
        if (!value?.blob) return;
        loaded.push({
          id: key,
          name: value.name || "Unknown Track",
          type: value.type || "audio/mpeg",
          size: value.size || 0,
          createdAt: value.createdAt || Date.now(),
          blob: value.blob,
        });
      });

      const sortedByCreated = [...loaded].sort((a, b) => a.createdAt - b.createdAt);
      const meta = await musicDB.getItem(PLAYLIST_META_KEY);
      const orderIds = Array.isArray(meta?.orderIds) ? meta.orderIds : [];

      if (orderIds.length > 0) {
        const mapById = new Map(sortedByCreated.map((track) => [track.id, track]));
        const ordered = [];
        const used = new Set();

        orderIds.forEach((id) => {
          const found = mapById.get(id);
          if (found) {
            ordered.push(found);
            used.add(found.id);
          }
        });

        sortedByCreated.forEach((track) => {
          if (!used.has(track.id)) ordered.push(track);
        });

        setTracks(ordered);
        setCurrentIndex(ordered.length > 0 ? 0 : -1);
      } else {
        setTracks(sortedByCreated);
        setCurrentIndex(sortedByCreated.length > 0 ? 0 : -1);
      }
    } catch (err) {
      console.error("Load local tracks error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack?.blob) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      revokeCurrentObjectUrl();
      return;
    }

    revokeCurrentObjectUrl();

    const nextUrl = URL.createObjectURL(currentTrack.blob);
    objectUrlRef.current = nextUrl;
    audio.src = nextUrl;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying, revokeCurrentObjectUrl]);

  useEffect(() => {
    return () => {
      revokeCurrentObjectUrl();
    };
  }, [revokeCurrentObjectUrl]);

  const saveFilesToLibrary = useCallback(
    async (fileList) => {
      if (!Array.isArray(fileList) || fileList.length === 0) return;
      const validFiles = fileList.filter(isValidAudioFile);
      if (validFiles.length === 0) {
        setNotice("Chỉ hỗ trợ file MP3/MP4 hợp lệ.");
        return;
      }

      setIsSaving(true);
      try {
        const now = Date.now();
        const entries = validFiles.map((file, index) => ({
          id: `track_${now}_${index}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || "audio/mpeg",
          size: file.size,
          blob: file,
          createdAt: now + index,
        }));

        await Promise.all(
          entries.map((entry) =>
            musicDB.setItem(entry.id, {
              name: entry.name,
              type: entry.type,
              size: entry.size,
              blob: entry.blob,
              createdAt: entry.createdAt,
            })
          )
        );

        resetAutoCycle();
        setTracks((prev) => {
          const next = [...prev, ...entries].sort((a, b) => a.createdAt - b.createdAt);
          if (currentIndex === -1 && next.length > 0) {
            setCurrentIndex(0);
          }
          savePlaylistOrder(next);
          return next;
        });
        setNotice(`Đã lưu ${entries.length} bài vào bộ nhớ cục bộ.`);
      } catch (err) {
        console.error("Save local tracks error:", err);
        setNotice("Không thể lưu nhạc vào IndexedDB.");
      } finally {
        setIsSaving(false);
      }
    },
    [currentIndex, resetAutoCycle, savePlaylistOrder]
  );

  const handleFileUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      await saveFilesToLibrary(files);
    },
    [saveFilesToLibrary]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentTrack, isPlaying]);

  const autoNextTrack = useCallback(() => {
    if (tracks.length === 0) return;

    if (tracks.length === 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }

    const safeCurrentIndex = currentIndex >= 0 && currentIndex < tracks.length ? currentIndex : 0;
    let cycleStart = autoCycleStartIndexRef.current;
    let remaining = Array.isArray(autoRemainingIndexesRef.current)
      ? autoRemainingIndexesRef.current.filter((idx) => idx >= 0 && idx < tracks.length && idx !== safeCurrentIndex)
      : [];

    const isInvalidCycleStart = cycleStart === null || cycleStart < 0 || cycleStart >= tracks.length;
    if (isInvalidCycleStart) {
      cycleStart = safeCurrentIndex;
      remaining = Array.from({ length: tracks.length }, (_, idx) => idx).filter((idx) => idx !== cycleStart);
    }

    if (remaining.length === 0) {
      setCurrentIndex(cycleStart);
      setIsPlaying(true);
      resetAutoCycle();
      return;
    }

    const randomIdx = remaining[Math.floor(Math.random() * remaining.length)];
    autoRemainingIndexesRef.current = remaining.filter((idx) => idx !== randomIdx);
    autoCycleStartIndexRef.current = cycleStart;
    setCurrentIndex(randomIdx);
    setIsPlaying(true);
  }, [currentIndex, resetAutoCycle, tracks.length]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    resetAutoCycle();
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }, [resetAutoCycle, tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    resetAutoCycle();
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [resetAutoCycle, tracks.length]);

  const removeTrack = useCallback(
    async (id) => {
      try {
        await musicDB.removeItem(id);
        resetAutoCycle();
        setTracks((prev) => {
          const removedIndex = prev.findIndex((t) => t.id === id);
          const next = prev.filter((t) => t.id !== id);

          if (next.length === 0) {
            setCurrentIndex(-1);
            setIsPlaying(false);
            savePlaylistOrder([]);
            return next;
          }

          if (removedIndex === currentIndex) {
            const fallback = Math.min(removedIndex, next.length - 1);
            setCurrentIndex(fallback);
          } else if (removedIndex < currentIndex) {
            setCurrentIndex((idx) => Math.max(0, idx - 1));
          }

          savePlaylistOrder(next);
          return next;
        });
      } catch (err) {
        console.error("Delete track error:", err);
      }
    },
    [currentIndex, resetAutoCycle, savePlaylistOrder]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragging(false);
      const files = Array.from(event.dataTransfer?.files || []);
      await saveFilesToLibrary(files);
    },
    [saveFilesToLibrary]
  );

  useEffect(() => {
    resetAutoCycle();
  }, [tracks.length, resetAutoCycle]);

  const waveBars = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  const scrollPlaylist = useCallback((direction) => {
    const list = playlistRef.current;
    if (!list) return;
    const offset = direction === "up" ? -92 : 92;
    list.scrollBy({ top: offset, behavior: "smooth" });
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 backdrop-blur-xl p-4 text-slate-800 dark:text-slate-100 overflow-hidden">
      <style>{`
        @keyframes whalio-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      <audio
        ref={audioRef}
        onEnded={autoNextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-blue-600 dark:text-cyan-300">
          <Disc3 size={16} />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Local Music</span>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 dark:border-cyan-300/30 bg-blue-50 dark:bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-cyan-200 hover:bg-blue-100 dark:hover:bg-cyan-400/25 transition-colors"
        >
          <Plus size={14} />
          {isSaving ? "Đang lưu..." : "Thêm nhạc"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.mp4,audio/mpeg,video/mp4,audio/mp4"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border p-3 transition-colors ${
          isDragging
            ? "border-blue-300 dark:border-cyan-300/60 bg-blue-50/80 dark:bg-cyan-500/10"
            : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/50"
        }`}
      >
        {isDragging && (
          <p className="mb-2 text-center text-xs font-semibold text-blue-700 dark:text-cyan-200">
            Thả file MP3/MP4 vào đây để lưu offline
          </p>
        )}
        {currentTrack ? (
          <>
            <div className="h-6 mb-2">
              <Marquee gradient={false} speed={35} pauseOnHover>
                <span className="text-sm font-semibold text-blue-700 dark:text-cyan-200 mr-6">{currentTrack.name}</span>
              </Marquee>
            </div>

            <div className="mb-3 flex items-end gap-1 h-8">
              {waveBars.map((bar) => (
                <span
                  key={bar}
                  className={`w-1 rounded-full bg-gradient-to-t from-blue-500 to-cyan-300 ${
                    isPlaying ? "opacity-100" : "opacity-40"
                  }`}
                  style={{
                    height: `${20 + (bar % 6) * 3}px`,
                    animation: isPlaying ? `whalio-wave ${0.6 + (bar % 5) * 0.12}s ease-in-out ${bar * 0.05}s infinite` : "none",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                onClick={prevTrack}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={togglePlay}
                className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-300/50 dark:shadow-[0_0_24px_rgba(59,130,246,0.45)] hover:brightness-105 transition-all"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <SkipForward size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 size={15} className="text-slate-500 dark:text-slate-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-blue-500 bg-slate-200 dark:bg-slate-700 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Music2 className="mx-auto mb-2 text-slate-400 dark:text-slate-400" size={28} />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Chưa có bài nhạc nào</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Thêm file MP3/MP4 để phát offline.</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Nhạc được lưu cục bộ tại trình duyệt này. Khi bạn xóa cache của trình duyệt thì tương đương với việc mất toàn bộ danh sách nhạc và Whalio hoàn toàn không chịu trách nhiệm về vấn đề này.
      </p>
      {notice && <p className="mt-1 text-[11px] text-blue-600 dark:text-cyan-300/90">{notice}</p>}

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-white/10 bg-white/85 dark:bg-slate-900/75 px-3 py-2 backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
            Playlist ({tracks.length})
          </p>
          {tracks.length > 3 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollPlaylist("up")}
                className="rounded-md border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/10 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                aria-label="Cuộn lên"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => scrollPlaylist("down")}
                className="rounded-md border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-white/10 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                aria-label="Cuộn xuống"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}
        </div>
        <div ref={playlistRef} className="whalio-scrollbar max-h-36 overflow-y-auto">
          {isLoading ? (
            <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Đang tải thư viện...</p>
          ) : tracks.length === 0 ? (
            <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Playlist trống.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/5">
              {tracks.map((track, idx) => {
                const active = idx === currentIndex;
                return (
                  <li
                    key={track.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                      active
                        ? "bg-blue-50 dark:bg-cyan-500/15 text-blue-700 dark:text-cyan-100"
                        : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => {
                        resetAutoCycle();
                        setCurrentIndex(idx);
                        setIsPlaying(true);
                      }}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-sm truncate">{track.name}</p>
                    </button>

                    <button
                      onClick={() => removeTrack(track.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 dark:hover:text-rose-300 hover:bg-rose-500/10"
                      aria-label={`Xóa ${track.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalMusicPlayer;

