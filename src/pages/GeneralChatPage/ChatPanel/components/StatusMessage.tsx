import React from "react";
import { ChatMessage, MessageStatus } from "../../../../types/types";

interface StatusMessageProps {
  msg: ChatMessage;
  status: MessageStatus;
  t: (key: string, params?: any) => string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  msg,
  status,
  t,
}) => {
  const getContent = () => {
    switch (status) {
      case MessageStatus.Paused:
        return `⏸️ ${t("terminal.taskPaused")}`;
      case MessageStatus.Cancelled:
        return `❌ ${t("terminal.cancelled")}`;
      case MessageStatus.Failed:
        return `❌ ${msg.content || t("terminal.failed")}`;
      default:
        return msg.content;
    }
  };

  return (
    <div className="message-bubble">
      <div className="message-content">{getContent()}</div>
      <div className="message-time">
        {new Date(msg.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};
