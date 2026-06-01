import React, { useState, useEffect } from "react";
import SkillEditorSidebar from "./SkillEditorSidebar";
import SkillCardGrid from "./SkillCardGrid";
import SkillEditorForm from "./SkillEditorForm";
import SkillMarkdownPreview from "./SkillMarkdownPreview";
import { Skill, SkillHistory, SkillEditorProps } from "./types";

const DEFAULT_SKILL: Omit<Skill, "id"> = {
  name: "",
  description: "",
  steps: [{ id: "1", description: "", materials: [], dependencies: [] }],
  tags: "",
  example: "",
};

const MOCK_SKILLS: Skill[] = [
  {
    id: "1",
    name: "网络搜索",
    description: "执行网络搜索功能，获取实时信息",
    steps: [
      {
        id: "1-1",
        description: "解析用户搜索关键词",
        materials: [
          {
            id: "m1",
            type: "link",
            content: "https://api.example.com/search",
            inputSchema:
              '{\n  "query": "string - 搜索关键词",\n  "limit": "number - 结果数量（默认10）"\n}',
            outputSchema: '{\n  "rawData": "object - API原始返回数据"\n}',
          },
        ],
        dependencies: [],
      },
      {
        id: "1-2",
        description: "调用搜索引擎API获取结果",
        materials: [],
        dependencies: ["1-1"],
      },
      {
        id: "1-3",
        description: "整理搜索结果并返回结构化数据",
        materials: [],
        dependencies: ["1-2"],
      },
    ],
    tags: "搜索,网络,信息获取",
    example: '输入："搜索最新的AI新闻"\n输出：返回10条相关的AI新闻链接及摘要',
  },
  {
    id: "2",
    name: "文件处理",
    description: "处理各种文件格式的读写和解析操作",
    steps: [
      {
        id: "2-1",
        description: "识别文件类型",
        materials: [],
        dependencies: [],
      },
      {
        id: "2-2",
        description: "读取文件内容",
        materials: [{ id: "m2", type: "path", content: "/data/uploads/" }],
        dependencies: ["2-1"],
      },
      {
        id: "2-3",
        description: "根据需求处理数据",
        materials: [],
        dependencies: ["2-2"],
      },
      {
        id: "2-4",
        description: "输出处理结果",
        materials: [],
        dependencies: ["2-3"],
      },
    ],
    tags: "文件,数据处理,解析",
    example: '输入："处理这个CSV文件"\n输出：CSV数据的JSON格式数组',
  },
];

const MOCK_HISTORY: SkillHistory[] = [
  {
    id: "h1",
    skillId: "1",
    skillName: "网络搜索",
    action: "update",
    timestamp: new Date().toISOString(),
    details: "更新了执行步骤",
  },
  {
    id: "h2",
    skillId: "2",
    skillName: "文件处理",
    action: "create",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    details: "创建新技能",
  },
  {
    id: "h3",
    skillId: "1",
    skillName: "网络搜索",
    action: "delete",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    details: "删除旧版本",
  },
];

const SkillEditor: React.FC<SkillEditorProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [skillHistory, setSkillHistory] =
    useState<SkillHistory[]>(MOCK_HISTORY);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"form" | "markdown">("form");
  const [showEditor, setShowEditor] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {},
  );

  const loadSkill = (skill: Skill) => {
    setCurrentSkill(JSON.parse(JSON.stringify(skill)));
    setShowEditor(true);
    setHasChanges(false);
    setErrors({});
  };

  const updateCurrentSkill = (updatedSkill: Skill) => {
    setCurrentSkill(updatedSkill);
    setHasChanges(true);
  };

  const validate = (skill: Skill): boolean => {
    const newErrors: { name?: string; description?: string } = {};
    if (!skill.name.trim()) {
      newErrors.name = t("skillEditor.errorNameRequired");
    }
    if (!skill.description.trim()) {
      newErrors.description = t("skillEditor.errorDescriptionRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveCurrentSkill = () => {
    if (!currentSkill) return;
    if (!validate(currentSkill)) return;
    const existingSkill = skills.find((s) => s.id === currentSkill.id);
    const newHistory: SkillHistory = {
      id: `h-${Date.now()}`,
      skillId: currentSkill.id,
      skillName: currentSkill.name,
      action: existingSkill ? "update" : "create",
      timestamp: new Date().toISOString(),
      details: existingSkill ? "更新技能配置" : "创建新技能",
    };
    setSkillHistory((prev) => [newHistory, ...prev]);

    setSkills((prev) =>
      prev.map((s) => (s.id === currentSkill.id ? { ...currentSkill } : s)),
    );
    setHasChanges(false);
  };

  const createNewSkill = () => {
    const newId = Date.now().toString();
    const newSkill: Skill = {
      id: newId,
      name: "",
      description: "",
      steps: [
        { id: `${newId}-1`, description: "", materials: [], dependencies: [] },
      ],
      tags: "",
      example: "",
    };
    setSkills((prev) => [...prev, newSkill]);
    setCurrentSkill(newSkill);
    setShowEditor(true);
    setHasChanges(false);
    setErrors({});
  };

  const deleteSkill = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    // eslint-disable-next-line no-restricted-globals
    if (confirm(t("skillEditor.confirmDelete", { name: skill.name }))) {
      const newHistory: SkillHistory = {
        id: `h-${Date.now()}`,
        skillId: skill.id,
        skillName: skill.name,
        action: "delete",
        timestamp: new Date().toISOString(),
        details: "删除技能",
      };
      setSkillHistory((prev) => [newHistory, ...prev]);

      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      if (currentSkill?.id === skill.id) {
        setCurrentSkill(null);
        setShowEditor(false);
      }
    }
  };

  const closeEditor = () => {
    setShowEditor(false);
    setCurrentSkill(null);
    setHasChanges(false);
    setErrors({});
  };

  const handleFavorite = (skill: Skill) => {
    console.log("Favorite skill:", skill.id);
  };

  const handleRun = (skill: Skill) => {
    console.log("Run skill:", skill.id);
  };

  const handleSelectHistory = (history: SkillHistory) => {
    const targetSkill = skills.find((s) => s.id === history.skillId);
    if (targetSkill) {
      loadSkill(targetSkill);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && currentSkill) {
          saveCurrentSkill();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, currentSkill]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      flex: 1,
      display: "flex",
      height: "100%",
      background: "var(--bg-primary)",
      overflow: "hidden",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    title: {
      margin: 0,
      fontSize: "15px",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    viewToggle: {
      display: "flex",
      background: "var(--bg-tertiary)",
      borderRadius: "6px",
      padding: "2px",
    },
    viewBtn: {
      padding: "4px 10px",
      fontSize: "11px",
      fontWeight: 500,
      border: "none",
      background: "transparent",
      color: "var(--text-secondary)",
      cursor: "pointer",
      borderRadius: "4px",
    },
    viewBtnActive: {
      background: "var(--accent-color)",
      color: "white",
    },
    editorBtn: {
      padding: "5px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 500,
      cursor: "pointer",
      border: "1px solid var(--border-color)",
      background: "var(--bg-tertiary)",
      color: "var(--text-primary)",
    },
    primaryBtn: {
      background: "var(--accent-color)",
      color: "white",
      borderColor: "var(--accent-color)",
    },
    disabledBtn: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  };

  return (
    <div style={styles.container}>
      <SkillEditorSidebar
        t={t}
        skills={skills}
        skillHistory={skillHistory}
        onSelectHistory={handleSelectHistory}
      />

      <div style={styles.main}>
        {!showEditor ? (
          <SkillCardGrid
            t={t}
            skills={skills}
            onCreateNew={createNewSkill}
            onSelectSkill={loadSkill}
            onDeleteSkill={deleteSkill}
            onFavorite={handleFavorite}
            onRun={handleRun}
          />
        ) : (
          currentSkill && (
            <>
              <div style={styles.toolbar}>
                <div>
                  <h2 style={styles.title}>
                    {currentSkill.name || t("skillEditor.unnamed")}
                  </h2>
                </div>
                <div style={styles.actions}>
                  <div style={styles.viewToggle}>
                    <button
                      style={{
                        ...styles.viewBtn,
                        ...(viewMode === "form" ? styles.viewBtnActive : {}),
                      }}
                      onClick={() => setViewMode("form")}
                    >
                      📝 {t("skillEditor.config")}
                    </button>
                    <button
                      style={{
                        ...styles.viewBtn,
                        ...(viewMode === "markdown"
                          ? styles.viewBtnActive
                          : {}),
                      }}
                      onClick={() => setViewMode("markdown")}
                    >
                      📄 {t("skillEditor.raw")}
                    </button>
                  </div>
                  <button
                    style={{
                      ...styles.editorBtn,
                      ...styles.primaryBtn,
                      ...(!hasChanges ? styles.disabledBtn : {}),
                    }}
                    onClick={saveCurrentSkill}
                    disabled={!hasChanges}
                  >
                    💾 {t("skillEditor.save")}
                  </button>
                  <button style={styles.editorBtn} onClick={closeEditor}>
                    ✕ {t("skillEditor.close")}
                  </button>
                </div>
              </div>
              {viewMode === "form" ? (
                <SkillEditorForm
                  t={t}
                  skill={currentSkill}
                  onUpdate={updateCurrentSkill}
                  onSave={saveCurrentSkill}
                  hasChanges={hasChanges}
                  errors={errors}
                  setErrors={setErrors}
                />
              ) : (
                <SkillMarkdownPreview skill={currentSkill} t={t} />
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default SkillEditor;
