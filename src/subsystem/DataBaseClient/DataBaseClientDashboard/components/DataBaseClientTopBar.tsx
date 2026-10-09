import React, { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, History, Layers } from "lucide-react";
export const TOP_BAR_HEIGHT = 41;
/**
 * View keys the top bar can emit. Kept for compatibility with the parent.
 */
export type DataBaseClientView = "overview" | "tables" | "query" | "console" | "settings";
/**
 * Generic descriptor for a top-bar button.
 */
export interface TopBarItem {
  key: string;
  icon: React.ReactNode;
  labelEn: string;
  labelZh: string;
  onClick?: () => void;
}
/**
 * A single "common database" entry shown in the dropdown menu.
 */
export interface CommonDatabaseItem {
  key: string;
  nameEn: string;
  nameZh: string;
  color?: string;
  logo?: React.ReactNode;
}
interface DataBaseClientTopBarProps {
  /**
   * Currently active view. Kept in the props for compatibility, even though
   * the top bar no longer renders view-switcher buttons.
   */
  activeView: DataBaseClientView;
  /** Called when the user switches to a different view. */
  onViewChange: (view: DataBaseClientView) => void;
  /** Called when the user clicks "+" or picks a database from the dropdown. */
  onNewConnection?: (databaseKey?: string) => void;
  /** Called when the user clicks the "History" button. */
  onToggleHistory?: () => void;
  /** Whether the history drawer is currently open. */
  isHistoryOpen?: boolean;
  /** Current language. */
  i18n?: "en" | "zh-cn";
}
const COMMON_DATABASES: CommonDatabaseItem[] = [
  { key: "mysql", nameEn: "MySQL", nameZh: "MySQL", color: "#00758f" },
  { key: "postgresql", nameEn: "PostgreSQL", nameZh: "PostgreSQL", color: "#336791" },
  { key: "mongodb", nameEn: "MongoDB", nameZh: "MongoDB", color: "#13aa52" },
  { key: "redis", nameEn: "Redis", nameZh: "Redis", color: "#d82c20" },
  { key: "sqlite", nameEn: "SQLite", nameZh: "SQLite", color: "#003b57" },
];
export const DataBaseClientTopBar: React.FC<DataBaseClientTopBarProps> = ({ onNewConnection, onToggleHistory, isHistoryOpen = false, i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isNewConnHovered, setIsNewConnHovered] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);
  const RIGHT_ITEMS: TopBarItem[] = [
    {
      key: "history",
      icon: <History size={16} />,
      labelEn: "History",
      labelZh: "历史会话",
      onClick: onToggleHistory,
    },
  ];
  const buttonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
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
  /**
   * Render a single right-side button.
   */
  const renderItem = (item: TopBarItem) => {
    const isActive = item.key === "history" && isHistoryOpen;
    const label = isZh ? item.labelZh : item.labelEn;
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        title={label}
        style={{
          ...buttonStyle,
          background: isActive ? "var(--accent-color, #58a6ff)" : "transparent",
          color: isActive ? "white" : "var(--text-secondary, #8b949e)",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--hover-bg, #21262d)";
            e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
          }
        }}
      >
        {item.icon}
      </button>
    );
  };
  const renderNewConnectionButton = () => {
    const isPillActive = isNewConnHovered || menuOpen;
    return (
      <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "center" }} onMouseEnter={() => setIsNewConnHovered(true)} onMouseLeave={() => setIsNewConnHovered(false)}>
        {/* Shared pill container */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            height: 28,
            borderRadius: 5,
            background: isPillActive ? "var(--hover-bg, #21262d)" : "transparent",
            transition: "background 0.15s",
            overflow: "hidden",
          }}
        >
          {/* Left half: "+" icon. Opens the dialog directly. */}
          <button
            onClick={() => onNewConnection?.()}
            title={isZh ? "新建连接" : "New Connection"}
            style={{
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              color: isPillActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              outline: "none",
              transition: "color 0.15s",
            }}
          >
            <Plus size={16} />
          </button>
          {/* Thin divider between the two halves. */}
          <div
            style={{
              width: 1,
              alignSelf: "stretch",
              margin: "6px 0",
              background: isPillActive ? "var(--border-color, #30363d)" : "transparent",
              transition: "background 0.15s",
            }}
          />
          {/* Right half: chevron. Opens the dropdown. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            title={isZh ? "更多" : "More"}
            style={{
              width: 18,
              height: 28,
              border: "none",
              background: "transparent",
              color: isPillActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              outline: "none",
              transition: "color 0.15s",
            }}
          >
            <ChevronDown size={11} />
          </button>
        </div>
        {/* Dropdown menu */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: 220,
              background: "var(--bg-secondary, #161b22)",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              zIndex: 60,
              overflow: "hidden",
              padding: "4px 0",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                padding: "6px 12px 4px 12px",
              }}
            >
              {isZh ? "常用数据库列表" : "Common Databases"}
            </div>
            {COMMON_DATABASES.map((db) => (
              <button
                key={db.key}
                onClick={() => {
                  setMenuOpen(false);
                  onNewConnection?.(db.key);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: db.color ?? "var(--bg-tertiary, #21262d)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {db.logo ?? (db.nameEn || "?").charAt(0).toUpperCase()}
                </span>
                <span>{isZh ? db.nameZh : db.nameEn}</span>
              </button>
            ))}
            <div
              style={{
                height: 1,
                background: "var(--border-color, #30363d)",
                margin: "4px 0",
              }}
            />
            <button
              onClick={() => {
                setMenuOpen(false);
                onNewConnection?.();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "var(--text-primary, #e6edf3)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Layers size={14} />
              <span>{isZh ? "新建数据库连接" : "New Database Connection"}</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div
      className="database-client-top-bar"
      style={{
        height: TOP_BAR_HEIGHT,
        minHeight: TOP_BAR_HEIGHT,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-secondary, #161b22)",
        borderBottom: "1px solid var(--border-color, #30363d)",
        paddingLeft: 8,
        paddingRight: 8,
        boxSizing: "border-box",
        flexShrink: 0,
        gap: 6,
        userSelect: "none",
      }}
    >
      {/* Left: new connection pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>{renderNewConnectionButton()}</div>
      {/* Right: history (and future buttons) */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>{RIGHT_ITEMS.map(renderItem)}</div>
    </div>
  );
};
export default DataBaseClientTopBar;
