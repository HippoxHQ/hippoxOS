import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { configCommands } from "../command/config";
import { zh, en } from "../i18n";
import CommonDropdown from "../components/CommonDropdown";
import { NumberInput } from "../components/NumberInput";
import { videoEditorStateManager } from "../subsystem/VideoEditor/global";
import { WINDOW_EVENTS } from "../subsystem/VideoEditor/WindowEventManager";
/**
 * A rectangular capture region expressed in CSS pixels relative to the top‑left corner of the overlay.
 */
interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/**
 * Props for the region‑selection overlay.
 */
interface RegionSelectWindowProps {
  /** Called once the user confirms a region. */
  onConfirm?: (region: SelectionRect) => void;
  /** Called when the user cancels (Esc or Cancel button). */
  onCancel?: () => void;
}
/**
 * Size of the corner / edge resize handles, in pixels.
 */
const HANDLE_SIZE = 12;
/**
 * Thickness of the dashed selection border, in pixels.
 */
const BORDER_WIDTH = 2;
/**
 * Minimum size of the selection rectangle, in pixels.
 */
const MIN_SELECTION = 20;
/**
 * Default size of the selection rectangle, in pixels.
 */
const DEFAULT_SELECTION_WIDTH = 640;
const DEFAULT_SELECTION_HEIGHT = 360;
/**
 * localStorage key used to persist the last selection rectangle.
 */
const STORAGE_KEY_LAST_RECT = "region-select:last-rect";
/**
 * Preset resolutions shown in the toolbar dropdown.
 */
const RESOLUTION_PRESETS: Array<{ value: string; label: string; width: number; height: number }> = [
  { value: "480p", label: "480p (854×480)", width: 854, height: 480 },
  { value: "720p", label: "720p (1280×720)", width: 1280, height: 720 },
  { value: "1080p", label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { value: "1440p", label: "1440p (2560×1440)", width: 2560, height: 1440 },
  { value: "2160p", label: "2160p (3840×2160)", width: 3840, height: 2160 },
];
/**
 * Width of the toolbar, in pixels.
 */
const TOOLBAR_WIDTH = 480;
/**
 * Height of the toolbar, in pixels.
 */
const TOOLBAR_HEIGHT = 40;
/**
 * Which edge / corner is being dragged.
 */
type DragMode = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;
/**
 * Module‑level cache for theme / language, mirroring the pattern used by SystemTrayWindow so first paint uses the correct palette.
 */
let cachedTheme: "dark" | "light" = "dark";
let cachedLanguage: "zh" | "en" = "en";
/**
 * Resolve a dotted i18n key against the active translation table.
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
 * Safely read the persisted selection rect from localStorage.
 */
const readStoredRect = (): SelectionRect | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LAST_RECT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SelectionRect>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number" || typeof parsed.width !== "number" || typeof parsed.height !== "number") {
      return null;
    }
    return {
      x: parsed.x,
      y: parsed.y,
      width: parsed.width,
      height: parsed.height,
    };
  } catch {
    return null;
  }
};
/**
 * Persist the given selection rect to localStorage.
 */
const writeStoredRect = (rect: SelectionRect) => {
  try {
    window.localStorage.setItem(STORAGE_KEY_LAST_RECT, JSON.stringify(rect));
  } catch {
    // Non-fatal: storage may be unavailable.
  }
};
/**
 * Clamp a rect to fit inside the given viewport size.
 */
const clampRectToViewport = (rect: SelectionRect, vw: number, vh: number): SelectionRect => {
  const width = Math.max(MIN_SELECTION, Math.min(vw, rect.width));
  const height = Math.max(MIN_SELECTION, Math.min(vh, rect.height));
  const x = Math.max(0, Math.min(vw - width, rect.x));
  const y = Math.max(0, Math.min(vh - height, rect.y));
  return { x, y, width, height };
};
/**
 * Region‑selection overlay.
 */
const RegionSelectWindow: React.FC<RegionSelectWindowProps> = ({ onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  // Guards against double‑closing the window (Cancel button + Esc, or repeated clicks).
  const isClosingRef = useRef(false);
  // Theme + language, seeded from the module cache for instant first paint.
  const [theme, setTheme] = useState<"dark" | "light">(cachedTheme);
  const [language, setLanguage] = useState<"zh" | "en">(cachedLanguage);
  // Current selection rectangle, in CSS pixels relative to the overlay.
  const [rect, setRect] = useState<SelectionRect | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  // Active drag mode and the pointer anchor used while dragging.
  const dragModeRef = useRef<DragMode>(null);
  const dragStartRef = useRef<{ px: number; py: number; rect: SelectionRect } | null>(null);
  // Pixel input values, kept in sync with the rectangle.
  const [inputWidth, setInputWidth] = useState<string>("");
  const [inputHeight, setInputHeight] = useState<string>("");
  const [preset, setPreset] = useState<string>("");
  /**
   * Force every layer of the document to be fully transparent so the desktop shows through outside the selection.
   */
  useEffect(() => {
    const targets: HTMLElement[] = [];
    if (document.documentElement) targets.push(document.documentElement);
    if (document.body) targets.push(document.body);
    const rootEl = document.getElementById("root");
    if (rootEl) targets.push(rootEl);
    const previous: Array<{ el: HTMLElement; bg: string; bgImage: string }> = [];
    for (const el of targets) {
      previous.push({
        el,
        bg: el.style.background,
        bgImage: el.style.backgroundImage,
      });
      el.style.setProperty("background", "transparent", "important");
      el.style.setProperty("background-color", "transparent", "important");
      el.style.setProperty("background-image", "none", "important");
    }
    return () => {
      for (const entry of previous) {
        entry.el.style.background = entry.bg;
        entry.el.style.backgroundImage = entry.bgImage;
      }
    };
  }, []);
  /**
   * Load theme / language from config and subscribe to live theme changes.
   */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", cachedTheme);
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme(), configCommands.getSettingsLanguage()]);
        const nextTheme = savedTheme as "dark" | "light";
        const nextLanguage = savedLanguage as "zh" | "en";
        if (nextTheme !== cachedTheme) {
          cachedTheme = nextTheme;
          setTheme(nextTheme);
          document.documentElement.setAttribute("data-theme", nextTheme);
        }
        if (nextLanguage !== cachedLanguage) {
          cachedLanguage = nextLanguage;
          setLanguage(nextLanguage);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadData();
    // Listen for theme changes broadcast from the main window.
    let unlistenTheme: (() => void) | undefined;
    (async () => {
      try {
        unlistenTheme = await listen<{ themeId: string }>("theme-changed", (event) => {
          const id = event.payload?.themeId;
          if (!id) return;
          const nextTheme: "dark" | "light" = id === "light" || id === "pink-light" ? "light" : "dark";
          cachedTheme = nextTheme;
          setTheme(nextTheme);
          document.documentElement.setAttribute("data-theme", id);
        });
      } catch {
        // Non‑fatal.
      }
    })();
    return () => {
      if (unlistenTheme) unlistenTheme();
    };
  }, []);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  /**
   * Initialise the selection rectangle once the overlay has mounted and the viewport size is known.
   */
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const stored = readStoredRect();
    if (stored) {
      const clamped = clampRectToViewport(stored, vw, vh);
      setRect(clamped);
      videoEditorStateManager.setScreenRecordRect(clamped.x, clamped.y, clamped.width, clamped.height);
      void emit(WINDOW_EVENTS.REGION_RECT_CHANGED, clamped);
      return;
    }
    // Fall back to the shared state if it already holds a non-zero rect.
    const shared = videoEditorStateManager.getScreenRecordRect();
    if (shared.width > 0 && shared.height > 0) {
      const clamped = clampRectToViewport(shared, vw, vh);
      setRect(clamped);
      videoEditorStateManager.setScreenRecordRect(clamped.x, clamped.y, clamped.width, clamped.height);
      // Broadcast the shared rect so the main window previews it immediately.
      void emit(WINDOW_EVENTS.REGION_RECT_CHANGED, clamped);
      return;
    }
    const w = Math.min(DEFAULT_SELECTION_WIDTH, Math.max(MIN_SELECTION, vw - 80));
    const h = Math.min(DEFAULT_SELECTION_HEIGHT, Math.max(MIN_SELECTION, vh - 80));
    const fallback: SelectionRect = {
      x: Math.round((vw - w) / 2),
      y: Math.round((vh - h) / 2),
      width: w,
      height: h,
    };
    setRect(fallback);
    videoEditorStateManager.setScreenRecordRect(fallback.x, fallback.y, fallback.width, fallback.height);
    void emit(WINDOW_EVENTS.REGION_RECT_CHANGED, fallback);
  }, []);
  /**
   * Keep the numeric inputs in sync with the rectangle.
   */
  useEffect(() => {
    if (!rect) return;
    setInputWidth(String(Math.round(rect.width)));
    setInputHeight(String(Math.round(rect.height)));
  }, [rect]);
  useEffect(() => {
    if (!rect) return;
    writeStoredRect(rect);
    videoEditorStateManager.setScreenRecordRect(rect.x, rect.y, rect.width, rect.height);
    void emit(WINDOW_EVENTS.REGION_RECT_CHANGED, rect);
  }, [rect]);
  /**
   * Active translation helper bound to the current language.
   */
  const t = useCallback((key: string) => getTranslation(language, key), [language]);
  const isZh = language === "zh";
  /**
   * Close the overlay.
   */
  const closeOverlay = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    // 1) Let the parent tear down its region state first.
    if (onCancel) onCancel();
    // 2) Then close the OS window.
    try {
      await getCurrentWindow().close();
    } catch {
      // Ignore: the window may already be gone.
    }
  }, [onCancel]);
  /**
   * Confirm the current selection.
   */
  const confirmSelection = useCallback(async () => {
    if (!rect) return;
    // Persist one more time so the very latest rect is stored.
    writeStoredRect(rect);
    // Mirror the very latest rect into the shared state as well.
    videoEditorStateManager.setScreenRecordRect(rect.x, rect.y, rect.width, rect.height);
    // Broadcast one final time so the preview uses the confirmed rect.
    void emit(WINDOW_EVENTS.REGION_RECT_CHANGED, rect);
    // Switch the overlay into "border only" mode.
    setConfirmed(true);
    // Hand the selection to the parent.
    if (onConfirm) onConfirm(rect);
    // Make the OS window ignore all mouse events so clicks pass through to whatever is underneath (desktop icons, other apps).
    try {
      await getCurrentWindow().setIgnoreCursorEvents(true);
    } catch (err) {
      console.error("[RegionSelectWindow] setIgnoreCursorEvents failed:", err);
    }
  }, [onConfirm, rect]);
  /**
   * Leave "confirmed" mode and let the user edit the selection again.
   */
  const editSelection = useCallback(async () => {
    try {
      await getCurrentWindow().setIgnoreCursorEvents(false);
    } catch (err) {
      console.error("[RegionSelectWindow] setIgnoreCursorEvents(false) failed:", err);
    }
    setConfirmed(false);
  }, []);
  /**
   * Global pointer handlers for dragging / resizing the rectangle.
   */
  const beginDrag = useCallback(
    (mode: DragMode, e: React.PointerEvent<HTMLDivElement>) => {
      if (confirmed) return;
      if (!rect || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      dragModeRef.current = mode;
      dragStartRef.current = {
        px: e.clientX,
        py: e.clientY,
        rect: { ...rect },
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore.
      }
    },
    [confirmed, rect],
  );
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const mode = dragModeRef.current;
      const anchor = dragStartRef.current;
      if (!mode || !anchor) return;
      const dx = e.clientX - anchor.px;
      const dy = e.clientY - anchor.py;
      const start = anchor.rect;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let next: SelectionRect = { ...start };
      if (mode === "move") {
        next.x = Math.min(Math.max(0, start.x + dx), vw - start.width);
        next.y = Math.min(Math.max(0, start.y + dy), vh - start.height);
      } else {
        // Resize: adjust the appropriate edges, then normalise.
        let left = start.x;
        let top = start.y;
        let right = start.x + start.width;
        let bottom = start.y + start.height;
        if (mode.includes("w")) left = Math.min(start.x + dx, right - MIN_SELECTION);
        if (mode.includes("e")) right = Math.max(start.x + start.width + dx, left + MIN_SELECTION);
        if (mode.includes("n")) top = Math.min(start.y + dy, bottom - MIN_SELECTION);
        if (mode.includes("s")) bottom = Math.max(start.y + start.height + dy, top + MIN_SELECTION);
        // Clamp to the viewport.
        left = Math.max(0, left);
        top = Math.max(0, top);
        right = Math.min(vw, right);
        bottom = Math.min(vh, bottom);
        next = {
          x: left,
          y: top,
          width: Math.max(MIN_SELECTION, right - left),
          height: Math.max(MIN_SELECTION, bottom - top),
        };
      }
      setRect(next);
    };
    const onUp = () => {
      dragModeRef.current = null;
      dragStartRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);
  /**
   * Escape cancels, Enter confirms.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void closeOverlay();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!confirmed) {
          void confirmSelection();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOverlay, confirmSelection, confirmed]);
  /**
   * Listen for the REGION_SELECT_CLOSE event broadcast by the main
   * window when the user presses Stop. Without this the dashed
   * selection border would linger on screen after recording ends.
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen(WINDOW_EVENTS.REGION_SELECT_CLOSE, () => {
          void closeOverlay();
        });
      } catch {}
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [closeOverlay]);
  /**
   * Apply a width / height typed into the toolbar inputs.
   */
  const applyInputSize = useCallback(() => {
    if (!rect) return;
    const w = Math.max(MIN_SELECTION, Math.min(window.innerWidth, Number(inputWidth) || rect.width));
    const h = Math.max(MIN_SELECTION, Math.min(window.innerHeight, Number(inputHeight) || rect.height));
    setRect((prev) => {
      if (!prev) return prev;
      return {
        x: Math.min(prev.x, window.innerWidth - w),
        y: Math.min(prev.y, window.innerHeight - h),
        width: w,
        height: h,
      };
    });
  }, [rect, inputWidth, inputHeight]);
  /**
   * Apply a preset resolution from the dropdown.
   */
  const applyPreset = useCallback(
    (value: string) => {
      setPreset(value);
      const found = RESOLUTION_PRESETS.find((p) => p.value === value);
      if (!found || !rect) return;
      const w = Math.min(window.innerWidth, found.width);
      const h = Math.min(window.innerHeight, found.height);
      setRect((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(prev.x, window.innerWidth - w),
          y: Math.min(prev.y, window.innerHeight - h),
          width: w,
          height: h,
        };
      });
    },
    [rect],
  );
  /**
   * Whether the toolbar should flip above the rectangle (when there is not enough room below).
   */
  const toolbarBelow = useMemo(() => {
    if (!rect) return true;
    return rect.y + rect.height + TOOLBAR_HEIGHT + 12 < window.innerHeight;
  }, [rect]);
  /**
   * Left edge of the toolbar, clamped so it never overflows the viewport horizontally.
   */
  const toolbarLeft = useMemo(() => {
    if (!rect) return 0;
    const desired = rect.x + rect.width - TOOLBAR_WIDTH;
    return Math.max(4, Math.min(desired, window.innerWidth - TOOLBAR_WIDTH - 4));
  }, [rect]);
  /**
   * Shared style for a resize handle.
   */
  const handleStyle = (cursor: string, position: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    background: "var(--accent-color, #3b82f6)",
    border: "2px solid #ffffff",
    borderRadius: "2px",
    boxSizing: "border-box",
    cursor,
    pointerEvents: "auto",
    zIndex: 10,
    ...position,
  });
  /**
   * Build the preset options for the shared CommonDropdown.
   */
  const presetOptions = useMemo(() => [{ value: "", label: isZh ? "预设" : "Preset" }, ...RESOLUTION_PRESETS.map((p) => ({ value: p.value, label: p.label }))], [isZh]);
  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        background: "transparent",
        backgroundColor: "transparent",
        userSelect: "none",
        overflow: "hidden",
        pointerEvents: confirmed ? "none" : "auto",
      }}
    >
      {rect && !confirmed && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100vw",
              height: `${rect.y}px`,
              background: "rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: `${rect.y + rect.height}px`,
              width: "100vw",
              height: `${Math.max(0, window.innerHeight - (rect.y + rect.height))}px`,
              background: "rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: `${rect.y}px`,
              width: `${rect.x}px`,
              height: `${rect.height}px`,
              background: "rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${rect.x + rect.width}px`,
              top: `${rect.y}px`,
              width: `${Math.max(0, window.innerWidth - (rect.x + rect.width))}px`,
              height: `${rect.height}px`,
              background: "rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
            }}
          />
        </>
      )}
      {rect && (
        <div
          onPointerDown={(e) => beginDrag("move", e)}
          onDoubleClick={() => {
            // Double‑clicking the border in confirmed mode lets
            // the user re‑enter edit mode.
            if (confirmed) void editSelection();
          }}
          style={{
            position: "absolute",
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            border: `${BORDER_WIDTH}px dashed var(--accent-color, #3b82f6)`,
            boxSizing: "border-box",
            background: "transparent",
            cursor: confirmed ? "default" : "move",
            pointerEvents: "auto",
          }}
        >
          {!confirmed && (
            <>
              <div data-resize-handle="true" onPointerDown={(e) => beginDrag("nw", e)} style={handleStyle("nwse-resize", { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 })} />
              <div data-resize-handle="true" onPointerDown={(e) => beginDrag("ne", e)} style={handleStyle("nesw-resize", { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 })} />
              <div data-resize-handle="true" onPointerDown={(e) => beginDrag("sw", e)} style={handleStyle("nesw-resize", { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 })} />
              <div data-resize-handle="true" onPointerDown={(e) => beginDrag("se", e)} style={handleStyle("nwse-resize", { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 })} />
              <div
                data-resize-handle="true"
                onPointerDown={(e) => beginDrag("n", e)}
                style={handleStyle("ns-resize", {
                  left: "50%",
                  top: -HANDLE_SIZE / 2,
                  transform: "translateX(-50%)",
                })}
              />
              <div
                data-resize-handle="true"
                onPointerDown={(e) => beginDrag("s", e)}
                style={handleStyle("ns-resize", {
                  left: "50%",
                  bottom: -HANDLE_SIZE / 2,
                  transform: "translateX(-50%)",
                })}
              />
              <div
                data-resize-handle="true"
                onPointerDown={(e) => beginDrag("w", e)}
                style={handleStyle("ew-resize", {
                  left: -HANDLE_SIZE / 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                })}
              />
              <div
                data-resize-handle="true"
                onPointerDown={(e) => beginDrag("e", e)}
                style={handleStyle("ew-resize", {
                  right: -HANDLE_SIZE / 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                })}
              />
            </>
          )}
        </div>
      )}
      {rect && !confirmed && (
        <div
          style={{
            position: "absolute",
            left: `${toolbarLeft}px`,
            top: toolbarBelow ? `${rect.y + rect.height + 8}px` : `${Math.max(0, rect.y - TOOLBAR_HEIGHT - 8)}px`,
            width: `${TOOLBAR_WIDTH}px`,
            height: `${TOOLBAR_HEIGHT}px`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 8px",
            // Background follows the active theme.
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            color: "var(--text-primary)",
            zIndex: 20,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <NumberInput value={inputWidth} onChange={setInputWidth} onBlur={applyInputSize} min={MIN_SELECTION} max={window.innerWidth} step={1} width={78} align="center" />
          <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>×</span>
          <NumberInput value={inputHeight} onChange={setInputHeight} onBlur={applyInputSize} min={MIN_SELECTION} max={window.innerHeight} step={1} width={78} align="center" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <CommonDropdown options={presetOptions} value={preset} onChange={(v) => applyPreset(v)} width={140} height={28} menuMinWidth={140} menuMaxWidth={220} />
          </div>
          <button
            type="button"
            onClick={() => {
              void confirmSelection();
            }}
            style={{
              width: "64px",
              height: "28px",
              background: "var(--accent-color, #3b82f6)",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              fontSize: "12px",
              cursor: "pointer",
              outline: "none",
              flexShrink: 0,
            }}
          >
            {t("common.confirm") || (isZh ? "确定" : "OK")}
          </button>
          <button
            type="button"
            onClick={() => {
              void closeOverlay();
            }}
            style={{
              width: "64px",
              height: "28px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-primary)",
              fontSize: "12px",
              cursor: "pointer",
              outline: "none",
              flexShrink: 0,
            }}
          >
            {t("common.cancel") || (isZh ? "取消" : "Cancel")}
          </button>
        </div>
      )}
    </div>
  );
};
export default RegionSelectWindow;
