import React, { useState } from "react";
import { Skill, StepMaterial } from "../types";
import { formStyles } from "./styles";
import { useTagList, useCategoryInput, useFocusStates, useStepHandlers, useTagHandlers, useCategoryHandler } from "./hooks";
import { StepCard, SectionHeader, FormLabel, TagList } from "./components";
import { BasicInfoIcon, DescriptionIcon, StepsIcon, AddIcon, TagsIcon, CategoryIcon2, ExampleIcon } from "../../../icons";
interface SkillsManagerFormProps {
  t: (key: string, params?: any) => string;
  skill: Skill;
  onUpdate: (skill: Skill) => void;
  onSave: () => void;
  hasChanges: boolean;
  errors: { name?: string; description?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ name?: string; description?: string }>>;
}
const SkillsManagerForm: React.FC<SkillsManagerFormProps> = ({ t, skill, onUpdate, onSave, hasChanges, errors, setErrors }) => {
  const [currentTagInput, setCurrentTagInput] = useState("");
  const { tagList, setTagList } = useTagList(skill);
  const { currentCategoryInput, setCurrentCategoryInput } = useCategoryInput(skill);
  const {
    isNameFocused,
    setIsNameFocused,
    isDescFocused,
    setIsDescFocused,
    isExampleFocused,
    setIsExampleFocused,
    stepFocusStates,
    setStepFocusStates,
    materialFocusStates,
    setMaterialFocusStates,
    schemaFocusStates,
    setSchemaFocusStates,
  } = useFocusStates();
  const { updateStepDescription, addStep, removeStep, toggleDependency, addMaterial, updateMaterial, removeMaterial, getAvailableDependencies } = useStepHandlers(skill, onUpdate);
  const { addTag, removeTag } = useTagHandlers(skill, onUpdate, tagList, setTagList);
  const { updateCategory } = useCategoryHandler(skill, onUpdate, setCurrentCategoryInput);
  const updateField = (field: keyof Omit<Skill, "id" | "steps">, value: string) => {
    onUpdate({ ...skill, [field]: value });
    if (field === "name" || field === "description") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };
  const getStepPlaceholder = (index: number, isFocused: boolean, hasValue: boolean) => {
    if (isFocused || hasValue) return "";
    return t("skillsManager.stepPlaceholder", { index: index + 1 });
  };
  const getMaterialPlaceholder = (type: string, isFocused: boolean, hasValue: boolean, materialId: string) => {
    if (isFocused || hasValue) return "";
    if (type === "link") return "https://...";
    if (type === "path") return "/path/to/file";
    return t("skillsManager.notePlaceholder") || "...";
  };
  const getSchemaPlaceholder = (type: "input" | "output", isFocused: boolean, hasValue: boolean) => {
    if (isFocused || hasValue) return "";
    if (type === "input") return '{"param": "type"}';
    return '{"result": "type"}';
  };
  return (
    <div className="skill-editor-form">
      <style>{formStyles}</style>
      <div className="form-section">
        <SectionHeader icon={<BasicInfoIcon size={14} />} title={t("skillsManager.basicInfo")} />
        <FormLabel required>{t("skillsManager.skillName")}</FormLabel>
        <input
          type="text"
          className={`form-input ${errors.name ? "error" : ""}`}
          value={skill.name}
          onChange={(e) => updateField("name", e.target.value)}
          onFocus={() => setIsNameFocused(true)}
          onBlur={() => setIsNameFocused(false)}
          placeholder={isNameFocused || skill.name ? "" : t("skillsManager.skillNamePlaceholder")}
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>
      <div className="form-divider" />
      <div className="form-section">
        <SectionHeader icon={<DescriptionIcon size={14} />} title={t("skillsManager.skillDesc")} />
        <FormLabel required>{t("skillsManager.skillDescLabel")}</FormLabel>
        <textarea
          className={`form-textarea ${errors.description ? "error" : ""}`}
          value={skill.description}
          onChange={(e) => updateField("description", e.target.value)}
          onFocus={() => setIsDescFocused(true)}
          onBlur={() => setIsDescFocused(false)}
          rows={2}
          placeholder={isDescFocused || skill.description ? "" : t("skillsManager.skillDescPlaceholder")}
        />
        {errors.description && <div className="error-message">{errors.description}</div>}
      </div>
      <div className="form-divider" />
      <div className="form-section">
        <SectionHeader icon={<StepsIcon size={14} />} title={t("skillsManager.executionSteps")} />
        <div className="steps-list">
          {skill.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              skill={skill}
              stepFocusStates={stepFocusStates}
              materialFocusStates={materialFocusStates}
              schemaFocusStates={schemaFocusStates}
              onStepFocus={(id, focused) => setStepFocusStates((prev) => ({ ...prev, [id]: focused }))}
              onMaterialFocus={(key, focused) => setMaterialFocusStates((prev) => ({ ...prev, [key]: focused }))}
              onSchemaFocus={(key, focused) => setSchemaFocusStates((prev) => ({ ...prev, [key]: focused }))}
              onUpdateStepDescription={updateStepDescription}
              onRemoveStep={removeStep}
              onAddMaterial={addMaterial}
              onToggleDependency={toggleDependency}
              onUpdateMaterial={updateMaterial}
              onRemoveMaterial={removeMaterial}
              getAvailableDependencies={getAvailableDependencies}
              getStepPlaceholder={getStepPlaceholder}
              getMaterialPlaceholder={getMaterialPlaceholder}
              getSchemaPlaceholder={getSchemaPlaceholder}
              t={t}
            />
          ))}
        </div>
        <button className="add-step-btn" onClick={addStep}>
          <AddIcon size={14} /> {t("skillsManager.addStep")}
        </button>
      </div>
      <div className="form-divider" />
      <div className="form-section">
        <div className="two-column-labels">
          <div className="column-label">
            <SectionHeader icon={<TagsIcon size={14} />} title={t("skillsManager.tags")} />
          </div>
          <div className="column-label">
            <SectionHeader icon={<CategoryIcon2 size={14} />} title={t("skillsManager.category")} />
          </div>
        </div>
        <div className="two-column-row">
          <div className="tags-container">
            <TagList tags={tagList} onRemoveTag={removeTag} />
            <input
              type="text"
              className="tag-input"
              placeholder={t("skillsManager.tagsPlaceholder")}
              value={currentTagInput}
              onChange={(e) => setCurrentTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (currentTagInput.trim()) {
                    addTag(currentTagInput.trim());
                    setCurrentTagInput("");
                  }
                }
              }}
            />
          </div>
          <div className="category-container">
            <span className="tag-bubble" style={{ background: "var(--accent-color)" }}>
              {skill.category && skill.category !== "other" ? skill.category : "other"}
              <button className="tag-remove" onClick={() => updateCategory("other")}>
                ×
              </button>
            </span>
            <input
              type="text"
              className="category-input"
              placeholder=""
              value={currentCategoryInput}
              onChange={(e) => setCurrentCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = currentCategoryInput.trim();
                  if (value) {
                    updateCategory(value);
                  }
                  setCurrentCategoryInput("");
                }
              }}
            />
          </div>
        </div>
      </div>
      <div className="form-divider" />
      <div className="form-section">
        <SectionHeader icon={<ExampleIcon size={14} />} title={t("skillsManager.example")} />
        <textarea
          className="form-textarea"
          value={skill.example}
          onChange={(e) => updateField("example", e.target.value)}
          onFocus={() => setIsExampleFocused(true)}
          onBlur={() => setIsExampleFocused(false)}
          rows={3}
          placeholder={isExampleFocused || skill.example ? "" : t("skillsManager.examplePlaceholder")}
        />
      </div>
      <div className="form-divider" />
    </div>
  );
};
export default SkillsManagerForm;
