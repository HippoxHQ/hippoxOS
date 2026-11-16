import React from "react";
import { FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette, Undo2, Redo2, Save, Printer, Search, Plus, Minus, Merge, Grid3x3, Percent, DollarSign, FunctionSquare, SortAsc, SortDesc, Filter, PieChart, Table, Copy, Scissors, ClipboardPaste } from "lucide-react";
/**
 * Props for the OfficeExcel component.
 */
export interface OfficeExcelProps {
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
/** Column headers A..Z (repeatable). */
const COLUMN_COUNT = 12;
const ROW_COUNT = 30;
/** Convert a 0-based column index to A, B, ..., Z, AA... */
function colLabel(idx: number): string {
  let n = idx;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
/**
 * Excel-like spreadsheet editor UI (toolbar only, no logic).
 */
const OfficeExcel: React.FC<OfficeExcelProps> = ({ fileName = "Workbook.xlsx", t = (key: string) => key, language = "en", className, style }) => {
  const isZh = language === "zh" || t("i18n") === "zh";
  /** Simple selection state so the UI looks alive (no real editing). */
  const [selected, setSelected] = React.useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const columns = Array.from({ length: COLUMN_COUNT }, (_, i) => i);
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => i);
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
        <FileText size={12} style={{ color: "#22c55e" }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-tertiary)" }}>{isZh ? "已保存" : "Saved"}</span>
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
            <option>{isZh ? "宋体" : "SimSun"}</option>
            <option>{isZh ? "微软雅黑" : "Microsoft YaHei"}</option>
            <option>Arial</option>
          </select>
          <select style={{ height: "22px", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", padding: "0 4px", minWidth: "50px" }}>
            <option>10</option>
            <option>11</option>
            <option>12</option>
            <option>14</option>
            <option>16</option>
          </select>
        </div>
        <RibbonDivider />
        <RibbonButton icon={<Bold size={15} />} />
        <RibbonButton icon={<Italic size={15} />} />
        <RibbonButton icon={<Underline size={15} />} />
        <RibbonButton icon={<Palette size={15} />} />
        <RibbonDivider />
        <RibbonButton icon={<AlignLeft size={15} />} />
        <RibbonButton icon={<AlignCenter size={15} />} />
        <RibbonButton icon={<AlignRight size={15} />} />
        <RibbonButton icon={<Merge size={15} />} label={isZh ? "合并" : "Merge"} />
        <RibbonDivider />
        <RibbonButton icon={<Percent size={15} />} />
        <RibbonButton icon={<DollarSign size={15} />} />
        <RibbonButton icon={<FunctionSquare size={15} />} label={isZh ? "函数" : "Function"} />
        <RibbonDivider />
        <RibbonButton icon={<SortAsc size={15} />} />
        <RibbonButton icon={<SortDesc size={15} />} />
        <RibbonButton icon={<Filter size={15} />} />
        <RibbonButton icon={<PieChart size={15} />} />
        <RibbonButton icon={<Table size={15} />} label={isZh ? "表格" : "Table"} />
        <RibbonDivider />
        <RibbonButton icon={<Undo2 size={15} />} />
        <RibbonButton icon={<Redo2 size={15} />} />
        <RibbonButton icon={<Save size={15} />} label={isZh ? "保存" : "Save"} />
        <RibbonButton icon={<Printer size={15} />} label={isZh ? "打印" : "Print"} />
        <RibbonButton icon={<Search size={15} />} />
        <RibbonButton icon={<Plus size={15} />} />
        <RibbonButton icon={<Minus size={15} />} />
        <RibbonButton icon={<Grid3x3 size={15} />} />
      </div>
      <div style={{ height: "26px", minHeight: "26px", display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
        <div
          style={{ width: "70px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", fontSize: "11px", color: "var(--text-primary)" }}
        >{`${colLabel(selected.col)}${selected.row + 1}`}</div>
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>fx</span>
        <input disabled placeholder={isZh ? "公式栏" : "Formula bar"} style={{ flex: 1, height: "20px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "3px", padding: "0 6px", fontSize: "11px", color: "var(--text-primary)", outline: "none" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--bg-primary)" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "11px", color: "var(--text-primary)", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "36px", height: "22px", position: "sticky", top: 0, left: 0, zIndex: 3, background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }} />
                {columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      minWidth: "80px",
                      height: "22px",
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      background: selected.col === c ? "var(--hover-bg)" : "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      fontWeight: 600,
                      color: selected.col === c ? "var(--accent-color)" : "var(--text-secondary)",
                    }}
                  >
                    {colLabel(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r}>
                  <th
                    style={{
                      width: "36px",
                      height: "22px",
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: selected.row === r ? "var(--hover-bg)" : "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      fontWeight: 600,
                      color: selected.row === r ? "var(--accent-color)" : "var(--text-secondary)",
                    }}
                  >
                    {r + 1}
                  </th>
                  {columns.map((c) => {
                    const isSelected = selected.row === r && selected.col === c;
                    return (
                      <td
                        key={c}
                        onClick={() => setSelected({ row: r, col: c })}
                        style={{
                          minWidth: "80px",
                          height: "22px",
                          border: isSelected ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                          background: isSelected ? "var(--hover-bg)" : "var(--bg-primary)",
                          padding: "0 4px",
                          cursor: "cell",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r === 0 && c === 0 ? (isZh ? "示例" : "Sample") : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ height: "26px", minHeight: "26px", display: "flex", alignItems: "center", gap: "2px", padding: "0 8px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)", flexShrink: 0 }}>
          <button type="button" style={{ height: "22px", padding: "0 10px", fontSize: "11px", borderRadius: "3px 3px 0 0", border: "1px solid var(--border-color)", borderBottom: "none", background: "var(--bg-primary)", color: "var(--accent-color)", fontWeight: 600, cursor: "pointer" }}>
            Sheet1
          </button>
          <button type="button" style={{ height: "22px", padding: "0 10px", fontSize: "11px", borderRadius: "3px 3px 0 0", border: "1px solid var(--border-color)", borderBottom: "none", background: "var(--bg-secondary)", color: "var(--text-secondary)", cursor: "pointer" }}>
            Sheet2
          </button>
          <button type="button" title={isZh ? "新建工作表" : "New sheet"} style={{ width: "22px", height: "22px", borderRadius: "3px", border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default OfficeExcel;
