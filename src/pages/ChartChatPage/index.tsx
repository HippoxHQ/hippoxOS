import React from "react";

interface ChartPageProps {
  t: (key: string) => string;
}

const ChartPage: React.FC<ChartPageProps> = ({ t }) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontSize: "24px",
        fontWeight: 500,
      }}
    >
      📊 Hello World - Chart Page
    </div>
  );
};

export default ChartPage;
