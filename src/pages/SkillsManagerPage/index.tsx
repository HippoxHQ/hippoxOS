import React, { useState, useEffect } from "react";
import SkillsManagerSidebar from "./SkillsManagerSidebar";
import SkillCardGrid from "./SkillsManagerCardGrid";
import SkillsManagerForm from "./SkillsManagerForm";
import SkillMarkdownPreview from "./SkillsManagerMarkdownPreview";
import {
  SkillData,
  SkillHistory,
  CreateSkillRequest,
  UpdateSkillRequest,
} from "../../types/skill";
import { skillsLocalCommands } from "../../command/skills";
import { showToast, ToastType } from "../../components/Toast";

interface SkillsManagerProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}

const convertToBackendSteps = (
  steps: any[],
): Array<{ name: string; description: string; materials: string[] }> => {
  return steps.map((step, index) => ({
    name: step.name || step.description?.slice(0, 50) || `Step ${index + 1}`,
    description: step.description || "",
    materials:
      step.materials
        ?.map((m: any) => {
          if (typeof m === "string") return m;
          if (m.content) return m.content;
          if (m.name) return m.name;
          return "";
        })
        .filter((m: string) => m) || [],
  }));
};

const convertToFrontendSteps = (
  steps: Array<{ name: string; description: string; materials: string[] }>,
): any[] => {
  return steps.map((step, index) => ({
    id: `step-${Date.now()}-${index}`,
    name: step.name,
    description: step.description,
    materials: step.materials.map((m, idx) => ({
      id: `material-${Date.now()}-${idx}`,
      type: m.startsWith("http") ? "link" : "text",
      content: m,
    })),
    dependencies: [],
  }));
};

const sanitizeFolderName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .trim();
};

const SkillsManager: React.FC<SkillsManagerProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [skillHistory, setSkillHistory] = useState<SkillHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSkill, setCurrentSkill] = useState<SkillData | null>(null);
  const [currentFrontendSkill, setCurrentFrontendSkill] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"form" | "markdown">("form");
  const [showEditor, setShowEditor] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {},
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [skillList, history] = await Promise.all([
        skillsLocalCommands.listLocalSkills(),
        skillsLocalCommands.getAllSkillHistory(),
      ]);
      const sortedSkills = [...skillList].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setSkills(sortedSkills);
      setSkillHistory(history);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadSkill = (skill: SkillData) => {
    setCurrentSkill(skill);
    setCurrentFrontendSkill({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      steps: convertToFrontendSteps(skill.steps),
      tags: skill.tags,
      example: "",
      category: skill.category,
    });
    setShowEditor(true);
    setHasChanges(false);
    setErrors({});
  };

  const updateCurrentSkill = (updatedFrontendSkill: any) => {
    setCurrentFrontendSkill(updatedFrontendSkill);
    setHasChanges(true);
  };

  const validate = (skill: any): boolean => {
    const newErrors: { name?: string; description?: string } = {};
    if (!skill.name?.trim()) {
      newErrors.name = t("skillsManager.errorNameRequired");
    }
    if (!skill.description?.trim()) {
      newErrors.description = t("skillsManager.errorDescriptionRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveCurrentSkill = async () => {
    if (!currentFrontendSkill) return;
    if (!validate(currentFrontendSkill)) return;
    try {
      const backendSteps = convertToBackendSteps(currentFrontendSkill.steps);
      if (currentSkill) {
        const request: UpdateSkillRequest = {
          id: currentSkill.id,
          old_category: currentSkill.category || "other",
          name: currentFrontendSkill.name,
          description: currentFrontendSkill.description,
          category: currentFrontendSkill.category || "general",
          tags: currentFrontendSkill.tags || "",
          steps: backendSteps,
        };
        await skillsLocalCommands.updateSkill(request);
        showToast(ToastType.SUCCESS, t("skillsManager.saveSuccess"));
      } else {
        const request: CreateSkillRequest = {
          name: currentFrontendSkill.name,
          description: currentFrontendSkill.description,
          category: currentFrontendSkill.category || "general",
          tags: currentFrontendSkill.tags || "",
          steps: backendSteps,
        };
        await skillsLocalCommands.createSkill(request);
        showToast(ToastType.SUCCESS, t("skillsManager.createSuccess"));
      }
      await loadData();
      setHasChanges(false);
      setShowEditor(false);
      setCurrentSkill(null);
      setCurrentFrontendSkill(null);
    } catch (error) {
      console.error("Failed to save skill:", error);
      showToast(ToastType.ERROR, t("skillsManager.saveFailed"));
    }
  };

  const createNewSkill = () => {
    setCurrentSkill(null);
    setCurrentFrontendSkill({
      id: `temp-${Date.now()}`,
      name: "",
      description: "",
      steps: [
        {
          id: `step-${Date.now()}`,
          name: "",
          description: "",
          materials: [],
          dependencies: [],
        },
      ],
      tags: "",
      example: "",
      category: "other",
    });
    setShowEditor(true);
    setHasChanges(false);
    setErrors({});
  };

  const closeEditor = () => {
    setShowEditor(false);
    setCurrentSkill(null);
    setCurrentFrontendSkill(null);
    setHasChanges(false);
    setErrors({});
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && currentFrontendSkill) {
          saveCurrentSkill();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, currentFrontendSkill]);

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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <SkillsManagerSidebar
        t={t}
        skills={skills}
        onSelectSkill={loadSkill}
        selectedSkillId={currentSkill?.id}
      />
      <div style={styles.main}>
        {!showEditor ? (
          <SkillCardGrid
            t={t}
            skills={skills}
            onCreateNew={createNewSkill}
            onCreateNewWithCategory={(category) => {
              setCurrentSkill(null);
              setCurrentFrontendSkill({
                id: `temp-${Date.now()}`,
                name: "",
                description: "",
                steps: [
                  {
                    id: `step-${Date.now()}`,
                    name: "",
                    description: "",
                    materials: [],
                    dependencies: [],
                  },
                ],
                tags: "",
                example: "",
                category: category,
              });
              setShowEditor(true);
              setHasChanges(false);
              setErrors({});
            }}
            onSelectSkill={loadSkill}
            onRefresh={loadData}
          />
        ) : (
          currentFrontendSkill && (
            <>
              <div style={styles.toolbar}>
                <div>
                  <h2 style={styles.title}>
                    {currentFrontendSkill.name || t("skillsManager.unnamed")}
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
                      📝 {t("skillsManager.config")}
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
                      📄 {t("skillsManager.raw")}
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
                    💾 {t("skillsManager.save")}
                  </button>
                  <button style={styles.editorBtn} onClick={closeEditor}>
                    ✕ {t("skillsManager.close")}
                  </button>
                </div>
              </div>
              {viewMode === "form" ? (
                <SkillsManagerForm
                  t={t}
                  skill={currentFrontendSkill}
                  onUpdate={updateCurrentSkill}
                  onSave={saveCurrentSkill}
                  hasChanges={hasChanges}
                  errors={errors}
                  setErrors={setErrors}
                />
              ) : (
                <SkillMarkdownPreview skill={currentFrontendSkill} t={t} />
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default SkillsManager;
