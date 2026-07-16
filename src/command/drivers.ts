import { invoke } from "@tauri-apps/api/core";
export interface DriverInfo {
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    parameters: {
        name: string;
        param_type: string;
        description: string;
        required: boolean;
    }[];
}
export const driversCommands = {
    async getDrivers(): Promise<DriverInfo[]> {
        return await invoke('cmd_get_drivers');
    },
    // getDrivers: (): Promise<DriverInfo[]> =>
    //     invoke("get_atomic_skills"),
    getDriversByCategory: (category: string): Promise<DriverInfo[]> =>
        invoke("cmd_get_atomic_skills_by_category", { category }),
    getDriverCategories: (): Promise<string[]> =>
        invoke("cmd_get_driver_categories"),
    executeDriver: (skillName: string, parameters: Record<string, any>): Promise<string> =>
        invoke("cmd_execute_driver", { skillName, parameters }),
};
export async function getDrivers(): Promise<DriverInfo[]> {
    return driversCommands.getDrivers();
}
export async function getDriversByCategory(category: string): Promise<DriverInfo[]> {
    return driversCommands.getDriversByCategory(category);
}
export async function getSkillCategories(): Promise<string[]> {
    return driversCommands.getDriverCategories();
}
export async function executeDriver(
    skillName: string,
    parameters: Record<string, any>
): Promise<string> {
    return driversCommands.executeDriver(skillName, parameters);
}
export function groupSkillsByCategory(skills: DriverInfo[]): Record<string, DriverInfo[]> {
    const grouped: Record<string, DriverInfo[]> = {};
    for (const skill of skills) {
        if (!grouped[skill.category]) {
            grouped[skill.category] = [];
        }
        grouped[skill.category].push(skill);
    }
    return grouped;
}
export function getSkillStats(skills: DriverInfo[]): {
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
