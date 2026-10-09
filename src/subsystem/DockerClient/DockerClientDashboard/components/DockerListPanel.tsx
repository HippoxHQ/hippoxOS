import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Pause, Trash2, MoreVertical, Search, Check, X } from "lucide-react";
/**
 * Definition of a single column in the list panel.
 */
export interface DockerColumn<T> {
  /** Unique key of the column */
  key: string;
  /** Header label */
  label: string;
  /** Preferred width in pixels. Use undefined for the flex-grow name column. */
  width?: number;
  /** Minimum width in pixels. */
  minWidth?: number;
  /** Optional cell renderer. */
  render?: (row: T) => React.ReactNode;
}
/**
 * Preset action sets for the per-row action buttons.
 */
export type DockerRowActionPreset = "containers" | "images" | "volumes";
/** A single batch action definition shown in the header action bar. */
export interface DockerBatchAction {
  /** Stable key, e.g. "start" / "stop" / "delete". */
  key: string;
  /** Button label (used as the tooltip / accessible title). */
  label: string;
  /** Optional icon. */
  icon?: React.ReactNode;
  /** Optional accent color. */
  color?: string;
  /**
   * Optional group id. Actions that share the same group id are rendered
   * as a single connected button group (no gaps, shared borders).
   */
  group?: string;
}
interface DockerListPanelProps<T> {
  /** Panel title, e.g. "Containers" */
  title: string;
  /** Placeholder for the search box */
  searchPlaceholder?: string;
  /** Column definitions (order matters) */
  columns: DockerColumn<T>[];
  /** Rows to render */
  rows: T[];
  /** Function to get a unique key from each row */
  getRowKey: (row: T) => string;
  /** Current search query */
  searchQuery: string;
  /** Search query change handler */
  onSearchChange: (value: string) => void;
  /** Optional primary action label, e.g. "Run" */
  primaryActionLabel?: string;
  /** Primary action handler */
  onPrimaryAction?: () => void;
  /** Empty state text */
  emptyText?: string;
  /** Preferred width of the actions column in pixels. */
  actionsWidth?: number;
  /**
   * Which built-in action preset to use for the per-row action buttons.
   */
  rowActionPreset?: DockerRowActionPreset;
  /**
   * Custom batch actions for the header. When provided, this overrides
   * the built-in preset actions.
   */
  batchActions?: DockerBatchAction[];
  /**
   * Fired when a batch action button is clicked.
   */
  onBatchAction?: (actionKey: string, selectedKeys: string[]) => void;
  /**
   * Fired when a per-row action button is clicked.
   */
  onRowAction?: (actionKey: string, row: T) => void;
  /**
   * Currently selected row keys (controlled mode).
   */
  selectedRowKeys?: Set<string>;
  /** Selection change callback. */
  onSelectionChange?: (next: Set<string>) => void;
  /** Whether to show a header select-all checkbox. Defaults to true. */
  showSelectAll?: boolean;
}
/** Horizontal padding applied to each row / header row (left + right). */
const ROW_PADDING_X = 12;
/** Width of the leading selection checkbox column. */
const CHECKBOX_COLUMN_WIDTH = 28;
/** Gap between the inline action icon buttons. */
const ACTION_BUTTON_GAP = 2;
/** Width of a single inline action icon button. */
const ACTION_BUTTON_WIDTH = 26;
/** Minimum width of the actions column (just the "More" button). */
const ACTIONS_MIN_WIDTH = ACTION_BUTTON_WIDTH;
/** Default preferred width of the actions column. */
const ACTIONS_DEFAULT_WIDTH = 160;
/** Minimum width of the flexible (name) column. */
const FLEX_COLUMN_MIN_WIDTH = 100;
/** Minimum width of a fixed-width column if none is specified. */
const DEFAULT_FIXED_MIN_WIDTH = 70;
/** Extra right padding on the LAST data column, to avoid overlap with actions. */
const LAST_COLUMN_EXTRA_PADDING = 12;
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
}: DockerListPanelProps<T>) {
  // Tracks which row's overflow menu is open (by row key).
  const [openActionsMenuKey, setOpenActionsMenuKey] = useState<string | null>(null);
  // Ref for the currently open menu, used for outside-click detection.
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  // Ref for the panel root, used to measure available width.
  const panelRef = useRef<HTMLDivElement>(null);
  // Measured inner width of the rows area.
  const [rowsInnerWidth, setRowsInnerWidth] = useState<number>(0);
  // Internal selection state used in uncontrolled mode.
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const isSelectionControlled = typeof selectedRowKeys !== "undefined";
  const selectedSet = isSelectionControlled ? selectedRowKeys! : internalSelected;
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
  // Measure panel width.
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
  // Close overflow menu on outside click.
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
  const layout = useMemo(() => {
    const available = Math.max(0, rowsInnerWidth);
    const flexColumns = columns.filter((c) => typeof c.width !== "number");
    const fixedColumns = columns.filter((c) => typeof c.width === "number");
    const flexMinTotal = flexColumns.length * FLEX_COLUMN_MIN_WIDTH;
    const fixedMinTotal = fixedColumns.reduce((sum, c) => sum + Math.max(0, c.minWidth ?? Math.min(c.width ?? DEFAULT_FIXED_MIN_WIDTH, DEFAULT_FIXED_MIN_WIDTH)), 0);
    // Reserve checkbox + actions columns first.
    const spaceAfterMins = Math.max(0, available - CHECKBOX_COLUMN_WIDTH - flexMinTotal - fixedMinTotal);
    const actionsPreferred = Math.max(ACTIONS_MIN_WIDTH, Math.min(actionsWidth, Math.max(ACTIONS_MIN_WIDTH, Math.floor(available * 0.5))));
    const actionsActual = Math.min(actionsPreferred, spaceAfterMins);
    const leftoverAfterActions = Math.max(0, spaceAfterMins - actionsActual);
    const fixedWidths: Record<string, number> = {};
    fixedColumns.forEach((c) => {
      const pref = c.width ?? DEFAULT_FIXED_MIN_WIDTH;
      const min = Math.max(0, c.minWidth ?? Math.min(pref, DEFAULT_FIXED_MIN_WIDTH));
      fixedWidths[c.key] = min;
    });
    const fixedGrowCapacity = fixedColumns.reduce((sum, c) => {
      const pref = c.width ?? DEFAULT_FIXED_MIN_WIDTH;
      const min = Math.max(0, c.minWidth ?? Math.min(pref, DEFAULT_FIXED_MIN_WIDTH));
      return sum + Math.max(0, pref - min);
    }, 0);
    const fixedGrowActual = Math.min(leftoverAfterActions, fixedGrowCapacity);
    if (fixedGrowCapacity > 0 && fixedGrowActual > 0) {
      const growRatio = fixedGrowActual / fixedGrowCapacity;
      fixedColumns.forEach((c) => {
        const pref = c.width ?? DEFAULT_FIXED_MIN_WIDTH;
        const min = Math.max(0, c.minWidth ?? Math.min(pref, DEFAULT_FIXED_MIN_WIDTH));
        fixedWidths[c.key] = Math.floor(min + Math.max(0, pref - min) * growRatio);
      });
    }
    const fixedSumActual = Object.values(fixedWidths).reduce((a, b) => a + b, 0);
    const flexWidth = Math.max(flexMinTotal, available - CHECKBOX_COLUMN_WIDTH - actionsActual - fixedSumActual);
    // How many inline action buttons fit in the actions column.
    const inlineSlots = Math.max(0, Math.floor((actionsActual + ACTION_BUTTON_GAP) / (ACTION_BUTTON_WIDTH + ACTION_BUTTON_GAP)));
    return {
      available,
      actionsWidth: actionsActual,
      fixedWidths,
      flexWidth,
      flexColumnsCount: flexColumns.length,
      inlineSlots,
    };
  }, [rowsInnerWidth, columns, actionsWidth]);
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
  /** Row action definitions per preset. */
  const ACTION_DEFS: Record<DockerRowActionPreset, Array<{ key: string; title: string; icon: React.ReactNode; hoverColor: string }>> = {
    containers: [
      { key: "start", title: "Start", icon: <Play size={14} />, hoverColor: "#22c55e" },
      { key: "pause", title: "Pause", icon: <Pause size={14} />, hoverColor: "#f59e0b" },
      { key: "stop", title: "Stop", icon: <Square size={14} />, hoverColor: "#ef4444" },
      { key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" },
    ],
    images: [{ key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" }],
    volumes: [{ key: "delete", title: "Delete", icon: <Trash2 size={14} />, hoverColor: "#ef4444" }],
  };
  const rowActions = ACTION_DEFS[rowActionPreset] ?? ACTION_DEFS.containers;
  /**
   * Render the per-row action buttons with responsive collapsing.
   * When there is no overflow action, the "More" button is not shown.
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
    if (typeof col.width === "number") {
      const w = layout.fixedWidths[col.key] ?? 0;
      return { flex: `0 0 ${w}px`, width: w, minWidth: 0 };
    }
    const perFlex = layout.flexColumnsCount > 0 ? Math.floor(layout.flexWidth / layout.flexColumnsCount) : 0;
    return { flex: `1 1 ${perFlex}px`, width: perFlex, minWidth: 0 };
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
    // Preserve order while grouping consecutive actions by `group`.
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
                    // Thin separators between adjacent buttons in a group.
                    borderLeft: isFirst ? "none" : "1px solid var(--border-color, #30363d)",
                    background: "var(--bg-tertiary, #21262d)",
                    color: action.color ?? "var(--text-primary, #e6edf3)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    // Rounded corners only on the ends of the group.
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
              background: "var(--bg-tertiary, #21262d)",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              padding: "4px 10px",
              minWidth: 160,
              maxWidth: 320,
              flex: "0 1 260px",
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
        <div
          style={{
            width: CHECKBOX_COLUMN_WIDTH,
            flex: `0 0 ${CHECKBOX_COLUMN_WIDTH}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
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
          return (
            <div
              key={col.key}
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
          );
        })}
        <div
          style={{
            flex: `0 0 ${layout.actionsWidth}px`,
            width: layout.actionsWidth,
            minWidth: 0,
            flexShrink: 0,
          }}
        />
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
            return (
              <div
                key={rowKey}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: `10px ${ROW_PADDING_X}px`,
                  borderBottom: "1px solid var(--border-color, #30363d)",
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
                onClick={(e) => toggleRowSelection(rowKey, e)}
              >
                <div
                  style={{
                    width: CHECKBOX_COLUMN_WIDTH,
                    flex: `0 0 ${CHECKBOX_COLUMN_WIDTH}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
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
                  >
                    {isSelected && <Check size={12} />}
                  </button>
                </div>
                {columns.map((col, index) => {
                  const isLastColumn = index === columns.length - 1;
                  const extraRightPadding = isLastColumn ? LAST_COLUMN_EXTRA_PADDING : 0;
                  const content = col.render ? col.render(row) : (row as any)[col.key];
                  return (
                    <div
                      key={col.key}
                      style={{
                        ...getCellFlexStyle(col),
                        paddingRight: 13 + extraRightPadding,
                        boxSizing: "border-box",
                        fontSize: 12,
                        color: "var(--text-primary, #e6edf3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={typeof content === "string" ? content : undefined}
                    >
                      {content}
                    </div>
                  );
                })}
                <div
                  style={{
                    flex: `0 0 ${layout.actionsWidth}px`,
                    width: layout.actionsWidth,
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  {renderRowActions(row, rowKey)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default DockerListPanel;
