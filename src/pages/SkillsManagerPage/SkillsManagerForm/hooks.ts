import { useState, useEffect, useRef } from 'react';
import { Skill, StepMaterial } from '../types';

export const useTagList = (skill: Skill) => {
  const [tagList, setTagList] = useState<string[]>([]);
  useEffect(() => {
    if (skill.tags) {
      const tags = skill.tags.split(',').map((t) => t.trim()).filter((t) => t);
      setTagList(tags);
    } else {
      setTagList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id]);
  return { tagList, setTagList };
};

export const useCategoryInput = (skill: Skill) => {
  const [currentCategoryInput, setCurrentCategoryInput] = useState('');
  const skipNextEffectRef = useRef(false);
  useEffect(() => {
    if (skipNextEffectRef.current) {
      skipNextEffectRef.current = false;
      return;
    }
  }, [skill.category, skill.id]);
  const setCategoryInput = (value: string) => {
    skipNextEffectRef.current = true;
    setCurrentCategoryInput(value);
  };
  return { currentCategoryInput, setCurrentCategoryInput: setCategoryInput };
};

export const useFocusStates = () => {
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [isExampleFocused, setIsExampleFocused] = useState(false);
  const [stepFocusStates, setStepFocusStates] = useState<Record<string, boolean>>({});
  const [materialFocusStates, setMaterialFocusStates] = useState<Record<string, boolean>>({});
  const [schemaFocusStates, setSchemaFocusStates] = useState<Record<string, boolean>>({});
  return {
    isNameFocused, setIsNameFocused,
    isDescFocused, setIsDescFocused,
    isExampleFocused, setIsExampleFocused,
    stepFocusStates, setStepFocusStates,
    materialFocusStates, setMaterialFocusStates,
    schemaFocusStates, setSchemaFocusStates,
  };
};

export const useStepHandlers = (skill: Skill, onUpdate: (skill: Skill) => void) => {
  const updateStepDescription = (stepId: string, value: string) => {
    const newSteps = skill.steps.map((step) =>
      step.id === stepId ? { ...step, description: value } : step
    );
    onUpdate({ ...skill, steps: newSteps });
  };
  const addStep = () => {
    const newId = `${skill.id}-step-${Date.now()}`;
    onUpdate({
      ...skill,
      steps: [
        ...skill.steps,
        { id: newId, description: '', materials: [], dependencies: [] },
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
      s.id === stepId ? { ...s, dependencies: newDependencies } : s
    );
    onUpdate({ ...skill, steps: newSteps });
  };
  const addMaterial = (stepId: string) => {
    const newMaterial: StepMaterial = {
      id: `mat-${Date.now()}`,
      type: 'link',
      content: '',
    };
    const newSteps = skill.steps.map((step) =>
      step.id === stepId
        ? { ...step, materials: [...step.materials, newMaterial] }
        : step
    );
    onUpdate({ ...skill, steps: newSteps });
  };
  const updateMaterial = (
    stepId: string,
    materialId: string,
    field: keyof StepMaterial,
    value: string
  ) => {
    const newSteps = skill.steps.map((step) =>
      step.id === stepId
        ? {
          ...step,
          materials: step.materials.map((m) =>
            m.id === materialId ? { ...m, [field]: value } : m
          ),
        }
        : step
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
        : step
    );
    onUpdate({ ...skill, steps: newSteps });
  };
  const getAvailableDependencies = (currentStepId: string) => {
    const currentIndex = skill.steps.findIndex((s) => s.id === currentStepId);
    return skill.steps.filter((_, idx) => idx < currentIndex);
  };
  return {
    updateStepDescription,
    addStep,
    removeStep,
    toggleDependency,
    addMaterial,
    updateMaterial,
    removeMaterial,
    getAvailableDependencies,
  };
};

export const useTagHandlers = (skill: Skill, onUpdate: (skill: Skill) => void, tagList: string[], setTagList: (tags: string[]) => void) => {
  const addTag = (tag: string) => {
    if (tag && !tagList.includes(tag)) {
      const newTags = [...tagList, tag];
      setTagList(newTags);
      onUpdate({ ...skill, tags: newTags.join(',') });
    }
  };
  const removeTag = (index: number) => {
    const newTags = tagList.filter((_, i) => i !== index);
    setTagList(newTags);
    onUpdate({ ...skill, tags: newTags.join(',') });
  };
  return { addTag, removeTag };
};

export const useCategoryHandler = (skill: Skill, onUpdate: (skill: Skill) => void, setCurrentCategoryInput: (val: string) => void) => {
  const updateCategory = (category: string) => {
    const trimmed = category.trim();
    const finalCategory = trimmed || 'other';
    onUpdate({ ...skill, category: finalCategory });
    setCurrentCategoryInput('');
  };
  return { updateCategory };
};