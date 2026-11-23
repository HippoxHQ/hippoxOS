import React, { useRef, useState } from "react";
import { Image as ImageIcon, File, Plus, Search, X, Grid3x3, List, ArrowUp, ArrowDown, ChevronDown, Check, Pin, PinOff, Trash2 } from "lucide-react";
import { ViewMode, SortOrder } from "../types";
import office_logo from "../../../../assets/office-logo.png";
interface TopBarProps {
  t: (key: string, params?: any) => string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewProject: () => void;
  onImportFile: () => void;
  isBatchMode: boolean;
  setIsBatchMode: (value: boolean) => void;
  selectedSessionCount: number;
  onBatchPin: () => void;
  onBatchUnpin: () => void;
  onBatchDeleteSessions: () => void;
  allSessionsSelected: boolean;
  onToggleAllSessions: () => void;
}
export const TopBar: React.FC<TopBarProps> = ({
  t,
  viewMode,
  setViewMode,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,
  onNewProject,
  onImportFile,
  isBatchMode,
  setIsBatchMode,
  selectedSessionCount,
  onBatchPin,
  onBatchUnpin,
  onBatchDeleteSessions,
  allSessionsSelected,
  onToggleAllSessions,
}) => {
  const isZh = t("i18n") === "zh";
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  // Close sort dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    setShowSortDropdown(false);
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        padding: "0 32px 12px 32px",
        borderBottom: "1px solid var(--border-color)",
        gap: "12px",
        flexWrap: "nowrap",
        minHeight: "56px",
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div
          style={{
            width: "83px",
            height: "40px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
          }}
        >
          <img
            src={office_logo}
            style={{
              width: "83px",
              height: "40px",
              borderRadius: "10px",
              flexShrink: 0,
              objectFit: "cover",
            }}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            HippoxOS
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: 400,
              letterSpacing: "0.3px",
              whiteSpace: "nowrap",
            }}
          >
            {isZh ? "办公工具" : "Office Tools"}
          </div>
        </div>
      </div>
      {/* Right: Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          flex: "1 1 auto",
          minWidth: "0",
        }}
      >
        {/* Batch mode toggle */}
        <button
          onClick={() => {
            setIsBatchMode(!isBatchMode);
          }}
          style={{
            background: isBatchMode ? "var(--accent-color)" : "var(--bg-secondary)",
            border: isBatchMode ? "1px solid var(--accent-color)" : "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
            color: isBatchMode ? "white" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          title={isZh ? "批量操作" : "Batch Operations"}
        >
          <Check size={14} />
          {isBatchMode ? (isZh ? "退出批量" : "Exit Batch") : isZh ? "批量" : "Batch"}
        </button>
        {/* Batch action buttons */}
        {isBatchMode && (
          <>
            <div style={{ width: "1px", height: "28px", background: "var(--border-color)", flexShrink: 0 }} />
            <button
              onClick={onBatchPin}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <Pin size={14} />
              {isZh ? "置顶" : "Pin"}
            </button>
            <button
              onClick={onBatchUnpin}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <PinOff size={14} />
              {isZh ? "取消置顶" : "Unpin"}
            </button>
            <button
              onClick={onBatchDeleteSessions}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--error-color)",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--error-color)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
            >
              <Trash2 size={14} />
              {isZh ? "删除项目" : "Delete Projects"}
              {selectedSessionCount > 0 && (
                <span
                  style={{
                    background: "var(--error-color)",
                    color: "white",
                    borderRadius: "50%",
                    padding: "0 6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedSessionCount}
                </span>
              )}
            </button>
          </>
        )}
        <div style={{ width: "1px", height: "28px", background: "var(--border-color)", margin: "0 4px", flexShrink: 0 }} />
        {/* View mode toggle */}
        <button
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-color)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title={isZh ? "切换视图" : "Toggle View"}
        >
          {viewMode === "grid" ? <Grid3x3 size={14} /> : <List size={14} />}
        </button>
        {/* Sort dropdown */}
        <div ref={sortDropdownRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title={isZh ? "排序" : "Sort"}
          >
            {sortOrder === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
            <ChevronDown size={12} />
          </button>
          {showSortDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                zIndex: 100,
                minWidth: "160px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border-color)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {isZh ? "排序方式" : "Sort By"}
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: sortOrder === "desc" ? "var(--accent-color)" : "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ArrowDown size={14} />
                {isZh ? "最新优先" : "Newest First"}
                {sortOrder === "desc" && <Check size={14} style={{ marginLeft: "auto" }} />}
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: sortOrder === "asc" ? "var(--accent-color)" : "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderTop: "1px solid var(--border-color)",
                  whiteSpace: "nowrap",
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ArrowUp size={14} />
                {isZh ? "最早优先" : "Oldest First"}
                {sortOrder === "asc" && <Check size={14} style={{ marginLeft: "auto" }} />}
              </div>
            </div>
          )}
        </div>
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "4px 12px",
            flexShrink: "1 1 120px",
            minWidth: "100px",
            maxWidth: "200px",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-color)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)";
          }}
        >
          <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isZh ? "搜索项目..." : "Search projects..."}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "12px",
              outline: "none",
              padding: "6px 0",
              width: "100%",
              minWidth: "40px",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ width: "1px", height: "28px", background: "var(--border-color)", margin: "0 4px", flexShrink: 0 }} />
        {/* New Project Button */}
        <button
          onClick={onNewProject}
          style={{
            background: "linear-gradient(135deg, var(--accent-color), #6366f1)",
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            cursor: "pointer",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 12px rgba(99, 102, 241, 0.3)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(99, 102, 241, 0.3)";
          }}
        >
          <Plus size={14} />
          {isZh ? "新建项目" : "New Project"}
        </button>
        {/* Import File Button */}
        <button
          onClick={onImportFile}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "8.5px 18px",
            borderRadius: "8px",
            background: "transparent",
            border: "1.5px solid var(--border-color)",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#818cf8";
            e.currentTarget.style.color = "#818cf8";
            e.currentTarget.style.background = "rgba(99, 102, 241, 0.06)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <File size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          {isZh ? "导入文件" : "Import"}
        </button>
      </div>
    </div>
  );
};
