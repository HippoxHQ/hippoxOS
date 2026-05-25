import React, { useState } from "react";

interface FavoritesPanelProps {
  t: (key: string, params?: any) => string;
}

type TabType = "natural" | "skillFile";

interface FavoriteItem {
  id: string;
  type: TabType;
  content: string;
  fileName?: string;
  createdAt: string;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ t }) => {
  const [activeTab, setActiveTab] = useState<TabType>("natural");
  const [naturalInput, setNaturalInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skillFileName, setSkillFileName] = useState("");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    {
      id: "1",
      type: "natural",
      content: "每天早上9点备份数据库到 /backup 目录",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      type: "natural",
      content: "每周一生成项目周报并发送到团队邮箱",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      type: "skillFile",
      content: "数据分析自动化流程",
      fileName: "data_analysis.skill.md",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      type: "skillFile",
      content: "代码审查助手",
      fileName: "code_review.skill.md",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      type: "natural",
      content: "每天凌晨2点清理临时文件，保留最近7天的日志",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "6",
      type: "skillFile",
      content: "Docker 容器部署",
      fileName: "docker_deploy.skill.md",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };
  const handleSaveNatural = () => {
    if (!naturalInput.trim()) return;
    const newFavorite: FavoriteItem = {
      id: Date.now().toString(),
      type: "natural",
      content: naturalInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setFavorites([newFavorite, ...favorites]);
    setNaturalInput("");
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSkillFileName(file.name);
    }
  };
  const handleSaveSkillFile = () => {
    if (!selectedFile) return;
    const newFavorite: FavoriteItem = {
      id: Date.now().toString(),
      type: "skillFile",
      content: selectedFile.name.replace(/\.(skill\.md|md)$/, ""),
      fileName: selectedFile.name,
      createdAt: new Date().toISOString(),
    };
    setFavorites([newFavorite, ...favorites]);
    setSelectedFile(null);
    setSkillFileName("");
  };
  const handleDeleteFavorite = (id: string) => {
    setFavorites(favorites.filter((item) => item.id !== id));
  };
  const filteredFavorites = favorites.filter((item) => item.type === activeTab);
  const cardStyle = (isHovered: boolean): React.CSSProperties => ({
    background: isHovered ? "var(--hover-bg)" : "var(--bg-secondary)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "8px",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "background 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  });
  const titleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "6px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const timeStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
  };
  const deleteButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "var(--text-secondary)",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  };
  const tabContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "4px",
    borderBottom: "1px solid var(--border-color)",
    marginBottom: "16px",
    padding: "0",
  };
  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    background: "none",
    border: "none",
    color: isActive ? "var(--accent-color, #0066cc)" : "var(--text-secondary)",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s",
    borderRadius: "6px 6px 0 0",
    borderBottom: isActive ? "2px solid var(--accent-color, #0066cc)" : "none",
  });
  const formCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "16px",
    border: "1px solid var(--border-color)",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "8px",
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    marginBottom: "12px",
    boxSizing: "border-box",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
  };
  const buttonStyle: React.CSSProperties = {
    padding: "6px 14px",
    background: "var(--accent-color, #0066cc)",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.2s",
  };
  const fileInputStyle: React.CSSProperties = {
    marginBottom: "12px",
    fontSize: "12px",
    color: "var(--text-secondary)",
    width: "100%",
  };
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <div style={{ padding: "8px 12px", userSelect: "none" }}>
      <div style={tabContainerStyle}>
        <button
          style={tabButtonStyle(activeTab === "natural")}
          onClick={() => setActiveTab("natural")}
        >
          🗣️ {t("favorites.tabNatural")}
        </button>
        <button
          style={tabButtonStyle(activeTab === "skillFile")}
          onClick={() => setActiveTab("skillFile")}
        >
          📄 {t("favorites.tabSkillFile")}
        </button>
      </div>
      <div style={formCardStyle}>
        {activeTab === "natural" ? (
          <>
            <label style={labelStyle}>{t("favorites.naturalLabel")}</label>
            <textarea
              style={textareaStyle}
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              placeholder={t("favorites.naturalPlaceholder")}
            />
            <button style={buttonStyle} onClick={handleSaveNatural}>
              + {t("favorites.save")}
            </button>
          </>
        ) : (
          <>
            <label style={labelStyle}>{t("favorites.skillFileLabel")}</label>
            <input
              type="file"
              accept=".md,.skill.md"
              onChange={handleFileChange}
              style={fileInputStyle}
            />
            {skillFileName && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "12px",
                }}
              >
                📎 {t("favorites.selectedFile")}: {skillFileName}
              </div>
            )}
            <button
              style={buttonStyle}
              onClick={handleSaveSkillFile}
              disabled={!selectedFile}
            >
              + {t("favorites.save")}
            </button>
          </>
        )}
      </div>
      <div>
        {filteredFavorites.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {t("favorites.empty")}
          </div>
        ) : (
          filteredFavorites.map((item) => {
            const isHovered = hoveredId === item.id;
            return (
              <div
                key={item.id}
                style={cardStyle(isHovered)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={titleStyle}>
                    {item.type === "natural" ? "💬 " : "📄 "}
                    {item.content}
                  </div>
                  <div style={timeStyle}>
                    {item.fileName && (
                      <span style={{ marginRight: "12px" }}>
                        {item.fileName}
                      </span>
                    )}
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <button
                  style={deleteButtonStyle}
                  onClick={() => handleDeleteFavorite(item.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                    e.currentTarget.style.color = "var(--error-color, #dc2626)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FavoritesPanel;
