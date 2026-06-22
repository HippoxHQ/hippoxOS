import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { filesCommands } from "../../../../command/files";
import { UploadFile } from "../../../../core/types";
import Papa from "papaparse";
import { showTooltip } from "../../../../components/Tooltip";
import { showToast, ToastType } from "../../../Toast";

interface TableFilePreviewProps {
  file: UploadFile | null;
  onClose: () => void;
  t?: (key: string, params?: any) => string;
}

const TableFilePreview: React.FC<TableFilePreviewProps> = ({
  file,
  onClose,
  t = (key: string) => key,
}) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [dragColumnIndex, setDragColumnIndex] = useState<number | null>(null);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_ROWS = 20;

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "Unknown size";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }, []);

  const parseTableData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let content: string;
      if (file?.path) {
        content = await filesCommands.readTextFile(file.path);
      } else if (file?.file) {
        content = await file.file.text();
      } else {
        setError("No file data available");
        setIsLoading(false);
        return;
      }
      const fileInfo = file?.path
        ? await filesCommands.getFileInfo(file.path).catch(() => null)
        : null;
      setFileSize(fileInfo?.size || file?.size || 0);
      const delimiter = detectDelimiter(content);
      // @ts-ignore
      const result: any = Papa.parse(content, {
        delimiter: delimiter,
        skipEmptyLines: true,
        trimHeaders: true,
        transformHeader: (header: string) => header.trim(),
      });
      if (result.errors.length > 0) {
        console.warn("Papa Parse warnings:", result.errors);
      }
      if (!result.data || result.data.length === 0) {
        setError("No data found in file");
        setIsLoading(false);
        return;
      }
      const parsedData = result.data;
      const headerRow = parsedData[0] || [];
      const dataRows = parsedData.slice(1);
      const filteredDataRows = dataRows.filter((row: string[]) =>
        row.some((cell: string) => cell && cell.trim() !== ""),
      );
      setHeaders(headerRow);
      const paddedRows = [...filteredDataRows];
      const emptyRow = new Array(headerRow.length).fill("");
      while (paddedRows.length < MIN_ROWS) {
        paddedRows.push([...emptyRow]);
      }
      setRows(paddedRows);
      const initialWidths: Record<number, number> = {};
      headerRow.forEach((_: string, index: number) => {
        initialWidths[index] = 150;
      });
      setColumnWidths(initialWidths);
      setRowHeights({});
    } catch (err) {
      setError("Failed to parse table file");
      console.error("Table parse error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const detectDelimiter = (content: string): string => {
    const firstLine = content.split("\n").find((line) => line.trim());
    if (!firstLine) return ",";
    const tabs = (firstLine.match(/\t/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (tabs > commas && tabs > semicolons) return "\t";
    if (semicolons > commas && semicolons > tabs) return ";";
    return ",";
  };

  useEffect(() => {
    if (file?.path || file?.file) {
      setHeaders([]);
      setRows([]);
      setError(null);
      setSearchTerm("");
      setSortColumn(null);
      setSortDirection("asc");
      parseTableData();
    }
  }, [file]);

  const processedData = useMemo(() => {
    let filteredRows = rows;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filteredRows = rows.filter((row) =>
        row.some((cell) => cell?.toLowerCase().includes(term)),
      );
    }
    if (sortColumn !== null) {
      const sorted = [...filteredRows];
      const colIndex = sortColumn;
      const direction = sortDirection === "asc" ? 1 : -1;
      sorted.sort((a, b) => {
        const aVal = a[colIndex] || "";
        const bVal = b[colIndex] || "";
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return (aNum - bNum) * direction;
        }
        return aVal.localeCompare(bVal) * direction;
      });
      return sorted;
    }
    return filteredRows;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(colIndex);
      setSortDirection("asc");
    }
  };

  const handleDownload = useCallback(async () => {
    const headerRow = headers.join(",");
    const dataRows = rows
      .filter((row) => hasActualData(row))
      .map((row) => row.join(","))
      .join("\n");
    const csvContent = `${headerRow}\n${dataRows}`;
    const defaultName =
      file?.name?.replace(/\.[^/.]+$/, "") + ".csv" || "table.csv";
    try {
      await filesCommands.saveFile(csvContent, defaultName);
      showToast(ToastType.SUCCESS, t("table.downloadSuccess"));
    } catch (error) {
      console.error("Failed to save file:", error);
      showToast(ToastType.ERROR, t("table.downloadFailed"));
    }
  }, [headers, rows, file?.name, t]);

  const handleColumnResizeMouseDown = (
    e: React.MouseEvent,
    colIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingColumn(true);
    setDragColumnIndex(colIndex);
    setDragStartX(e.clientX);
    setDragStartWidth(columnWidths[colIndex] || 150);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleRowResizeMouseDown = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRow(true);
    setDragRowIndex(rowIndex);
    setDragStartY(e.clientY);
    setDragStartHeight(rowHeights[rowIndex] || 36);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingColumn && dragColumnIndex !== null) {
        const delta = e.clientX - dragStartX;
        const newWidth = Math.max(60, dragStartWidth + delta);
        setColumnWidths((prev) => ({
          ...prev,
          [dragColumnIndex]: newWidth,
        }));
      }
      if (isDraggingRow && dragRowIndex !== null) {
        const delta = e.clientY - dragStartY;
        const newHeight = Math.max(28, dragStartHeight + delta);
        setRowHeights((prev) => ({
          ...prev,
          [dragRowIndex]: newHeight,
        }));
      }
    };
    const handleMouseUp = () => {
      if (isDraggingColumn) {
        setIsDraggingColumn(false);
        setDragColumnIndex(null);
      }
      if (isDraggingRow) {
        setIsDraggingRow(false);
        setDragRowIndex(null);
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isDraggingColumn || isDraggingRow) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    isDraggingColumn,
    isDraggingRow,
    dragColumnIndex,
    dragRowIndex,
    dragStartX,
    dragStartY,
    dragStartWidth,
    dragStartHeight,
  ]);

  const getColumnWidth = (colIndex: number): number => {
    return columnWidths[colIndex] || 150;
  };

  const getRowHeight = (rowIndex: number): number => {
    return rowHeights[rowIndex] || 36;
  };

  const hasActualData = (row: string[]): boolean => {
    return row.some((cell) => cell && cell.trim() !== "");
  };

  const handleTooltip = (
    e: React.MouseEvent<HTMLElement>,
    key: string,
    params?: any,
  ) => {
    const message = t(key, params);
    showTooltip(message, e.currentTarget);
  };

  if (!file) return null;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
          }}
        >
          <span>📊</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 150,
            }}
          >
            {file.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          >
            {formatFileSize(fileSize)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          >
            {rows.filter((r) => hasActualData(r)).length} {t("table.rows")} ×{" "}
            {headers.length} {t("table.cols")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleDownload}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px 8px",
              borderRadius: 4,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
              showTooltip(t("table.downloadTitle"), e.currentTarget);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "8px 16px",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 150 }}>
          <input
            type="text"
            placeholder={t("table.searchPlaceholder") || "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 10px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              color: "var(--text-primary)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {processedData.filter((r) => hasActualData(r)).length} /{" "}
          {rows.filter((r) => hasActualData(r)).length} {t("table.rows")}
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12,
              padding: "2px 6px",
            }}
            onMouseEnter={(e) => handleTooltip(e, "table.clear")}
          >
            ✕ {t("table.clear")}
          </button>
        )}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {sortColumn !== null && (
            <span>
              {t("table.sortedBy", {
                column: sortColumn + 1,
                direction: sortDirection === "asc" ? "asc" : "desc",
              })}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
        }}
      >
        {isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            {t("table.loading")}
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#ff6666",
              fontSize: 14,
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>❌</span>
            {error}
          </div>
        )}

        {!isLoading && !error && headers.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            {t("table.noData")}
          </div>
        )}

        {!isLoading && !error && headers.length > 0 && (
          <table
            ref={tableRef}
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              tableLayout: "fixed",
              border: "1px solid var(--border-color)",
            }}
          >
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    onClick={() => handleSort(index)}
                    style={{
                      padding: "8px 12px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: "pointer",
                      position: "relative",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: getColumnWidth(index),
                      minWidth: 60,
                      maxWidth: 400,
                      userSelect: "none",
                      height: 36,
                    }}
                    title={header}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{header || `Column ${index + 1}`}</span>
                      {sortColumn === index && (
                        <span
                          style={{ fontSize: 10, color: "var(--accent-color)" }}
                        >
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: -4,
                        width: 8,
                        height: "100%",
                        cursor: "col-resize",
                        zIndex: 20,
                        background: "transparent",
                      }}
                      onMouseDown={(e) => handleColumnResizeMouseDown(e, index)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--accent-color)";
                        e.currentTarget.style.opacity = "0.5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.opacity = "1";
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--text-tertiary)",
                      fontSize: 13,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    {searchTerm
                      ? t("table.noMatchingRows")
                      : t("table.noDataRows")}
                  </td>
                </tr>
              ) : (
                processedData.map((row, rowIndex) => {
                  const isEmptyRow = !hasActualData(row);
                  const isLastRow = rowIndex === processedData.length - 1;
                  return (
                    <tr
                      key={rowIndex}
                      style={{
                        background:
                          rowIndex % 2 === 0
                            ? "var(--bg-primary)"
                            : "var(--bg-tertiary)",
                        transition: "background 0.15s ease",
                        height: getRowHeight(rowIndex),
                        opacity: isEmptyRow ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isEmptyRow) {
                          e.currentTarget.style.background = "var(--hover-bg)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isEmptyRow) {
                          e.currentTarget.style.background =
                            rowIndex % 2 === 0
                              ? "var(--bg-primary)"
                              : "var(--bg-tertiary)";
                        }
                      }}
                    >
                      {headers.map((_, colIndex) => (
                        <td
                          key={colIndex}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid var(--border-color)",
                            borderBottom: isLastRow
                              ? "1px solid var(--border-color)"
                              : "none",
                            color: isEmptyRow
                              ? "var(--text-tertiary)"
                              : "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: getColumnWidth(colIndex),
                            minWidth: 60,
                            maxWidth: 400,
                            fontSize: 12,
                            height: getRowHeight(rowIndex),
                            position: "relative",
                          }}
                          title={row[colIndex] || ""}
                          onMouseDown={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const offsetY = e.clientY - rect.top;
                            const isBottomEdge = offsetY > rect.height - 6;
                            if (isBottomEdge && !isLastRow) {
                              handleRowResizeMouseDown(e, rowIndex);
                            }
                          }}
                          onMouseMove={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const offsetY = e.clientY - rect.top;
                            const isBottomEdge = offsetY > rect.height - 6;
                            if (isBottomEdge && !isLastRow) {
                              e.currentTarget.style.cursor = "row-resize";
                            } else {
                              e.currentTarget.style.cursor = "default";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.cursor = "default";
                          }}
                        >
                          {row[colIndex] || ""}
                          {!isLastRow && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: -1,
                                left: 0,
                                right: 0,
                                height: "3px",
                                background: "transparent",
                                transition: "background 0.15s",
                                pointerEvents: "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "var(--accent-color)";
                                e.currentTarget.style.opacity = "0.3";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                                e.currentTarget.style.opacity = "1";
                              }}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TableFilePreview;
