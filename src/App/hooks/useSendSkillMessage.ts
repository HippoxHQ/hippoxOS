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
        (message: string, files?: UploadFile[]) => {
            closeContentPanel();
            if (!currentSessionId || currentSessionId.startsWith("pending_")) {
                handleNewSession();
            }
            setTimeout(() => {
                handleSendMessage(message, currentSessionId, files);
            }, 200);
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