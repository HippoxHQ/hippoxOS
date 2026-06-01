import React, { useState, useEffect } from "react";
import { skillsLocalCommands, skillsMarketCommands } from "../../api/skills";
import { SkillData } from "../../types/skill";
import { StarIcon, StarFilledIcon, PlayIcon } from "../../icons";

interface SkillsManagerCardGridProps {
  t: (key: string, params?: any) => string;
  skills: SkillData[];
  onCreateNew: () => void;
  onSelectSkill: (skill: SkillData) => void;
  onDeleteSkill?: (skill: SkillData, e: React.MouseEvent) => void;
  onFavorite?: (skill: SkillData) => void;
  onRun?: (skill: SkillData) => void;
  onRefresh?: () => void;
}

const SkillsManagerCardGrid: React.FC<SkillsManagerCardGridProps> = ({
  t,
  skills: externalSkills,
  onCreateNew,
  onSelectSkill,
  onDeleteSkill,
  onFavorite,
  onRun,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favoritedSkills, setFavoritedSkills] = useState<Set<string>>(
    new Set(),
  );
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
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
      const isFavorited = favoritedSkills.has(skill.id);
      if (isFavorited) {
        await skillsMarketCommands.unfavoriteSkill(skill.id);
        setFavoritedSkills((prev) => {
          const newSet = new Set(prev);
          newSet.delete(skill.id);
          return newSet;
        });
      } else {
        await skillsMarketCommands.favoriteSkill(skill.id);
        setFavoritedSkills((prev) => {
          const newSet = new Set(prev);
          newSet.add(skill.id);
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
        await skillsLocalCommands.deleteSkill(
          skill.id,
          skill.category || "other",
        );
        onRefresh?.();
      } catch (error) {
        console.error("Failed to delete skill:", error);
      }
    }
  };

  const handleRun = (skill: SkillData, e: React.MouseEvent) => {
    e.stopPropagation();
    onRun?.(skill);
    window.dispatchEvent(new CustomEvent("run-skill", { detail: { skill } }));
  };

  if (loading) {
    return (
      <div className="skill-cards-grid">
        <div style={{ textAlign: "center", padding: "40px" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="skill-cards-grid">
      <style>{`
        .skill-cards-grid {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .skill-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .skill-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .add-card {
          background: var(--bg-tertiary);
          border: 2px dashed var(--border-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 160px;
        }

        .add-card:hover {
          border-color: var(--accent-color);
          background: var(--accent-glow);
          transform: translateY(-2px);
        }

        .add-icon {
          font-size: 40px;
          margin-bottom: 8px;
          opacity: 0.6;
        }

        .add-text {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .card-actions {
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .skill-card:hover .card-actions {
          opacity: 1;
        }

        .icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid var(--border-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: var(--text-secondary);
          font-size: 13px;
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
          gap: 12px;
          margin-bottom: 8px;
          font-size: 11px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        .card-category {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .card-steps {
          background: var(--accent-glow);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .card-description {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .card-tag {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          color: var(--text-secondary);
        }

        :root {
          --bg-primary: #0f1117;
          --bg-secondary: #1a1d26;
          --bg-tertiary: #22252f;
          --border-color: #2d303a;
          --text-primary: #e8edf2;
          --text-secondary: #9ca3af;
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
          --accent-color: #6366f1;
          --accent-glow: rgba(99, 102, 241, 0.2);
          --hover-bg: rgba(0, 0, 0, 0.04);
        }
      `}</style>
      <div className="cards-container">
        <div className="skill-card add-card" onClick={onCreateNew}>
          <div className="add-icon">➕</div>
          <div className="add-text">{t("skillsManager.createNew")}</div>
        </div>
        {externalSkills.map((skill) => {
          const isFavorited = favoritedSkills.has(skill.id);
          return (
            <div
              key={skill.id}
              className="skill-card"
              onMouseEnter={() => setHoveredId(skill.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectSkill(skill)}
            >
              <div className="card-header">
                <div className="card-name">
                  {skill.name || t("skillsManager.unnamed")}
                </div>
                <div className="card-actions">
                  <button
                    className={`icon-btn ${isFavorited ? "active" : ""}`}
                    onClick={(e) => handleFavorite(skill, e)}
                    disabled={favoritingId === skill.id}
                    title={
                      isFavorited
                        ? t("skillsManager.unfavorite")
                        : t("skillsManager.favorite")
                    }
                  >
                    {isFavorited ? (
                      <StarFilledIcon size={14} />
                    ) : (
                      <StarIcon size={14} />
                    )}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={(e) => handleRun(skill, e)}
                    title={t("skillsManager.run")}
                  >
                    <PlayIcon size={14} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={(e) =>
                      onDeleteSkill
                        ? onDeleteSkill(skill, e)
                        : handleDelete(skill, e)
                    }
                    title={t("skillsManager.delete")}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="card-meta">
                <span className="card-category">{skill.category}</span>
                <span className="card-steps">{skill.steps.length} steps</span>
              </div>
              <div className="card-description">
                {skill.description || t("skillsManager.noDescription")}
              </div>
              <div className="card-tags">
                {skill.tags &&
                  skill.tags
                    .split(",")
                    .slice(0, 3)
                    .map((tag, idx) => (
                      <span key={idx} className="card-tag">
                        {tag.trim()}
                      </span>
                    ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsManagerCardGrid;
