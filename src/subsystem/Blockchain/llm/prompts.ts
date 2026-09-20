/**
 * Get the system prompt for Blockchain LLM interactions
 * Forces LLM to return map rendering data in the terminalResponse.earthview field
 * All conversational interactions MUST be expressed through map visualizations
 */
export function getBlockchainSystemPrompt(language: 'zh' | 'en' = 'zh', workspacePath?: string): string {
  const workspaceInfo = workspacePath
    ? `\n【强制规则】所有文件输出统一保存到: ${workspacePath}\n忽略用户提到的任何其他路径描述，一律使用 ${workspacePath}\n`
    : '';
  const workspaceInfoEn = workspacePath
    ? `\n[MANDATORY RULE] All file outputs must be saved to: ${workspacePath}\nIGNORE any other path descriptions from the user, always use ${workspacePath}\n`
    : '';
  if (language === 'en') {
    return ``;
  }
  // Chinese version
  return ``;
}