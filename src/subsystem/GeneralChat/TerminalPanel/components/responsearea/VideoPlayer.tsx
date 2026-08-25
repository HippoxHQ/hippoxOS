import React, { useRef, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { VideoResource } from "../../../llm/types";
interface VideoPlayerProps {
  videos: VideoResource[];
  t: (key: string) => string;
  isZh?: boolean;
}
const getVideoUrl = (url: string): string => {
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
      console.error("[VideoPlayer] Failed to convert file path:", e);
      return url;
    }
  }
  return url;
};
const VideoPlayer: React.FC<VideoPlayerProps> = ({ videos, t, isZh = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  // ===== Hooks MUST be called before any conditional returns =====
  // Auto-play when source changes
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);
  // ===== Conditional return AFTER all hooks =====
  if (!videos || videos.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无视频" : "No video available"}
      </div>
    );
  }
  const currentVideo = videos[currentIndex];
  const videoUrl = getVideoUrl(currentVideo.url);
  // Format time
  const formatTime = (time: number): string => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.error("[VideoPlayer] Play failed:", err);
          setError(err.message || "Play failed");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
      if (isLoading) setIsLoading(false);
    }
  };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("[VideoPlayer] Video error:", e);
    setError(isZh ? "加载视频失败，请检查文件是否可访问" : "Failed to load video");
    setIsPlaying(false);
    setIsLoading(false);
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setError(null);
      setIsLoading(false);
    }
  };
  const handleCanPlay = () => {
    setIsLoading(false);
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };
  const nextVideo = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };
  const prevVideo = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };
  return (
    <div
      className="terminal-video-player"
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
        <span style={{ fontSize: "13px", lineHeight: 1 }}>🎬</span>
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
          {currentVideo.title || "Video Player"}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            marginLeft: "auto",
          }}
        >
          {currentIndex + 1} / {videos.length}
        </span>
      </div>
      <div style={{ position: "relative", background: "#000000" }}>
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#ffffff",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #818cf8",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>{isZh ? "加载中..." : "Loading..."}</span>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </div>
        )}
        {currentVideo.thumbnail && !isPlaying && currentTime === 0 && !isLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `url(${getVideoUrl(currentVideo.thumbnail)}) center/cover`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 1,
            }}
            onClick={togglePlay}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                color: "#ffffff",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ▶
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={currentVideo.thumbnail ? getVideoUrl(currentVideo.thumbnail) : undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onClick={togglePlay}
          style={{
            width: "100%",
            maxHeight: "360px",
            display: "block",
            background: "#000000",
            cursor: "pointer",
          }}
        />
      </div>
      {error && (
        <div
          style={{
            fontSize: "11px",
            color: "#ef4444",
            padding: "4px 12px",
            background: "rgba(239, 68, 68, 0.1)",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          padding: "10px 16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={prevVideo}
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
            title={isZh ? "上一个" : "Previous"}
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
              fontSize: "18px",
              width: "34px",
              height: "34px",
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
            onClick={nextVideo}
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
            title={isZh ? "下一个" : "Next"}
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
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              marginLeft: "auto",
            }}
          >
            {currentVideo.format?.toUpperCase() || ""}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: "100%",
            height: "4px",
            cursor: "pointer",
            background: `linear-gradient(to right, var(--accent-color) ${(currentTime / (duration || 1)) * 100}%, var(--border-color) ${(currentTime / (duration || 1)) * 100}%)`,
            borderRadius: "2px",
            accentColor: "var(--accent-color)",
          }}
        />
      </div>
    </div>
  );
};
export default VideoPlayer;
