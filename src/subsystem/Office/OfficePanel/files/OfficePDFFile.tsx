import React from "react";
import { FileText, ZoomIn, ZoomOut, RotateCw, Search, Printer, Download, Bookmark, Highlighter, MousePointer2, Type, PenTool, ChevronLeft, ChevronRight, Maximize2, Minimize2, Share2 } from "lucide-react";
/**
 * Props for the OfficePDFFile component.
 */
export interface OfficePDFFileProps {
  /** File name shown in the title bar. */
  fileName?: string;
  /** i18n translator */
  t?: (key: string, params?: Record<string, string | number>) => string;
  /** Language code */
  language?: "zh" | "en";
  /** Optional external className / style. */
  className?: string;
  style?: React.CSSProperties;
}
/** A single PDF toolbar button. */
const PdfButton: React.FC<{
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  /** Optional click handler; UI-only buttons may omit it. */
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      height: "24px",
      padding: "0 6px",
      borderRadius: "4px",
      border: "1px solid transparent",
      background: active ? "var(--hover-bg)" : "transparent",
      color: "var(--text-primary)",
      cursor: "pointer",
      fontSize: "11px",
      whiteSpace: "nowrap",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    {icon}
    {label && <span>{label}</span>}
  </button>
);
/** A vertical divider between PDF toolbar groups. */
const PdfDivider: React.FC = () => <div style={{ width: "1px", height: "20px", background: "var(--border-color)", margin: "0 4px", flexShrink: 0 }} />;
/**
 * PDF viewer UI (toolbar only, no logic).
 */
const OfficePDFFile: React.FC<OfficePDFFileProps> = ({ fileName = "Document.pdf", t = (key: string) => key, language = "en", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  const [page, setPage] = React.useState(1);
  const totalPages = 12;
  return (
    <div className={className} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden", ...style }}>
      <div
        style={{
          height: "28px",
          minHeight: "28px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 10px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "11px",
          color: "var(--text-secondary)",
          flexShrink: 0,
        }}
      >
        <FileText size={12} style={{ color: "#e5484d" }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          padding: "4px 8px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
          minHeight: "34px",
          flexWrap: "wrap",
        }}
      >
        <PdfButton icon={<ChevronLeft size={14} />} onClick={undefined} />
        <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px" }}>
          <input value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} style={{ width: "36px", height: "22px", textAlign: "center", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "3px" }} />
          <span style={{ color: "var(--text-tertiary)" }}>/ {totalPages}</span>
        </div>
        <PdfButton icon={<ChevronRight size={14} />} />
        <PdfDivider />
        <PdfButton icon={<ZoomOut size={14} />} />
        <select style={{ height: "22px", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", padding: "0 4px" }}>
          <option>50%</option>
          <option>75%</option>
          <option selected>100%</option>
          <option>125%</option>
          <option>150%</option>
          <option>200%</option>
        </select>
        <PdfButton icon={<ZoomIn size={14} />} />
        <PdfButton icon={<RotateCw size={14} />} />
        <PdfDivider />
        <PdfButton icon={<MousePointer2 size={14} />} label={isZh ? "选择" : "Select"} active />
        <PdfButton icon={<Highlighter size={14} />} label={isZh ? "高亮" : "Highlight"} />
        <PdfButton icon={<PenTool size={14} />} label={isZh ? "批注" : "Annotate"} />
        <PdfButton icon={<Type size={14} />} label={isZh ? "文本" : "Text"} />
        <PdfDivider />
        <PdfButton icon={<Search size={14} />} />
        <PdfButton icon={<Bookmark size={14} />} />
        <PdfButton icon={<Share2 size={14} />} />
        <PdfButton icon={<Printer size={14} />} />
        <PdfButton icon={<Download size={14} />} />
        <PdfButton icon={<Maximize2 size={14} />} />
        <PdfButton icon={<Minimize2 size={14} />} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", background: "var(--bg-tertiary)", padding: "16px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "620px",
            maxWidth: "100%",
            minHeight: "840px",
            background: "#ffffff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            borderRadius: "2px",
            padding: "60px 64px",
            boxSizing: "border-box",
            color: "#222222",
            fontFamily: "'Times New Roman', serif",
            fontSize: "13px",
            lineHeight: 1.7,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", bottom: "16px", right: "24px", fontSize: "11px", color: "#888" }}>{`${page} / ${totalPages}`}</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 18px 0", textAlign: "center" }}>{isZh ? "PDF 文档标题" : "PDF Document Title"}</h1>
          <p style={{ margin: "0 0 12px 0", textIndent: "2em" }}>
            {isZh
              ? "这是一个 PDF 阅读器的占位页面。工具栏已按阅读器风格实现 UI，包含翻页、缩放、旋转、选择、高亮、批注、文本、搜索、书签、分享、打印、下载、全屏等操作入口。"
              : "This is a placeholder PDF reader page. The toolbar mimics a reader UI with page navigation, zoom, rotate, select, highlight, annotate, text, search, bookmark, share, print, download, and fullscreen."}
          </p>
          <p style={{ margin: "0 0 12px 0", textIndent: "2em" }}>{isZh ? "后续将接入 PDF 渲染引擎与批注系统。" : "PDF rendering and annotation will be added later."}</p>
        </div>
      </div>
    </div>
  );
};
export default OfficePDFFile;
