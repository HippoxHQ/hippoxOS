import React, { useState, useEffect, useCallback } from "react";
import { Newspaper, Clock, ChevronRight } from "lucide-react";
import { fetchFinancialNews } from "../../../command/Finance/News";
import { osCommands } from "../../../command/os";
interface NewsItem {
  id: string;
  title: string;
  source: string;
  source_url: string;
  published_at: string;
  summary?: string;
  url: string;
  sentiment?: string;
  category?: string;
}
interface NewsPanelProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  language?: "zh" | "en";
}
const NewsPanel: React.FC<NewsPanelProps> = ({ theme, i18n, language = "en" }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === "dark";
  const isZh = language === "zh";
  /**
   * Fetch news from backend
   */
  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchFinancialNews(30);
      if (data && data.length > 0) {
        setNewsItems(data);
      }
    } catch (error) {
      console.error("[NewsPanel] Failed to fetch news:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  /**
   * Open URL in system browser
   */
  const openBrowser = useCallback(async (url: string) => {
    if (!url) return;
    await osCommands.openBrowser(url);
  }, []);
  /**
   * Format time
   */
  const formatTime = useCallback((dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }, []);
  /**
   * Get sentiment emoji
   */
  const getSentimentEmoji = useCallback((sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "🟢";
      case "negative":
        return "🔴";
      case "neutral":
        return "🟡";
      default:
        return "⚪";
    }
  }, []);
  // Fetch news on mount
  useEffect(() => {
    fetchNews();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [fetchNews]);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: isDark ? "var(--bg-primary, #1a1a2e)" : "var(--bg-primary, #f5f5f5)",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)",
          flexShrink: 0,
          minHeight: "32px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: isDark ? "var(--text-primary, #eee)" : "var(--text-primary, #222)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Newspaper size={14} />
          {isZh ? "金融新闻" : "Financial News"}
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: 400,
            }}
          >
            ({newsItems.length})
          </span>
        </span>
        <button
          onClick={fetchNews}
          disabled={isLoading}
          style={{
            padding: "2px 10px",
            fontSize: "11px",
            borderRadius: "4px",
            background: isDark ? "var(--bg-tertiary, #3d3d4d)" : "var(--bg-tertiary, #d0d0d0)",
            color: isDark ? "var(--text-secondary, #aaa)" : "var(--text-secondary, #555)",
            border: "1px solid var(--border-color)",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {isLoading ? (isZh ? "刷新中..." : "Refreshing...") : isZh ? "刷新" : "Refresh"}
        </button>
      </div>
      {/* News list - no category tabs */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
        }}
      >
        {isLoading && newsItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {isZh ? "加载新闻中..." : "Loading news..."}
          </div>
        ) : newsItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {isZh ? "暂无新闻" : "No news available"}
          </div>
        ) : (
          newsItems.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                padding: "8px 12px",
                marginBottom: "6px",
                borderRadius: "6px",
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onClick={() => openBrowser(item.url)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Title */}
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                      marginBottom: "4px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.title}
                  </div>
                  {/* Meta info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      {getSentimentEmoji(item.sentiment)}
                      <span>{item.source}</span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <Clock size={10} />
                      {formatTime(item.published_at)}
                    </span>
                  </div>
                  {/* Summary */}
                  {item.summary && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginTop: "4px",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.summary}
                    </div>
                  )}
                </div>
                {/* Arrow indicator */}
                <div
                  style={{
                    flexShrink: 0,
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default NewsPanel;
