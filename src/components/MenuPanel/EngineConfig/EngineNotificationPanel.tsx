import React, { useState, useEffect, useRef } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";

interface NotificationInstance {
  id: string;
  name: string;
  type: "smtp" | "telegram" | "dingtalk" | "feishu" | "wecom" | "github";
  enabled: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_from?: string;
  telegram_botToken?: string;
  dingtalk_accessToken?: string;
  feishu_webhook?: string;
  wecom_webhook?: string;
  github_token?: string;
  github_apiUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface EngineNotificationPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const NOTIFICATION_TYPE_CONFIG: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  smtp: {
    name: "SMTP Email",
    icon: "📧",
    description: "Email notification via SMTP",
  },
  telegram: {
    name: "Telegram",
    icon: "📱",
    description: "Telegram Bot notification",
  },
  dingtalk: {
    name: "DingTalk",
    icon: "💬",
    description: "DingTalk group robot",
  },
  feishu: { name: "Feishu", icon: "🐦", description: "Feishu webhook" },
  wecom: { name: "WeCom", icon: "💼", description: "WeChat Work webhook" },
  github: { name: "GitHub", icon: "🐙", description: "GitHub API integration" },
};

const EngineNotificationPanel: React.FC<EngineNotificationPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [instances, setInstances] = useState<NotificationInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("smtp");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSmtpHost, setFormSmtpHost] = useState("");
  const [formSmtpPort, setFormSmtpPort] = useState(587);
  const [formSmtpUsername, setFormSmtpUsername] = useState("");
  const [formSmtpPassword, setFormSmtpPassword] = useState("");
  const [formSmtpFrom, setFormSmtpFrom] = useState("");
  const [formTelegramBotToken, setFormTelegramBotToken] = useState("");
  const [formDingtalkAccessToken, setFormDingtalkAccessToken] = useState("");
  const [formFeishuWebhook, setFormFeishuWebhook] = useState("");
  const [formWecomWebhook, setFormWecomWebhook] = useState("");
  const [formGithubToken, setFormGithubToken] = useState("");
  const [formGithubApiUrl, setFormGithubApiUrl] = useState(
    "https://api.github.com",
  );

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, []);

  useEffect(() => {
    setTimeout(checkScrollButtons, 0);
  }, []);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const savedInstances = await loadInstancesFromStorage();
      setInstances(savedInstances);
    } catch (error) {
      console.error("Failed to load instances:", error);
      setInstances([]);
    }
    setLoading(false);
  };

  const loadInstancesFromStorage = async (): Promise<
    NotificationInstance[]
  > => {
    try {
      const saved = localStorage.getItem("engine_notification_instances");
      if (saved) {
        return JSON.parse(saved);
      }
      if (initialConfig) {
        const migrated: NotificationInstance[] = [];
        const now = new Date().toISOString();

        if (initialConfig.smtp?.host) {
          migrated.push({
            id: `smtp_${Date.now()}`,
            name: "SMTP Server",
            type: "smtp",
            enabled: true,
            smtp_host: initialConfig.smtp.host,
            smtp_port: initialConfig.smtp.port || 587,
            smtp_username: initialConfig.smtp.username || "",
            smtp_password: initialConfig.smtp.password || "",
            smtp_from: initialConfig.smtp.from || "",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.telegram?.botToken) {
          migrated.push({
            id: `telegram_${Date.now()}`,
            name: "Telegram Bot",
            type: "telegram",
            enabled: true,
            telegram_botToken: initialConfig.telegram.botToken,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.dingtalk?.accessToken) {
          migrated.push({
            id: `dingtalk_${Date.now()}`,
            name: "DingTalk Robot",
            type: "dingtalk",
            enabled: true,
            dingtalk_accessToken: initialConfig.dingtalk.accessToken,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.feishu?.webhook) {
          migrated.push({
            id: `feishu_${Date.now()}`,
            name: "Feishu Webhook",
            type: "feishu",
            enabled: true,
            feishu_webhook: initialConfig.feishu.webhook,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.wecom?.webhook) {
          migrated.push({
            id: `wecom_${Date.now()}`,
            name: "WeCom Webhook",
            type: "wecom",
            enabled: true,
            wecom_webhook: initialConfig.wecom.webhook,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.github?.token) {
          migrated.push({
            id: `github_${Date.now()}`,
            name: "GitHub API",
            type: "github",
            enabled: true,
            github_token: initialConfig.github.token,
            github_apiUrl:
              initialConfig.github.apiUrl || "https://api.github.com",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (migrated.length > 0) {
          localStorage.setItem(
            "engine_notification_instances",
            JSON.stringify(migrated),
          );
        }
        return migrated;
      }
      return [];
    } catch (error) {
      console.error("Failed to load instances from storage:", error);
      return [];
    }
  };

  const saveInstancesToStorage = async (
    newInstances: NotificationInstance[],
  ) => {
    localStorage.setItem(
      "engine_notification_instances",
      JSON.stringify(newInstances),
    );
    const config: any = {};
    newInstances.forEach((inst) => {
      if (inst.type === "smtp" && inst.enabled) {
        config.smtp = {
          host: inst.smtp_host,
          port: inst.smtp_port,
          username: inst.smtp_username,
          password: inst.smtp_password,
          from: inst.smtp_from,
        };
      } else if (inst.type === "telegram" && inst.enabled) {
        config.telegram = { botToken: inst.telegram_botToken };
      } else if (inst.type === "dingtalk" && inst.enabled) {
        config.dingtalk = { accessToken: inst.dingtalk_accessToken };
      } else if (inst.type === "feishu" && inst.enabled) {
        config.feishu = { webhook: inst.feishu_webhook };
      } else if (inst.type === "wecom" && inst.enabled) {
        config.wecom = { webhook: inst.wecom_webhook };
      } else if (inst.type === "github" && inst.enabled) {
        config.github = {
          token: inst.github_token,
          apiUrl: inst.github_apiUrl,
        };
      }
    });
    if (onSave) onSave(config);
  };

  const handleToggleEnabled = (id: string, name: string, enabled: boolean) => {
    const newEnabled = !enabled;
    const actionText = newEnabled ? "enable" : "disable";

    if (!newEnabled) {
      showDialog(
        DialogType.WARNING,
        t("notification.disableConfirmTitle"),
        t("notification.disableConfirmMessage", { name }),
        async () => {
          const updated = instances.map((i) =>
            i.id === id
              ? {
                  ...i,
                  enabled: newEnabled,
                  updatedAt: new Date().toISOString(),
                }
              : i,
          );
          setInstances(updated);
          await saveInstancesToStorage(updated);
          showToast(
            ToastType.SUCCESS,
            t(`notification.${actionText}Success`, { name }),
          );
        },
        undefined,
        t("notification.disable"),
        t("common.cancel"),
      );
    } else {
      const updated = instances.map((i) =>
        i.id === id
          ? { ...i, enabled: newEnabled, updatedAt: new Date().toISOString() }
          : i,
      );
      setInstances(updated);
      saveInstancesToStorage(updated);
      showToast(
        ToastType.SUCCESS,
        t(`notification.${actionText}Success`, { name }),
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showDialog(
      DialogType.WARNING,
      t("notification.deleteConfirmTitle"),
      t("notification.deleteConfirmMessage", { name }),
      async () => {
        const updated = instances.filter((i) => i.id !== id);
        setInstances(updated);
        await saveInstancesToStorage(updated);
        showToast(ToastType.SUCCESS, t("notification.deleteSuccess", { name }));
      },
      undefined,
      t("notification.delete"),
      t("common.cancel"),
    );
  };

  const handleEdit = (instance: NotificationInstance) => {
    setEditingId(instance.id);
    setFormName(instance.name);
    setFormSmtpHost(instance.smtp_host || "");
    setFormSmtpPort(instance.smtp_port || 587);
    setFormSmtpUsername(instance.smtp_username || "");
    setFormSmtpPassword(instance.smtp_password || "");
    setFormSmtpFrom(instance.smtp_from || "");
    setFormTelegramBotToken(instance.telegram_botToken || "");
    setFormDingtalkAccessToken(instance.dingtalk_accessToken || "");
    setFormFeishuWebhook(instance.feishu_webhook || "");
    setFormWecomWebhook(instance.wecom_webhook || "");
    setFormGithubToken(instance.github_token || "");
    setFormGithubApiUrl(instance.github_apiUrl || "https://api.github.com");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName("");
    setFormSmtpHost("");
    setFormSmtpPort(587);
    setFormSmtpUsername("");
    setFormSmtpPassword("");
    setFormSmtpFrom("");
    setFormTelegramBotToken("");
    setFormDingtalkAccessToken("");
    setFormFeishuWebhook("");
    setFormWecomWebhook("");
    setFormGithubToken("");
    setFormGithubApiUrl("https://api.github.com");
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString();

    const baseInstance: Partial<NotificationInstance> = {
      id: editingId || `${activeTab}_${Date.now()}`,
      name: formName,
      type: activeTab as any,
      enabled: true,
      createdAt: editingId
        ? instances.find((i) => i.id === editingId)?.createdAt || now
        : now,
      updatedAt: now,
    };
    if (activeTab === "smtp") {
      baseInstance.smtp_host = formSmtpHost;
      baseInstance.smtp_port = formSmtpPort;
      baseInstance.smtp_username = formSmtpUsername;
      baseInstance.smtp_password = formSmtpPassword;
      baseInstance.smtp_from = formSmtpFrom;
    } else if (activeTab === "telegram") {
      baseInstance.telegram_botToken = formTelegramBotToken;
    } else if (activeTab === "dingtalk") {
      baseInstance.dingtalk_accessToken = formDingtalkAccessToken;
    } else if (activeTab === "feishu") {
      baseInstance.feishu_webhook = formFeishuWebhook;
    } else if (activeTab === "wecom") {
      baseInstance.wecom_webhook = formWecomWebhook;
    } else if (activeTab === "github") {
      baseInstance.github_token = formGithubToken;
      baseInstance.github_apiUrl = formGithubApiUrl;
    }

    const newInstance = baseInstance as NotificationInstance;

    let updated: NotificationInstance[];
    if (editingId) {
      updated = instances.map((i) => (i.id === editingId ? newInstance : i));
      showToast(
        ToastType.SUCCESS,
        t("notification.updateSuccess", { name: formName }),
      );
    } else {
      updated = [...instances, newInstance];
      showToast(
        ToastType.SUCCESS,
        t("notification.addSuccess", { type: getTypeName(activeTab) }),
      );
    }
    setInstances(updated);
    await saveInstancesToStorage(updated);
    resetForm();
  };

  const getInstancesByType = (type: string) => {
    return instances.filter((i) => i.type === type);
  };

  const getTypeIcon = (type: string) => {
    return NOTIFICATION_TYPE_CONFIG[type]?.icon || "🔔";
  };

  const getTypeName = (type: string) => {
    return NOTIFICATION_TYPE_CONFIG[type]?.name || type;
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        tabsRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(
        scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5,
      );
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color, #0066cc)",
    color: "white",
    border: "none",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: "var(--error-color, #dc2626)",
    borderColor: "var(--error-color, #dc2626)",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid var(--border-color)",
  };

  const badgeStyle: React.CSSProperties = {
    background: "var(--accent-color, #0066cc)",
    color: "white",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "12px",
    marginLeft: "8px",
  };

  const enabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#10b981",
  };

  const disabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#6b7280",
  };

  const tabsStyles = `
    .atomic-tabs-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0px;
    }
    .atomic-tabs-scroll {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .atomic-tabs-scroll::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .atomic-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color);
      min-width: max-content;
    }
    .atomic-tab {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 6px 6px 0 0;
      white-space: nowrap;
      user-select: none;
    }
    .atomic-tab:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    .atomic-tab.active {
      color: var(--accent-color, #0066cc);
      border-bottom: 2px solid var(--accent-color, #0066cc);
    }
    .atomic-tab-scroll-btn {
      width: 28px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 16px;
      transition: all 0.2s;
      flex-shrink: 0;
      margin: 0 4px;
      user-select: none;
    }
    .atomic-tab-scroll-btn:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
    .atomic-tab-scroll-btn.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .atomic-tab-scroll-btn.disabled:hover {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "atomic-tabs-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = tabsStyles;
      document.head.appendChild(style);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t("common.loading")}
      </div>
    );
  }

  const currentInstances = getInstancesByType(activeTab);
  const notificationTypes = [
    "smtp",
    "telegram",
    "dingtalk",
    "feishu",
    "wecom",
    "github",
  ];

  const renderFormFields = () => {
    switch (activeTab) {
      case "smtp":
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.smtpHost")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formSmtpHost}
                onChange={(e) => setFormSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.smtpPort")}</label>
              <input
                type="number"
                style={inputStyle}
                value={formSmtpPort}
                onChange={(e) =>
                  setFormSmtpPort(parseInt(e.target.value) || 587)
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.username")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formSmtpUsername}
                onChange={(e) => setFormSmtpUsername(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.password")}</label>
              <input
                type="password"
                style={inputStyle}
                value={formSmtpPassword}
                onChange={(e) => setFormSmtpPassword(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.fromEmail")}</label>
              <input
                type="email"
                style={inputStyle}
                value={formSmtpFrom}
                onChange={(e) => setFormSmtpFrom(e.target.value)}
                placeholder="sender@example.com"
              />
            </div>
          </>
        );
      case "telegram":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.botToken")}</label>
            <input
              type="password"
              style={inputStyle}
              value={formTelegramBotToken}
              onChange={(e) => setFormTelegramBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
          </div>
        );
      case "dingtalk":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.accessToken")}</label>
            <input
              type="password"
              style={inputStyle}
              value={formDingtalkAccessToken}
              onChange={(e) => setFormDingtalkAccessToken(e.target.value)}
            />
          </div>
        );
      case "feishu":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.webhook")}</label>
            <input
              type="text"
              style={inputStyle}
              value={formFeishuWebhook}
              onChange={(e) => setFormFeishuWebhook(e.target.value)}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
            />
          </div>
        );
      case "wecom":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.webhook")}</label>
            <input
              type="text"
              style={inputStyle}
              value={formWecomWebhook}
              onChange={(e) => setFormWecomWebhook(e.target.value)}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
            />
          </div>
        );
      case "github":
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.accessToken")}</label>
              <input
                type="password"
                style={inputStyle}
                value={formGithubToken}
                onChange={(e) => setFormGithubToken(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.apiUrl")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formGithubApiUrl}
                onChange={(e) => setFormGithubApiUrl(e.target.value)}
                placeholder="https://api.github.com"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderReadonlyFields = (instance: NotificationInstance) => {
    switch (instance.type) {
      case "smtp":
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.smtpHost")}</label>
              <input
                type="text"
                style={inputStyle}
                value={instance.smtp_host || ""}
                disabled
                readOnly
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.smtpPort")}</label>
              <input
                type="number"
                style={inputStyle}
                value={instance.smtp_port || ""}
                disabled
                readOnly
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.username")}</label>
              <input
                type="text"
                style={inputStyle}
                value={instance.smtp_username || ""}
                disabled
                readOnly
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.fromEmail")}</label>
              <input
                type="text"
                style={inputStyle}
                value={instance.smtp_from || ""}
                disabled
                readOnly
              />
            </div>
          </>
        );
      case "telegram":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.botToken")}</label>
            <input
              type="password"
              style={inputStyle}
              value={instance.telegram_botToken ? "••••••••" : ""}
              disabled
              readOnly
            />
          </div>
        );
      case "dingtalk":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.accessToken")}</label>
            <input
              type="password"
              style={inputStyle}
              value={instance.dingtalk_accessToken ? "••••••••" : ""}
              disabled
              readOnly
            />
          </div>
        );
      case "feishu":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.webhook")}</label>
            <input
              type="text"
              style={inputStyle}
              value={instance.feishu_webhook || ""}
              disabled
              readOnly
            />
          </div>
        );
      case "wecom":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("notification.webhook")}</label>
            <input
              type="text"
              style={inputStyle}
              value={instance.wecom_webhook || ""}
              disabled
              readOnly
            />
          </div>
        );
      case "github":
        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.accessToken")}</label>
              <input
                type="password"
                style={inputStyle}
                value={instance.github_token ? "••••••••" : ""}
                disabled
                readOnly
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.apiUrl")}</label>
              <input
                type="text"
                style={inputStyle}
                value={instance.github_apiUrl || ""}
                disabled
                readOnly
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        className="atomic-tabs-container"
        style={{ padding: "0px", margin: 0 }}
      >
        {showLeftArrow && (
          <button
            className="atomic-tab-scroll-btn"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        <div
          className="atomic-tabs-scroll"
          ref={tabsRef}
          onScroll={checkScrollButtons}
        >
          <div className="atomic-tabs">
            {notificationTypes.map((type) => (
              <button
                key={type}
                className={`atomic-tab ${activeTab === type ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(type);
                  resetForm();
                }}
              >
                {getTypeIcon(type)} {getTypeName(type)}
              </button>
            ))}
          </div>
        </div>
        {showRightArrow && (
          <button
            className="atomic-tab-scroll-btn"
            onClick={() => scrollTabs("right")}
          >
            ▶
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px",
          margin: 0,
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        {currentInstances.length === 0 && !showAddForm ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            {t("notification.noInstances", { type: getTypeName(activeTab) })}
          </div>
        ) : (
          currentInstances.map((instance) => (
            <div key={instance.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {getTypeIcon(instance.type)} {instance.name}
                </span>
                <span
                  style={
                    instance.enabled ? enabledBadgeStyle : disabledBadgeStyle
                  }
                >
                  {instance.enabled
                    ? t("notification.enabled")
                    : t("notification.disabled")}
                </span>
              </div>

              {renderReadonlyFields(instance)}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() =>
                    handleToggleEnabled(
                      instance.id,
                      instance.name,
                      instance.enabled,
                    )
                  }
                >
                  {instance.enabled
                    ? t("notification.disable")
                    : t("notification.enable")}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleEdit(instance)}
                >
                  {t("notification.edit")}
                </button>
                <button
                  style={{
                    ...deleteButtonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleDelete(instance.id, instance.name)}
                >
                  {t("notification.delete")}
                </button>
              </div>
            </div>
          ))
        )}

        {showAddForm ? (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "12px",
              }}
            >
              {editingId
                ? t("notification.editInstance")
                : t("notification.addInstance", {
                    type: getTypeName(activeTab),
                  })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("notification.name")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("notification.namePlaceholder")}
              />
            </div>

            {renderFormFields()}

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button style={buttonStyle} onClick={resetForm}>
                {t("common.cancel")}
              </button>
              <button style={addButtonStyle} onClick={handleSave}>
                {editingId ? t("settings.update") : t("settings.add")}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...addButtonStyle, width: "100%" }}
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
          >
            + {t("notification.addInstance", { type: getTypeName(activeTab) })}
          </button>
        )}
      </div>
    </div>
  );
};

export default EngineNotificationPanel;
