import React from "react";
interface EditMessageFormProps {
  editContent: string;
  setEditContent: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}
export const EditMessageForm: React.FC<EditMessageFormProps> = ({ editContent, setEditContent, onSave, onCancel, t }) => {
  return (
    <div className="message-bubble" style={{ padding: "8px", background: "var(--bg-tertiary)" }}>
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        style={{
          width: "100%",
          minWidth: "280px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          padding: "8px 12px",
          fontSize: "14px",
          lineHeight: "1.5",
          resize: "vertical",
          fontFamily: "inherit",
        }}
        autoFocus
      />
      <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
        <button className="action-btn" onClick={onSave} style={{ background: "var(--accent-color)", color: "white" }}>
          {t("chat.saveEdit") || "Save"}
        </button>
        <button className="action-btn" onClick={onCancel}>
          {t("chat.cancelEdit") || "Cancel"}
        </button>
      </div>
    </div>
  );
};
