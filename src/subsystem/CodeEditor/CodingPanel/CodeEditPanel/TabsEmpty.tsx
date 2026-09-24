import React from "react";
interface TabsEmptyProps {
  t?: (key: string) => string;
}
const TabsEmpty: React.FC<TabsEmptyProps> = ({ t }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        color: "var(--text-secondary)",
        userSelect: "none",
        padding: "40px",
        gap: "16px",
        zIndex: 10,
      }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.15 }}>
        <rect x="12" y="8" width="48" height="56" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <rect x="12" y="8" width="36" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <path d="M48 28H60V64H12V28H48Z" stroke="currentColor" strokeWidth="2.5" />
        <path d="M20 20H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 40H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 50H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M36 14V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="36" cy="36" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" opacity="0.4" />
      </svg>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 500,
          color: "var(--text-primary)",
          letterSpacing: "0.3px",
        }}
      >
        {t ? t("codeEditor.noTabs") : "No files open"}
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          textAlign: "center",
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        {t ? t("codeEditor.openFileHint") : "Open a file from the file tree to start editing"}
      </div>
      <div
        style={{
          width: "40px",
          height: "2px",
          background: "var(--border-color)",
          borderRadius: "1px",
          marginTop: "8px",
          opacity: 0.5,
        }}
      />
    </div>
  );
};
export default TabsEmpty;
