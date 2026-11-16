/**
 * Window events used by the office assistant.
 */
export const OFFICE_WINDOW_EVENTS = {
    /**
     * Fired when the user selects a conversation turn in the overview panel.
     * Payload: { sessionId, turnId }.
     */
    SELECT_CONVERSATION: "office:select-conversation",
} as const;
/**
 * Payload carried by the select-conversation event.
 */
export interface OfficeSelectConversationEventPayload {
    /** Session id that owns the conversation. */
    sessionId: string;
    /** Conversation turn id that was selected. */
    turnId: string;
}
/**
 * Dispatch the select-conversation event.
 *
 * @param sessionId - The session id that owns the conversation.
 * @param turnId - The selected conversation turn id.
 */
export const dispatchOfficeSelectConversation = (sessionId: string, turnId: string) => {
    window.dispatchEvent(
        new CustomEvent(OFFICE_WINDOW_EVENTS.SELECT_CONVERSATION, {
            detail: { sessionId, turnId } as OfficeSelectConversationEventPayload,
        }),
    );
};
/**
 * Register a listener for the select-conversation event.
 *
 * @param callback - Invoked with the event payload.
 * @returns A cleanup function to remove the listener.
 */
export const onOfficeSelectConversation = (callback: (event: CustomEvent<OfficeSelectConversationEventPayload>) => void) => {
    window.addEventListener(OFFICE_WINDOW_EVENTS.SELECT_CONVERSATION, callback as EventListener);
    return () => window.removeEventListener(OFFICE_WINDOW_EVENTS.SELECT_CONVERSATION, callback as EventListener);
};