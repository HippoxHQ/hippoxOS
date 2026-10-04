/**
 * Statistics commands for the UserProfile page.
 */
import { invoke } from "@tauri-apps/api/core";
/** One message-level record in a chat subsystem's statistics ledger. */
export interface ChatStatisticsRecord {
    task_id: string;
    session_id: string;
    subsystem: string;
    role: string;
    source: string;
    provider: string;
    model: string;
    content: string;
    workflow_mode: string;
    input_tokens: number;
    output_tokens: number;
    created_at: number;
}
/** Root structure of one chat subsystem's `statistics.json`. */
export interface ChatStatistics {
    version: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_task_count: number;
    records: ChatStatisticsRecord[];
}
/** Canonical subsystem keys, mirroring the backend SubSystemEnum. */
export type SubsystemKey = "general" | "finance" | "map" | "code_editor" | "video" | "sandbox3d" | "block_chain";
/** Map of subsystem key -> that subsystem's chat statistics ledger. */
export type SubsystemStatisticsMap = Partial<Record<SubsystemKey, ChatStatistics>>;
/** One completed image generation task as recorded in statistics.json. */
export interface GenerateImageTaskRecord {
    task_id: string;
    session_id: string;
    provider: string;
    model?: string | null;
    prompt: string;
    output_tokens: number;
    usage?: any;
    resolution?: string | null;
    file_count?: number;
    file_paths?: string[];
    format?: string | null;
    created_at: number;
    completed_at: number;
}
/** Root structure of the image `statistics.json` file. */
export interface GenerateImageStatistics {
    version: number;
    modality: string;
    total_output_tokens: number;
    total_task_count: number;
    records: GenerateImageTaskRecord[];
}
/** One completed audio generation task as recorded in statistics.json. */
export interface GenerateAudioTaskRecord {
    task_id: string;
    session_id: string;
    provider: string;
    model?: string | null;
    prompt: string;
    output_tokens: number;
    usage?: any;
    duration_seconds?: number | null;
    file_path?: string | null;
    format?: string | null;
    created_at: number;
    completed_at: number;
}
/** Root structure of the audio `statistics.json` file. */
export interface GenerateAudioStatistics {
    version: number;
    modality: string;
    total_output_tokens: number;
    total_task_count: number;
    records: GenerateAudioTaskRecord[];
}
/** One completed video generation task as recorded in statistics.json. */
export interface GenerateVideoTaskRecord {
    task_id: string;
    session_id: string;
    provider: string;
    model?: string | null;
    prompt: string;
    output_tokens: number;
    usage?: any;
    duration_seconds?: number | null;
    resolution?: string | null;
    file_path?: string | null;
    format?: string | null;
    created_at: number;
    completed_at: number;
}
/** Root structure of the video `statistics.json` file. */
export interface GenerateVideoStatistics {
    version: number;
    modality: string;
    total_output_tokens: number;
    total_task_count: number;
    records: GenerateVideoTaskRecord[];
}
/** Bundle of the three media generation statistics ledgers. */
export interface MediaGenerationStatistics {
    image: GenerateImageStatistics | null;
    audio: GenerateAudioStatistics | null;
    video: GenerateVideoStatistics | null;
}
/** Canonical subsystem keys, mirroring the backend SubSystemEnum. */
const SUBSYSTEM_KEYS: SubsystemKey[] = ["general", "finance", "map", "code_editor", "video", "sandbox3d", "block_chain"];
export const statisticsCommands = {
    /**
     * Read the merged statistics ledger across every subsystem.
     */
    getStatistics: async (): Promise<ChatStatistics> => {
        return await invoke<ChatStatistics>("cmd_get_statistics");
    },
    /**
     * Read the statistics ledger of a single subsystem from its own file.
     */
    getStatisticsBySubsystem: async (subsystem: string): Promise<ChatStatistics> => {
        return await invoke<ChatStatistics>("cmd_get_statistics_by_subsystem", { subsystem });
    },
    /**
     * Read the image generation statistics ledger.
     */
    getImageStatistics: async (): Promise<GenerateImageStatistics> => {
        return await invoke<GenerateImageStatistics>("cmd_get_generate_image_statistics");
    },
    /**
     * Read the audio generation statistics ledger.
     */
    getAudioStatistics: async (): Promise<GenerateAudioStatistics> => {
        return await invoke<GenerateAudioStatistics>("cmd_get_generate_audio_statistics");
    },
    /**
     * Read the video generation statistics ledger.
     */
    getVideoStatistics: async (): Promise<GenerateVideoStatistics> => {
        return await invoke<GenerateVideoStatistics>("cmd_get_generate_video_statistics");
    },
    /**
     * Fetch every subsystem's statistics ledger in parallel.
     */
    getSubsystemStatistics: async (): Promise<SubsystemStatisticsMap> => {
        const entries = await Promise.all(
            SUBSYSTEM_KEYS.map(async (subsystem) => {
                try {
                    const stats = await statisticsCommands.getStatisticsBySubsystem(subsystem);
                    return [subsystem, stats] as const;
                } catch (e) {
                    console.warn(`Failed to load statistics for subsystem ${subsystem}:`, e);
                    return [subsystem, null] as const;
                }
            })
        );
        const result: SubsystemStatisticsMap = {};
        for (const [key, value] of entries) {
            if (value) {
                result[key] = value;
            }
        }
        return result;
    },
    /**
     * Fetch the image / audio / video generation statistics ledgers in parallel.
     */
    getMediaGenerationStatistics: async (): Promise<MediaGenerationStatistics> => {
        const [image, audio, video] = await Promise.all([
            statisticsCommands.getImageStatistics().catch((e) => {
                console.warn("Failed to load image statistics:", e);
                return null;
            }),
            statisticsCommands.getAudioStatistics().catch((e) => {
                console.warn("Failed to load audio statistics:", e);
                return null;
            }),
            statisticsCommands.getVideoStatistics().catch((e) => {
                console.warn("Failed to load video statistics:", e);
                return null;
            }),
        ]);
        return { image, audio, video };
    },
};