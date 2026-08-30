import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
// @ts-ignore - CSS module import
import "katex/dist/katex.min.css";
import { Copy, Check, AlertCircle } from "lucide-react";
import { showToast, ToastType } from "../../../../../components/Toast";
import ExportButton from "./ExportButton";
interface MathFormulaRendererProps {
  /** LaTeX formula string, supports inline and block display */
  formula: string;
  /** Display mode: inline or block (centered) */
  displayMode?: "inline" | "block";
  /** Formula number/tag (optional) */
  tag?: string;
  /** Title/description */
  title?: string;
  t: (key: string) => string;
  isZh?: boolean;
  /** Formula type for display label */
  type?: "basic" | "theorem" | "proof" | "definition" | "lemma" | "corollary" | "example" | "equation";
}
// Type icon mapping
const getTypeIcon = (type: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    basic: <span style={{ fontSize: "13px", lineHeight: 1 }}>📐</span>,
    theorem: <span style={{ fontSize: "13px", lineHeight: 1 }}>📖</span>,
    proof: <span style={{ fontSize: "13px", lineHeight: 1 }}>✏️</span>,
    definition: <span style={{ fontSize: "13px", lineHeight: 1 }}>📋</span>,
    lemma: <span style={{ fontSize: "13px", lineHeight: 1 }}>📝</span>,
    corollary: <span style={{ fontSize: "13px", lineHeight: 1 }}>📌</span>,
    example: <span style={{ fontSize: "13px", lineHeight: 1 }}>💡</span>,
    equation: <span style={{ fontSize: "13px", lineHeight: 1 }}>📊</span>,
  };
  return iconMap[type] || <span style={{ fontSize: "13px", lineHeight: 1 }}>📐</span>;
};
const MathFormulaRenderer: React.FC<MathFormulaRendererProps> = ({ formula, displayMode = "block", tag, title, t, isZh = true, type = "basic" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!containerRef.current || !formula) return;
    try {
      // Clear previous content
      containerRef.current.innerHTML = "";
      // Handle multi-line formulas (separated by \\ or \n)
      const lines = formula.split(/\\\\|\n/).filter((line) => line.trim());
      if (lines.length > 1 && displayMode === "block") {
        // Multi-line formula: use aligned environment
        const aligned = lines.map((line) => line.trim()).join(" \\\\ ");
        const fullFormula = `\\begin{aligned} ${aligned} \\end{aligned}`;
        const html = katex.renderToString(fullFormula, {
          displayMode: true,
          throwOnError: false,
          trust: true,
          macros: {
            "\\R": "\\mathbb{R}",
            "\\N": "\\mathbb{N}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\C": "\\mathbb{C}",
            "\\E": "\\mathbb{E}",
            "\\Var": "\\mathrm{Var}",
            "\\Cov": "\\mathrm{Cov}",
            "\\argmin": "\\operatorname*{arg\\,min}",
            "\\argmax": "\\operatorname*{arg\\,max}",
          },
        });
        containerRef.current.innerHTML = html;
      } else {
        // Single line formula
        const html = katex.renderToString(formula, {
          displayMode: displayMode === "block",
          throwOnError: false,
          trust: true,
          macros: {
            "\\R": "\\mathbb{R}",
            "\\N": "\\mathbb{N}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\C": "\\mathbb{C}",
            "\\E": "\\mathbb{E}",
            "\\Var": "\\mathrm{Var}",
            "\\Cov": "\\mathrm{Cov}",
            "\\argmin": "\\operatorname*{arg\\,min}",
            "\\argmax": "\\operatorname*{arg\\,max}",
          },
        });
        containerRef.current.innerHTML = html;
      }
      setError(null);
    } catch (err) {
      console.error("[MathFormulaRenderer] KaTeX error:", err);
      setError(err instanceof Error ? err.message : "Failed to render formula");
      // Fallback to plain text display
      if (containerRef.current) {
        containerRef.current.textContent = formula;
      }
    }
  }, [formula, displayMode]);
  // Copy formula source with toast notification
  const copyFormula = async () => {
    try {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy failed");
    }
  };
  // Get type label with i18n
  const getTypeLabel = (): string => {
    if (isZh) {
      const labels: Record<string, string> = {
        basic: "公式",
        theorem: "定理",
        proof: "证明",
        definition: "定义",
        lemma: "引理",
        corollary: "推论",
        example: "示例",
        equation: "方程",
      };
      return labels[type] || "公式";
    }
    const labels: Record<string, string> = {
      basic: "Formula",
      theorem: "Theorem",
      proof: "Proof",
      definition: "Definition",
      lemma: "Lemma",
      corollary: "Corollary",
      example: "Example",
      equation: "Equation",
    };
    return labels[type] || "Formula";
  };
  // Generate export content (LaTeX source)
  const getExportContent = (): string => {
    return formula;
  };
  return (
    <div
      className="terminal-math-formula"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Header */}
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
          minHeight: "32px",
        }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1, display: "flex", alignItems: "center" }}>{getTypeIcon(type)}</span>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{getTypeLabel()}</span>
        {title && (
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
            {title}
          </span>
        )}
        {tag && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              fontFamily: "monospace",
              marginLeft: "auto",
            }}
          >
            ({tag})
          </span>
        )}
        {/* Save button */}
        <ExportButton fileName={`${title || "formula"}.tex`} content={getExportContent()} extension="tex" mimeType="text/plain" t={t} iconSize={14} />
        {/* Copy button */}
        <button
          onClick={copyFormula}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: copied ? "#10b981" : "var(--text-tertiary)",
            padding: "4px",
            borderRadius: "4px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }
          }}
          title={isZh ? "复制公式" : "Copy formula"}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {/* Formula body */}
      <div
        style={{
          padding: displayMode === "block" ? "16px 20px" : "6px 12px",
          display: "flex",
          justifyContent: displayMode === "block" ? "center" : "flex-start",
          overflow: "auto",
          minHeight: displayMode === "block" ? "60px" : "30px",
          background: "var(--bg-primary)",
        }}
      >
        <div
          ref={containerRef}
          style={{
            fontSize: displayMode === "block" ? "18px" : "14px",
            color: "var(--text-primary)",
            padding: displayMode === "block" ? "8px 0" : "0",
            maxWidth: "100%",
          }}
          className="katex-display"
        />
      </div>
      {/* Error message */}
      {error && (
        <div
          style={{
            padding: "4px 12px",
            fontSize: "11px",
            color: "#ef4444",
            background: "rgba(239,68,68,0.1)",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
export default MathFormulaRenderer;
