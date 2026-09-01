import React, { useState, useEffect } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { osCommands } from "../command/os";
import { basisCommands } from "../command/basis";
import { zh, en } from "../i18n";
import { Info, BookOpen, Maximize2, Minimize2 } from "lucide-react";
import logo from "../assets/logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
/**
 * Translation helper function
 * Retrieves translation for a given key based on the current language
 */
const getTranslation = (language: "zh" | "en", key: string): string => {
  const translations = language === "zh" ? zh : en;
  const keys = key.split(".");
  let value: any = translations;
  for (const k of keys) {
    if (value === undefined) return key;
    value = value[k];
  }
  return value || key;
};
/**
 * AboutWindow Component
 * Displays application information and version details
 * Fetches Markdown content from GitHub via Tauri backend command
 */
const AboutWindow: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  /**
   * Load theme and language settings from config
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme().catch(() => "dark" as const), configCommands.getSettingsLanguage().catch(() => "en" as const)]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadData();
  }, []);
  const isZh = getTranslation(language, "i18n") === "zh";
  /**
   * Fetch about content from GitHub via Tauri backend
   * Uses Rust backend to avoid CORS issues
   */
  useEffect(() => {
    const fetchAboutContent = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const lang = isZh ? "zh" : "en";
        console.log("Fetching about markdown for language:", lang);
        const content = await basisCommands.fetchAboutMarkdown(lang);
        setMarkdownContent(content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch about content:", error);
        setErrorMessage(`Failed to load: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAboutContent();
  }, [isZh]);
  /**
   * Open URL in system default browser using osCommands
   */
  const openInBrowser = async (url: string) => {
    await osCommands.openBrowser(url);
  };
  /**
   * Check window maximized state periodically
   */
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await windowsCommands.windowIsMaximized("about-window");
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Failed to check window state:", error);
      }
    };
    checkMaximized();
    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);
  const isDark = theme === "dark";
  /**
   * Window control handlers
   */
  const handleMinimize = async () => {
    try {
      await windowsCommands.windowMinimize("about-window");
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };
  const handleMaximize = async () => {
    try {
      const isMax = await windowsCommands.windowIsMaximized("about-window");
      if (isMax) {
        await windowsCommands.windowUnmaximize("about-window");
      } else {
        await windowsCommands.windowMaximize("about-window");
      }
      const maximized = await windowsCommands.windowIsMaximized("about-window");
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  };
  const handleClose = async () => {
    try {
      await windowsCommands.windowClose("about-window");
    } catch (error) {
      console.error("Failed to close:", error);
      window.close();
    }
  };
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };
  /**
   * Scrollbar styles - overrides global scrollbar styles
   */
  const scrollbarStyles = `
    .about-scroll-container {
      scrollbar-width: thin;
      scrollbar-color: ${isDark ? "#3a3f4a" : "#d1d5db"} transparent;
    }
    .about-scroll-container::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .about-scroll-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .about-scroll-container::-webkit-scrollbar-thumb {
      background: ${isDark ? "#3a3f4a" : "#d1d5db"} !important;
      border-radius: 2px;
    }
    .about-scroll-container::-webkit-scrollbar-thumb:hover {
      background: ${isDark ? "#4a4f5a" : "#b0b8c0"} !important;
    }
  `;
  /**
   * Styles
   */
  const styles = {
    container: {
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.15)",
      overflow: "hidden" as const,
      width: "100%",
      height: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    topBar: {
      height: "35px",
      background: isDark ? "#22252f" : "#f9fafb",
      borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "0 12px",
      flexShrink: 0 as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
    },
    topBarLeft: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      flexShrink: 0 as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
    },
    topBarCenter: {
      flex: 1,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
      overflow: "hidden" as const,
      padding: "0 8px",
    },
    topBarTitle: {
      fontSize: "13px",
      fontWeight: 500,
      color: isDark ? "#e8edf2" : "#111827",
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
      whiteSpace: "nowrap" as const,
      WebkitAppRegion: "drag" as const,
      appRegion: "drag" as const,
      maxWidth: "300px",
    },
    topBarRight: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "2px",
      WebkitAppRegion: "no-drag" as const,
      appRegion: "no-drag" as const,
      flexShrink: 0 as const,
    },
    windowBtn: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      width: "32px",
      height: "32px",
      background: "transparent" as const,
      border: "none" as const,
      cursor: "pointer" as const,
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: "15px",
      borderRadius: "0",
      flexShrink: 0 as const,
      WebkitAppRegion: "no-drag" as const,
      appRegion: "no-drag" as const,
    },
    content: {
      flex: 1,
      display: "flex" as const,
      flexDirection: "column" as const,
      overflow: "hidden" as const,
      minHeight: 0,
    },
    body: {
      flex: 1,
      overflowY: "auto" as const,
      fontSize: "14px",
      lineHeight: 1.8,
      color: isDark ? "#c8d0d9" : "#374151",
      padding: "20px 24px",
      maxWidth: "100%",
      wordWrap: "break-word" as const,
      overflowWrap: "break-word" as const,
      paddingTop: "0px",
    },
    markdownContent: {
      fontSize: "14px",
      lineHeight: 1.8,
      maxWidth: "100%",
      overflowX: "auto" as const,
    },
    loadingState: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      height: "100%",
      color: isDark ? "#9ca3af" : "#6b7280",
      fontSize: "14px",
    },
    errorState: {
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      height: "100%",
      color: "#ef4444",
      fontSize: "14px",
      textAlign: "center" as const,
      padding: "20px",
    },
    errorTitle: {
      fontSize: "16px",
      fontWeight: 600,
      marginBottom: "8px",
    },
    errorDetail: {
      fontSize: "13px",
      color: isDark ? "#9ca3af" : "#6b7280",
      wordBreak: "break-all" as const,
    },
    links: {
      marginTop: "20px",
      paddingTop: "16px",
      borderTop: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      display: "flex" as const,
      gap: "16px",
      flexShrink: 0 as const,
    },
    link: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      color: isDark ? "#4ec9b0" : "#0066cc",
      textDecoration: "none" as const,
      fontSize: "13px",
      cursor: "pointer" as const,
    },
  };
  return (
    <div style={styles.container}>
      <style>{scrollbarStyles}</style>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <img src={logo} alt="logo" style={{ width: 22, height: 22, borderRadius: 5 }} />
        </div>
        <div style={styles.topBarCenter}>
          <span style={styles.topBarTitle}>{isZh ? "关于" : "About"}</span>
        </div>
        <div style={styles.topBarRight}>
          <button
            style={styles.windowBtn}
            onClick={handleToggleFullscreen}
            title={isZh ? "全屏" : "Fullscreen"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#3a3f4a" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button style={styles.windowBtn} onClick={handleMinimize} title={isZh ? "最小化" : "Minimize"}>
            <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>─</span>
          </button>
          <button style={styles.windowBtn} onClick={handleMaximize} title={isZh ? (isMaximized ? "还原" : "最大化") : isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? (
              <span
                style={{
                  fontSize: "20px",
                  lineHeight: 1,
                  fontWeight: 400,
                  marginTop: "2px",
                }}
              >
                ❐
              </span>
            ) : (
              <span
                style={{
                  fontSize: "30px",
                  fontWeight: 300,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  marginTop: "-4px",
                }}
              >
                □
              </span>
            )}
          </button>
          <button
            style={styles.windowBtn}
            onClick={handleClose}
            title={isZh ? "关闭" : "Close"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.12)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={styles.content}>
        <div className="about-scroll-container" style={styles.body}>
          {isLoading ? (
            <div style={styles.loadingState}>{isZh ? "加载中..." : "Loading..."}</div>
          ) : errorMessage ? (
            <div style={styles.errorState}>
              <div style={styles.errorTitle}>❌ {isZh ? "加载失败" : "Load Failed"}</div>
              <div style={styles.errorDetail}>{errorMessage}</div>
            </div>
          ) : (
            <>
              <div style={styles.markdownContent}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    // Table with full width and 50% columns
                    table: ({ children }) => (
                      <table
                        style={{
                          borderCollapse: "collapse",
                          width: "100%",
                          margin: "12px 0",
                          fontSize: "13px",
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          tableLayout: "fixed",
                        }}
                      >
                        {children}
                      </table>
                    ),
                    // Table header cell - 50% width, centered
                    th: ({ children }) => (
                      <th
                        style={{
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          backgroundColor: isDark ? "#22252f" : "#f3f4f6",
                          color: isDark ? "#e8edf2" : "#111827",
                          width: "50%",
                        }}
                      >
                        {children}
                      </th>
                    ),
                    // Table data cell - 50% width, centered
                    td: ({ children }) => (
                      <td
                        style={{
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          padding: "8px 12px",
                          color: isDark ? "#c8d0d9" : "#374151",
                          textAlign: "center",
                          width: "50%",
                        }}
                      >
                        {children}
                      </td>
                    ),
                    // Image styling - responsive with max width
                    img: ({ src, alt }) => (
                      <img
                        src={src}
                        alt={alt}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          display: "block",
                          margin: "0 auto",
                          borderRadius: "4px",
                        }}
                      />
                    ),
                    ul: ({ children }) => (
                      <ul
                        style={{
                          paddingLeft: "24px",
                          margin: "8px 0",
                          listStyleType: "disc",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol
                        style={{
                          paddingLeft: "24px",
                          margin: "8px 0",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li
                        style={{
                          marginBottom: "4px",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {children}
                      </li>
                    ),
                    h1: ({ children }) => (
                      <h1
                        style={{
                          fontSize: "24px",
                          fontWeight: 600,
                          color: isDark ? "#e8edf2" : "#111827",
                          marginTop: "24px",
                          marginBottom: "12px",
                          borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          paddingBottom: "8px",
                        }}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: isDark ? "#e8edf2" : "#111827",
                          marginTop: "20px",
                          marginBottom: "10px",
                        }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: isDark ? "#e8edf2" : "#111827",
                          marginTop: "16px",
                          marginBottom: "8px",
                        }}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p
                        style={{
                          marginBottom: "12px",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {children}
                      </p>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        onClick={(e) => {
                          e.preventDefault();
                          if (href) {
                            openInBrowser(href);
                          }
                        }}
                        style={{
                          color: isDark ? "#4ec9b0" : "#0066cc",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {children}
                      </a>
                    ),
                    code: ({ children }) => (
                      <code
                        style={{
                          backgroundColor: isDark ? "#22252f" : "#f3f4f6",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                          color: isDark ? "#d4d4d4" : "#333",
                        }}
                      >
                        {children}
                      </code>
                    ),
                    // Handle div wrapper for alignment
                    div: ({ children, ...props }) => {
                      const style = props.style || {};
                      return (
                        <div
                          style={{
                            ...style,
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden",
                          }}
                        >
                          {children}
                        </div>
                      );
                    },
                  }}
                >
                  {markdownContent}
                </ReactMarkdown>
              </div>
              <div style={styles.links}>
                <a
                  style={styles.link}
                  onClick={(e) => {
                    e.preventDefault();
                    openInBrowser("https://github.com/HippoxHQ/About");
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  <BookOpen size={16} /> GitHub
                </a>
                <a
                  style={styles.link}
                  onClick={(e) => {
                    e.preventDefault();
                    const url = isZh ? "https://github.com/HippoxHQ/About/blob/main/About_CN.md" : "https://github.com/HippoxHQ/About/blob/main/About_EN.md";
                    openInBrowser(url);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  <Info size={16} /> {isZh ? "查看原文" : "View Original"}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default AboutWindow;
