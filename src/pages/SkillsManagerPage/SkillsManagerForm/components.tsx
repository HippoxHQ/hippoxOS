import React from 'react';
import { Skill, StepMaterial } from '../types';
import { AddIcon, CloseIcon, DependencyIcon, MaterialIcon, LinkIcon, PathIcon, NoteIcon, InputParamsIcon, OutputParamsIcon } from '../../../icons';

interface StepCardProps {
  step: any;
  index: number;
  skill: Skill;
  stepFocusStates: Record<string, boolean>;
  materialFocusStates: Record<string, boolean>;
  schemaFocusStates: Record<string, boolean>;
  onStepFocus: (stepId: string, focused: boolean) => void;
  onMaterialFocus: (key: string, focused: boolean) => void;
  onSchemaFocus: (key: string, focused: boolean) => void;
  onUpdateStepDescription: (stepId: string, value: string) => void;
  onRemoveStep: (stepId: string) => void;
  onAddMaterial: (stepId: string) => void;
  onToggleDependency: (stepId: string, dependencyId: string) => void;
  onUpdateMaterial: (stepId: string, materialId: string, field: keyof StepMaterial, value: string) => void;
  onRemoveMaterial: (stepId: string, materialId: string) => void;
  getAvailableDependencies: (stepId: string) => any[];
  getStepPlaceholder: (index: number, isFocused: boolean, hasValue: boolean) => string;
  getMaterialPlaceholder: (type: string, isFocused: boolean, hasValue: boolean, id: string) => string;
  getSchemaPlaceholder: (type: 'input' | 'output', isFocused: boolean, hasValue: boolean) => string;
  t: (key: string, params?: any) => string;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  skill,
  stepFocusStates,
  materialFocusStates,
  schemaFocusStates,
  onStepFocus,
  onMaterialFocus,
  onSchemaFocus,
  onUpdateStepDescription,
  onRemoveStep,
  onAddMaterial,
  onToggleDependency,
  onUpdateMaterial,
  onRemoveMaterial,
  getAvailableDependencies,
  getStepPlaceholder,
  getMaterialPlaceholder,
  getSchemaPlaceholder,
  t,
}) => {
  const availableDeps = getAvailableDependencies(step.id);
  const isStepFocused = stepFocusStates[step.id] || false;
  const hasStepValue = !!step.description;

  return (
    <div className="step-card">
      <div className="step-header">
        <div className="step-number">{index + 1}</div>
        <input
          type="text"
          className="step-input"
          value={step.description}
          onChange={(e) => onUpdateStepDescription(step.id, e.target.value)}
          onFocus={() => onStepFocus(step.id, true)}
          onBlur={() => onStepFocus(step.id, false)}
          placeholder={getStepPlaceholder(index, isStepFocused, hasStepValue)}
        />
        <div className="step-actions">
          <button className="step-action-btn" onClick={() => onAddMaterial(step.id)}>
            <AddIcon size={12} /> {t('skillsManager.addMaterial')}
          </button>
          {skill.steps.length > 1 && (
            <button className="step-action-btn danger" onClick={() => onRemoveStep(step.id)}>
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>
      {availableDeps.length > 0 && (
        <div className="dependencies-section">
          <div className="dependencies-title">
            <DependencyIcon size={12} /> {t('skillsManager.dependencies')}
          </div>
          <div className="dependencies-list">
            {availableDeps.map((depStep) => (
              <div
                key={depStep.id}
                className={`dependency-chip ${step.dependencies.includes(depStep.id) ? 'selected' : ''}`}
                onClick={() => onToggleDependency(step.id, depStep.id)}
              >
                {t('skillsManager.step')} {skill.steps.findIndex((s: any) => s.id === depStep.id) + 1}
              </div>
            ))}
          </div>
        </div>
      )}
      {step.materials.length > 0 && (
        <div className="materials-section">
          <div className="materials-title">
            <MaterialIcon size={12} /> {t('skillsManager.allowedMaterials')}
          </div>
          <div className="materials-list">
            {step.materials.map((material: any) => {
              const materialFocusKey = `${step.id}-${material.id}`;
              const isMaterialFocused = materialFocusStates[materialFocusKey] || false;
              const hasMaterialValue = !!material.content;
              const isSchemaInputFocused = schemaFocusStates[`${materialFocusKey}-input`] || false;
              const isSchemaOutputFocused = schemaFocusStates[`${materialFocusKey}-output`] || false;
              const hasInputSchema = !!material.inputSchema;
              const hasOutputSchema = !!material.outputSchema;
              return (
                <div key={material.id} className="material-item">
                  <div className="material-row">
                    <select
                      className="material-type-select"
                      value={material.type}
                      onChange={(e) =>
                        onUpdateMaterial(step.id, material.id, 'type', e.target.value as any)
                      }
                    >
                      <option value="link">
                        <LinkIcon size={12} /> {t('skillsManager.link')}
                      </option>
                      <option value="path">
                        <PathIcon size={12} /> {t('skillsManager.path')}
                      </option>
                      <option value="note">
                        <NoteIcon size={12} /> {t('skillsManager.note')}
                      </option>
                    </select>
                    <input
                      type="text"
                      className="material-input"
                      value={material.content}
                      onChange={(e) =>
                        onUpdateMaterial(step.id, material.id, 'content', e.target.value)
                      }
                      onFocus={() => onMaterialFocus(materialFocusKey, true)}
                      onBlur={() => onMaterialFocus(materialFocusKey, false)}
                      placeholder={getMaterialPlaceholder(
                        material.type,
                        isMaterialFocused,
                        hasMaterialValue,
                        material.id
                      )}
                    />
                    <button
                      className="material-remove-btn"
                      onClick={() => onRemoveMaterial(step.id, material.id)}
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                  {material.type === 'link' && (
                    <div className="material-schema">
                      <div className="schema-label">
                        <InputParamsIcon size={12} /> {t('skillsManager.inputParams')}
                      </div>
                      <textarea
                        className="schema-textarea"
                        value={material.inputSchema || ''}
                        onChange={(e) =>
                          onUpdateMaterial(step.id, material.id, 'inputSchema', e.target.value)
                        }
                        onFocus={() => onSchemaFocus(`${materialFocusKey}-input`, true)}
                        onBlur={() => onSchemaFocus(`${materialFocusKey}-input`, false)}
                        rows={2}
                        placeholder={getSchemaPlaceholder('input', isSchemaInputFocused, hasInputSchema)}
                      />
                      <div className="schema-label">
                        <OutputParamsIcon size={12} /> {t('skillsManager.outputParams')}
                      </div>
                      <textarea
                        className="schema-textarea"
                        value={material.outputSchema || ''}
                        onChange={(e) =>
                          onUpdateMaterial(step.id, material.id, 'outputSchema', e.target.value)
                        }
                        onFocus={() => onSchemaFocus(`${materialFocusKey}-output`, true)}
                        onBlur={() => onSchemaFocus(`${materialFocusKey}-output`, false)}
                        rows={2}
                        placeholder={getSchemaPlaceholder('output', isSchemaOutputFocused, hasOutputSchema)}
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
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title }) => (
  <div className="form-section-title">
    {icon}
    {title}
  </div>
);

interface FormLabelProps {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({ required, children }) => (
  <label className={`form-label ${required ? 'required' : ''}`}>{children}</label>
);

interface TagListProps {
  tags: string[];
  onRemoveTag: (index: number) => void;
}

export const TagList: React.FC<TagListProps> = ({ tags, onRemoveTag }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
    {tags.map((tag, idx) => (
      <span key={idx} className="tag-bubble">
        {tag}
        <button className="tag-remove" onClick={() => onRemoveTag(idx)}>×</button>
      </span>
    ))}
  </div>
);