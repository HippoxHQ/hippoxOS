import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
export interface WaveformData {
    rms: number;
}
export type WaveformCallback = (data: WaveformData) => void;
class AudioEventManager {
    private unlistenWaveform: UnlistenFn | null = null;
    private waveformCallbacks: Set<WaveformCallback> = new Set();
    private isListening = false;
    /**
     * Start listening to audio waveform events
     */
    async startListening(): Promise<void> {
        if (this.isListening) {
            return;
        }
        try {
            this.unlistenWaveform = await listen<WaveformData>(
                "audio:waveform-data",
                (event) => {
                    const data = event.payload;
                    this.waveformCallbacks.forEach((callback) => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error("[Audio] Waveform callback error:", error);
                        }
                    });
                }
            );
            this.isListening = true;
            console.log("[Audio] Waveform listening started");
        } catch (error) {
            console.error("[Audio] Failed to start waveform listening:", error);
            throw error;
        }
    }
    /**
     * Stop listening to audio waveform events
     */
    async stopListening(): Promise<void> {
        if (this.unlistenWaveform) {
            this.unlistenWaveform();
            this.unlistenWaveform = null;
        }
        this.isListening = false;
        this.waveformCallbacks.clear();
        console.log("[Audio] Waveform listening stopped");
    }
    /**
     * Subscribe to waveform data updates
     * @param callback - Function to call when waveform data is received
     * @returns Unsubscribe function
     */
    onWaveformData(callback: WaveformCallback): () => void {
        this.waveformCallbacks.add(callback);
        // Auto-start listening if not already started
        if (!this.isListening) {
            this.startListening().catch((error) => {
                console.error("[Audio] Failed to auto-start waveform listening:", error);
            });
        }
        return () => {
            this.waveformCallbacks.delete(callback);
            // If no callbacks left, stop listening
            if (this.waveformCallbacks.size === 0) {
                this.stopListening().catch((error) => {
                    console.error("[Audio] Failed to stop waveform listening:", error);
                });
            }
        };
    }
    /**
     * Check if currently listening to waveform events
     */
    isWaveformListening(): boolean {
        return this.isListening;
    }
    /**
     * Get the number of active waveform callbacks
     */
    getWaveformCallbackCount(): number {
        return this.waveformCallbacks.size;
    }
}
// Singleton instance
export const audioEventManager = new AudioEventManager();
/**
 * React hook for using waveform data in components
 * @param initialValues - Initial waveform levels array
 * @returns Current waveform levels array
 */
// Audio.ts - useWaveformData
export function useWaveformData(
    initialValues: number[] = Array(10).fill(0),
    enabled: boolean = true
): number[] {
    const [levels, setLevels] = useState<number[]>(initialValues);
    const counterRef = useRef(0);
    useEffect(() => {
        if (!enabled) {
            setLevels(initialValues);
            counterRef.current = 0;
            return;
        }
        let isMounted = true;
        const callback = (data: WaveformData) => {
            if (!isMounted) return;
            const total = initialValues.length;
            counterRef.current = (counterRef.current + 1) % 20;
            const isUp = counterRef.current < 10;
            const base = isUp ? 0.3 + (counterRef.current / 20) * 0.6 : 0.9 - (counterRef.current / 20) * 0.6;
            const randomFactor = 0.85 + Math.random() * 0.3;
            const finalValue = Math.max(0.05, Math.min(0.9, base * randomFactor));
            const filledCount = Math.round(finalValue * total);
            const newLevels = Array.from({ length: total }, (_, i) => {
                return i < filledCount ? 1 : 0;
            });
            setLevels(newLevels);
        };
        const unsubscribe = audioEventManager.onWaveformData(callback);
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [initialValues.length, enabled]);
    return levels;
}