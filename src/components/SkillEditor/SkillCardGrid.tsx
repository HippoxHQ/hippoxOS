import React, { useState } from "react";
import { Skill } from "./types";

interface SkillCardGridProps {
  t: (key: string, params?: any) => string;
  skills: Skill[];
  onCreateNew: () => void;
  onSelectSkill: (skill: Skill) => void;
  onDeleteSkill: (skill: Skill, e: React.MouseEvent) => void;
  onFavorite?: (skill: Skill) => void;
  onRun?: (skill: Skill) => void;
}

const SkillCardGrid: React.FC<SkillCardGridProps> = ({
  t,
  skills,
  onCreateNew,
  onSelectSkill,
  onDeleteSkill,
  onFavorite,
  onRun,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [favoritedSkills, setFavoritedSkills] = useState<Set<string>>(
    new Set(),
  );

  const handleFavorite = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritedSkills((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skill.id)) {
        newSet.delete(skill.id);
      } else {
        newSet.add(skill.id);
      }
      return newSet;
    });
    onFavorite?.(skill);
  };

  const handleRun = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    onRun?.(skill);
  };

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

        .installed-badge {
          background: var(--accent-color);
          color: white;
          font-size: 10px;
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
          --text-tertiary: #6b7280;
          --accent-color: #818cf8;
          --accent-hover: #6366f1;
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
          --accent-hover: #4f46e5;
          --accent-glow: rgba(99, 102, 241, 0.2);
          --hover-bg: rgba(0, 0, 0, 0.04);
        }
      `}</style>

      <div className="cards-container">
        <div className="skill-card add-card" onClick={onCreateNew}>
          <div className="add-icon">➕</div>
          <div className="add-text">{t("skillEditor.createNew")}</div>
        </div>

        {skills.map((skill) => {
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
                  {skill.name || t("skillEditor.unnamed")}
                </div>
                <div className="card-actions">
                  <button
                    className={`icon-btn ${isFavorited ? "active" : ""}`}
                    onClick={(e) => handleFavorite(skill, e)}
                    title={
                      isFavorited
                        ? t("skillEditor.unfavorite")
                        : t("skillEditor.favorite")
                    }
                  >
                    {isFavorited ? "⭐" : "☆"}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={(e) => handleRun(skill, e)}
                    title={t("skillEditor.run")}
                  >
                    ▶
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={(e) => onDeleteSkill(skill, e)}
                    title={t("skillEditor.delete")}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="card-meta">
                {skill.installed && (
                  <span className="installed-badge">
                    {t("skillEditor.installed")}
                  </span>
                )}
              </div>
              <div className="card-description">
                {skill.description || t("skillEditor.noDescription")}
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

export default SkillCardGrid;
