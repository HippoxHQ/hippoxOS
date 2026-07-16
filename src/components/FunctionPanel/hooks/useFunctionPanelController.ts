import { useState, useCallback, useRef, useEffect } from "react";
import { UploadFile } from "../../../core/types";
export interface FunctionPanelItem {
    id: string;
    type: "preview" | "map" | "chart";
    data: any;
    title: string;
    icon: string;
}
export interface FunctionPanelController {
    isOpen: boolean;
    items: FunctionPanelItem[];
    activeItemId: string | null;
    openPreview: (file: UploadFile) => void;
    openMap: (mapData: any, taskId?: string) => void;
    openChart: (chartData: any, taskId?: string) => void;
    closePanel: () => void;
    closeItem: (itemId: string) => void;
    switchTo: (itemId: string) => void;
    clearAll: () => void;
    getActiveItem: () => FunctionPanelItem | undefined;
}
export function useFunctionPanelController(): FunctionPanelController {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<FunctionPanelItem[]>([]);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const itemCounter = useRef(0);
    const generateId = () => `fp_${++itemCounter.current}_${Date.now()}`;
    const getActiveItem = useCallback(() => {
        return items.find(item => item.id === activeItemId);
    }, [items, activeItemId]);
    const addItem = useCallback((item: Omit<FunctionPanelItem, "id">) => {
        const id = generateId();
        setItems(prev => {
            const existingIndex = prev.findIndex(existing => {
                if (existing.type !== item.type) return false;
                if (item.type === "preview") {
                    const fileId = item.data?.id || item.data?.path || item.data?.name;
                    const existingFileId = existing.data?.id || existing.data?.path || existing.data?.name;
                    return fileId === existingFileId;
                }
                if (item.type === "map" || item.type === "chart") {
                    return existing.data?.taskId === item.data?.taskId;
                }
                return false;
            });
            if (existingIndex !== -1) {
                const newItems = [...prev];
                newItems[existingIndex] = { ...newItems[existingIndex], data: item.data };
                return newItems;
            }
            return [...prev, { ...item, id }];
        });
        setActiveItemId(id);
        setIsOpen(true);
        return id;
    }, []);
    const openPreview = useCallback((file: UploadFile) => {
        if (!file) return;
        const fileId = file.id || file.path || file.name;
        const existing = items.find(
            item => item.type === "preview" && (item.data?.id || item.data?.path || item.data?.name) === fileId
        );
        if (existing) {
            setActiveItemId(existing.id);
            setIsOpen(true);
            return;
        }
        addItem({
            type: "preview",
            data: file,
            title: file.name || "Preview",
            icon: "📄",
        });
    }, [items, addItem]);
    const openMap = useCallback((mapData: any, taskId?: string) => {
        if (!mapData && !taskId) return;
        const id = taskId || "default";
        const existing = items.find(
            item => item.type === "map" && item.data?.taskId === id
        );
        if (existing) {
            setItems(prev => prev.map(item =>
                item.id === existing.id ? { ...item, data: { mapData, taskId: id } } : item
            ));
            setActiveItemId(existing.id);
            setIsOpen(true);
            return;
        }
        addItem({
            type: "map",
            data: { mapData, taskId: id },
            title: `Map ${taskId ? `(${taskId.slice(-6)})` : ""}`,
            icon: "🗺️",
        });
    }, [items, addItem]);
    const openChart = useCallback((chartData: any, taskId?: string) => {
        if (!chartData && !taskId) return;
        const id = taskId || "default";
        const existing = items.find(
            item => item.type === "chart" && item.data?.taskId === id
        );
        if (existing) {
            setItems(prev => prev.map(item =>
                item.id === existing.id ? { ...item, data: { chartData, taskId: id } } : item
            ));
            setActiveItemId(existing.id);
            setIsOpen(true);
            return;
        }
        addItem({
            type: "chart",
            data: { chartData, taskId: id },
            title: `Chart ${taskId ? `(${taskId.slice(-6)})` : ""}`,
            icon: "📊",
        });
    }, [items, addItem]);
    const closeItem = useCallback((itemId: string) => {
        setItems(prev => {
            const newItems = prev.filter(item => item.id !== itemId);
            if (newItems.length === 0) {
                setIsOpen(false);
                setActiveItemId(null);
            } else if (activeItemId === itemId) {
                setActiveItemId(newItems[0].id);
            }
            return newItems;
        });
    }, [activeItemId]);
    const closePanel = useCallback(() => {
        setIsOpen(false);
        setItems([]);
        setActiveItemId(null);
    }, []);
    const switchTo = useCallback((itemId: string) => {
        if (items.some(item => item.id === itemId)) {
            setActiveItemId(itemId);
            setIsOpen(true);
        }
    }, [items]);
    const clearAll = useCallback(() => {
        setItems([]);
        setActiveItemId(null);
        setIsOpen(false);
    }, []);
    useEffect(() => {
        const handlers: Record<string, (e: CustomEvent) => void> = {
            "open-preview-in-panel": (e: CustomEvent) => {
                const { file } = e.detail;
                if (file) openPreview(file);
            },
            "open-map-in-panel": (e: CustomEvent) => {
                const { mapData, taskId } = e.detail;
                openMap(mapData, taskId);
            },
            "open-chart-in-panel": (e: CustomEvent) => {
                const { chartData, taskId } = e.detail;
                openChart(chartData, taskId);
            },
            "open-preview-in-panel-internal": (e: CustomEvent) => {
                const { file } = e.detail;
                if (file) openPreview(file);
            },
            "open-map-in-panel-internal": (e: CustomEvent) => {
                const { mapData, taskId } = e.detail;
                openMap(mapData, taskId);
            },
            "open-chart-in-panel-internal": (e: CustomEvent) => {
                const { chartData, taskId } = e.detail;
                openChart(chartData, taskId);
            },
        };
        Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler as EventListener);
        });
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                window.removeEventListener(event, handler as EventListener);
            });
        };
    }, [openPreview, openMap, openChart]);
    return {
        isOpen,
        items,
        activeItemId,
        openPreview,
        openMap,
        openChart,
        closePanel,
        closeItem,
        switchTo,
        clearAll,
        getActiveItem,
    };
}