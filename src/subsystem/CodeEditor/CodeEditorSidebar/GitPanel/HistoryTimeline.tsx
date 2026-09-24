import React, { useMemo, useState } from "react";
import { GitBranch, Tag as TagIcon } from "lucide-react";
export interface HistoryCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  committer: string;
  branch: string | null;
  isHead: boolean;
  parents: string[];
  /** Branch names that point at this commit. */
  branches?: string[];
  /** Tag names that point at this commit. */
  tags?: string[];
}
interface HistoryTimelineProps {
  isZh: boolean;
  commits: HistoryCommit[];
  loading: boolean;
  selectedHash: string | null;
  onSelect: (commit: HistoryCommit) => void;
  onContextMenu?: (e: React.MouseEvent, commit: HistoryCommit) => void;
  onDoubleClick?: (commit: HistoryCommit) => void;
}
const COL_GRAPH_PX = 100;
const COL_HASH_PX = 70;
const COL_DATE_PX = 140;
const COL_AUTHOR_PX = 200;
const COL_COMMITTER_PX = 120;
const LANE_WIDTH = 14;
const ROW_HEIGHT = 26;
const GRAPH_LINE_COLOR = "var(--border-color)";
const GRAPH_HEAD_COLOR = "var(--accent-color)";
const GRAPH_NODE_COLOR = "var(--text-muted)";
interface RowGraph {
  lane: number;
  continuesUp: boolean;
  passThroughLanes: number[];
  parentEdges: { lane: number; sameLane: boolean }[];
  continuesDown: boolean;
}
interface GraphLayout {
  rows: RowGraph[];
  laneCount: number;
}
/**
 * Build the graph layout.
 */
const computeGraphLayout = (commits: HistoryCommit[]): GraphLayout => {
  const shortToFull = new Map<string, string>();
  commits.forEach((c) => {
    const h = c.hash || "";
    if (!h) return;
    for (let len = 7; len <= Math.min(12, h.length); len += 1) {
      const prefix = h.slice(0, len);
      if (!shortToFull.has(prefix)) {
        shortToFull.set(prefix, h);
      }
    }
    shortToFull.set(h, h);
  });
  const norm = (p: string): string => {
    const trimmed = (p || "").trim();
    if (!trimmed) return "";
    return shortToFull.get(trimmed) ?? trimmed;
  };
  const activeLanes: (string | null)[] = [];
  const ensureLane = (): number => {
    for (let i = 0; i < activeLanes.length; i += 1) {
      if (activeLanes[i] === null) return i;
    }
    activeLanes.push(null);
    return activeLanes.length - 1;
  };
  const laneOf = new Map<string, number>();
  for (const c of commits) {
    const selfHash = c.hash;
    let lane = activeLanes.indexOf(selfHash);
    if (lane === -1) {
      lane = ensureLane();
      activeLanes[lane] = selfHash;
    }
    laneOf.set(selfHash, lane);
    const parents = (c.parents || []).map(norm).filter((p) => p.length > 0);
    if (parents.length === 0) {
      activeLanes[lane] = null;
    } else {
      activeLanes[lane] = parents[0];
      for (let i = 1; i < parents.length; i += 1) {
        const p = parents[i];
        if (activeLanes.includes(p)) continue;
        const extra = ensureLane();
        activeLanes[extra] = p;
      }
    }
  }
  // Second pass: build per-row info.
  const rows: RowGraph[] = [];
  const sim: (string | null)[] = [];
  const ensureSim = (): number => {
    for (let i = 0; i < sim.length; i += 1) {
      if (sim[i] === null) return i;
    }
    sim.push(null);
    return sim.length - 1;
  };
  const activeBeforeRow: number[][] = [];
  for (let idx = 0; idx < commits.length; idx += 1) {
    const before: number[] = [];
    sim.forEach((v, i) => {
      if (v !== null) before.push(i);
    });
    activeBeforeRow.push(before);
    const c = commits[idx];
    const lane = laneOf.get(c.hash)!;
    let simLane = sim.indexOf(c.hash);
    if (simLane === -1) {
      simLane = ensureSim();
      sim[simLane] = c.hash;
    }
    const parents = (c.parents || []).map(norm).filter((p) => p.length > 0);
    if (parents.length === 0) {
      sim[lane] = null;
    } else {
      sim[lane] = parents[0];
      for (let i = 1; i < parents.length; i += 1) {
        const p = parents[i];
        if (sim.includes(p)) continue;
        const extra = ensureSim();
        sim[extra] = p;
      }
    }
  }
  const activeAfterRow: number[][] = [];
  {
    const sim2: (string | null)[] = [];
    const ensureSim2 = (): number => {
      for (let i = 0; i < sim2.length; i += 1) {
        if (sim2[i] === null) return i;
      }
      sim2.push(null);
      return sim2.length - 1;
    };
    for (const c of commits) {
      let lane = sim2.indexOf(c.hash);
      if (lane === -1) {
        lane = ensureSim2();
        sim2[lane] = c.hash;
      }
      const parents = (c.parents || []).map(norm).filter((p) => p.length > 0);
      if (parents.length === 0) {
        sim2[lane] = null;
      } else {
        sim2[lane] = parents[0];
        for (let i = 1; i < parents.length; i += 1) {
          const p = parents[i];
          if (sim2.includes(p)) continue;
          const extra = ensureSim2();
          sim2[extra] = p;
        }
      }
      const after: number[] = [];
      sim2.forEach((v, i) => {
        if (v !== null) after.push(i);
      });
      activeAfterRow.push(after);
    }
  }
  let maxLane = 0;
  commits.forEach((c) => {
    const l = laneOf.get(c.hash) ?? 0;
    if (l > maxLane) maxLane = l;
  });
  commits.forEach((c, idx) => {
    const lane = laneOf.get(c.hash) ?? 0;
    const before = activeBeforeRow[idx];
    const after = activeAfterRow[idx];
    const continuesUp = before.includes(lane) && idx > 0;
    const parents = (c.parents || []).map(norm).filter((p) => p.length > 0);
    const parentEdges = parents.map((p) => {
      const pLane = laneOf.get(p);
      return { lane: pLane === undefined ? lane : pLane, sameLane: (pLane ?? lane) === lane };
    });
    const continuesDown = parentEdges.some((e) => e.sameLane);
    const exclude = new Set<number>([lane, ...parentEdges.map((e) => e.lane)]);
    const passThroughLanes = after.filter((l) => before.includes(l) && !exclude.has(l));
    rows.push({ lane, continuesUp, passThroughLanes, parentEdges, continuesDown });
  });
  return { rows, laneCount: maxLane + 1 };
};
const laneX = (lane: number): number => lane * LANE_WIDTH + LANE_WIDTH / 2 + 4;
const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ isZh, commits, loading, selectedHash, onSelect, onContextMenu, onDoubleClick }) => {
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const { rows, laneCount } = useMemo(() => computeGraphLayout(commits), [commits]);
  const graphWidth = Math.max(COL_GRAPH_PX, laneCount * LANE_WIDTH + 8);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 12px",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: `${graphWidth}px`, flexShrink: 0, textAlign: "center" }}>{isZh ? "图谱" : "Graph"}</span>
        <span style={{ width: `${COL_HASH_PX}px`, flexShrink: 0 }}>{isZh ? "哈希" : "Hash"}</span>
        <span style={{ flex: 1, minWidth: 0 }}>{isZh ? "描述" : "Description"}</span>
        <span style={{ width: `${COL_DATE_PX}px`, flexShrink: 0 }}>{isZh ? "日期" : "Date"}</span>
        <span style={{ width: `${COL_AUTHOR_PX}px`, flexShrink: 0 }}>{isZh ? "作者" : "Author"}</span>
        <span style={{ width: `${COL_COMMITTER_PX}px`, flexShrink: 0 }}>{isZh ? "提交者" : "Committer"}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {loading && commits.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载历史中..." : "Loading history..."}</div>
        ) : commits.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "暂无提交历史" : "No commit history"}</div>
        ) : (
          commits.map((c, idx) => {
            const selected = c.hash === selectedHash;
            const hovered = hoveredHash === c.hash;
            const cellColor = selected ? "var(--accent-color)" : "var(--text-primary)";
            const row = rows[idx];
            const cx = laneX(row.lane);
            const midY = ROW_HEIGHT / 2;
            return (
              <div
                key={c.hash}
                onClick={() => onSelect(c)}
                onDoubleClick={() => onDoubleClick?.(c)}
                onContextMenu={(e) => onContextMenu?.(e, c)}
                onMouseEnter={() => setHoveredHash(c.hash)}
                onMouseLeave={() => setHoveredHash(null)}
                title={c.hash}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "0 12px",
                  height: `${ROW_HEIGHT}px`,
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  cursor: "pointer",
                  background: selected ? "var(--accent-glow)" : hovered ? "var(--hover-bg)" : "transparent",
                  color: selected ? "var(--accent-color)" : "var(--text-primary)",
                  borderLeft: selected ? "2px solid var(--accent-color)" : "2px solid transparent",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span style={{ width: `${graphWidth}px`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={graphWidth} height={ROW_HEIGHT} style={{ display: "block" }}>
                    {row.passThroughLanes.map((lane) => (
                      <line key={`pt-${lane}`} x1={laneX(lane)} y1={0} x2={laneX(lane)} y2={ROW_HEIGHT} stroke={GRAPH_LINE_COLOR} strokeWidth={1.5} />
                    ))}
                    {row.continuesUp && <line x1={cx} y1={0} x2={cx} y2={midY} stroke={GRAPH_LINE_COLOR} strokeWidth={1.5} />}
                    {row.continuesDown && <line x1={cx} y1={midY} x2={cx} y2={ROW_HEIGHT} stroke={GRAPH_LINE_COLOR} strokeWidth={1.5} />}
                    {row.parentEdges.map((edge, i) => {
                      if (edge.sameLane) return null;
                      const px = laneX(edge.lane);
                      return <path key={`pe-${i}`} d={`M ${cx} ${midY} C ${cx} ${midY + ROW_HEIGHT * 0.4}, ${px} ${midY + ROW_HEIGHT * 0.1}, ${px} ${ROW_HEIGHT}`} fill="none" stroke={GRAPH_LINE_COLOR} strokeWidth={1.5} />;
                    })}
                    <circle cx={cx} cy={midY} r={c.isHead ? 4.5 : 3.5} fill={c.isHead ? GRAPH_HEAD_COLOR : GRAPH_NODE_COLOR} stroke="var(--bg-primary)" strokeWidth={1} />
                  </svg>
                </span>
                <span style={{ width: `${COL_HASH_PX}px`, flexShrink: 0, color: cellColor, fontSize: "11px" }}>{c.shortHash}</span>
                {/* Description: branch/tag labels + subject */}
                <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                  {c.branches &&
                    c.branches.length > 0 &&
                    c.branches.map((b) => (
                      <span
                        key={`b-${b}`}
                        style={{
                          fontSize: "9px",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: c.isHead ? "var(--accent-glow)" : "var(--bg-tertiary)",
                          color: c.isHead ? "var(--accent-color)" : "var(--text-secondary)",
                          flexShrink: 0,
                          fontWeight: c.isHead ? 600 : 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <GitBranch size={9} />
                        {b}
                      </span>
                    ))}
                  {c.tags &&
                    c.tags.length > 0 &&
                    c.tags.map((t) => (
                      <span
                        key={`t-${t}`}
                        style={{
                          fontSize: "9px",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                          flexShrink: 0,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <TagIcon size={9} />
                        {t}
                      </span>
                    ))}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: cellColor, fontWeight: selected ? 600 : 400 }}>{c.message || "(no message)"}</span>
                </span>
                <span style={{ width: `${COL_DATE_PX}px`, flexShrink: 0, color: cellColor, fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>{c.date}</span>
                <span style={{ width: `${COL_AUTHOR_PX}px`, flexShrink: 0, color: cellColor, fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.author}
                  {c.authorEmail ? ` <${c.authorEmail}>` : ""}
                </span>
                <span style={{ width: `${COL_COMMITTER_PX}px`, flexShrink: 0, color: cellColor, fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>{c.committer || "-"}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default HistoryTimeline;
