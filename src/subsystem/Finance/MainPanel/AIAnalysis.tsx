import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, Newspaper, Users, PieChart, Target, Lightbulb, Activity, Database, Building2, BarChart3, FileText, ShieldAlert, Landmark, Scale, Coins, ExternalLink, BookOpen, Download, FileSpreadsheet, FileDown, FileCode } from "lucide-react";
// NEW: import osCommands so we can open news / report URLs in the system browser.
import { osCommands } from "../../../command/os";
// NEW: import file dialog + write commands for export feature.
import { filesCommands } from "../../../command/files";
/**
 * A single real market data point that was sent to the LLM
 * inside the [MARKET_DATA] block.
 */
export interface RealMarketDataPoint {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
/**
 * Context of the chart's currently displayed data, populated from the
 * "chart-klines-ready" event dispatched by MainPanel.
 */
export interface MarketDataContext {
  symbol: string;
  timeframe: string;
  count: number;
  candles: RealMarketDataPoint[];
}
interface AIAnalysisProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  analysis: any | null;
  disclaimer: string;
  currentSessionId?: string;
}
// Local helper components (compact, dashboard-style)
const SectionCard: React.FC<{
  isDark: boolean;
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  fullHeight?: boolean;
  children: React.ReactNode;
}> = ({ isDark, title, icon, right, fullHeight = false, children }) => (
  <div
    style={{
      borderRadius: 5,
      border: "1px solid var(--border-color)",
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      padding: "8px 10px",
      marginBottom: fullHeight ? 0 : 8,
      height: fullHeight ? "100%" : undefined,
      display: fullHeight ? "flex" : undefined,
      flexDirection: fullHeight ? "column" : undefined,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-primary)",
        letterSpacing: 0.3,
        flexShrink: 0,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {icon}
        {title}
      </span>
      {right}
    </div>
    <div style={{ flex: fullHeight ? 1 : undefined, minHeight: 0 }}>{children}</div>
  </div>
);
const SentimentGauge: React.FC<{ value: number; isDark: boolean; isZh: boolean }> = ({ value, isDark, isZh }) => {
  const clamped = Math.max(-100, Math.min(100, value));
  const pct = (clamped + 100) / 200;
  const angle = -180 + pct * 180;
  const radius = 36;
  const cx = 50;
  const cy = 44;
  const polar = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const describeArc = (startAngle: number, endAngle: number) => {
    const s = polar(startAngle);
    const e = polar(endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };
  const needleEnd = (() => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + (radius - 6) * Math.cos(rad), y: cy + (radius - 6) * Math.sin(rad) };
  })();
  const label = clamped > 20 ? (isZh ? "看多" : "Bullish") : clamped < -20 ? (isZh ? "看空" : "Bearish") : isZh ? "中性" : "Neutral";
  const color = clamped > 20 ? "#22c55e" : clamped < -20 ? "#ef4444" : "#eab308";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 100 }}>
      <svg width={100} height={58} viewBox="0 0 100 58">
        <path d={describeArc(-180, 0)} stroke={isDark ? "#333" : "#e5e7eb"} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={describeArc(-180, angle)} stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill={color} />
      </svg>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: -4, lineHeight: 1 }}>{clamped}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
};
const ResponsiveGrid: React.FC<{
  minColumnWidth?: number;
  gap?: number;
  children: React.ReactNode;
}> = ({ minColumnWidth = 220, gap = 8, children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
      gap,
      alignItems: "stretch",
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);
/**
 * Human-readable field label maps.
 * Used by CSV, HTML and PDF exports so files show meaningful names
 * instead of raw JSON keys.
 */
const LABELS_ZH: Record<string, string> = {
  trend: "趋势",
  support: "支撑",
  resistance: "阻力",
  risk: "风险",
  summary: "总结",
  sentimentScore: "情绪评分",
  verdict: "结论",
  fullName: "公司全称",
  industry: "所属行业",
  sector: "板块",
  listingDate: "上市日期",
  marketCap: "总市值",
  employees: "员工人数",
  website: "官网",
  mainBusiness: "主营业务",
  name: "名称",
  position: "行业地位",
  outlook: "发展前景",
  highlights: "行业亮点",
  key: "指标",
  value: "数值",
  yoy: "同比",
  unit: "单位",
  change: "变化",
  price: "价格",
  label: "标签",
  type: "类型",
  signal: "信号",
  mainNet: "主力净流入",
  mainNet5d: "5日净流入",
  mainNet10d: "10日净流入",
  turnoverRate: "换手率",
  volumeRatio: "量比",
  buy: "买入",
  overweight: "增持",
  neutral: "中性",
  underweight: "减持",
  targetPrice: "目标价",
  upside: "上涨空间",
  title: "标题",
  source: "来源",
  time: "时间",
  sentiment: "情绪",
  url: "链接",
  description: "描述",
  impact: "影响",
  strengths: "优势",
  weaknesses: "劣势",
  opportunities: "机会",
  threats: "威胁",
  institution: "机构",
  rating: "评级",
  ratio: "比例",
  __section_core: "核心分析",
  __section_metrics: "关键指标",
  __section_priceLevels: "关键价位",
  __section_indicators: "技术指标",
  __section_companyProfile: "公司概况",
  __section_industry: "行业分析",
  __section_financials: "财务摘要",
  __section_fundFlow: "资金流向",
  __section_ratings: "机构评级",
  __section_news: "相关新闻",
  __section_researchReports: "研报观点",
  __section_shareholders: "股东结构",
  __section_holdings: "持股比例",
  __section_swot: "SWOT 分析",
  __section_suggestions: "操作建议",
  __section_risks: "风险提示",
  __section_policyEvents: "政策与行业事件",
};
const LABELS_EN: Record<string, string> = {
  trend: "Trend",
  support: "Support",
  resistance: "Resistance",
  risk: "Risk",
  summary: "Summary",
  sentimentScore: "Sentiment Score",
  verdict: "Verdict",
  fullName: "Full Name",
  industry: "Industry",
  sector: "Sector",
  listingDate: "Listed",
  marketCap: "Market Cap",
  employees: "Employees",
  website: "Website",
  mainBusiness: "Main Business",
  name: "Name",
  position: "Position",
  outlook: "Outlook",
  highlights: "Highlights",
  key: "Key",
  value: "Value",
  yoy: "YoY",
  unit: "Unit",
  change: "Change",
  price: "Price",
  label: "Label",
  type: "Type",
  signal: "Signal",
  mainNet: "Main Net",
  mainNet5d: "5D Net",
  mainNet10d: "10D Net",
  turnoverRate: "Turnover",
  volumeRatio: "Volume Ratio",
  buy: "Buy",
  overweight: "Overweight",
  neutral: "Neutral",
  underweight: "Underweight",
  targetPrice: "Target Price",
  upside: "Upside",
  title: "Title",
  source: "Source",
  time: "Time",
  sentiment: "Sentiment",
  url: "URL",
  description: "Description",
  impact: "Impact",
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  opportunities: "Opportunities",
  threats: "Threats",
  institution: "Institution",
  rating: "Rating",
  ratio: "Ratio",
  __section_core: "Core Analysis",
  __section_metrics: "Key Metrics",
  __section_priceLevels: "Price Levels",
  __section_indicators: "Technical Indicators",
  __section_companyProfile: "Company Profile",
  __section_industry: "Industry Analysis",
  __section_financials: "Financial Summary",
  __section_fundFlow: "Fund Flow",
  __section_ratings: "Institutional Ratings",
  __section_news: "Related News",
  __section_researchReports: "Research Reports",
  __section_shareholders: "Shareholders",
  __section_holdings: "Holdings",
  __section_swot: "SWOT Analysis",
  __section_suggestions: "Suggestions",
  __section_risks: "Risk Warnings",
  __section_policyEvents: "Policy & Industry Events",
};
function getLabels(isZh: boolean): Record<string, string> {
  return isZh ? LABELS_ZH : LABELS_EN;
}
/**
 * Flatten the analysis object into readable rows with LOCALIZED labels.
 * Output shape: { Section, Field, Value }.
 */
function flattenAnalysis(analysis: any, isZh: boolean): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  if (!analysis || typeof analysis !== "object") return rows;
  const L = getLabels(isZh);
  const label = (k: string): string => L[k] || k;
  const sectionLabel = (k: string): string => L["__section_" + k] || k;
  const pushRow = (section: string, field: string, value: any) => {
    if (value === null || value === undefined || value === "") return;
    let v = value;
    if (Array.isArray(value) || typeof value === "object") {
      try {
        v = JSON.stringify(value);
      } catch {
        v = String(value);
      }
    }
    rows.push({
      [isZh ? "分类" : "Section"]: section,
      [isZh ? "字段" : "Field"]: field,
      [isZh ? "值" : "Value"]: v,
    });
  };
  const coreKeys = ["trend", "support", "resistance", "risk", "summary", "sentimentScore", "verdict"];
  for (const k of coreKeys) {
    if (analysis[k] !== undefined) pushRow(sectionLabel("core"), label(k), analysis[k]);
  }
  if (Array.isArray(analysis.metrics)) {
    analysis.metrics.forEach((m: any, i: number) => {
      const txt = `${m.key ?? ""}: ${m.value ?? ""}${m.unit ? " " + m.unit : ""}${m.change ? " (" + (L[m.change] || m.change) + ")" : ""}`;
      pushRow(sectionLabel("metrics"), `${label("key")} ${i + 1}`, txt);
    });
  }
  if (Array.isArray(analysis.priceLevels)) {
    analysis.priceLevels.forEach((p: any, i: number) => {
      pushRow(sectionLabel("priceLevels"), `${label("price")} ${i + 1}`, `${p.label ?? ""} - ${p.price ?? ""} (${p.type ?? ""})`);
    });
  }
  if (Array.isArray(analysis.indicators)) {
    analysis.indicators.forEach((ind: any, i: number) => {
      pushRow(sectionLabel("indicators"), `${label("name")} ${i + 1}`, `${ind.name ?? ""}: ${ind.value ?? ""} (${ind.signal ?? ""})`);
    });
  }
  if (analysis.companyProfile && typeof analysis.companyProfile === "object") {
    Object.entries(analysis.companyProfile).forEach(([k, v]) => pushRow(sectionLabel("companyProfile"), label(k), v));
  }
  if (analysis.industry && typeof analysis.industry === "object") {
    Object.entries(analysis.industry).forEach(([k, v]) => pushRow(sectionLabel("industry"), label(k), v));
  }
  if (Array.isArray(analysis.financials)) {
    analysis.financials.forEach((f: any, i: number) => {
      pushRow(sectionLabel("financials"), `${label("key")} ${i + 1}`, `${f.key ?? ""}: ${f.value ?? ""}${f.yoy !== undefined ? ` (${label("yoy")} ${f.yoy}%)` : ""}`);
    });
  }
  if (analysis.fundFlow && typeof analysis.fundFlow === "object") {
    Object.entries(analysis.fundFlow).forEach(([k, v]) => pushRow(sectionLabel("fundFlow"), label(k), v));
  }
  if (analysis.ratings && typeof analysis.ratings === "object") {
    Object.entries(analysis.ratings).forEach(([k, v]) => pushRow(sectionLabel("ratings"), label(k), v));
  }
  if (Array.isArray(analysis.news)) {
    analysis.news.forEach((n: any, i: number) => {
      const parts = [n.title, n.source, n.time, n.sentiment, n.url].filter(Boolean);
      pushRow(sectionLabel("news"), `${label("title")} ${i + 1}`, parts.join(" | "));
    });
  }
  if (Array.isArray(analysis.researchReports)) {
    analysis.researchReports.forEach((r: any, i: number) => {
      const parts = [r.title, r.institution, r.rating, r.time].filter(Boolean);
      pushRow(sectionLabel("researchReports"), `${label("title")} ${i + 1}`, parts.join(" | "));
    });
  }
  if (analysis.shareholders && Array.isArray(analysis.shareholders.rows)) {
    analysis.shareholders.rows.forEach((row: any[], i: number) => {
      pushRow(sectionLabel("shareholders"), `${isZh ? "行" : "Row"} ${i + 1}`, Array.isArray(row) ? row.join(" | ") : String(row));
    });
  }
  if (analysis.holdings && Array.isArray(analysis.holdings.items)) {
    analysis.holdings.items.forEach((h: any, i: number) => {
      pushRow(sectionLabel("holdings"), `${label("name")} ${i + 1}`, `${h.name ?? ""}: ${h.ratio ?? ""}%`);
    });
  }
  if (analysis.swot && typeof analysis.swot === "object") {
    Object.entries(analysis.swot).forEach(([k, v]) => pushRow(sectionLabel("swot"), label(k), v));
  }
  if (Array.isArray(analysis.suggestions)) {
    analysis.suggestions.forEach((s: string, i: number) => pushRow(sectionLabel("suggestions"), `${isZh ? "建议" : "Item"} ${i + 1}`, s));
  }
  if (Array.isArray(analysis.risks)) {
    analysis.risks.forEach((r: string, i: number) => pushRow(sectionLabel("risks"), `${isZh ? "风险" : "Item"} ${i + 1}`, r));
  }
  if (Array.isArray(analysis.policyEvents)) {
    analysis.policyEvents.forEach((p: any, i: number) => {
      const parts = [p.title, p.impact, p.source, p.time].filter(Boolean);
      pushRow(sectionLabel("policyEvents"), `${label("title")} ${i + 1}`, parts.join(" | "));
    });
  }
  return rows;
}
/**
 * Convert rows into a CSV string with a BOM for Excel UTF-8 compatibility.
 */
function toCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return "\uFEFF";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (val: any): string => {
    if (val === null || val === undefined) return "";
    const s = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines: string[] = [];
  lines.push(headers.map(escape).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}
/**
 * Build a printable HTML document.
 * Used both for the HTML export and as the source for the PDF render.
 */
function buildPrintableHTML(analysis: any, disclaimer: string, isZh: boolean): string {
  const a = analysis || {};
  const L = getLabels(isZh);
  const label = (k: string): string => L[k] || k;
  const sectionLabel = (k: string): string => L["__section_" + k] || k;
  const esc = (v: any): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const section = (title: string, body: string) => (body ? `<section><h2>${esc(title)}</h2>${body}</section>` : "");
  const kv = (lbl: string, value: any) => (value !== undefined && value !== null && value !== "" ? `<div class="kv"><span class="k">${esc(lbl)}</span><span class="v">${esc(value)}</span></div>` : "");
  const list = (items: any[]) => (Array.isArray(items) && items.length > 0 ? `<ul>${items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>` : "");
  const table = (headers: string[], rows: any[][]) => {
    if (!Array.isArray(headers) || !Array.isArray(rows)) return "";
    return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${(Array.isArray(r) ? r : [r]).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };
  const parts: string[] = [];
  const title = isZh ? "AI 分析报告" : "AI Analysis Report";
  const generatedAt = new Date().toLocaleString();
  parts.push(`<header><h1>${esc(title)}</h1><div class="meta">${esc(isZh ? "生成时间" : "Generated at")}: ${esc(generatedAt)}</div></header>`);
  const coreBody = [kv(label("trend"), a.trend), kv(label("support"), a.support), kv(label("resistance"), a.resistance), kv(label("risk"), a.risk), kv(label("summary"), a.summary), kv(label("sentimentScore"), a.sentimentScore), kv(label("verdict"), a.verdict)].join("");
  parts.push(section(sectionLabel("core"), coreBody));
  if (Array.isArray(a.metrics) && a.metrics.length > 0) {
    parts.push(
      section(
        sectionLabel("metrics"),
        table(
          [label("key"), label("value"), label("unit"), label("change")],
          a.metrics.map((m: any) => [m.key, m.value, m.unit || "", m.change || ""]),
        ),
      ),
    );
  }
  if (Array.isArray(a.priceLevels) && a.priceLevels.length > 0) {
    parts.push(
      section(
        sectionLabel("priceLevels"),
        table(
          [label("price"), label("label"), label("type")],
          a.priceLevels.map((p: any) => [p.price, p.label, p.type]),
        ),
      ),
    );
  }
  if (Array.isArray(a.indicators) && a.indicators.length > 0) {
    parts.push(
      section(
        sectionLabel("indicators"),
        table(
          [label("name"), label("value"), label("signal")],
          a.indicators.map((ind: any) => [ind.name, ind.value, ind.signal || ""]),
        ),
      ),
    );
  }
  if (a.companyProfile && typeof a.companyProfile === "object") {
    const body = Object.entries(a.companyProfile)
      .map(([k, v]) => kv(label(k), v))
      .join("");
    parts.push(section(sectionLabel("companyProfile"), body));
  }
  if (a.industry && typeof a.industry === "object") {
    const body = Object.entries(a.industry)
      .map(([k, v]) => kv(label(k), v))
      .join("");
    parts.push(section(sectionLabel("industry"), body));
  }
  if (Array.isArray(a.financials) && a.financials.length > 0) {
    parts.push(
      section(
        sectionLabel("financials"),
        table(
          [label("key"), label("value"), label("yoy")],
          a.financials.map((f: any) => [f.key, f.value, f.yoy !== undefined ? `${f.yoy}%` : ""]),
        ),
      ),
    );
  }
  if (a.fundFlow && typeof a.fundFlow === "object") {
    const body = Object.entries(a.fundFlow)
      .map(([k, v]) => kv(label(k), v))
      .join("");
    parts.push(section(sectionLabel("fundFlow"), body));
  }
  if (a.ratings && typeof a.ratings === "object") {
    const body = Object.entries(a.ratings)
      .map(([k, v]) => kv(label(k), v))
      .join("");
    parts.push(section(sectionLabel("ratings"), body));
  }
  if (Array.isArray(a.news) && a.news.length > 0) {
    const body = a.news.map((n: any) => `<div class="item"><div class="item-title">${esc(n.title)}</div><div class="item-meta">${esc(n.source || "")} ${esc(n.time || "")} ${esc(n.sentiment || "")}</div>${n.url ? `<div class="item-url">${esc(n.url)}</div>` : ""}</div>`).join("");
    parts.push(section(sectionLabel("news"), body));
  }
  if (Array.isArray(a.researchReports) && a.researchReports.length > 0) {
    const body = a.researchReports.map((r: any) => `<div class="item"><div class="item-title">${esc(r.title)}</div><div class="item-meta">${esc(r.institution || "")} ${esc(r.rating || "")} ${esc(r.time || "")}</div></div>`).join("");
    parts.push(section(sectionLabel("researchReports"), body));
  }
  if (a.shareholders && Array.isArray(a.shareholders.rows) && a.shareholders.rows.length > 0) {
    parts.push(section(a.shareholders.title || sectionLabel("shareholders"), table(a.shareholders.headers || [], a.shareholders.rows)));
  }
  if (a.holdings && Array.isArray(a.holdings.items) && a.holdings.items.length > 0) {
    parts.push(
      section(
        a.holdings.title || sectionLabel("holdings"),
        table(
          [label("name"), label("ratio")],
          a.holdings.items.map((h: any) => [h.name, `${h.ratio}%`]),
        ),
      ),
    );
  }
  if (a.swot && typeof a.swot === "object") {
    const body = ["strengths", "weaknesses", "opportunities", "threats"]
      .map((k) => {
        const arr = (a.swot as any)[k];
        if (!arr || !arr.length) return "";
        return `<div class="swot-block"><h3>${esc(label(k))}</h3>${list(arr)}</div>`;
      })
      .join("");
    parts.push(section(sectionLabel("swot"), body));
  }
  if (Array.isArray(a.suggestions) && a.suggestions.length > 0) {
    parts.push(section(sectionLabel("suggestions"), list(a.suggestions)));
  }
  if (Array.isArray(a.risks) && a.risks.length > 0) {
    parts.push(section(sectionLabel("risks"), list(a.risks)));
  }
  if (disclaimer) {
    parts.push(`<footer class="disclaimer">${esc(disclaimer)}</footer>`);
  }
  const css = `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 32px; color: #1a1a1a; background: #fff; }
    header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
    header h1 { margin: 0 0 6px 0; font-size: 22px; }
    header .meta { font-size: 12px; color: #666; }
    section { margin-bottom: 18px; page-break-inside: avoid; }
    section h2 { font-size: 15px; margin: 0 0 8px 0; border-left: 3px solid #3b82f6; padding-left: 8px; }
    .kv { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12px; line-height: 1.5; }
    .kv .k { font-weight: 600; min-width: 110px; color: #444; flex-shrink: 0; }
    .kv .v { flex: 1; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
    th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; word-break: break-word; }
    th { background: #f5f5f5; font-weight: 600; }
    ul { margin: 4px 0; padding-left: 20px; font-size: 12px; line-height: 1.6; }
    .item { border: 1px solid #eee; border-radius: 4px; padding: 6px 8px; margin-bottom: 5px; }
    .item-title { font-weight: 600; font-size: 12px; margin-bottom: 2px; }
    .item-meta { font-size: 11px; color: #666; }
    .item-url { font-size: 10px; color: #3b82f6; word-break: break-all; margin-top: 2px; }
    .swot-block { margin-bottom: 8px; }
    .swot-block h3 { font-size: 12px; margin: 0 0 4px 0; }
    footer.disclaimer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #bbb; font-size: 11px; color: #666; }
    @media print { body { margin: 12mm; } }
  `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${parts.join("")}</body></html>`;
}
/**
 * Dynamically load html2canvas and jspdf. Returns null if unavailable.
 */
async function loadPdfLibs(): Promise<{ html2canvas: any; jsPDF: any } | null> {
  try {
    const [h2cMod, jspdfMod] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const html2canvas = (h2cMod as any).default || h2cMod;
    const jsPDF = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
    if (!html2canvas || !jsPDF) return null;
    return { html2canvas, jsPDF };
  } catch (err) {
    console.error("[AIAnalysis] Failed to load PDF libs:", err);
    return null;
  }
}
/**
 * Render an HTML string into a Uint8Array PDF using html2canvas + jsPDF.
 *
 * Implementation notes:
 * - The HTML is mounted in an off-screen container sized to A4 width (794px).
 * - html2canvas captures the full-height canvas of that container.
 * - The canvas is sliced into A4-height pages and each slice is drawn into
 *   a new PDF page. This preserves the aspect ratio and avoids squashing.
 * - Chinese / any non-ASCII text is baked into the image, so no font
 *   embedding is required.
 */
async function htmlToPdfBytes(html: string, html2canvas: any, jsPDF: any): Promise<Uint8Array | null> {
  // 1) Mount the HTML in an off-screen container.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = "794px"; // A4 width at 96dpi
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.innerHTML = html;
  document.body.appendChild(host);
  // Grab the <body> content of the injected document so we don't get a
  // nested <html><body> frame. We re-host it inside a wrapper.
  let renderTarget: HTMLElement = host;
  const innerBody = host.querySelector("body");
  if (innerBody) {
    // Move inner body children to the host for a clean capture.
    const wrapper = document.createElement("div");
    wrapper.style.width = "794px";
    wrapper.style.background = "#ffffff";
    while (innerBody.firstChild) {
      wrapper.appendChild(innerBody.firstChild);
    }
    // Also copy <style> tags from <head> so the styling applies.
    host.innerHTML = "";
    const styles = Array.from(host.querySelectorAll?.("style") || []);
    // (innerBody was already moved out of host, so just append wrapper.)
    host.appendChild(wrapper);
    renderTarget = wrapper;
    // Copy the CSS that was inside the injected document's <style> tags.
    const injectedDoc = document.implementation.createHTMLDocument("");
    injectedDoc.documentElement.innerHTML = html;
    injectedDoc.querySelectorAll("style").forEach((s) => {
      const st = document.createElement("style");
      st.textContent = s.textContent || "";
      host.appendChild(st);
    });
    void styles;
  }
  try {
    // 2) Wait one frame so fonts / layout settle.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // 3) Capture the full-height canvas.
    const canvas: HTMLCanvasElement = await html2canvas(renderTarget, {
      scale: 2, // higher quality
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });
    // 4) Build the PDF page by page.
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();
    // Convert the canvas pixel height into PDF points at the page width.
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;
    const ratio = pageWidthPt / canvasWidthPx;
    const fullHeightPt = canvasHeightPx * ratio;
    if (fullHeightPt <= pageHeightPt) {
      // Single page: draw once.
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthPt, fullHeightPt);
    } else {
      // Multi-page: slice the canvas into page-height chunks.
      const pageHeightPx = Math.floor(pageHeightPt / ratio);
      let offsetPx = 0;
      let pageIndex = 0;
      while (offsetPx < canvasHeightPx) {
        const sliceHeightPx = Math.min(pageHeightPx, canvasHeightPx - offsetPx);
        // Create a slice canvas.
        const slice = document.createElement("canvas");
        slice.width = canvasWidthPx;
        slice.height = sliceHeightPx;
        const ctx = slice.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offsetPx, canvasWidthPx, sliceHeightPx, 0, 0, canvasWidthPx, sliceHeightPx);
        const sliceData = slice.toDataURL("image/jpeg", 0.92);
        if (pageIndex > 0) pdf.addPage();
        const sliceHeightPt = sliceHeightPx * ratio;
        pdf.addImage(sliceData, "JPEG", 0, 0, pageWidthPt, sliceHeightPt);
        offsetPx += sliceHeightPx;
        pageIndex += 1;
      }
    }
    const arrayBuffer: ArrayBuffer = pdf.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  } finally {
    // Always clean up the off-screen host.
    try {
      document.body.removeChild(host);
    } catch {
      /* ignore */
    }
  }
}
// Main panel
const AIAnalysis: React.FC<AIAnalysisProps> = ({ theme, i18n, analysis, disclaimer }) => {
  const isDark = theme === "dark";
  const isZh = i18n === "zh-cn";
  const a = analysis || {};
  const [marketData, setMarketData] = useState<MarketDataContext | null>(null);
  // Export popover state.
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const exportBtnRef = React.useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const klines: any[] = Array.isArray(detail.klines) ? detail.klines : [];
      if (!detail.symbol || klines.length === 0) return;
      const candles: RealMarketDataPoint[] = klines.map((k: any) => ({
        time: k.date,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      }));
      setMarketData({
        symbol: String(detail.displaySymbol || detail.symbol),
        timeframe: String(detail.period || "101"),
        count: candles.length,
        candles,
      });
    };
    window.addEventListener("chart-klines-ready", handler);
    return () => window.removeEventListener("chart-klines-ready", handler);
  }, []);
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target) && exportBtnRef.current && !exportBtnRef.current.contains(target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);
  const openExternal = async (url: string | undefined) => {
    if (!url) return;
    try {
      await osCommands.openBrowser(url);
    } catch (err) {
      console.error("[AIAnalysis] Failed to open URL:", url, err);
      window.open(url, "_blank");
    }
  };
  /**
   * Save a Uint8Array to disk via the existing backend binary write command.
   * Falls back to a text HTML save if the binary command is not available,
   * so the user never loses their export.
   */
  const saveBinaryOrFallback = useCallback(
    async (bytes: Uint8Array, defaultName: string, fallbackHtml: string) => {
      // Prefer the binary writer if the frontend wrapper exposes it.
      const anyFiles: any = filesCommands as any;
      if (typeof anyFiles.writeBinaryFile === "function") {
        const result = await filesCommands.saveFileDialog({
          title: isZh ? "导出 PDF" : "Export PDF",
          fileName: defaultName,
          extension: ".pdf",
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (result.canceled || !result.file_path) return;
        await anyFiles.writeBinaryFile(result.file_path, Array.from(bytes));
        return;
      }
      // Fallback: save as HTML so the user can still print manually.
      console.warn("[AIAnalysis] writeBinaryFile not available — falling back to HTML");
      const result = await filesCommands.saveFileDialog({
        title: isZh ? "导出 PDF (回退为 HTML)" : "Export PDF (fallback to HTML)",
        fileName: defaultName.replace(/\.pdf$/i, ".html"),
        extension: ".html",
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      if (result.canceled || !result.file_path) return;
      await filesCommands.writeTextFile(result.file_path, fallbackHtml);
    },
    [isZh],
  );
  /**
   * Export analysis as CSV (Excel-compatible).
   */
  const handleExportExcel = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const rows = flattenAnalysis(a, isZh);
      if (rows.length === 0) return;
      const csv = toCSV(rows);
      const defaultName = `ai_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
      const result = await filesCommands.saveFileDialog({
        title: isZh ? "导出 Excel (CSV)" : "Export Excel (CSV)",
        fileName: defaultName,
        extension: ".csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (result.canceled || !result.file_path) return;
      await filesCommands.writeTextFile(result.file_path, csv);
    } catch (err) {
      console.error("[AIAnalysis] Failed to export CSV:", err);
    } finally {
      setIsExporting(false);
    }
  }, [a, isExporting, isZh]);
  /**
   * Export analysis as a self-contained HTML file.
   * The user can open it in a browser and use Ctrl+P → Save as PDF.
   */
  const handleExportHTML = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const rows = flattenAnalysis(a, isZh);
      if (rows.length === 0) return;
      const html = buildPrintableHTML(a, disclaimer, isZh);
      const defaultName = `ai_analysis_${new Date().toISOString().slice(0, 10)}.html`;
      const result = await filesCommands.saveFileDialog({
        title: isZh ? "导出 HTML" : "Export HTML",
        fileName: defaultName,
        extension: ".html",
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      if (result.canceled || !result.file_path) return;
      await filesCommands.writeTextFile(result.file_path, html);
    } catch (err) {
      console.error("[AIAnalysis] Failed to export HTML:", err);
    } finally {
      setIsExporting(false);
    }
  }, [a, disclaimer, isExporting, isZh]);
  /**
   * Export analysis as a real PDF file.
   * Uses html2canvas + jsPDF on the frontend, then writes the binary
   * through the existing backend command.
   */
  const handleExportPDF = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const rows = flattenAnalysis(a, isZh);
      if (rows.length === 0) return;
      const html = buildPrintableHTML(a, disclaimer, isZh);
      const libs = await loadPdfLibs();
      if (!libs) {
        // Libs missing — degrade to the HTML export so the user still gets a file.
        console.warn("[AIAnalysis] PDF libs unavailable — falling back to HTML export");
        await saveBinaryOrFallback(new Uint8Array(), `ai_analysis_${new Date().toISOString().slice(0, 10)}.pdf`, html);
        return;
      }
      const bytes = await htmlToPdfBytes(html, libs.html2canvas, libs.jsPDF);
      if (!bytes || bytes.length === 0) {
        console.warn("[AIAnalysis] PDF render returned empty — falling back to HTML export");
        await saveBinaryOrFallback(new Uint8Array(), `ai_analysis_${new Date().toISOString().slice(0, 10)}.pdf`, html);
        return;
      }
      const defaultName = `ai_analysis_${new Date().toISOString().slice(0, 10)}.pdf`;
      await saveBinaryOrFallback(bytes, defaultName, html);
    } catch (err) {
      console.error("[AIAnalysis] Failed to export PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [a, disclaimer, isExporting, isZh, saveBinaryOrFallback]);
  const hasCoreText = a.trend || a.support || a.resistance || a.risk || a.summary || a._chatMessage;
  const hasScore = typeof a.sentimentScore === "number";
  const hasMetrics = Array.isArray(a.metrics) && a.metrics.length > 0;
  const hasLevels = Array.isArray(a.priceLevels) && a.priceLevels.length > 0;
  const hasIndicators = Array.isArray(a.indicators) && a.indicators.length > 0;
  const hasNews = Array.isArray(a.news) && a.news.length > 0;
  const hasShareholders = a.shareholders && Array.isArray(a.shareholders.rows) && a.shareholders.rows.length > 0;
  const hasHoldings = a.holdings && Array.isArray(a.holdings.items) && a.holdings.items.length > 0;
  const hasSwot = a.swot && (a.swot.strengths || a.swot.weaknesses || a.swot.opportunities || a.swot.threats);
  const hasSuggestions = Array.isArray(a.suggestions) && a.suggestions.length > 0;
  const hasCompanyProfile = a.companyProfile && typeof a.companyProfile === "object" && Object.keys(a.companyProfile).length > 0;
  const hasIndustry = a.industry && typeof a.industry === "object" && Object.keys(a.industry).length > 0;
  const hasFinancials = Array.isArray(a.financials) && a.financials.length > 0;
  const hasRatings = a.ratings && typeof a.ratings === "object" && Object.keys(a.ratings).length > 0;
  const hasFundFlow = a.fundFlow && typeof a.fundFlow === "object" && Object.keys(a.fundFlow).length > 0;
  const hasPolicyEvents = Array.isArray(a.policyEvents) && a.policyEvents.length > 0;
  const hasRisks = Array.isArray(a.risks) && a.risks.length > 0;
  const hasResearchReports = Array.isArray(a.researchReports) && a.researchReports.length > 0;
  const hasIndustryEvents = Array.isArray(a.industryEvents) && a.industryEvents.length > 0;
  const hasRealData = !!(marketData && marketData.candles && marketData.candles.length > 0);
  const anything =
    hasCoreText ||
    hasScore ||
    hasMetrics ||
    hasLevels ||
    hasIndicators ||
    hasNews ||
    hasShareholders ||
    hasHoldings ||
    hasSwot ||
    hasSuggestions ||
    hasCompanyProfile ||
    hasIndustry ||
    hasFinancials ||
    hasRatings ||
    hasFundFlow ||
    hasPolicyEvents ||
    hasRisks ||
    hasResearchReports ||
    hasIndustryEvents ||
    hasRealData;
  const verdict = a.verdict;
  const verdictColor = (() => {
    if (!verdict) return "var(--text-muted)";
    const v = String(verdict).toLowerCase();
    if (v.includes("bull") || v.includes("看多") || v.includes("多")) return "#22c55e";
    if (v.includes("bear") || v.includes("看空") || v.includes("空")) return "#ef4444";
    return "#eab308";
  })();
  const realDataSummary = useMemo(() => {
    if (!hasRealData || !marketData) return null;
    const candles = marketData.candles;
    const first = candles[0];
    const last = candles[candles.length - 1];
    const firstClose = first.close;
    const lastClose = last.close;
    const change = lastClose - firstClose;
    const changePct = firstClose !== 0 ? (change / firstClose) * 100 : 0;
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    return {
      symbol: marketData.symbol,
      timeframe: marketData.timeframe,
      count: marketData.count,
      firstClose,
      lastClose,
      change,
      changePct,
      high: Math.max(...highs),
      low: Math.min(...lows),
    };
  }, [hasRealData, marketData]);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: isDark ? "var(--bg-primary, #1a1a2e)" : "var(--bg-primary, #f5f5f5)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: isDark ? "var(--bg-secondary, #2d2d3d)" : "var(--bg-secondary, #e8e8e8)",
          flexShrink: 0,
          minHeight: "32px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: isDark ? "var(--text-primary, #eee)" : "var(--text-primary, #222)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={14} />
          {isZh ? "AI 分析" : "AI Analysis"}
          {verdict && (
            <span
              style={{
                marginLeft: 8,
                padding: "1px 8px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: verdictColor,
              }}
            >
              {verdict}
            </span>
          )}
        </span>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button
            ref={exportBtnRef}
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={!anything || isExporting}
            title={isZh ? "导出分析" : "Export analysis"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              fontSize: 11,
              borderRadius: 5,
              border: "1px solid var(--border-color)",
              background: isDark ? "var(--bg-tertiary, #3d3d4d)" : "var(--bg-tertiary, #d0d0d0)",
              color: anything ? "var(--text-secondary)" : "var(--text-muted)",
              cursor: anything && !isExporting ? "pointer" : "not-allowed",
              opacity: anything && !isExporting ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (anything && !isExporting) {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = anything ? "var(--text-secondary)" : "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
          >
            <Download size={12} />
            {isExporting ? (isZh ? "导出中..." : "Exporting...") : isZh ? "导出" : "Export"}
          </button>
          {showExportMenu && (
            <div
              ref={exportMenuRef}
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                minWidth: 160,
                background: isDark ? "var(--bg-secondary, #2d2d3d)" : "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                zIndex: 50,
                overflow: "hidden",
                padding: 4,
              }}
            >
              <div
                onClick={handleExportPDF}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileDown size={14} />
                {isZh ? "导出 PDF" : "Export PDF"}
              </div>
              <div
                onClick={handleExportHTML}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileCode size={14} />
                {isZh ? "导出 HTML" : "Export HTML"}
              </div>
              <div
                onClick={handleExportExcel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileSpreadsheet size={14} />
                {isZh ? "导出 Excel" : "Export Excel"}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", fontSize: 12, lineHeight: 1.6, color: "var(--text-primary)" }}>
        {!anything ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-muted)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {isZh ? "等待 AI 分析结果… 发送一条消息后，分析结果会自动出现在这里。" : "Waiting for AI analysis… Send a message and the result will appear here automatically."}
          </div>
        ) : (
          <>
            {hasRealData && realDataSummary && (
              <SectionCard
                isDark={isDark}
                title={isZh ? "真实数据依据" : "Real Data Grounding"}
                icon={<Database size={12} />}
                right={
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>
                    {realDataSummary.symbol} · {realDataSummary.timeframe} · {realDataSummary.count} {isZh ? "根" : "bars"}
                  </span>
                }
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{isZh ? "首收盘" : "First Close"}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{realDataSummary.firstClose.toFixed(4)}</div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{isZh ? "末收盘" : "Last Close"}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{realDataSummary.lastClose.toFixed(4)}</div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{isZh ? "区间涨跌" : "Change"}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: realDataSummary.change >= 0 ? "#22c55e" : "#ef4444" }}>
                      {realDataSummary.change >= 0 ? "+" : ""}
                      {realDataSummary.change.toFixed(4)} ({realDataSummary.changePct.toFixed(2)}%)
                    </div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{isZh ? "高/低" : "High/Low"}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                      {realDataSummary.high.toFixed(4)} / {realDataSummary.low.toFixed(4)}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
            {(hasCoreText || hasCompanyProfile) && (
              <ResponsiveGrid minColumnWidth={280}>
                {hasCoreText && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "深度分析" : "Deep Analysis"} icon={<BookOpen size={12} />}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, lineHeight: 1.7 }}>
                      {a._chatMessage && <div style={{ color: "var(--text-primary)" }}>{a._chatMessage}</div>}
                      {a.summary && (
                        <div
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: isDark ? "rgba(59,130,246,0.08)" : "rgba(37,99,235,0.06)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          {a.summary}
                        </div>
                      )}
                      {(a.trend || a.support || a.resistance || a.risk) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                          {a.trend && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>{isZh ? "趋势" : "Trend"}: </span>
                              {a.trend}
                            </div>
                          )}
                          {a.risk && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>{isZh ? "风险" : "Risk"}: </span>
                              {a.risk}
                            </div>
                          )}
                          {a.support && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>{isZh ? "支撑" : "Support"}: </span>
                              {a.support}
                            </div>
                          )}
                          {a.resistance && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>{isZh ? "阻力" : "Resistance"}: </span>
                              {a.resistance}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
                {hasCompanyProfile && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "公司概况" : "Company Profile"} icon={<Building2 size={12} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                      {a.companyProfile.fullName && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "全称" : "Full Name"}: </span>
                          {a.companyProfile.fullName}
                        </div>
                      )}
                      {a.companyProfile.industry && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "所属行业" : "Industry"}: </span>
                          {a.companyProfile.industry}
                        </div>
                      )}
                      {a.companyProfile.sector && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "板块" : "Sector"}: </span>
                          {a.companyProfile.sector}
                        </div>
                      )}
                      {a.companyProfile.listingDate && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "上市日期" : "Listed"}: </span>
                          {a.companyProfile.listingDate}
                        </div>
                      )}
                      {a.companyProfile.marketCap && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "总市值" : "Market Cap"}: </span>
                          {a.companyProfile.marketCap}
                        </div>
                      )}
                      {a.companyProfile.employees && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "员工人数" : "Employees"}: </span>
                          {a.companyProfile.employees}
                        </div>
                      )}
                      {a.companyProfile.website && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "官网" : "Website"}: </span>
                          {a.companyProfile.website}
                        </div>
                      )}
                      {a.companyProfile.mainBusiness && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--text-muted)" }}>{isZh ? "主营业务" : "Main Business"}: </span>
                          {a.companyProfile.mainBusiness}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}
              </ResponsiveGrid>
            )}
            {hasIndustry && (
              <SectionCard isDark={isDark} title={isZh ? "行业分析" : "Industry Analysis"} icon={<BarChart3 size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                  {a.industry.name && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "行业名称" : "Industry"}: </span>
                      {a.industry.name}
                    </div>
                  )}
                  {a.industry.position && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "行业地位" : "Position"}: </span>
                      {a.industry.position}
                    </div>
                  )}
                  {a.industry.trend && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "行业趋势" : "Trend"}: </span>
                      {a.industry.trend}
                    </div>
                  )}
                  {a.industry.outlook && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "发展前景" : "Outlook"}: </span>
                      {a.industry.outlook}
                    </div>
                  )}
                  {Array.isArray(a.industry.highlights) && a.industry.highlights.length > 0 && (
                    <div>
                      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>{isZh ? "行业亮点" : "Highlights"}:</div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {a.industry.highlights.map((h: string, i: number) => (
                          <li key={i} style={{ marginBottom: 1 }}>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
            {hasFinancials && (
              <SectionCard isDark={isDark} title={isZh ? "财务摘要" : "Financial Summary"} icon={<FileText size={12} />}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <tbody>
                    {a.financials.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "3px 4px", color: "var(--text-secondary)" }}>{item.key}</td>
                        <td style={{ padding: "3px 4px", fontWeight: 600 }}>{item.value}</td>
                        <td style={{ padding: "3px 4px", textAlign: "right", fontSize: 10, color: "var(--text-muted)" }}>{item.yoy !== undefined ? `${item.yoy >= 0 ? "+" : ""}${item.yoy}%` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}
            {(hasScore || hasMetrics) && (
              <ResponsiveGrid minColumnWidth={280}>
                {hasScore && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "情绪评分" : "Sentiment Score"} icon={<Activity size={12} />}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <SentimentGauge value={a.sentimentScore} isDark={isDark} isZh={isZh} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 11 }}>
                        {verdict && (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: "var(--text-muted)" }}>{isZh ? "结论" : "Verdict"}: </span>
                            <span style={{ fontWeight: 600, color: verdictColor }}>{verdict}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                )}
                {hasMetrics && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "关键指标" : "Key Metrics"} icon={<Activity size={12} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6 }}>
                      {a.metrics.map((m: any, i: number) => {
                        const c = m.change === "up" ? "#22c55e" : m.change === "down" ? "#ef4444" : "var(--text-primary)";
                        const Icon = m.change === "up" ? TrendingUp : m.change === "down" ? TrendingDown : Minus;
                        return (
                          <div key={i} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-color)", background: isDark ? "rgba(255,255,255,0.03)" : "#fff" }}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.key}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 3, color: c, fontWeight: 600, fontSize: 12 }}>
                              {m.change && <Icon size={11} />}
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.value}</span>
                              {m.unit && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.unit}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}
              </ResponsiveGrid>
            )}
            {hasFundFlow && (
              <SectionCard isDark={isDark} title={isZh ? "资金流向" : "Fund Flow"} icon={<Coins size={12} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                  {a.fundFlow.mainNet !== undefined && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "主力净流入" : "Main Net"}: </span>
                      <span style={{ fontWeight: 600, color: Number(a.fundFlow.mainNet) >= 0 ? "#22c55e" : "#ef4444" }}>{a.fundFlow.mainNet}</span>
                    </div>
                  )}
                  {a.fundFlow.mainNet5d !== undefined && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "5日净流入" : "5-Day Net"}: </span>
                      <span style={{ fontWeight: 600, color: Number(a.fundFlow.mainNet5d) >= 0 ? "#22c55e" : "#ef4444" }}>{a.fundFlow.mainNet5d}</span>
                    </div>
                  )}
                  {a.fundFlow.mainNet10d !== undefined && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "10日净流入" : "10-Day Net"}: </span>
                      <span style={{ fontWeight: 600, color: Number(a.fundFlow.mainNet10d) >= 0 ? "#22c55e" : "#ef4444" }}>{a.fundFlow.mainNet10d}</span>
                    </div>
                  )}
                  {a.fundFlow.turnoverRate && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "换手率" : "Turnover"}: </span>
                      {a.fundFlow.turnoverRate}
                    </div>
                  )}
                  {a.fundFlow.volumeRatio && (
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>{isZh ? "量比" : "Volume Ratio"}: </span>
                      {a.fundFlow.volumeRatio}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
            {(hasLevels || hasIndicators) && (
              <ResponsiveGrid minColumnWidth={280}>
                {hasLevels && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "关键价位" : "Price Levels"} icon={<Target size={12} />}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {a.priceLevels.map((lv: any, i: number) => {
                        const color = lv.type === "resistance" ? "#ef4444" : lv.type === "support" ? "#22c55e" : lv.type === "current" ? "#3b82f6" : lv.type === "target" ? "#a855f7" : "#f59e0b";
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 4, borderLeft: `2px solid ${color}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", fontSize: 11 }}>
                            <span style={{ fontWeight: 600, color, minWidth: 56 }}>{lv.price}</span>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lv.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}
                {hasIndicators && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "技术指标" : "Technical Indicators"} icon={<Activity size={12} />}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <tbody>
                        {a.indicators.map((ind: any, i: number) => {
                          const sColor = ind.signal === "buy" ? "#22c55e" : ind.signal === "sell" ? "#ef4444" : "var(--text-muted)";
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "3px 4px", color: "var(--text-secondary)" }}>{ind.name}</td>
                              <td style={{ padding: "3px 4px", fontWeight: 600 }}>{ind.value}</td>
                              <td style={{ padding: "3px 4px", textAlign: "right", color: sColor, fontWeight: 600 }}>{ind.signal ? String(ind.signal).toUpperCase() : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </SectionCard>
                )}
              </ResponsiveGrid>
            )}
            {hasRatings && (
              <SectionCard isDark={isDark} title={isZh ? "机构评级" : "Institutional Ratings"} icon={<Scale size={12} />}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, fontSize: 11, marginBottom: a.ratings.targetPrice ? 6 : 0 }}>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{isZh ? "买入" : "Buy"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{a.ratings.buy ?? 0}</div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{isZh ? "增持" : "Overweight"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{a.ratings.overweight ?? 0}</div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(234,179,8,0.1)" : "rgba(234,179,8,0.08)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{isZh ? "中性" : "Neutral"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#eab308" }}>{a.ratings.neutral ?? 0}</div>
                  </div>
                  <div style={{ padding: "4px 6px", borderRadius: 4, background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{isZh ? "减持" : "Underweight"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>{a.ratings.underweight ?? 0}</div>
                  </div>
                </div>
                {a.ratings.targetPrice && (
                  <div style={{ fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>{isZh ? "目标价" : "Target Price"}: </span>
                    <span style={{ fontWeight: 600 }}>{a.ratings.targetPrice}</span>
                    {a.ratings.upside && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-muted)" }}>({a.ratings.upside})</span>}
                  </div>
                )}
              </SectionCard>
            )}
            {hasResearchReports && (
              <SectionCard isDark={isDark} title={isZh ? "研报观点" : "Research Reports"} icon={<BookOpen size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.researchReports.map((r: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => openExternal(r.url)}
                      style={{
                        padding: "5px 7px",
                        borderRadius: 4,
                        border: "1px solid var(--border-color)",
                        background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                        cursor: r.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (r.url) {
                          e.currentTarget.style.borderColor = "var(--accent-color)";
                          e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-color)";
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "#fff";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1, lineHeight: 1.4 }}>{r.title}</div>
                        {r.summary && <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 2 }}>{r.summary}</div>}
                        <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.institution && <span>{r.institution}</span>}
                          {r.rating && <span style={{ color: r.rating === "buy" ? "#22c55e" : r.rating === "sell" ? "#ef4444" : "var(--text-muted)" }}>{r.rating.toUpperCase()}</span>}
                          {r.time && <span>{r.time}</span>}
                        </div>
                      </div>
                      {r.url && <ExternalLink size={12} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
            {hasNews && (
              <SectionCard isDark={isDark} title={isZh ? "相关新闻" : "Related News"} icon={<Newspaper size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.news.map((n: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => openExternal(n.url)}
                      style={{
                        padding: "5px 7px",
                        borderRadius: 4,
                        border: "1px solid var(--border-color)",
                        background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                        cursor: n.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (n.url) {
                          e.currentTarget.style.borderColor = "var(--accent-color)";
                          e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-color)";
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "#fff";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1, lineHeight: 1.4 }}>
                          {n.sentiment === "positive" ? "🟢 " : n.sentiment === "negative" ? "🔴 " : n.sentiment === "neutral" ? "🟡 " : ""}
                          {n.title}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 6 }}>
                          {n.source && <span>{n.source}</span>}
                          {n.time && <span>{n.time}</span>}
                        </div>
                      </div>
                      {n.url && <ExternalLink size={12} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
            {hasIndustryEvents && (
              <SectionCard isDark={isDark} title={isZh ? "行业事件" : "Industry Events"} icon={<Landmark size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.industryEvents.map((ev: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => openExternal(ev.url)}
                      style={{
                        padding: "5px 7px",
                        borderRadius: 4,
                        borderLeft: `2px solid ${ev.impact === "positive" ? "#22c55e" : ev.impact === "negative" ? "#ef4444" : "#3b82f6"}`,
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                        cursor: ev.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (ev.url) {
                          e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1 }}>{ev.title}</div>
                        {ev.description && <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{ev.description}</div>}
                        <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 6, marginTop: 2 }}>
                          {ev.source && <span>{ev.source}</span>}
                          {ev.time && <span>{ev.time}</span>}
                        </div>
                      </div>
                      {ev.url && <ExternalLink size={12} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
            {hasPolicyEvents && (
              <SectionCard isDark={isDark} title={isZh ? "政策与行业事件" : "Policy & Industry Events"} icon={<Landmark size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {a.policyEvents.map((p: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => openExternal(p.url)}
                      style={{
                        padding: "5px 7px",
                        borderRadius: 4,
                        borderLeft: `2px solid ${p.impact === "positive" ? "#22c55e" : p.impact === "negative" ? "#ef4444" : "#3b82f6"}`,
                        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                        cursor: p.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        if (p.url) {
                          e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 1 }}>{p.title}</div>
                        {p.description && <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{p.description}</div>}
                        <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 6, marginTop: 2 }}>
                          {p.source && <span>{p.source}</span>}
                          {p.time && <span>{p.time}</span>}
                        </div>
                      </div>
                      {p.url && <ExternalLink size={12} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
            {hasShareholders && (
              <SectionCard isDark={isDark} title={a.shareholders.title || (isZh ? "股东结构" : "Shareholders")} icon={<Users size={12} />}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      {a.shareholders.headers.map((h: string, i: number) => (
                        <th key={i} style={{ padding: "3px 4px", textAlign: "left", color: "var(--text-muted)", fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {a.shareholders.rows.map((row: any[], i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: "3px 4px" }}>
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}
            {hasHoldings && (
              <SectionCard isDark={isDark} title={a.holdings.title || (isZh ? "持股比例" : "Holdings")} icon={<PieChart size={12} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
                  {a.holdings.items.map((it: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                      <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{Number(it.ratio).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
            {hasSwot && (
              <SectionCard isDark={isDark} title={isZh ? "SWOT 分析" : "SWOT"} icon={<Lightbulb size={12} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[
                    { k: "strengths", label: isZh ? "优势" : "Strengths", color: "#22c55e" },
                    { k: "weaknesses", label: isZh ? "劣势" : "Weaknesses", color: "#ef4444" },
                    { k: "opportunities", label: isZh ? "机会" : "Opportunities", color: "#3b82f6" },
                    { k: "threats", label: isZh ? "威胁" : "Threats", color: "#f59e0b" },
                  ].map(({ k, label, color }) => {
                    const list = (a.swot as any)[k];
                    if (!list || list.length === 0) return null;
                    return (
                      <div key={k} style={{ padding: "5px 7px", borderRadius: 4, borderLeft: `2px solid ${color}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
                        <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11 }}>
                          {list.map((it: string, i: number) => (
                            <li key={i} style={{ marginBottom: 1 }}>
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
            {(hasRisks || hasSuggestions) && (
              <ResponsiveGrid minColumnWidth={280}>
                {hasRisks && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "风险提示" : "Risk Warnings"} icon={<ShieldAlert size={12} />}>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                      {a.risks.map((r: string, i: number) => (
                        <li key={i} style={{ marginBottom: 1, color: "var(--text-primary)" }}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
                {hasSuggestions && (
                  <SectionCard fullHeight isDark={isDark} title={isZh ? "操作建议" : "Suggestions"} icon={<Lightbulb size={12} />}>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                      {a.suggestions.map((s: string, i: number) => (
                        <li key={i} style={{ marginBottom: 1 }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </ResponsiveGrid>
            )}
            {disclaimer && (
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 6,
                  borderTop: "1px dashed var(--border-color)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}
              >
                ⚠️ {disclaimer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default AIAnalysis;
