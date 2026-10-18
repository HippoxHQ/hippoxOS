import React, { useState, useEffect, useRef, useCallback } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { osCommands } from "../command/os";
import { systemUpdateCommands, VersionInfo } from "../command/SystemUpdate";
import { showToast, ToastType } from "../components/Toast";
import { Info, BookOpen, Maximize2, Minimize2, X, Download, CheckCircle, ExternalLink, XCircle, Copy, Check } from "lucide-react";
import logo from "../assets/logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
/**
 * Build the platform-specific download page URL for a given release version.
 *
 * The release page structure is stable across versions:
 *   https://github.com/HippoxHQ/hippoxOS/releases/download/v{version}/hippoxOS_{platform}_{arch}{ext}
 *
 * The caller is expected to pass `os` as returned by `cmd_get_os`
 * ("windows" | "macos" | "linux" | ...) and `arch` as reported by the backend
 * VersionInfo ("x86_64" | "aarch64" | ...).
 *
 * Returns `null` when the platform/arch combination is not supported, so the
 * caller can fall back to the generic releases page.
 */
function buildReleaseDownloadUrl(version: string, os: string, arch: string): string | null {
  const normalizedOs = (os || "").toLowerCase();
  const normalizedArch = (arch || "").toLowerCase();
  // Map backend arch values onto the naming used in release asset filenames.
  const archForFilename = normalizedArch === "aarch64" || normalizedArch === "arm64" ? "aarch64" : normalizedArch === "x86_64" || normalizedArch === "x64" || normalizedArch === "amd64" ? "x86_64" : normalizedArch;
  let ext = "";
  switch (normalizedOs) {
    case "windows":
      // MSI is the canonical Windows installer referenced by the release notes.
      ext = ".msi";
      break;
    case "macos":
      ext = ".dmg";
      break;
    case "linux":
      // AppImage is the most portable Linux artifact listed in the release notes.
      ext = ".AppImage";
      break;
    default:
      return null;
  }
  if (!archForFilename) {
    return null;
  }
  return `https://github.com/HippoxHQ/hippoxOS/releases/download/v${version}/hippoxOS_${normalizedOs}_${archForFilename}${ext}`;
}
const UpdateWindow: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMacOS, setIsMacOS] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [installing, setInstalling] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);
  /**
   * Load the active theme from the backend and apply it to <html>, exactly like AboutWindow does.
   */
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme().catch(() => "dark" as const);
        document.documentElement.setAttribute("data-theme", savedTheme as string);
      } catch (error) {
        console.error("Failed to load theme:", error);
        document.documentElement.setAttribute("data-theme", "dark");
      }
    };
    loadTheme();
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const os = await osCommands.getOs();
        if (!cancelled) {
          setIsMacOS(os === "macos");
        }
      } catch (error) {
        const fallback = typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.platform || "");
        if (!cancelled) {
          setIsMacOS(fallback);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  /**
   * Load the README of the latest GitHub release.
   */
  useEffect(() => {
    const fetchReleaseReadme = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const content = await systemUpdateCommands.fetchReleaseMarkdown();
        setMarkdownContent(content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch release markdown:", error);
        setErrorMessage(`Failed to load: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReleaseReadme();
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await systemUpdateCommands.checkVersionUpdate();
        if (!cancelled) {
          setVersionInfo(info);
        }
      } catch (e) {
        console.error("[UpdateWindow] Failed to auto-check updates:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  /**
   * Clear the copy-reset timer on unmount to avoid setting state after unmount.
   */
  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    };
  }, []);
  /**
   * Open URL in system default browser using osCommands.
   */
  const openInBrowser = async (url: string) => {
    await osCommands.openBrowser(url);
  };
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await windowsCommands.windowIsMaximized("update-window");
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Failed to check window state:", error);
      }
    };
    checkMaximized();
    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);
  const handleMinimize = async () => {
    try {
      await windowsCommands.windowMinimize("update-window");
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };
  const handleMaximize = async () => {
    try {
      const isMax = await windowsCommands.windowIsMaximized("update-window");
      if (isMax) {
        await windowsCommands.windowUnmaximize("update-window");
      } else {
        await windowsCommands.windowMaximize("update-window");
      }
      const maximized = await windowsCommands.windowIsMaximized("update-window");
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  };
  const handleClose = async () => {
    try {
      await windowsCommands.windowClose("update-window");
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
   * Download the installer and launch it.
   */
  const handleInstallUpdate = async () => {
    if (installing) return;
    if (!versionInfo?.download_url) {
      showToast(ToastType.WARNING, "No download URL available. Please check for updates first.");
      return;
    }
    cancelRequestedRef.current = false;
    setInstalling(true);
    setDownloadProgress(0);
    try {
      await systemUpdateCommands.downloadAndInstallUpdate(versionInfo.download_url, (progress) => {
        // Ignore late callbacks that arrive after the user requested cancel.
        if (cancelRequestedRef.current) return;
        const clamped = Math.max(0, Math.min(100, progress));
        setDownloadProgress(clamped);
      });
      showToast(ToastType.SUCCESS, "Installer started. The app will close shortly.");
    } catch (e) {
      // A cancelled download is not an error worth shouting about.
      if (!cancelRequestedRef.current) {
        console.error("[UpdateWindow] Failed to install update:", e);
        showToast(ToastType.ERROR, "Failed to download and install the update.");
      }
      setDownloadProgress(null);
    } finally {
      setInstalling(false);
    }
  };
  /**
   * Request cancellation of the in-flight download.
   */
  const handleCancelDownload = useCallback(async () => {
    if (!installing) return;
    cancelRequestedRef.current = true;
    try {
      await systemUpdateCommands.cancelUpdataDownload();
      showToast(ToastType.INFO, "Download cancelled.");
    } catch (e) {
      console.error("[UpdateWindow] Failed to cancel download:", e);
    }
    setDownloadProgress(null);
  }, [installing]);
  /**
   * Copy the platform-specific download link to the clipboard.
   */
  const handleCopyDownloadLink = async () => {
    try {
      const currentOs = await osCommands.getOs().catch(() => "unknown");
      const version = versionInfo?.latest_version || versionInfo?.current_version || "";
      let url = versionInfo?.download_url || "";
      if (!url && version) {
        url = buildReleaseDownloadUrl(version, currentOs, versionInfo?.arch || "") || "";
      }
      if (!url) {
        // Last resort: the generic latest releases page.
        url = "https://github.com/HippoxHQ/hippoxOS/releases/latest";
      }
      await navigator.clipboard.writeText(url);
      // Inline button feedback: switch to the "Copied" state and reset after 2s.
      setLinkCopied(true);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => {
        setLinkCopied(false);
        copyResetTimerRef.current = null;
      }, 2000);
    } catch (e) {
      console.error("[UpdateWindow] Failed to copy download link:", e);
      showToast(ToastType.ERROR, "Failed to copy the download link.");
    }
  };
  const scrollbarStyles = `
    .about-scroll-container {
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) transparent;
    }
    .about-scroll-container::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .about-scroll-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .about-scroll-container::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb) !important;
      border-radius: 2px;
    }
    .about-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover) !important;
    }
  `;
  /**
   * Full-window shimmer / indeterminate progress bar.
   */
  const shimmerStyles = `
    @keyframes update-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    .update-shimmer-bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      width: 100%;
      overflow: hidden;
      background: var(--bg-tertiary);
      z-index: 100;
    }
    .update-shimmer-bar::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 40%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--accent-blue) 50%,
        transparent 100%
      );
      animation: update-shimmer 1.2s ease-in-out infinite;
    }
  `;
  const styles = {
    container: {
      position: "relative" as const,
      backgroundColor: "var(--bg-primary)",
      border: `1px solid var(--border-color)`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      overflow: "hidden" as const,
      width: "100%",
      height: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    topBar: {
      height: "35px",
      background: "var(--bg-secondary)",
      borderBottom: `1px solid var(--border-color)`,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "0 12px",
      flexShrink: 0 as const,
    },
    topBarLeft: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      flexShrink: 0 as const,
    },
    topBarCenter: {
      flex: 1,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
      padding: "0 8px",
    },
    topBarTitle: {
      fontSize: "13px",
      fontWeight: 500,
      color: "var(--text-primary)",
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
      whiteSpace: "nowrap" as const,
      maxWidth: "300px",
    },
    topBarRight: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "2px",
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
      color: "var(--text-secondary)",
      fontSize: "15px",
      borderRadius: "0",
      flexShrink: 0 as const,
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
      color: "var(--text-secondary)",
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
      color: "var(--text-muted)",
      fontSize: "14px",
    },
    errorState: {
      display: "flex" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      height: "100%",
      color: "var(--accent-red)",
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
      color: "var(--text-muted)",
      wordBreak: "break-all" as const,
    },
    links: {
      marginTop: "20px",
      paddingTop: "16px",
      borderTop: `1px solid var(--border-color)`,
      display: "flex" as const,
      gap: "16px",
      flexShrink: 0 as const,
    },
    link: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      color: "var(--accent-blue)",
      textDecoration: "none" as const,
      fontSize: "13px",
      cursor: "pointer" as const,
    },
    actionBar: {
      padding: "12px 24px",
      borderTop: `1px solid var(--border-color)`,
      background: "var(--bg-secondary)",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "flex-end" as const,
      gap: "10px",
      flexShrink: 0 as const,
    },
    actionButton: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "6px",
      border: `1px solid var(--border-color)`,
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontSize: "13px",
      cursor: "pointer" as const,
      transition: "all 0.2s",
    },
    primaryActionButton: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "6px",
      border: "none" as const,
      background: "var(--accent-blue)",
      color: "#ffffff",
      fontSize: "13px",
      cursor: "pointer" as const,
      transition: "all 0.2s",
    },
    cancelActionButton: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "6px",
      border: `1px solid var(--accent-red, #ff4444)`,
      background: "transparent",
      color: "var(--accent-red, #ff4444)",
      fontSize: "13px",
      cursor: "pointer" as const,
      transition: "all 0.2s",
    },
    upToDateText: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      fontSize: "13px",
      color: "var(--accent-green)",
    },
  };
  return (
    <div style={styles.container}>
      <style>{scrollbarStyles}</style>
      <style>{shimmerStyles}</style>
      <div style={styles.topBar} data-tauri-drag-region="deep">
        <div style={styles.topBarLeft}>
          <img src={logo} alt="logo" style={{ width: 22, height: 22, borderRadius: 5 }} />
        </div>
        <div style={styles.topBarCenter}>
          <span style={styles.topBarTitle}>
            Update
            {versionInfo ? ` · ${versionInfo.current_version}${versionInfo.has_update ? ` → ${versionInfo.latest_version}` : " (latest)"}` : ""}
          </span>
        </div>
        <div style={styles.topBarRight}>
          {!isMacOS && (
            <>
              <button
                style={styles.windowBtn}
                onClick={handleToggleFullscreen}
                title="Fullscreen"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button style={styles.windowBtn} onClick={handleMinimize} title="Minimize">
                <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>─</span>
              </button>
              <button style={styles.windowBtn} onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? (
                  <span style={{ fontSize: "20px", lineHeight: 1, fontWeight: 400, marginTop: "2px" }}>❐</span>
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
                title="Close"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                  e.currentTarget.style.color = "var(--accent-red)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <X />
              </button>
            </>
          )}
        </div>
      </div>
      <div style={styles.content}>
        <div className="about-scroll-container" style={styles.body}>
          {isLoading ? (
            <div style={styles.loadingState}>Loading...</div>
          ) : errorMessage ? (
            <div style={styles.errorState}>
              <div style={styles.errorTitle}>❌ Load Failed</div>
              <div style={styles.errorDetail}>{errorMessage}</div>
            </div>
          ) : (
            <>
              <div style={styles.markdownContent}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    table: ({ children }) => (
                      <table
                        style={{
                          borderCollapse: "collapse",
                          width: "100%",
                          margin: "12px 0",
                          fontSize: "13px",
                          border: `1px solid var(--border-color)`,
                          tableLayout: "fixed",
                        }}
                      >
                        {children}
                      </table>
                    ),
                    th: ({ children }) => (
                      <th
                        style={{
                          border: `1px solid var(--border-color)`,
                          padding: "8px 12px",
                          textAlign: "center",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          width: "50%",
                        }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        style={{
                          border: `1px solid var(--border-color)`,
                          padding: "8px 12px",
                          color: "var(--text-secondary)",
                          textAlign: "center",
                          width: "50%",
                        }}
                      >
                        {children}
                      </td>
                    ),
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
                          color: "var(--text-primary)",
                          marginTop: "24px",
                          marginBottom: "12px",
                          borderBottom: `1px solid var(--border-color)`,
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
                          color: "var(--text-primary)",
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
                          color: "var(--text-primary)",
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
                          color: "var(--accent-blue)",
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
                          backgroundColor: "var(--bg-secondary)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                          color: "var(--text-primary)",
                        }}
                      >
                        {children}
                      </code>
                    ),
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
                    openInBrowser("https://github.com/HippoxHQ/hippoxOS");
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
                    openInBrowser("https://github.com/HippoxHQ/hippoxOS/releases/latest");
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  <Info size={16} /> View Releases
                </a>
              </div>
            </>
          )}
        </div>
        <div style={styles.actionBar}>
          <button
            onClick={handleInstallUpdate}
            disabled={installing}
            style={{
              ...styles.primaryActionButton,
              opacity: installing ? 0.6 : 1,
              cursor: installing ? "not-allowed" : "pointer",
            }}
          >
            <Download size={14} />
            {installing ? "Downloading…" : "Download & Install"}
          </button>
          {installing && (
            <button onClick={handleCancelDownload} style={styles.cancelActionButton}>
              <XCircle size={14} />
              Cancel
            </button>
          )}
          <button
            onClick={handleCopyDownloadLink}
            style={styles.actionButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-primary)";
            }}
          >
            {linkCopied ? <Check size={14} /> : <Copy size={14} />}
            {linkCopied ? "Copied" : "Copy download link"}
          </button>
          {versionInfo && !versionInfo.has_update && !installing && (
            <span style={styles.upToDateText}>
              <CheckCircle size={14} />
              Up to date
            </span>
          )}
        </div>
      </div>
      {installing && <div className="update-shimmer-bar" />}
    </div>
  );
};
export default UpdateWindow;
