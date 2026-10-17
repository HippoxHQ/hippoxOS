import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Pause, Trash2, MoreVertical, Search, Check, X, ChevronDown, ChevronRight } from "lucide-react";
export interface DockerColumn<T> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  render?: (row: T) => React.ReactNode;
}
export type DockerRowActionPreset = "containers" | "images" | "volumes";
export interface DockerBatchAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  group?: string;
}
interface DockerListPanelProps<T> {
  title: string;
  searchPlaceholder?: string;
  columns: DockerColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  emptyText?: string;
  actionsWidth?: number;
  rowActionPreset?: DockerRowActionPreset;
  batchActions?: DockerBatchAction[];
  onBatchAction?: (actionKey: string, selectedKeys: string[]) => void;
  onRowAction?: (actionKey: string, row: T) => void;
  selectedRowKeys?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  showSelectAll?: boolean;
  expandable?: boolean;
  renderExpanded?: (row: T) => React.ReactNode;
  onNameClick?: (row: T) => void;
  resizeKey?: string;
}
const ROW_PADDING_X = 12;
const CHECKBOX_COLUMN_WIDTH = 28;
const EXPAND_CHEVRON_WIDTH = 18;
const ACTION_BUTTON_GAP = 2;
const ACTION_BUTTON_WIDTH = 26;
const ACTIONS_MIN_WIDTH = ACTION_BUTTON_WIDTH;
const ACTIONS_DEFAULT_WIDTH = 160;
const FLEX_COLUMN_MIN_WIDTH = 100;
const DEFAULT_FIXED_MIN_WIDTH = 70;
const LAST_COLUMN_EXTRA_PADDING = 12;
const SEARCH_INPUT_HEIGHT = 35;
const RESIZE_HANDLE_VISIBLE_WIDTH = 1;
const RESIZE_HANDLE_HIT_PADDING = 6;
const RESIZE_HANDLE_TOTAL_WIDTH = RESIZE_HANDLE_VISIBLE_WIDTH + RESIZE_HANDLE_HIT_PADDING * 2;
const COLUMN_ABSOLUTE_MIN_WIDTH = 40;
const ColumnResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
  active: boolean;
}> = ({ onMouseDown, active }) => (
  <div
    onMouseDown={onMouseDown}
    title="Drag to resize"
    style={{
      position: "relative",
      width: RESIZE_HANDLE_TOTAL_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: `${RESIZE_HANDLE_TOTAL_WIDTH}px`,
      alignSelf: "stretch",
      cursor: "col-resize",
      zIndex: 6,
      display: "flex",
      alignItems: "stretch",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: RESIZE_HANDLE_VISIBLE_WIDTH,
        marginTop: 4,
        marginBottom: 4,
        background: active ? "var(--accent-color, #58a6ff)" : "var(--border-color, #30363d)",
        opacity: active ? 1 : 0.9,
        pointerEvents: "none",
        transition: "background 0.15s, opacity 0.15s",
      }}
    />
  </div>
);
function DockerListPanel<T>({
  title,
  searchPlaceholder = "Search",
  columns,
  rows,
  getRowKey,
  searchQuery,
  onSearchChange,
  primaryActionLabel,
  onPrimaryAction,
  emptyText = "No items",
  actionsWidth = ACTIONS_DEFAULT_WIDTH,
  rowActionPreset = "containers",
  batchActions,
  onBatchAction,
  onRowAction,
  selectedRowKeys,
  onSelectionChange,
  showSelectAll = true,
  expandable = false,
  renderExpanded,
  onNameClick,
  resizeKey,
}: DockerListPanelProps<T>) {
  const [openActionsMenuKey, setOpenActionsMenuKey] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rowsInnerWidth, setRowsInnerWidth] = useState<number>(0);
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const isSelectionControlled = typeof selectedRowKeys !== "undefined";
  const selectedSet = isSelectionControlled ? selectedRowKeys! : internalSelected;
  const [userColumnWidths, setUserColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
  const resizeStateRef = useRef<{ key: string; startX: number; startWidth: number; maxWidth: number } | null>(null);
  const storageKey = useMemo(() => {
    const base = resizeKey ?? title ?? "docker-list";
    return `hippox-docker-list-widths:${base}`;
  }, [resizeKey, title]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setUserColumnWidths({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      if (parsed && typeof parsed === "object") {
        const cleaned: Record<string, number> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === "number" && Number.isFinite(v) && v > 0) {
            cleaned[k] = v;
          }
        });
        setUserColumnWidths(cleaned);
      }
    } catch {
      setUserColumnWidths({});
    }
  }, [storageKey]);
  const applySelection = (next: Set<string>) => {
    if (isSelectionControlled) {
      onSelectionChange?.(next);
    } else {
      setInternalSelected(next);
      onSelectionChange?.(next);
    }
  };
  const toggleRowSelection = (rowKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedSet);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    applySelection(next);
  };
  const toggleSelectAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const visibleKeys = rows.map(getRowKey);
    const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selectedSet.has(k));
    const next = new Set(selectedSet);
    if (allSelected) visibleKeys.forEach((k) => next.delete(k));
    else visibleKeys.forEach((k) => next.add(k));
    applySelection(next);
  };
  const clearSelection = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    applySelection(new Set());
  };
  const toggleRowExpanded = (rowKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      setRowsInnerWidth(Math.max(0, rect.width - ROW_PADDING_X * 2));
    };
    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
  useEffect(() => {
    if (!openActionsMenuKey) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setOpenActionsMenuKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionsMenuKey]);
  /**
   * Persist the current user-adjusted widths map to localStorage.
   */
  const persistUserColumnWidths = useCallback(
    (next: Record<string, number>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey],
  );
  /** Compute the number of resize handles currently rendered between header cells. */
  const resizeHandleCount = useMemo(() => {
    if (columns.length <= 1) return 0;
    return columns.length - 1;
  }, [columns.length]);
  /**
   * The actions column is pinned to the far right and never participates in column resizing.
   */
  const fixedActionsWidth = useMemo(() => Math.max(ACTIONS_MIN_WIDTH, actionsWidth), [actionsWidth]);
  const chromeWidth = useMemo(() => {
    const chevron = expandable ? EXPAND_CHEVRON_WIDTH : 0;
    const handles = resizeHandleCount * RESIZE_HANDLE_TOTAL_WIDTH;
    return chevron + CHECKBOX_COLUMN_WIDTH + handles;
  }, [expandable, resizeHandleCount]);
  const layout = useMemo(() => {
    const available = Math.max(0, rowsInnerWidth);
    const columnsRegion = Math.max(0, available - fixedActionsWidth);
    const flexColumns = columns.filter((c) => typeof c.width !== "number");
    const fixedColumns = columns.filter((c) => typeof c.width === "number");
    const flexMinTotal = flexColumns.length * FLEX_COLUMN_MIN_WIDTH;
    const fixedMinTotal = fixedColumns.reduce((sum, c) => sum + Math.max(0, c.minWidth ?? Math.min(c.width ?? DEFAULT_FIXED_MIN_WIDTH, DEFAULT_FIXED_MIN_WIDTH)), 0);
    const columnsSpace = Math.max(0, columnsRegion - chromeWidth);
    const fixedWidths: Record<string, number> = {};
    fixedColumns.forEach((c) => {
      const pref = c.width ?? DEFAULT_FIXED_MIN_WIDTH;
      fixedWidths[c.key] = pref;
    });
    let fixedSumPreferred = fixedColumns.reduce((sum, c) => sum + (fixedWidths[c.key] ?? 0), 0);
    if (flexMinTotal + fixedSumPreferred > columnsSpace && fixedSumPreferred > fixedMinTotal) {
      const overflow = flexMinTotal + fixedSumPreferred - columnsSpace;
      const shrinkable = fixedSumPreferred - fixedMinTotal;
      const ratio = shrinkable > 0 ? Math.min(1, overflow / shrinkable) : 0;
      fixedColumns.forEach((c) => {
        const pref = fixedWidths[c.key] ?? 0;
        const min = Math.max(0, c.minWidth ?? Math.min(c.width ?? DEFAULT_FIXED_MIN_WIDTH, DEFAULT_FIXED_MIN_WIDTH));
        fixedWidths[c.key] = Math.round(pref - (pref - min) * ratio);
      });
      fixedSumPreferred = fixedColumns.reduce((sum, c) => sum + (fixedWidths[c.key] ?? 0), 0);
    }
    const remainingForFlex = Math.max(flexMinTotal, columnsSpace - fixedSumPreferred);
    const perFlexAuto = flexColumns.length > 0 ? Math.max(FLEX_COLUMN_MIN_WIDTH, Math.floor(remainingForFlex / flexColumns.length)) : 0;
    const effectiveWidths: Record<string, number> = {};
    columns.forEach((c) => {
      if (typeof c.width === "number") {
        effectiveWidths[c.key] = fixedWidths[c.key] ?? c.width ?? DEFAULT_FIXED_MIN_WIDTH;
      } else {
        effectiveWidths[c.key] = perFlexAuto;
      }
    });
    const userKeys = Object.keys(userColumnWidths).filter((k) => columns.some((c) => c.key === k));
    if (userKeys.length > 0) {
      userKeys.forEach((k) => {
        const v = userColumnWidths[k];
        if (typeof v === "number" && Number.isFinite(v) && v > 0) {
          effectiveWidths[k] = Math.max(COLUMN_ABSOLUTE_MIN_WIDTH, Math.round(v));
        }
      });
      const totalColumns = columns.reduce((sum, c) => sum + (effectiveWidths[c.key] ?? 0), 0);
      if (totalColumns > columnsSpace && totalColumns > 0) {
        const scale = columnsSpace / totalColumns;
        columns.forEach((c) => {
          const base = effectiveWidths[c.key] ?? 0;
          const scaled = Math.max(COLUMN_ABSOLUTE_MIN_WIDTH, Math.floor(base * scale));
          effectiveWidths[c.key] = scaled;
        });
        let overflow = columns.reduce((sum, c) => sum + (effectiveWidths[c.key] ?? 0), 0) - columnsSpace;
        if (overflow > 0) {
          for (let i = columns.length - 1; i >= 0 && overflow > 0; i -= 1) {
            const key = columns[i].key;
            const current = effectiveWidths[key] ?? 0;
            const reducible = Math.max(0, current - COLUMN_ABSOLUTE_MIN_WIDTH);
            const cut = Math.min(reducible, overflow);
            effectiveWidths[key] = current - cut;
            overflow -= cut;
          }
        }
      }
    }
    const inlineSlots = Math.max(0, Math.floor((fixedActionsWidth + ACTION_BUTTON_GAP) / (ACTION_BUTTON_WIDTH + ACTION_BUTTON_GAP)));
    return {
      available,
      actionsWidth: fixedActionsWidth,
      fixedWidths: effectiveWidths,
      flexWidth: remainingForFlex,
      flexColumnsCount: flexColumns.length,
      inlineSlots,
      columnsSpace,
    };
  }, [rowsInnerWidth, columns, fixedActionsWidth, expandable, userColumnWidths, chromeWidth]);
  /**
   * Begin dragging a column divider.
   */
  const handleResizeStart = useCallback(
    (colKey: string, e: React.MouseEvent, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      const otherColumnsWidth = columns.reduce((sum, c) => {
        if (c.key === colKey) return sum;
        return sum + (layout.fixedWidths[c.key] ?? 0);
      }, 0);
      const maxWidth = Math.max(COLUMN_ABSOLUTE_MIN_WIDTH, layout.columnsSpace - otherColumnsWidth);
      resizeStateRef.current = { key: colKey, startX: e.clientX, startWidth: currentWidth, maxWidth };
      setResizingColumnKey(colKey);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columns, layout.fixedWidths, layout.columnsSpace],
  );
  // Global mousemove/mouseup listeners drive the resize while dragging.
  useEffect(() => {
    if (!resizingColumnKey) return;
    const handleMouseMove = (e: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const delta = e.clientX - state.startX;
      const nextWidth = Math.max(COLUMN_ABSOLUTE_MIN_WIDTH, Math.min(state.maxWidth, Math.round(state.startWidth + delta)));
      setUserColumnWidths((prev) => ({ ...prev, [state.key]: nextWidth }));
    };
    const handleMouseUp = () => {
      const state = resizeStateRef.current;
      if (state) {
        setUserColumnWidths((prev) => {
          const merged = { ...prev };
          if (typeof merged[state.key] !== "number") {
            merged[state.key] = Math.max(COLUMN_ABSOLUTE_MIN_WIDTH, Math.min(state.maxWidth, Math.round(state.startWidth)));
          }
          persistUserColumnWidths(merged);
          return merged;
        });
      }
      resizeStateRef.current = null;
      setResizingColumnKey(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumnKey, persistUserColumnWidths]);
  // Shared icon button style for row actions.
  const rowIconButtonStyle: React.CSSProperties = {
    width: ACTION_BUTTON_WIDTH,
    height: ACTION_BUTTON_WIDTH,
    borderRadius: 5,
    border: "none",
    background: "transparent",
    color: "var(--text-secondary, #8b949e)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
    outline: "none",
    transition: "background 0.15s, color 0.15s",
  };
  const overflowMenuStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: ACTION_BUTTON_WIDTH + 4,
    background: "var(--bg-secondary, #161b22)",
    border: "1px solid var(--border-color, #30363d)",
    borderRadius: 5,
    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
    zIndex: 200,
    minWidth: 120,
    overflow: "hidden",
  };
  const overflowMenuItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 12,
    color: "var(--text-primary, #e6edf3)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
  const ACTION_DEFS: Record<DockerRowActionPreset, Array<{ key: string; title: string; icon: React.ReactNode; hoverColor: string }>> = {
    containers: [
      { key: "start", title: "Start", icon: <Play size={14} />, hoverColor: "#22c55e" },
      { key: "pause", title: "Pause", icon: <Pause size={14} />, hoverColor: "#f59e0b" },
      { key: "stop", title: "Stop", icon: <Square size={14} />, hoverColor: "#ef4444" },
      { key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" },
    ],
    images: [
      { key: "run", title: "Run", icon: <Play size={14} />, hoverColor: "#22c55e" },
      { key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" },
    ],
    volumes: [{ key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" }],
  };
  const rowActions = ACTION_DEFS[rowActionPreset] ?? ACTION_DEFS.containers;
  /**
   * Render the per-row action buttons with responsive collapsing.
   */
  const renderRowActions = (row: T, rowKey: string) => {
    const isMenuOpen = openActionsMenuKey === rowKey;
    const total = rowActions.length;
    const showAllInline = layout.inlineSlots >= total;
    const inlineCount = showAllInline ? total : Math.max(0, layout.inlineSlots);
    const inlineActions = rowActions.slice(0, inlineCount);
    const overflowActions = rowActions.slice(inlineCount);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: ACTION_BUTTON_GAP, position: "relative" }}>
        {inlineActions.map((action) => (
          <button
            key={action.key}
            style={rowIconButtonStyle}
            title={action.title}
            onClick={(e) => {
              e.stopPropagation();
              onRowAction?.(action.key, row);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              e.currentTarget.style.color = action.hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
            }}
          >
            {action.icon}
          </button>
        ))}
        {overflowActions.length > 0 && (
          <button
            style={{
              ...rowIconButtonStyle,
              background: isMenuOpen ? "var(--hover-bg, #21262d)" : "transparent",
              color: isMenuOpen ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
            }}
            title="More"
            onClick={(e) => {
              e.stopPropagation();
              setOpenActionsMenuKey(isMenuOpen ? null : rowKey);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
            }}
            onMouseLeave={(e) => {
              if (!isMenuOpen) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              }
            }}
          >
            <MoreVertical size={14} />
          </button>
        )}
        {isMenuOpen && overflowActions.length > 0 && (
          <div ref={actionsMenuRef} style={overflowMenuStyle}>
            {overflowActions.map((action) => (
              <div
                key={action.key}
                style={{
                  ...overflowMenuItemStyle,
                  color: action.hoverColor === "#ef4444" ? "#ef4444" : "var(--text-primary, #e6edf3)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionsMenuKey(null);
                  onRowAction?.(action.key, row);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = action.hoverColor === "#ef4444" ? "rgba(239,68,68,0.1)" : "var(--hover-bg, #21262d)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
              >
                {action.icon} {action.title}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const getCellFlexStyle = (col: DockerColumn<T>): React.CSSProperties => {
    // Use the effective width (auto or user-resized) for every column.
    const w = layout.fixedWidths[col.key] ?? 0;
    return { flexGrow: 0, flexShrink: 0, flexBasis: `${w}px`, width: w, minWidth: 0 };
  };
  /**
   * Shared wrapper style for the columns region.
   */
  const columnsRegionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 0,
    overflow: "hidden",
    height: "100%",
  };
  /**
   * Shared style for the pinned actions column.
   */
  const actionsRegionStyle: React.CSSProperties = {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: `${fixedActionsWidth}px`,
    width: fixedActionsWidth,
    minWidth: fixedActionsWidth,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  };
  const tableHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: `6px ${ROW_PADDING_X}px`,
    borderBottom: "1px solid var(--border-color, #30363d)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary, #6e7681)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flexShrink: 0,
    boxSizing: "border-box",
    overflow: "hidden",
  };
  /**
   * Built-in batch actions per preset.
   */
  const PRESET_BATCH_ACTIONS: Record<DockerRowActionPreset, DockerBatchAction[]> = {
    containers: [
      { key: "start", label: "Start", icon: <Play size={14} />, color: "#22c55e", group: "lifecycle" },
      { key: "pause", label: "Pause", icon: <Pause size={14} />, color: "#f59e0b", group: "lifecycle" },
      { key: "stop", label: "Stop", icon: <Square size={14} />, color: "#ef4444", group: "lifecycle" },
      { key: "delete", label: "Delete", icon: <Trash2 size={14} />, color: "#ef4444", group: "delete" },
    ],
    images: [{ key: "delete", label: "Delete", icon: <Trash2 size={14} />, color: "#ef4444", group: "delete" }],
    volumes: [{ key: "delete", label: "Delete", icon: <Trash2 size={14} />, color: "#ef4444", group: "delete" }],
  };
  const effectiveBatchActions = batchActions ?? PRESET_BATCH_ACTIONS[rowActionPreset] ?? [];
  const visibleKeys = rows.map(getRowKey);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selectedSet.has(k));
  const someVisibleSelected = visibleKeys.some((k) => selectedSet.has(k));
  const hasSelection = selectedSet.size > 0;
  const renderBatchActions = () => {
    const groups: Array<{ group: string; actions: DockerBatchAction[] }> = [];
    effectiveBatchActions.forEach((action) => {
      const groupId = action.group ?? action.key;
      const last = groups[groups.length - 1];
      if (last && last.group === groupId) {
        last.actions.push(action);
      } else {
        groups.push({ group: groupId, actions: [action] });
      }
    });
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {groups.map((g) => (
          <div
            key={g.group}
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {g.actions.map((action, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === g.actions.length - 1;
              return (
                <button
                  key={action.key}
                  title={action.label}
                  aria-label={action.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBatchAction?.(action.key, Array.from(selectedSet));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 28,
                    padding: 0,
                    border: "none",
                    borderLeft: isFirst ? "none" : "1px solid var(--border-color, #30363d)",
                    background: "var(--bg-tertiary, #21262d)",
                    color: action.color ?? "var(--text-primary, #e6edf3)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    borderTopLeftRadius: isFirst ? 5 : 0,
                    borderBottomLeftRadius: isFirst ? 5 : 0,
                    borderTopRightRadius: isLast ? 5 : 0,
                    borderBottomRightRadius: isLast ? 5 : 0,
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                    e.currentTarget.style.color = action.color ?? "var(--text-primary, #e6edf3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary, #21262d)";
                    e.currentTarget.style.color = action.color ?? "var(--text-primary, #e6edf3)";
                  }}
                >
                  {action.icon}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div
      ref={panelRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary, #161b22)",
        overflowX: "hidden",
        overflowY: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          minHeight: 52,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{title}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              padding: "0 10px",
              height: SEARCH_INPUT_HEIGHT,
              minWidth: 160,
              maxWidth: 320,
              flex: "0 1 260px",
              boxSizing: "border-box",
            }}
          >
            <Search size={14} color="var(--text-muted, #6e7681)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #e6edf3)",
                fontSize: 12,
                minWidth: 0,
                height: "100%",
                padding: 0,
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {hasSelection ? (
            <>
              {renderBatchActions()}
              <button
                title="Clear selection"
                aria-label="Clear selection"
                onClick={clearSelection}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid var(--border-color, #30363d)",
                  background: "var(--bg-tertiary, #21262d)",
                  color: "var(--text-secondary, #8b949e)",
                  cursor: "pointer",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                  e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary, #21262d)";
                  e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
                }}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            primaryActionLabel && (
              <button
                onClick={onPrimaryAction}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--accent-color, #58a6ff)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {primaryActionLabel}
              </button>
            )
          )}
        </div>
      </div>
      <div style={tableHeaderStyle}>
        <div style={columnsRegionStyle}>
          {expandable && (
            <div
              style={{
                width: EXPAND_CHEVRON_WIDTH,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: `${EXPAND_CHEVRON_WIDTH}px`,
              }}
            />
          )}
          <div
            style={{
              width: CHECKBOX_COLUMN_WIDTH,
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: `${CHECKBOX_COLUMN_WIDTH}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {showSelectAll && (
              <button
                onClick={toggleSelectAll}
                title={allVisibleSelected ? "Deselect all" : "Select all"}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `1px solid ${allVisibleSelected || someVisibleSelected ? "var(--accent-color, #58a6ff)" : "var(--border-color, #30363d)"}`,
                  background: allVisibleSelected ? "var(--accent-color, #58a6ff)" : someVisibleSelected ? "rgba(88,166,255,0.25)" : "transparent",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  outline: "none",
                  flexShrink: 0,
                }}
              >
                {allVisibleSelected ? <Check size={12} /> : someVisibleSelected ? <span style={{ width: 8, height: 2, background: "white", borderRadius: 1 }} /> : null}
              </button>
            )}
          </div>
          {columns.map((col, index) => {
            const isLastColumn = index === columns.length - 1;
            const extraRightPadding = isLastColumn ? LAST_COLUMN_EXTRA_PADDING : 0;
            const colWidth = layout.fixedWidths[col.key] ?? 0;
            return (
              <React.Fragment key={col.key}>
                <div
                  style={{
                    ...getCellFlexStyle(col),
                    paddingRight: 13 + extraRightPadding,
                    boxSizing: "border-box",
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </div>
                {!isLastColumn && <ColumnResizeHandle active={resizingColumnKey === col.key} onMouseDown={(e) => handleResizeStart(col.key, e, colWidth)} />}
              </React.Fragment>
            );
          })}
        </div>
        <div style={actionsRegionStyle} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        {rows.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted, #6e7681)",
              fontSize: 12,
            }}
          >
            {emptyText}
          </div>
        ) : (
          rows.map((row) => {
            const rowKey = getRowKey(row);
            const isSelected = selectedSet.has(rowKey);
            const isExpanded = expandedRowKeys.has(rowKey);
            return (
              <div key={rowKey} style={{ borderBottom: "1px solid var(--border-color, #30363d)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: `10px ${ROW_PADDING_X}px`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    boxSizing: "border-box",
                    background: isSelected ? "rgba(88,166,255,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? "rgba(88,166,255,0.08)" : "transparent";
                  }}
                  onClick={(e) => {
                    if (expandable) {
                      toggleRowExpanded(rowKey, e);
                    } else {
                      toggleRowSelection(rowKey, e);
                    }
                  }}
                >
                  <div style={columnsRegionStyle}>
                    {expandable && (
                      <div
                        style={{
                          width: EXPAND_CHEVRON_WIDTH,
                          flexGrow: 0,
                          flexShrink: 0,
                          flexBasis: `${EXPAND_CHEVRON_WIDTH}px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-secondary, #8b949e)",
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    )}
                    <div
                      style={{
                        width: CHECKBOX_COLUMN_WIDTH,
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: `${CHECKBOX_COLUMN_WIDTH}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        title={isSelected ? "Deselect" : "Select"}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `1px solid ${isSelected ? "var(--accent-color, #58a6ff)" : "var(--border-color, #30363d)"}`,
                          background: isSelected ? "var(--accent-color, #58a6ff)" : "transparent",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          outline: "none",
                          flexShrink: 0,
                        }}
                        onClick={(e) => toggleRowSelection(rowKey, e)}
                      >
                        {isSelected && <Check size={12} />}
                      </button>
                    </div>
                    {columns.map((col, index) => {
                      const isLastColumn = index === columns.length - 1;
                      const extraRightPadding = isLastColumn ? LAST_COLUMN_EXTRA_PADDING : 0;
                      const content = col.render ? col.render(row) : (row as any)[col.key];
                      const isNameColumn = col.key === "name";
                      const isNameLink = isNameColumn && !!onNameClick;
                      return (
                        <React.Fragment key={col.key}>
                          <div
                            style={{
                              ...getCellFlexStyle(col),
                              paddingRight: 13 + extraRightPadding,
                              boxSizing: "border-box",
                              fontSize: 12,
                              color: "var(--text-primary, #e6edf3)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textDecoration: isNameLink ? "underline" : "none",
                              textDecorationColor: isNameLink ? "var(--accent-color, #58a6ff)" : undefined,
                              cursor: isNameLink ? "pointer" : undefined,
                            }}
                            title={typeof content === "string" ? content : undefined}
                            onClick={
                              isNameLink
                                ? (e) => {
                                    e.stopPropagation();
                                    onNameClick?.(row);
                                  }
                                : undefined
                            }
                            onMouseEnter={
                              isNameLink
                                ? (e) => {
                                    e.currentTarget.style.color = "var(--accent-color, #58a6ff)";
                                  }
                                : undefined
                            }
                            onMouseLeave={
                              isNameLink
                                ? (e) => {
                                    e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
                                  }
                                : undefined
                            }
                          >
                            {content}
                          </div>
                          {!isLastColumn && (
                            <div
                              style={{
                                width: RESIZE_HANDLE_TOTAL_WIDTH,
                                flexGrow: 0,
                                flexShrink: 0,
                                flexBasis: `${RESIZE_HANDLE_TOTAL_WIDTH}px`,
                              }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div style={actionsRegionStyle}>{renderRowActions(row, rowKey)}</div>
                </div>
                {expandable && isExpanded && renderExpanded && (
                  <div
                    style={{
                      padding: "10px 14px 14px 44px",
                      background: "rgba(255,255,255,0.02)",
                      borderTop: "1px solid var(--border-color, #30363d)",
                    }}
                  >
                    {renderExpanded(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default DockerListPanel;
