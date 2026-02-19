import React, { useCallback, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import { Music2, Play, Pause, SkipBack, SkipForward, Plus, X, Volume2, Disc3, ChevronUp, ChevronDown } from "lucide-react";
import { useMusic } from "../context/MusicContext";

const pad = (num) => String(num).padStart(2, "0");
const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

const StudyTimerMusicPanel = () => {
  const {
    tracks,
    currentIndex,
    currentTrack,
    isPlaying,
    volume,
    isLoading,
    isSaving,
    currentTime,
    duration,
    notice,
    togglePlay,
    playSong,
    nextTrack,
    prevTrack,
    removeTrack,
    setVolume,
    saveFilesToLibrary,
    seekTo,
    setNotice,
  } = useMusic();

  const fileInputRef = useRef(null);
  const playlistRef = useRef(null);
  const progressTrackRef = useRef(null);
  const isSeekingRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  const [progressHover, setProgressHover] = useState({ visible: false, x: 0, time: 0 });

  const waveBars = Array.from({ length: 18 }, (_, i) => i);
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleFileUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      await saveFilesToLibrary(files);
    },
    [saveFilesToLibrary]
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

  const scrollPlaylist = useCallback((direction) => {
    const list = playlistRef.current;
    if (!list) return;
    const offset = direction === "up" ? -92 : 92;
    list.scrollBy({ top: offset, behavior: "smooth" });
  }, []);

  const seekToFromClientX = useCallback((clientX) => {
    const track = progressTrackRef.current;
    if (!track || !Number.isFinite(duration) || duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, rawX));
    const ratio = rect.width > 0 ? clampedX / rect.width : 0;
    const nextTime = ratio * duration;

    seekTo(nextTime);
    setProgressHover((prev) => ({ ...prev, x: clampedX, time: nextTime }));
  }, [duration, seekTo]);

  const handleProgressClick = useCallback((event) => {
    seekToFromClientX(event.clientX);
  }, [seekToFromClientX]);

  const handleProgressPointerDown = useCallback((event) => {
    if (!duration) return;
    setIsSeekingProgress(true);
    isSeekingRef.current = true;
    seekToFromClientX(event.clientX);
  }, [duration, seekToFromClientX]);

  const handleProgressMouseMove = useCallback((event) => {
    const track = progressTrackRef.current;
    if (!track || !Number.isFinite(duration) || duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, rawX));
    const ratio = rect.width > 0 ? clampedX / rect.width : 0;
    setProgressHover({ visible: true, x: clampedX, time: ratio * duration });
  }, [duration]);

  const handleProgressMouseLeave = useCallback(() => {
    if (isSeekingRef.current) return;
    setProgressHover((prev) => ({ ...prev, visible: false }));
  }, []);

  React.useEffect(() => {
    if (!isSeekingProgress) return;

    const handlePointerMove = (event) => {
      seekToFromClientX(event.clientX);
    };

    const handlePointerUp = () => {
      isSeekingRef.current = false;
      setIsSeekingProgress(false);
      setProgressHover((prev) => ({ ...prev, visible: false }));
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isSeekingProgress, seekToFromClientX]);

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 backdrop-blur-xl p-4 text-slate-800 dark:text-slate-100 overflow-hidden">
      <style>{`
        @keyframes whalio-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

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

            <div className="mb-3 flex items-start gap-3">
              <div className="basis-3/4">
                <div
                  ref={progressTrackRef}
                  onClick={handleProgressClick}
                  onPointerDown={handleProgressPointerDown}
                  onMouseMove={handleProgressMouseMove}
                  onMouseLeave={handleProgressMouseLeave}
                  className="group relative h-5 cursor-pointer"
                >
                  <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div
                    className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow transition-transform duration-150 group-hover:scale-110"
                    style={{
                      left: `${progressPercent}%`,
                      width: "16px",
                      height: "16px",
                    }}
                  />
                  {progressHover.visible && duration > 0 && (
                    <div
                      className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ left: `${progressHover.x}px` }}
                    >
                      {formatTime(Math.floor(progressHover.time))}
                    </div>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
                  <span>{formatTime(Math.floor(currentTime))}</span>
                  <span>{formatTime(Math.floor(duration))}</span>
                </div>
              </div>
              <div className="mt-1 flex basis-1/4 items-center gap-2">
                <Volume2 size={15} className="shrink-0 text-slate-500 dark:text-slate-300" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1.5 w-full rounded-lg accent-blue-500 bg-slate-200 dark:bg-slate-700 cursor-pointer"
                />
              </div>
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
                      onClick={() => playSong(idx)}
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

export default StudyTimerMusicPanel;
