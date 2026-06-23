import React from "react";
import { Skill } from "./types";

interface SkillsManagerMarkdownPreviewProps {
  skill: Skill;
  t: (key: string, params?: any) => string;
}

const SkillsManagerMarkdownPreview: React.FC<SkillsManagerMarkdownPreviewProps> = ({
  skill,
  t,
}) => {
  const generateMarkdown = (): string => {
    const lines: string[] = [];
    lines.push("---");
    lines.push(`name: ${skill.name}`);
    lines.push(`description: ${skill.description}`);
    lines.push("---");
    lines.push("");
    lines.push(`## ${t("skillsManager.executionSteps")}`);
    lines.push("");
    skill.steps.forEach((step, idx) => {
      const depInfo =
        step.dependencies.length > 0
          ? ` (${t("skillsManager.dependenciesLabel")}: ${step.dependencies
              .map((d) => {
                const depIndex = skill.steps.findIndex((s) => s.id === d);
                return `${t("skillsManager.step")}${depIndex + 1}`;
              })
              .join(", ")})`
          : "";
      lines.push(
        `${idx + 1}. ${step.description || `${t("skillsManager.step")} ${idx + 1}`}${depInfo}`,
      );
      if (step.materials.length > 0) {
        lines.push(`   - ${t("skillsManager.allowedMaterials")}:`);
        step.materials.forEach((material) => {
          if (material.type === "link" && material.content) {
            lines.push(`     - ${t("skillsManager.link")}: ${material.content}`);
            if (material.inputSchema) {
              lines.push(`       - ${t("skillsManager.inputParams")}:`);
              lines.push(`         \`\`\`json`);
              lines.push(
                `         ${material.inputSchema.replace(/\n/g, "\n         ")}`,
              );
              lines.push(`         \`\`\``);
            }
            if (material.outputSchema) {
              lines.push(`       - ${t("skillsManager.outputParams")}:`);
              lines.push(`         \`\`\`json`);
              lines.push(
                `         ${material.outputSchema.replace(/\n/g, "\n         ")}`,
              );
              lines.push(`         \`\`\``);
            }
          } else if (material.type === "path" && material.content) {
            lines.push(`     - ${t("skillsManager.path")}: ${material.content}`);
          } else if (material.type === "note" && material.content) {
            lines.push(`     - ${t("skillsManager.note")}: ${material.content}`);
          }
        });
      }
    });
    lines.push("");
    if (skill.tags) {
      lines.push(`## ${t("skillsManager.tags")}`);
      lines.push("");
      lines.push(skill.tags);
      lines.push("");
    }
    if (skill.example) {
      lines.push(`## ${t("skillsManager.example")}`);
      lines.push("");
      lines.push("```");
      lines.push(skill.example);
      lines.push("```");
      lines.push("");
    }
    return lines.join("\n");
  };
  const markdown = generateMarkdown();
  return (
    <div className="skill-markdown-preview">
      <style>{`
        .skill-markdown-preview {
          flex: 1;
          overflow: auto;
          height: 100%;
          background: var(--bg-primary);
        }

        .md-editor {
          display: flex;
          height: 100%;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          font-size: 13px;
          line-height: 1.6;
          background: var(--bg-primary);
        }

        .line-numbers {
          flex-shrink: 0;
          padding: 12px 0;
          text-align: right;
          color: var(--text-tertiary);
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          user-select: none;
          font-size: 12px;
          min-width: 48px;
        }

        .line-number {
          padding-right: 12px;
        }

        .editor-content {
          flex: 1;
          padding: 12px 10px;
          overflow-x: auto;
          background: var(--bg-primary);
        }

        .code-line {
          white-space: pre;
          display: block;
          min-height: 20px;
          font-size: 12px;
          color: var(--text-primary);
        }

        .skill-markdown-preview::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .skill-markdown-preview::-webkit-scrollbar-track {
          background: var(--bg-primary);
        }

        .skill-markdown-preview::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 5px;
        }

        .skill-markdown-preview::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }
      `}</style>

      <div className="md-editor">
        <div className="line-numbers">
          {markdown.split("\n").map((_, idx) => (
            <div key={idx} className="line-number">
              {idx + 1}
            </div>
          ))}
        </div>
        <div className="editor-content">
          {markdown.split("\n").map((line, idx) => (
            <div key={idx} className="code-line">
              {line || " "}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillsManagerMarkdownPreview;
