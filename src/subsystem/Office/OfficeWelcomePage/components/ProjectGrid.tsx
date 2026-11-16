import React, { useState } from "react";
import { Image as ImageIcon, Pin, Clock, MoreVertical, Edit2, PinOff, Trash2, Check, History, RefreshCw, FolderOpen } from "lucide-react";
import { formatSessionDate } from "../utils";
import { DialogSession } from "../../../../types/types";
import { generalCommands } from "../../../../command/General";
import { showToast, ToastType } from "../../../../components/Toast";
import { imageEditorCommands } from "../../../../command/ImageEditor/General";
interface ProjectGridProps {
  t: (key: string, params?: any) => string;
  sessions: DialogSession[];
  isBatchMode: boolean;
  selectedIds: Set<string>;
  hoveredId: string | null;
  editingId: string | null;
  editValue: string;
  activeMenuId: string | null;
  getSessionThumbnail: (session: DialogSession) => string | null;
  onSelectSession: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onTogglePin: (session: DialogSession, e: React.MouseEvent) => void;
  onDeleteSession: (session: DialogSession, e: React.MouseEvent) => void;
  onStartEdit: (session: DialogSession, e: React.MouseEvent) => void;
  onEditChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent, session: DialogSession) => void;
  onEditBlur: (session: DialogSession) => void;
  onSetHoveredId: (id: string | null) => void;
  onSetActiveMenuId: (id: string | null) => void;
  onLoadSessions: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}
export const ProjectGrid: React.FC<ProjectGridProps> = ({
  t,
  sessions,
  isBatchMode,
  selectedIds,
  hoveredId,
  editingId,
  editValue,
  activeMenuId,
  getSessionThumbnail,
  onSelectSession,
  onToggleSelection,
  onToggleAll,
  onTogglePin,
  onDeleteSession,
  onStartEdit,
  onEditChange,
  onEditKeyDown,
  onEditBlur,
  onSetHoveredId,
  onSetActiveMenuId,
  onLoadSessions,
  menuRef,
  editInputRef,
}) => {
  const isZh = t("i18n") === "zh";
  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const handleOpenSessionDir = async (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dir = await imageEditorCommands.getImageEditorSessionDir(session.session_id);
      const result = await generalCommands.openExplorer(dir);
      if (!result.success) {
        showToast(ToastType.ERROR, result.message || (isZh ? "无法打开目录" : "Failed to open directory"));
      }
    } catch (err) {
      console.error("[ProjectGrid] Failed to open session dir:", err);
      showToast(ToastType.ERROR, isZh ? "无法打开目录" : "Failed to open directory");
    }
    onSetActiveMenuId(null);
    setContextMenuPos(null);
  };
  const handleOpenMenuFromButton = (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenuId === session.session_id) {
      onSetActiveMenuId(null);
      setContextMenuPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const estimatedMenuWidth = 160;
    const estimatedMenuHeight = 200;
    let left = rect.right - estimatedMenuWidth;
    let top = rect.bottom + 4;
    if (left < 8) left = 8;
    if (left + estimatedMenuWidth > window.innerWidth - 8) {
      left = window.innerWidth - estimatedMenuWidth - 8;
    }
    if (top + estimatedMenuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedMenuHeight - 4);
    }
    setContextMenuPos({ x: left, y: top });
    onSetActiveMenuId(session.session_id);
  };
  const handleOpenMenuFromContext = (session: DialogSession, e: React.MouseEvent) => {
    e.preventDefault();
    if (isBatchMode || editingId === session.session_id) return;
    const estimatedMenuWidth = 160;
    const estimatedMenuHeight = 200;
    let left = e.clientX;
    let top = e.clientY;
    if (left + estimatedMenuWidth > window.innerWidth - 8) {
      left = window.innerWidth - estimatedMenuWidth - 8;
    }
    if (left < 8) left = 8;
    if (top + estimatedMenuHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - estimatedMenuHeight - 8);
    }
    setContextMenuPos({ x: left, y: top });
    onSetActiveMenuId(session.session_id);
  };
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {isBatchMode && (
            <button
              onClick={onToggleAll}
              style={{
                background: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "5px",
                cursor: "pointer",
                padding: "2px 6px",
                color: allSelected ? "var(--accent-color)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
              }}
            >
              <Check size={14} />
              {allSelected ? (isZh ? "取消全选" : "Deselect All") : isZh ? "全选" : "Select All"}
            </button>
          )}
          <History size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{isZh ? "我的项目" : "My Projects"}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({sessions.length})</span>
          {isBatchMode && selectedIds.size > 0 && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--accent-color)",
                fontWeight: 500,
              }}
            >
              {isZh ? `已选 ${selectedIds.size} 个` : `${selectedIds.size} selected`}
            </span>
          )}
        </div>
        <button
          onClick={onLoadSessions}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "5px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {/* Project Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        {sessions.map((session) => {
          const isHovered = hoveredId === session.session_id;
          const isEditing = editingId === session.session_id;
          const thumbnail = getSessionThumbnail(session);
          const isSelected = selectedIds.has(session.session_id);
          return (
            <div
              key={session.session_id}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: "5px",
                overflow: "hidden",
                background: "var(--bg-secondary)",
                cursor: "pointer",
                transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                boxShadow: isHovered ? "0 8px 32px rgba(0,0,0,0.12)" : "none",
                position: "relative",
              }}
              onMouseEnter={() => onSetHoveredId(session.session_id)}
              onMouseLeave={() => onSetHoveredId(null)}
              onClick={() => {
                if (!isEditing) {
                  if (isBatchMode) {
                    onToggleSelection(session.session_id);
                  } else {
                    onSelectSession(session.session_id);
                  }
                }
              }}
              onContextMenu={(e) => handleOpenMenuFromContext(session, e)}
            >
              {isBatchMode && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    zIndex: 5,
                    width: "20px",
                    height: "20px",
                    borderRadius: "5px",
                    background: isSelected ? "var(--accent-color)" : "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {isSelected && <Check size={12} color="white" />}
                </div>
              )}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "56.25%",
                  background: "var(--bg-tertiary)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={session.title || "Project"}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    <ImageIcon size={48} color="var(--text-muted)" strokeWidth={1.5} />
                  </div>
                )}
                {session.is_pinned && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      background: "rgba(0,0,0,0.6)",
                      borderRadius: "5px",
                      padding: "2px 6px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <Pin size={10} color="#fbbf24" />
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    right: "0",
                    padding: "4px 8px",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Clock size={10} color="rgba(255,255,255,0.7)" />
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.8)" }}>{formatSessionDate(session.created_at, isZh ? "zh" : "en")}</span>
                </div>
              </div>
              {/* Info */}
              <div
                style={{
                  padding: "10px 12px 12px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--accent-color)",
                      borderRadius: "5px",
                      padding: "2px 6px",
                      outline: "none",
                      flex: 1,
                    }}
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onKeyDown={(e) => onEditKeyDown(e, session)}
                    onBlur={() => onEditBlur(session)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                    title={session.title || "Untitled"}
                  >
                    {session.title || (isZh ? "未命名" : "Untitled")}
                  </span>
                )}
                {/* Three-dot menu button - hidden in batch mode */}
                {!isBatchMode && (
                  <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "5px",
                        transition: "background 0.2s, color 0.2s",
                      }}
                      onClick={(e) => handleOpenMenuFromButton(session, e)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {activeMenuId &&
        contextMenuPos &&
        (() => {
          const session = sessions.find((s) => s.session_id === activeMenuId);
          if (!session) return null;
          return (
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: contextMenuPos.x,
                top: contextMenuPos.y,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "5px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                zIndex: 9999,
                minWidth: "140px",
                overflow: "hidden",
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Open Folder - open the session's on-disk project directory */}
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s",
                }}
                onClick={(e) => handleOpenSessionDir(session, e)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
              >
                <FolderOpen size={12} /> {isZh ? "打开所在目录" : "Open Folder"}
              </div>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s",
                }}
                onClick={(e) => onStartEdit(session, e)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
              >
                <Edit2 size={12} /> {isZh ? "重命名" : "Rename"}
              </div>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.15s",
                }}
                onClick={(e) => onTogglePin(session, e)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
              >
                {session.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                {session.is_pinned ? (isZh ? "取消置顶" : "Unpin") : isZh ? "置顶" : "Pin"}
              </div>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--error-color, #dc2626)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderTop: "1px solid var(--border-color)",
                  transition: "background 0.15s",
                }}
                onClick={(e) => onDeleteSession(session, e)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
              >
                <Trash2 size={12} /> {isZh ? "删除" : "Delete"}
              </div>
            </div>
          );
        })()}
    </div>
  );
};