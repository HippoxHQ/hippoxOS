import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
export interface EffectProgressData {
    session_id: string;
    track_id: string;
    track_block_id: string;
    progress: number; // 0-100
    status: "processing" | "completed" | "failed";
    message?: string | null;
}
export type EffectProgressCallback = (data: EffectProgressData) => void;
class EffectEventManager {
    private unlistenMap: Map<string, UnlistenFn> = new Map();
    private callbacks: Map<string, Set<EffectProgressCallback>> = new Map();
    private isListening: Set<string> = new Set();
    private getEventKey(sessionId: string, trackId: string, trackBlockId: string, effectType: string): string {
        return `effects_progress_${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
    }
    async startListening(
        sessionId: string,
        trackId: string,
        trackBlockId: string,
        effectType: string
    ): Promise<void> {
        const eventKey = this.getEventKey(sessionId, trackId, trackBlockId, effectType);
        const listenerId = `${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
        if (this.isListening.has(listenerId)) {
            return;
        }
        try {
            const unlisten = await listen<EffectProgressData>(eventKey, (event) => {
                const data = event.payload;
                const callbacks = this.callbacks.get(listenerId);
                if (callbacks) {
                    callbacks.forEach((callback) => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error(`[EffectEvents] Callback error for ${eventKey}:`, error);
                        }
                    });
                }
            });
            this.unlistenMap.set(listenerId, unlisten);
            this.isListening.add(listenerId);
            console.log(`[EffectEvents] Listening started: ${eventKey}`);
        } catch (error) {
            console.error(`[EffectEvents] Failed to start listening for ${eventKey}:`, error);
            throw error;
        }
    }
    async stopListening(
        sessionId: string,
        trackId: string,
        trackBlockId: string,
        effectType: string
    ): Promise<void> {
        const listenerId = `${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
        const unlisten = this.unlistenMap.get(listenerId);
        if (unlisten) {
            unlisten();
            this.unlistenMap.delete(listenerId);
        }
        this.isListening.delete(listenerId);
        this.callbacks.delete(listenerId);
        console.log(`[EffectEvents] Listening stopped: ${listenerId}`);
    }
    async stopAllListening(): Promise<void> {
        const entries = Array.from(this.unlistenMap.entries());
        for (const [listenerId, unlisten] of entries) {
            unlisten();
            this.unlistenMap.delete(listenerId);
            this.isListening.delete(listenerId);
            this.callbacks.delete(listenerId);
        }
        console.log("[EffectEvents] All listening stopped");
    }
    onEffectProgress(
        sessionId: string,
        trackId: string,
        trackBlockId: string,
        effectType: string,
        callback: EffectProgressCallback
    ): () => void {
        const listenerId = `${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
        if (!this.callbacks.has(listenerId)) {
            this.callbacks.set(listenerId, new Set());
        }
        this.callbacks.get(listenerId)!.add(callback);
        if (!this.isListening.has(listenerId)) {
            this.startListening(sessionId, trackId, trackBlockId, effectType).catch((error) => {
                console.error("[EffectEvents] Failed to auto-start listening:", error);
            });
        }
        return () => {
            const callbacks = this.callbacks.get(listenerId);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.callbacks.delete(listenerId);
                    this.stopListening(sessionId, trackId, trackBlockId, effectType).catch((error) => {
                        console.error("[EffectEvents] Failed to stop listening:", error);
                    });
                }
            }
        };
    }
    isEffectListening(
        sessionId: string,
        trackId: string,
        trackBlockId: string,
        effectType: string
    ): boolean {
        const listenerId = `${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
        return this.isListening.has(listenerId);
    }
    getCallbackCount(
        sessionId: string,
        trackId: string,
        trackBlockId: string,
        effectType: string
    ): number {
        const listenerId = `${sessionId}_${trackId}_${trackBlockId}_${effectType}`;
        const callbacks = this.callbacks.get(listenerId);
        return callbacks ? callbacks.size : 0;
    }
}
export const effectEventManager = new EffectEventManager();
export function useEffectProgress(
    sessionId: string,
    trackId: string,
    trackBlockId: string,
    effectType: string,
    enabled: boolean = true
): EffectProgressData | null {
    const [progressData, setProgressData] = useState<EffectProgressData | null>(null);
    useEffect(() => {
        if (!enabled) {
            setProgressData(null);
            return;
        }
        let isMounted = true;
        const callback = (data: EffectProgressData) => {
            if (!isMounted) return;
            setProgressData(data);
        };
        const unsubscribe = effectEventManager.onEffectProgress(
            sessionId,
            trackId,
            trackBlockId,
            effectType,
            callback
        );
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [sessionId, trackId, trackBlockId, effectType, enabled]);
    return progressData;
}