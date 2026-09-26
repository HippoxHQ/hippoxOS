export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}
export interface GitFileEntry {
  file: string;
  status: string;
  statusDesc: string;
}
export type DraggingKind = "staged-split" | "left-col" | "top-split" | "history-split" | "history-left-split" | null;