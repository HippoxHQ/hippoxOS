export interface SkillStep {
    name: string;
    description: string;
    materials: string[];
}
export interface SkillData {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string;
    steps: SkillStep[];
    created_at: string;
    updated_at: string;
    installed: boolean;
    path: string;
}
export interface SkillHistory {
    id: string;
    skill_id: string;
    skill_name: string;
    action: 'create' | 'update' | 'delete';
    timestamp: string;
    details?: string | null;
}
export interface CreateSkillRequest {
    name: string;
    description: string;
    category: string;
    tags: string;
    steps: SkillStep[];
}
export interface UpdateSkillRequest {
    id: string;
    name: string;
    description: string;
    category: string;
    old_category: string;
    tags: string;
    steps: SkillStep[];
}