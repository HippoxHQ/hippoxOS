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
      <div className="message-actions">
        <button
          className="action-btn locate-btn"
          onClick={() => onLocateTask(msg)}
          title={t("chat.locateInTerminal") || "Locate In Terminal"}
        >
          <LocateIcon />
        </button>
        <button
          className="action-btn copy-btn"
          onClick={() => copyToClipboard(msg.content)}
          title={t("common.copy") || "Copy"}
        >
          <CopyIcon size={12} />
        </button>
        <button
          className="action-btn edit-btn"
          onClick={() => onEditMessage?.(msg)}
          title={t("chat.edit") || "Edit"}
        >
          <EditIcon2 size={14} />
        </button>
        <button
          className="action-btn resend-btn"
          onClick={() => onResendMessage?.(msg)}
          title={t("chat.resend") || "Resend"}
        >
          <ResendIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="message-actions" style={{ justifyContent: "flex-start" }}>
      <button
        className="action-btn copy-btn"
        onClick={() => copyToClipboard(msg.content)}
        title={t("common.copy") || "Copy"}
      >
        <CopyIcon size={12} />
      </button>
      <button
        className="action-btn locate-btn"
        onClick={() => onLocateTask(msg)}
        title={t("chat.locateInTerminal") || "Locate In Terminal"}
      >
        <LocateIcon />
      </button>
    </div>
  );
};
