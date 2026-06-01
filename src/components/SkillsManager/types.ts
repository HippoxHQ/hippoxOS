export interface StepMaterial {
  id: string;
  type: "link" | "path" | "note";
  content: string;
  inputSchema?: string;
  outputSchema?: string;
}

export interface ExecutionStep {
  id: string;
  description: string;
  materials: StepMaterial[];
  dependencies: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  steps: ExecutionStep[];
  tags: string;
  example: string;
  installed?: boolean;
  installed_version?: string;
  version?: string;
  author?: string;
  category?: string;
  favorited?: boolean;
  author_avatar?: string;
}

export interface SkillHistory {
  id: string;
  skillId: string;
  skillName: string;
  action: "create" | "update" | "delete";
  timestamp: string;
  details?: string;
}

export interface SkillEditorProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}