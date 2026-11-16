import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSessionManagement } from "./hooks/useSessionManagement";
import { useFileManagement } from "./hooks/useFileManagement";
import { useBatchSelection } from "./hooks/useBatchSelection";
import { TopBar } from "./components/TopBar";
import { EmptyState } from "./components/EmptyState";
import { ProjectGrid } from "./components/ProjectGrid";
import { ProjectList } from "./components/ProjectList";
import { ViewMode, SortOrder } from "./types";
import { filterSessionsByQuery } from "./utils";
// FIX: Use the Office session commands, not the ImageEditor ones.
import { officeSessionCommands } from "../../../command/session/office";
import { showDialog, DialogType } from "../../../components/Dialog";
import { showToast, ToastType } from "../../../components/Toast";
import { DialogSession } from "../../../types/types";
interface OfficeWelcomePageProps {
  t: (key: string, params?: any) => string;
  language?: "zh" | "en";
  onSelectImage: (imagePath: string, imageType: "file" | "empty" | "download") => Promise<void>;
  onNewProject?: () => void;
  onSelectSession?: (sessionId: string) => void;
  isLoading?: boolean;
}
const OfficeWelcomePage: React.FC<OfficeWelcomePageProps> = ({ t, language = "en", onSelectImage, onNewProject, onSelectSession, isLoading = false }) => {
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Determine language
  const isZh = t("i18n") === "zh";
  // Batch selection for sessions
  const sessionBatch = useBatchSelection<DialogSession>();
  // Session management hook
  const { sessions, loadingSessions, activeMenuId, hoveredSessionId, editingId, editValue, loadSessions, handleSelectSession, handleTogglePin, handleDeleteSession, startEdit, cancelEdit, saveEdit, handleKeyDown, setActiveMenuId, setHoveredSessionId, getSessionThumbnail, handleEditChange } =
    useSessionManagement({ t, sortOrder });
  // Filtered sessions
  const filteredSessions = filterSessionsByQuery(sessions, searchQuery);
  // File management hook
  const { isDragOver, setIsDragOver, handleSelectImageFile, handleDrop } = useFileManagement({ t, onSelectImage });
  // New project handler.
  // In the office subsystem, "new project" simply means "create a new session".
  // If the parent provides an `onNewProject` callback we delegate to it,
  // otherwise we fall back to the shared event channel that the parent listens to.
  const handleNewProject = useCallback(() => {
    if (onNewProject) {
      onNewProject();
    } else {
      // FIX: Dispatch office-scoped event.
      window.dispatchEvent(new CustomEvent("office-new-project", { detail: {} }));
    }
  }, [onNewProject]);
  // Batch action handlers for sessions
  const handleBatchPin = useCallback(async () => {
    if (sessionBatch.selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请先选择要置顶的项目" : "Please select items to pin");
      return;
    }
    try {
      const ids = Array.from(sessionBatch.selectedIds);
      for (const id of ids) {
        // FIX: Use office session commands.
        await officeSessionCommands.updatePinnedOfficeSessions(id, true);
      }
      await loadSessions();
      sessionBatch.clearSelection();
      showToast(ToastType.SUCCESS, isZh ? `已置顶 ${ids.length} 个会话` : `${ids.length} session(s) pinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量置顶失败" : "Batch pin failed");
    }
  }, [sessionBatch.selectedIds, isZh, loadSessions, sessionBatch.clearSelection]);
  const handleBatchUnpin = useCallback(async () => {
    if (sessionBatch.selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请先选择要取消置顶的项目" : "Please select items to unpin");
      return;
    }
    try {
      const ids = Array.from(sessionBatch.selectedIds);
      for (const id of ids) {
        // FIX: Use office session commands.
        await officeSessionCommands.updatePinnedOfficeSessions(id, false);
      }
      await loadSessions();
      sessionBatch.clearSelection();
      showToast(ToastType.SUCCESS, isZh ? `已取消置顶 ${ids.length} 个会话` : `${ids.length} session(s) unpinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量取消置顶失败" : "Batch unpin failed");
    }
  }, [sessionBatch.selectedIds, isZh, loadSessions, sessionBatch.clearSelection]);
  const handleBatchDeleteSessions = useCallback(() => {
    if (sessionBatch.selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请先选择要删除的项目" : "Please select items to delete");
      return;
    }
    showDialog(
      DialogType.WARNING,
      isZh ? "批量删除会话" : "Batch Delete Sessions",
      isZh ? `确定要删除选中的 ${sessionBatch.selectedIds.size} 个会话吗？此操作不可恢复。` : `Are you sure you want to delete ${sessionBatch.selectedIds.size} selected session(s)? This action cannot be undone.`,
      async () => {
        try {
          const ids = Array.from(sessionBatch.selectedIds);
          for (const id of ids) {
            // FIX: Use office session commands.
            await officeSessionCommands.deleteOfficeSession(id);
          }
          await loadSessions();
          sessionBatch.clearSelection();
          sessionBatch.setIsBatchMode(false);
          showToast(ToastType.SUCCESS, isZh ? `已删除 ${ids.length} 个会话` : `${ids.length} session(s) deleted`);
        } catch (error) {
          showToast(ToastType.ERROR, isZh ? "批量删除失败" : "Batch delete failed");
        }
      },
      undefined,
      isZh ? "删除" : "Delete",
      isZh ? "取消" : "Cancel",
    );
  }, [sessionBatch.selectedIds, isZh, loadSessions, sessionBatch.clearSelection, sessionBatch.setIsBatchMode]);
  // Click outside handler for menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (editingId && editInputRef.current && !editInputRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest(".menu-panel-close")) return;
        setTimeout(() => {
          if (editingId) {
            const session = filteredSessions.find((s) => s.session_id === editingId);
            if (session) {
              saveEdit(session);
            } else {
              cancelEdit();
            }
          }
        }, 150);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingId, setActiveMenuId, cancelEdit, saveEdit, filteredSessions]);
  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
        position: "relative",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 102, 204, 0.06)",
            border: "2px dashed var(--accent-color)",
            borderRadius: "16px",
            pointerEvents: "none",
            zIndex: 10,
            animation: "dropHighlight 0.3s ease",
          }}
        />
      )}
      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          padding: "16px 0 12px 0",
          overflow: "hidden",
          paddingBottom: "0px",
        }}
      >
        {/* Top Bar */}
        <TopBar
          t={t}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewProject={handleNewProject}
          onImportFile={handleSelectImageFile}
          isBatchMode={sessionBatch.isBatchMode}
          setIsBatchMode={(value) => {
            sessionBatch.setIsBatchMode(value);
          }}
          selectedSessionCount={sessionBatch.selectedIds.size}
          onBatchPin={handleBatchPin}
          onBatchUnpin={handleBatchUnpin}
          onBatchDeleteSessions={handleBatchDeleteSessions}
          allSessionsSelected={filteredSessions.length > 0 && sessionBatch.selectedIds.size === filteredSessions.length}
          onToggleAllSessions={() => sessionBatch.toggleAll(filteredSessions, (s) => s.session_id)}
        />
        {/* Main Content Area */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: viewMode === "grid" ? "auto" : "hidden",
            paddingTop: "12px",
            paddingBottom: "8px",
            paddingLeft: "0",
            paddingRight: "0",
            minHeight: 0,
          }}
        >
          <div
            style={{
              paddingLeft: "10px",
              paddingRight: "10px",
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {loadingSessions ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--text-muted)",
                }}
              >
                <div className="spinner" style={{ width: "24px", height: "24px", border: "2px solid var(--border-color)", borderTop: "2px solid var(--accent-color)", borderRadius: "50%" }} />
              </div>
            ) : filteredSessions.length === 0 ? (
              <EmptyState t={t} />
            ) : viewMode === "grid" ? (
              /* GRID VIEW - single outer scroll container */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "15px" }}>
                {/* Sessions Section - shown FIRST */}
                {filteredSessions.length > 0 && (
                  <ProjectGrid
                    t={t}
                    sessions={filteredSessions}
                    isBatchMode={sessionBatch.isBatchMode}
                    selectedIds={sessionBatch.selectedIds}
                    hoveredId={hoveredSessionId}
                    editingId={editingId}
                    editValue={editValue}
                    activeMenuId={activeMenuId}
                    getSessionThumbnail={getSessionThumbnail}
                    onSelectSession={(id) => handleSelectSession(id, onSelectSession)}
                    onToggleSelection={sessionBatch.toggleSelection}
                    onToggleAll={() => sessionBatch.toggleAll(filteredSessions, (s) => s.session_id)}
                    onTogglePin={handleTogglePin}
                    onDeleteSession={handleDeleteSession}
                    onStartEdit={startEdit}
                    onEditChange={handleEditChange}
                    onEditKeyDown={handleKeyDown}
                    onEditBlur={(session) => {
                      setTimeout(() => {
                        if (editingId === session.session_id) {
                          saveEdit(session);
                        }
                      }, 200);
                    }}
                    onSetHoveredId={setHoveredSessionId}
                    onSetActiveMenuId={setActiveMenuId}
                    onLoadSessions={loadSessions}
                    menuRef={menuRef}
                    editInputRef={editInputRef}
                  />
                )}
              </div>
            ) : (
              /* LIST VIEW - single column, each column scrolls internally */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: "10px",
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                  alignItems: "stretch",
                }}
              >
                <div style={{ minWidth: 0, minHeight: 0, height: "100%" }}>
                  <ProjectList
                    t={t}
                    sessions={filteredSessions}
                    isBatchMode={sessionBatch.isBatchMode}
                    selectedIds={sessionBatch.selectedIds}
                    hoveredId={hoveredSessionId}
                    editingId={editingId}
                    editValue={editValue}
                    activeMenuId={activeMenuId}
                    getSessionThumbnail={getSessionThumbnail}
                    onSelectSession={(id) => handleSelectSession(id, onSelectSession)}
                    onToggleSelection={sessionBatch.toggleSelection}
                    onToggleAll={() => sessionBatch.toggleAll(filteredSessions, (s) => s.session_id)}
                    onTogglePin={handleTogglePin}
                    onDeleteSession={handleDeleteSession}
                    onStartEdit={startEdit}
                    onEditChange={handleEditChange}
                    onEditKeyDown={handleKeyDown}
                    onEditBlur={(session) => {
                      setTimeout(() => {
                        if (editingId === session.session_id) {
                          saveEdit(session);
                        }
                      }, 200);
                    }}
                    onSetHoveredId={setHoveredSessionId}
                    onSetActiveMenuId={setActiveMenuId}
                    onLoadSessions={loadSessions}
                    menuRef={menuRef}
                    editInputRef={editInputRef}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dropHighlight {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        * {
          scrollbar-width: thin;
        }
      `}</style>
    </div>
  );
};
export default OfficeWelcomePage;
