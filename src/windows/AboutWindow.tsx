import React, { useState, useEffect } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { zh, en } from "../i18n";
import { Info, BookOpen, Maximize2, Minimize2 } from "lucide-react";
import logo from "../assets/logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
 * Fetches Markdown content from GitHub repository via CDN with cache-busting
 */
const AboutWindow: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
   * Fetch about content from GitHub via CDN based on language
   * Uses jsdelivr CDN with cache-busting query parameter
   */
  useEffect(() => {
    const fetchAboutContent = async () => {
      setIsLoading(true);
      try {
        const timestamp = Date.now();
        const cdnUrl = isZh ? `https://cdn.jsdelivr.net/gh/HippoxHQ/About@main/About_CN.md?t=${timestamp}` : `https://cdn.jsdelivr.net/gh/HippoxHQ/About@main/About_EN.md?t=${timestamp}`;
        let response = await fetch(cdnUrl, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        // Fallback to raw.githubusercontent.com
        if (!response.ok) {
          const rawUrl = isZh ? `https://raw.githubusercontent.com/HippoxHQ/About/main/About_CN.md?t=${timestamp}` : `https://raw.githubusercontent.com/HippoxHQ/About/main/About_EN.md?t=${timestamp}`;
          response = await fetch(rawUrl, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          });
        }
        if (response.ok) {
          const text = await response.text();
          if (text.trim().length === 0) {
            setMarkdownContent(getFallbackContent());
          } else {
            setMarkdownContent(text);
          }
        } else {
          setMarkdownContent(getFallbackContent());
        }
      } catch (error) {
        console.error("Failed to fetch about content:", error);
        setMarkdownContent(getFallbackContent());
      } finally {
        setIsLoading(false);
      }
    };
    fetchAboutContent();
  }, [isZh]);
  /**
   * Embedded fallback content - automatically adapts to current language
   */
  const getFallbackContent = (): string => {
    if (isZh) {
      return `# HippoxOS — 关于
HippoxOS 是一个面向 AI Agent 时代的现代化操作系统。它将大语言模型深度集成到桌面环境，重塑人机交互方式，让 AI 成为系统级原生能力。
## 核心特性
- **AI 原生体验**：LLM 深度集成于系统操作，自然语言驱动工作流
- **智能工作流**：通过技能市场（Skills Market）快速扩展系统能力
- **现代化界面**：沉浸式交互设计，流畅的多面板布局
- **全栈开发就绪**：内置代码编辑器、终端、版本控制支持
- **数据可视化**：内置图表、地图、3D 沙盒等数据呈现工具
- **视频编辑**：轻量级视频编辑能力，AI 辅助剪辑
## 子系统
| 子系统 | 说明 |
|--------|------|
| 通用对话 | 主聊天界面，LLM 交互核心 |
| 代码编辑器 | AI 辅助编程，支持 Diff 预览 |
| 图表分析 | 金融数据可视化 |
| 地图可视化 | 地理数据呈现 |
| 3D 沙盒 | Three.js 交互式 3D 场景 |
| 视频编辑 | 轻量级 AI 视频编辑 |
## 社区与联系
欢迎关注我们的官方渠道，获取最新动态并参与讨论：
- **X (Twitter)**: [@HippoxAI](https://x.com/HippoxAI)
- **Bluesky**: [@hippoxai.bsky.social](https://bsky.app/profile/hippoxai.bsky.social)
- **Medium**: [Hippox on Medium](https://hippox.medium.com/)
- **B站**: [HippoxOS 的空间](https://space.bilibili.com/9667583)
- **YouTube**: [HippoxOS 频道](https://www.youtube.com/@HippoxOS)`;
    } else {
      return `# HippoxOS — About
HippoxOS is a modern operating system built for the AI Agent era. It deeply integrates Large Language Models into the desktop environment, redefining human-computer interaction and making AI a native system capability.
## Key Features
- **AI-Native Experience**: LLM deeply integrated into system operations, natural language-driven workflows
- **Intelligent Workflows**: Extend system capabilities quickly via the Skills Market
- **Modern Interface**: Immersive interaction design with fluid multi-panel layout
- **Full-Stack Ready**: Built-in code editor, terminal, and version control support
- **Data Visualization**: Integrated charting, mapping, and 3D sandbox tools
- **Video Editing**: Lightweight video editing with AI-assisted capabilities
## Subsystems
| Subsystem | Description |
|-----------|-------------|
| General Chat | Main chat interface for LLM interaction |
| Code Editor | AI-assisted programming with Diff preview |
| Chart Analysis | Financial data visualization |
| Map Visualization | Geographic data rendering |
| 3D Sandbox | Interactive Three.js 3D scenes |
| Video Editor | Lightweight AI-powered video editing |
## Community & Connect
Follow our official channels for the latest updates and to join the discussion:
- **X (Twitter)**: [@HippoxAI](https://x.com/HippoxAI)
- **Bluesky**: [@hippoxai.bsky.social](https://bsky.app/profile/hippoxai.bsky.social)
- **Medium**: [Hippox on Medium](https://hippox.medium.com/)
- **Bilibili**: [HippoxOS Space](https://space.bilibili.com/9667583)
- **YouTube**: [HippoxOS Channel](https://www.youtube.com/@HippoxOS)`;
    }
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
  const t = (key: string) => getTranslation(language, key);
  /**
   * Window control handlers - same as MaterialPreviewWindow
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
   * Using important to ensure these styles take precedence
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
   * Styles - identical to MaterialPreviewWindow
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
      {/* Dynamic scrollbar styles - overrides global styles */}
      <style>{scrollbarStyles}</style>
      {/* Top Bar - identical to MaterialPreviewWindow */}
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
      {/* Content Body */}
      <div style={styles.content}>
        <div className="about-scroll-container" style={styles.body}>
          {isLoading ? (
            <div style={styles.loadingState}>{isZh ? "加载中..." : "Loading..."}</div>
          ) : (
            <>
              <div style={styles.markdownContent}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <table
                        style={{
                          borderCollapse: "collapse",
                          width: "100%",
                          margin: "12px 0",
                          fontSize: "13px",
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                        }}
                      >
                        {children}
                      </table>
                    ),
                    th: ({ children }) => (
                      <th
                        style={{
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          padding: "8px 12px",
                          textAlign: "left",
                          fontWeight: 600,
                          backgroundColor: isDark ? "#22252f" : "#f3f4f6",
                          color: isDark ? "#e8edf2" : "#111827",
                        }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        style={{
                          border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
                          padding: "8px 12px",
                          color: isDark ? "#c8d0d9" : "#374151",
                        }}
                      >
                        {children}
                      </td>
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
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isDark ? "#4ec9b0" : "#0066cc",
                          textDecoration: "none",
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
                  }}
                >
                  {markdownContent}
                </ReactMarkdown>
              </div>
              <div style={styles.links}>
                <a style={styles.link} href="https://github.com/HippoxHQ/About" target="_blank" rel="noopener noreferrer">
                  <BookOpen size={16} /> GitHub
                </a>
                <a style={styles.link} href={isZh ? "https://github.com/HippoxHQ/About/blob/main/About_CN.md" : "https://github.com/HippoxHQ/About/blob/main/About_EN.md"} target="_blank" rel="noopener noreferrer">
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
