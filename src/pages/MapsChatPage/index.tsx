import React from "react";

interface MapsPageProps {
  t: (key: string) => string;
}

const MapsPage: React.FC<MapsPageProps> = ({ t }) => {
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
      🗺️ Hello World - Maps Page
    </div>
  );
};

export default MapsPage;
