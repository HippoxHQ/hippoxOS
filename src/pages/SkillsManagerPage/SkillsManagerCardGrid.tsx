import React, { useState, useEffect } from "react";
import { SkillData } from "../../types/skill";
import { StarIcon, StarFilledIcon, PlayIcon, DeleteIcon, SearchIcon } from "../../icons";
import { skillsMarketCommands, skillsLocalCommands } from "../../command/skills";
import { UploadFile } from "../../core/types";
import { runSkill } from "../../components/MenuPanel/utils/skillRunner";
interface SkillsManagerCardGridProps {
  t: (key: string, params?: any) => string;
  skills: SkillData[];
  onCreateNew: () => void;
  onCreateNewWithCategory?: (category: string) => void;
  onSelectSkill: (skill: SkillData) => void;
  onDeleteSkill?: (skill: SkillData, e: React.MouseEvent) => void;
  onFavorite?: (skill: SkillData) => void;
  onRun?: (skill: SkillData) => void;
  onRefresh?: () => void;
  onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
}
const SkillsManagerCardGrid: React.FC<SkillsManagerCardGridProps> = ({
  t,
  skills: externalSkills,
  onCreateNew,
  onCreateNewWithCategory,
  onSelectSkill,
  onDeleteSkill,
  onFavorite,
  onRun,
  onRefresh,
  onSendSkillMessage,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favoritedSkills, setFavoritedSkills] = useState<Set<string>>(new Set());
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    loadFavorites();
  }, []);
  const loadFavorites = async () => {
    try {
      const favoritedIds = await skillsMarketCommands.getFavoritedSkills();
      setFavoritedSkills(new Set(favoritedIds));
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };
  const handleFavorite = async (skill: SkillData, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritingId(skill.id);
    try {
      const favoriteId = `${skill.category}/${skill.id}`;
      const isFavorited = favoritedSkills.has(favoriteId);
      if (isFavorited) {
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
      onFavorite?.(skill);
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
    onRun?.(skill);
  };
  const isFavorited = (skill: SkillData): boolean => {
    return favoritedSkills.has(`${skill.category}/${skill.id}`);
  };
  const filteredSkills = externalSkills.filter((skill) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return skill.name.toLowerCase().includes(term) || skill.description.toLowerCase().includes(term) || (skill.tags && skill.tags.toLowerCase().includes(term));
  });
  const groupedSkills = filteredSkills.reduce<Record<string, SkillData[]>>((acc, skill) => {
    const category = skill.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});
  const getCategoryColor = (category: string): string => {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#eab308", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#ef4444", "#14b8a6", "#a855f7", "#d946ef", "#f97316", "#0ea5e9"];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = (hash << 5) - hash + category.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const handleCreateWithCategory = (category: string) => {
    if (onCreateNewWithCategory) {
      onCreateNewWithCategory(category);
    } else {
      onCreateNew();
    }
  };
  return (
    <div className="skill-cards-grid">
      <style>{`
        .skill-cards-grid {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          user-select: none;
          min-width: 0;
        }
        .search-bar-wrapper {
          background: var(--bg-secondary);
          padding: 8px 16px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }
        .skill-manager-search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .skill-manager-search-input-wrapper:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }
        .skill-manager-search-input-wrapper svg {
          flex-shrink: 0;
          color: var(--text-tertiary);
        }
        .search-input {
          flex: 1;
          min-width: 0;
          width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          padding: 2px 0;
        }
        .search-input::placeholder {
          color: var(--text-tertiary);
          font-size: 12px;
        }
        .search-clear {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .search-clear:hover {
          color: var(--text-primary);
          background: var(--hover-bg);
        }
        .search-stats {
          font-size: 11px;
          color: var(--text-tertiary);
          white-space: nowrap;
          flex-shrink: 0;
          padding-left: 6px;
          border-left: 1px solid var(--border-color);
        }
        .search-add-btn {
          flex-shrink: 0;
          padding: 6px 12px;
          background: var(--accent-color);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .search-add-btn:hover {
          opacity: 0.85;
        }
        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          padding: 5px 0;
          min-width: 0;
        }
        .category-section {
          margin-bottom: 10px;
          padding: 0px 10px;
          min-width: 0;
        }
        .category-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 4px 10px 4px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 10px;
        }
        .category-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .category-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .category-count {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 400;
          flex-shrink: 0;
        }
        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          min-width: 0;
        }
        @media (max-width: 600px) {
          .cards-container {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
        }
        .skill-card {
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          padding: 10px 12px;
          cursor: pointer;
          height: 130px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .skill-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .add-card {
          background: var(--bg-tertiary);
          border: 2px dashed var(--border-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 130px;
          min-width: 0;
        }
        .add-card:hover {
          border-color: var(--accent-color);
          background: var(--accent-glow);
          transform: translateY(-2px);
        }
        .add-icon {
          font-size: 24px;
          margin-bottom: 4px;
          opacity: 0.6;
        }
        .add-text {
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
          flex-shrink: 0;
          min-width: 0;
        }
        .card-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 6px;
          min-width: 0;
        }
        .card-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          flex-shrink: 0;
        }
        .skill-card:hover .card-actions {
          opacity: 1;
        }
        @media (max-width: 500px) {
          .card-actions {
            opacity: 1;
          }
        }
        .icon-btn {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid var(--border-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-size: 10px;
          flex-shrink: 0;
        }
        .icon-btn:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
          border-color: var(--accent-color);
        }
        .icon-btn.active {
          color: #f59e0b;
          border-color: #f59e0b;
        }
        .icon-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: #ef4444;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
          font-size: 10px;
          color: var(--text-tertiary);
          flex-shrink: 0;
          flex-wrap: nowrap;
          overflow: hidden;
          max-width: 100%;
        }
        .card-meta-item {
          background: var(--bg-tertiary);
          padding: 1px 6px;
          border-radius: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          min-width: 0;
          max-width: 60px;
        }
        .card-meta-item.equal {
          flex: 1;
          max-width: none;
        }
        .card-meta-item.fixed {
          flex: 0 0 auto;
          max-width: 50px;
        }
        .card-description {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-tertiary);
        }
        .empty-state-icon {
          font-size: 40px;
          margin-bottom: 10px;
          opacity: 0.5;
        }
        .empty-state-text {
          font-size: 13px;
        }
        .no-results {
          text-align: center;
          padding: 30px 20px;
          color: var(--text-tertiary);
        }
        .no-results-icon {
          font-size: 28px;
          margin-bottom: 6px;
          opacity: 0.5;
        }
        .no-results-text {
          font-size: 12px;
        }
        :root {
          --bg-primary: #0f1117;
          --bg-secondary: #1a1d26;
          --bg-tertiary: #22252f;
          --border-color: #2d303a;
          --text-primary: #e8edf2;
          --text-secondary: #9ca3af;
          --text-tertiary: #6b7280;
          --accent-color: #818cf8;
          --accent-glow: rgba(129, 140, 248, 0.2);
          --hover-bg: rgba(232, 237, 242, 0.08);
        }
        [data-theme="light"] {
          --bg-primary: #f3f4f6;
          --bg-secondary: #ffffff;
          --bg-tertiary: #e5e7eb;
          --border-color: #d1d5db;
          --text-primary: #111827;
          --text-secondary: #4b5563;
          --text-tertiary: #9ca3af;
          --accent-color: #6366f1;
          --accent-glow: rgba(99, 102, 241, 0.2);
          --hover-bg: rgba(0, 0, 0, 0.04);
        }
      `}</style>
      <div className="search-bar-wrapper">
        <div className="skill-manager-search-input-wrapper">
          <SearchIcon />
          <input type="text" className="search-input" placeholder={t("skillsManager.searchPlaceholder") || "搜索技能..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
          <span className="search-stats">
            {filteredSkills.length} / {externalSkills.length}
          </span>
        </div>
        <button className="search-add-btn" onClick={onCreateNew}>
          + {t("skillsManager.createNew")}
        </button>
      </div>
      <div className="scrollable-content">
        {externalSkills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">{t("skillsManager.noSkills")}</div>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div className="no-results-text">{t("skillsManager.noSearchResults") || "没有找到匹配的技能"}</div>
          </div>
        ) : (
          Object.keys(groupedSkills).map((category) => {
            const skillsInCategory = groupedSkills[category];
            const categoryColor = getCategoryColor(category);
            return (
              <div key={category} className="category-section">
                <div className="category-header">
                  <span className="category-dot" style={{ background: categoryColor }} />
                  <span className="category-name">{category}</span>
                  <span className="category-count">({skillsInCategory.length})</span>
                </div>
                <div className="cards-container">
                  {skillsInCategory.map((skill) => {
                    const favorited = isFavorited(skill);
                    const tags = skill.tags ? skill.tags.split(",").filter((tag) => tag.trim()) : [];
                    const displayTags = tags.slice(0, 3);
                    return (
                      <div key={skill.id} className="skill-card" onMouseEnter={() => setHoveredId(skill.id)} onMouseLeave={() => setHoveredId(null)} onClick={() => onSelectSkill(skill)}>
                        <div className="card-header">
                          <div className="card-name" title={skill.name}>
                            {skill.name || t("skillsManager.unnamed")}
                          </div>
                          <div className="card-actions">
                            <button
                              className={`icon-btn ${favorited ? "active" : ""}`}
                              onClick={(e) => handleFavorite(skill, e)}
                              disabled={favoritingId === skill.id}
                              title={favorited ? t("skillsManager.unfavorite") : t("skillsManager.favorite")}
                            >
                              {favorited ? <StarFilledIcon size={11} /> : <StarIcon size={11} />}
                            </button>
                            <button className="icon-btn" onClick={(e) => handleRun(skill, e)} title={t("skillsManager.run")}>
                              <PlayIcon size={11} />
                            </button>
                            <button className="icon-btn danger" onClick={(e) => (onDeleteSkill ? onDeleteSkill(skill, e) : handleDelete(skill, e))} title={t("skillsManager.delete")}>
                              <DeleteIcon size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="card-meta">
                          <span className="card-meta-item fixed">{skill.steps.length}s</span>
                          {displayTags.map((tag, idx) => (
                            <span key={idx} className="card-meta-item fixed" title={tag.trim()}>
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                        <div className="card-description">{skill.description || t("skillsManager.noDescription")}</div>
                      </div>
                    );
                  })}
                  <div className="skill-card add-card" onClick={() => handleCreateWithCategory(category)}>
                    <div className="add-icon">➕</div>
                    <div className="add-text">{t("skillsManager.createNew")}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default SkillsManagerCardGrid;
