import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import localforage from "localforage";
import Marquee from "react-fast-marquee";
import { Music2, Play, Pause, SkipBack, SkipForward, Plus, X, Volume2, Disc3, Download, Upload } from "lucide-react";

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
  const importInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
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

  const handleFileUpload = useCallback(
    async (event) => {
      const fileList = Array.from(event.target.files || []);
      event.target.value = "";
      if (fileList.length === 0) return;

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
    [currentIndex, savePlaylistOrder]
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

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }, [tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [tracks.length]);

  const removeTrack = useCallback(
    async (id) => {
      try {
        await musicDB.removeItem(id);
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
    [currentIndex, savePlaylistOrder]
  );

  const exportPlaylist = useCallback(() => {
    if (tracks.length === 0) {
      setNotice("Không có dữ liệu để xuất.");
      return;
    }

    const payload = {
      version: 1,
      app: "Whalio LocalMusicPlayer",
      exportedAt: new Date().toISOString(),
      tracks: tracks.map((track, order) => ({
        id: track.id,
        name: track.name,
        type: track.type,
        size: track.size,
        createdAt: track.createdAt,
        order,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `whalio-playlist-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất playlist JSON.");
  }, [tracks]);

  const importPlaylist = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.tracks)) {
          setNotice("File JSON không hợp lệ.");
          return;
        }

        const byId = new Map(tracks.map((track) => [track.id, track]));
        const byName = new Map();
        tracks.forEach((track) => {
          const key = track.name.toLowerCase();
          if (!byName.has(key)) byName.set(key, []);
          byName.get(key).push(track);
        });

        const used = new Set();
        const restored = [];
        let missing = 0;

        parsed.tracks.forEach((meta) => {
          const direct = byId.get(meta.id);
          if (direct && !used.has(direct.id)) {
            restored.push(direct);
            used.add(direct.id);
            return;
          }

          const sameName = byName.get(String(meta.name || "").toLowerCase()) || [];
          const alt = sameName.find((track) => !used.has(track.id));
          if (alt) {
            restored.push(alt);
            used.add(alt.id);
          } else {
            missing += 1;
          }
        });

        tracks.forEach((track) => {
          if (!used.has(track.id)) restored.push(track);
        });

        if (restored.length === 0) {
          setNotice("Không tìm thấy bài nào khớp trong thư viện cục bộ. Hãy upload lại file nhạc.");
          return;
        }

        setTracks(restored);
        setCurrentIndex((prev) => {
          if (prev < 0 || prev >= tracks.length) return 0;
          const oldId = tracks[prev]?.id;
          const nextIndex = restored.findIndex((track) => track.id === oldId);
          return nextIndex >= 0 ? nextIndex : 0;
        });
        await savePlaylistOrder(restored);
        setNotice(
          missing > 0
            ? `Đã nhập playlist. Thiếu ${missing} bài (cần upload lại file local).`
            : "Đã nhập playlist thành công."
        );
      } catch (err) {
        console.error("Import playlist error:", err);
        setNotice("Không thể đọc file JSON.");
      }
    },
    [tracks, savePlaylistOrder]
  );

  const waveBars = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 text-slate-100">
      <style>{`
        @keyframes whalio-wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.45; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      <audio
        ref={audioRef}
        onEnded={nextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-cyan-300">
          <Disc3 size={16} />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Local Music</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Upload size={13} />
            Nhập
          </button>
          <button
            onClick={exportPlaylist}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Download size={13} />
            Xuất
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/25 transition-colors"
          >
            <Plus size={14} />
            {isSaving ? "Đang lưu..." : "Thêm nhạc"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.mp4,audio/mpeg,video/mp4,audio/mp4"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importPlaylist} />

      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
        {currentTrack ? (
          <>
            <div className="h-6 mb-2">
              <Marquee gradient={false} speed={35} pauseOnHover>
                <span className="text-sm font-semibold text-cyan-200 mr-6">{currentTrack.name}</span>
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
                className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={togglePlay}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.45)] hover:shadow-[0_0_26px_rgba(59,130,246,0.55)] transition-all"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <SkipForward size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 size={15} className="text-slate-300" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-cyan-400 bg-slate-700 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Music2 className="mx-auto mb-2 text-slate-400" size={28} />
            <p className="text-sm font-medium text-slate-200">Chưa có bài nhạc nào</p>
            <p className="text-xs text-slate-400 mt-1">Thêm file MP3/MP4 để phát offline.</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Nhạc được lưu cục bộ tại trình duyệt này. Nếu bạn xóa dữ liệu duyệt web, danh sách nhạc sẽ bị mất.
      </p>
      {notice && <p className="mt-1 text-[11px] text-cyan-300/90">{notice}</p>}

      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 max-h-52 overflow-auto">
        {isLoading ? (
          <p className="p-3 text-xs text-slate-400">Đang tải thư viện...</p>
        ) : tracks.length === 0 ? (
          <p className="p-3 text-xs text-slate-400">Playlist trống.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {tracks.map((track, idx) => {
              const active = idx === currentIndex;
              return (
                <li
                  key={track.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                    active ? "bg-cyan-500/15 text-cyan-100" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(true);
                    }}
                    className="text-left min-w-0 flex-1"
                  >
                    <p className="text-sm truncate">{track.name}</p>
                  </button>

                  <button
                    onClick={() => removeTrack(track.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
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
  );
};

export default LocalMusicPlayer;
