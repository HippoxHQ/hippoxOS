import React from "react";
import { LocateIcon, CopyIcon, EditIcon2, ResendIcon } from "../../../../icons";
import { ChatMessage } from "../../../../types/types";

interface MessageActionsProps {
  msg: ChatMessage;
  isUser: boolean;
  copyToClipboard: (text: string | undefined) => void;
  onLocateTask: (msg: ChatMessage) => void;
  onEditMessage?: (msg: ChatMessage) => void;
  onResendMessage?: (msg: ChatMessage) => void;
  t: (key: string, params?: any) => string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  msg,
  isUser,
  copyToClipboard,
  onLocateTask,
  onEditMessage,
  onResendMessage,
  t,
}) => {
  if (isUser) {
    return (
      <div
        className="message-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          justifyContent: "flex-end",
          marginTop: "4px",
        }}
      >
        <button
          className="action-btn locate-btn"
          onClick={() => onLocateTask(msg)}
          title={t("chat.locateInTerminal") || "Locate In Terminal"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <LocateIcon />
        </button>
        <button
          className="action-btn copy-btn"
          onClick={() => copyToClipboard(msg.content)}
          title={t("common.copy") || "Copy"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <CopyIcon size={12} />
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEditMessage?.(msg)}
          title={t("chat.edit") || "Edit"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <EditIcon2 size={14} />
        </button>
        <button
          className="action-btn resend-btn"
          onClick={() => onResendMessage?.(msg)}
          title={t("chat.resend") || "Resend"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <ResendIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="message-actions"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        justifyContent: "flex-start",
        marginTop: "4px",
      }}
    >
      <button
        className="action-btn copy-btn"
        onClick={() => copyToClipboard(msg.content)}
        title={t("common.copy") || "Copy"}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: "4px",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          fontSize: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <CopyIcon size={12} />
      </button>
      <button
        className="action-btn locate-btn"
        onClick={() => onLocateTask(msg)}
        title={t("chat.locateInTerminal") || "Locate In Terminal"}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: "4px",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          fontSize: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <LocateIcon />
      </button>
    </div>
  );
};
