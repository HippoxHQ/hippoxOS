import React, { useState, useEffect, useRef } from "react";
import { skillsMarketCommands, MarketSkill } from "../../api/skills";
import { CategoryIcon, RefreshIcon } from "../../icons";

interface SkillMarketPanelProps {
  t: (key: string, params?: any) => string;
}

const SkillMarketPanel: React.FC<SkillMarketPanelProps> = ({ t }) => {
  const [skills, setSkills] = useState<MarketSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryBubble, setShowCategoryBubble] = useState(false);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadMarketConfig();
    loadSkills();
  }, []);
  const loadMarketConfig = async () => {
    try {
      const config = await skillsMarketCommands.getMarketConfig();
      setRepoUrl(config.repo_url);
      setBranch(config.branch);
    } catch (error) {
      console.error("Failed to load market config:", error);
    }
  };
  const loadSkills = async () => {
    setLoading(true);
    try {
      const skillsList = await skillsMarketCommands.getMarketSkills();
      setSkills(skillsList);
      const cats = Array.from(new Set(skillsList.map((s) => s.category)));
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateMarket = async () => {
    setUpdating(true);
    try {
      const updatedSkills = await skillsMarketCommands.updateSkillsMarket();
      setSkills(updatedSkills);
      const cats = Array.from(new Set(updatedSkills.map((s) => s.category)));
      setCategories(cats);
    } catch (error) {
      console.error("Failed to update market:", error);
      alert(t("market.updateFailed") || "更新失败，请检查网络连接和Git安装");
    } finally {
      setUpdating(false);
    }
  };
  const handleInstall = async (skill: MarketSkill) => {
    setInstallingId(skill.id);
    try {
      await skillsMarketCommands.installSkill(skill.id);
      await loadSkills();
    } catch (error) {
      console.error("Failed to install skill:", error);
      alert(t("market.installFailed") || "安装失败");
    } finally {
      setInstallingId(null);
    }
  };
  const handleUninstall = async (skill: MarketSkill) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      !confirm(
        t("market.confirmUninstall") || `确定要卸载 "${skill.name}" 吗？`,
      )
    ) {
      return;
    }
    setInstallingId(skill.id);
    try {
      await skillsMarketCommands.uninstallSkill(skill.id);
      await loadSkills();
    } catch (error) {
      console.error("Failed to uninstall skill:", error);
      alert(t("market.uninstallFailed") || "卸载失败");
    } finally {
      setInstallingId(null);
    }
  };
  const handleUpdateSkill = async (skill: MarketSkill) => {
    setInstallingId(skill.id);
    try {
      await skillsMarketCommands.updateSkill(skill.id);
      await loadSkills();
    } catch (error) {
      console.error("Failed to update skill:", error);
      alert(t("market.updateFailed") || "更新失败");
    } finally {
      setInstallingId(null);
    }
  };
  const handleSaveConfig = async () => {
    try {
      await skillsMarketCommands.updateMarketConfig(repoUrl, branch);
      setShowConfigModal(false);
      await handleUpdateMarket();
    } catch (error) {
      console.error("Failed to save config:", error);
      alert(t("market.saveConfigFailed") || "保存配置失败");
    }
  };
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryBubble(false);
  };
  const handleCategoryButtonMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    setShowCategoryBubble(true);
  };
  const handleCategoryButtonMouseLeave = () => {
    bubbleTimerRef.current = setTimeout(() => {
      setShowCategoryBubble(false);
    }, 200);
  };
  const handleBubbleMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
  };
  const handleBubbleMouseLeave = () => {
    setShowCategoryBubble(false);
  };
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const installedCount = skills.filter((s) => s.installed).length;
  const getSelectedCategoryLabel = () => {
    if (selectedCategory === "all") {
      return t("market.all") || "全部";
    }
    return selectedCategory;
  };
  const styles: Record<string, React.CSSProperties> = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    categoryBtn: {
      width: "34px",
      height: "34px",
      padding: "0",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      color: "var(--text-primary)",
      fontSize: "16px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative" as const,
    },
    searchInputWrapper: {
      flex: 1,
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      color: "var(--text-primary)",
      fontSize: "13px",
    },
    refreshBtn: {
      width: "34px",
      height: "34px",
      padding: "0",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      color: "var(--text-primary)",
      fontSize: "16px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    bubbleContainer: {
      position: "absolute" as const,
      left: "16px",
      top: "66px",
      minWidth: "150px",
      maxWidth: "200px",
      background: "var(--bg-secondary, #1e1e1e)",
      border: "1px solid var(--border-color, #333)",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      overflow: "hidden",
      zIndex: 100,
      pointerEvents: "auto" as const,
    },
    bubbleHeader: {
      padding: "10px 12px",
      borderBottom: "1px solid var(--border-color, #333)",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-secondary, #aaa)",
      background: "var(--bg-tertiary, #252525)",
    },
    bubbleContent: {
      maxHeight: "300px",
      overflowY: "auto" as const,
      padding: "4px 0",
    },
    bubbleItem: {
      padding: "8px 12px",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.15s",
      borderLeft: "2px solid transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    },
    bubbleItemActive: {
      background: "var(--hover-bg, #2a2a2a)",
      borderLeftColor: "#0066cc",
    },
    bubbleItemText: {
      flex: 1,
      color: "var(--text-primary, #fff)",
    },
    bubbleItemCount: {
      fontSize: "10px",
      color: "var(--text-tertiary, #888)",
      flexShrink: 0,
    },
    stats: {
      fontSize: "12px",
      color: "var(--text-muted)",
      marginTop: "8px",
    },
    skillList: {
      flex: 1,
      overflowY: "auto",
      padding: "10px",
    },
    skillCard: {
      background: "var(--bg-secondary)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "12px",
      border: "1px solid var(--border-color)",
    },
    skillHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
      flexWrap: "wrap",
      gap: "8px",
    },
    skillName: {
      fontSize: "16px",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    skillVersion: {
      fontSize: "11px",
      color: "var(--text-muted)",
      marginLeft: "8px",
    },
    installedBadge: {
      background: "#0066cc",
      color: "white",
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
    },
    updateBadge: {
      background: "#f59e0b",
      color: "white",
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
      marginLeft: "8px",
    },
    skillMeta: {
      display: "flex",
      gap: "12px",
      marginBottom: "8px",
      fontSize: "11px",
      color: "var(--text-muted)",
    },
    skillDescription: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      marginBottom: "12px",
      lineHeight: 1.4,
    },
    skillActions: {
      display: "flex",
      gap: "8px",
      justifyContent: "flex-end",
    },
    button: {
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
      border: "none",
    },
    installBtn: {
      background: "#0066cc",
      color: "white",
    },
    uninstallBtn: {
      background: "transparent",
      color: "#dc2626",
      border: "1px solid #dc2626",
    },
    updateBtn: {
      background: "#f59e0b",
      color: "white",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "var(--bg-primary)",
      borderRadius: "12px",
      padding: "24px",
      width: "400px",
      maxWidth: "90%",
      border: "1px solid var(--border-color)",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: 600,
      marginBottom: "16px",
      color: "var(--text-primary)",
    },
    inputGroup: {
      marginBottom: "16px",
    },
    inputLabel: {
      display: "block",
      fontSize: "13px",
      marginBottom: "6px",
      color: "var(--text-secondary)",
    },
    modalInput: {
      width: "100%",
      padding: "8px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "6px",
      color: "var(--text-primary)",
      fontSize: "13px",
    },
    modalButtons: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "20px",
    },
    loadingState: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "var(--text-muted)",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      color: "var(--text-muted)",
    },
  };
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          {t("atomicSkills.loading") || "加载中..."}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...styles.container, position: "relative" }}>
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <button
            ref={categoryButtonRef}
            style={styles.categoryBtn}
            onMouseEnter={handleCategoryButtonMouseEnter}
            onMouseLeave={handleCategoryButtonMouseLeave}
            title={t("market.filterByCategory") || "分类筛选"}
          >
            <CategoryIcon size={16} />
          </button>
          <div style={styles.searchInputWrapper}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder={t("market.searchPlaceholder") || "搜索技能..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            style={styles.refreshBtn}
            onClick={handleUpdateMarket}
            disabled={updating}
            title={t("market.updateMarket") || "更新市场"}
          >
            {updating ? "⟳" : <RefreshIcon size={16} />}
          </button>
        </div>
      </div>
      {showCategoryBubble && categories.length > 0 && (
        <div
          ref={bubbleRef}
          style={styles.bubbleContainer}
          onMouseEnter={handleBubbleMouseEnter}
          onMouseLeave={handleBubbleMouseLeave}
        >
          <div style={styles.bubbleHeader}>
            {t("market.selectCategory") || "选择分类"}
          </div>
          <div style={styles.bubbleContent}>
            <div
              style={{
                ...styles.bubbleItem,
                ...(selectedCategory === "all" ? styles.bubbleItemActive : {}),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #2a2a2a)";
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== "all") {
                  e.currentTarget.style.background = "";
                }
              }}
              onClick={() => handleCategorySelect("all")}
            >
              <span style={styles.bubbleItemText}>
                {t("market.all") || "全部"}
              </span>
              <span style={styles.bubbleItemCount}>({skills.length})</span>
            </div>
            {categories.map((cat) => {
              const count = skills.filter((s) => s.category === cat).length;
              return (
                <div
                  key={cat}
                  style={{
                    ...styles.bubbleItem,
                    ...(selectedCategory === cat
                      ? styles.bubbleItemActive
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--hover-bg, #2a2a2a)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== cat) {
                      e.currentTarget.style.background = "";
                    }
                  }}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <span style={styles.bubbleItemText}>{cat}</span>
                  <span style={styles.bubbleItemCount}>({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={styles.skillList}>
        {filteredSkills.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm
              ? t("market.noSearchResults") || "没有找到匹配的技能"
              : t("market.noSkills") || "暂无技能"}
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <div key={skill.id} style={styles.skillCard}>
              <div style={styles.skillHeader}>
                <div>
                  <span style={styles.skillName}>{skill.name}</span>
                  <span style={styles.skillVersion}>v{skill.version}</span>
                  {skill.installed && (
                    <span style={styles.installedBadge}>
                      {t("market.installed") || "已安装"}
                    </span>
                  )}
                  {skill.installed &&
                    skill.installed_version !== skill.version && (
                      <span style={styles.updateBadge}>
                        {t("market.updateAvailable") || "有更新"}
                      </span>
                    )}
                </div>
              </div>
              <div style={styles.skillMeta}>
                <span>📁 {skill.category}</span>
                <span>👤 {skill.author}</span>
              </div>
              <div style={styles.skillDescription}>{skill.description}</div>
              <div style={styles.skillActions}>
                {!skill.installed ? (
                  <button
                    style={{ ...styles.button, ...styles.installBtn }}
                    onClick={() => handleInstall(skill)}
                    disabled={installingId === skill.id}
                  >
                    {installingId === skill.id ? "⏳" : "📥"}{" "}
                    {t("market.install") || "安装"}
                  </button>
                ) : (
                  <>
                    {skill.installed_version !== skill.version && (
                      <button
                        style={{ ...styles.button, ...styles.updateBtn }}
                        onClick={() => handleUpdateSkill(skill)}
                        disabled={installingId === skill.id}
                      >
                        {installingId === skill.id ? "⏳" : "🔄"}{" "}
                        {t("market.update") || "更新"}
                      </button>
                    )}
                    <button
                      style={{ ...styles.button, ...styles.uninstallBtn }}
                      onClick={() => handleUninstall(skill)}
                      disabled={installingId === skill.id}
                    >
                      🗑️ {t("market.uninstall") || "卸载"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {showConfigModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowConfigModal(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              {t("market.repositorySettings") || "仓库设置"}
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                {t("market.repoUrl") || "仓库地址"}
              </label>
              <input
                type="text"
                style={styles.modalInput}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/HippoxHQ/skills-market.git"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                {t("market.branch") || "分支"}
              </label>
              <input
                type="text"
                style={styles.modalInput}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            <div style={styles.modalButtons}>
              <button
                style={styles.button}
                onClick={() => setShowConfigModal(false)}
              >
                {t("settings.cancel") || "取消"}
              </button>
              <button
                style={{ ...styles.button, ...styles.installBtn }}
                onClick={handleSaveConfig}
              >
                {t("settings.save") || "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillMarketPanel;
