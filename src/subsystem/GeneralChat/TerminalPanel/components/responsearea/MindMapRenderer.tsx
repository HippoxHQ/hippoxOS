import React, { useRef, useEffect, useState, useCallback } from "react";
import mermaid from "mermaid";
import { MindMapData, MindMapNode } from "../../../llm/types";
import ExportButton from "./ExportButton";
interface MindMapRendererProps {
  data: MindMapData;
  t: (key: string) => string;
  isZh?: boolean;
}
/**
 * Convert tree format (root + children) to Mermaid mindmap syntax
 */
const convertTreeToMermaid = (root: MindMapNode, depth: number = 0): string => {
  const indent = "  ".repeat(depth);
  const label = root.icon ? `${root.icon} ${root.label}` : root.label;
  let result = "";
  if (depth === 0) {
    result = `mindmap\n  root((${label}))`;
  } else {
    result = `${indent}${label}`;
  }
  if (root.children && root.children.length > 0) {
    const childrenStr = root.children.map((child) => convertTreeToMermaid(child, depth + 1)).join("\n");
    result += `\n${childrenStr}`;
  }
  return result;
};
/**
 * Get the Mermaid definition string from MindMapData
 * Supports both 'definition' string format and 'root' tree format
 */
const getMermaidDefinition = (data: MindMapData): string | undefined => {
  if (!data) return undefined;
  // Format 1: Direct definition string (Mermaid format)
  if ("definition" in data && data.definition && typeof data.definition === "string") {
    return data.definition;
  }
  // Format 2: Tree format with root node
  if ("root" in data && data.root) {
    return convertTreeToMermaid(data.root);
  }
  return undefined;
};
let mermaidInitialized = false;
/**
 * Initialize Mermaid with tech theme - all solid colors, no transparency
 */
const initMermaid = () => {
  if (mermaidInitialized) return;
  try {
    mermaid.initialize({
      theme: "dark",
      themeVariables: {
        primaryColor: "#6366f1",
        primaryBorderColor: "#818cf8",
        primaryTextColor: "#ffffff",
        lineColor: "#6b7280",
        secondaryColor: "#4f46e5",
        tertiaryColor: "#4338ca",
        textColor: "var(--text-primary, #e5e7eb)",
        fontSize: "14px",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        nodeBorder: "#818cf8",
        nodeTextColor: "#ffffff",
        nodeBackground: "#6366f1",
        edgeLabelBackground: "#1f2937",
        clusterBkg: "#1e1b4b",
        clusterBorder: "#4c1d95",
        titleColor: "var(--text-primary, #e5e7eb)",
        git0: "#6366f1",
        git1: "#818cf8",
        git2: "#a78bfa",
        git3: "#8b5cf6",
        git4: "#7c3aed",
        gitInv0: "#ffffff",
        gitInv1: "#e5e7eb",
        gitInv2: "#d1d5db",
        gitInv3: "#9ca3af",
        gitInv4: "#6b7280",
        actorBkg: "#6366f1",
        actorBorder: "#818cf8",
        actorTextColor: "#ffffff",
        actorLineColor: "#6b7280",
        signalColor: "#818cf8",
        signalTextColor: "var(--text-primary, #e5e7eb)",
        labelBoxBkgColor: "#1f2937",
        labelBoxBorderColor: "#4c1d95",
        labelTextColor: "var(--text-primary, #e5e7eb)",
        loopTextColor: "var(--text-primary, #e5e7eb)",
        noteBorderColor: "#4c1d95",
        noteBkgColor: "#1f2937",
        noteTextColor: "var(--text-primary, #e5e7eb)",
        activationBorderColor: "#818cf8",
        activationBkgColor: "#312e81",
        sequenceNumberColor: "#ffffff",
        classText: "var(--text-primary, #e5e7eb)",
        classBorder: "#818cf8",
        classBkg: "#1e1b4b",
        aggregateBkg: "#312e81",
        mainBkg: "#1e1b4b",
        mainBorder: "#818cf8",
        compositeTitle: "var(--text-primary, #e5e7eb)",
        pie1: "#6366f1",
        pie2: "#818cf8",
        pie3: "#a78bfa",
        pie4: "#8b5cf6",
        pie5: "#7c3aed",
        pie6: "#6d28d9",
        pie7: "#5b21b6",
        pie8: "#4c1d95",
        pieTitleTextSize: "16px",
        pieTitleTextColor: "var(--text-primary, #e5e7eb)",
        pieSectionTextSize: "12px",
        pieSectionTextColor: "#ffffff",
        pieLegendTextSize: "12px",
        pieLegendTextColor: "var(--text-primary, #e5e7eb)",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 15,
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      mindmap: {
        padding: 15,
      },
      themeCSS: `
        .mindmap-node rect {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
          rx: 10px !important;
          transition: all 0.25s ease !important;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3)) !important;
        }
        .mindmap-node:hover rect {
          fill: #818cf8 !important;
          stroke: #a78bfa !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 4px 16px rgba(99, 102, 241, 0.4)) !important;
        }
        .mindmap-node .label {
          color: #ffffff !important;
          fill: #ffffff !important;
          font-weight: 500 !important;
          font-size: 14px !important;
        }
        .mindmap-node[data-depth="0"] rect {
          fill: #4f46e5 !important;
          stroke: #a78bfa !important;
          stroke-width: 3px !important;
          rx: 14px !important;
          filter: drop-shadow(0 4px 20px rgba(99, 102, 241, 0.5)) !important;
        }
        .mindmap-node[data-depth="0"] .label {
          font-size: 18px !important;
          font-weight: 700 !important;
        }
        .mindmap-node[data-depth="2"] rect {
          fill: #7c3aed !important;
          stroke: #a78bfa !important;
        }
        .mindmap-node[data-depth="3"] rect {
          fill: #6d28d9 !important;
          stroke: #8b5cf6 !important;
        }
        .mindmap-node[data-depth="4"] rect {
          fill: #5b21b6 !important;
          stroke: #7c3aed !important;
        }
        .edgePath .path {
          stroke: #6b7280 !important;
          stroke-width: 2px !important;
        }
        .edgePath:hover .path {
          stroke: #818cf8 !important;
          stroke-width: 3px !important;
        }
        .edgeLabel {
          background: #1f2937 !important;
          border-radius: 4px !important;
          padding: 2px 10px !important;
          border: 1px solid #374151 !important;
        }
        .edgeLabel .label {
          color: #e5e7eb !important;
          fill: #e5e7eb !important;
          font-size: 11px !important;
        }
        .label {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
        }
        .cluster-label .label {
          color: #9ca3af !important;
          fill: #9ca3af !important;
        }
        .flowchart-node rect {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
          rx: 8px !important;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25)) !important;
          transition: all 0.25s ease !important;
        }
        .flowchart-node:hover rect {
          fill: #818cf8 !important;
          stroke: #a78bfa !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 4px 16px rgba(99, 102, 241, 0.4)) !important;
        }
        .flowchart-node .label {
          color: #ffffff !important;
          fill: #ffffff !important;
        }
        .flowchart-node polygon {
          fill: #7c3aed !important;
          stroke: #a78bfa !important;
          stroke-width: 2px !important;
          transition: all 0.25s ease !important;
        }
        .flowchart-node:hover polygon {
          fill: #8b5cf6 !important;
          stroke: #c4b5fd !important;
          stroke-width: 3px !important;
        }
        .actor {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2)) !important;
        }
        .actor .label {
          color: #ffffff !important;
          fill: #ffffff !important;
          font-weight: 600 !important;
        }
        .actor-line {
          stroke: #6b7280 !important;
          stroke-width: 1.5px !important;
          stroke-dasharray: 4, 2 !important;
        }
        .messageLine0 {
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .messageLine1 {
          stroke: #6b7280 !important;
          stroke-width: 2px !important;
          stroke-dasharray: 6, 4 !important;
        }
        .messageText {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
          font-size: 12px !important;
        }
        .loopLine {
          stroke: #6b7280 !important;
          stroke-width: 1.5px !important;
        }
        .labelBox {
          fill: #1f2937 !important;
          stroke: #4c1d95 !important;
        }
        .labelText {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
        }
        .note {
          fill: #1f2937 !important;
          stroke: #4c1d95 !important;
        }
        .noteText {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
        }
        .activation0 {
          fill: #312e81 !important;
          stroke: #818cf8 !important;
        }
        .activation1 {
          fill: #312e81 !important;
          stroke: #818cf8 !important;
        }
        .activation2 {
          fill: #312e81 !important;
          stroke: #818cf8 !important;
        }
        .classGroup rect {
          fill: #1e1b4b !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .classGroup .label {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
          font-weight: 600 !important;
        }
        .classGroup .classTitle {
          fill: #4f46e5 !important;
          color: #ffffff !important;
        }
        .relation {
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .attribute {
          color: #9ca3af !important;
          fill: #9ca3af !important;
        }
        .method {
          color: #a78bfa !important;
          fill: #a78bfa !important;
        }
        .stateGroup rect {
          fill: #1e1b4b !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
          rx: 8px !important;
        }
        .stateGroup .label {
          color: var(--text-primary, #e5e7eb) !important;
          fill: var(--text-primary, #e5e7eb) !important;
        }
        .transition {
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .transitionLabel {
          color: #9ca3af !important;
          fill: #9ca3af !important;
        }
        .task {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 1px !important;
        }
        .taskText {
          fill: #ffffff !important;
          color: #ffffff !important;
        }
        .taskTextOutsideRight {
          fill: #9ca3af !important;
          color: #9ca3af !important;
        }
        .taskTextOutsideLeft {
          fill: #9ca3af !important;
          color: #9ca3af !important;
        }
        .grid .tick {
          stroke: #374151 !important;
        }
        .grid .tick .tickLabel {
          color: #6b7280 !important;
          fill: #6b7280 !important;
        }
        .sectionTitle {
          fill: var(--text-primary, #e5e7eb) !important;
          color: var(--text-primary, #e5e7eb) !important;
          font-weight: 600 !important;
        }
        .titleText {
          fill: var(--text-primary, #e5e7eb) !important;
          color: var(--text-primary, #e5e7eb) !important;
          font-weight: 700 !important;
        }
        .slice {
          transition: all 0.25s ease !important;
        }
        .slice:hover {
          opacity: 0.85 !important;
          transform: scale(1.02) !important;
        }
        .pieTitleText {
          fill: var(--text-primary, #e5e7eb) !important;
          color: var(--text-primary, #e5e7eb) !important;
          font-weight: 700 !important;
          font-size: 16px !important;
        }
        .pieSectionText {
          fill: #ffffff !important;
          color: #ffffff !important;
          font-weight: 500 !important;
          font-size: 12px !important;
        }
        .legendText {
          fill: #9ca3af !important;
          color: #9ca3af !important;
          font-size: 12px !important;
        }
        .commit {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .commit .label {
          fill: #ffffff !important;
          color: #ffffff !important;
        }
        .branchLabel {
          fill: #4f46e5 !important;
          stroke: #818cf8 !important;
          stroke-width: 1px !important;
          rx: 4px !important;
        }
        .branchLabel .label {
          fill: #ffffff !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .commit-label .label {
          fill: #9ca3af !important;
          color: #9ca3af !important;
        }
        .timeline {
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .timeline .label {
          fill: var(--text-primary, #e5e7eb) !important;
          color: var(--text-primary, #e5e7eb) !important;
        }
        .timeline-event {
          fill: #6366f1 !important;
          stroke: #818cf8 !important;
          stroke-width: 2px !important;
        }
        .timeline-event .label {
          fill: #ffffff !important;
          color: #ffffff !important;
          font-weight: 500 !important;
        }
        .timeline-event-title {
          fill: var(--text-primary, #e5e7eb) !important;
          color: var(--text-primary, #e5e7eb) !important;
        }
        .timeline-event-text {
          fill: #9ca3af !important;
          color: #9ca3af !important;
        }
        .timeline-section .label {
          fill: #a78bfa !important;
          color: #a78bfa !important;
          font-weight: 600 !important;
        }
      `,
    });
    mermaidInitialized = true;
  } catch (err) {
    console.error("[MindMapRenderer] Failed to initialize Mermaid:", err);
  }
};
const MindMapRenderer: React.FC<MindMapRendererProps> = ({ data, t, isZh = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRenderingRef = useRef(false);
  // Store transform state to persist across re-renders
  const transformStateRef = useRef({
    scale: 1,
    panX: 0,
    panY: 0,
  });
  // Initialize Mermaid once on mount
  useEffect(() => {
    initMermaid();
  }, []);
  /**
   * Render the Mermaid diagram
   */
  const renderDiagram = useCallback(async () => {
    if (isRenderingRef.current) return;
    // Get the definition from data (supports both formats)
    const definition = getMermaidDefinition(data);
    if (!definition) {
      setIsLoading(false);
      setError("No diagram definition provided");
      return;
    }
    isRenderingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      let cleanDefinition = definition;
      if (cleanDefinition.includes("\\n")) {
        cleanDefinition = cleanDefinition.replace(/\\n/g, "\n");
      }
      cleanDefinition = cleanDefinition.trim();
      if (!cleanDefinition) {
        throw new Error("Diagram definition is empty");
      }
      const firstLine = cleanDefinition.split("\n")[0]?.trim() || "";
      const validTypes = ["mindmap", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "gitGraph", "timeline", "journey", "quadrantChart", "sankey", "xychart-beta"];
      let finalDefinition = cleanDefinition;
      const hasValidType = validTypes.some((type) => firstLine.startsWith(type) || firstLine.includes(type));
      if (!hasValidType) {
        const type = data?.type || "mindmap";
        finalDefinition = `${type}\n${cleanDefinition}`;
      }
      const { svg } = await mermaid.render(diagramId, finalDefinition);
      setSvgContent(svg);
      setIsLoading(false);
    } catch (err) {
      console.error("[MindMapRenderer] Mermaid render error:", err);
      setError(err instanceof Error ? err.message : "Failed to render diagram");
      setIsLoading(false);
    } finally {
      isRenderingRef.current = false;
    }
  }, [data]);
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      renderDiagram();
    }, 100);
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [renderDiagram]);
  // Inject SVG into container with persisted transform
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    try {
      containerRef.current.innerHTML = svgContent;
      const svgElement = containerRef.current.querySelector("svg");
      if (svgElement) {
        svgElement.style.width = "100%";
        svgElement.style.height = "auto";
        svgElement.style.maxWidth = "100%";
        svgElement.style.display = "block";
        svgElement.style.background = "transparent";
        // Restore previous transform state
        const { scale, panX, panY } = transformStateRef.current;
        if (scale !== 1 || panX !== 0 || panY !== 0) {
          svgElement.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
          svgElement.style.transformOrigin = "0 0";
        }
        // Add click events to nodes
        const nodes = svgElement.querySelectorAll(".mindmap-node, .flowchart-node, .node");
        nodes.forEach((node) => {
          node.addEventListener("click", () => {
            const labelEl = node.querySelector(".label, .node-label");
            if (labelEl) {
              const text = labelEl.textContent || "";
              window.dispatchEvent(
                new CustomEvent("show-toast", {
                  detail: {
                    message: `📌 ${text.trim()}`,
                    type: "info",
                  },
                }),
              );
            }
          });
          (node as HTMLElement).style.cursor = "pointer";
        });
        // Add drag to pan support
        let isPanning = false;
        let panStartX = 0;
        let panStartY = 0;
        const onPointerDown = (e: PointerEvent) => {
          isPanning = true;
          panStartX = e.clientX;
          panStartY = e.clientY;
          svgElement.style.cursor = "grabbing";
          svgElement.setPointerCapture(e.pointerId);
        };
        const onPointerMove = (e: PointerEvent) => {
          if (!isPanning) return;
          const dx = e.clientX - panStartX;
          const dy = e.clientY - panStartY;
          transformStateRef.current.panX += dx;
          transformStateRef.current.panY += dy;
          panStartX = e.clientX;
          panStartY = e.clientY;
          const { scale, panX, panY } = transformStateRef.current;
          svgElement.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
          svgElement.style.transformOrigin = "0 0";
        };
        const onPointerUp = () => {
          isPanning = false;
          svgElement.style.cursor = "grab";
        };
        svgElement.style.cursor = "grab";
        svgElement.addEventListener("pointerdown", onPointerDown);
        svgElement.addEventListener("pointermove", onPointerMove);
        svgElement.addEventListener("pointerup", onPointerUp);
        svgElement.addEventListener("pointercancel", onPointerUp);
        // Zoom support - preserve pan offset
        const wheelHandler = (e: WheelEvent) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          transformStateRef.current.scale = Math.max(0.3, Math.min(2, transformStateRef.current.scale + delta));
          const { scale, panX, panY } = transformStateRef.current;
          svgElement.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
          svgElement.style.transformOrigin = "0 0";
        };
        svgElement.addEventListener("wheel", wheelHandler, { passive: false });
        return () => {
          svgElement.removeEventListener("wheel", wheelHandler);
          svgElement.removeEventListener("pointerdown", onPointerDown);
          svgElement.removeEventListener("pointermove", onPointerMove);
          svgElement.removeEventListener("pointerup", onPointerUp);
          svgElement.removeEventListener("pointercancel", onPointerUp);
        };
      }
    } catch (err) {
      console.error("[MindMapRenderer] Error injecting SVG:", err);
    }
  }, [svgContent]);
  // Get diagram type badge with i18n
  const getTypeBadge = (): string => {
    const type = data?.type || "mindmap";
    const typeMap: Record<string, string> = isZh
      ? {
          mindmap: "🧠 思维导图",
          flowchart: "📊 流程图",
          sequence: "🔀 时序图",
          class: "📐 类图",
          state: "🔄 状态图",
          er: "📋 ER图",
          gantt: "📅 甘特图",
          pie: "🍕 饼图",
          git: "🌿 Git图",
          timeline: "📈 时间线",
          journey: "🗺️ 旅程图",
          quadrantchart: "📊 象限图",
          sankey: "🌊 桑基图",
        }
      : {
          mindmap: "🧠 Mindmap",
          flowchart: "📊 Flowchart",
          sequence: "🔀 Sequence",
          class: "📐 Class",
          state: "🔄 State",
          er: "📋 ER",
          gantt: "📅 Gantt",
          pie: "🍕 Pie",
          git: "🌿 Git",
          timeline: "📈 Timeline",
          journey: "🗺️ Journey",
          quadrantchart: "📊 Quadrant",
          sankey: "🌊 Sankey",
        };
    return typeMap[type] || (isZh ? "📊 图表" : "📊 Diagram");
  };
  // Get i18n labels
  const zoomInLabel = isZh ? "放大" : "Zoom In";
  const zoomOutLabel = isZh ? "缩小" : "Zoom Out";
  const resetZoomLabel = isZh ? "重置缩放" : "Reset Zoom";
  const loadingLabel = isZh ? "加载图表中..." : "Loading diagram...";
  const errorLabel = isZh ? "渲染错误" : "Render Error";
  const showCodeLabel = isZh ? "查看代码" : "Show Code";
  const noDataLabel = isZh ? "暂无图表数据" : "No diagram data available";
  // Show loading state
  if (isLoading) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          minHeight: "200px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "20px",
            height: "20px",
            border: "2px solid var(--border-color)",
            borderTop: "2px solid #818cf8",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>{loadingLabel}</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  // Show error state
  if (error) {
    return (
      <div
        style={{
          padding: "16px 20px",
          margin: "8px 0",
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "8px",
          color: "#ef4444",
          fontSize: "13px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>⚠️ {errorLabel}</div>
        <div style={{ fontSize: "12px", opacity: 0.8 }}>{error}</div>
        <details style={{ marginTop: "8px", fontSize: "11px", opacity: 0.6 }}>
          <summary>{showCodeLabel}</summary>
          <pre
            style={{
              marginTop: "8px",
              padding: "8px",
              background: "#111827",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "11px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "200px",
              color: "#e5e7eb",
            }}
          >
            {getMermaidDefinition(data) || "No definition"}
          </pre>
        </details>
      </div>
    );
  }
  // No data
  const definition = getMermaidDefinition(data);
  if (!definition) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {noDataLabel}
      </div>
    );
  }
  return (
    <div
      className="terminal-mindmap-container"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          minHeight: "32px",
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>{getTypeBadge()}</span>
        {data.title && (
          <span
            style={{
              flex: 1,
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
        )}
        <div style={{ display: "flex", gap: "2px", marginLeft: "auto" }}>
          {/* Export buttons */}
          <ExportButton fileName={`${data.title || "diagram"}.mmd`} content={getMermaidDefinition(data) || ""} extension="mmd" mimeType="text/plain" t={t} iconSize={14} label="MMD" />
          <button
            onClick={() => {
              const svg = containerRef.current?.querySelector("svg");
              if (svg) {
                transformStateRef.current.scale = Math.min(2, transformStateRef.current.scale + 0.1);
                const { scale, panX, panY } = transformStateRef.current;
                svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
                svg.style.transformOrigin = "0 0";
              }
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0 7px",
              borderRadius: "4px",
              fontSize: "12px",
              height: "20px",
              lineHeight: "20px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
            title={zoomInLabel}
          >
            ＋
          </button>
          <button
            onClick={() => {
              const svg = containerRef.current?.querySelector("svg");
              if (svg) {
                transformStateRef.current.scale = Math.max(0.3, transformStateRef.current.scale - 0.1);
                const { scale, panX, panY } = transformStateRef.current;
                svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
                svg.style.transformOrigin = "0 0";
              }
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0 7px",
              borderRadius: "4px",
              fontSize: "12px",
              height: "20px",
              lineHeight: "20px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
            title={zoomOutLabel}
          >
            －
          </button>
          <button
            onClick={() => {
              const svg = containerRef.current?.querySelector("svg");
              if (svg) {
                transformStateRef.current.scale = 1;
                transformStateRef.current.panX = 0;
                transformStateRef.current.panY = 0;
                svg.style.transform = "scale(1)";
                svg.style.transformOrigin = "center center";
              }
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "0 6px",
              borderRadius: "4px",
              fontSize: "11px",
              height: "20px",
              lineHeight: "20px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
            title={resetZoomLabel}
          >
            ⟲
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          padding: "16px 20px",
          minHeight: "260px",
          maxHeight: "560px",
          overflow: "hidden",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-tertiary)",
          position: "relative",
        }}
        className="mermaid-container"
      />
    </div>
  );
};
export default MindMapRenderer;
