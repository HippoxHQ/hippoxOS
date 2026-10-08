import React, { useState, useEffect, useRef, useCallback } from "react";
import { urlCommands } from "../../../../command/url";
import { openUrl } from "../../../../utils";
interface UrlPreview {
  url: string;
  title: string;
  domain: string;
  description: string;
  themeColor: string;
  backgroundImage: string | null;
  faviconUrl: string;
  fallbackIcon: string;
  isLoading: boolean;
}
interface MessageUrlGridProps {
  urls: string[];
  t: (key: string, params?: any) => string;
}
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const getDefaultThemeColor = (domain: string): string => {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
};
const getFallbackIcon = (domain: string): string => {
  const iconMap: Record<string, string> = {
    "google.com": "🔍",
    "youtube.com": "📺",
    "github.com": "🐙",
    "twitter.com": "🐦",
    "facebook.com": "📘",
    "instagram.com": "📷",
    "linkedin.com": "🔗",
    "reddit.com": "🤖",
    "amazon.com": "📦",
    "netflix.com": "🎬",
    "spotify.com": "🎵",
    "baidu.com": "🔍",
    "zhihu.com": "❓",
    "bilibili.com": "📺",
    "taobao.com": "🛒",
    "jd.com": "🛍️",
    "douyin.com": "🎵",
    "weibo.com": "🐦",
    "qq.com": "🐧",
    "163.com": "📧",
  };
  if (iconMap[domain]) return iconMap[domain];
  for (const [key, icon] of Object.entries(iconMap)) {
    if (domain.endsWith(key)) return icon;
  }
  return "🌐";
};
export const MessageUrlGrid: React.FC<MessageUrlGridProps> = ({ urls, t }) => {
  const [previews, setPreviews] = useState<UrlPreview[]>([]);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  const urlsRef = useRef<string[]>([]);
  const generateInitialPreviews = useCallback((urlList: string[]): UrlPreview[] => {
    return urlList.map((url) => {
      const domain = getDomainFromUrl(url);
      return {
        url,
        title: domain,
        domain: domain,
        description: "",
        themeColor: getDefaultThemeColor(domain),
        backgroundImage: null,
        faviconUrl: "",
        fallbackIcon: getFallbackIcon(domain),
        isLoading: true,
      };
    });
  }, []);
  useEffect(() => {
    const uniqueUrls = Array.from(new Set(urls));
    if (JSON.stringify(urlsRef.current) === JSON.stringify(uniqueUrls) && previews.length > 0) {
      return;
    }
    urlsRef.current = uniqueUrls;
    if (uniqueUrls.length === 0) {
      setPreviews([]);
      return;
    }
    const initialPreviews = generateInitialPreviews(uniqueUrls);
    setPreviews(initialPreviews);
    const fetchAllMetadata = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const results: {
        index: number;
        metadata: Awaited<ReturnType<typeof urlCommands.getUrlMetadata>>;
      }[] = [];
      for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        try {
          const metadata = await urlCommands.getUrlMetadata(url);
          results.push({ index: i, metadata });
        } catch (error) {
          console.error(`Failed to fetch metadata for ${url}:`, error);
          results.push({
            index: i,
            metadata: {
              title: null,
              description: null,
              favicon_url: null,
              image: null,
              theme_color: null,
              background_image: null,
            },
          });
        }
      }
      setPreviews((prev) =>
        prev.map((p, idx) => {
          const result = results.find((r) => r.index === idx);
          if (result) {
            const domain = getDomainFromUrl(p.url);
            return {
              ...p,
              title: result.metadata.title || domain,
              description: result.metadata.description || "",
              themeColor: result.metadata.theme_color || getDefaultThemeColor(domain),
              backgroundImage: result.metadata.background_image || result.metadata.image || null,
              faviconUrl: result.metadata.favicon_url || "",
              isLoading: false,
            };
          }
          return { ...p, isLoading: false };
        }),
      );
      loadingRef.current = false;
    };
    fetchAllMetadata();
  }, [urls, generateInitialPreviews]);
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };
  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.addEventListener("scroll", checkScroll);
      setTimeout(checkScroll, 100);
      return () => element.removeEventListener("scroll", checkScroll);
    }
  }, [previews]);
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };
  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };
  const handleUrlClick = async (url: string) => {
    try {
      await openUrl(url, t);
    } catch (error) {
      console.error("Failed to open URL:", error);
      window.open(url, "_blank");
    }
  };
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const fallback = parent.querySelector(".url-fallback-icon");
      if (fallback) {
        (fallback as HTMLElement).style.display = "flex";
      }
    }
  };
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "block";
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const fallback = parent.querySelector(".url-fallback-icon");
      if (fallback) {
        (fallback as HTMLElement).style.display = "none";
      }
    }
  };
  if (previews.length === 0) return null;
  return (
    <div className="message-urls-container">
      <div className="urls-scroll-wrapper">
        <div className="urls-list-wrapper">
          {showLeft && (
            <button className="urls-scroll-btn urls-scroll-left" onClick={scrollLeft} title={t("chat.fileUpload.scrollLeft") || "Scroll Left"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className="urls-scroll" ref={scrollRef}>
            {previews.map((preview, idx) => (
              <div key={`${preview.url}-${idx}`} className="url-card" onClick={() => handleUrlClick(preview.url)}>
                <div
                  className="url-card-image"
                  style={{
                    backgroundColor: preview.themeColor,
                    backgroundImage: preview.backgroundImage ? `url(${preview.backgroundImage})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="url-glass-bg"></div>
                  <div className="url-icon-container">
                    {!preview.isLoading && preview.faviconUrl ? (
                      <img src={preview.faviconUrl} alt={preview.domain} className="url-favicon" onError={handleImageError} onLoad={handleImageLoad} />
                    ) : null}
                    <span
                      className="url-fallback-icon"
                      style={{
                        display: preview.isLoading || !preview.faviconUrl ? "flex" : "none",
                      }}
                    >
                      {preview.isLoading ? "⏳" : preview.fallbackIcon}
                    </span>
                  </div>
                </div>
                <div className="url-card-info">
                  <div className="url-title" title={preview.title}>
                    {preview.title.length > 35 ? preview.title.slice(0, 32) + "..." : preview.title}
                  </div>
                  <div className="url-description" title={preview.description}>
                    {preview.description.length > 45 ? preview.description.slice(0, 42) + "..." : preview.description || "Click to Visit the WebSite"}
                  </div>
                  <div className="url-domain" title={preview.url}>
                    {preview.domain.length > 30 ? preview.domain.slice(0, 27) + "..." : preview.domain}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showRight && (
            <button className="urls-scroll-btn urls-scroll-right" onClick={scrollRight} title={t("chat.fileUpload.scrollRight") || "Scroll Right"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <style>{`
        .message-urls-container {
  margin-top: 8px;
  margin-bottom: 4px;
  width: 100%;
  max-width: 100%;
  overflow: visible;
  flex-shrink: 0;
}
       .urls-scroll-wrapper {
  border-radius: 12px;
  width: 100%;
  overflow: visible;
}
        .urls-list-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent; 
  border-radius: 8px;
  padding: 0 4px;
  width: 100%;
  min-width: 0;   
}
         .urls-scroll-btn {
          flex-shrink: 0;
          width: 28px;
          height: 200px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          // transition: all 0.2s ease;
          opacity: 0.8;
        }
         .urls-scroll-btn:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
          opacity: 1;
        }
    .urls-scroll {
  flex: 1;
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 4px;
  scrollbar-width: none;  
  -ms-overflow-style: none; 
  scroll-behavior: smooth;
  min-width: 0;  
}
         .urls-scroll::-webkit-scrollbar {
          height: 4px;
        }
         .urls-scroll::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 2px;
        }
         .urls-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }
         .urls-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
         .url-card {
          width: 200px;
          min-width: 200px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          // transition: all 0.2s ease;
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
         .url-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: var(--accent-color);
        }
         .url-card-image {
          width: 100%;
          aspect-ratio: 16 / 9;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          // transition: background-color 0.3s ease;
        }
         .url-glass-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backdrop-filter: blur(8px);
          background: rgba(255, 255, 255, 0.15);
          z-index: 1;
        }
         [data-theme="dark"] .url-glass-bg {
          background: rgba(0, 0, 0, 0.2);
        }
         .url-icon-container {
          position: relative;
          z-index: 2;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
         [data-theme="dark"] .url-icon-container {
          background: rgba(30, 30, 40, 0.9);
        }
         .url-favicon {
          width: 32px;
          height: 32px;
          object-fit: contain;
          display: none;
        }
         .url-fallback-icon {
          font-size: 28px;
          font-weight: 500;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
         .url-card-info {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
         .url-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.4;
        }
         .url-description {
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          white-space: normal;
          line-height: 1.35;
          min-height: 30px;
        }
         .url-domain {
          font-size: 10px;
          color: var(--text-tertiary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 2px;
        }
         .message-wrapper.user .url-card {
          direction: ltr;
        }
         .message-wrapper.user .urls-list-wrapper {
          direction: ltr;
        }
      `}</style>
    </div>
  );
};
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches || [];
};
