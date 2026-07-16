import React from "react";
import { formatLocalDate } from "../pages/UserProfilePage/utils";
interface HeatmapProps {
  data: any[];
  t: (key: string, params?: any) => string;
}
const Heatmap: React.FC<HeatmapProps> = ({ data, t }) => {
  const dataMap = new Map(data.map((d) => [d.date, d.count]));
  const year = new Date().getFullYear();
  const firstDay = new Date(year, 0, 1);
  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const allDays: { date: Date; count: number; month: number; dateStr: string }[] = [];
  for (let i = 0; i < daysInYear; i++) {
    const date = new Date(year, 0, i + 1);
    const dateStr = formatLocalDate(date);
    allDays.push({
      date,
      count: dataMap.get(dateStr) || 0,
      month: date.getMonth(),
      dateStr,
    });
  }
  const weeks: { date: Date; count: number; month: number; dateStr: string }[][] = [];
  let currentWeek: { date: Date; count: number; month: number; dateStr: string }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const emptyDate = new Date(year, 0, -startWeekday + i);
    currentWeek.push({
      date: emptyDate,
      count: 0,
      month: -1,
      dateStr: formatLocalDate(emptyDate),
    });
  }
  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      const emptyDate = new Date(year, 11, 32);
      currentWeek.push({
        date: emptyDate,
        count: 0,
        month: -1,
        dateStr: formatLocalDate(emptyDate),
      });
    }
    weeks.push(currentWeek);
  }
  const getColor = (count: number) => {
    if (count === 0) return "var(--bg-tertiary)";
    if (count <= 3) return "#0e4429";
    if (count <= 7) return "#006d32";
    if (count <= 12) return "#26a641";
    return "#39d353";
  };
  const weekdays = [
    t("user.monday") || "一",
    t("user.tuesday") || "二",
    t("user.wednesday") || "三",
    t("user.thursday") || "四",
    t("user.friday") || "五",
    t("user.saturday") || "六",
    t("user.sunday") || "日",
  ];
  const monthColumns: { name: string; startCol: number; endCol: number }[] = [];
  let currentMonth = -1;
  let monthStartCol = 0;
  for (let col = 0; col < weeks.length; col++) {
    const week = weeks[col];
    let weekMonth = -1;
    for (const day of week) {
      if (day.month >= 0 && day.month <= 11) {
        weekMonth = day.month;
        break;
      }
    }
    if (weekMonth !== currentMonth) {
      if (currentMonth !== -1) {
        monthColumns.push({
          name: `${currentMonth + 1}${t("user.monthUnit") || "月"}`,
          startCol: monthStartCol,
          endCol: col - 1,
        });
      }
      currentMonth = weekMonth;
      monthStartCol = col;
    }
  }
  if (currentMonth !== -1) {
    monthColumns.push({
      name: `${currentMonth + 1}${t("user.monthUnit") || "月"}`,
      startCol: monthStartCol,
      endCol: weeks.length - 1,
    });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", marginLeft: "32px", gap: "2px" }}>
        {monthColumns.map((month, idx) => (
          <div
            key={idx}
            style={{
              fontSize: "10px",
              color: "var(--text-secondary)",
              textAlign: "center",
              width: `${(month.endCol - month.startCol + 1) * 16}px`,
            }}
          >
            {month.name}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "32px" }}>
          {weekdays.map((day, idx) => (
            <div
              key={idx}
              style={{
                height: "14px",
                fontSize: "9px",
                color: "var(--text-muted)",
                textAlign: "right",
                paddingRight: "6px",
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "2px", overflowX: "auto" }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor: getColor(day.count),
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                  title={`${day.dateStr}: ${day.count} ${t("user.times") || "次"}${t("user.activity") || "活动"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
          marginTop: "8px",
          marginRight: "8px",
        }}
      >
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t("user.heatmapLess") || "少"}</span>
        <div style={{ width: "14px", height: "14px", backgroundColor: "var(--bg-tertiary)", borderRadius: "2px" }} />
        <div style={{ width: "14px", height: "14px", backgroundColor: "#0e4429", borderRadius: "2px" }} />
        <div style={{ width: "14px", height: "14px", backgroundColor: "#006d32", borderRadius: "2px" }} />
        <div style={{ width: "14px", height: "14px", backgroundColor: "#26a641", borderRadius: "2px" }} />
        <div style={{ width: "14px", height: "14px", backgroundColor: "#39d353", borderRadius: "2px" }} />
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{t("user.heatmapMore") || "多"}</span>
      </div>
    </div>
  );
};
export default Heatmap;
