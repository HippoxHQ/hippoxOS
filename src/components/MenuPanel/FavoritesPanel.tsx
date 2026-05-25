import React, { useState, useEffect } from "react";
import { skillsMarketCommands, MarketSkill } from "../../api/skills";
import { PlayIcon, StarFilledIcon, StarIcon } from "../../icons";

interface FavoritesPanelProps {
  t: (key: string, params?: any) => string;
}

type TabType = "skillFile" | "natural";

interface NaturalFavorite {
  id: string;
  content: string;
  createdAt: string;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ t }) => {
  const [activeTab, setActiveTab] = useState<TabType>("skillFile");
  const [skillFavorites, setSkillFavorites] = useState<MarketSkill[]>([]);
  const [naturalFavorites, setNaturalFavorites] = useState<NaturalFavorite[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
      const allSkills = await skillsMarketCommands.getMarketSkills();
      const favoritedSkills = allSkills.filter((s) =>
        favoritedIds.includes(s.id),
      );
      setSkillFavorites(favoritedSkills);
      await loadNaturalFavorites();
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNaturalFavorites = async () => {
    const demoNatural: NaturalFavorite[] = [
      {
        id: "1",
        content: "每天早上9点备份数据库到 /backup 目录",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "2",
        content: "每周一生成项目周报并发送到团队邮箱",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    setNaturalFavorites(demoNatural);
  };

  const handleRun = async (skill: MarketSkill) => {
    console.log("Run skill:", skill.id);
  };

  const handleDelete = async (skillId: string) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm(
        t("market.confirmUninstall") || `Are you sure you want to delete?`,
      )
    ) {
      try {
        await skillsMarketCommands.unfavoriteSkill(skillId);
        await loadFavorites();
      } catch (error) {
        console.error("Failed to delete favorite:", error);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

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

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    background: "none",
    border: "none",
    color: isActive ? "var(--accent-color, #0066cc)" : "var(--text-secondary)",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s",
    borderRadius: "6px 6px 0 0",
    borderBottom: isActive ? "2px solid var(--accent-color, #0066cc)" : "none",
  });

  const styles: Record<string, React.CSSProperties> = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
    },
    tabContainer: {
      display: "flex",
      gap: "4px",
      borderBottom: "1px solid var(--border-color)",
      padding: "0",
      flexShrink: 0,
    },
    skillList: {
      flex: 1,
      overflowY: "auto",
    },
    skillCard: {
      background: "var(--bg-secondary)",
      padding: "10px 15px",
      border: "1px solid var(--border-color)",
      transition: "background 0.2s ease",
    },
    skillCardHovered: {
      background: "var(--hover-bg)",
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
      fontSize: "14px",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    skillVersion: {
      fontSize: "11px",
      color: "var(--text-muted)",
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
      fontSize: "12px",
      color: "var(--text-secondary)",
      marginBottom: "10px",
      lineHeight: 1.4,
    },
    iconButton: {
      width: "26px",
      height: "26px",
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
    starButton: {
      color: "#f59e0b",
    },
    naturalCard: {
      background: "var(--bg-secondary)",
      padding: "12px 14px",
      border: "1px solid var(--border-color)",
      borderRadius: "10px",
      marginBottom: "8px",
      transition: "background 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    naturalCardHovered: {
      background: "var(--hover-bg)",
    },
    naturalContent: {
      flex: 1,
      minWidth: 0,
    },
    naturalText: {
      fontSize: "13px",
      color: "var(--text-primary)",
      marginBottom: "6px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    naturalTime: {
      fontSize: "10px",
      color: "var(--text-muted)",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      color: "var(--text-muted)",
      fontSize: "13px",
    },
    loadingState: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "var(--text-muted)",
    },
    rightActions: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
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
    <div style={styles.container}>
      <div style={styles.tabContainer}>
        <button
          style={tabButtonStyle(activeTab === "skillFile")}
          onClick={() => setActiveTab("skillFile")}
        >
          📄 {t("favorites.tabSkillFile") || "SKILL.md"}
        </button>
        <button
          style={tabButtonStyle(activeTab === "natural")}
          onClick={() => setActiveTab("natural")}
        >
          🗣️ {t("favorites.tabNatural") || "Natural Language"}
        </button>
      </div>

      <div style={styles.skillList}>
        {activeTab === "skillFile" ? (
          skillFavorites.length === 0 ? (
            <div style={styles.emptyState}>
              {t("favorites.empty") || "No favorites yet, add one!"}
            </div>
          ) : (
            skillFavorites.map((skill) => {
              const isHovered = hoveredId === skill.id;
              return (
                <div
                  key={skill.id}
                  style={{
                    ...styles.skillCard,
                    ...(isHovered ? styles.skillCardHovered : {}),
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
                    </div>
                    <div style={styles.rightActions}>
                      <button
                        style={styles.iconButton}
                        onClick={() => handleRun(skill)}
                        title={t("market.run") || "Run"}
                      >
                        <PlayIcon size={12} />
                      </button>
                      <button
                        style={{ ...styles.iconButton, color: "#f59e0b" }}
                        onClick={() => handleDelete(skill.id)}
                        title={t("market.unfavorite") || "Remove"}
                      >
                        <StarFilledIcon size={12} />
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
                            (e.target as HTMLImageElement).style.display =
                              "none";
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
              );
            })
          )
        ) : naturalFavorites.length === 0 ? (
          <div style={styles.emptyState}>
            {t("favorites.empty") || "No favorites yet, add one!"}
          </div>
        ) : (
          naturalFavorites.map((item) => {
            const isHovered = hoveredId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  ...styles.naturalCard,
                  ...(isHovered ? styles.naturalCardHovered : {}),
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={styles.naturalContent}>
                  <div style={styles.naturalText}>💬 {item.content}</div>
                  <div style={styles.naturalTime}>
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <div style={styles.rightActions}>
                  <button
                    style={{ ...styles.iconButton, color: "#f59e0b" }}
                    onClick={() => {
                      setNaturalFavorites(
                        naturalFavorites.filter((f) => f.id !== item.id),
                      );
                    }}
                    title="Remove"
                  >
                    <StarFilledIcon size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FavoritesPanel;
