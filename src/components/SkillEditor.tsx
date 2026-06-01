import React, { useState, useEffect, useRef } from "react";

interface SkillEditorProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}

interface SkillFile {
  id: string;
  name: string;
  content: string;
  modified: boolean;
}

const DEFAULT_SKILL_TEMPLATE = `# 技能名称

## 描述
在这里描述你的技能功能

## 触发条件
描述什么情况下会触发这个技能

## 执行步骤
1. 第一步
2. 第二步
3. 第三步

## 输出格式
描述输出内容的格式

## 示例
\`\`\`
示例输入和输出
\`\`\`
`;

const MOCK_SKILLS: SkillFile[] = [
  {
    id: "1",
    name: "web-search.md",
    content: `# Web Search Skill

## 描述
执行网络搜索功能

## 触发条件
当用户需要查找网络信息时触发

## 执行步骤
1. 解析搜索关键词
2. 调用搜索引擎API
3. 整理搜索结果
4. 返回结构化数据

## 输出格式
返回包含标题、链接、摘要的搜索结果列表

## 示例
输入："搜索最新的AI新闻"
输出：返回10条相关的AI新闻链接`,
    modified: false,
  },
  {
    id: "2",
    name: "file-processor.md",
    content: `# File Processor Skill

## 描述
处理各种文件格式的读写操作

## 触发条件
当用户需要读取或处理文件时触发

## 执行步骤
1. 识别文件类型
2. 读取文件内容
3. 根据需求处理数据
4. 输出处理结果

## 输出格式
根据文件类型返回解析后的数据

## 示例
输入："处理这个CSV文件"
输出：CSV数据的JSON格式`,
    modified: false,
  },
];

const SkillEditor: React.FC<SkillEditorProps> = ({
  t,
  onClose,
  currentSessionId,
}) => {
  const [skills, setSkills] = useState<SkillFile[]>(MOCK_SKILLS);
  const [currentSkill, setCurrentSkill] = useState<SkillFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadSkillContent = (skill: SkillFile) => {
    setCurrentSkill({
      ...skill,
      content: skill.content,
      modified: false,
    });
  };
  const saveCurrentSkill = () => {
    if (!currentSkill) return;

    setSkills((prev) =>
      prev.map((s) =>
        s.id === currentSkill.id
          ? { ...s, content: currentSkill.content, modified: false }
          : s,
      ),
    );

    setCurrentSkill({
      ...currentSkill,
      modified: false,
    });

  };

  const createNewSkill = () => {
    if (!newSkillName.trim()) return;

    const fullName = newSkillName.endsWith(".md")
      ? newSkillName
      : `${newSkillName}.md`;
    const newId = Date.now().toString();

    const newSkill: SkillFile = {
      id: newId,
      name: fullName,
      content: DEFAULT_SKILL_TEMPLATE,
      modified: false,
    };

    setSkills((prev) => [...prev, newSkill]);
    setCurrentSkill(newSkill);
    setNewSkillName("");
    setShowNewModal(false);
  };

  const deleteSkill = (skill: SkillFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSkills((prev) => prev.filter((s) => s.id !== skill.id));

    if (currentSkill?.id === skill.id) {
      const remaining = skills.filter((s) => s.id !== skill.id);
      if (remaining.length > 0) {
        loadSkillContent(remaining[0]);
      } else {
        setCurrentSkill(null);
      }
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentSkill) return;

    setCurrentSkill({
      ...currentSkill,
      content: e.target.value,
      modified: true,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (currentSkill?.modified) {
          saveCurrentSkill();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSkill]);

  const renderMarkdownPreview = (content: string) => {
    let html = content
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^- (.*$)/gm, "<li>$1</li>");

    const lines = html.split("\n");
    const processedLines: string[] = [];
    let inList = false;

    for (const line of lines) {
      if (line.trim().startsWith("<li>")) {
        if (!inList) {
          processedLines.push("<ul>");
          inList = true;
        }
        processedLines.push(line);
      } else {
        if (inList) {
          processedLines.push("</ul>");
          inList = false;
        }
        processedLines.push(line);
      }
    }

    if (inList) {
      processedLines.push("</ul>");
    }

    html = processedLines.join("\n");
    html = html.replace(/\n/g, "<br/>");
    html = html.replace(/<\/[^>]+><br\/>/g, (match) =>
      match.replace("<br/>", ""),
    );
    html = html.replace(/<br\/><\/[^>]+>/g, (match) =>
      match.replace("<br/>", ""),
    );

    return { __html: html };
  };

  return (
    <div className="skill-editor">
      <style>{`
        .skill-editor {
          flex: 1;
          display: flex;
          height: 100%;
          background: var(--bg-primary);
          overflow: hidden;
        }

        .skill-editor-sidebar {
          width: 260px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .skill-editor-sidebar-header {
          border-bottom: 1px solid var(--border-color);
          padding-top: 5px;
          padding-bottom: 6px;
          padding-left: 10px;
          padding-right: 10px;
        }

        .skill-editor-sidebar-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .skill-editor-sidebar-header p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .skill-file-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .skill-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          margin-bottom: 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--bg-tertiary);
        }

        .skill-file-item:hover {
          background: var(--hover-bg);
        }

        .skill-file-item.active {
          background: var(--accent-color);
        }

        .skill-file-item.active .skill-file-name {
          color: white;
        }

        .skill-file-name {
          font-size: 13px;
          color: var(--text-primary);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .skill-file-modified {
          width: 8px;
          height: 8px;
          background: var(--accent-color);
          border-radius: 50%;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .skill-file-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .skill-file-item:hover .skill-file-actions {
          opacity: 1;
        }

        .skill-file-action-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .skill-file-action-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .skill-editor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .skill-editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .skill-editor-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .skill-editor-title h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .skill-editor-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--accent-color);
          color: white;
        }

        .skill-editor-actions {
          display: flex;
          gap: 8px;
        }

        .skill-editor-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .skill-editor-btn:hover {
          background: var(--hover-bg);
        }

        .skill-editor-btn.primary {
          background: var(--accent-color);
          color: white;
        }

        .skill-editor-btn.primary:hover {
          opacity: 0.9;
        }

        .skill-editor-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .skill-editor-content {
          flex: 1;
          overflow: auto;
          padding: 16px;
        }

        .skill-editor-textarea {
          width: 100%;
          height: 100%;
          min-height: 500px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-primary);
          resize: none;
          outline: none;
        }

        .skill-editor-textarea:focus {
          border-color: var(--accent-color);
        }

        .skill-editor-preview {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .skill-editor-preview h4 {
          margin: 0 0 12px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .skill-editor-preview-content {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.6;
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }

        .skill-editor-preview-content h1 {
          font-size: 24px;
          margin: 16px 0 8px 0;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }

        .skill-editor-preview-content h2 {
          font-size: 20px;
          margin: 14px 0 6px 0;
        }

        .skill-editor-preview-content h3 {
          font-size: 16px;
          margin: 12px 0 4px 0;
        }

        .skill-editor-preview-content pre {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 12px;
        }

        .skill-editor-preview-content code {
          font-family: monospace;
          background: var(--bg-tertiary);
          padding: 2px 4px;
          border-radius: 4px;
        }

        .skill-editor-preview-content ul, 
        .skill-editor-preview-content ol {
          margin: 8px 0;
          padding-left: 20px;
        }

        .skill-editor-preview-content li {
          margin: 4px 0;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state-text {
          font-size: 14px;
          margin-bottom: 16px;
        }

        .create-skill-btn {
          padding: 8px 16px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .create-skill-btn:hover {
          opacity: 0.9;
        }

        .skill-name-input {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .skill-name-input:focus {
          border-color: var(--accent-color);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          border: 1px solid var(--border-color);
        }

        .modal-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .modal-content p {
          margin: 0 0 16px 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .modal-buttons button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          border: none;
        }

        .modal-buttons button.cancel {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-buttons button.confirm {
          background: var(--accent-color);
          color: white;
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

      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t("skills.createNew") || "Create New Skill"}</h3>
            <p>
              {t("skills.enterName") || "Enter skill name (e.g., my-skill.md):"}
            </p>
            <input
              type="text"
              className="skill-name-input"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="my-skill.md"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") createNewSkill();
                if (e.key === "Escape") setShowNewModal(false);
              }}
            />
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setShowNewModal(false)}>
                {t("common.cancel") || "Cancel"}
              </button>
              <button className="confirm" onClick={createNewSkill}>
                {t("common.create") || "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="skill-editor-sidebar">
        <div className="skill-editor-sidebar-header">
          <h3>{t("skills.title") || "Skill Editor"}</h3>
          <p>{t("skills.description") || "Edit skill.md files"}</p>
        </div>

        <div className="skill-file-list">
          {skills.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <div className="empty-state-text" style={{ fontSize: "12px" }}>
                {t("skills.noFiles") || "No skill files"}
              </div>
              <button
                className="create-skill-btn"
                onClick={() => setShowNewModal(true)}
              >
                {t("skills.createNew") || "Create New"}
              </button>
            </div>
          ) : (
            <>
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`skill-file-item ${currentSkill?.id === skill.id ? "active" : ""}`}
                  onClick={() => loadSkillContent(skill)}
                >
                  <span className="skill-file-name">{skill.name}</span>
                  {skill.modified && <span className="skill-file-modified" />}
                  <div className="skill-file-actions">
                    <button
                      className="skill-file-action-btn"
                      onClick={(e) => deleteSkill(skill, e)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px" }}>
                <button
                  className="create-skill-btn"
                  onClick={() => setShowNewModal(true)}
                  style={{ width: "100%" }}
                >
                  + {t("skills.new") || "New Skill"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="skill-editor-main">
        {currentSkill ? (
          <>
            <div className="skill-editor-toolbar">
              <div className="skill-editor-title">
                <h2>{currentSkill.name}</h2>
                {currentSkill.modified && (
                  <span className="skill-editor-badge">
                    {t("skills.modified") || "Modified"}
                  </span>
                )}
              </div>
              <div className="skill-editor-actions">
                <button
                  className="skill-editor-btn"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  👁️{" "}
                  {showPreview
                    ? t("skills.edit") || "Edit"
                    : t("skills.preview") || "Preview"}
                </button>
                <button
                  className="skill-editor-btn primary"
                  onClick={saveCurrentSkill}
                  disabled={!currentSkill.modified}
                >
                  💾 {t("skills.save") || "Save"} (Ctrl+S)
                </button>
                {onClose && (
                  <button className="skill-editor-btn" onClick={onClose}>
                    ✕ {t("common.close") || "Close"}
                  </button>
                )}
              </div>
            </div>

            <div className="skill-editor-content">
              {showPreview ? (
                <div className="skill-editor-preview">
                  <h4>{t("skills.preview") || "Preview"}</h4>
                  <div
                    className="skill-editor-preview-content"
                    dangerouslySetInnerHTML={renderMarkdownPreview(
                      currentSkill.content,
                    )}
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  className="skill-editor-textarea"
                  value={currentSkill.content}
                  onChange={handleContentChange}
                  placeholder={
                    t("skills.editPlaceholder") ||
                    "Write your skill documentation in Markdown..."
                  }
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">
              {t("skills.selectOrCreate") || "Select or create a skill file"}
            </div>
            <button
              className="create-skill-btn"
              onClick={() => setShowNewModal(true)}
            >
              {t("skills.createFirst") || "Create your first skill"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillEditor;
