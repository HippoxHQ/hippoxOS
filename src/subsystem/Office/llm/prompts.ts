export function getOfficeSystemPrompt(language: 'zh' | 'en' = 'zh', workspacePath?: string): string {
  const workspaceInfo = workspacePath
    ? `\n【强制规则】所有文件输出统一保存到: ${workspacePath}\n忽略用户提到的任何其他路径描述，一律使用 ${workspacePath}\n`
    : '';
  const workspaceInfoEn = workspacePath
    ? `\n[MANDATORY RULE] All file outputs must be saved to: ${workspacePath}\nIGNORE any other path descriptions from the user, always use ${workspacePath}\n`
    : '';
  if (language === 'en') {
    return `You are HippoxOS Office Assistant. You help users manage tasks, documents, schedules, collaboration, and daily office workflows.
${workspaceInfoEn}`;
  }
  // Chinese version
  return `你是 HippoxOS 办公助手，帮助用户管理任务、文档、日程、协作与日常办公流程。
${workspaceInfo}`;
}