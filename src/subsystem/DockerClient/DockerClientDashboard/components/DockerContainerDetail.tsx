import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Square, Pause, Trash2 } from "lucide-react";
import dockerClientCommands from "../../../../command/DockerClient/General";
import { showToast, ToastType } from "../../../../components/Toast";
import { translateContainerState } from "./types";
/**
 * Detailed view of a single container.
 */
export interface DockerContainerDetailProps {
  socket: string;
  containerId: string;
  containerName?: string;
  containerImage?: string;
  i18n?: "en" | "zh-cn";
  onBack: () => void;
  onActionCompleted?: (actionKey: "start" | "stop" | "pause" | "restart" | "delete") => void;
}
type LifecycleAction = "start" | "pause" | "stop" | "restart" | "delete";
const getEnabledActions = (rawState: string): Set<LifecycleAction> => {
  const state = rawState.trim().toLowerCase();
  const all: LifecycleAction[] = ["start", "pause", "stop", "restart", "delete"];
  switch (state) {
    case "running":
      return new Set<LifecycleAction>(["pause", "stop", "restart", "delete"]);
    case "paused":
      return new Set<LifecycleAction>(["stop", "restart", "delete"]);
    case "exited":
      return new Set<LifecycleAction>(["start", "restart", "delete"]);
    case "created":
      return new Set<LifecycleAction>(["start", "delete"]);
    case "restarting":
    case "removing":
      return new Set<LifecycleAction>(["delete"]);
    case "dead":
      return new Set<LifecycleAction>(["start", "delete"]);
    default:
      return new Set<LifecycleAction>(all);
  }
};
/** Simple key/value row used inside the details panel. */
const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      minHeight: 34,
    }}
  >
    <span style={{ fontSize: 12, color: "var(--text-secondary, #8b949e)", flexShrink: 0 }}>{label}</span>
    <span
      style={{
        fontSize: 12,
        color: "var(--text-primary, #e6edf3)",
        fontFamily: mono ? "monospace" : undefined,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textAlign: "right",
        minWidth: 0,
      }}
      title={typeof value === "string" ? value : undefined}
    >
      {value}
    </span>
  </div>
);
export const DockerContainerDetail: React.FC<DockerContainerDetailProps> = ({ socket, containerId, containerName, containerImage, i18n = "en", onBack, onActionCompleted }) => {
  const isZh = i18n === "zh-cn";
  const [inspect, setInspect] = useState<any | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [cpuUsage, setCpuUsage] = useState<string>("-");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  /**
   * Load container details via `docker inspect`.
   */
  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dockerClientCommands.inspectContainer(socket, containerId);
      setInspect(data);
    } catch (error) {
      setInspect({
        Id: containerId,
        Name: containerName ? `/${containerName}` : "",
        Config: { Image: containerImage ?? "" },
      });
    } finally {
      setLoading(false);
    }
  }, [socket, containerId, containerName, containerImage]);
  /**
   * Fetch the latest container logs from the backend and split them into individual lines for rendering.
   */
  const loadLogs = useCallback(async () => {
    try {
      const raw = await dockerClientCommands.containerLogs(socket, containerId, 500, true);
      const lines = raw.split(/\r?\n/).filter((l, idx, arr) => !(idx === arr.length - 1 && l === ""));
      setTerminalLines(lines);
    } catch (error) {
      setTerminalLines([`[error] ${String(error)}`]);
    }
  }, [socket, containerId]);
  /**
   * Fetch live resource usage for the container.
   */
  const loadStats = useCallback(async () => {
    try {
      const [cpu] = await dockerClientCommands.containerStats(socket, containerId);
      setCpuUsage(cpu || "-");
    } catch {
      setCpuUsage("-");
    }
  }, [socket, containerId]);
  // Initial detail load.
  useEffect(() => {
    loadDetails();
  }, [loadDetails]);
  // Initial log fetch, then poll every 2 seconds for new output.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await loadLogs();
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadLogs]);
  // Poll resource usage every 3 seconds.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await loadStats();
    };
    tick();
    const timer = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadStats]);
  // Auto-scroll the terminal to the bottom whenever new output arrives.
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);
  /**
   * Run a lifecycle action against the container and notify the parent.
   */
  const runAction = useCallback(
    async (actionKey: LifecycleAction) => {
      if (actionBusy) return;
      setActionBusy(true);
      try {
        switch (actionKey) {
          case "start":
            await dockerClientCommands.startContainers(socket, [containerId]);
            break;
          case "stop":
            await dockerClientCommands.stopContainers(socket, [containerId]);
            break;
          case "pause":
            await dockerClientCommands.pauseContainers(socket, [containerId]);
            break;
          case "restart":
            await dockerClientCommands.restartContainers(socket, [containerId]);
            break;
          case "delete":
            await dockerClientCommands.removeContainers(socket, [containerId], true);
            break;
          default:
            break;
        }
        onActionCompleted?.(actionKey);
        if (actionKey === "delete") {
          onBack();
        } else {
          // Refresh details and logs after a successful lifecycle action.
          await loadDetails();
          await loadLogs();
        }
      } catch (error) {
        showToast(ToastType.ERROR, `${isZh ? "操作失败" : "Action failed"}: ${error}`);
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, socket, containerId, isZh, onActionCompleted, onBack, loadDetails, loadLogs],
  );
  /** Shared icon-button style, matching the list panel's row actions. */
  const actionButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 28,
    padding: 0,
    border: "none",
    background: "var(--bg-tertiary, #21262d)",
    color: "var(--text-primary, #e6edf3)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  };
  const resolvedName = inspect?.Name ? String(inspect.Name).replace(/^\//, "") : containerName || containerId.slice(0, 12);
  const resolvedImage = inspect?.Config?.Image ?? containerImage ?? "-";
  const resolvedStatusRaw = inspect?.State?.Status ?? "-";
  const resolvedStatus = translateContainerState(resolvedStatusRaw, isZh);
  const resolvedCreated = inspect?.Created ?? "-";
  const resolvedCmd = Array.isArray(inspect?.Config?.Cmd) ? inspect.Config.Cmd.join(" ") : "-";
  const resolvedPorts = inspect?.NetworkSettings?.Ports ? JSON.stringify(inspect.NetworkSettings.Ports) : "-";
  const resolvedMounts = Array.isArray(inspect?.Mounts) ? inspect.Mounts.map((m: any) => `${m.Source} → ${m.Destination}`).join("\n") : "-";
  const enabledActions = getEnabledActions(resolvedStatusRaw);
  const renderActionGroup = () => {
    const actions: Array<{ key: LifecycleAction; title: string; icon: React.ReactNode; color: string }> = [
      { key: "start", title: isZh ? "启动" : "Start", icon: <Play size={14} />, color: "#22c55e" },
      { key: "pause", title: isZh ? "暂停" : "Pause", icon: <Pause size={14} />, color: "#f59e0b" },
      { key: "stop", title: isZh ? "停止" : "Stop", icon: <Square size={14} />, color: "#ef4444" },
      { key: "delete", title: isZh ? "删除" : "Delete", icon: <Trash2 size={14} />, color: "#ef4444" },
    ];
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--border-color, #30363d)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {actions.map((action, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === actions.length - 1;
          // A button is usable only when its action is enabled for the current state.
          const isEnabled = enabledActions.has(action.key);
          const isDisabled = actionBusy || !isEnabled;
          return (
            <button
              key={action.key}
              title={action.title}
              aria-label={action.title}
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                runAction(action.key);
              }}
              style={{
                ...actionButtonStyle,
                borderLeft: isFirst ? "none" : "1px solid var(--border-color, #30363d)",
                borderTopLeftRadius: isFirst ? 5 : 0,
                borderBottomLeftRadius: isFirst ? 5 : 0,
                borderTopRightRadius: isLast ? 5 : 0,
                borderBottomRightRadius: isLast ? 5 : 0,
                // Disabled buttons fade out and use a muted color.
                color: isDisabled ? "var(--text-muted, #6e7681)" : action.color,
                opacity: isDisabled ? 0.45 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (isDisabled) return;
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              }}
              onMouseLeave={(e) => {
                if (isDisabled) return;
                e.currentTarget.style.background = "var(--bg-tertiary, #21262d)";
              }}
            >
              {action.icon}
            </button>
          );
        })}
      </div>
    );
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary, #161b22)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          minHeight: 52,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <button
            onClick={onBack}
            title={isZh ? "返回" : "Back"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--border-color, #30363d)",
              background: "transparent",
              color: "var(--text-secondary, #8b949e)",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary, #e6edf3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resolvedName}
            </span>
            {resolvedImage !== "-" && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted, #6e7681)",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {resolvedImage}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{renderActionGroup()}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row", overflow: "hidden" }}>
        <div
          style={{
            flex: "1 1 50%",
            minWidth: 0,
            overflowY: "auto",
            padding: 14,
            borderRight: "1px solid var(--border-color, #30363d)",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)", marginBottom: 8 }}>{isZh ? "容器信息" : "Container Info"}</div>
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--text-muted, #6e7681)" }}>{isZh ? "加载中…" : "Loading…"}</div>
          ) : (
            <>
              <DetailRow label={isZh ? "容器 ID" : "Container ID"} value={containerId} mono />
              <DetailRow label={isZh ? "名称" : "Name"} value={resolvedName} />
              <DetailRow label={isZh ? "镜像" : "Image"} value={resolvedImage} mono />
              <DetailRow label={isZh ? "状态" : "Status"} value={resolvedStatus} />
              <DetailRow label={isZh ? "创建时间" : "Created"} value={resolvedCreated} />
              <DetailRow label={isZh ? "启动命令" : "Command"} value={resolvedCmd} mono />
              <DetailRow label={isZh ? "端口" : "Ports"} value={resolvedPorts} mono />
              <DetailRow label={isZh ? "挂载" : "Mounts"} value={resolvedMounts} />
              <DetailRow label="CPU" value={cpuUsage} mono />
            </>
          )}
        </div>
        <div
          style={{
            flex: "1 1 50%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-primary, #0d1117)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border-color, #30363d)",
              flexShrink: 0,
              background: "var(--bg-secondary, #161b22)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{isZh ? "容器终端" : "Container Terminal"}</span>
          </div>
          <div
            ref={terminalRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 12,
              fontFamily: "monospace",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text-primary, #e6edf3)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {terminalLines.length === 0 ? (
              <span style={{ color: "var(--text-muted, #6e7681)" }}>{isZh ? "暂无终端输出" : "No terminal output"}</span>
            ) : (
              terminalLines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    color: line.startsWith("[error]") ? "var(--error-color, #ef4444)" : undefined,
                  }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DockerContainerDetail;
