import React from "react";
import { MessageFileGrid } from "./MessageFileGrid";
import { EditMessageForm } from "./EditMessageForm";
import { MessageActions } from "./MessageActions";
import { ChatMessage } from "../../../../types/types";

interface NormalMessageProps {
  msg: ChatMessage;
  isUser: boolean;
  editingMessageId: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onSaveEdit: (msg: ChatMessage) => void;
  onCancelEdit: () => void;
  copyToClipboard: (text: string | undefined) => void;
  onLocateTask: (msg: ChatMessage) => void;
  onEditMessage: (msg: ChatMessage) => void;
  onResendMessage?: (msg: ChatMessage) => void;
  onFileClick?: (file: any) => void;
  formatFileSize: (bytes: number) => string;
  t: (key: string, params?: any) => string;
}

export const NormalMessage: React.FC<NormalMessageProps> = ({
  msg,
  isUser,
  editingMessageId,
  editContent,
  setEditContent,
  onSaveEdit,
  onCancelEdit,
  copyToClipboard,
  onLocateTask,
  onEditMessage,
  onResendMessage,
  onFileClick,
  formatFileSize,
  t,
}) => {
  return (
    <>
      {isUser && msg.files && msg.files.length > 0 && (
        <MessageFileGrid
          files={msg.files}
          onFileClick={onFileClick}
          formatFileSize={formatFileSize}
        />
      )}

      {editingMessageId === msg.id ? (
        <EditMessageForm
          editContent={editContent}
          setEditContent={setEditContent}
          onSave={() => onSaveEdit(msg)}
          onCancel={onCancelEdit}
          t={t}
        />
      ) : (
        <div
          className="message-bubble"
          style={{
            padding: "10px 14px",
            borderRadius: "18px",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            maxWidth: "100%",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          <div
            className="message-content"
            style={{
              fontSize: "14px",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%",
            }}
          >
            {msg.content}
          </div>
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      <MessageActions
        msg={msg}
        isUser={isUser}
        copyToClipboard={copyToClipboard}
        onLocateTask={onLocateTask}
        onEditMessage={onEditMessage}
        onResendMessage={onResendMessage}
        t={t}
      />
    </>
  );
};
