import React from "react";
import { TimelineData, TimelineEvent } from "../../../llm/types";
interface TimelineRendererProps {
  data: TimelineData;
  t: (key: string) => string;
  isZh?: boolean;
}
const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  "in-progress": "#f59e0b",
  planned: "#818cf8",
  cancelled: "#ef4444",
};
const STATUS_LABELS: Record<string, Record<string, string>> = {
  zh: {
    completed: "已完成",
    "in-progress": "进行中",
    planned: "计划中",
    cancelled: "已取消",
  },
  en: {
    completed: "Completed",
    "in-progress": "In Progress",
    planned: "Planned",
    cancelled: "Cancelled",
  },
};
const TimelineRenderer: React.FC<TimelineRendererProps> = ({ data, t, isZh = true }) => {
  if (!data || !data.events || data.events.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "12px",
        }}
      >
        {isZh ? "暂无时间线数据" : "No timeline data available"}
      </div>
    );
  }
  // Sort events by date (oldest first)
  const sortedEvents = [...data.events].sort((a, b) => {
    try {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } catch {
      return 0;
    }
  });
  // Get status label
  const getStatusLabel = (status?: string): string => {
    if (!status) return "";
    const lang = isZh ? "zh" : "en";
    return STATUS_LABELS[lang]?.[status] || status;
  };
  // Get status color
  const getStatusColor = (status?: string): string => {
    if (!status) return "#818cf8";
    return STATUS_COLORS[status] || "#818cf8";
  };
  return (
    <div
      className="terminal-timeline-container"
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
          <span style={{ fontSize: "13px", lineHeight: 1 }}>📅</span>
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
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-tertiary)",
              marginLeft: "auto",
            }}
          >
            {sortedEvents.length} {isZh ? "个事件" : "events"}
          </span>
        </div>
      )}
      <div
        style={{
          padding: "16px 20px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            paddingLeft: "28px",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "8px",
              top: "4px",
              bottom: "4px",
              width: "2px",
              background: "var(--border-color)",
            }}
          />
          {sortedEvents.map((event, index) => {
            const color = event.color || getStatusColor(event.status);
            const icon = event.icon || "●";
            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  marginBottom: index === sortedEvents.length - 1 ? 0 : "16px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "-24px",
                    top: "2px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: color,
                    border: "2px solid var(--bg-tertiary)",
                    boxShadow: `0 0 0 2px ${color}`,
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        fontFamily: "monospace",
                        fontWeight: 500,
                      }}
                    >
                      {event.date}
                    </span>
                    {event.status && (
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 8px",
                          borderRadius: "10px",
                          background: `${color}20`,
                          color: color,
                          fontWeight: 500,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{icon}</span>
                    <span>{event.title}</span>
                  </div>
                  {event.description && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        paddingLeft: "22px",
                      }}
                    >
                      {event.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default TimelineRenderer;
