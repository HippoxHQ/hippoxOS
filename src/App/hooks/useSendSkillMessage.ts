import { useCallback } from "react";
import { UploadFile } from "../../core/types";
interface UseSendSkillMessageParams {
    currentSessionId: string;
    currentContentPanel: any;
    closeContentPanel: () => void;
    handleNewSession: () => void;
    handleSendMessage: (message: string, sessionId: string, files?: UploadFile[]) => void;
    shouldShowWelcome: () => boolean;
}
export const useSendSkillMessage = ({
    currentSessionId,
    currentContentPanel,
    closeContentPanel,
    handleNewSession,
    handleSendMessage,
    shouldShowWelcome,
}: UseSendSkillMessageParams) => {
    const onSendSkillMessage = useCallback(
        (message: string, files?: UploadFile[], sessionId?: string) => {
            closeContentPanel();
            if (sessionId) {
                const pendingId = `pending_${Date.now()}`;
                handleSendMessage(message, pendingId, files);
                return;
            }
            if (!currentSessionId || currentSessionId.startsWith("pending_")) {
                handleNewSession();
                setTimeout(() => {
                    handleSendMessage(message, currentSessionId, files);
                }, 200);
            } else {
                handleSendMessage(message, currentSessionId, files);
            }
        },
        [
            currentSessionId,
            closeContentPanel,
            handleNewSession,
            handleSendMessage,
        ],
    );
    return { onSendSkillMessage };
};