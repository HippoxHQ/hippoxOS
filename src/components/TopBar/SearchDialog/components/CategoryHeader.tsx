import React from "react";

interface CategoryHeaderProps {
  icon: string;
  label: string;
  count: number;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  icon,
  label,
  count,
}) => {
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
      <span>
        <span>{icon}</span>
        <span style={{ marginLeft: "8px" }}>{label}</span>
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