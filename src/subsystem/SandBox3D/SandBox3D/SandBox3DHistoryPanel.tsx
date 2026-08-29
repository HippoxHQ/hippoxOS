import React from "react";
import { ThreeSceneSnapshot } from ".";
import { ChevronDown, ChevronUp } from "lucide-react";
interface SandBox3DHistoryPanelProps {
  /** List of scene snapshots to display */
  snapshots: ThreeSceneSnapshot[];
  /** Currently active snapshot ID */
  activeSnapshotId: string | null;
  /** Called when user clicks a snapshot */
  onSnapshotClick: (snapshotId: string) => void;
  /** Called when user toggles the panel */
  onToggle: () => void;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Translation function */
  t: (key: string, params?: any) => string;
  /** Whether language is Chinese */
  isZh: boolean;
}
export const SandBox3DHistoryPanel: React.FC<SandBox3DHistoryPanelProps> = ({ snapshots, activeSnapshotId, onSnapshotClick, onToggle, isExpanded, t, isZh }) => {
  // Get active thumbnail
  const active = snapshots.find((s) => s.id === activeSnapshotId);
  const activeThumbnail = active?.thumbnail || null;
  const activeTitle = active?.title || (isZh ? "空场景" : "Empty Scene");
  // Empty state
  if (snapshots.length === 0) {
    return (
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          zIndex: 10,
          fontSize: "11px",
          color: "var(--text-tertiary)",
          opacity: 0.4,
          pointerEvents: "none",
          fontFamily: "monospace",
        }}
      >
        {isZh ? "💡 开始对话，生成3D场景" : "💡 Start chatting to generate 3D scenes"}
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
      }}
    >
      {!isExpanded && (
        <div
          className="sandbox3d-thumbnail-trigger"
          onClick={onToggle}
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "8px",
            padding: "3px",
            border: "2px solid var(--border-color)",
            cursor: "pointer",
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transition: "border-color 0.2s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-color)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-color)";
          }}
          title={isZh ? "点击展开历史场景" : "Click to expand history"}
        >
          {activeThumbnail ? (
            <img
              src={activeThumbnail}
              alt={activeTitle}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: "24px",
                color: "var(--text-tertiary)",
              }}
            >
              🧊
            </span>
          )}
          <div
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              background: "var(--accent-color)",
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {snapshots.length}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              background: "rgba(0,0,0,0.5)",
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            <ChevronUp size={18} />
          </div>
        </div>
      )}
      {isExpanded && (
        <div
          className="sandbox3d-history-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            width: "180px",
            height: "calc(100vh - 120px)",
            maxHeight: "calc(100% - 40px)",
            minHeight: "200px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "slideUp 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
              background: "var(--bg-tertiary)",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {isZh ? `历史场景 (${snapshots.length})` : `History (${snapshots.length})`}
            </span>
            <button
              onClick={onToggle}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              title={isZh ? "收起" : "Collapse"}
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {snapshots
              .slice()
              .reverse()
              .map((snapshot) => {
                const isActive = snapshot.id === activeSnapshotId;
                return (
                  <div
                    key={snapshot.id}
                    onClick={() => onSnapshotClick(snapshot.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "4px 6px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isActive ? "var(--accent-glow)" : "transparent",
                      border: isActive ? "1px solid var(--accent-color)" : "1px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--hover-bg)";
                        e.currentTarget.style.borderColor = "var(--border-color)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "30px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {snapshot.thumbnail ? (
                        <img
                          src={snapshot.thumbnail}
                          alt={snapshot.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "14px" }}>🧊</span>
                      )}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "11px",
                        color: isActive ? "var(--accent-color)" : "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: isActive ? 500 : 400,
                      }}
                      title={snapshot.title}
                    >
                      {snapshot.title}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
