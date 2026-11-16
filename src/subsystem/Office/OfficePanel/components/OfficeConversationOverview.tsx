import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, FileText, Clock, FolderOpen, ChevronRight } from "lucide-react";
import { OFFICE_TURNS, ConversationTurn } from "../../OfficeMockData";
import { dispatchOfficeSelectConversation } from "../../OfficeWindowEventManager";
/**
 * Props for the OfficeConversationOverview component.
 */
export interface OfficeConversationOverviewProps {
  /** i18n translator */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Language code */
  language?: "zh" | "en";
  /** Current session id, forwarded with the selected-conversation event. */
  sessionId?: string;
  /** Optional external className / style. */
  className?: string;
  style?: React.CSSProperties;
}
/** Icon for a file kind. */
function FileKindIcon() {
  return <FileText size={12} />;
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
 * Conversation-turn overview for the office assistant session.
 */
const OfficeConversationOverview: React.FC<OfficeConversationOverviewProps> = ({ t = (key: string) => key, language = "en", sessionId = "", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  const [activeTurnId, setActiveTurnId] = useState<string | null>(OFFICE_TURNS[0]?.id ?? null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  /** Dispatch the initial selection once on mount so tabs open for turn 1. */
  useEffect(() => {
    if (!OFFICE_TURNS[0]) return;
    dispatchOfficeSelectConversation(sessionId, OFFICE_TURNS[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  const handleSelectTurn = useCallback(
    (turn: ConversationTurn) => {
      setActiveTurnId(turn.id);
      dispatchOfficeSelectConversation(sessionId, turn.id);
    },
    [sessionId],
  );
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          height: "41px",
          minHeight: "41px",
          padding: "0 12px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        <MessageSquare size={13} />
        {isZh ? "会话概览" : "Session Overview"}
        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 400, color: "var(--text-tertiary)" }}>{`${OFFICE_TURNS.length} ${isZh ? "轮" : "turns"}`}</span>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div
          ref={listScrollRef}
          style={{
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "4px 0",
            paddingRight: `${SCROLLBAR_THICKNESS}px`,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="office-overview-scroll"
        >
          {OFFICE_TURNS.map((turn) => {
            const active = turn.id === activeTurnId;
            return (
              <button
                key={turn.id}
                type="button"
                onClick={() => handleSelectTurn(turn)}
                title={turn.summary}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  width: "100%",
                  padding: "8px 10px",
                  background: active ? "var(--hover-bg)" : "transparent",
                  border: "none",
                  borderLeft: active ? "2px solid var(--accent-color)" : "2px solid transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%", minWidth: 0 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{turn.summary}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "9px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                    <Clock size={9} />
                    {turn.timeLabel}
                  </span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", minWidth: 0 }}>
                  {turn.files.map((f) => (
                    <span key={f.id} style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%", minWidth: 0 }}>
                      <FileKindIcon />
                      <span style={{ flex: 1, minWidth: 0, fontSize: "10px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                    </span>
                  ))}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", color: "var(--text-tertiary)" }}>
                  <FolderOpen size={9} />
                  {`${turn.files.length} ${isZh ? "个文件" : "files"}`}
                  <ChevronRight size={10} style={{ marginLeft: "auto" }} />
                </span>
              </button>
            );
          })}
        </div>
        <CustomVerticalScrollbar scrollRef={listScrollRef} />
        <style>{`
          .office-overview-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
        `}</style>
      </div>
    </div>
  );
};
export default OfficeConversationOverview;
