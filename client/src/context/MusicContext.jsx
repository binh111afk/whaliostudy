import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import localforage from "localforage";

const musicDB = localforage.createInstance({
  name: "whalio_local_db",
  storeName: "music_library",
});

const PLAYLIST_META_KEY = "__playlist_meta_v1__";
const MUSIC_PLAYBACK_STORAGE_KEY = "whalio_music_playback_v1";
const ALLOWED_EXT = [".mp3", ".mp4"];
const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/mp4", "video/mp4"];

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

const MusicContext = createContext(null);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const autoCycleStartIndexRef = useRef(null);
  const autoRemainingIndexesRef = useRef([]);
  const shouldForcePlayRef = useRef(false);
  const isAutoAdvancingRef = useRef(false);
  const lastLoadedTrackIdRef = useRef(null);
  const tracksRef = useRef([]);
  const currentIndexRef = useRef(-1);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [notice, setNotice] = useState("");

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

  // Restore playback state from localStorage
  useEffect(() => {
    if (tracks.length === 0) return;
    
    try {
      const raw = localStorage.getItem(MUSIC_PLAYBACK_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      
      if (typeof saved.volume === "number") {
        setVolume(Math.min(1, Math.max(0, saved.volume)));
      }
      
      const idx = tracks.findIndex((track) => track.id === saved.currentTrackId);
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
      
      // Don't auto-play or auto-show on restore
    } catch (err) {
      console.error("Restore playback state error:", err);
    }
  }, [tracks]);

  // Persist playback state
  useEffect(() => {
    if (currentIndex < 0 || !tracks[currentIndex]) return;
    
    const payload = {
      currentTrackId: tracks[currentIndex].id,
      isPlaying,
      volume,
      currentTime: Math.max(0, Number(audioRef.current?.currentTime) || 0),
      updatedAt: Date.now(),
    };
    localStorage.setItem(MUSIC_PLAYBACK_STORAGE_KEY, JSON.stringify(payload));
  }, [currentIndex, isPlaying, tracks, volume, currentTime]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load and play track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      isAutoAdvancingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setShowPlayer(true);
    shouldForcePlayRef.current = false;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentTrack, isPlaying]);

  const playSong = useCallback((trackIndex) => {
    if (trackIndex < 0 || trackIndex >= tracks.length) return;
    
    resetAutoCycle();
    shouldForcePlayRef.current = true;
    setCurrentIndex(trackIndex);
    setIsPlaying(true);
    setShowPlayer(true);
  }, [resetAutoCycle, tracks.length]);

  const autoNextTrack = useCallback(() => {
    const latestTracks = tracksRef.current;
    const length = latestTracks.length;
    if (length === 0) return;
    
    isAutoAdvancingRef.current = true;

    if (length === 1) {
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
      cycleStart = safeCurrentIndex;
      remaining = buildShuffledIndexes(length, cycleStart);
      autoCycleStartIndexRef.current = cycleStart;
      autoRemainingIndexesRef.current = remaining;
    }

    if (remaining.length === 0) {
      shouldForcePlayRef.current = true;
      autoCycleStartIndexRef.current = cycleStart;
      autoRemainingIndexesRef.current = buildShuffledIndexes(length, cycleStart);
      setCurrentIndex(cycleStart);
      setIsPlaying(true);
      return;
    }

    const [nextIndex, ...restQueue] = remaining;
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
    setShowPlayer(true);
  }, [resetAutoCycle, tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    resetAutoCycle();
    shouldForcePlayRef.current = true;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
    setShowPlayer(true);
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

  const seekTo = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(time);
  }, [duration]);

  const hidePlayer = useCallback(() => {
    setShowPlayer(false);
  }, []);

  const openPlayer = useCallback(() => {
    setShowPlayer(true);
  }, []);

  useEffect(() => {
    resetAutoCycle();
  }, [tracks.length, resetAutoCycle]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      autoNextTrack();
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [autoNextTrack]);

  const value = useMemo(
    () => ({
      // State
      tracks,
      currentIndex,
      currentTrack,
      isPlaying,
      volume,
      isLoading,
      isSaving,
      currentTime,
      duration,
      showPlayer,
      notice,
      audioRef,
      
      // Actions
      setVolume,
      setCurrentTime,
      setDuration,
      setIsPlaying,
      togglePlay,
      playSong,
      nextTrack,
      prevTrack,
      removeTrack,
      saveFilesToLibrary,
      seekTo,
      hidePlayer,
      openPlayer,
      setNotice,
    }),
    [
      tracks,
      currentIndex,
      currentTrack,
      isPlaying,
      volume,
      isLoading,
      isSaving,
      currentTime,
      duration,
      showPlayer,
      notice,
      togglePlay,
      playSong,
      nextTrack,
      prevTrack,
      removeTrack,
      saveFilesToLibrary,
      seekTo,
      hidePlayer,
      openPlayer,
    ]
  );

  return (
    <MusicContext.Provider value={value}>
      <audio
        ref={audioRef}
        onLoadedMetadata={(event) => {
          const nextDuration = Number(event.currentTarget.duration) || 0;
          setDuration(nextDuration);
          setCurrentTime(Math.min(Number(event.currentTarget.currentTime) || 0, nextDuration || 0));
        }}
        onTimeUpdate={(event) => {
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
      {children}
    </MusicContext.Provider>
  );
};

export default MusicContext;
