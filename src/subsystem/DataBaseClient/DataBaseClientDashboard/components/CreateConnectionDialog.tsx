import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Plug, ChevronLeft, ChevronRight, Check } from "lucide-react";
import logo from "../../../../assets/logo.png";
/**
 * A single database type entry shown in the right-hand grid.
 */
export interface DatabaseTypeItem {
  key: string;
  nameEn: string;
  nameZh: string;
  category: string;
  logo?: React.ReactNode;
  color?: string;
}
/**
 * A category entry shown on the left side.
 */
export interface DatabaseCategory {
  key: string;
  labelEn: string;
  labelZh: string;
}
interface CreateConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDatabase?: (item: DatabaseTypeItem) => void;
  /** Called when the user clicks "Test Connection" */
  onTestConnection?: () => void;
  /** Called when the user clicks "Back" (previous step) */
  onPrev?: () => void;
  /** Called when the user clicks "Next" */
  onNext?: () => void;
  /** Called when the user clicks "Finish" (submits the dialog) */
  onFinish?: () => void;
  i18n?: "en" | "zh-cn";
}
const DEFAULT_CATEGORIES: DatabaseCategory[] = [
  { key: "all", labelEn: "All", labelZh: "全部" },
  { key: "popular", labelEn: "Popular", labelZh: "热门" },
  { key: "sql", labelEn: "SQL", labelZh: "SQL" },
  { key: "nosql", labelEn: "NoSQL", labelZh: "NoSQL" },
  { key: "cloud", labelEn: "Cloud", labelZh: "云数据库" },
  { key: "embedded", labelEn: "Embedded", labelZh: "嵌入式" },
];
const DEFAULT_DATABASES: DatabaseTypeItem[] = [
  { key: "mysql", nameEn: "MySQL", nameZh: "MySQL", category: "popular", color: "#00758f" },
  { key: "postgresql", nameEn: "PostgreSQL", nameZh: "PostgreSQL", category: "popular", color: "#336791" },
  { key: "sqlite", nameEn: "SQLite", nameZh: "SQLite", category: "popular", color: "#003b57" },
  { key: "mariadb", nameEn: "MariaDB", nameZh: "MariaDB", category: "sql", color: "#c0765a" },
  { key: "sqlserver", nameEn: "SQL Server", nameZh: "SQL Server", category: "sql", color: "#a91e22" },
  { key: "oracle", nameEn: "Oracle", nameZh: "Oracle", category: "sql", color: "#c74634" },
  { key: "db2", nameEn: "IBM Db2", nameZh: "IBM Db2", category: "sql", color: "#054ada" },
  { key: "clickhouse", nameEn: "ClickHouse", nameZh: "ClickHouse", category: "sql", color: "#ffcc00" },
  { key: "duckdb", nameEn: "DuckDB", nameZh: "DuckDB", category: "sql", color: "#f5a623" },
  { key: "mongodb", nameEn: "MongoDB", nameZh: "MongoDB", category: "nosql", color: "#13aa52" },
  { key: "redis", nameEn: "Redis", nameZh: "Redis", category: "nosql", color: "#d82c20" },
  { key: "cassandra", nameEn: "Cassandra", nameZh: "Cassandra", category: "nosql", color: "#1287b1" },
  { key: "neo4j", nameEn: "Neo4j", nameZh: "Neo4j", category: "nosql", color: "#018bff" },
  { key: "couchdb", nameEn: "CouchDB", nameZh: "CouchDB", category: "nosql", color: "#e42528" },
  { key: "elasticsearch", nameEn: "Elasticsearch", nameZh: "Elasticsearch", category: "nosql", color: "#005571" },
  { key: "snowflake", nameEn: "Snowflake", nameZh: "Snowflake", category: "cloud", color: "#29b5e8" },
  { key: "bigquery", nameEn: "BigQuery", nameZh: "BigQuery", category: "cloud", color: "#4285f4" },
  { key: "redshift", nameEn: "Redshift", nameZh: "Redshift", category: "cloud", color: "#8c4fff" },
  { key: "supabase", nameEn: "Supabase", nameZh: "Supabase", category: "cloud", color: "#3ecf8e" },
  { key: "duckdb-emb", nameEn: "DuckDB (Embedded)", nameZh: "DuckDB（嵌入式）", category: "embedded", color: "#f5a623" },
  { key: "h2", nameEn: "H2", nameZh: "H2", category: "embedded", color: "#5c6bc0" },
  { key: "derby", nameEn: "Apache Derby", nameZh: "Apache Derby", category: "embedded", color: "#00618a" },
];
/**
 * Default dialog size.
 */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 500;
/**
 * Minimum dialog size.
 */
const MIN_WIDTH = 480;
const MIN_HEIGHT = 360;
/**
 * Resize handle directions.
 */
type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
/**
 * CreateConnectionDialog
 */
const CreateConnectionDialog: React.FC<CreateConnectionDialogProps> = ({ open, onClose, onSelectDatabase, onTestConnection, onPrev, onNext, onFinish, i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDatabaseKey, setSelectedDatabaseKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    offsetX: number;
    offsetY: number;
  }>({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });
  const resizeRef = useRef<{
    resizing: boolean;
    dir: ResizeDir;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
  }>({
    resizing: false,
    dir: "se",
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0,
  });
  /**
   * Clamp a geometry rectangle so that it always stays fully inside the
   * current viewport.
   */
  const clampGeometry = useCallback((rect: { left: number; top: number; width: number; height: number }) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(MIN_WIDTH, Math.min(rect.width, vw));
    const height = Math.max(MIN_HEIGHT, Math.min(rect.height, vh));
    const maxLeft = vw - width;
    const maxTop = vh - height;
    const left = Math.max(0, Math.min(rect.left, maxLeft));
    const top = Math.max(0, Math.min(rect.top, maxTop));
    return { left, top, width, height };
  }, []);
  useEffect(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(DEFAULT_WIDTH, vw);
    const height = Math.min(DEFAULT_HEIGHT, vh);
    const left = Math.max(0, Math.floor((vw - width) / 2));
    const top = Math.max(0, Math.floor((vh - height) / 2));
    setGeometry({ left, top, width, height });
    setSelectedDatabaseKey(null);
  }, [open]);
  // Re-clamp geometry whenever the browser window is resized.
  useEffect(() => {
    if (!open) return;
    const handleWindowResize = () => {
      setGeometry((prev) => (prev ? clampGeometry(prev) : prev));
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [open, clampGeometry]);
  useEffect(() => {
    if (!open) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rs = resizeRef.current;
      if (rs.resizing) {
        const dx = e.clientX - rs.startX;
        const dy = e.clientY - rs.startY;
        let newLeft = rs.startLeft;
        let newTop = rs.startTop;
        let newWidth = rs.startWidth;
        let newHeight = rs.startHeight;
        if (rs.dir.includes("e")) newWidth = rs.startWidth + dx;
        if (rs.dir.includes("s")) newHeight = rs.startHeight + dy;
        if (rs.dir.includes("w")) {
          newWidth = rs.startWidth - dx;
          newLeft = rs.startLeft + dx;
        }
        if (rs.dir.includes("n")) {
          newHeight = rs.startHeight - dy;
          newTop = rs.startTop + dy;
        }
        // Enforce minimum size before clamping.
        if (newWidth < MIN_WIDTH) {
          if (rs.dir.includes("w")) newLeft -= MIN_WIDTH - newWidth;
          newWidth = MIN_WIDTH;
        }
        if (newHeight < MIN_HEIGHT) {
          if (rs.dir.includes("n")) newTop -= MIN_HEIGHT - newHeight;
          newHeight = MIN_HEIGHT;
        }
        const clamped = clampGeometry({
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight,
        });
        setGeometry(clamped);
        return;
      }
      const ds = dragRef.current;
      if (ds.dragging) {
        const nextLeft = e.clientX - ds.offsetX;
        const nextTop = e.clientY - ds.offsetY;
        setGeometry((prev) =>
          prev
            ? clampGeometry({
                left: nextLeft,
                top: nextTop,
                width: prev.width,
                height: prev.height,
              })
            : prev,
        );
      }
    };
    const handleMouseUp = () => {
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
        document.body.style.userSelect = "";
      }
      if (resizeRef.current.resizing) {
        resizeRef.current.resizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [open, clampGeometry]);
  const handleTitleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-drag]")) return;
      if (!geometry) return;
      dragRef.current.dragging = true;
      dragRef.current.offsetX = e.clientX - geometry.left;
      dragRef.current.offsetY = e.clientY - geometry.top;
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [geometry],
  );
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, dir: ResizeDir) => {
      if (!geometry) return;
      resizeRef.current.resizing = true;
      resizeRef.current.dir = dir;
      resizeRef.current.startX = e.clientX;
      resizeRef.current.startY = e.clientY;
      resizeRef.current.startLeft = geometry.left;
      resizeRef.current.startTop = geometry.top;
      resizeRef.current.startWidth = geometry.width;
      resizeRef.current.startHeight = geometry.height;
      document.body.style.userSelect = "none";
      e.stopPropagation();
      e.preventDefault();
    },
    [geometry],
  );
  const visibleDatabases = useMemo(() => {
    const byCategory = activeCategory === "all" ? DEFAULT_DATABASES : DEFAULT_DATABASES.filter((db) => db.category === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter((db) => db.nameEn.toLowerCase().includes(q) || db.nameZh.toLowerCase().includes(q) || db.key.toLowerCase().includes(q));
  }, [activeCategory, searchQuery]);
  if (!open || !geometry) return null;
  // Cursor per resize direction.
  const cursorForDir = (dir: ResizeDir): string => {
    switch (dir) {
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      case "nw":
      case "se":
        return "nwse-resize";
    }
  };
  // Common style for a single resize handle.
  const resizeHandleStyle = (dir: ResizeDir): React.CSSProperties => {
    const size = 6; // hit area thickness
    const base: React.CSSProperties = {
      position: "absolute",
      zIndex: 2,
    };
    if (dir === "n") return { ...base, top: -size / 2, left: 8, right: 8, height: size, cursor: cursorForDir(dir) };
    if (dir === "s") return { ...base, bottom: -size / 2, left: 8, right: 8, height: size, cursor: cursorForDir(dir) };
    if (dir === "w") return { ...base, left: -size / 2, top: 8, bottom: 8, width: size, cursor: cursorForDir(dir) };
    if (dir === "e") return { ...base, right: -size / 2, top: 8, bottom: 8, width: size, cursor: cursorForDir(dir) };
    if (dir === "ne") return { ...base, top: -size / 2, right: -size / 2, width: 10, height: 10, cursor: cursorForDir(dir) };
    if (dir === "nw") return { ...base, top: -size / 2, left: -size / 2, width: 10, height: 10, cursor: cursorForDir(dir) };
    if (dir === "se") return { ...base, bottom: -size / 2, right: -size / 2, width: 10, height: 10, cursor: cursorForDir(dir) };
    return { ...base, bottom: -size / 2, left: -size / 2, width: 10, height: 10, cursor: cursorForDir(dir) };
  };
  const RESIZE_DIRS: ResizeDir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    >
      <div
        ref={dialogRef}
        style={{
          position: "fixed",
          left: geometry.left,
          top: geometry.top,
          width: geometry.width,
          height: geometry.height,
          background: "var(--bg-primary, #0d1117)",
          color: "var(--text-primary, #e6edf3)",
          border: "1px solid var(--border-color, #30363d)",
          borderRadius: 5,
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {RESIZE_DIRS.map((dir) => (
          <div key={dir} onMouseDown={(e) => handleResizeMouseDown(e, dir)} style={resizeHandleStyle(dir)} />
        ))}
        <div
          onMouseDown={handleTitleBarMouseDown}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            height: 41,
            minHeight: 41,
            background: "var(--bg-secondary, #161b22)",
            borderBottom: "1px solid var(--border-color, #30363d)",
            flexShrink: 0,
            cursor: "move",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={logo}
              alt="logo"
              draggable={false}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                flexShrink: 0,
                pointerEvents: "none",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>HippoxOS</span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary, #6e7681)" }}>{isZh ? "链接到数据库" : "Connect to Database"}</span>
            </div>
          </div>
          <button
            data-no-drag
            onClick={onClose}
            title={isZh ? "关闭" : "Close"}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary, #8b949e)",
              cursor: "pointer",
              width: 28,
              height: 28,
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <div
            style={{
              width: 180,
              minWidth: 180,
              borderRight: "1px solid var(--border-color, #30363d)",
              overflowY: "auto",
              padding: "8px 6px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary, #6e7681)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                padding: "6px 8px",
              }}
            >
              {isZh ? "数据分类" : "Categories"}
            </div>
            {DEFAULT_CATEGORIES.map((category) => {
              const isActive = activeCategory === category.key;
              const label = isZh ? category.labelZh : category.labelEn;
              return (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 10px",
                    borderRadius: 5,
                    border: "none",
                    background: isActive ? "var(--accent-color, #58a6ff)" : "transparent",
                    color: isActive ? "white" : "var(--text-secondary, #8b949e)",
                    cursor: "pointer",
                    fontSize: 12,
                    marginBottom: 2,
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
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-color, #30363d)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg-secondary, #161b22)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 5,
                  padding: "5px 10px",
                }}
              >
                <Search size={14} color="var(--text-muted, #6e7681)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isZh ? "搜索数据库…" : "Search databases…"}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary, #e6edf3)",
                    fontSize: 12,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {visibleDatabases.map((db) => {
                const isSelected = selectedDatabaseKey === db.key;
                return (
                  <button
                    key={db.key}
                    onClick={() => {
                      setSelectedDatabaseKey(db.key);
                      onSelectDatabase?.(db);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "16px 8px 14px 8px",
                      borderRadius: 5,
                      background: isSelected ? "var(--accent-glow, rgba(88,166,255,0.15))" : "var(--bg-secondary, #161b22)",
                      border: isSelected ? "1px solid var(--accent-color, #58a6ff)" : "1px solid var(--border-color, #30363d)",
                      color: "var(--text-primary, #e6edf3)",
                      cursor: "pointer",
                      transition: "border-color 0.15s, transform 0.15s, background 0.15s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--accent-color, #58a6ff)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--border-color, #30363d)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: db.color ?? "var(--bg-tertiary, #21262d)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 16,
                        overflow: "hidden",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                      }}
                    >
                      {db.logo ?? (db.nameEn || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 12, textAlign: "center", lineHeight: 1.3 }}>{isZh ? db.nameZh : db.nameEn}</div>
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 16,
                          height: 16,
                          borderRadius: "5px",
                          background: "var(--accent-color, #58a6ff)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
              {visibleDatabases.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-muted, #6e7681)",
                    fontSize: 12,
                  }}
                >
                  {isZh ? "没有匹配的数据库" : "No databases found"}
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderTop: "1px solid var(--border-color, #30363d)",
            background: "var(--bg-secondary, #161b22)",
            flexShrink: 0,
            gap: 10,
          }}
        >
          <button
            onClick={onTestConnection}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 5,
              border: "1px solid var(--border-color, #30363d)",
              background: "transparent",
              color: "var(--text-secondary, #8b949e)",
              fontSize: 12,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
              e.currentTarget.style.borderColor = "var(--accent-color, #58a6ff)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              e.currentTarget.style.borderColor = "var(--border-color, #30363d)";
            }}
          >
            <Plug size={14} />
            {isZh ? "测试连接" : "Test Connection"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onPrev}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 5,
                border: "1px solid var(--border-color, #30363d)",
                background: "transparent",
                color: "var(--text-secondary, #8b949e)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              }}
            >
              <ChevronLeft size={14} />
              {isZh ? "上一步" : "Back"}
            </button>
            <button
              onClick={onNext}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 5,
                border: "1px solid var(--border-color, #30363d)",
                background: "transparent",
                color: "var(--text-secondary, #8b949e)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              }}
            >
              {isZh ? "下一步" : "Next"}
              <ChevronRight size={14} />
            </button>
            <button
              onClick={onFinish}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 14px",
                borderRadius: 5,
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
              <Check size={14} />
              {isZh ? "完成" : "Finish"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                borderRadius: 5,
                border: "1px solid var(--border-color, #30363d)",
                background: "transparent",
                color: "var(--text-secondary, #8b949e)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
              }}
            >
              {isZh ? "取消" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CreateConnectionDialog;
