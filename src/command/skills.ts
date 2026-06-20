import { invoke } from "@tauri-apps/api/core";
import { SkillData, CreateSkillRequest, UpdateSkillRequest, SkillHistory } from "../types/skill";
import { DriverInfo } from "./drivers";

export interface SkillParameter {
    name: string;
    param_type: string;
    description: string;
    required: boolean;
}

export interface MarketSkill {
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    author: string;
    author_avatar?: string;
    installed: boolean;
    favorited?: boolean;
    installed_version?: string;
    local_path?: string;
    readme?: string;
    parameters: SkillParameter[];
}

export interface MarketConfig {
    repo_url: string;
    branch: string;
    last_update?: string;
}

export const skillsMarketCommands = {
    updateSkillsMarket: (): Promise<MarketSkill[]> =>
        invoke("update_skills_market"),

    getMarketSkills: (): Promise<MarketSkill[]> =>
        invoke("get_market_skills"),

    getMarketCategories: (): Promise<string[]> =>
        invoke("cmd_get_market_categories"),

    installSkill: (skillId: string): Promise<boolean> =>
        invoke("install_skill", { skillId }),

    uninstallSkill: (skillId: string): Promise<boolean> =>
        invoke("uninstall_skill", { skillId }),

    getMarketConfig: (): Promise<MarketConfig> =>
        invoke("get_market_config"),

    updateMarketConfig: (repoUrl: string, branch: string): Promise<void> =>
        invoke("update_market_config", { repoUrl, branch }),

    getInstalledSkills: (): Promise<MarketSkill[]> =>
        invoke("get_installed_skills"),

    getFavoritedSkills: (): Promise<string[]> =>
        invoke("get_favorited_skills"),

    favoriteSkill: (skillId: string): Promise<boolean> =>
        invoke("favorite_skill", { skillId }),

    unfavoriteSkill: (skillId: string): Promise<boolean> =>
        invoke("unfavorite_skill", { skillId }),
};


export const localSkillsCommands = {

    setSkillEnabled: (skillName: string, enabled: boolean): Promise<void> =>
        invoke("set_skill_enabled", { skillName, enabled }),

    enableSkillsBatch: (skillNames: string[]): Promise<void> =>
        invoke("enable_skills_batch", { skillNames }),


    disableSkillsBatch: (skillNames: string[]): Promise<void> =>
        invoke("disable_skills_batch", { skillNames }),


    getSkillsConfig: (): Promise<{ enabled: string[]; disabled: string[] }> =>
        invoke("get_skills_config"),


    saveSkillsConfig: (enabledSkills: string[], disabledSkills: string[]): Promise<void> =>
        invoke("save_skills_config", { enabledSkills, disabledSkills }),
};

export function getCategoryDisplayName(category: string, t: (key: string) => string): string {
    const categoryMap: Record<string, string> = {
        file: "skills.category.fileSystem",
        net: "skills.category.network",
        system: "skills.category.system",
        db: "skills.category.database",
        math: "skills.category.math",
        time: "skills.category.time",
        devops: "skills.category.devops",
        document: "skills.category.document",
        message: "skills.category.message",
        task: "skills.category.task",
        communication: "skills.category.communication",
        general: "skills.category.general",
    };
    const key = categoryMap[category];
    return key ? t(key) : category;
}

export function getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
        file: "📁",
        net: "🌐",
        system: "⚙️",
        db: "🗄️",
        math: "🔢",
        time: "🕐",
        devops: "🚀",
        document: "📄",
        message: "💬",
        task: "⏰",
        communication: "📧",
        general: "🔧",
    };
    return iconMap[category] || "📦";
}

export function searchSkills<T extends { name: string; description: string }>(
    skills: T[],
    searchTerm: string
): T[] {
    if (!searchTerm.trim()) return skills;
    const term = searchTerm.toLowerCase();
    return skills.filter(
        (skill) =>
            skill.name.toLowerCase().includes(term) ||
            skill.description.toLowerCase().includes(term)
    );
}

export function filterSkillsByCategory<T extends { category: string }>(
    skills: T[],
    category: string
): T[] {
    if (category === "all") return skills;
    return skills.filter((skill) => skill.category === category);
}


export const skillsLocalCommands = {
    async listLocalSkills(): Promise<SkillData[]> {
        return await invoke('cmd_list_local_skills');
    },

    async createSkill(request: CreateSkillRequest): Promise<SkillData> {
        return await invoke('cmd_create_skill', { request });
    },

    async updateSkill(request: UpdateSkillRequest): Promise<SkillData> {
        return await invoke('cmd_update_skill', { request });
    },

    async deleteSkill(skillId: string, category: string): Promise<boolean> {
        return await invoke('cmd_delete_skill', { skillId, category });
    },

    async getSkill(skillId: string, category: string): Promise<SkillData | null> {
        return await invoke('cmd_get_skill', { skillId, category });
    },

    async getAllSkillHistory(): Promise<SkillHistory[]> {
        return await invoke('cmd_get_all_skill_history');
    },

    async getSkillHistory(skillId: string): Promise<SkillHistory[]> {
        return await invoke('cmd_get_skill_history', { skillId });
    },

    async skillExists(skillId: string, category: string): Promise<boolean> {
        return await invoke('cmd_skill_exists', { skillId, category });
    },

    async favoriteLocalSkill(skillId: string, category: string): Promise<boolean> {
        return await invoke('cmd_favorite_local_skill', { skillId, category });
    },

    async unfavoriteLocalSkill(skillId: string, category: string): Promise<boolean> {
        return await invoke('cmd_unfavorite_local_skill', { skillId, category });
    },
};

export type SkillParameterInfo = SkillParameter;
