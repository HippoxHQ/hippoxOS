import React, { useEffect, useMemo, useState } from "react";
import { Upload, X, GitBranch, Tag as TagIcon, CheckSquare, Square } from "lucide-react";
interface UnpushedCommit {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
}
interface PushDialogProps {
  isZh: boolean;
  remoteShortName: string;
  currentBranch: string;
  remoteBranches: string[];
  localBranches: string[];
  tags: string[];
  remoteTags: string[];
  unpushedCommits: UnpushedCommit[];
  loadingCommits: boolean;
  isPushing: boolean;
  onCancel: () => void;
  onConfirm: (branches: string[], tags: string[]) => void;
}
const PushDialog: React.FC<PushDialogProps> = ({ isZh, remoteShortName, currentBranch, remoteBranches, localBranches, tags, remoteTags, unpushedCommits, loadingCommits, isPushing, onCancel, onConfirm }) => {
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const safeLocalBranches = Array.isArray(localBranches) ? localBranches : [];
  const safeRemoteBranches = Array.isArray(remoteBranches) ? remoteBranches : [];
  const safeLocalTags = Array.isArray(tags) ? tags : [];
  const safeRemoteTags = Array.isArray(remoteTags) ? remoteTags : [];
  const safeCommits = Array.isArray(unpushedCommits) ? unpushedCommits : [];
  const localBranchSet = useMemo(() => new Set(safeLocalBranches), [safeLocalBranches]);
  const remoteBranchSet = useMemo(() => new Set(safeRemoteBranches), [safeRemoteBranches]);
  const localTagSet = useMemo(() => new Set(safeLocalTags), [safeLocalTags]);
  const remoteTagSet = useMemo(() => new Set(safeRemoteTags), [safeRemoteTags]);
  const branchCandidates = useMemo(() => {
    const set = new Set<string>();
    const isHeadLike = (name: string): boolean => {
      const n = (name || "").trim();
      if (!n) return true;
      if (n === "HEAD") return true;
      if (n.startsWith("HEAD ")) return true;
      if (n.startsWith("(HEAD")) return true;
      if (n.toLowerCase() === "head") return true;
      if (n.endsWith("/HEAD")) return true;
      return false;
    };
    safeLocalBranches.forEach((b) => {
      const n = (b || "").trim();
      if (!isHeadLike(n)) set.add(n);
    });
    safeRemoteBranches.forEach((b) => {
      const n = (b || "").trim();
      if (!isHeadLike(n)) set.add(n);
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      if (a === currentBranch) return -1;
      if (b === currentBranch) return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [safeLocalBranches, safeRemoteBranches, currentBranch]);
  const tagCandidates = useMemo(() => {
    const set = new Set<string>();
    safeLocalTags.forEach((t) => set.add(t));
    safeRemoteTags.forEach((t) => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [safeLocalTags, safeRemoteTags]);
  const pushableTags = useMemo(() => safeLocalTags.slice().sort((a, b) => a.localeCompare(b)), [safeLocalTags]);
  useEffect(() => {
    const initialBranches = new Set<string>();
    if (currentBranch && currentBranch !== "HEAD") initialBranches.add(currentBranch);
    setSelectedBranches(initialBranches);
    // Do NOT pre-select tags: the user should opt in explicitly.
    setSelectedTags(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleBranch = (name: string) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const toggleTag = (name: string) => {
    // Remote-only tags are not pushable, so they are not toggleable.
    if (!localTagSet.has(name)) return;
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const selectAllBranches = () => setSelectedBranches(new Set(branchCandidates));
  const selectNoBranches = () => setSelectedBranches(new Set());
  const selectAllTags = () => setSelectedTags(new Set(pushableTags));
  const selectNoTags = () => setSelectedTags(new Set());
  const canConfirm = !isPushing && (selectedBranches.size > 0 || selectedTags.size > 0);
  const handleConfirm = () => {
    onConfirm(Array.from(selectedBranches), Array.from(selectedTags));
  };
  /** Small badge style used next to branch / tag names. */
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
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Upload size={14} />
            {isZh ? "推送到远程" : "Push to Remote"}
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
        {/* Remote info */}
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 }}>
          {isZh ? "远程仓库" : "Remote"}: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>{remoteShortName || "-"}</span>
        </div>
        {/* Scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Branches section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <GitBranch size={12} />
                {isZh ? "分支" : "Branches"}
                <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>
                  ({selectedBranches.size}/{branchCandidates.length})
                </span>
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={selectAllBranches}
                  style={{
                    padding: "2px 8px",
                    height: "20px",
                    fontSize: "10px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {isZh ? "全选" : "All"}
                </button>
                <button
                  onClick={selectNoBranches}
                  style={{
                    padding: "2px 8px",
                    height: "20px",
                    fontSize: "10px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {isZh ? "清空" : "None"}
                </button>
              </div>
            </div>
            <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
              {branchCandidates.length === 0 ? (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无分支" : "No branches"}</div>
              ) : (
                branchCandidates.map((b) => {
                  const checked = selectedBranches.has(b);
                  const isCurrent = b === currentBranch;
                  const isLocal = localBranchSet.has(b);
                  const isRemote = remoteBranchSet.has(b);
                  return (
                    <div
                      key={b}
                      onClick={() => toggleBranch(b)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        background: checked ? "var(--accent-glow)" : "transparent",
                        color: checked ? "var(--accent-color)" : "var(--text-primary)",
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b}</span>
                      {isCurrent && <span style={{ ...badgeStyle, background: "var(--accent-glow)", color: "var(--accent-color)" }}>{isZh ? "当前" : "Current"}</span>}
                      {isLocal && <span style={badgeStyle}>{isZh ? "本地" : "Local"}</span>}
                      {isRemote && <span style={badgeStyle}>{isZh ? "远程" : "Remote"}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Tags section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <TagIcon size={12} />
                {isZh ? "标签" : "Tags"}
                <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>
                  ({selectedTags.size}/{pushableTags.length})
                </span>
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={selectAllTags}
                  style={{
                    padding: "2px 8px",
                    height: "20px",
                    fontSize: "10px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {isZh ? "全选" : "All"}
                </button>
                <button
                  onClick={selectNoTags}
                  style={{
                    padding: "2px 8px",
                    height: "20px",
                    fontSize: "10px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {isZh ? "清空" : "None"}
                </button>
              </div>
            </div>
            <div style={{ maxHeight: "140px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
              {tagCandidates.length === 0 ? (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无标签" : "No tags"}</div>
              ) : (
                tagCandidates.map((t) => {
                  const isLocal = localTagSet.has(t);
                  const isRemote = remoteTagSet.has(t);
                  // Tags are single-sided: if it exists locally, it's
                  // "Local" (and pushable); otherwise it's "Remote"
                  // (already on origin, not pushable).
                  const isPushable = isLocal;
                  const checked = isPushable && selectedTags.has(t);
                  return (
                    <div
                      key={t}
                      onClick={() => toggleTag(t)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: isPushable ? "pointer" : "default",
                        background: checked ? "var(--accent-glow)" : "transparent",
                        color: checked ? "var(--accent-color)" : "var(--text-primary)",
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: isPushable ? 1 : 0.7,
                      }}
                      title={isPushable ? t : isZh ? "该标签已存在于远程" : "Tag already exists on remote"}
                    >
                      {isPushable ? checked ? <CheckSquare size={14} /> : <Square size={14} /> : <Square size={14} style={{ opacity: 0.4 }} />}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                      {isRemote ? <span style={badgeStyle}>{isZh ? "远程" : "Remote"}</span> : isLocal ? <span style={badgeStyle}>{isZh ? "本地" : "Local"}</span> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Unpushed commits section */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              {isZh ? "待推送的本地提交" : "Local Commits Pending Push"}
              <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>({safeCommits.length})</span>
            </div>
            <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-primary)" }}>
              {loadingCommits ? (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载中..." : "Loading..."}</div>
              ) : safeCommits.length === 0 ? (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "没有待推送的提交" : "No pending commits"}</div>
              ) : (
                safeCommits.map((c) => (
                  <div
                    key={c.hash}
                    style={{
                      padding: "5px 10px",
                      fontSize: "12px",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--text-primary)",
                    }}
                    title={c.hash}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", fontSize: "11px", flexShrink: 0 }}>{c.shortHash}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject || "(no message)"}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px", flexShrink: 0 }}>{c.author}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={onCancel}
            disabled={isPushing}
            style={{
              padding: "4px 16px",
              height: "28px",
              fontSize: "12px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: isPushing ? "not-allowed" : "pointer",
              opacity: isPushing ? 0.5 : 1,
            }}
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding: "4px 20px",
              height: "28px",
              fontSize: "12px",
              fontWeight: 500,
              background: !canConfirm ? "var(--bg-tertiary)" : "var(--accent-color)",
              border: "none",
              borderRadius: "4px",
              color: !canConfirm ? "var(--text-muted)" : "#fff",
              cursor: !canConfirm ? "not-allowed" : "pointer",
              opacity: !canConfirm ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isPushing ? (isZh ? "推送中..." : "Pushing...") : isZh ? `推送 (${selectedBranches.size + selectedTags.size})` : `Push (${selectedBranches.size + selectedTags.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};
export default PushDialog;
