import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { fetchFinancialNews } from "../../../command/Finance/News";
import { osCommands } from "../../../command/os";
export interface NewsItem {
  id: string;
  title: string;
  source?: string;
  time?: string;
  url?: string;
  source_url?: string;
  published_at?: string;
  summary?: string;
  sentiment?: string;
  category?: string;
}
interface NewsTickerProps {
  items?: NewsItem[];
  theme?: "light" | "dark";
  speed?: number;
  language?: "zh" | "en";
}
const NewsTicker: React.FC<NewsTickerProps> = ({
  items: externalItems,
  theme = "dark",
  speed = 50,
  language = "en",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const [internalItems, setInternalItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === "dark";
  const isZh = language === "zh";
  // Use external items if provided, otherwise use internal
  const items = externalItems && externalItems.length > 0 ? externalItems : internalItems;
  /**
   * Open URL in system default browser via Tauri command
   */
  const openBrowser = useCallback(async (url: string) => {
    if (!url) return;
    await osCommands.openBrowser(url);
  }, []);
  /**
   * Fetch news from backend via Tauri
   */
  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      const newsData = await fetchFinancialNews(20);
      if (newsData && newsData.length > 0) {
        // Map backend news to NewsItem format
        const mappedItems: NewsItem[] = newsData.map((item) => ({
          id: item.id,
          title: item.title,
          source: item.source,
          time: item.published_at
            ? new Date(item.published_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          url: item.url,
          source_url: item.source_url,
          summary: item.summary,
          sentiment: item.sentiment,
          category: item.category,
        }));
        setInternalItems(mappedItems);
      }
    } catch (error) {
      console.error("[NewsTicker] Failed to fetch news from backend:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isZh]);
  /**
   * Fetch news on mount and every 30 seconds
   */
  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 30000);
    return () => clearInterval(interval);
  }, [fetchNews]);
  /**
   * Memoize doubled items for seamless scroll
   */
  const doubledItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);
  /**
   * Render a single news item
   */
  const renderItem = useCallback(
    (item: NewsItem, key: number) => {
      return (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 20px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            height: "100%",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onClick={() => {
            if (item.url) {
              openBrowser(item.url);
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent-color, #3b82f6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "var(--accent-color, #3b82f6)",
              fontWeight: 600,
              flexShrink: 0,
              background: "rgba(59, 130, 246, 0.12)",
              padding: "1px 8px",
              borderRadius: "10px",
            }}
          >
            {item.source || "News"}
          </span>
          <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
            {item.title}
          </span>
          {item.time && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {item.time}
            </span>
          )}
        </div>
      );
    },
    [openBrowser]
  );
  /**
   * Animation loop for seamless scrolling
   */
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || items.length === 0) return;
    let isAnimating = true;
    const animate = (timestamp: number) => {
      if (!isAnimating) return;
      if (isPausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      const currentScrollLeft = container.scrollLeft;
      const maxScroll = content.scrollWidth / 2;
      if (content.scrollWidth > container.clientWidth) {
        let newScrollLeft = currentScrollLeft + delta * speed;
        if (newScrollLeft >= maxScroll) {
          newScrollLeft = newScrollLeft - maxScroll;
        }
        container.scrollLeft = newScrollLeft;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      isAnimating = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastTimestampRef.current = 0;
    };
  }, [speed, items.length]);
  /**
   * Pause/resume scroll on hover
   */
  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
  }, []);
  const handleMouseLeave = useCallback(() => {
    isPausedRef.current = false;
    lastTimestampRef.current = 0;
  }, []);
  /**
   * Show loading state
   */
  if (isLoading && items.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
          fontSize: "11px",
          color: "var(--text-muted)",
          borderLeft: `1px solid var(--border-color)`,
        }}
      >
        Loading news...
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        height: "100%",
        overflow: "hidden",
        position: "relative",
        background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
        cursor: "pointer",
        borderLeft: `1px solid var(--border-color)`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          width: "max-content",
        }}
      >
        {doubledItems.map((item, idx) => renderItem(item, idx))}
      </div>
    </div>
  );
};
export default NewsTicker;