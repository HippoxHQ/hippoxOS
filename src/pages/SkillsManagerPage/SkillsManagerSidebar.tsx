import React, { useState, useEffect, useRef } from "react";
import { SkillData } from "../../types/skill";
import { PlayIcon, DeleteIcon, StarIcon, StarFilledIcon } from "../../icons";
import { skillsMarketCommands, skillsLocalCommands } from "../../command/skills";
import { UploadFile } from "../../core/types";
import { runSkill } from "../../components/MenuPanel/utils/skillRunner";
import { ChevronDown } from "lucide-react";
interface SkillsManagerSidebarProps {
  t: (key: string, params?: any) => string;
  skills: SkillData[];
  onSelectSkill: (skill: SkillData) => void;
  selectedSkillId?: string;
  onRefresh?: () => void;
  onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
}
const SkillsManagerSidebar: React.FC<SkillsManagerSidebarProps> = ({ t, skills, onSelectSkill, selectedSkillId, onRefresh, onSendSkillMessage }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const grouped = skills.reduce<Record<string, SkillData[]>>((acc, skill) => {
      const category = skill.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {});
    Object.keys(grouped).forEach((cat) => {
      initial[cat] = true;
    });
    return initial;
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favoritedSkills, setFavoritedSkills] = useState<Set<string>>(new Set());
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showStats, setShowStats] = useState(true);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setShowStats(width >= 200);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);
  const loadFavorites = async () => {
    try {
      const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
      setFavoritedSkills(new Set(favoritedIds));
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };
  React.useEffect(() => {
    loadFavorites();
  }, []);
  const isFavorited = (skill: SkillData): boolean => {
    return favoritedSkills.has(`${skill.category}/${skill.id}`);
  };
  const handleFavorite = async (skill: SkillData, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritingId(skill.id);
    try {
      const favoriteId = `${skill.category}/${skill.id}`;
      const isFav = favoritedSkills.has(favoriteId);
      if (isFav) {
        await skillsLocalCommands.unfavoriteLocalSkill(skill.id, skill.category || "other");
        setFavoritedSkills((prev) => {
          const newSet = new Set(prev);
          newSet.delete(favoriteId);
          return newSet;
        });
      } else {
        await skillsLocalCommands.favoriteLocalSkill(skill.id, skill.category || "other");
        setFavoritedSkills((prev) => {
          const newSet = new Set(prev);
          newSet.add(favoriteId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setFavoritingId(null);
    }
  };
  const handleDelete = async (skill: SkillData, e: React.MouseEvent) => {
    e.stopPropagation();
    // eslint-disable-next-line no-restricted-globals
    if (confirm(t("skillsManager.confirmDelete"))) {
      try {
        await skillsLocalCommands.deleteSkill(skill.id, skill.category || "other");
        onRefresh?.();
      } catch (error) {
        console.error("Failed to delete skill:", error);
      }
    }
  };
  const handleRun = async (skill: SkillData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSendSkillMessage) {
      console.warn("onSendSkillMessage is not provided");
      return;
    }
    const allLocalSkills = await skillsLocalCommands.listLocalSkills();
    const found = allLocalSkills.find((s) => s.id === skill.id);
    if (!found) {
      console.error("Skill not found locally:", skill.id);
      return;
    }
    const sessionId = `session_${Date.now()}`;
    const marketSkill = {
      id: found.id,
      name: found.name,
      category: found.category || "other",
      local_path: skill.path,
      version: "1.0.0",
      author: "Local",
      description: found.description,
    };
    await runSkill(marketSkill as any, onSendSkillMessage, t, sessionId);
  };
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };
  const groupedSkills = skills.reduce<Record<string, SkillData[]>>((acc, skill) => {
    const category = skill.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});
  const categoryKeys = Object.keys(groupedSkills);
  const defaultExpanded: Record<string, boolean> = {};
  if (categoryKeys.length > 0) {
    defaultExpanded[categoryKeys[0]] = true;
  }
  const initialExpanded = { ...defaultExpanded, ...expandedCategories };
  const sortSkillsByDate = (skillsList: SkillData[]) => {
    return [...skillsList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };
  const getCategoryColor = (category: string): string => {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#eab308", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#ef4444", "#14b8a6", "#a855f7", "#d946ef", "#f97316", "#0ea5e9"];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = (hash << 5) - hash + category.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const totalSteps = skills.reduce((acc, skill) => acc + skill.steps.length, 0);
  const totalMaterials = skills.reduce((acc, skill) => acc + skill.steps.reduce((a, s) => a + s.materials.length, 0), 0);
  const incompleteSkills = skills.filter((s) => {
    if (!s.description || s.description.trim() === "") return true;
    if (s.steps.length === 0) return true;
    if (s.steps.some((step) => !step.description || step.description.trim() === "")) return true;
    return false;
  }).length;
  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: "280px",
      minWidth: "160px",
      maxWidth: "320px",
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flexShrink: 0,
    },
    statsSection: {
      padding: "10px 10px",
      borderBottom: "1px solid var(--border-color)",
      flexShrink: 0,
      overflow: "hidden",
    },
    statsTitle: {
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-secondary)",
      marginBottom: "10px",
      letterSpacing: "0.5px",
      whiteSpace: "nowrap",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
    },
    statCard: {
      background: "var(--bg-tertiary)",
      borderRadius: "6px",
      padding: "6px 8px",
      textAlign: "center",
      overflow: "hidden",
    },
    statNumber: {
      fontSize: "16px",
      fontWeight: 700,
      color: "var(--accent-color)",
    },
    statLabel: {
      fontSize: "9px",
      color: "var(--text-secondary)",
      marginTop: "1px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    statWarning: {
      background: "rgba(239, 68, 68, 0.1)",
    },
    statWarningNumber: {
      color: "#ef4444",
    },
    list: {
      background: "var(--bg-primary)",
      flex: 1,
      overflowY: "auto",
    },
    categoryHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 10px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-secondary)",
      letterSpacing: "0.3px",
      borderBottom: "1px solid var(--border-color)",
      userSelect: "none",
      background: "var(--bg-secondary)",
    },
    categoryArrow: {
      fontSize: "10px",
      transition: "transform 0.15s",
    },
    skillCard: {
      background: "var(--bg-secondary)",
      padding: "8px 10px",
      borderBottom: "1px solid var(--border-color)",
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      transition: "none",
      borderLeft: "3px solid transparent",
    },
    skillCardHovered: {
      background: "var(--hover-bg)",
    },
    skillCardActive: {
      background: "var(--accent-glow)",
      borderLeft: "3px solid var(--accent-color)",
      borderBottom: "1px solid var(--border-color)",
    },
    skillHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "4px",
      flexWrap: "wrap",
      gap: "4px",
    },
    skillName: {
      fontSize: "13px",
      fontWeight: 600,
      color: "var(--text-primary)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      flex: 1,
      minWidth: 0,
    },
    skillMeta: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "4px",
      fontSize: "10px",
      color: "var(--text-muted)",
      flexWrap: "wrap",
    },
    skillCategoryTag: {
      background: "var(--bg-tertiary)",
      padding: "0 6px",
      borderRadius: "8px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "80px",
    },
    skillDescription: {
      fontSize: "11px",
      color: "var(--text-secondary)",
      lineHeight: 1.3,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    iconButton: {
      width: "24px",
      height: "24px",
      borderRadius: "4px",
      background: "transparent",
      border: "1px solid var(--border-color)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text-secondary)",
      flexShrink: 0,
    },
    iconButtonHover: {
      background: "var(--hover-bg)",
      color: "var(--text-primary)",
      borderColor: "var(--accent-color)",
    },
    iconButtonActive: {
      color: "#f59e0b",
      borderColor: "#f59e0b",
    },
    iconButtonDangerHover: {
      background: "rgba(239, 68, 68, 0.1)",
      color: "#ef4444",
      borderColor: "#ef4444",
    },
    rightActions: {
      display: "flex",
      gap: "4px",
      alignItems: "center",
      flexShrink: 0,
    },
    emptyState: {
      textAlign: "center",
      padding: "30px 12px",
      color: "var(--text-tertiary)",
      fontSize: "12px",
    },
  };
  return (
    <div ref={containerRef} style={styles.container}>
      {showStats && (
        <div style={styles.statsSection}>
          <div style={styles.statsTitle}>📊 {t("skillsManager.stats")}</div>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{skills.length}</div>
              <div style={styles.statLabel}>{t("skillsManager.totalSkills")}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{totalSteps}</div>
              <div style={styles.statLabel}>{t("skillsManager.totalSteps")}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{totalMaterials}</div>
              <div style={styles.statLabel}>{t("skillsManager.totalMaterials")}</div>
            </div>
            <div
              style={{
                ...styles.statCard,
                ...(incompleteSkills > 0 ? styles.statWarning : {}),
              }}
            >
              <div
                style={{
                  ...styles.statNumber,
                  ...(incompleteSkills > 0 ? styles.statWarningNumber : {}),
                }}
              >
                {incompleteSkills}
              </div>
              <div style={styles.statLabel}>{t("skillsManager.incomplete")}</div>
            </div>
          </div>
        </div>
      )}
      <div style={styles.list}>
        {Object.keys(groupedSkills).length === 0 ? (
          <div style={styles.emptyState}>{t("skillsManager.noSkills")}</div>
        ) : (
          Object.keys(groupedSkills).map((category) => {
            const skillsInCategory = sortSkillsByDate(groupedSkills[category]);
            const isExpanded = initialExpanded[category] !== false;
            const categoryColor = getCategoryColor(category);
            return (
              <div key={category}>
                <div
                  style={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: categoryColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {category}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-tertiary)",
                        fontWeight: 400,
                        flexShrink: 0,
                      }}
                    >
                      ({skillsInCategory.length})
                    </span>
                  </span>
                  <span
                    style={{
                      ...styles.categoryArrow,
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  >
                    <ChevronDown size={18} />
                  </span>
                </div>
                {isExpanded &&
                  skillsInCategory.map((skill) => {
                    const isActive = selectedSkillId === skill.id;
                    const isHovered = hoveredId === skill.id;
                    const favorited = isFavorited(skill);
                    return (
                      <div
                        key={skill.id}
                        style={{
                          ...styles.skillCard,
                          ...(isHovered ? styles.skillCardHovered : {}),
                        }}
                        onMouseEnter={() => setHoveredId(skill.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onSelectSkill(skill)}
                      >
                        <div style={styles.skillHeader}>
                          <span style={styles.skillName}>{skill.name}</span>
                          <div style={styles.rightActions}>
                            <button
                              className={`icon-btn ${favorited ? "active" : ""}`}
                              onClick={(e) => handleFavorite(skill, e)}
                              disabled={favoritingId === skill.id}
                              title={favorited ? t("skillsManager.unfavorite") : t("skillsManager.favorite")}
                              style={{
                                ...styles.iconButton,
                                ...(favorited ? styles.iconButtonActive : {}),
                              }}
                              onMouseEnter={(e) => {
                                if (!favorited) {
                                  e.currentTarget.style.background = "var(--hover-bg)";
                                  e.currentTarget.style.color = "var(--text-primary)";
                                  e.currentTarget.style.borderColor = "var(--accent-color)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!favorited) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "var(--text-secondary)";
                                  e.currentTarget.style.borderColor = "var(--border-color)";
                                }
                              }}
                            >
                              {favorited ? <StarFilledIcon size={11} /> : <StarIcon size={11} />}
                            </button>
                            <button
                              style={styles.iconButton}
                              onClick={(e) => handleRun(skill, e)}
                              title={t("skillsManager.run")}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--hover-bg)";
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.borderColor = "var(--accent-color)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-color)";
                              }}
                            >
                              <PlayIcon size={11} />
                            </button>
                            <button
                              style={styles.iconButton}
                              onClick={(e) => handleDelete(skill, e)}
                              title={t("skillsManager.delete")}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                                e.currentTarget.style.color = "#ef4444";
                                e.currentTarget.style.borderColor = "#ef4444";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-color)";
                              }}
                            >
                              <DeleteIcon size={13} />
                            </button>
                          </div>
                        </div>
                        <div style={styles.skillMeta}>
                          <span>{skill.steps?.length || 0} steps</span>
                          {skill.tags && <span style={styles.skillCategoryTag}>{skill.tags.split(",").slice(0, 2).join(", ")}</span>}
                        </div>
                        <div style={styles.skillDescription}>{skill.description || t("skillsManager.noDescription")}</div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default SkillsManagerSidebar;
