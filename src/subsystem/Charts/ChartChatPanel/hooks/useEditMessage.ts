import { useState } from "react";
import { showToast, ToastType } from "../../../../components/Toast";
import { taskManager } from "../../../../core/TaskManager";
import { SessionDomain, UploadFile } from "../../../../core/types";
import { ChatMessage } from "../../../../types/types";

interface UseEditMessageProps {
  currentSessionId?: string;
  onSendMessage: (message: string, sessionId: string, files?: UploadFile[]) => void | Promise<void>;
  t: (key: string, params?: any) => string;
}

export const useEditMessage = ({ currentSessionId, onSendMessage, t }: UseEditMessageProps) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const handleEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };
  const handleSaveEdit = async (msg: ChatMessage) => {
    if (!editContent.trim() && !(msg.files && msg.files.length > 0)) {
      showToast(ToastType.ERROR, t("chat.editFailed") || "Edit failed");
      return;
    }
    const sessionId = currentSessionId || "";
    const currentFiles = msg.files || [];
    const editedMessage: ChatMessage = {
      ...msg,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: editContent,
      timestamp: new Date().toISOString(),
      edited: true,
      originalId: msg.id,
    };
    taskManager.addUserMessageToSession(sessionId, editedMessage, SessionDomain.Chart);
    let backendMessage = editContent;
    if (currentFiles.length > 0) {
      const fileInfo = currentFiles.map((f) => `[📎 ${f.name}]`).join("\n");
      backendMessage = editContent ? `${editContent}\n${fileInfo}` : fileInfo;
    }
    onSendMessage(backendMessage, sessionId, currentFiles);
    setEditingMessageId(null);
    setEditContent("");
    showToast(ToastType.SUCCESS, t("chat.editSuccess") || "Message resent");
  };
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };
  return {
    editingMessageId,
    editContent,
    setEditContent,
    handleEditMessage,
    handleSaveEdit,
    handleCancelEdit,
  };
};