import React from "react";
import {
  FileText,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table,
  Link,
  Highlighter,
  Palette,
  Undo2,
  Redo2,
  Printer,
  Save,
  Search,
  Type,
  Strikethrough,
  Subscript,
  Superscript,
  IndentIncrease,
  IndentDecrease,
  Scissors,
  Copy,
  ClipboardPaste,
} from "lucide-react";
/**
 * Props for the OfficeWordFile component.
 */
export interface OfficeWordFileProps {
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
/** Ribbon tab ids for the Word toolbar. */
type WordTab = "home" | "insert" | "layout" | "review" | "view";
/** A single ribbon button. */
const RibbonButton: React.FC<{ icon: React.ReactNode; label?: string; active?: boolean }> = ({ icon, label, active }) => (
  <button
    type="button"
    title={label}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "2px",
      minWidth: label ? "40px" : "24px",
      height: "40px",
      padding: "2px 4px",
      borderRadius: "4px",
      border: "1px solid transparent",
      background: active ? "var(--hover-bg)" : "transparent",
      color: "var(--text-primary)",
      cursor: "pointer",
      fontSize: "9px",
      lineHeight: 1,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
    {label && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
  </button>
);
/** A vertical divider between ribbon groups. */
const RibbonDivider: React.FC = () => <div style={{ width: "1px", height: "32px", background: "var(--border-color)", margin: "0 4px", flexShrink: 0 }} />;
/**
 * Word-like document editor UI (toolbar only, no logic).
 */
const OfficeWordFile: React.FC<OfficeWordFileProps> = ({ fileName = "Document.docx", t = (key: string) => key, language = "en", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  const [activeTab, setActiveTab] = React.useState<WordTab>("home");
  const tabs: { id: WordTab; label: string }[] = [
    { id: "home", label: isZh ? "开始" : "Home" },
    { id: "insert", label: isZh ? "插入" : "Insert" },
    { id: "layout", label: isZh ? "页面布局" : "Layout" },
    { id: "review", label: isZh ? "审阅" : "Review" },
    { id: "view", label: isZh ? "视图" : "View" },
  ];
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
        <FileText size={12} style={{ color: "var(--accent-color)" }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-tertiary)" }}>{isZh ? "已保存" : "Saved"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", height: "28px", minHeight: "28px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", padding: "0 6px", gap: "2px", flexShrink: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              height: "24px",
              padding: "0 10px",
              fontSize: "11px",
              borderRadius: "3px",
              border: "none",
              background: activeTab === tab.id ? "var(--hover-bg)" : "transparent",
              color: activeTab === tab.id ? "var(--accent-color)" : "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.background = "transparent";
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2px",
          padding: "4px 8px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
          minHeight: "48px",
        }}
      >
        <RibbonButton icon={<ClipboardPaste size={15} />} label={isZh ? "粘贴" : "Paste"} />
        <RibbonButton icon={<Scissors size={15} />} label={isZh ? "剪切" : "Cut"} />
        <RibbonButton icon={<Copy size={15} />} label={isZh ? "复制" : "Copy"} />
        <RibbonDivider />
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <select
            style={{
              height: "22px",
              fontSize: "11px",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "3px",
              padding: "0 4px",
              minWidth: "90px",
            }}
          >
            <option>{isZh ? "宋体" : "SimSun"}</option>
            <option>{isZh ? "微软雅黑" : "Microsoft YaHei"}</option>
            <option>{isZh ? "黑体" : "SimHei"}</option>
            <option>Arial</option>
            <option>Times New Roman</option>
          </select>
          <select
            style={{
              height: "22px",
              fontSize: "11px",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "3px",
              padding: "0 4px",
              minWidth: "50px",
            }}
          >
            <option>10</option>
            <option>12</option>
            <option>14</option>
            <option>16</option>
            <option>18</option>
            <option>24</option>
          </select>
        </div>
        <RibbonDivider />
        <RibbonButton icon={<Bold size={15} />} />
        <RibbonButton icon={<Italic size={15} />} />
        <RibbonButton icon={<Underline size={15} />} />
        <RibbonButton icon={<Strikethrough size={15} />} />
        <RibbonButton icon={<Subscript size={15} />} />
        <RibbonButton icon={<Superscript size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<Highlighter size={15} />} />
        <RibbonButton icon={<Palette size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<AlignLeft size={15} />} />
        <RibbonButton icon={<AlignCenter size={15} />} />
        <RibbonButton icon={<AlignRight size={15} />} />
        <RibbonButton icon={<AlignJustify size={15} />} />
        <RibbonButton icon={<IndentDecrease size={15} />} />
        <RibbonButton icon={<IndentIncrease size={15} />} />
        <RibbonButton icon={<List size={15} />} />
        <RibbonButton icon={<ListOrdered size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<Table size={15} />} label={isZh ? "表格" : "Table"} />
        <RibbonButton icon={<ImageIcon size={15} />} label={isZh ? "图片" : "Image"} />
        <RibbonButton icon={<Link size={15} />} label={isZh ? "链接" : "Link"} />
        <RibbonDivider />
        <RibbonButton icon={<Undo2 size={15} />} />
        <RibbonButton icon={<Redo2 size={15} />} />
        <RibbonButton icon={<Save size={15} />} label={isZh ? "保存" : "Save"} />
        <RibbonButton icon={<Printer size={15} />} label={isZh ? "打印" : "Print"} />
        <RibbonButton icon={<Search size={15} />} />
        <RibbonButton icon={<Type size={15} />} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", background: "var(--bg-tertiary)", padding: "16px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "620px",
            maxWidth: "100%",
            minHeight: "800px",
            background: "#ffffff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            borderRadius: "2px",
            padding: "64px 72px",
            boxSizing: "border-box",
            color: "#222222",
            fontFamily: isZh ? "'SimSun', serif" : "'Times New Roman', serif",
            fontSize: "14px",
            lineHeight: 1.8,
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 18px 0", textAlign: "center" }}>{isZh ? "文档标题" : "Document Title"}</h1>
          <p style={{ margin: "0 0 12px 0", textIndent: "2em" }}>
            {isZh ? "这是一个 Word 文档编辑区的占位内容。上方工具栏已按 WPS 风格实现 UI，后续将接入真实的富文本编辑能力。" : "This is a placeholder for the Word document editor area. The toolbar above follows the WPS style; real rich-text editing will be added later."}
          </p>
          <p style={{ margin: "0 0 12px 0", textIndent: "2em" }}>{isZh ? "支持字体、字号、加粗、斜体、下划线、对齐、缩进、列表、插入表格/图片/链接等常用操作。" : "Supports font, size, bold, italic, underline, alignment, indentation, lists, and inserting tables / images / links."}</p>
          <p style={{ margin: "0", textIndent: "2em" }}>{isZh ? "在此处开始输入内容……" : "Start typing here…"}</p>
        </div>
      </div>
    </div>
  );
};
export default OfficeWordFile;
