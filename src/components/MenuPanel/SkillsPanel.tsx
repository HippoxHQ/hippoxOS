import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExpandArrowsIcon, CollapseIcon } from "../../icons";

interface SkillsPanelProps {
  t: (key: string, params?: any) => string;
}

interface AtomicSkillInfo {
  name: string;
  description: string;
  category: string;
  parameters: {
    name: string;
    param_type: string;
    description: string;
    required: boolean;
  }[];
}

interface CategoryInfo {
  key: string;
  name: string;
  icon: string;
  skills: AtomicSkillInfo[];
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ t }) => {
  const [skills, setSkills] = useState<AtomicSkillInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const skillsData = (await invoke(
          "get_atomic_skills",
        )) as AtomicSkillInfo[];
        setSkills(skillsData);
        const skillsByCategory = skillsData.reduce(
          (acc, skill) => {
            if (!acc[skill.category]) {
              acc[skill.category] = [];
            }
            acc[skill.category].push(skill);
            return acc;
          },
          {} as Record<string, AtomicSkillInfo[]>,
        );
        const categoryIcons: Record<string, string> = {
          file: "📁",
          net: "🌐",
          system: "⚙️",
          db: "🗄️",
          math: "🔢",
          time: "🕐",
          devops: "🚀",
          document: "📄",
          message: "💬",
          task: "⏰",
          general: "🔧",
        };
        const categoryNames: Record<string, string> = {
          file: t("skills.category.fileSystem"),
          net: t("skills.category.network"),
          system: t("skills.category.system"),
          db: t("skills.category.database"),
          math: t("skills.category.math"),
          time: t("skills.category.time"),
          devops: t("skills.category.devops"),
          document: t("skills.category.document"),
          message: t("skills.category.message"),
          task: t("skills.category.task"),
          general: t("skills.category.general"),
        };
        const categoryList = Object.entries(skillsByCategory).map(
          ([key, skillList]) => ({
            key,
            name: categoryNames[key] || key,
            icon: categoryIcons[key] || "📦",
            skills: skillList,
          }),
        );
        setCategories(categoryList);
        if (!initialized) {
          const allExpandedSet = new Set(categoryList.map((c) => c.key));
          setExpandedCategories(allExpandedSet);
          setAllExpanded(true);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Failed to load skills:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [t, initialized]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      const allCategoriesExpanded = categories.every((cat) =>
        newSet.has(cat.key),
      );
      setAllExpanded(allCategoriesExpanded);
      return newSet;
    });
  };

  const toggleSkill = (skillName: string) => {
    setExpandedSkills((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  const toggleAllCategories = () => {
    if (allExpanded) {
      setExpandedCategories(new Set());
      setAllExpanded(false);
    } else {
      const allCategoryKeys = new Set(categories.map((cat) => cat.key));
      setExpandedCategories(allCategoryKeys);
      setAllExpanded(true);
    }
  };

  const getFilteredCategories = () => {
    if (!searchTerm.trim()) {
      return categories;
    }

    const term = searchTerm.toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        skills: category.skills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(term) ||
            skill.description.toLowerCase().includes(term),
        ),
      }))
      .filter((category) => category.skills.length > 0);
  };

  const getParameterTypeColor = (paramType: string): string => {
    const colors: Record<string, string> = {
      string: "#10b981",
      number: "#3b82f6",
      boolean: "#f59e0b",
      array: "#8b5cf6",
      object: "#ec4899",
    };
    return colors[paramType] || "#6b7280";
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
    },
    searchInput: {
      width: "100%",
      padding: "8px 30px 8px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      color: "var(--text-primary)",
      fontSize: "13px",
      outline: "none",
      transition: "all 0.2s",
    },
    clearSearchBtn: {
      position: "absolute" as const,
      right: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: "14px",
      padding: "2px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    expandCollapseBtn: {
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
    stats: {
      fontSize: "12px",
      color: "var(--text-muted)",
      marginTop: "8px",
      paddingLeft: "4px",
    },
    content: {
      flex: 1,
      overflowY: "auto",
    },
    categoryCard: {
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      overflow: "hidden",
    },
    categoryHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      cursor: "pointer",
      transition: "all 0.2s",
      background: "var(--bg-tertiary)",
      userSelect: "none",
    },
    categoryHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    categoryIcon: {
      fontSize: "20px",
    },
    categoryName: {
      fontSize: "15px",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    categoryCount: {
      fontSize: "12px",
      color: "var(--text-muted)",
      background: "var(--bg-secondary)",
      padding: "2px 8px",
      borderRadius: "12px",
    },
    expandIcon: {
      fontSize: "14px",
      color: "var(--text-secondary)",
      transition: "transform 0.2s",
    },
    skillsList: {
      padding: "8px 8px",
    },
    skillItem: {
      background: "var(--bg-primary)",
      borderRadius: "5px",
      marginBottom: "5px",
      border: "1px solid var(--border-color)",
      transition: "all 0.2s",
    },
    skillHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    skillHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flex: 1,
    },
    skillName: {
      fontSize: "14px",
      fontWeight: 500,
      color: "var(--text-primary)",
    },
    skillExpandIcon: {
      fontSize: "12px",
      color: "var(--text-secondary)",
      marginLeft: "8px",
      transition: "transform 0.2s",
    },
    skillDetails: {
      padding: "0 14px 14px 14px",
      borderTop: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
      borderRadius: "0 0 10px 10px",
    },
    skillDescription: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      lineHeight: 1.5,
      marginBottom: "16px",
      paddingTop: "12px",
    },
    parametersTitle: {
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-primary)",
      marginBottom: "10px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    parametersList: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    parameterItem: {
      background: "var(--bg-tertiary)",
      borderRadius: "8px",
      padding: "10px 12px",
      border: "1px solid var(--border-color)",
    },
    parameterHeader: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "6px",
      flexWrap: "wrap",
    },
    parameterName: {
      fontSize: "13px",
      fontWeight: 600,
      color: "var(--text-primary)",
      fontFamily: "monospace",
    },
    parameterType: {
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
      color: "white",
      fontWeight: 500,
    },
    parameterRequired: {
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
      background: "#dc2626",
      color: "white",
    },
    parameterOptional: {
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
      background: "#6b7280",
      color: "white",
    },
    parameterDescription: {
      fontSize: "12px",
      color: "var(--text-secondary)",
      lineHeight: 1.4,
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
    noSearchResults: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--text-muted)",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          {t("atomicSkills.loading") || "Loading skills..."}
        </div>
      </div>
    );
  }

  const filteredCategories = getFilteredCategories();
  const totalSkillsCount = categories.reduce(
    (sum, cat) => sum + cat.skills.length,
    0,
  );
  const hasSearchResults = filteredCategories.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <div style={styles.searchInputWrapper}>
            <input
              ref={searchInputRef}
              type="text"
              style={styles.searchInput}
              placeholder={t("skills.searchPlaceholder") || "Search skills..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                style={styles.clearSearchBtn}
                onClick={handleClearSearch}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            style={styles.expandCollapseBtn}
            onClick={toggleAllCategories}
            title={
              allExpanded
                ? t("terminal.collapseAll") || "Collapse All"
                : t("terminal.expandAll") || "Expand All"
            }
          >
            {allExpanded ? (
              <ExpandArrowsIcon size={18} />
            ) : (
              <CollapseIcon size={18} />
            )}
          </button>
        </div>
        <div style={styles.stats}>
          {searchTerm
            ? `${filteredCategories.reduce((sum, cat) => sum + cat.skills.length, 0)} / ${totalSkillsCount} ${t("skills.totalCount", { count: totalSkillsCount }) || "skills"}`
            : t("skills.totalCount", { count: totalSkillsCount }) ||
              `Total ${totalSkillsCount} skills`}
        </div>
      </div>

      <div style={styles.content}>
        {!hasSearchResults ? (
          <div style={styles.noSearchResults}>
            {searchTerm
              ? t("market.noSearchResults") || "No matching skills found"
              : t("atomicSkills.empty") || "No skills available"}
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.key} style={styles.categoryCard}>
              <div
                style={styles.categoryHeader}
                onClick={() => toggleCategory(category.key)}
              >
                <div style={styles.categoryHeaderLeft}>
                  <span style={styles.categoryIcon}>{category.icon}</span>
                  <span style={styles.categoryName}>{category.name}</span>
                  <span style={styles.categoryCount}>
                    {category.skills.length}
                  </span>
                </div>
                <span
                  style={{
                    ...styles.expandIcon,
                    transform: expandedCategories.has(category.key)
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                  }}
                >
                  ▶
                </span>
              </div>

              {expandedCategories.has(category.key) && (
                <div style={styles.skillsList}>
                  {category.skills.map((skill) => (
                    <div key={skill.name} style={styles.skillItem}>
                      <div
                        style={styles.skillHeader}
                        onClick={() => toggleSkill(skill.name)}
                      >
                        <div style={styles.skillHeaderLeft}>
                          <span style={styles.skillName}>{skill.name}</span>
                          <span
                            style={{
                              ...styles.skillExpandIcon,
                              transform: expandedSkills.has(skill.name)
                                ? "rotate(90deg)"
                                : "rotate(0deg)",
                            }}
                          >
                            ▶
                          </span>
                        </div>
                      </div>

                      {expandedSkills.has(skill.name) && (
                        <div style={styles.skillDetails}>
                          <div style={styles.skillDescription}>
                            {skill.description || "No description available"}
                          </div>

                          {skill.parameters && skill.parameters.length > 0 && (
                            <>
                              <div style={styles.parametersTitle}>
                                📋 Parameters
                              </div>
                              <div style={styles.parametersList}>
                                {skill.parameters.map((param) => (
                                  <div
                                    key={param.name}
                                    style={styles.parameterItem}
                                  >
                                    <div style={styles.parameterHeader}>
                                      <span style={styles.parameterName}>
                                        {param.name}
                                      </span>
                                      <span
                                        style={{
                                          ...styles.parameterType,
                                          background: getParameterTypeColor(
                                            param.param_type,
                                          ),
                                        }}
                                      >
                                        {param.param_type}
                                      </span>
                                      {param.required ? (
                                        <span style={styles.parameterRequired}>
                                          required
                                        </span>
                                      ) : (
                                        <span style={styles.parameterOptional}>
                                          optional
                                        </span>
                                      )}
                                    </div>
                                    <div style={styles.parameterDescription}>
                                      {param.description || "No description"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillsPanel;
