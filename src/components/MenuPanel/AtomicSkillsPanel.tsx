import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AtomicSkillsPanelProps {
    t: (key: string, params?: any) => string;
    onSave?: (config: any) => void;
}

interface AtomicSkillInfo {
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    parameters: {
        name: string;
        param_type: string;
        description: string;
        required: boolean;
    }[];
}

const AtomicSkillsPanel: React.FC<AtomicSkillsPanelProps> = ({ t, onSave }) => {
    const [skills, setSkills] = useState<AtomicSkillInfo[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('');
    const tabsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    useEffect(() => {
        loadSkills();
    }, []);

    const loadSkills = async () => {
        try {
            setLoading(true);
            const skillsData = await invoke('get_atomic_skills') as AtomicSkillInfo[];
            const skillsWithEnabled = skillsData.map(skill => ({
                ...skill,
                enabled: true
            }));
            setSkills(skillsWithEnabled);
            const cats = Array.from(new Set(skillsData.map(s => s.category)));
            setCategories(cats);
            if (cats.length > 0) {
                setActiveTab(cats[0]);
            }
        } catch (error) {
            console.error('Failed to load atomic skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSkill = (skillName: string, enabled: boolean) => {
        setSkills(prev => prev.map(skill =>
            skill.name === skillName ? { ...skill, enabled } : skill
        ));
    };

    const handleToggleAllInTab = (category: string, enabled: boolean) => {
        setSkills(prev => prev.map(skill =>
            skill.category === category ? { ...skill, enabled } : skill
        ));
    };

    const handleSave = () => {
        const enabledSkills = skills.filter(s => s.enabled).map(s => s.name);
        const disabledSkills = skills.filter(s => !s.enabled).map(s => s.name);

        const config = {
            enabled_skills: enabledSkills,
            disabled_skills: disabledSkills,
            all_skills: skills
        };

        if (onSave) {
            onSave(config);
        }
    };

    const getCategoryName = (category: string) => {
        const categoryKeyMap: Record<string, string> = {
            file: 'skills.category.fileSystem',
            net: 'skills.category.network',
            system: 'skills.category.system',
            db: 'skills.category.database',
            math: 'skills.category.math',
            time: 'skills.category.time',
            devops: 'skills.category.devops',
            document: 'skills.category.document',
            message: 'skills.category.message',
            task: 'skills.category.task',
            general: 'skills.category.general'
        };
        const key = categoryKeyMap[category];
        return key ? t(key) : category;
    };

    const getCategorySkills = (category: string) => {
        return skills.filter(s => s.category === category);
    };

    const getCategoryEnabledCount = (category: string) => {
        const categorySkills = skills.filter(s => s.category === category);
        const enabledCount = categorySkills.filter(s => s.enabled).length;
        return { enabledCount, totalCount: categorySkills.length };
    };

    const isCategoryFullyEnabled = (category: string) => {
        const { enabledCount, totalCount } = getCategoryEnabledCount(category);
        return enabledCount === totalCount && totalCount > 0;
    };

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const scrollAmount = 200;
            const newScrollLeft = tabsRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
            tabsRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };

    const checkScrollButtons = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    useEffect(() => {
        checkScrollButtons();
        window.addEventListener('resize', checkScrollButtons);
        return () => window.removeEventListener('resize', checkScrollButtons);
    }, [categories]);

    useEffect(() => {
        setTimeout(checkScrollButtons, 0);
    }, [categories]);

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--text-primary)',
        minWidth: '100px',
        flexShrink: 0,
        userSelect: 'none'
    };

    const inputStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
        padding: '8px 12px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        fontSize: '13px',
        outline: 'none'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '6px 16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    };

    const skillCardStyle: React.CSSProperties = {
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        border: '1px solid var(--border-color)'
    };

    const toggleSwitchStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px',
        flexShrink: 0
    };

    const toggleSliderStyle: React.CSSProperties = {
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-tertiary)',
        transition: '0.3s',
        borderRadius: '24px',
        border: '1px solid var(--border-color)'
    };

    const toggleSliderCheckedStyle: React.CSSProperties = {
        backgroundColor: 'var(--accent-color, #0066cc)',
        borderColor: 'var(--accent-color, #0066cc)'
    };

    const toggleKnobStyle: React.CSSProperties = {
        position: 'absolute',
        content: '""',
        height: '18px',
        width: '18px',
        left: '3px',
        bottom: '2px',
        backgroundColor: 'white',
        transition: '0.3s',
        borderRadius: '50%'
    };

    const toggleKnobCheckedStyle: React.CSSProperties = {
        transform: 'translateX(20px)'
    };

    const tabsStyles = `
        .atomic-tabs-container {
            position: relative;
            display: flex;
            align-items: center;
            margin-bottom: 0px;
        }
        .atomic-tabs-scroll {
            flex: 1;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .atomic-tabs-scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
        }
        .atomic-tabs {
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--border-color);
            min-width: max-content;
        }
        .atomic-tab {
            padding: 8px 16px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            border-radius: 6px 6px 0 0;
            white-space: nowrap;
            user-select: none;
        }
        .atomic-tab:hover {
            color: var(--text-primary);
            background: var(--hover-bg);
        }
        .atomic-tab.active {
            color: var(--accent-color, #0066cc);
            border-bottom: 2px solid var(--accent-color, #0066cc);
        }
        .atomic-tab-scroll-btn {
            width: 28px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 16px;
            transition: all 0.2s;
            flex-shrink: 0;
            margin: 0 4px;
            user-select: none;
        }
        .atomic-tab-scroll-btn:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
        }
        .atomic-tab-scroll-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .atomic-tab-scroll-btn.disabled:hover {
            background: var(--bg-secondary);
            color: var(--text-secondary);
        }
    `;

    if (typeof document !== 'undefined') {
        const styleId = 'atomic-tabs-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = tabsStyles;
            document.head.appendChild(style);
        }
    }

    if (loading) {
        return (
            <div className="settings-container" style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', padding: 0, margin: 0, gap: 0,
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                }}>
                    {t('atomicSkills.loading') || '加载中...'}
                </div>
            </div>
        );
    }
    const currentCategorySkills = getCategorySkills(activeTab);
    const { enabledCount, totalCount } = getCategoryEnabledCount(activeTab);
    const isFullyEnabled = isCategoryFullyEnabled(activeTab);
    return (
        <div className="settings-container" style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: 0, margin: 0, gap: 0,
        }}>
            <div className="atomic-tabs-container" style={{ padding: '0px', margin: 0 }}>
                {showLeftArrow && (
                    <button className="atomic-tab-scroll-btn" onClick={() => scrollTabs('left')}>
                        ◀
                    </button>
                )}
                <div
                    className="atomic-tabs-scroll"
                    ref={tabsRef}
                    onScroll={checkScrollButtons}
                >
                    <div className="atomic-tabs">
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`atomic-tab ${activeTab === category ? 'active' : ''}`}
                                onClick={() => setActiveTab(category)}
                            >
                                {getCategoryName(category)}
                            </button>
                        ))}
                    </div>
                </div>
                {showRightArrow && (
                    <button className="atomic-tab-scroll-btn" onClick={() => scrollTabs('right')}>
                        ▶
                    </button>
                )}
            </div>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0 10px',
                margin: 0,
                paddingTop: '10px',
                paddingBottom: '10px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    padding: '0 4px'
                }}>
                    <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)'
                    }}>
                        {t('atomicSkills.stats', { total: totalCount, enabled: enabledCount })}
                    </div>
                    <button
                        style={buttonStyle}
                        onClick={() => handleToggleAllInTab(activeTab, !isFullyEnabled)}
                    >
                        {isFullyEnabled
                            ? (t('atomicSkills.disableAll') || '全部禁用')
                            : (t('atomicSkills.enableAll') || '全部启用')}
                    </button>
                </div>
                {currentCategorySkills.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--text-muted)'
                    }}>
                        {t('atomicSkills.empty')}
                    </div>
                ) : (
                    currentCategorySkills.map((skill) => (
                        <div key={skill.name} style={skillCardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {skill.name}
                                    </span>
                                </div>
                                <label style={toggleSwitchStyle}>
                                    <input
                                        type="checkbox"
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                        checked={skill.enabled}
                                        onChange={(e) => handleToggleSkill(skill.name, e.target.checked)}
                                    />
                                    <span
                                        style={{
                                            ...toggleSliderStyle,
                                            ...(skill.enabled ? toggleSliderCheckedStyle : {})
                                        }}
                                    >
                                        <span
                                            style={{
                                                ...toggleKnobStyle,
                                                ...(skill.enabled ? toggleKnobCheckedStyle : {})
                                            }}
                                        />
                                    </span>
                                </label>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                lineHeight: 1.4
                            }}>
                                {skill.description}
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* <button
                className="settings-save-btn"
                onClick={handleSave}
                style={{
                    padding: '8px 20px',
                    margin: '0 10px 10px auto',
                    background: 'var(--accent-color, #0066cc)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-end'
                }}
            >
                {t('settings.save') || '保存'}
            </button> */}
        </div>
    );
};

export default AtomicSkillsPanel;