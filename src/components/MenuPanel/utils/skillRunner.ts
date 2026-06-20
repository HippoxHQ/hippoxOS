import { MarketSkill } from "../../../command/skills";
import { UploadFile } from "../../../core/types";
import { filesCommands } from "../../../command/files";

export const runSkill = async (
    skill: MarketSkill,
    onSendMessage: (message: string, files?: UploadFile[]) => void,
    t: (key: string, params?: any) => string
): Promise<void> => {
    try {
        if (!skill.local_path) {
            console.error("No local path found for skill:", skill.id);
            return;
        }
        const skillContent = await filesCommands.readTextFile(skill.local_path);
        if (!skillContent) {
            console.error("Failed to read skill.md file:", skill.local_path);
            return;
        }
        const file = new File([skillContent], `${skill.name}.md`, {
            type: "text/markdown"
        });
        const skillFile: UploadFile = {
            id: `skill-${skill.id}-${Date.now()}`,
            file: file,
            name: `${skill.name}.md`,
            size: skillContent.length,
            type: "text/markdown",
            content: skillContent,
            status: "success",
            path: skill.local_path,
        };
        const message = t("skill.runMessage", { name: skill.name }) || `运行技能: ${skill.name}`;
        onSendMessage(message, [skillFile]);
    } catch (error) {
        console.error("Failed to run skill:", error);
    }
};