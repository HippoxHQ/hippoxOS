const DataTable: React.FC<{
  table: { headers: string[]; rows: (string | number)[][]; title?: string };
  t: (key: string) => string;
}> = ({ table, t }) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };
  return (
    <div
      className="terminal-table"
      style={{ margin: "12px 0", overflowX: "auto" }}
    >
      {table.title && (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "8px",
          }}
        >
          📊 {table.title} ({t("terminal.tableRows") || "rows"}:{" "}
          {table.rows.length})
        </div>
      )}
      <div
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            background: "var(--bg-tertiary)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              background: "var(--bg-tertiary)",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                {table.headers.map((header, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      borderBottom: "2px solid var(--border-color)",
                      borderRight:
                        idx !== table.headers.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div
          style={{
            maxHeight: "220px",
            overflowY: "auto",
            overflowX: "auto",
            background: "var(--bg-secondary)",
          }}
          onScroll={handleScroll}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              background: "var(--bg-secondary)",
              tableLayout: "fixed",
            }}
          >
            <tbody>
              {table.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    background:
                      rowIdx % 2 === 0
                        ? "var(--bg-secondary)"
                        : "var(--bg-tertiary)",
                    borderBottom:
                      rowIdx === table.rows.length - 1
                        ? "none"
                        : "1px solid var(--border-color)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      rowIdx % 2 === 0
                        ? "var(--bg-secondary)"
                        : "var(--bg-tertiary)";
                  }}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-secondary)",
                        borderRight:
                          cellIdx !== row.length - 1
                            ? "1px solid var(--border-color)"
                            : "none",
                        whiteSpace: "nowrap",
                        textAlign: typeof cell === "number" ? "right" : "left",
                        fontVariantNumeric:
                          typeof cell === "number" ? "tabular-nums" : "normal",
                        fontFamily:
                          typeof cell === "number" ? "monospace" : "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
