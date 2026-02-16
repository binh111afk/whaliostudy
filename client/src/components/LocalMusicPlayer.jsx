import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import localforage from "localforage";
import Marquee from "react-fast-marquee";
import { Music2, Play, Pause, SkipBack, SkipForward, Plus, X, Volume2, Disc3, ChevronUp, ChevronDown, ListMusic, Timer } from "lucide-react";
import { useLocation } from "react-router-dom";

const musicDB = localforage.createInstance({
  name: "whalio_local_db",
  storeName: "music_library",
});

const PLAYLIST_META_KEY = "__playlist_meta_v1__";
const STUDY_OVERLAY_STORAGE_KEY = "whalio_study_overlay_state_v1";
const MUSIC_PLAYBACK_STORAGE_KEY = "whalio_music_playback_v1";
const MUSIC_SYNC_EVENT = "whalio:music-playback-sync";
const ALLOWED_EXT = [".mp3", ".mp4"];
const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/mp4", "video/mp4"];
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

const pad = (num) => String(num).padStart(2, "0");
const formatOverlayTime = (seconds, forceHours = false) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (forceHours) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

const isValidAudioFile = (file) => {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  const hasAllowedExt = ALLOWED_EXT.some((ext) => name.endsWith(ext));
  const hasAllowedMime = ALLOWED_MIME.includes(type);
  return hasAllowedExt || hasAllowedMime;
};

const stripAudioExtension = (name) => {
  const raw = String(name || "Unknown Track").trim();
  const stripped = raw.replace(/\.(mp3|mp4)$/i, "").trim();
  return stripped || raw;
};

const buildShuffledIndexes = (length, excludeIndex) => {
  const pool = Array.from({ length }, (_, idx) => idx).filter((idx) => idx !== excludeIndex);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

const LocalMusicPlayer = ({ globalMode = false }) => {
  const location = useLocation();
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const playlistRef = useRef(null);
  const autoCycleStartIndexRef = useRef(null);
  const autoRemainingIndexesRef = useRef([]);
  const shouldForcePlayRef = useRef(false);
  const isAutoAdvancingRef = useRef(false);
  const progressTrackRef = useRef(null);
  const isSeekingRef = useRef(false);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isFloatingPlaylistOpen, setIsFloatingPlaylistOpen] = useState(false);
  const [isFloatingCollapsed, setIsFloatingCollapsed] = useState(false);
  const [isFloatingDismissed, setIsFloatingDismissed] = useState(false);
  const [overlayState, setOverlayState] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  const [progressHover, setProgressHover] = useState({ visible: false, x: 0, time: 0 });
  const [motivationIndex, setMotivationIndex] = useState(0);
  const currentTrackIdRef = useRef(null);
  const lastLoadedTrackIdRef = useRef(null);
  const hasRestoredPlaybackRef = useRef(false);
  const lastPlaybackUpdatedAtRef = useRef(0);
  const pendingSeekRef = useRef(null);
  const tracksRef = useRef([]);
  const currentIndexRef = useRef(-1);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const isStudyTimerRoute = location.pathname === "/timer";
  const showFullPlayer = !globalMode && isStudyTimerRoute;
  const isAudioActive = !globalMode || !isStudyTimerRoute;

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

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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
          name: stripAudioExtension(value.name || "Unknown Track"),
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

  const applyPlaybackSnapshot = useCallback((saved) => {
    if (!saved || typeof saved !== "object") return;
    if (globalMode && isStudyTimerRoute) return;

    const updatedAt = Number(saved.updatedAt || 0);
    if (updatedAt <= lastPlaybackUpdatedAtRef.current && hasRestoredPlaybackRef.current) return;

    if (typeof saved.volume === "number") {
      setVolume(Math.min(1, Math.max(0, saved.volume)));
    }
    if (typeof saved.currentTime === "number" && Number.isFinite(saved.currentTime)) {
      const nextTime = Math.max(0, saved.currentTime);
      pendingSeekRef.current = nextTime;
      const audio = audioRef.current;
      if (audio && audio.src) {
        const applySeek = () => {
          try {
            audio.currentTime = nextTime;
          } catch {
            return;
          }
          pendingSeekRef.current = null;
        };
        if (audio.readyState >= 1) {
          applySeek();
        } else {
          audio.addEventListener("loadedmetadata", applySeek, { once: true });
        }
      }
    }

    if (Array.isArray(tracks) && tracks.length > 0) {
      const idx = tracks.findIndex((track) => track.id === saved.currentTrackId);
      if (idx >= 0) {
        setCurrentIndex(idx);
        if (saved.isPlaying) shouldForcePlayRef.current = true;
        setIsPlaying(Boolean(saved.isPlaying));
      } else if (currentIndex === -1) {
        setCurrentIndex(0);
        setIsPlaying(Boolean(saved.isPlaying));
      }
    }

    lastPlaybackUpdatedAtRef.current = updatedAt;
    hasRestoredPlaybackRef.current = true;
  }, [currentIndex, globalMode, isStudyTimerRoute, tracks]);

  const syncPlaybackFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(MUSIC_PLAYBACK_STORAGE_KEY);
      if (!raw) return;
      applyPlaybackSnapshot(JSON.parse(raw));
    } catch (err) {
      console.error("Sync playback state error:", err);
    }
  }, [applyPlaybackSnapshot]);

  useEffect(() => {
    if (!tracks.length || (globalMode && isStudyTimerRoute)) return;
    syncPlaybackFromStorage();
  }, [globalMode, isStudyTimerRoute, tracks, syncPlaybackFromStorage]);

  useEffect(() => {
    if (!globalMode || isStudyTimerRoute) return;
    syncPlaybackFromStorage();
  }, [globalMode, isStudyTimerRoute, syncPlaybackFromStorage]);

  useEffect(() => {
    if (!globalMode || isStudyTimerRoute) return;
    const id = setInterval(syncPlaybackFromStorage, 1000);
    return () => clearInterval(id);
  }, [globalMode, isStudyTimerRoute, syncPlaybackFromStorage]);

  useEffect(() => {
    const onSync = (event) => {
      applyPlaybackSnapshot(event?.detail);
    };
    window.addEventListener(MUSIC_SYNC_EVENT, onSync);
    return () => window.removeEventListener(MUSIC_SYNC_EVENT, onSync);
  }, [applyPlaybackSnapshot]);

  useEffect(() => {
    if (globalMode && !isAudioActive) return;

    const persistPlaybackState = () => {
      if (currentIndex < 0 || !tracks[currentIndex]) return;
      const payload = {
        currentTrackId: tracks[currentIndex].id,
        isPlaying,
        volume,
        currentTime: Math.max(0, Number(audioRef.current?.currentTime) || 0),
        updatedAt: Date.now(),
      };
      lastPlaybackUpdatedAtRef.current = payload.updatedAt;
      localStorage.setItem(MUSIC_PLAYBACK_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(MUSIC_SYNC_EVENT, { detail: payload }));
    };

    persistPlaybackState();

    if (isPlaying && isAudioActive) {
      const id = setInterval(persistPlaybackState, 1000);
      return () => {
        clearInterval(id);
        persistPlaybackState();
      };
    }

    return () => {
      persistPlaybackState();
    };
  }, [currentIndex, isAudioActive, isPlaying, tracks, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isAudioActive) {
      audio.pause();
      return;
    }

    if (!currentTrack?.blob) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      revokeCurrentObjectUrl();
      lastLoadedTrackIdRef.current = null;
      return;
    }

    const trackId = currentTrack.id;
    const alreadyLoaded = lastLoadedTrackIdRef.current === trackId && audio.src;
    
    if (alreadyLoaded) {
      if (isPlaying || shouldForcePlayRef.current) {
        shouldForcePlayRef.current = false;
        if (audio.paused) {
          audio
            .play()
            .then(() => {
              isAutoAdvancingRef.current = false;
              setIsPlaying(true);
            })
            .catch(() => {
              isAutoAdvancingRef.current = false;
              setIsPlaying(false);
            });
        }
      }
      return;
    }

    revokeCurrentObjectUrl();

    const nextUrl = URL.createObjectURL(currentTrack.blob);
    objectUrlRef.current = nextUrl;
    audio.src = nextUrl;
    audio.load();
    lastLoadedTrackIdRef.current = trackId;

    const pendingSeek = pendingSeekRef.current;
    if (pendingSeek !== null && Number.isFinite(pendingSeek)) {
      const applySeek = () => {
        try {
          audio.currentTime = Math.max(0, pendingSeek);
        } catch {
          return;
        }
        pendingSeekRef.current = null;
      };
      if (audio.readyState >= 1) {
        applySeek();
      } else {
        audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    }

    if (isPlaying || shouldForcePlayRef.current) {
      shouldForcePlayRef.current = false;
      audio
        .play()
        .then(() => {
          isAutoAdvancingRef.current = false;
          setIsPlaying(true);
        })
        .catch(() => {
          isAutoAdvancingRef.current = false;
          setIsPlaying(false);
        });
    }
  }, [currentTrack, isAudioActive, isPlaying, revokeCurrentObjectUrl]);

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
          name: stripAudioExtension(file.name),
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

  const dismissFloatingPlayer = useCallback(() => {
    setIsFloatingDismissed(true);
  }, []);

  const showFloatingPlayer = useCallback(() => {
    setIsFloatingDismissed(false);
  }, []);

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
      isAutoAdvancingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    showFloatingPlayer();
    shouldForcePlayRef.current = false;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentTrack, isPlaying, showFloatingPlayer]);

  const autoNextTrack = useCallback(() => {
    console.log('🎵 autoNextTrack triggered');
    const latestTracks = tracksRef.current;
    const length = latestTracks.length;
    if (length === 0) {
      console.log('❌ No tracks available');
      return;
    }
    isAutoAdvancingRef.current = true;

    if (length === 1) {
      console.log('🔁 Only 1 track, replaying');
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            isAutoAdvancingRef.current = false;
            setIsPlaying(true);
          })
          .catch(() => {
            isAutoAdvancingRef.current = false;
            setIsPlaying(false);
          });
      }
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }

    const latestIndex = currentIndexRef.current;
    const safeCurrentIndex = latestIndex >= 0 && latestIndex < length ? latestIndex : 0;
    let cycleStart = autoCycleStartIndexRef.current;
    let remaining = Array.isArray(autoRemainingIndexesRef.current)
      ? autoRemainingIndexesRef.current.filter((idx) => idx >= 0 && idx < length)
      : [];

    const isInvalidCycleStart = cycleStart === null || cycleStart < 0 || cycleStart >= length;
    if (isInvalidCycleStart) {
      console.log('🆕 Starting new cycle from index', safeCurrentIndex);
      cycleStart = safeCurrentIndex;
      remaining = buildShuffledIndexes(length, cycleStart);
      autoCycleStartIndexRef.current = cycleStart;
      autoRemainingIndexesRef.current = remaining;
    }

    console.log('📋 Remaining queue:', remaining, 'Cycle start:', cycleStart);

    if (remaining.length === 0) {
      console.log('♻️ Queue empty, restarting cycle from', cycleStart);
      shouldForcePlayRef.current = true;
      autoCycleStartIndexRef.current = cycleStart;
      autoRemainingIndexesRef.current = buildShuffledIndexes(length, cycleStart);
      setCurrentIndex(cycleStart);
      setIsPlaying(true);
      return;
    }

    const [nextIndex, ...restQueue] = remaining;
    console.log('▶️ Playing next track index:', nextIndex, 'Queue left:', restQueue.length);
    autoRemainingIndexesRef.current = restQueue;
    autoCycleStartIndexRef.current = cycleStart;
    shouldForcePlayRef.current = true;
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  }, []);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    resetAutoCycle();
    shouldForcePlayRef.current = true;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }, [resetAutoCycle, tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    resetAutoCycle();
    shouldForcePlayRef.current = true;
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      console.log('🎼 Audio ended event fired');
      autoNextTrack();
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoNextTrack]);

  const waveBars = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  const scrollPlaylist = useCallback((direction) => {
    const list = playlistRef.current;
    if (!list) return;
    const offset = direction === "up" ? -92 : 92;
    list.scrollBy({ top: offset, behavior: "smooth" });
  }, []);

  const overlayIsRunning = Boolean(overlayState?.isRunning);
  const overlayTimeLeft = overlayIsRunning && Number(overlayState?.endAtTs) > 0
    ? Math.max(0, Math.ceil((Number(overlayState?.endAtTs) - Date.now()) / 1000))
    : Math.max(0, Number(overlayState?.timeLeft) || 0);
  const overlayTimeLabel = formatOverlayTime(overlayTimeLeft, Boolean(overlayState?.useHourFormat));
  const floatingVisible = globalMode && !isStudyTimerRoute && !isFloatingDismissed && (Boolean(currentTrack) || overlayIsRunning);
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const seekToFromClientX = useCallback((clientX) => {
    const track = progressTrackRef.current;
    const audio = audioRef.current;
    if (!track || !audio || !Number.isFinite(duration) || duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, rawX));
    const ratio = rect.width > 0 ? clampedX / rect.width : 0;
    const nextTime = ratio * duration;

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgressHover((prev) => ({ ...prev, x: clampedX, time: nextTime }));
  }, [duration]);

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
    currentTrackIdRef.current = currentTrack?.id || null;
  }, [currentTrack]);

  useEffect(() => {
    if (globalMode && !isStudyTimerRoute && isPlaying && currentTrack && isFloatingDismissed) {
      setIsFloatingDismissed(false);
    }
  }, [globalMode, isStudyTimerRoute, isPlaying, currentTrack, isFloatingDismissed]);

  useEffect(() => {
    if (!floatingVisible) {
      setIsFloatingCollapsed(false);
    }
  }, [floatingVisible]);

  useEffect(() => {
    if (MOTIVATIONAL_QUOTES.length <= 1) return undefined;

    const id = setInterval(() => {
      setMotivationIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes whalio-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      <audio
        ref={audioRef}
        onLoadedMetadata={(event) => {
          const nextDuration = Number(event.currentTarget.duration) || 0;
          setDuration(nextDuration);
          setCurrentTime(Math.min(Number(event.currentTarget.currentTime) || 0, nextDuration || 0));
        }}
        onTimeUpdate={(event) => {
          if (isSeekingRef.current) return;
          setCurrentTime(Number(event.currentTarget.currentTime) || 0);
        }}
        onPlay={() => {
          isAutoAdvancingRef.current = false;
          setIsPlaying(true);
        }}
        onPause={() => {
          if (isAutoAdvancingRef.current) return;
          setIsPlaying(false);
        }}
      />

    {showFullPlayer && (
    <div className="w-full rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/10 backdrop-blur-xl p-4 text-slate-800 dark:text-slate-100 overflow-hidden">

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

            <div className="mb-3">
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
                    {formatOverlayTime(Math.floor(progressHover.time))}
                  </div>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
                <span>{formatOverlayTime(Math.floor(currentTime))}</span>
                <span>{formatOverlayTime(Math.floor(duration))}</span>
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

            <div className="flex items-center gap-2">
              <Volume2 size={15} className="text-slate-500 dark:text-slate-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-24 sm:w-28 h-1.5 rounded-lg accent-blue-500 bg-slate-200 dark:bg-slate-700 cursor-pointer"
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
                        shouldForcePlayRef.current = true;
                        setCurrentIndex(idx);
                        setIsPlaying(true);
                        showFloatingPlayer();
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
    )}
    {floatingVisible && (
      <div className="fixed bottom-[5.35rem] left-1/2 z-40 w-[93vw] -translate-x-1/2 rounded-3xl border border-slate-200/85 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:w-[89vw] sm:p-4 md:w-[84vw] lg:bottom-6 lg:w-[80vw] lg:max-w-[1120px] dark:border-white/15 dark:bg-slate-900/85">
        <button
          type="button"
          onClick={dismissFloatingPlayer}
          className="absolute -top-2 -left-2 z-10 flex items-center justify-center rounded-full bg-slate-500 p-1.5 text-white shadow-lg transition-colors hover:bg-rose-500 dark:bg-slate-600 dark:hover:bg-rose-500"
          aria-label="Đóng player"
          title="Đóng player (phát nhạc trên StudyTime để mở lại)"
        >
          <X size={14} />
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              StudyTime Live
            </p>
            <p className="mt-1 text-base font-bold leading-tight text-slate-800 dark:text-slate-100 sm:text-lg">
              {currentTrack ? currentTrack.name : "Chưa phát nhạc"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1.5 text-sm font-semibold text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              <Timer size={14} />
              <span>{overlayTimeLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFloatingCollapsed((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label={isFloatingCollapsed ? "Hiện player" : "Ẩn player"}
            >
              {isFloatingCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setIsFloatingPlaylistOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ListMusic size={15} />
              List
            </button>
          </div>
        </div>
        <p className="mt-2 rounded-xl bg-slate-100/80 px-3 py-2 text-sm text-slate-600 italic dark:bg-white/10 dark:text-slate-300">
          "{MOTIVATIONAL_QUOTES[motivationIndex]}"
        </p>

        <div className={isFloatingCollapsed ? "hidden" : ""}>
          {overlayState?.tip && (
            <p className="mt-2 rounded-xl bg-slate-100/80 px-3 py-1.5 text-sm text-slate-600 dark:bg-white/10 dark:text-slate-300 truncate">
              {overlayState.tip}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={prevTrack}
              className="rounded-xl border border-slate-200 bg-white/70 p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label="Bài trước"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="rounded-xl bg-blue-500 px-3 py-2.5 text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-blue-600"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={nextTrack}
              className="rounded-xl border border-slate-200 bg-white/70 p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label="Bài tiếp"
            >
              <SkipForward size={18} />
            </button>

            <div className="ml-1 flex flex-1 items-center gap-2">
              <div
                ref={progressTrackRef}
                onClick={handleProgressClick}
                onPointerDown={handleProgressPointerDown}
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={handleProgressMouseLeave}
                className="group relative h-5 flex-1 cursor-pointer"
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
              <Volume2 size={16} className="text-slate-500 dark:text-slate-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 sm:w-24 h-1.5 rounded-lg accent-blue-500 bg-slate-200 dark:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
            <span>{formatOverlayTime(Math.floor(currentTime))}</span>
            <span>{formatOverlayTime(Math.floor(duration))}</span>
          </div>

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
                          onClick={() => {
                            resetAutoCycle();
                            shouldForcePlayRef.current = true;
                            setCurrentIndex(idx);
                            setIsPlaying(true);
                          }}
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
        </div>
      </div>
    )}
    </>
  );
};

export default LocalMusicPlayer;
