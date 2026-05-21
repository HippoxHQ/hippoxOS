import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

const SkillsPanel: React.FC<SkillsPanelProps> = ({ t }) => {
  const [skills, setSkills] = useState<AtomicSkillInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadData = async () => {
      try {
        const skillsData = await invoke('get_atomic_skills') as AtomicSkillInfo[];
        const categoriesData = await invoke('get_skill_categories') as string[];

        setSkills(skillsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load skills:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  const renderSkillsByCategory = () => {
    if (loading) {
      return <div>Loading skills...</div>;
    }
    const skillsByCategory = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, AtomicSkillInfo[]>);
    const categoryIcons: Record<string, string> = {
      file: '📁',
      net: '🌐',
      system: '⚙️',
      db: '🗄️',
      math: '🔢',
      time: '🕐',
      devops: '🚀',
      document: '📄',
      message: '💬',
      task: '⏰',
      general: '⚙️',
    };
    const categoryNames: Record<string, string> = {
      file: t('skills.category.fileSystem'),
      net: t('skills.category.network'),
      system: t('skills.category.system'),
      db: t('skills.category.database'),
      math: '数学计算',
      time: '时间日期',
      devops: 'DevOps',
      document: '文档处理',
      message: '消息通知',
      task: '任务调度',
      general: '通用',
    };
    return Object.entries(skillsByCategory).map(([category, categorySkills]) => (
      <div key={category} className="skill-category">
        <div className="category-title">
          {categoryIcons[category] || '📦'} {categoryNames[category] || category}
        </div>
        <div className="skill-tags">
          {categorySkills.map((skill) => (
            <span key={skill.name} className="skill-tag" title={skill.description}>
              {skill.name}
            </span>
          ))}
        </div>
      </div>
    ));
  };
  return (
    <div className="panel-section">
      <div className="skills-search">
        <input type="text" placeholder={t('skills.searchPlaceholder')} className="skills-search-input" />
      </div>
      <div className="skills-stats">{t('skills.totalCount', { count: skills.length })}</div>
      <div className="skills-categories">
        {renderSkillsByCategory()}
      </div>
    </div>
  );
};

export default SkillsPanel;