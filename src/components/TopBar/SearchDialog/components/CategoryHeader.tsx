import React from "react";
interface CategoryHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
}
/**
 * Category header component for search results
 */
export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ icon, label, count }) => {
  return (
    <div
      style={{
        padding: "6px 12px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-muted)",
        background: "var(--bg-primary)",
        letterSpacing: "0.5px",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ display: "flex", alignItems: "center", width: "16px", height: "16px" }}>{icon}</span>
        <span>{label}</span>
      </span>
      <span
        style={{
          fontSize: "10px",
          background: "var(--bg-tertiary)",
          padding: "2px 6px",
          borderRadius: "10px",
        }}
      >
        {count}
      </span>
    </div>
  );
};
