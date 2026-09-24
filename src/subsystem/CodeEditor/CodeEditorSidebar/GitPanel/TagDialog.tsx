import React, { useEffect, useMemo, useState } from "react";
import { Tag, X, Plus, Minus } from "lucide-react";
type TagTab = "new" | "delete";
interface TagDialogProps {
  isZh: boolean;
  mode: "manage" | "new" | "delete";
  input: string;
  onInputChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  tags: string[];
  remoteTags: string[];
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: (tab: TagTab) => void;
}
const TagDialog: React.FC<TagDialogProps> = ({ isZh, mode, input, onInputChange, message, onMessageChange, tags, remoteTags, isWorking, onCancel, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<TagTab>(mode === "delete" ? "delete" : "new");
  useEffect(() => {
    setActiveTab(mode === "delete" ? "delete" : "new");
  }, [mode]);
  const safeLocalTags = Array.isArray(tags) ? tags : [];
  const safeRemoteTags = Array.isArray(remoteTags) ? remoteTags : [];
  const localSet = useMemo(() => new Set(safeLocalTags), [safeLocalTags]);
  const remoteSet = useMemo(() => new Set(safeRemoteTags), [safeRemoteTags]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    safeLocalTags.forEach((t) => set.add(t));
    safeRemoteTags.forEach((t) => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [safeLocalTags, safeRemoteTags]);
  const canConfirm = (() => {
    if (isWorking) return false;
    const name = input.trim();
    if (activeTab === "new") return name.length > 0;
    return name.length > 0;
  })();
  const TabButton: React.FC<{ tab: TagTab; icon: React.ReactNode; label: string }> = ({ tab, icon, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          onInputChange("");
          onMessageChange("");
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
  const badgeStyle: React.CSSProperties = {
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "8px",
    background: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
    flexShrink: 0,
  };
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
            <Tag size={14} />
            {isZh ? "标签管理" : "Tag Management"}
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
          <TabButton tab="new" icon={<Plus size={12} />} label={isZh ? "新建标签" : "New"} />
          <TabButton tab="delete" icon={<Minus size={12} />} label={isZh ? "删除标签" : "Delete"} />
        </div>
        {activeTab === "new" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={isZh ? "输入新标签名..." : "Enter new tag name..."}
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
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder={isZh ? "标签说明（可选，填写后为附注标签）..." : "Tag message (optional, creates an annotated tag)..."}
              style={{
                width: "100%",
                height: "60px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--text-primary)",
                fontSize: "12px",
                padding: "6px 10px",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>
        ) : (
          <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
            {allTags.length === 0 ? (
              <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无标签" : "No tags"}</div>
            ) : (
              allTags.map((t) => {
                const isSelected = input === t;
                const isLocal = localSet.has(t);
                const isRemote = remoteSet.has(t);
                return (
                  <div
                    key={t}
                    onClick={() => onInputChange(t)}
                    style={{
                      padding: "6px 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      background: isSelected ? "var(--accent-glow)" : "transparent",
                      color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                    title={t}
                  >
                    <Tag size={12} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                    {isRemote ? <span style={badgeStyle}>{isZh ? "远程" : "Remote"}</span> : isLocal ? <span style={badgeStyle}>{isZh ? "本地" : "Local"}</span> : null}
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
            {isWorking ? (isZh ? "处理中..." : "Working...") : activeTab === "new" ? (isZh ? "创建" : "Create") : isZh ? "删除" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default TagDialog;
