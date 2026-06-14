import React, { useRef, useEffect, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { showTooltip, closeTooltip } from "../Tooltip";
import "react-calendar-heatmap/dist/styles.css";

const FireIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface BottomHeatmapPanelProps {
  t: (key: string, params?: any) => string;
  tasks?: any[];
}

const BottomHeatmapPanel: React.FC<BottomHeatmapPanelProps> = ({
  t,
  tasks = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const generateHeatmapValues = () => {
    const countMap = new Map<string, number>();
    tasks.forEach((task) => {
      if (task.last_executed_at) {
        const date = new Date(task.last_executed_at);
        if (date.getFullYear() === currentYear) {
          const dateStr = date.toISOString().split("T")[0];
          countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
        }
      }
    });
    return Array.from(countMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  };
  const addTestData = () => {
    const testValues = [];
    const today = new Date();
    for (let i = 0; i < 120; i++) {
      const date = new Date();
      date.setDate(today.getDate() - Math.floor(Math.random() * 365));
      const count = Math.floor(Math.random() * 15) + 1;
      if (date.getFullYear() === currentYear) {
        testValues.push({
          date: date.toISOString().split("T")[0],
          count: count,
        });
      }
    }
    return testValues;
  };
  const heatmapValues = generateHeatmapValues();
  const finalHeatmapValues =
    heatmapValues.length > 0 ? heatmapValues : addTestData();
  const dataMap = new Map<string, number>();
  finalHeatmapValues.forEach((v) => {
    dataMap.set(v.date, v.count);
  });
  const getCellColor = (value: any) => {
    if (!value || !value.count) {
      return "var(--bg-tertiary, #22252f)";
    }
    if (value.count <= 2) return "#0e4429";
    if (value.count <= 5) return "#006d32";
    if (value.count <= 10) return "#26a641";
    return "#39d353";
  };
  const getTooltipMessage = (date: string, count: number) => {
    if (!count || count === 0) {
      return t("scheduled.noExecutionRecord") || "无执行记录";
    }
    return `${date}\n${t("scheduled.executionCount") || "执行次数"}: ${count} ${t("scheduled.times") || "次"}`;
  };
  const getDateFromCell = (cell: Element): string | null => {
    const dataDate = cell.getAttribute("data-date");
    if (dataDate) return dataDate;
    const title = cell.getAttribute("title");
    if (title) {
      const match = title.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const ariaLabel = cell.getAttribute("aria-label");
    if (ariaLabel) {
      const match = ariaLabel.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    return null;
  };
  useEffect(() => {
    if (!isExpanded) return;
    if (!heatmapContainerRef.current) return;
    const fixSvgSize = () => {
      const svg = heatmapContainerRef.current?.querySelector("svg");
      if (svg) {
        svg.style.width = "960px";
        svg.style.height = "150px";
      }
    };
    const timer = setTimeout(fixSvgSize, 150);
    const resizeObserver = new ResizeObserver(() => {
      fixSvgSize();
      if (heatmapContainerRef.current) {
        heatmapContainerRef.current.scrollLeft =
          heatmapContainerRef.current.scrollWidth;
      }
    });
    if (heatmapContainerRef.current) {
      resizeObserver.observe(heatmapContainerRef.current);
    }
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [isExpanded]);
  useEffect(() => {
    if (!isExpanded) return;
    if (!heatmapContainerRef.current) return;
    const container = heatmapContainerRef.current;
    const applyStylesAndEvents = () => {
      const cells = container.querySelectorAll("rect");
      cells.forEach((cell) => {
        let date: string | null = null;
        date = getDateFromCell(cell);
        if (!date) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const totalDays =
            Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;
          const allCells = Array.from(container.querySelectorAll("rect"));
          const cellIndex = allCells.indexOf(cell);
          if (cellIndex >= 0 && cellIndex < totalDays) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + cellIndex);
            date = currentDate.toISOString().split("T")[0];
          }
        }
        const count = date ? dataMap.get(date) || 0 : 0;
        const color = getCellColor({ date, count });
        cell.setAttribute("fill", color);
        if (date) {
          cell.setAttribute("data-date", date);
        }
        if ((cell as any).__heatmapEventsAttached) return;
        (cell as any).__heatmapEventsAttached = true;
        const handleMouseEnter = () => {
          const message = getTooltipMessage(
            date || t("common.unknown") || "未知日期",
            count,
          );
          showTooltip(message, cell as any as HTMLElement);
        };
        const handleMouseLeave = () => {
          closeTooltip();
        };
        const handleClick = () => {
          const message = getTooltipMessage(
            date || t("common.unknown") || "未知日期",
            count,
          );
          showTooltip(message, cell as any as HTMLElement);
          setTimeout(() => {
            closeTooltip();
          }, 3000);
        };
        cell.addEventListener("mouseenter", handleMouseEnter);
        cell.addEventListener("mouseleave", handleMouseLeave);
        cell.addEventListener("click", handleClick);
        (cell as any).__handlers = {
          mouseenter: handleMouseEnter,
          mouseleave: handleMouseLeave,
          click: handleClick,
        };
      });
    };
    const timer = setTimeout(() => {
      applyStylesAndEvents();
    }, 200);
    const observer = new MutationObserver(() => {
      applyStylesAndEvents();
    });
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (container) {
        const cells = container.querySelectorAll("rect");
        cells.forEach((cell) => {
          const handlers = (cell as any).__handlers;
          if (handlers) {
            cell.removeEventListener("mouseenter", handlers.mouseenter);
            cell.removeEventListener("mouseleave", handlers.mouseleave);
            cell.removeEventListener("click", handlers.click);
            delete (cell as any).__handlers;
          }
          delete (cell as any).__heatmapEventsAttached;
        });
      }
      closeTooltip();
    };
  }, [finalHeatmapValues, startDate, endDate, dataMap, isExpanded]);
  return (
    <div
      className="bottom-heatmap-panel"
      style={{
        height: isExpanded ? "188px" : "33px",
        flexShrink: 0,
        overflow: "hidden",
        transition: "height 0.3s ease",
        paddingTop: "5px",
      }}
    >
      <div
        className="bottom-heatmap-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="bottom-heatmap-icon" style={{ color: "var(--text-secondary)" }}>
            <FireIcon />
          </span>
          <span className="bottom-heatmap-title">
            {t("scheduled.executionHeatmap") ||
              `全年执行热力图（${currentYear}年）`}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            color: "var(--text-muted)",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-tertiary)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
          <span>{isExpanded ? (t("scheduled.expand") || "展开") : (t("scheduled.collapse") || "收起")}</span>
        </button>
      </div>

      {isExpanded && (
        <>
          <div
            className="bottom-heatmap-wrapper"
            ref={heatmapContainerRef}
            style={{
              flex: 1,
              overflowX: "auto",
              overflowY: "hidden",
              display: "flex",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            {/* @ts-ignore */}
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={finalHeatmapValues}
              showWeekdayLabels={true}
              gutterSize={4}
              monthLabels={[
                t("scheduled.jan") || "1月",
                t("scheduled.feb") || "2月",
                t("scheduled.mar") || "3月",
                t("scheduled.apr") || "4月",
                t("scheduled.may") || "5月",
                t("scheduled.jun") || "6月",
                t("scheduled.jul") || "7月",
                t("scheduled.aug") || "8月",
                t("scheduled.sep") || "9月",
                t("scheduled.oct") || "10月",
                t("scheduled.nov") || "11月",
                t("scheduled.dec") || "12月",
              ]}
            />
          </div>

          <div
            className="bottom-heatmap-legend"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              marginTop: "6px",
            }}
          >
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.less") || "少"}
            </span>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                backgroundColor: "#0e4429",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                backgroundColor: "#006d32",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                backgroundColor: "#26a641",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                backgroundColor: "#39d353",
              }}
            ></div>
            <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.more") || "多"}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default BottomHeatmapPanel;