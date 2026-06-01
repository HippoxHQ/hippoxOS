import React, { useState, useEffect, useRef } from "react";
import { Skill, StepMaterial } from "./types";

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
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [isExampleFocused, setIsExampleFocused] = useState(false);
  const [stepFocusStates, setStepFocusStates] = useState<
    Record<string, boolean>
  >({});
  const [materialFocusStates, setMaterialFocusStates] = useState<
    Record<string, boolean>
  >({});
  const [schemaFocusStates, setSchemaFocusStates] = useState<
    Record<string, boolean>
  >({});

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

  const getStepPlaceholder = (
    index: number,
    isFocused: boolean,
    hasValue: boolean,
  ) => {
    if (isFocused || hasValue) return "";
    return t("skillEditor.stepPlaceholder", { index: index + 1 });
  };

  const getMaterialPlaceholder = (
    type: string,
    isFocused: boolean,
    hasValue: boolean,
    materialId: string,
  ) => {
    if (isFocused || hasValue) return "";
    if (type === "link") return "https://...";
    if (type === "path") return "/path/to/file";
    return t("skillEditor.notePlaceholder") || "...";
  };

  const getSchemaPlaceholder = (
    type: "input" | "output",
    isFocused: boolean,
    hasValue: boolean,
  ) => {
    if (isFocused || hasValue) return "";
    if (type === "input") return '{"param": "type"}';
    return '{"result": "type"}';
  };

  return (
    <div className="skill-editor-form">
      <style>{`
  .skill-editor-form {
    flex: 1;
    overflow-y: auto;
  }
  .form-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-color), transparent);
    margin: 4px 0;
  } 
  .form-section {
    background: var(--bg-secondary);
    padding: 18px 20px;
  }

  .form-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .form-label.required::after {
    content: " *";
    color: #ef4444;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 9px 14px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
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
    font-size: 11px;
    margin-top: 4px;
  }

  .form-textarea {
    resize: vertical;
    min-height: 70px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    min-height: 40px;
    transition: all 0.2s ease;
  }

  .tags-container:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .tag-bubble {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: var(--accent-color);
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 14px;
  }

  .tag-remove {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tag-input {
    flex: 1;
    min-width: 100px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 13px;
    padding: 6px 0;
    outline: none;
  }

  .tag-input::placeholder {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .step-card {
    background: var(--bg-tertiary);
    border-radius: 10px;
    padding: 14px 16px;
    border: 1px solid var(--border-color);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .step-number {
    width: 26px;
    height: 26px;
    background: var(--accent-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-input {
    flex: 1;
    min-width: 180px;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    transition: all 0.2s ease;
  }

  .step-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .step-actions {
    display: flex;
    gap: 6px;
  }

  .step-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 12px;
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

  .dependencies-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--border-color);
  }

  .dependencies-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .dependencies-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dependency-chip {
    padding: 5px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    font-size: 11px;
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

  .materials-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--border-color);
  }

  .materials-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .materials-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .material-item {
    padding: 10px;
    background: var(--bg-primary);
    border-radius: 8px;
  }

  .material-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .material-type-select {
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .material-type-select:hover {
    border-color: var(--accent-color);
  }

  .material-input {
    flex: 1;
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 13px;
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
    font-size: 14px;
    padding: 5px;
    color: var(--text-secondary);
    transition: all 0.15s ease;
    border-radius: 4px;
  }

  .material-remove-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .material-schema {
    margin-left: 16px;
    padding-left: 14px;
    border-left: 2px solid var(--border-color);
    margin-top: 10px;
  }

  .schema-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 5px;
  }

  .schema-textarea {
    width: 100%;
    padding: 8px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    resize: vertical;
    margin-bottom: 10px;
    color: var(--text-primary);
    transition: all 0.15s ease;
    min-height: 80px;
  }

  .schema-textarea:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }

  .add-step-btn {
    margin-top: 12px;
    text-align: center;
    padding: 8px 16px;
    background: transparent;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    font-size: 13px;
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
          <span>📝</span>
          {t("skillEditor.basicInfo")}
        </div>
        <label className="form-label required">
          {t("skillEditor.skillName")}
        </label>
        <input
          type="text"
          className={`form-input ${errors.name ? "error" : ""}`}
          value={skill.name}
          onChange={(e) => updateField("name", e.target.value)}
          onFocus={() => setIsNameFocused(true)}
          onBlur={() => setIsNameFocused(false)}
          placeholder={
            isNameFocused || skill.name
              ? ""
              : t("skillEditor.skillNamePlaceholder")
          }
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>
      <div className="form-divider" />

      <div className="form-section">
        <div className="form-section-title">
          <span>📖</span>
          {t("skillEditor.skillDesc")}
        </div>
        <label className="form-label required">
          {t("skillEditor.skillDescLabel")}
        </label>
        <textarea
          className={`form-textarea ${errors.description ? "error" : ""}`}
          value={skill.description}
          onChange={(e) => updateField("description", e.target.value)}
          onFocus={() => setIsDescFocused(true)}
          onBlur={() => setIsDescFocused(false)}
          rows={2}
          placeholder={
            isDescFocused || skill.description
              ? ""
              : t("skillEditor.skillDescPlaceholder")
          }
        />
        {errors.description && (
          <div className="error-message">{errors.description}</div>
        )}
      </div>
      <div className="form-divider" />

      <div className="form-section">
        <div className="form-section-title">
          <span>🔄</span>
          {t("skillEditor.executionSteps")}
        </div>
        <div className="steps-list">
          {skill.steps.map((step, index) => {
            const availableDeps = getAvailableDependencies(step.id);
            const isStepFocused = stepFocusStates[step.id] || false;
            const hasStepValue = !!step.description;
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
                    onFocus={() =>
                      setStepFocusStates((prev) => ({
                        ...prev,
                        [step.id]: true,
                      }))
                    }
                    onBlur={() =>
                      setStepFocusStates((prev) => ({
                        ...prev,
                        [step.id]: false,
                      }))
                    }
                    placeholder={getStepPlaceholder(
                      index,
                      isStepFocused,
                      hasStepValue,
                    )}
                  />
                  <div className="step-actions">
                    <button
                      className="step-action-btn"
                      onClick={() => addMaterial(step.id)}
                    >
                      + {t("skillEditor.addMaterial")}
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
                    <div className="dependencies-title">
                      🔗 {t("skillEditor.dependencies")}
                    </div>
                    <div className="dependencies-list">
                      {availableDeps.map((depStep, depIdx) => (
                        <div
                          key={depStep.id}
                          className={`dependency-chip ${step.dependencies.includes(depStep.id) ? "selected" : ""}`}
                          onClick={() => toggleDependency(step.id, depStep.id)}
                        >
                          {t("skillEditor.step")}{" "}
                          {skill.steps.findIndex((s) => s.id === depStep.id) +
                            1}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step.materials.length > 0 && (
                  <div className="materials-section">
                    <div className="materials-title">
                      📎 {t("skillEditor.allowedMaterials")}
                    </div>
                    <div className="materials-list">
                      {step.materials.map((material) => {
                        const materialFocusKey = `${step.id}-${material.id}`;
                        const isMaterialFocused =
                          materialFocusStates[materialFocusKey] || false;
                        const hasMaterialValue = !!material.content;
                        const isSchemaInputFocused =
                          schemaFocusStates[`${materialFocusKey}-input`] ||
                          false;
                        const isSchemaOutputFocused =
                          schemaFocusStates[`${materialFocusKey}-output`] ||
                          false;
                        const hasInputSchema = !!material.inputSchema;
                        const hasOutputSchema = !!material.outputSchema;
                        return (
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
                                <option value="link">
                                  🔗 {t("skillEditor.link")}
                                </option>
                                <option value="path">
                                  📁 {t("skillEditor.path")}
                                </option>
                                <option value="note">
                                  📝 {t("skillEditor.note")}
                                </option>
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
                                onFocus={() =>
                                  setMaterialFocusStates((prev) => ({
                                    ...prev,
                                    [materialFocusKey]: true,
                                  }))
                                }
                                onBlur={() =>
                                  setMaterialFocusStates((prev) => ({
                                    ...prev,
                                    [materialFocusKey]: false,
                                  }))
                                }
                                placeholder={getMaterialPlaceholder(
                                  material.type,
                                  isMaterialFocused,
                                  hasMaterialValue,
                                  material.id,
                                )}
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
                                <div className="schema-label">
                                  📥 {t("skillEditor.inputParams")}
                                </div>
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
                                  onFocus={() =>
                                    setSchemaFocusStates((prev) => ({
                                      ...prev,
                                      [`${materialFocusKey}-input`]: true,
                                    }))
                                  }
                                  onBlur={() =>
                                    setSchemaFocusStates((prev) => ({
                                      ...prev,
                                      [`${materialFocusKey}-input`]: false,
                                    }))
                                  }
                                  rows={2}
                                  placeholder={getSchemaPlaceholder(
                                    "input",
                                    isSchemaInputFocused,
                                    hasInputSchema,
                                  )}
                                />
                                <div className="schema-label">
                                  📤 {t("skillEditor.outputParams")}
                                </div>
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
                                  onFocus={() =>
                                    setSchemaFocusStates((prev) => ({
                                      ...prev,
                                      [`${materialFocusKey}-output`]: true,
                                    }))
                                  }
                                  onBlur={() =>
                                    setSchemaFocusStates((prev) => ({
                                      ...prev,
                                      [`${materialFocusKey}-output`]: false,
                                    }))
                                  }
                                  rows={2}
                                  placeholder={getSchemaPlaceholder(
                                    "output",
                                    isSchemaOutputFocused,
                                    hasOutputSchema,
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="add-step-btn" onClick={addStep}>
          + {t("skillEditor.addStep")}
        </button>
      </div>
      <div className="form-divider" />

      <div className="form-section">
        <div className="form-section-title">
          <span>🏷️</span>
          {t("skillEditor.tags")}
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
            placeholder={t("skillEditor.tagsPlaceholder")}
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
      <div className="form-divider" />

      <div className="form-section">
        <div className="form-section-title">
          <span>✨</span>
          {t("skillEditor.example")}
        </div>
        <textarea
          className="form-textarea"
          value={skill.example}
          onChange={(e) => updateField("example", e.target.value)}
          onFocus={() => setIsExampleFocused(true)}
          onBlur={() => setIsExampleFocused(false)}
          rows={3}
          placeholder={
            isExampleFocused || skill.example
              ? ""
              : t("skillEditor.examplePlaceholder")
          }
        />
      </div>
      <div className="form-divider" />
    </div>
  );
};

export default SkillEditorForm;
