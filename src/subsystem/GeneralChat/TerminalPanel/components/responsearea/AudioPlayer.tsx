import React, { useRef, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { AudioResource } from "../../../llm/types";
interface AudioPlayerProps {
  audios: AudioResource[];
  t: (key: string) => string;
  isZh?: boolean;
}
const getAudioUrl = (url: string): string => {
  if (!url) return "";
  // If it's already a remote URL (http/https), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // If it's a local file path (Windows: C:\ or Unix: /), convert using Tauri
  if (url.startsWith("/") || /^[a-zA-Z]:\\/.test(url)) {
    try {
      return convertFileSrc(url);
    } catch (e) {
      console.error("[AudioPlayer] Failed to convert file path:", e);
      return url;
    }
  }
  return url;
};
const AudioPlayer: React.FC<AudioPlayerProps> = ({ audios, t, isZh = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  // ===== Hooks MUST be called before any conditional returns =====
  // Auto-play when source changes
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentIndex]);
  // ===== Conditional return AFTER all hooks =====
  if (!audios || audios.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无音频" : "No audio available"}
      </div>
    );
  }
  const currentAudio = audios[currentIndex];
  const audioUrl = getAudioUrl(currentAudio.url);
  // Format time (seconds -> MM:SS)
  const formatTime = (time: number): string => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  // Play/pause toggle
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error("[AudioPlayer] Play failed:", err);
          setError(err.message || "Play failed");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
      if (isLoading) setIsLoading(false);
    }
  };
  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };
  // Handle audio end
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  // Handle audio error
  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("[AudioPlayer] Audio error:", e);
    setError(isZh ? "加载音频失败，请检查文件是否可访问" : "Failed to load audio");
    setIsPlaying(false);
    setIsLoading(false);
  };
  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setError(null);
      setIsLoading(false);
    }
  };
  const handleCanPlay = () => {
    setIsLoading(false);
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };
  // Next track
  const nextTrack = () => {
    setCurrentIndex((prev) => (prev + 1) % audios.length);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  // Previous track
  const prevTrack = () => {
    setCurrentIndex((prev) => (prev - 1 + audios.length) % audios.length);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  // Get cover URL (also support local files)
  const coverUrl = currentAudio.cover ? getAudioUrl(currentAudio.cover) : undefined;
  return (
    <div
      className="terminal-audio-player"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minHeight: "32px",
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>🎵</span>
        <span
          style={{
            flex: 1,
            color: "var(--text-primary)",
            fontSize: "12px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentAudio.title || "Audio Player"}
        </span>
        {isLoading && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-tertiary)",
            }}
          >
            {isZh ? "加载中..." : "Loading..."}
          </span>
        )}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            marginLeft: "auto",
          }}
        >
          {currentIndex + 1} / {audios.length}
        </span>
      </div>
      <div
        style={{
          padding: "12px 16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {coverUrl && (
            <img
              src={coverUrl}
              alt={currentAudio.title}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "6px",
                objectFit: "cover",
                flexShrink: 0,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentAudio.title}
            </div>
            {currentAudio.artist && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentAudio.artist}
                {currentAudio.album && ` • ${currentAudio.album}`}
              </div>
            )}
            {currentAudio.format && (
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--text-tertiary)",
                }}
              >
                {currentAudio.format.toUpperCase()}
                {currentAudio.duration && ` • ${formatTime(currentAudio.duration)}`}
              </div>
            )}
          </div>
        </div>
        {error && (
          <div
            style={{
              fontSize: "11px",
              color: "#ef4444",
              padding: "4px 8px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={prevTrack}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "16px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "transparent";
            }}
            title={isZh ? "上一首" : "Previous"}
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            style={{
              background: "var(--accent-color)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: "50%",
              fontSize: "20px",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title={isPlaying ? (isZh ? "暂停" : "Pause") : isZh ? "播放" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={nextTrack}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              fontSize: "16px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "transparent";
            }}
            title={isZh ? "下一首" : "Next"}
          >
            ⏭
          </button>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              fontFamily: "monospace",
              minWidth: "50px",
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginLeft: "auto",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: "60px",
                height: "4px",
                cursor: "pointer",
                background: "var(--border-color)",
                borderRadius: "2px",
                accentColor: "var(--accent-color)",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              height: "4px",
              cursor: "pointer",
              background: `linear-gradient(to right, var(--accent-color) ${(currentTime / (duration || 1)) * 100}%, var(--border-color) ${(currentTime / (duration || 1)) * 100}%)`,
              borderRadius: "2px",
              accentColor: "var(--accent-color)",
            }}
          />
        </div>
      </div>
      <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} onError={handleError} onLoadedMetadata={handleLoadedMetadata} onCanPlay={handleCanPlay} style={{ display: "none" }} />
      {audios.length > 1 && (
        <div
          style={{
            padding: "4px 12px 8px",
            borderTop: "1px solid var(--border-color)",
            maxHeight: "100px",
            overflowY: "auto",
          }}
        >
          {audios.map((audio, index) => (
            <div
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(false);
                setCurrentTime(0);
                setIsLoading(true);
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
              }}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                color: index === currentIndex ? "var(--accent-color)" : "var(--text-secondary)",
                background: index === currentIndex ? "var(--hover-bg)" : "transparent",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {index === currentIndex && "▶ "}
              {audio.title || `Track ${index + 1}`}
              {audio.artist && ` - ${audio.artist}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AudioPlayer;
