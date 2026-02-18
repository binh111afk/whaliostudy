import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import { Music2, Play, Pause, SkipBack, SkipForward, Plus, X, Volume2, Disc3, ChevronUp, ChevronDown, ListMusic, Timer } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useMusic } from "../context/MusicContext";

const STUDY_OVERLAY_STORAGE_KEY = "whalio_study_overlay_state_v1";
const MOTIVATIONAL_QUOTES = [
  "Cách tốt nhất để bắt đầu là ngừng nói và bắt đầu làm.",
  "Thành công là tổng hợp của những nỗ lực nhỏ bé, được lặp lại ngày qua ngày.",
  "Hãy tập trung vào việc tạo ra hiệu quả, đừng chỉ tập trung vào việc bận rộn.",
  "Mọi thứ dường như là không thể cho đến khi nó được hoàn thành.",
  "Đừng dừng lại khi bạn mệt mỏi, hãy dừng lại khi bạn đã hoàn thành.",
  "Kiến thức là kho báu sẽ theo chủ nhân của nó đi khắp mọi nơi.",
  "Hôm nay làm những việc người khác không làm, ngày mai bạn sẽ có những thứ người khác không có.",
  "Đừng so sánh mình với bất kỳ ai khác, hãy so sánh mình với phiên bản của chính mình ngày hôm qua.",
  "Sự kiên trì là chìa khóa mở mọi cánh cửa dẫn đến thành công.",
  "Giáo dục là vũ khí mạnh nhất mà bạn có thể dùng để thay đổi thế giới.",
];
const REMINDER_MESSAGES = [
  "Ngồi thẳng lưng và thả lỏng vai nhé.",
  "Uống một ngụm nước để giữ tỉnh táo.",
  "Tập trung vào 1 việc duy nhất trong 2 phút tới.",
  "Hít sâu 3 nhịp rồi tiếp tục nào.",
  "Đặt mục tiêu nhỏ: hoàn thành thêm 1 phần nữa.",
  "Đừng đa nhiệm, làm xong việc này rồi mới chuyển việc khác.",
  "Nếu mỏi mắt, nhìn xa 20 giây để nghỉ.",
  "Tiếp tục đều đặn, chậm mà chắc.",
];

const pad = (num) => String(num).padStart(2, "0");
const formatOverlayTime = (seconds, forceHours = false) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (forceHours) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

const FloatingPlayer = () => {
  const location = useLocation();
  const {
    tracks,
    currentIndex,
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    showPlayer,
    togglePlay,
    playSong,
    nextTrack,
    prevTrack,
    setVolume,
    hidePlayer,
    seekTo,
    audioRef,
  } = useMusic();

  const progressTrackRef = useRef(null);
  const isSeekingRef = useRef(false);

  const [isFloatingPlaylistOpen, setIsFloatingPlaylistOpen] = useState(false);
  const [isFloatingCollapsed, setIsFloatingCollapsed] = useState(false);
  const [overlayState, setOverlayState] = useState(null);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  const [progressHover, setProgressHover] = useState({ visible: false, x: 0, time: 0 });
  const [motivationIndex, setMotivationIndex] = useState(0);
  const [reminderIndex, setReminderIndex] = useState(0);

  const currentTrackNameLength = currentTrack?.name?.length || 0;
  const isLongDesktopTrackName = currentTrackNameLength >= 32;
  const isStudyTimerRoute = location.pathname === "/timer";

  // Don't show floating player on StudyTimer page (uses embedded controls)
  const shouldShow = showPlayer && !isStudyTimerRoute && Boolean(currentTrack);

  useEffect(() => {
    const readOverlay = () => {
      try {
        const raw = localStorage.getItem(STUDY_OVERLAY_STORAGE_KEY);
        setOverlayState(raw ? JSON.parse(raw) : null);
      } catch {
        setOverlayState(null);
      }
    };

    readOverlay();
    const id = setInterval(readOverlay, 1000);
    return () => clearInterval(id);
  }, []);

  const overlayIsRunning = Boolean(overlayState?.isRunning);
  const overlayTimeLeft = overlayIsRunning && Number(overlayState?.endAtTs) > 0
    ? Math.max(0, Math.ceil((Number(overlayState?.endAtTs) - Date.now()) / 1000))
    : Math.max(0, Number(overlayState?.timeLeft) || 0);
  const overlayTimeLabel = formatOverlayTime(overlayTimeLeft, Boolean(overlayState?.useHourFormat));
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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
    handleProgressClick(event);
  }, [duration, handleProgressClick]);

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

  useEffect(() => {
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

  useEffect(() => {
    if (!shouldShow) {
      setIsFloatingCollapsed(false);
    }
  }, [shouldShow]);

  useEffect(() => {
    if (MOTIVATIONAL_QUOTES.length <= 1) return undefined;

    const id = setInterval(() => {
      setMotivationIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (REMINDER_MESSAGES.length <= 1) return undefined;

    const id = setInterval(() => {
      setReminderIndex((prev) => (prev + 1) % REMINDER_MESSAGES.length);
    }, 2 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@1&display=swap');
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="fixed bottom-[5.35rem] left-1/2 z-40 w-[93vw] -translate-x-1/2 rounded-3xl border border-slate-200/85 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl sm:w-[89vw] sm:p-4 md:w-[84vw] lg:bottom-6 lg:w-[65vw] lg:max-w-[1120px] dark:border-white/15 dark:bg-slate-900/85">
        <button
          type="button"
          onClick={hidePlayer}
          className="absolute -top-2 -left-2 z-10 flex items-center justify-center rounded-full bg-slate-500 p-1.5 text-white shadow-lg transition-colors hover:bg-rose-500 dark:bg-slate-600 dark:hover:bg-rose-500"
          aria-label="Đóng player"
          title="Đóng player (phát nhạc để mở lại)"
        >
          <X size={14} />
        </button>

        {/* Mobile View */}
        <div className="sm:hidden">
          <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
            StudyTime Live
          </p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-base font-bold leading-tight text-slate-800 dark:text-slate-100 break-words">
              {currentTrack ? currentTrack.name : "Chưa phát nhạc"}
            </p>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1.5 text-sm font-semibold text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                <Timer size={14} />
                <span>{overlayTimeLabel}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFloatingCollapsed((prev) => !prev);
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label={isFloatingCollapsed ? "Hiện player" : "Ẩn player"}
              >
                {isFloatingCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFloatingPlaylistOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <ListMusic size={15} />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden items-center justify-between gap-6 sm:flex">
          <div className={`min-w-0 flex flex-1 items-center ${isLongDesktopTrackName ? "gap-[55px]" : "gap-[6px]"}`}>
            <div className="min-w-0 sm:max-w-[48%]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                StudyTime Live
              </p>
              <p className="mt-1 truncate text-base font-bold leading-tight text-slate-800 dark:text-slate-100 sm:text-lg">
                {currentTrack ? currentTrack.name : "Chưa phát nhạc"}
              </p>
            </div>
            <p
              className={`hidden min-w-0 flex-1 text-lg leading-snug italic tracking-wide whitespace-normal break-words text-slate-900/90 drop-shadow-sm dark:text-white/90 sm:block ${isLongDesktopTrackName ? "text-left" : "text-center"}`}
              style={{
                animation: "breathe 5s ease-in-out infinite",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              "{MOTIVATIONAL_QUOTES[motivationIndex]}"
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1.5 text-sm font-semibold text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              <Timer size={14} />
              <span>{overlayTimeLabel}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFloatingCollapsed((prev) => !prev);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label={isFloatingCollapsed ? "Hiện player" : "Ẩn player"}
            >
              {isFloatingCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFloatingPlaylistOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ListMusic size={15} />
              List
            </button>
          </div>
        </div>

        {/* Expanded Controls */}
        <div className={isFloatingCollapsed ? "hidden" : ""}>
          <p className="mt-2 mb-2.5 rounded-xl bg-slate-100/80 px-3 py-1.5 text-sm text-slate-600 truncate dark:bg-white/10 dark:text-slate-300 sm:hidden">
            {REMINDER_MESSAGES[reminderIndex]}
          </p>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <div className="flex flex-nowrap items-center gap-2">
              <button
                onClick={prevTrack}
                className="shrink-0 rounded-xl border border-slate-200 bg-white/70 p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Bài trước"
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="shrink-0 rounded-xl bg-blue-500 px-3 py-2.5 text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-blue-600"
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={nextTrack}
                className="shrink-0 rounded-xl border border-slate-200 bg-white/70 p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Bài tiếp"
              >
                <SkipForward size={18} />
              </button>

              <span className="ml-1 hidden w-10 shrink-0 text-left text-[11px] tabular-nums text-slate-500 dark:text-slate-300 sm:block">
                {formatOverlayTime(Math.floor(currentTime))}
              </span>
              <div
                ref={progressTrackRef}
                onClick={handleProgressClick}
                onPointerDown={handleProgressPointerDown}
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={handleProgressMouseLeave}
                className="group relative ml-1 h-5 w-40 shrink-0 cursor-pointer sm:ml-0 sm:min-w-0 sm:flex-1"
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
                    {formatOverlayTime(Math.floor(progressHover.time))}
                  </div>
                )}
              </div>
              <span className="hidden w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-300 sm:block">
                {formatOverlayTime(Math.floor(duration))}
              </span>
              <div className="ml-1 hidden w-24 shrink-0 items-center gap-1.5 sm:flex sm:w-32 sm:gap-2">
                <Volume2 size={16} className="shrink-0 text-slate-500 dark:text-slate-300" />
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
            </div>
          </div>

          {/* Playlist Popup */}
          {isFloatingPlaylistOpen && (
            <div className="mt-2.5 max-h-40 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50">
              {tracks.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Playlist trống.</p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-white/5">
                  {tracks.map((track, idx) => {
                    const active = idx === currentIndex;
                    return (
                      <li key={track.id} className={`${active ? "bg-blue-50 dark:bg-cyan-500/15" : ""}`}>
                        <button
                          onClick={() => playSong(idx)}
                          className="w-full px-4 py-2.5 text-left text-base text-slate-700 dark:text-slate-200 truncate"
                        >
                          {track.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <p className="mt-2.5 hidden text-center text-sm italic text-slate-400 dark:text-slate-500 sm:block">
            <span className="font-bold">Nhắc nhở:</span> {REMINDER_MESSAGES[reminderIndex]}
          </p>
        </div>
      </div>
    </>
  );
};

export default FloatingPlayer;
