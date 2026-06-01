import React from "react";
import { Skill } from "./types";

interface SkillMarkdownPreviewProps {
  skill: Skill;
  t: (key: string, params?: any) => string;
}

const SkillMarkdownPreview: React.FC<SkillMarkdownPreviewProps> = ({
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
    lines.push(`## ${t("skillEditor.executionSteps")}`);
    lines.push("");
    skill.steps.forEach((step, idx) => {
      const depInfo =
        step.dependencies.length > 0
          ? ` (${t("skillEditor.dependenciesLabel")}: ${step.dependencies
              .map((d) => {
                const depIndex = skill.steps.findIndex((s) => s.id === d);
                return `${t("skillEditor.step")}${depIndex + 1}`;
              })
              .join(", ")})`
          : "";
      lines.push(
        `${idx + 1}. ${step.description || `${t("skillEditor.step")} ${idx + 1}`}${depInfo}`,
      );
      if (step.materials.length > 0) {
        lines.push(`   - ${t("skillEditor.allowedMaterials")}:`);
        step.materials.forEach((material) => {
          if (material.type === "link" && material.content) {
            lines.push(`     - ${t("skillEditor.link")}: ${material.content}`);
            if (material.inputSchema) {
              lines.push(`       - ${t("skillEditor.inputParams")}:`);
              lines.push(`         \`\`\`json`);
              lines.push(
                `         ${material.inputSchema.replace(/\n/g, "\n         ")}`,
              );
              lines.push(`         \`\`\``);
            }
            if (material.outputSchema) {
              lines.push(`       - ${t("skillEditor.outputParams")}:`);
              lines.push(`         \`\`\`json`);
              lines.push(
                `         ${material.outputSchema.replace(/\n/g, "\n         ")}`,
              );
              lines.push(`         \`\`\``);
            }
          } else if (material.type === "path" && material.content) {
            lines.push(`     - ${t("skillEditor.path")}: ${material.content}`);
          } else if (material.type === "note" && material.content) {
            lines.push(`     - ${t("skillEditor.note")}: ${material.content}`);
          }
        });
      }
    });
    lines.push("");
    if (skill.tags) {
      lines.push(`## ${t("skillEditor.tags")}`);
      lines.push("");
      lines.push(skill.tags);
      lines.push("");
    }
    if (skill.example) {
      lines.push(`## ${t("skillEditor.example")}`);
      lines.push("");
      lines.push("```");
      lines.push(skill.example);
      lines.push("```");
      lines.push("");
    }
    return lines.join("\n");
  };
  return (
    <div className="skill-markdown-preview">
      <style>{`
        .skill-markdown-preview {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .markdown-content {
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          padding: 14px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 11px;
          line-height: 1.5;
          white-space: pre-wrap;
          color: var(--text-primary);
          overflow-x: auto;
        }

        .markdown-content h1 {
          font-size: 18px;
          font-weight: 600;
          margin: 16px 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .markdown-content h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 14px 0 10px 0;
          color: var(--accent-color);
        }

        .markdown-content h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 12px 0 8px 0;
          color: var(--text-primary);
        }

        .markdown-content code {
          background: var(--bg-tertiary);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 10px;
          color: var(--accent-color);
        }

        .markdown-content pre {
          background: var(--bg-tertiary);
          padding: 10px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 10px 0;
          border: 1px solid var(--border-color);
        }

        .markdown-content pre code {
          background: transparent;
          padding: 0;
          color: var(--text-primary);
          font-size: 10px;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin: 8px 0;
          padding-left: 20px;
        }

        .markdown-content li {
          margin: 4px 0;
          line-height: 1.5;
        }

        .markdown-content p {
          margin: 8px 0;
          line-height: 1.5;
        }

        .markdown-content blockquote {
          margin: 8px 0;
          padding-left: 12px;
          border-left: 3px solid var(--accent-color);
          color: var(--text-secondary);
        }

        .markdown-content hr {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 12px 0;
        }

        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid var(--border-color);
          padding: 6px 10px;
          text-align: left;
        }

        .markdown-content th {
          background: var(--bg-tertiary);
          font-weight: 600;
        }

        :root {
          --bg-primary: #0f1117;
          --bg-secondary: #1a1d26;
          --bg-tertiary: #22252f;
          --border-color: #2d303a;
          --text-primary: #e8edf2;
          --text-secondary: #9ca3af;
          --text-tertiary: #6b7280;
          --accent-color: #818cf8;
          --accent-hover: #6366f1;
          --accent-glow: rgba(129, 140, 248, 0.2);
          --hover-bg: rgba(232, 237, 242, 0.08);
        }

        [data-theme="light"] {
          --bg-primary: #f3f4f6;
          --bg-secondary: #ffffff;
          --bg-tertiary: #e5e7eb;
          --border-color: #d1d5db;
          --text-primary: #111827;
          --text-secondary: #4b5563;
          --text-tertiary: #9ca3af;
          --accent-color: #6366f1;
          --accent-hover: #4f46e5;
          --accent-glow: rgba(99, 102, 241, 0.2);
          --hover-bg: rgba(0, 0, 0, 0.04);
        }
      `}</style>

      <div className="markdown-content">{generateMarkdown()}</div>
    </div>
  );
};

export default SkillMarkdownPreview;
