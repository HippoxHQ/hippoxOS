import React from "react";

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  message = "Loading..." 
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        gap: "16px",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid var(--border-color, #333)`,
          borderTop: `3px solid var(--accent-color, #00aaff)`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {message && (
        <span
          style={{
            color: "var(--text-secondary, #aaa)",
            fontSize: "13px",
          }}
        >
          {message}
        </span>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};