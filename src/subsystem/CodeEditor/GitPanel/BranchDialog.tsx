import React, { useEffect, useState } from "react";
import { GitBranch, X, Plus, Minus, ArrowRightLeft } from "lucide-react";
type BranchTab = "switch" | "new" | "delete";
interface BranchDialogProps {
  isZh: boolean;
  mode: "manage" | "new" | "delete";
  input: string;
  onInputChange: (value: string) => void;
  branches: string[];
  currentBranch: string;
  remoteBranches: Set<string>;
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: (tab: BranchTab) => void;
}
const BranchDialog: React.FC<BranchDialogProps> = ({ isZh, mode, input, onInputChange, branches, currentBranch, remoteBranches, isWorking, onCancel, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<BranchTab>(mode === "new" ? "new" : mode === "delete" ? "delete" : "switch");
  useEffect(() => {
    setActiveTab(mode === "new" ? "new" : mode === "delete" ? "delete" : "switch");
  }, [mode]);
  /**
   * Normalize the current branch name.
   * Detached HEAD yields "HEAD" (or "HEAD detached at ..."), which is not
   * a real branch name, so it is treated as "no current branch".
   */
  const normalizedCurrentBranch = (() => {
    const name = (currentBranch || "").trim();
    if (!name) return "";
    if (name === "HEAD") return "";
    if (name.startsWith("HEAD ")) return "";
    if (name.startsWith("(HEAD")) return "";
    return name;
  })();
  const canConfirm = (() => {
    if (isWorking) return false;
    const name = input.trim();
    if (activeTab === "new") return name.length > 0;
    if (activeTab === "delete") return name.length > 0 && name !== normalizedCurrentBranch;
    return name.length > 0 && name !== normalizedCurrentBranch;
  })();
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
   * Branch list, with HEAD (and every detached-HEAD variant) filtered out.
   * Each entry is trimmed first so stray whitespace / prefixes from the
   * raw `git branch` output cannot leak through.
   */
  const sortedBranches = (() => {
    const list = [...branches]
      .map((b) => (b || "").trim())
      .filter((b) => {
        if (!b) return false;
        if (b === "HEAD") return false;
        if (b.startsWith("HEAD ")) return false;
        if (b.startsWith("(HEAD")) return false;
        if (b.toLowerCase() === "head") return false;
        if (b.endsWith("/HEAD")) return false;
        return true;
      });
    list.sort((a, b) => {
      if (a === normalizedCurrentBranch) return -1;
      if (b === normalizedCurrentBranch) return 1;
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <TabButton tab="switch" icon={<ArrowRightLeft size={12} />} label={isZh ? "切换分支" : "Switch"} />
          <TabButton tab="new" icon={<Plus size={12} />} label={isZh ? "新建分支" : "New"} />
          <TabButton tab="delete" icon={<Minus size={12} />} label={isZh ? "删除分支" : "Delete"} />
        </div>
        {activeTab === "new" ? (
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
          <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
            {sortedBranches.length === 0 ? (
              <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无分支" : "No branches"}</div>
            ) : (
              sortedBranches.map((b) => {
                const isCurrent = b === normalizedCurrentBranch;
                const isSelected = input === b;
                const isRemote = remoteBranches.has(b);
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
                    {isCurrent && <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "8px", background: "var(--accent-glow)", color: "var(--accent-color)", flexShrink: 0 }}>{isZh ? "当前" : "Current"}</span>}
                    {isRemote && <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "8px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", flexShrink: 0 }}>{isZh ? "远程" : "Remote"}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
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
