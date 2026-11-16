import React from "react";
import {
  FileText,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Image as ImageIcon,
  Table,
  Link,
  Undo2,
  Redo2,
  Play,
  Save,
  Printer,
  Search,
  Presentation,
  Square,
  Circle,
  Triangle,
  Type,
  Copy,
  Scissors,
  ClipboardPaste,
} from "lucide-react";
/**
 * Props for the OfficePPTFile component.
 */
export interface OfficePPTFileProps {
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
/** Ribbon tab ids for the PPT toolbar. */
type PptTab = "home" | "insert" | "design" | "transition" | "animation" | "slideShow" | "view";
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
 * PPT-like presentation editor UI (toolbar only, no logic).
 */
const OfficePPTFile: React.FC<OfficePPTFileProps> = ({ fileName = "Presentation.pptx", t = (key: string) => key, language = "en", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  const [activeTab, setActiveTab] = React.useState<PptTab>("home");
  const [activeSlide, setActiveSlide] = React.useState(1);
  const totalSlides = 6;
  const tabs: { id: PptTab; label: string }[] = [
    { id: "home", label: isZh ? "开始" : "Home" },
    { id: "insert", label: isZh ? "插入" : "Insert" },
    { id: "design", label: isZh ? "设计" : "Design" },
    { id: "transition", label: isZh ? "切换" : "Transitions" },
    { id: "animation", label: isZh ? "动画" : "Animations" },
    { id: "slideShow", label: isZh ? "幻灯片放映" : "Slide Show" },
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
        <FileText size={12} style={{ color: "#f59e0b" }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-tertiary)" }}>{isZh ? "已保存" : "Saved"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", height: "28px", minHeight: "28px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", padding: "0 6px", gap: "2px", flexShrink: 0, overflowX: "auto" }}>
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
              whiteSpace: "nowrap",
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
          <select style={{ height: "22px", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", padding: "0 4px", minWidth: "90px" }}>
            <option>{isZh ? "微软雅黑" : "Microsoft YaHei"}</option>
            <option>{isZh ? "宋体" : "SimSun"}</option>
            <option>Arial</option>
          </select>
          <select style={{ height: "22px", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", padding: "0 4px", minWidth: "50px" }}>
            <option>18</option>
            <option>24</option>
            <option>28</option>
            <option>32</option>
            <option>40</option>
          </select>
        </div>
        <RibbonDivider />
        <RibbonButton icon={<Bold size={15} />} />
        <RibbonButton icon={<Italic size={15} />} />
        <RibbonButton icon={<Underline size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<AlignLeft size={15} />} />
        <RibbonButton icon={<AlignCenter size={15} />} />
        <RibbonButton icon={<AlignRight size={15} />} />
        <RibbonButton icon={<List size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<ImageIcon size={15} />} label={isZh ? "图片" : "Image"} />
        <RibbonButton icon={<Table size={15} />} label={isZh ? "表格" : "Table"} />
        <RibbonButton icon={<Link size={15} />} label={isZh ? "链接" : "Link"} />
        <RibbonDivider />
        <RibbonButton icon={<Square size={15} />} />
        <RibbonButton icon={<Circle size={15} />} />
        <RibbonButton icon={<Triangle size={15} />} />
        <RibbonButton icon={<Type size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<Undo2 size={15} />} />
        <RibbonButton icon={<Redo2 size={15} />} />
        <RibbonButton icon={<Play size={15} />} label={isZh ? "放映" : "Play"} />
        <RibbonButton icon={<Save size={15} />} label={isZh ? "保存" : "Save"} />
        <RibbonButton icon={<Printer size={15} />} label={isZh ? "打印" : "Print"} />
        <RibbonButton icon={<Search size={15} />} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row", overflow: "hidden" }}>
        <div style={{ width: "160px", minWidth: "160px", height: "100%", background: "var(--bg-secondary)", borderRight: "1px solid var(--border-color)", overflowY: "auto", overflowX: "hidden", padding: "8px" }}>
          {Array.from({ length: totalSlides }, (_, i) => i + 1).map((n) => {
            const active = n === activeSlide;
            return (
              <div
                key={n}
                onClick={() => setActiveSlide(n)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "6px",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "10px", color: "var(--text-tertiary)", width: "14px", textAlign: "right", flexShrink: 0 }}>{n}</span>
                <div
                  style={{
                    flex: 1,
                    aspectRatio: "16 / 9",
                    background: active ? "var(--bg-primary)" : "var(--bg-tertiary)",
                    border: active ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-tertiary)",
                    fontSize: "10px",
                  }}
                >
                  {isZh ? "幻灯片" : "Slide"} {n}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 0, height: "100%", overflow: "auto", background: "var(--bg-tertiary)", padding: "20px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <div
            style={{
              width: "720px",
              maxWidth: "100%",
              aspectRatio: "16 / 9",
              background: "#ffffff",
              boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
              borderRadius: "2px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#333333",
              gap: "10px",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            <Presentation size={36} style={{ color: "#f59e0b" }} />
            <div style={{ fontSize: "26px", fontWeight: 700 }}>{isZh ? `第 ${activeSlide} 页标题` : `Slide ${activeSlide} Title`}</div>
            <div style={{ fontSize: "14px", color: "#666" }}>{isZh ? "在此处添加副标题或正文内容" : "Add subtitle or body content here"}</div>
          </div>
        </div>
      </div>
      <div style={{ height: "24px", minHeight: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)", fontSize: "10px", color: "var(--text-tertiary)", flexShrink: 0 }}>
        <span>{isZh ? "普通视图" : "Normal View"}</span>
        <span>{`${isZh ? "第" : "Slide"} ${activeSlide} / ${totalSlides} ${isZh ? "页" : ""}`}</span>
      </div>
    </div>
  );
};
export default OfficePPTFile;
