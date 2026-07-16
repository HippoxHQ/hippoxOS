import { UploadFile } from "../../../core/types";
import { filesCommands } from "../../../command/files";
import { skillsLocalCommands } from "../../../command/skills";
export const runSkill = async (
  skill: { id: string; name: string; category?: string; local_path?: string },
  onSendMessage: (message: string, files?: UploadFile[], sessionId?: string) => void,
  t: (key: string, params?: any) => string,
  sessionId?: string
): Promise<void> => {
  try {
    if (skill.local_path) {
      const skillContent = await filesCommands.readTextFile(skill.local_path);
      if (!skillContent) {
        console.error("Failed to read skill file:", skill.local_path);
        return;
      }
      const file = new File([skillContent], `${skill.name}.md`, { type: "text/markdown" });
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
      const message = t("skills.runSkill", { name: skill.name }) || `Run skill: ${skill.name}`;
      onSendMessage(message, [skillFile], sessionId);
      return;
    }
    const allLocalSkills = await skillsLocalCommands.listLocalSkills();
    let found = allLocalSkills.find((s) => s.id === skill.id);
    if (!found && skill.id.includes("/")) {
      const shortId = skill.id.split("/").pop();
      if (shortId) {
        found = allLocalSkills.find((s) => s.id === shortId);
      }
    }
    if (!found) {
      found = allLocalSkills.find((s) => s.name === skill.name);
    }
    if (!found) {
      console.error("Skill not found locally:", skill.id);
      return;
    }
    const category = found.category || "other";
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/\s+/g, "_").trim();
    const sanitizedName = found.name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/\s+/g, "_").trim();
    const localPath = `${sanitizedCategory}/${sanitizedName}/SKILL.md`;
    const skillContent = await filesCommands.readTextFile(localPath);
    if (!skillContent) {
      console.error("Failed to read skill.md file:", localPath);
      return;
    }
    const file = new File([skillContent], `${found.name}.md`, { type: "text/markdown" });
    const skillFile: UploadFile = {
      id: `skill-${found.id}-${Date.now()}`,
      file: file,
      name: `${found.name}.md`,
      size: skillContent.length,
      type: "text/markdown",
      content: skillContent,
      status: "success",
      path: localPath,
    };
    const message = t("skills.runSkill", { name: found.name }) || `Run skill: ${found.name}`;
    onSendMessage(message, [skillFile], sessionId);
  } catch (error) {
    console.error("Failed to run skill:", error);
  }
};