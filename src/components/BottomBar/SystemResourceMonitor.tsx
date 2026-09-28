import React, { useState, useEffect, useRef } from "react";
import { Cpu, Monitor, MemoryStick } from "lucide-react";
import { osCommands } from "../../command/os";
interface SystemResourceMonitorProps {
  t: (key: string, params?: Record<string, any>) => string;
}
const SystemResourceMonitor: React.FC<SystemResourceMonitorProps> = ({ t }) => {
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [gpuUsage, setGpuUsage] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Fetch CPU, GPU and memory usage from backend
  const fetchSystemUsage = async () => {
    try {
      const [cpu, gpu, memory] = await Promise.all([osCommands.getCpuUsage(), osCommands.getGpuUsage(), osCommands.getMemoryUsage()]);
      setCpuUsage(cpu);
      setGpuUsage(gpu);
      setMemoryUsage(memory);
    } catch (error) {
      console.error("[SystemResource] Failed to fetch system usage:", error);
    }
  };
  useEffect(() => {
    fetchSystemUsage();
    intervalRef.current = setInterval(fetchSystemUsage, 5000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  const getUsageColor = (usage: number): string => {
    if (usage < 50) return "#22c55e";
    if (usage < 80) return "#f59e0b";
    return "#ef4444";
  };
  const getGpuColor = (usage: number): string => {
    if (usage === 0) return "var(--text-muted)";
    return getUsageColor(usage);
  };
  const getMemoryColor = (usage: number): string => {
    if (usage === 0) return "var(--text-muted)";
    return getUsageColor(usage);
  };
  const formatUsage = (value: number): string => {
    return value.toFixed(1);
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "0 8px",
        fontSize: "11px",
        color: "var(--text-secondary)",
        fontVariantNumeric: "tabular-nums",
      }}
      className="system-resource-monitor"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={`CPU: ${formatUsage(cpuUsage)}%`}
      >
        <Cpu size={12} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontWeight: 500, color: getUsageColor(cpuUsage) }}>{formatUsage(cpuUsage)}%</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={gpuUsage === 0 ? "GPU not available" : `GPU: ${formatUsage(gpuUsage)}%`}
      >
        <Monitor size={12} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontWeight: 500, color: getGpuColor(gpuUsage) }}>{gpuUsage === 0 ? "0.0" : formatUsage(gpuUsage)}%</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={`Memory: ${formatUsage(memoryUsage)}%`}
      >
        <MemoryStick size={12} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontWeight: 500, color: getMemoryColor(memoryUsage) }}>{memoryUsage === 0 ? "0.0" : formatUsage(memoryUsage)}%</span>
      </div>
    </div>
  );
};
export default SystemResourceMonitor;
