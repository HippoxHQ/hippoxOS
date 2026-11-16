import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, X, FolderOpen, FileSpreadsheet, FileImage, Presentation } from "lucide-react";
import { onOfficeSelectConversation } from "../../OfficeWindowEventManager";
import { getTurnById, OFFICE_FILE_COMPONENTS, OfficeFile, OfficeFileKind } from "../../OfficeMockData";
/**
 * Props for the OfficeFileTabs component.
 */
export interface OfficeFileTabsProps {
  /** i18n translator */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Language code */
  language?: "zh" | "en";
  /** Current session id; events from other sessions are ignored. */
  sessionId?: string;
  /** Optional external className / style. */
  className?: string;
  style?: React.CSSProperties;
}
/** Icon for a file kind. */
function FileKindIcon({ kind }: { kind: OfficeFileKind }) {
  switch (kind) {
    case "doc":
      return <FileText size={12} />;
    case "sheet":
      return <FileSpreadsheet size={12} />;
    case "slides":
      return <Presentation size={12} />;
    case "pdf":
      return <FileImage size={12} />;
    default:
      return <FileText size={12} />;
  }
}
/** Context menu state for a tab. */
interface TabContextMenuState {
  fileId: string;
  x: number;
  y: number;
}
/** Custom scrollbar geometry constants. */
const SCROLLBAR_THICKNESS = 5;
const SCROLLBAR_MIN_LENGTH = 20;
/**
 * Custom vertical scrollbar for an inner scroll container.
 */
const CustomVerticalScrollbar: React.FC<{ scrollRef: React.RefObject<HTMLDivElement | null> }> = ({ scrollRef }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [metrics, setMetrics] = useState({ thumbHeight: 0, trackHeight: 0, canScroll: false });
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const moveRef = useRef<(e: MouseEvent) => void>(() => {});
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollHeight, clientHeight } = el;
      const trackHeight = Math.max(clientHeight, 0);
      const canScroll = scrollHeight > clientHeight;
      const thumbHeight = canScroll ? Math.max(Math.min((clientHeight / scrollHeight) * trackHeight, trackHeight), SCROLLBAR_MIN_LENGTH) : 0;
      setMetrics({ thumbHeight, trackHeight, canScroll });
      setScrollTop(el.scrollTop);
    };
    update();
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, [scrollRef]);
  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const deltaY = e.clientY - startYRef.current;
      const maxScrollTop = el.scrollHeight - el.clientHeight;
      const scrollableTrackHeight = Math.max(metrics.trackHeight - metrics.thumbHeight, 0);
      if (scrollableTrackHeight <= 0) return;
      const scrollDelta = (deltaY / scrollableTrackHeight) * maxScrollTop;
      el.scrollTop = Math.max(0, Math.min(maxScrollTop, startScrollTopRef.current + scrollDelta));
      setScrollTop(el.scrollTop);
    },
    [scrollRef, metrics],
  );
  useEffect(() => {
    moveRef.current = onMove;
  }, [onMove]);
  const onUp = useCallback(() => {
    draggingRef.current = false;
    document.removeEventListener("mousemove", moveRef.current);
    document.removeEventListener("mouseup", onUp);
  }, []);
  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = scrollRef.current;
      if (!el) return;
      draggingRef.current = true;
      startYRef.current = e.clientY;
      startScrollTopRef.current = el.scrollTop;
      document.addEventListener("mousemove", moveRef.current);
      document.addEventListener("mouseup", onUp);
    },
    [scrollRef, onUp],
  );
  if (!metrics.canScroll) return null;
  const maxScrollTop = Math.max((scrollRef.current?.scrollHeight ?? 0) - (scrollRef.current?.clientHeight ?? 0), 1);
  const movable = Math.max(metrics.trackHeight - metrics.thumbHeight, 0);
  const thumbTop = (scrollTop / maxScrollTop) * movable;
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: `${SCROLLBAR_THICKNESS}px`,
        zIndex: 5,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: `${thumbTop}px`,
          right: 0,
          width: `${SCROLLBAR_THICKNESS}px`,
          height: `${metrics.thumbHeight}px`,
          background: "var(--border-color)",
          borderRadius: "4px",
          pointerEvents: "auto",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseDown={onDown}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--text-tertiary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--border-color)";
        }}
      />
    </div>
  );
};
/**
 * Browser-style tabbed file viewer.
 */
const OfficeFileTabs: React.FC<OfficeFileTabsProps> = ({ t = (key: string) => key, language = "en", sessionId = "", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  /** Open tabs, resolved from the selected turn's files. */
  const [openTabs, setOpenTabs] = useState<OfficeFile[]>([]);
  /** Currently active tab file id. */
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  /** Tab right-click context menu. */
  const [tabMenu, setTabMenu] = useState<TabContextMenuState | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  /** Scroll container for the tab bar (horizontal scrollbar custom handling). */
  const [tabBarScrollLeft, setTabBarScrollLeft] = useState(0);
  const [tabBarMetrics, setTabBarMetrics] = useState({ thumbWidth: 0, trackWidth: 0, canScroll: false });
  const tabBarDraggingRef = useRef(false);
  const tabBarStartXRef = useRef(0);
  const tabBarStartScrollLeftRef = useRef(0);
  /**
   * React to the select-conversation event.
   */
  useEffect(() => {
    const unsubscribe = onOfficeSelectConversation((event) => {
      const { sessionId: eventSessionId, turnId } = event.detail || {};
      if (eventSessionId && sessionId && eventSessionId !== sessionId) return;
      const turn = getTurnById(turnId);
      if (!turn) {
        setOpenTabs([]);
        setActiveTabId(null);
        return;
      }
      // Switching turns clears all previous tabs and opens only this turn's files.
      const files = turn.files.slice();
      setOpenTabs(files);
      setActiveTabId(files[0]?.id ?? null);
    });
    return unsubscribe;
  }, [sessionId]);
  /** Close the tab context menu on any outside click / resize / scroll. */
  useEffect(() => {
    if (!tabMenu) return;
    const close = () => setTabMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [tabMenu]);
  /** Recompute the tab bar horizontal scrollbar metrics. */
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const update = () => {
      const { scrollWidth, clientWidth } = el;
      const trackWidth = Math.max(clientWidth, 0);
      const canScroll = scrollWidth > clientWidth;
      const thumbWidth = canScroll ? Math.max(Math.min((clientWidth / scrollWidth) * trackWidth, trackWidth), SCROLLBAR_MIN_LENGTH) : 0;
      setTabBarMetrics({ thumbWidth, trackWidth, canScroll });
      setTabBarScrollLeft(el.scrollLeft);
    };
    update();
    const onScroll = () => setTabBarScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  /** Horizontal scrollbar drag handlers for the tab bar. */
  const handleTabBarScrollbarMove = useCallback(
    (e: MouseEvent) => {
      if (!tabBarDraggingRef.current) return;
      const el = tabBarRef.current;
      if (!el) return;
      const deltaX = e.clientX - tabBarStartXRef.current;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const scrollableTrackWidth = Math.max(tabBarMetrics.trackWidth - tabBarMetrics.thumbWidth, 0);
      if (scrollableTrackWidth <= 0) return;
      const scrollDelta = (deltaX / scrollableTrackWidth) * maxScrollLeft;
      el.scrollLeft = Math.max(0, Math.min(maxScrollLeft, tabBarStartScrollLeftRef.current + scrollDelta));
      setTabBarScrollLeft(el.scrollLeft);
    },
    [tabBarMetrics],
  );
  useEffect(() => {
    if (!tabBarDraggingRef.current) return;
    document.addEventListener("mousemove", handleTabBarScrollbarMove);
    return () => document.removeEventListener("mousemove", handleTabBarScrollbarMove);
  }, [handleTabBarScrollbarMove]);
  const handleTabBarScrollbarMouseUp = useCallback(() => {
    tabBarDraggingRef.current = false;
    document.removeEventListener("mousemove", handleTabBarScrollbarMove);
    document.removeEventListener("mouseup", handleTabBarScrollbarMouseUp);
  }, [handleTabBarScrollbarMove]);
  const handleTabBarScrollbarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = tabBarRef.current;
      if (!el) return;
      tabBarDraggingRef.current = true;
      tabBarStartXRef.current = e.clientX;
      tabBarStartScrollLeftRef.current = el.scrollLeft;
      document.addEventListener("mousemove", handleTabBarScrollbarMove);
      document.addEventListener("mouseup", handleTabBarScrollbarMouseUp);
    },
    [handleTabBarScrollbarMove, handleTabBarScrollbarMouseUp],
  );
  /** Close a single tab. */
  const handleCloseTab = useCallback(
    (fileId: string) => {
      setOpenTabs((prev) => {
        const idx = prev.findIndex((f) => f.id === fileId);
        const next = prev.filter((f) => f.id !== fileId);
        if (activeTabId === fileId) {
          if (next.length === 0) setActiveTabId(null);
          else setActiveTabId(next[Math.min(idx, next.length - 1)].id);
        }
        return next;
      });
    },
    [activeTabId],
  );
  /** Close all tabs except the given one. */
  const handleCloseOthers = useCallback((fileId: string) => {
    setOpenTabs((prev) => {
      const keep = prev.find((f) => f.id === fileId);
      if (!keep) return prev;
      setActiveTabId(keep.id);
      return [keep];
    });
  }, []);
  /** Close all tabs to the right of the given one. */
  const handleCloseToRight = useCallback((fileId: string) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((f) => f.id === fileId);
      if (idx < 0) return prev;
      return prev.slice(0, idx + 1);
    });
  }, []);
  const handleTabContextMenu = useCallback((e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabMenu({ fileId, x: e.clientX, y: e.clientY });
  }, []);
  const activeTab = useMemo(() => openTabs.find((f) => f.id === activeTabId) ?? null, [openTabs, activeTabId]);
  /**
   * Resolve the renderer component for the active tab's file kind.
   */
  const ActiveFileComponent = useMemo(() => {
    if (!activeTab) return null;
    return OFFICE_FILE_COMPONENTS[activeTab.kind] ?? null;
  }, [activeTab]);
  // Tab bar horizontal scrollbar geometry.
  const tabBarMaxScrollLeft = Math.max((tabBarRef.current?.scrollWidth ?? 0) - (tabBarRef.current?.clientWidth ?? 0), 1);
  const tabBarMovable = Math.max(tabBarMetrics.trackWidth - tabBarMetrics.thumbWidth, 0);
  const tabBarThumbLeft = (tabBarScrollLeft / tabBarMaxScrollLeft) * tabBarMovable;
  return (
    <div className={className} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden", ...style }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          ref={tabBarRef}
          style={{
            height: "41px",
            minHeight: "41px",
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="office-tab-bar"
        >
          {openTabs.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: "11px", color: "var(--text-tertiary)" }}>{isZh ? "从左侧选择一轮对话以打开其文件" : "Pick a turn on the left to open its files"}</div>
          ) : (
            openTabs.map((f) => {
              const active = f.id === activeTabId;
              return (
                <div
                  key={f.id}
                  onClick={() => setActiveTabId(f.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, f.id)}
                  title={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 8px 0 10px",
                    maxWidth: "200px",
                    minWidth: "90px",
                    borderRight: "1px solid var(--border-color)",
                    background: active ? "var(--bg-primary)" : "transparent",
                    borderTop: active ? "2px solid var(--accent-color)" : "2px solid transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <FileKindIcon kind={f.kind} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(f.id);
                    }}
                    title={isZh ? "关闭" : "Close"}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "3px",
                      border: "none",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })
          )}
        </div>
        {tabBarMetrics.canScroll && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${SCROLLBAR_THICKNESS}px`,
              zIndex: 5,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: `${tabBarThumbLeft}px`,
                bottom: 0,
                width: `${tabBarMetrics.thumbWidth}px`,
                height: `${SCROLLBAR_THICKNESS}px`,
                background: "var(--border-color)",
                borderRadius: "4px",
                pointerEvents: "auto",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseDown={handleTabBarScrollbarMouseDown}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--text-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--border-color)";
              }}
            />
          </div>
        )}
        <style>{`
          .office-tab-bar::-webkit-scrollbar { display: none; width: 0; height: 0; }
        `}</style>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {activeTab && ActiveFileComponent ? (
          <ActiveFileComponent fileName={activeTab.name} t={t} language={language} style={{ width: "100%", height: "100%" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px", color: "var(--text-tertiary)" }}>
            <FolderOpen size={28} />
            <div style={{ fontSize: "12px" }}>{isZh ? "暂无打开的文件" : "No file opened"}</div>
            <div style={{ fontSize: "11px", opacity: 0.7 }}>{isZh ? "在左侧选择一轮对话，即可打开该轮涉及的文件" : "Select a conversation turn on the left to open its files"}</div>
          </div>
        )}
      </div>
      {tabMenu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: tabMenu.x,
            top: tabMenu.y,
            minWidth: "160px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.24), 0 2px 6px rgba(0,0,0,0.12)",
            zIndex: 1200,
            overflow: "hidden",
            userSelect: "none",
            padding: "4px",
          }}
        >
          <TabMenuItem
            label={isZh ? "删除" : "Close"}
            onClick={() => {
              handleCloseTab(tabMenu.fileId);
              setTabMenu(null);
            }}
          />
          <TabMenuItem
            label={isZh ? "删除其他" : "Close Others"}
            onClick={() => {
              handleCloseOthers(tabMenu.fileId);
              setTabMenu(null);
            }}
          />
          <TabMenuItem
            label={isZh ? "删除右侧" : "Close to the Right"}
            onClick={() => {
              handleCloseToRight(tabMenu.fileId);
              setTabMenu(null);
            }}
          />
        </div>
      )}
      <style>{`
        .office-tab-bar::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>
    </div>
  );
};
/** A context-menu item used by the tab menu. */
const TabMenuItem: React.FC<{ label: string; onClick: () => void; danger?: boolean }> = ({ label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{ display: "block", width: "100%", padding: "6px 8px", textAlign: "left", fontSize: "12px", background: "transparent", border: "none", borderRadius: "4px", color: danger ? "#e5484d" : "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    {label}
  </button>
);
export default OfficeFileTabs;
