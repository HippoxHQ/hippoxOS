import { useState, useRef, useEffect, useCallback } from "react";
const SCROLLBAR_MIN_LENGTH = 20;
const SCROLLBAR_THICKNESS = 5;
/** Custom vertical scrollbar for an inner scroll container. */
export const CustomVerticalScrollbar: React.FC<{ scrollRef: React.RefObject<HTMLDivElement | HTMLTextAreaElement | null> }> = ({ scrollRef }) => {
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
