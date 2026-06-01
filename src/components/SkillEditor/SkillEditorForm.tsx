import React, { useState, useEffect } from "react";
import { Skill, ExecutionStep, StepMaterial } from "./types";

interface SkillEditorFormProps {
  t: (key: string, params?: any) => string;
  skill: Skill;
  onUpdate: (skill: Skill) => void;
  onSave: () => void;
  hasChanges: boolean;
  errors: { name?: string; description?: string };
  setErrors: React.Dispatch<
    React.SetStateAction<{ name?: string; description?: string }>
  >;
}

const SkillEditorForm: React.FC<SkillEditorFormProps> = ({
  t,
  skill,
  onUpdate,
  onSave,
  hasChanges,
  errors,
  setErrors,
}) => {
  const [tagList, setTagList] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState("");

  useEffect(() => {
    if (skill.tags) {
      const tags = skill.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      setTagList(tags);
    } else {
      setTagList([]);
    }
  }, [skill.id]);

  const updateField = (
    field: keyof Omit<Skill, "id" | "steps">,
    value: string,
  ) => {
    onUpdate({ ...skill, [field]: value });
    if (field === "name" || field === "description") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const updateStepDescription = (stepId: string, value: string) => {
    const newSteps = skill.steps.map((step) =>
      step.id === stepId ? { ...step, description: value } : step,
    );
    onUpdate({ ...skill, steps: newSteps });
  };

  const addStep = () => {
    const newId = `${skill.id}-step-${Date.now()}`;
    onUpdate({
      ...skill,
      steps: [
        ...skill.steps,
        { id: newId, description: "", materials: [], dependencies: [] },
      ],
    });
  };

  const removeStep = (stepId: string) => {
    if (skill.steps.length <= 1) return;
    const newSteps = skill.steps
      .filter((step) => step.id !== stepId)
      .map((step) => ({
        ...step,
        dependencies: step.dependencies.filter((depId) => depId !== stepId),
      }));
    onUpdate({ ...skill, steps: newSteps });
  };

  const toggleDependency = (stepId: string, dependencyId: string) => {
    const step = skill.steps.find((s) => s.id === stepId);
    if (!step) return;
    const hasDependency = step.dependencies.includes(dependencyId);
    const newDependencies = hasDependency
      ? step.dependencies.filter((id) => id !== dependencyId)
      : [...step.dependencies, dependencyId];
    const newSteps = skill.steps.map((s) =>
      s.id === stepId ? { ...s, dependencies: newDependencies } : s,
    );
    onUpdate({ ...skill, steps: newSteps });
  };

  const addMaterial = (stepId: string) => {
    const newMaterial: StepMaterial = {
      id: `mat-${Date.now()}`,
      type: "link",
      content: "",
    };
    const newSteps = skill.steps.map((step) =>
      step.id === stepId
        ? { ...step, materials: [...step.materials, newMaterial] }
        : step,
    );
    onUpdate({ ...skill, steps: newSteps });
  };

  const updateMaterial = (
    stepId: string,
    materialId: string,
    field: keyof StepMaterial,
    value: string,
  ) => {
    const newSteps = skill.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            materials: step.materials.map((m) =>
              m.id === materialId ? { ...m, [field]: value } : m,
            ),
          }
        : step,
    );
    onUpdate({ ...skill, steps: newSteps });
  };

  const removeMaterial = (stepId: string, materialId: string) => {
    const newSteps = skill.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            materials: step.materials.filter((m) => m.id !== materialId),
          }
        : step,
    );
    onUpdate({ ...skill, steps: newSteps });
  };

  const addTag = (tag: string) => {
    if (tag && !tagList.includes(tag)) {
      const newTags = [...tagList, tag];
      setTagList(newTags);
      onUpdate({ ...skill, tags: newTags.join(",") });
    }
  };

  const removeTag = (index: number) => {
    const newTags = tagList.filter((_, i) => i !== index);
    setTagList(newTags);
    onUpdate({ ...skill, tags: newTags.join(",") });
  };

  const getAvailableDependencies = (currentStepId: string) => {
    const currentIndex = skill.steps.findIndex((s) => s.id === currentStepId);
    return skill.steps.filter((_, idx) => idx < currentIndex);
  };

  return (
    <div className="skill-editor-form">
      <style>{`
        .skill-editor-form {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        /* 表单区块 */
        .form-section {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color);
        }

        .form-section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .form-label.required::after {
          content: " *";
          color: #ef4444;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 6px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 12px;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .form-input.error,
        .form-textarea.error {
          border-color: #ef4444;
        }

        .error-message {
          color: #ef4444;
          font-size: 10px;
          margin-top: 3px;
        }

        .form-textarea {
          resize: vertical;
          min-height: 60px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        /* 标签输入 */
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          min-height: 32px;
          transition: all 0.2s ease;
        }

        .tags-container:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .tag-bubble {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: var(--accent-color);
          color: white;
          font-size: 10px;
          font-weight: 500;
          border-radius: 12px;
        }

        .tag-remove {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          opacity: 0.7;
          transition: opacity 0.15s;
        }

        .tag-remove:hover {
          opacity: 1;
        }

        .tag-input {
          flex: 1;
          min-width: 80px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 11px;
          padding: 4px 0;
          outline: none;
        }

        .tag-input::placeholder {
          color: var(--text-tertiary);
        }

        /* 执行步骤 */
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .step-card {
          background: var(--bg-tertiary);
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .step-number {
          width: 22px;
          height: 22px;
          background: var(--accent-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-input {
          flex: 1;
          min-width: 160px;
          padding: 6px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .step-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .step-actions {
          display: flex;
          gap: 4px;
        }

        .step-action-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 11px;
          transition: all 0.15s ease;
        }

        .step-action-btn:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }

        .step-action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* 依赖关系 */
        .dependencies-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--border-color);
        }

        .dependencies-title {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .dependencies-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .dependency-chip {
          padding: 3px 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dependency-chip:hover {
          border-color: var(--accent-color);
          background: var(--hover-bg);
        }

        .dependency-chip.selected {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: white;
        }

        /* 物料 */
        .materials-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--border-color);
        }

        .materials-title {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .material-item {
          padding: 6px;
          background: var(--bg-primary);
          border-radius: 6px;
        }

        .material-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .material-type-select {
          padding: 4px 6px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .material-type-select:hover {
          border-color: var(--accent-color);
        }

        .material-input {
          flex: 1;
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-primary);
          transition: all 0.15s ease;
        }

        .material-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .material-remove-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 3px;
          color: var(--text-secondary);
          transition: all 0.15s ease;
          border-radius: 4px;
        }

        .material-remove-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .material-schema {
          margin-left: 12px;
          padding-left: 10px;
          border-left: 2px solid var(--border-color);
          margin-top: 6px;
        }

        .schema-label {
          font-size: 9px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 3px;
        }

        .schema-textarea {
          width: 100%;
          padding: 4px 6px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 12px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          resize: vertical;
          margin-bottom: 6px;
          color: var(--text-primary);
          transition: all 0.15s ease;
          min-height: 100px;
        }

        .schema-textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        /* 新增步骤按钮 */
        .add-step-btn {
          margin-top: 8px;
          text-align: center;
          padding: 5px 12px;
          background: transparent;
          border: 1px dashed var(--border-color);
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          color: var(--text-secondary);
          width: 100%;
          transition: all 0.15s ease;
        }

        .add-step-btn:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
          background: var(--accent-glow);
        }

        /* 全局变量 - 与 WelcomePage 保持一致 */
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

      <div className="form-section">
        <div className="form-section-title">
          <span>📝</span>基本信息
        </div>
        <label className="form-label required">技能名称</label>
        <input
          type="text"
          className={`form-input ${errors.name ? "error" : ""}`}
          value={skill.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="例如：天气查询助手"
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span>📖</span>技能描述
        </div>
        <label className="form-label required">这个技能是做什么的？</label>
        <textarea
          className={`form-textarea ${errors.description ? "error" : ""}`}
          value={skill.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={2}
          placeholder="例如：查询全球任意城市的实时天气信息，包括温度、湿度、风力等"
        />
        {errors.description && (
          <div className="error-message">{errors.description}</div>
        )}
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span>🔄</span>执行步骤
        </div>
        <div className="steps-list">
          {skill.steps.map((step, index) => {
            const availableDeps = getAvailableDependencies(step.id);
            return (
              <div key={step.id} className="step-card">
                <div className="step-header">
                  <div className="step-number">{index + 1}</div>
                  <input
                    type="text"
                    className="step-input"
                    value={step.description}
                    onChange={(e) =>
                      updateStepDescription(step.id, e.target.value)
                    }
                    placeholder={`第 ${index + 1} 步...`}
                  />
                  <div className="step-actions">
                    <button
                      className="step-action-btn"
                      onClick={() => addMaterial(step.id)}
                    >
                      + 物料
                    </button>
                    {skill.steps.length > 1 && (
                      <button
                        className="step-action-btn danger"
                        onClick={() => removeStep(step.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {availableDeps.length > 0 && (
                  <div className="dependencies-section">
                    <div className="dependencies-title">🔗 依赖步骤</div>
                    <div className="dependencies-list">
                      {availableDeps.map((depStep, depIdx) => (
                        <div
                          key={depStep.id}
                          className={`dependency-chip ${step.dependencies.includes(depStep.id) ? "selected" : ""}`}
                          onClick={() => toggleDependency(step.id, depStep.id)}
                        >
                          步骤{" "}
                          {skill.steps.findIndex((s) => s.id === depStep.id) +
                            1}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step.materials.length > 0 && (
                  <div className="materials-section">
                    <div className="materials-title">📎 允许使用的物料</div>
                    <div className="materials-list">
                      {step.materials.map((material) => (
                        <div key={material.id} className="material-item">
                          <div className="material-row">
                            <select
                              className="material-type-select"
                              value={material.type}
                              onChange={(e) =>
                                updateMaterial(
                                  step.id,
                                  material.id,
                                  "type",
                                  e.target.value as any,
                                )
                              }
                            >
                              <option value="link">🔗 链接</option>
                              <option value="path">📁 本地路径</option>
                              <option value="note">📝 备注</option>
                            </select>
                            <input
                              type="text"
                              className="material-input"
                              value={material.content}
                              onChange={(e) =>
                                updateMaterial(
                                  step.id,
                                  material.id,
                                  "content",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                material.type === "link"
                                  ? "https://..."
                                  : material.type === "path"
                                    ? "/path/to/file"
                                    : "备注内容..."
                              }
                            />
                            <button
                              className="material-remove-btn"
                              onClick={() =>
                                removeMaterial(step.id, material.id)
                              }
                            >
                              ✕
                            </button>
                          </div>
                          {material.type === "link" && (
                            <div className="material-schema">
                              <div className="schema-label">📥 输入参数</div>
                              <textarea
                                className="schema-textarea"
                                value={material.inputSchema || ""}
                                onChange={(e) =>
                                  updateMaterial(
                                    step.id,
                                    material.id,
                                    "inputSchema",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                placeholder='{"param": "type"}'
                              />
                              <div className="schema-label">📤 输出参数</div>
                              <textarea
                                className="schema-textarea"
                                value={material.outputSchema || ""}
                                onChange={(e) =>
                                  updateMaterial(
                                    step.id,
                                    material.id,
                                    "outputSchema",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                placeholder='{"result": "type"}'
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="add-step-btn" onClick={addStep}>
          + 新增执行步骤
        </button>
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span>🏷️</span>标签
        </div>
        <div className="tags-container">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tagList.map((tag, idx) => (
              <span key={idx} className="tag-bubble">
                {tag}
                <button className="tag-remove" onClick={() => removeTag(idx)}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            className="tag-input"
            placeholder="输入标签后按回车"
            value={currentTagInput}
            onChange={(e) => setCurrentTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(currentTagInput.trim());
                setCurrentTagInput("");
              }
            }}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span>✨</span>示例
        </div>
        <textarea
          className="form-textarea"
          value={skill.example}
          onChange={(e) => updateField("example", e.target.value)}
          rows={3}
          placeholder='例如：输入："北京天气" 输出：{"city": "北京", "temperature": "25°C"}'
        />
      </div>
    </div>
  );
};

export default SkillEditorForm;
