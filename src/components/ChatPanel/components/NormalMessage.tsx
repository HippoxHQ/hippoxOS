import React from "react";
import { MessageFileGrid } from "./MessageFileGrid";
import { EditMessageForm } from "./EditMessageForm";
import { MessageActions } from "./MessageActions";
import { ChatMessage } from "../../../types/types";

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
  onFileClick,
  formatFileSize,
  t,
}) => {
  return (
    <>
      {isUser && msg.files && msg.files.length > 0 && (
        <MessageFileGrid files={msg.files} onFileClick={onFileClick} formatFileSize={formatFileSize} />
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
        <div className="message-bubble">
          <div className="message-content">{msg.content}</div>
          <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
        </div>
      )}

      <MessageActions
        msg={msg}
        isUser={isUser}
        copyToClipboard={copyToClipboard}
        onLocateTask={onLocateTask}
        onEditMessage={onEditMessage}
        t={t}
      />
    </>
  );
};