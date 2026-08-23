// Component for monitoring and displaying system resource usage (CPU/GPU)
import React, { useState, useEffect, useRef } from "react";
import { Cpu, Monitor } from "lucide-react";
import { osCommands } from "../../command/os";
interface SystemResourceMonitorProps {
  t: (key: string, params?: Record<string, any>) => string;
}
const SystemResourceMonitor: React.FC<SystemResourceMonitorProps> = ({ t }) => {
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [gpuUsage, setGpuUsage] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Fetch CPU and GPU usage from backend
  const fetchSystemUsage = async () => {
    try {
      const [cpu, gpu] = await Promise.all([osCommands.getCpuUsage(), osCommands.getGpuUsage()]);
      setCpuUsage(cpu);
      setGpuUsage(gpu);
    } catch (error) {
      console.error("[SystemResource] Failed to fetch system usage:", error);
    }
  };
  // Initialize polling on component mount
  useEffect(() => {
    // Fetch immediately on mount
    fetchSystemUsage();
    // Poll every 5 seconds
    intervalRef.current = setInterval(fetchSystemUsage, 5000);
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  // Get color based on usage percentage
  // Green: < 50%, Yellow: 50-80%, Red: > 80%
  const getCpuColor = (usage: number): string => {
    if (usage < 50) return "#22c55e";
    if (usage < 80) return "#f59e0b";
    return "#ef4444";
  };
  const getGpuColor = (usage: number): string => {
    if (usage === 0) return "var(--text-muted)";
    if (usage < 50) return "#22c55e";
    if (usage < 80) return "#f59e0b";
    return "#ef4444";
  };
  // Format usage to 1 decimal place
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
      {/* CPU Usage */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={`CPU: ${formatUsage(cpuUsage)}%`}
      >
        {/* CPU icon - keep color consistent with version text */}
        <Cpu size={12} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
        {/* CPU percentage - colored based on usage */}
        <span style={{ fontWeight: 500, color: getCpuColor(cpuUsage) }}>{formatUsage(cpuUsage)}%</span>
      </div>
      {/* GPU Usage */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title={gpuUsage === 0 ? "GPU not available" : `GPU: ${formatUsage(gpuUsage)}%`}
      >
        {/* GPU icon - keep color consistent with version text */}
        <Monitor size={12} strokeWidth={1.75} style={{ color: "var(--text-muted)" }} />
        {/* GPU percentage - colored based on usage, shows 0.0 when not available */}
        <span style={{ fontWeight: 500, color: getGpuColor(gpuUsage) }}>{gpuUsage === 0 ? "0.0" : formatUsage(gpuUsage)}%</span>
      </div>
    </div>
  );
};
export default SystemResourceMonitor;
