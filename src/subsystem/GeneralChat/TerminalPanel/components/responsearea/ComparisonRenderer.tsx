import React from "react";
import { ComparisonData } from "../../../llm/types";
interface ComparisonRendererProps {
  data: ComparisonData;
  t: (key: string) => string;
  isZh?: boolean;
}
const ComparisonRenderer: React.FC<ComparisonRendererProps> = ({ data, t, isZh = true }) => {
  if (!data || !data.headers || data.headers.length < 2 || !data.rows || data.rows.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无对比数据" : "No comparison data available"}
      </div>
    );
  }
  // Determine best values for each row (only for numeric values)
  const getBestValues = (): Map<number, { value: string | number; index: number }> => {
    const bestMap = new Map<number, { value: string | number; index: number }>();
    const direction = data.bestDirection || "higher";
    data.rows.forEach((row, rowIndex) => {
      let bestValue: number | null = null;
      let bestIndex = -1;
      let bestOriginalValue: string | number | null = null;
      row.values.forEach((value, colIndex) => {
        // Only compare numeric values
        const numValue = typeof value === "number" ? value : parseFloat(String(value));
        if (isNaN(numValue)) return;
        if (bestValue === null) {
          bestValue = numValue;
          bestIndex = colIndex;
          bestOriginalValue = value;
        } else {
          const isBetter = direction === "higher" ? numValue > bestValue : numValue < bestValue;
          if (isBetter) {
            bestValue = numValue;
            bestIndex = colIndex;
            bestOriginalValue = value;
          }
        }
      });
      // Only set if we found at least one numeric value
      if (bestIndex !== -1 && bestOriginalValue !== null) {
        bestMap.set(rowIndex, { value: bestOriginalValue, index: bestIndex });
      }
    });
    return bestMap;
  };
  const bestValues = data.highlightBest !== false ? getBestValues() : new Map();
  // Check if a value is the best in its row
  const isBestValue = (rowIndex: number, colIndex: number, value: string | number): boolean => {
    if (data.highlightBest === false) return false;
    const best = bestValues.get(rowIndex);
    if (!best) return false;
    const numValue = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) return false;
    const bestNumValue = typeof best.value === "number" ? best.value : parseFloat(String(best.value));
    if (isNaN(bestNumValue)) return false;
    return colIndex === best.index && numValue === bestNumValue;
  };
  // Get status indicator for values
  const getValueIndicator = (rowIndex: number, colIndex: number, value: string | number): React.ReactNode => {
    if (data.highlightBest === false) return null;
    const best = bestValues.get(rowIndex);
    if (!best) return null;
    const numValue = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) return null;
    const bestNumValue = typeof best.value === "number" ? best.value : parseFloat(String(best.value));
    if (isNaN(bestNumValue)) return null;
    if (colIndex === best.index && numValue === bestNumValue) {
      return (
        <span
          style={{
            marginLeft: "4px",
            fontSize: "12px",
            color: "#10b981",
          }}
        >
          ★
        </span>
      );
    }
    return null;
  };
  // Get bar visualization for numeric values
  const getBarForValue = (rowIndex: number, colIndex: number, value: string | number): React.ReactNode => {
    const numValue = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) return null;
    // Find max value in this row
    const row = data.rows[rowIndex];
    let maxValue = 0;
    row.values.forEach((v) => {
      const nv = typeof v === "number" ? v : parseFloat(String(v));
      if (!isNaN(nv) && nv > maxValue) maxValue = nv;
    });
    if (maxValue === 0) return null;
    const percentage = (numValue / maxValue) * 100;
    const isBest = isBestValue(rowIndex, colIndex, value);
    const color = isBest ? "#10b981" : "#6366f1";
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 500, minWidth: "40px" }}>{numValue}</span>
        <div
          style={{
            flex: 1,
            height: "6px",
            background: "var(--bg-secondary)",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: "40px",
          }}
        >
          <div
            style={{
              width: `${Math.max(percentage, 2)}%`,
              height: "100%",
              background: color,
              borderRadius: "3px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
    );
  };
  // Check if a row contains mostly numeric values
  const isNumericRow = (row: { feature: string; values: (string | number)[] }): boolean => {
    let numericCount = 0;
    row.values.forEach((v) => {
      const nv = typeof v === "number" ? v : parseFloat(String(v));
      if (!isNaN(nv)) numericCount++;
    });
    return numericCount > row.values.length / 2;
  };
  // Get the best option label (which column has the most "best" values)
  const getBestOptionLabel = (): string => {
    // Count how many times each option is the best
    const counts: Record<number, number> = {};
    // Safely iterate over bestValues
    bestValues.forEach((best) => {
      if (best && typeof best.index === "number" && best.index >= 0) {
        counts[best.index] = (counts[best.index] || 0) + 1;
      }
    });
    let maxCount = 0;
    let bestIndex = -1;
    Object.keys(counts).forEach((key) => {
      const index = parseInt(key, 10);
      const count = counts[index];
      if (count > maxCount) {
        maxCount = count;
        bestIndex = index;
      }
    });
    if (bestIndex !== -1 && maxCount > 0 && bestIndex + 1 < data.headers.length) {
      return data.headers[bestIndex + 1] || "";
    }
    return "";
  };
  const bestOption = getBestOptionLabel();
  return (
    <div
      className="terminal-comparison-container"
      style={{
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {data.title && (
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
          <span style={{ fontSize: "13px", lineHeight: 1 }}>📊</span>
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
          {bestOption && (
            <span
              style={{
                fontSize: "10px",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "2px 8px",
                borderRadius: "10px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              {isZh ? "🏆 推荐" : "🏆 Best"}: {bestOption}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          padding: "12px 16px",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  style={{
                    padding: "8px 12px",
                    textAlign: index === 0 ? "left" : "center",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    borderBottom: "2px solid var(--border-color)",
                    fontSize: "12px",
                    background: index === 0 ? "transparent" : "var(--bg-secondary)",
                  }}
                >
                  {index === 0 ? (
                    <span style={{ color: "var(--text-secondary)" }}>{header}</span>
                  ) : (
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => {
              const isNumeric = isNumericRow(row);
              const isHighlight = row.highlight || false;
              return (
                <tr
                  key={rowIndex}
                  style={{
                    background: isHighlight ? "var(--accent-glow)" : rowIndex % 2 === 0 ? "var(--bg-secondary)" : "transparent",
                    borderBottom: rowIndex === data.rows.length - 1 ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      fontWeight: isHighlight ? 600 : 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.feature}
                    {row.unit && (
                      <span
                        style={{
                          marginLeft: "4px",
                          fontSize: "10px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        ({row.unit})
                      </span>
                    )}
                  </td>
                  {row.values.map((value, colIndex) => {
                    const numValue = typeof value === "number" ? value : parseFloat(String(value));
                    const isNumericValue = !isNaN(numValue);
                    const isBest = isBestValue(rowIndex, colIndex, value);
                    return (
                      <td
                        key={colIndex}
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: isBest ? "#10b981" : "var(--text-secondary)",
                          fontWeight: isBest ? 600 : 400,
                          fontSize: isBest ? "13px" : "12px",
                          minWidth: "80px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {isNumeric && isNumericValue ? (
                            getBarForValue(rowIndex, colIndex, value)
                          ) : (
                            <>
                              <span>{value}</span>
                              {getValueIndicator(rowIndex, colIndex, value)}
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.highlightBest !== false && (
          <div
            style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-color)",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span>★ {isZh ? "最佳值" : "Best value"}</span>
            <span style={{ color: "var(--border-color)" }}>|</span>
            <span>{isZh ? `📊 柱状图长度表示相对值 (${data.bestDirection === "higher" ? "越高越好" : "越低越好"})` : `📊 Bar length indicates relative value (${data.bestDirection === "higher" ? "higher is better" : "lower is better"})`}</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default ComparisonRenderer;
