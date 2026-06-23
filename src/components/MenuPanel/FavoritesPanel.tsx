import React, { useState, useEffect } from "react";
import { SkillData } from "../../types/skill";
import { PlayIcon, StarFilledIcon, SearchIcon } from "../../icons";
import {
  MarketSkill,
  skillsMarketCommands,
  skillsLocalCommands,
} from "../../command/skills";
import { runSkill } from "./utils/skillRunner";
import { UploadFile } from "../../core/types";
import { filesCommands } from "../../command/files";
import { showDialog, DialogType } from "../../components/Dialog";

interface FavoritesPanelProps {
  t: (key: string, params?: any) => string;
  onSendSkillMessage: (message: string, files?: UploadFile[]) => void;
  onFileClick?: (file: UploadFile) => void;
}

const convertLocalToMarket = (skill: SkillData): MarketSkill => {
  return {
    id: `${skill.category}/${skill.id}`,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    version: "1.0.0",
    author: "Local",
    author_avatar: undefined,
    installed: true,
    favorited: true,
    installed_version: "1.0.0",
    local_path: skill.path,
    readme: undefined,
    parameters: [],
  };
};

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  t,
  onSendSkillMessage,
  onFileClick,
}) => {
  const [skillFavorites, setSkillFavorites] = useState<MarketSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
      const allMarketSkills = await skillsMarketCommands.getMarketSkills();
      const marketFavorites = allMarketSkills.filter((s) =>
        favoritedIds.includes(s.id),
      );
      const allLocalSkills = await skillsLocalCommands.listLocalSkills();
      const localFavorites = allLocalSkills
        .filter((skill) =>
          favoritedIds.includes(`${skill.category}/${skill.id}`),
        )
        .map(convertLocalToMarket);
      setSkillFavorites([...marketFavorites, ...localFavorites]);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (skill: MarketSkill) => {
    if (!onSendSkillMessage) {
      console.error("onSendSkillMessage is undefined!");
      return;
    }
    const pendingId = `pending_${Date.now()}`;
    await runSkill(skill, onSendSkillMessage, t, pendingId);
  };

  const handleDelete = (skillId: string, skillName: string) => {
    showDialog(
      DialogType.WARNING,
      t("favorites.confirmDeleteTitle") || "Remove Favorite",
      t("favorites.confirmDeleteMessage", { name: skillName }) ||
        `Are you sure you want to remove "${skillName}" from favorites?`,
      async () => {
        try {
          await skillsMarketCommands.unfavoriteSkill(skillId);
          await loadFavorites();
        } catch (error) {
          console.error("Failed to delete favorite:", error);
          showDialog(
            DialogType.ERROR,
            t("favorites.deleteErrorTitle") || "Error",
            t("favorites.deleteErrorMessage") || "Failed to remove favorite",
          );
        }
      },
      undefined,
      t("favorites.confirmDelete") || "Remove",
      t("favorites.cancelDelete") || "Cancel",
    );
  };

  const handleClearSearch = () => {
    setSearchTerm("");
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

  const filteredFavorites = skillFavorites.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const styles: Record<string, React.CSSProperties> = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
      flexShrink: 0,
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    searchInputWrapper: {
      flex: 1,
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "1.5px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      // transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    searchInput: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontSize: "13px",
      padding: "4px 0",
    },
    searchIcon: {
      flexShrink: 0,
      color: "var(--text-tertiary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    clearBtn: {
      background: "transparent",
      border: "none",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      fontSize: "14px",
      padding: "2px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
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
      cursor: "pointer",
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
      color: "var(--text-secondary)",
    },
    iconButtonActive: {
      color: "#f59e0b",
      borderColor: "#f59e0b",
    },
    rightActions: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
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
  };

  const globalStyles = `
    .favorites-search-input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1.5px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      // transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .favorites-search-input-wrapper:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .favorites-search-input-wrapper svg {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
    .favorites-search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 13px;
      padding: 4px 0;
    }
    .favorites-search-clear {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .favorites-search-clear:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "favorites-panel-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }

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
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <div className="favorites-search-input-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="favorites-search-input"
              placeholder={
                t("favorites.searchPlaceholder") || "Search favorites..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="favorites-search-clear"
                onClick={handleClearSearch}
                title={t("favorites.clearSearch") || "Clear search"}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.skillList}>
        {filteredFavorites.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm
              ? t("favorites.noSearchResults") || "No matching favorites found"
              : t("favorites.empty") || "No favorites yet, add one!"}
          </div>
        ) : (
          filteredFavorites.map((skill) => {
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
                onClick={async () => {
                  if (onFileClick && skill.local_path) {
                    try {
                      const content = await filesCommands.readTextFile(
                        skill.local_path,
                      );
                      const skillFile: UploadFile = {
                        id: `skill_${skill.id}`,
                        name: `${skill.name}.skill.md`,
                        path: skill.local_path,
                        size: content.length,
                        file: new File([content], `${skill.name}.skill.md`, {
                          type: "text/markdown",
                        }),
                        type: "text/markdown",
                        status: "success",
                      };
                      onFileClick(skillFile);
                    } catch (error) {
                      console.error("Failed to read skill file:", error);
                    }
                  }
                }}
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
                      style={{
                        ...styles.iconButton,
                        ...styles.iconButtonActive,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(skill.id, skill.name);
                      }}
                      title={t("market.unfavorite") || "Remove"}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(245, 158, 11, 0.15)";
                        e.currentTarget.style.borderColor = "#f59e0b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "#f59e0b";
                      }}
                    >
                      <StarFilledIcon size={12} />
                    </button>
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRun(skill);
                      }}
                      title={t("market.run") || "Run"}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.borderColor =
                          "var(--accent-color)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                        e.currentTarget.style.borderColor =
                          "var(--border-color)";
                      }}
                    >
                      <PlayIcon size={12} />
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
            );
          })
        )}
      </div>
    </div>
  );
};

export default FavoritesPanel;
