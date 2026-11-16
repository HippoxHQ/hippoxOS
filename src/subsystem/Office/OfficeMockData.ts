import React from "react";
import OfficeExcel from "./OfficePanel/files/OfficeExcel";
import OfficePDFFile from "./OfficePanel/files/OfficePDFFile";
import OfficePPTFile from "./OfficePanel/files/OfficePPTFile";
import OfficeWordFile from "./OfficePanel/files/OfficeWordFile";
export type OfficeFileKind = "doc" | "pdf" | "slides" | "sheet";
export interface OfficeFile {
  id: string;
  name: string;
  kind: OfficeFileKind;
  path?: string;
}
export interface ConversationTurn {
  id: string;
  summary: string;
  timeLabel: string;
  files: OfficeFile[];
}
export const OFFICE_TURNS: ConversationTurn[] = [
  {
    id: "turn_1",
    summary: "整理 Q3 项目周报的要点",
    timeLabel: "09:12",
    files: [
      { id: "file_weekly", name: "Q3 项目周报.docx", kind: "doc" },
      { id: "file_budget", name: "预算与排期.xlsx", kind: "sheet" },
      { id: "file_contract", name: "合作方合同.pdf", kind: "pdf" },
    ],
  },
  {
    id: "turn_2",
    summary: "根据周报生成产品发布方案大纲",
    timeLabel: "09:28",
    files: [
      { id: "file_launch", name: "产品发布方案.pptx", kind: "slides" },
      { id: "file_weekly", name: "Q3 项目周报.docx", kind: "doc" },
    ],
  },
  {
    id: "turn_3",
    summary: "把会议纪要里的待办同步到排期表",
    timeLabel: "09:45",
    files: [
      { id: "file_meeting", name: "会议纪要.docx", kind: "doc" },
      { id: "file_budget", name: "预算与排期.xlsx", kind: "sheet" },
    ],
  },
  {
    id: "turn_4",
    summary: "汇总本周所有产出，生成一份进展报告",
    timeLabel: "10:02",
    files: [
      { id: "file_progress", name: "本周进展报告.docx", kind: "doc" },
      { id: "file_launch", name: "产品发布方案.pptx", kind: "slides" },
      { id: "file_budget", name: "预算与排期.xlsx", kind: "sheet" },
      { id: "file_contract", name: "合作方合同.pdf", kind: "pdf" },
    ],
  },
  {
    id: "turn_5",
    summary: "整理客户反馈，输出需求优先级列表",
    timeLabel: "10:21",
    files: [
      { id: "file_feedback", name: "客户反馈汇总.xlsx", kind: "sheet" },
      { id: "file_priority", name: "需求优先级清单.docx", kind: "doc" },
    ],
  },
  {
    id: "turn_6",
    summary: "为下周评审准备演示文稿",
    timeLabel: "10:40",
    files: [
      { id: "file_review", name: "评审演示.pptx", kind: "slides" },
      { id: "file_progress", name: "本周进展报告.docx", kind: "doc" },
      { id: "file_feedback", name: "客户反馈汇总.xlsx", kind: "sheet" },
    ],
  },
  {
    id: "turn_7",
    summary: "审阅合作方合同的关键条款",
    timeLabel: "11:05",
    files: [
      { id: "file_contract", name: "合作方合同.pdf", kind: "pdf" },
      { id: "file_notes", name: "合同审阅意见.docx", kind: "doc" },
    ],
  },
  {
    id: "turn_8",
    summary: "制定下一季度的预算初稿",
    timeLabel: "11:32",
    files: [
      { id: "file_q4_budget", name: "Q4 预算初稿.xlsx", kind: "sheet" },
      { id: "file_budget", name: "预算与排期.xlsx", kind: "sheet" },
    ],
  },
  {
    id: "turn_9",
    summary: "生成产品路线图的说明文档",
    timeLabel: "13:10",
    files: [
      { id: "file_roadmap", name: "产品路线图说明.docx", kind: "doc" },
      { id: "file_roadmap_deck", name: "路线图演示.pptx", kind: "slides" },
    ],
  },
  {
    id: "turn_10",
    summary: "把本轮所有产出归档并生成摘要",
    timeLabel: "13:48",
    files: [
      { id: "file_archive", name: "本轮产出归档.xlsx", kind: "sheet" },
      { id: "file_summary", name: "本轮摘要.docx", kind: "doc" },
      { id: "file_review", name: "评审演示.pptx", kind: "slides" },
      { id: "file_contract", name: "合作方合同.pdf", kind: "pdf" },
    ],
  },
  {
    id: "turn_11",
    summary: "Summarize the Q3 weekly report highlights",
    timeLabel: "14:05",
    files: [
      { id: "file_weekly_en", name: "Q3 Weekly Report.docx", kind: "doc" },
      { id: "file_budget_en", name: "Budget & Schedule.xlsx", kind: "sheet" },
      { id: "file_contract_en", name: "Partner Contract.pdf", kind: "pdf" },
    ],
  },
  {
    id: "turn_12",
    summary: "Draft a product launch outline from the report",
    timeLabel: "14:20",
    files: [
      { id: "file_launch_en", name: "Product Launch Plan.pptx", kind: "slides" },
      { id: "file_weekly_en", name: "Q3 Weekly Report.docx", kind: "doc" },
    ],
  },
  {
    id: "turn_13",
    summary: "Sync meeting action items into the schedule",
    timeLabel: "14:36",
    files: [
      { id: "file_meeting_en", name: "Meeting Minutes.docx", kind: "doc" },
      { id: "file_budget_en", name: "Budget & Schedule.xlsx", kind: "sheet" },
    ],
  },
  {
    id: "turn_14",
    summary: "Summarize all outputs and generate a progress report",
    timeLabel: "14:52",
    files: [
      { id: "file_progress_en", name: "Weekly Progress Report.docx", kind: "doc" },
      { id: "file_launch_en", name: "Product Launch Plan.pptx", kind: "slides" },
      { id: "file_budget_en", name: "Budget & Schedule.xlsx", kind: "sheet" },
      { id: "file_contract_en", name: "Partner Contract.pdf", kind: "pdf" },
    ],
  },
  {
    id: "turn_15",
    summary: "Organize customer feedback and prioritize requirements",
    timeLabel: "15:08",
    files: [
      { id: "file_feedback_en", name: "Customer Feedback.xlsx", kind: "sheet" },
      { id: "file_priority_en", name: "Requirement Priorities.docx", kind: "doc" },
    ],
  },
];
export function getTurnById(turnId: string | null): ConversationTurn | null {
  if (!turnId) return null;
  return OFFICE_TURNS.find((t) => t.id === turnId) ?? null;
}
export function getFileById(fileId: string | null): OfficeFile | null {
  if (!fileId) return null;
  for (const turn of OFFICE_TURNS) {
    const f = turn.files.find((x) => x.id === fileId);
    if (f) return f;
  }
  return null;
}
export const OFFICE_FILE_COMPONENTS: Record<OfficeFileKind, React.ComponentType<{ fileName?: string; t?: (key: string, params?: Record<string, string | number>) => string; language?: "zh" | "en"; style?: React.CSSProperties }>> = {
  doc: OfficeWordFile,
  pdf: OfficePDFFile,
  slides: OfficePPTFile,
  sheet: OfficeExcel,
};