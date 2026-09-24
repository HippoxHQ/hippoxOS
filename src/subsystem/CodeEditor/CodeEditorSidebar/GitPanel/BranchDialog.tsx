import React, { useEffect, useState } from "react";
import { GitBranch, X, Plus, Minus, ArrowRightLeft } from "lucide-react";
type BranchTab = "switch" | "new" | "delete";
interface BranchDialogProps {
  isZh: boolean;
  /** Initial tab to open. "manage" opens on the "switch" tab. */
  mode: "manage" | "new" | "delete";
  /** Currently typed branch name (for "new") or selected branch (for "delete"/"switch"). */
  input: string;
  onInputChange: (value: string) => void;
  /** List of local branches. */
  branches: string[];
  /** Currently checked-out branch (highlighted in "switch" tab). */
  currentBranch: string;
  /** True while an async branch operation is in flight. */
  isWorking: boolean;
  onCancel: () => void;
  /**
   * Called when the user confirms the active action.
   * The parent reads `tab` to know whether to switch / create / delete.
   */
  onConfirm: (tab: BranchTab) => void;
}
const BranchDialog: React.FC<BranchDialogProps> = ({ isZh, mode, input, onInputChange, branches, currentBranch, isWorking, onCancel, onConfirm }) => {
  // Internal tab state.
  // When opened via the single "Branch" button (`mode === "manage"`),
  // the dialog defaults to the "switch" tab. Otherwise it starts on the
  // tab matching the requested mode.
  const [activeTab, setActiveTab] = useState<BranchTab>(mode === "new" ? "new" : mode === "delete" ? "delete" : "switch");
  // Whenever the dialog is re-opened with a different mode, reset the tab.
  useEffect(() => {
    setActiveTab(mode === "new" ? "new" : mode === "delete" ? "delete" : "switch");
  }, [mode]);
  // A confirm is disabled when the user hasn't provided a valid target.
  const canConfirm = (() => {
    if (isWorking) return false;
    const name = input.trim();
    if (activeTab === "new") return name.length > 0;
    if (activeTab === "delete") return name.length > 0 && name !== currentBranch;
    // switch
    return name.length > 0 && name !== currentBranch;
  })();
  /**
   * Small reusable tab button.
   * Visually highlights the active tab.
   */
  const TabButton: React.FC<{ tab: BranchTab; icon: React.ReactNode; label: string }> = ({ tab, icon, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          onInputChange("");
        }}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          height: "28px",
          fontSize: "12px",
          fontWeight: isActive ? 600 : 400,
          background: isActive ? "var(--accent-glow)" : "transparent",
          border: "1px solid",
          borderColor: isActive ? "var(--accent-color)" : "var(--border-color)",
          borderRadius: "4px",
          color: isActive ? "var(--accent-color)" : "var(--text-secondary)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        {icon}
        {label}
      </button>
    );
  };
  /**
   * Return a list of branches sorted so that the current branch is on top.
   */
  const sortedBranches = (() => {
    const list = [...branches];
    list.sort((a, b) => {
      if (a === currentBranch) return -1;
      if (b === currentBranch) return 1;
      return a.localeCompare(b);
    });
    return list;
  })();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 90vw)",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <GitBranch size={14} />
            {isZh ? "分支管理" : "Branch Management"}
          </span>
          <button
            onClick={onCancel}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
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
          >
            <X size={14} />
          </button>
        </div>
        {/* Tab strip: switch / new / delete */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <TabButton tab="switch" icon={<ArrowRightLeft size={12} />} label={isZh ? "切换分支" : "Switch"} />
          <TabButton tab="new" icon={<Plus size={12} />} label={isZh ? "新建分支" : "New"} />
          <TabButton tab="delete" icon={<Minus size={12} />} label={isZh ? "删除分支" : "Delete"} />
        </div>
        {/* Body */}
        {activeTab === "new" ? (
          // New branch: single text input
          <input
            type="text"
            autoFocus
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={isZh ? "输入新分支名..." : "Enter new branch name..."}
            style={{
              width: "100%",
              height: "32px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-primary)",
              fontSize: "12px",
              padding: "0 10px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
          // Switch / Delete: list of local branches
          <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
            {sortedBranches.length === 0 ? (
              <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无分支" : "No branches"}</div>
            ) : (
              sortedBranches.map((b) => {
                const isCurrent = b === currentBranch;
                const isSelected = input === b;
                // In delete mode, disallow deleting the currently checked-out branch
                const disabled = activeTab === "delete" && isCurrent;
                return (
                  <div
                    key={b}
                    onClick={() => {
                      if (!disabled) onInputChange(b);
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "12px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                      background: isSelected ? "var(--accent-glow)" : "transparent",
                      color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !disabled) e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !disabled) e.currentTarget.style.background = "transparent";
                    }}
                    title={disabled ? (isZh ? "无法删除当前分支" : "Cannot delete the current branch") : b}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b}</span>
                    {isCurrent && <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", flexShrink: 0 }}>{isZh ? "当前" : "Current"}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* Footer buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onCancel}
            disabled={isWorking}
            style={{
              padding: "4px 16px",
              height: "28px",
              fontSize: "12px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: isWorking ? "not-allowed" : "pointer",
              opacity: isWorking ? 0.5 : 1,
            }}
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            onClick={() => onConfirm(activeTab)}
            disabled={!canConfirm}
            style={{
              padding: "4px 16px",
              height: "28px",
              fontSize: "12px",
              fontWeight: 500,
              background: !canConfirm ? "var(--bg-tertiary)" : "var(--accent-color)",
              border: "none",
              borderRadius: "4px",
              color: !canConfirm ? "var(--text-muted)" : "#fff",
              cursor: !canConfirm ? "not-allowed" : "pointer",
              opacity: !canConfirm ? 0.6 : 1,
            }}
          >
            {isWorking ? (isZh ? "处理中..." : "Working...") : activeTab === "switch" ? (isZh ? "切换" : "Switch") : activeTab === "new" ? (isZh ? "创建" : "Create") : isZh ? "删除" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default BranchDialog;
