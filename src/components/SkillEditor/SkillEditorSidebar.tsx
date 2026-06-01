import React, { useState, useEffect } from "react";
import { skillsLocalCommands } from "../../api/skills";
import { SkillData, SkillHistory } from "../../types/skill";

interface SkillEditorSidebarProps {
  t: (key: string, params?: any) => string;
  skills: SkillData[];
  onSkillsChange?: (skills: SkillData[]) => void;
  onSelectHistory?: (history: SkillHistory) => void;
  onSelectSkill?: (skill: SkillData) => void;
}

type HistoryCategoryType =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "older";

const historyCategories: { key: string; type: HistoryCategoryType }[] = [
  { key: "skillEditor.historyCategories.today", type: "today" },
  { key: "skillEditor.historyCategories.yesterday", type: "yesterday" },
  { key: "skillEditor.historyCategories.last7days", type: "last7days" },
  { key: "skillEditor.historyCategories.last30days", type: "last30days" },
  { key: "skillEditor.historyCategories.older", type: "older" },
];

const SkillEditorSidebar: React.FC<SkillEditorSidebarProps> = ({
  t,
  skills,
  onSelectHistory,
}) => {
  const [skillHistory, setSkillHistory] = useState<SkillHistory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<HistoryCategoryType, boolean>
  >({
    today: true,
    yesterday: true,
    last7days: true,
    last30days: true,
    older: true,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await skillsLocalCommands.getAllSkillHistory();
      const sortedHistory = [...history].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setSkillHistory(sortedHistory);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const toggleCategory = (categoryType: HistoryCategoryType) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  };

  const sortedSkills = [...skills].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalSteps = sortedSkills.reduce(
    (acc, skill) => acc + skill.steps.length,
    0,
  );
  const totalMaterials = sortedSkills.reduce(
    (acc, skill) =>
      acc + skill.steps.reduce((a, s) => a + s.materials.length, 0),
    0,
  );
  const incompleteSkills = sortedSkills.filter(
    (s) => !s.description || s.steps.length === 0 || !s.steps[0]?.description,
  ).length;

  const getHistoryCategory = (history: SkillHistory): HistoryCategoryType => {
    const now = new Date();
    const historyDate = new Date(history.timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (historyDate >= today) return "today";
    if (historyDate >= yesterday) return "yesterday";
    if (historyDate >= weekAgo) return "last7days";
    if (historyDate >= monthAgo) return "last30days";
    return "older";
  };

  const getGroupedHistory = () => {
    const grouped: Record<HistoryCategoryType, SkillHistory[]> = {
      today: [],
      yesterday: [],
      last7days: [],
      last30days: [],
      older: [],
    };
    skillHistory.forEach((history) => {
      const category = getHistoryCategory(history);
      grouped[category].push(history);
    });
    return grouped;
  };
  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return "➕";
      case "update":
        return "✏️";
      case "delete":
        return "🗑️";
      default:
        return "📄";
    }
  };
  const getActionText = (action: string): string => {
    switch (action) {
      case "create":
        return t("skillEditor.historyActions.create");
      case "update":
        return t("skillEditor.historyActions.update");
      case "delete":
        return t("skillEditor.historyActions.delete");
      default:
        return t("skillEditor.historyActions.modify");
    }
  };
  const groupedHistory = getGroupedHistory();
  const getUniqueKey = (history: SkillHistory, index: number) => {
    return `${history.id}_${history.timestamp}_${index}`;
  };
  return (
    <div className="skill-editor-sidebar">
      <style>{`
        .skill-editor-sidebar {
          width: 280px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .stats-section {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .stats-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-card {
          background: var(--bg-tertiary);
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
        }

        .stat-number {
          font-size: 20px;
          font-weight: 700;
          color: var(--accent-color);
        }

        .stat-label {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .stat-warning {
          background: rgba(239, 68, 68, 0.1);
        }

        .stat-warning .stat-number {
          color: #ef4444;
        }

        .history-section {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .category-header {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 12px 0 8px 4px;
          letter-spacing: 0.5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .category-header:hover {
          color: var(--text-primary);
        }

        .category-arrow {
          font-size: 12px;
          transition: transform 0.1s;
        }

        .history-card {
          background: var(--bg-secondary); 
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .history-card:hover {
          background: var(--bg-tertiary);
        }

        .history-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .history-info {
          flex: 1;
          min-width: 0;
        }

        .history-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-time {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .history-action {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .empty-history {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        :root {
          --bg-primary: #0f1117;
          --bg-secondary: #1a1d26;
          --bg-tertiary: #22252f;
          --border-color: #2d303a;
          --text-primary: #e8edf2;
          --text-secondary: #9ca3af;
          --accent-color: #818cf8;
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
          --hover-bg: rgba(0, 0, 0, 0.04);
        }
      `}</style>

      <div className="stats-section">
        <div className="stats-title">📊 {t("skillEditor.stats")}</div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{sortedSkills.length}</div>
            <div className="stat-label">{t("skillEditor.totalSkills")}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalSteps}</div>
            <div className="stat-label">{t("skillEditor.totalSteps")}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalMaterials}</div>
            <div className="stat-label">{t("skillEditor.totalMaterials")}</div>
          </div>
          <div
            className={`stat-card ${incompleteSkills > 0 ? "stat-warning" : ""}`}
          >
            <div className="stat-number">{incompleteSkills}</div>
            <div className="stat-label">{t("skillEditor.incomplete")}</div>
          </div>
        </div>
      </div>

      <div className="history-section">
        <div className="stats-title" style={{ marginBottom: "8px" }}>
          📝 {t("skillEditor.modifyHistory")}
        </div>
        {historyCategories.map((category) => {
          const categoryHistory = groupedHistory[category.type];
          if (categoryHistory.length === 0) return null;
          return (
            <div key={category.type}>
              <div
                className="category-header"
                onClick={() => toggleCategory(category.type)}
              >
                <span>{t(category.key)}</span>
                <span
                  className="category-arrow"
                  style={{
                    transform: expandedCategories[category.type]
                      ? "rotate(0deg)"
                      : "rotate(-90deg)",
                  }}
                >
                  ▼
                </span>
              </div>
              {expandedCategories[category.type] &&
                categoryHistory.map((history, idx) => (
                  <div
                    key={getUniqueKey(history, idx)}
                    className="history-card"
                    onMouseEnter={() => setHoveredId(history.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectHistory?.(history)}
                  >
                    <div className="history-icon">
                      {getActionIcon(history.action)}
                    </div>
                    <div className="history-info">
                      <div className="history-title">{history.skill_name}</div>
                      <div className="history-time">
                        {new Date(history.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="history-action">
                      {getActionText(history.action)}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
        {skillHistory.length === 0 && (
          <div className="empty-history">{t("skillEditor.noHistory")}</div>
        )}
      </div>
    </div>
  );
};

export default SkillEditorSidebar;
