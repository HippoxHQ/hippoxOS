import { invoke } from "@tauri-apps/api/core";
/**
 * GIF export options for 3D sandbox
 */
export interface Sandbox3DGifOptions {
    /** Duration in seconds */
    duration: number;
    /** Frames per second */
    fps: number;
    /** Quality percentage (30-100) */
    quality: number;
}
export const sandbox3dExportCommands = {
    /**
     * Upload GIF for a specific 3D sandbox session and task
     * Saves to: HippoX/SandBox3DDialogHistory/{session_id}/exports/{task_id}.gif
     *
     * @param sessionId - The session identifier
     * @param taskId - The task identifier
     * @param gifData - GIF data as Uint8Array
     * @returns FileOperationResult with success status and path
     */
    async uploadSandbox3dGif(
        sessionId: string,
        taskId: string,
        gifData: Uint8Array
    ): Promise<{ success: boolean; message: string; path: string | null }> {
        return await invoke("cmd_upload_sandbox3d_gif", {
            sessionId,
            taskId,
            gifData,
        });
    },
    /**
     * Get GIF for a specific 3D sandbox session and task
     * Returns the GIF data as Uint8Array, or null if not found
     *
     * @param sessionId - The session identifier
     * @param taskId - The task identifier
     * @returns GIF data as Uint8Array or null
     */
    async getSandbox3dGif(
        sessionId: string,
        taskId: string
    ): Promise<Uint8Array | null> {
        const result = await invoke<number[] | null>("cmd_get_sandbox3d_gif", {
            sessionId,
            taskId,
        });
        if (!result) return null;
        return new Uint8Array(result);
    },
    /**
     * Check if GIF exists for a specific 3D sandbox session and task
     *
     * @param sessionId - The session identifier
     * @param taskId - The task identifier
     * @returns true if GIF exists
     */
    async checkSandbox3dGifExists(
        sessionId: string,
        taskId: string
    ): Promise<boolean> {
        return await invoke("cmd_check_sandbox3d_gif_exists", {
            sessionId,
            taskId,
        });
    },
    /**
     * Delete GIF for a specific 3D sandbox session and task
     *
     * @param sessionId - The session identifier
     * @param taskId - The task identifier
     * @returns FileOperationResult with success status
     */
    async deleteSandbox3dGif(
        sessionId: string,
        taskId: string
    ): Promise<{ success: boolean; message: string; path: string | null }> {
        return await invoke("cmd_delete_sandbox3d_gif", {
            sessionId,
            taskId,
        });
    },
    /**
    * Get GIF file path for a specific 3D sandbox session and task
    * Returns the full file path if exists, otherwise returns null
    */
    async getSandbox3dGifPath(
        sessionId: string,
        taskId: string
    ): Promise<string | null> {
        return await invoke<string | null>("cmd_get_sandbox3d_gif_path", {
            sessionId,
            taskId,
        });
    },
    /**
    * Register a 3D material for the scene
    * Saves material data to: HippoX/SandBox3DDialogHistory/{session_id}/materials/{task_id}.json
    *
    * @param sessionId - The session identifier
    * @param taskId - The task identifier (used as material ID)
    * @returns FileOperationResult with success status and path
    */
    async register3dMaterial(
        sessionId: string,
        taskId: string
    ): Promise<{ success: boolean; message: string; path: string | null }> {
        return await invoke("cmd_register_3d_material", {
            sessionId,
            taskId,
        });
    },
};