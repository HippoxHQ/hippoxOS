import React, { useState, useEffect, useRef } from "react";
import { skillsMarketCommands, MarketSkill } from "../../api/skills";
import {
  CategoryIcon,
  RefreshIcon,
  StarIcon,
  StarFilledIcon,
  PlayIcon,
} from "../../icons";

interface SkillMarketPanelProps {
  t: (key: string, params?: any) => string;
}

const getAuthorColor = (author: string): string => {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#ef4444",
    "#14b8a6",
    "#a855f7",
    "#d946ef",
    "#f97316",
    "#0ea5e9",
  ];
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = (hash << 5) - hash + author.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

const SkillMarketPanel: React.FC<SkillMarketPanelProps> = ({ t }) => {
  const [skills, setSkills] = useState<MarketSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    loadMarketConfig();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const cats = await skillsMarketCommands.getMarketCategories();
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadSkills = async () => {
    setLoading(true);
    try {
      const skillsList = await skillsMarketCommands.getMarketSkills();
      setSkills(skillsList);
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
      await loadCategories();
    } catch (error) {
      console.error("Failed to update market:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFavorite = async (skill: MarketSkill) => {
    setFavoritingId(skill.id);
    try {
      if (skill.favorited) {
        await skillsMarketCommands.unfavoriteSkill(skill.id);
      } else {
        await skillsMarketCommands.favoriteSkill(skill.id);
      }
      await loadSkills();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setFavoritingId(null);
    }
  };

  const handleRun = async (skill: MarketSkill) => {
    console.log("Run skill:", skill.id);
  };

  const handleSaveConfig = async () => {
    try {
      await skillsMarketCommands.updateMarketConfig(repoUrl, branch);
      setShowConfigModal(false);
      await handleUpdateMarket();
    } catch (error) {
      console.error("Failed to save config:", error);
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
    skillList: {
      flex: 1,
      overflowY: "auto",
    },
    skillCard: {
      background: "var(--bg-secondary)",
      padding: "10px 15px",
      borderBottom: "1px solid var(--border-color)",
      transition: "background 0.2s ease",
      cursor: "pointer",
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
      alignItems: "center",
      gap: "16px",
      marginBottom: "8px",
      fontSize: "11px",
      color: "var(--text-muted)",
      flexWrap: "wrap",
    },
    authorInfo: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    authorAvatar: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      objectFit: "cover" as const,
    },
    authorAvatarPlaceholder: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "8px",
      color: "white",
      fontWeight: "bold" as const,
    },
    skillDescription: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      lineHeight: 1.4,
    },
    iconButton: {
      width: "28px",
      height: "28px",
      borderRadius: "6px",
      background: "transparent",
      border: "1px solid var(--border-color)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      color: "var(--text-secondary)",
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
          {t("atomicSkills.loading") || "Loading..."}
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
            title={t("market.filterByCategory") || "Filter by category"}
          >
            <CategoryIcon size={16} />
          </button>
          <div style={styles.searchInputWrapper}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder={t("market.searchPlaceholder") || "Search skills..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            style={styles.refreshBtn}
            onClick={handleUpdateMarket}
            disabled={updating}
            title={t("market.updateMarket") || "Update market"}
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
            {t("market.selectCategory") || "Select category"}
          </div>
          <div style={styles.bubbleContent}>
            <div
              style={{
                ...styles.bubbleItem,
                ...(selectedCategory === "all" ? styles.bubbleItemActive : {}),
              }}
              onClick={() => handleCategorySelect("all")}
            >
              <span style={styles.bubbleItemText}>
                {t("market.all") || "All"}
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
              ? t("market.noSearchResults") || "No matching skills found"
              : t("market.noSkills") || "No skills available"}
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <div
              key={skill.id}
              style={{
                ...styles.skillCard,
                ...(hoveredId === skill.id
                  ? { background: "var(--hover-bg)" }
                  : {}),
              }}
              onMouseEnter={() => setHoveredId(skill.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={styles.skillHeader}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={styles.skillName}>{skill.name}</span>
                  <span style={styles.skillVersion}>v{skill.version}</span>
                  {skill.installed && (
                    <span style={styles.installedBadge}>
                      {t("market.installed") || "Installed"}
                    </span>
                  )}
                  {skill.installed &&
                    skill.installed_version !== skill.version && (
                      <span style={styles.updateBadge}>
                        {t("market.updateAvailable") || "Update available"}
                      </span>
                    )}
                </div>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <button
                    style={{
                      ...styles.iconButton,
                      color: skill.favorited
                        ? "#f59e0b"
                        : "var(--text-tertiary)",
                    }}
                    onClick={() => handleFavorite(skill)}
                    disabled={favoritingId === skill.id}
                    title={
                      skill.favorited
                        ? t("market.unfavorite") || "Unfavorite"
                        : t("market.favorite") || "Favorite"
                    }
                  >
                    {skill.favorited ? (
                      <StarFilledIcon size={14} />
                    ) : (
                      <StarIcon size={14} />
                    )}
                  </button>
                  <button
                    style={styles.iconButton}
                    onClick={() => handleRun(skill)}
                    title={t("market.run") || "Run"}
                  >
                    <PlayIcon size={14} />
                  </button>
                </div>
              </div>
              <div style={styles.skillMeta}>
                <div style={styles.authorInfo}>
                  {skill.author_avatar ? (
                    <img
                      src={skill.author_avatar}
                      alt={skill.author}
                      style={styles.authorAvatar}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        ...styles.authorAvatarPlaceholder,
                        background: getAuthorColor(skill.author),
                      }}
                    >
                      {skill.author.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{skill.author}</span>
                </div>
                <span>📁 {skill.category}</span>
              </div>
              <div style={styles.skillDescription}>{skill.description}</div>
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
              {t("market.repositorySettings") || "Repository Settings"}
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                {t("market.repoUrl") || "Repository URL"}
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
                {t("market.branch") || "Branch"}
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
                {t("settings.cancel") || "Cancel"}
              </button>
              <button
                style={{ ...styles.button, ...styles.installBtn }}
                onClick={handleSaveConfig}
              >
                {t("settings.save") || "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillMarketPanel;
