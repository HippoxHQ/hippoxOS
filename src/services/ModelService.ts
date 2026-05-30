import { configCommands } from '../api/config';
import { LlmInstance } from '../api/llm';

export interface ModelStatus {
    instanceId: string;
    name: string;
    status: 'online' | 'offline' | 'unknown';
    tokenUsage: {
        used: number;
        limit: number;
        percentage: number;
    };
    lastCheck: string;
    error?: string;
}

class ModelService {
    private modelStatuses: Map<string, ModelStatus> = new Map();
    private listeners: Set<(statuses: Map<string, ModelStatus>) => void> = new Set();
    private checkInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startHealthCheck();
    }

    async startHealthCheck(intervalMs: number = 60000) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        await this.checkAllModels();
        this.checkInterval = setInterval(() => this.checkAllModels(), intervalMs);
    }

    stopHealthCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkAllModels() {
        try {
            const instances = await configCommands.getLlmInstances();
            const instancesList = Object.values(instances);

            for (const instance of instancesList) {
                await this.checkModelStatus(instance);
            }

            this.notifyListeners();
        } catch (error) {
            console.error('Failed to check models:', error);
        }
    }

    private async checkModelStatus(instance: LlmInstance) {
        const status: ModelStatus = {
            instanceId: instance.id,
            name: instance.name,
            status: 'unknown',
            tokenUsage: { used: 0, limit: 100000, percentage: 0 },
            lastCheck: new Date().toISOString(),
        };

        try {
            const isOnline = await this.pingModel(instance);
            status.status = isOnline ? 'online' : 'offline';

            const tokenUsage = await this.getTokenUsage(instance);
            if (tokenUsage) {
                status.tokenUsage = tokenUsage;
            }
        } catch (error) {
            status.status = 'offline';
            status.error = error instanceof Error ? error.message : 'Unknown error';
        }

        this.modelStatuses.set(instance.id, status);
    }

    private async pingModel(instance: LlmInstance): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${instance.api_base}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${instance.api_key}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error(`Ping failed for ${instance.name}:`, error);
            return false;
        }
    }

    private async getTokenUsage(instance: LlmInstance): Promise<{ used: number; limit: number; percentage: number } | null> {
        const key = `token_usage_${instance.id}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
            }
        }
        const used = Math.floor(Math.random() * 50000);
        const limit = 100000;
        return {
            used,
            limit,
            percentage: (used / limit) * 100,
        };
    }

    async updateTokenUsage(instanceId: string, used: number, limit: number) {
        const status = this.modelStatuses.get(instanceId);
        if (status) {
            status.tokenUsage = {
                used,
                limit,
                percentage: (used / limit) * 100,
            };
            status.lastCheck = new Date().toISOString();

            localStorage.setItem(`token_usage_${instanceId}`, JSON.stringify(status.tokenUsage));
            this.notifyListeners();
        }
    }

    getModelStatus(instanceId: string): ModelStatus | undefined {
        return this.modelStatuses.get(instanceId);
    }

    getAllModelStatuses(): Map<string, ModelStatus> {
        return new Map(this.modelStatuses);
    }

    subscribe(listener: (statuses: Map<string, ModelStatus>) => void): () => void {
        this.listeners.add(listener);
        listener(this.modelStatuses);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.modelStatuses));
    }
}

export const modelService = new ModelService();