import { invoke } from "@tauri-apps/api/core";

export interface SkillParameter {
    name: string;
    param_type: string;
    description: string;
    required: boolean;
}

export interface AtomicSkillInfo {
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    parameters: SkillParameter[];
}

export interface MarketSkill {
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    author: string;
    installed: boolean;
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

export const atomicSkillsCommands = {

    getAtomicSkills: (): Promise<AtomicSkillInfo[]> =>
        invoke("get_atomic_skills"),


    getAtomicSkillsByCategory: (category: string): Promise<AtomicSkillInfo[]> =>
        invoke("get_atomic_skills_by_category", { category }),


    getSkillCategories: (): Promise<string[]> =>
        invoke("get_skill_categories"),


    executeAtomicSkill: (skillName: string, parameters: Record<string, any>): Promise<string> =>
        invoke("execute_atomic_skill", { skillName, parameters }),
};

export const skillsMarketCommands = {

    updateSkillsMarket: (): Promise<MarketSkill[]> =>
        invoke("update_skills_market"),


    getMarketSkills: (): Promise<MarketSkill[]> =>
        invoke("get_market_skills"),

    installSkill: (skillId: string): Promise<boolean> =>
        invoke("install_skill", { skillId }),


    uninstallSkill: (skillId: string): Promise<boolean> =>
        invoke("uninstall_skill", { skillId }),


    updateSkill: (skillId: string): Promise<boolean> =>
        invoke("update_skill", { skillId }),


    getMarketConfig: (): Promise<MarketConfig> =>
        invoke("get_market_config"),


    updateMarketConfig: (repoUrl: string, branch: string): Promise<void> =>
        invoke("update_market_config", { repoUrl, branch }),


    getInstalledSkills: (): Promise<MarketSkill[]> =>
        invoke("get_installed_skills"),
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

export function groupSkillsByCategory(skills: AtomicSkillInfo[]): Record<string, AtomicSkillInfo[]> {
    const grouped: Record<string, AtomicSkillInfo[]> = {};
    for (const skill of skills) {
        if (!grouped[skill.category]) {
            grouped[skill.category] = [];
        }
        grouped[skill.category].push(skill);
    }
    return grouped;
}

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

export function getSkillStats(skills: AtomicSkillInfo[]): {
    total: number;
    enabled: number;
    disabled: number;
    categories: number;
} {
    const categories = new Set(skills.map((s) => s.category));
    return {
        total: skills.length,
        enabled: skills.filter((s) => s.enabled).length,
        disabled: skills.filter((s) => !s.enabled).length,
        categories: categories.size,
    };
}