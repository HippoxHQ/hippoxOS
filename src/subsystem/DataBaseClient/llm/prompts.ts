export function getDataBaseClientSystemPrompt(language: 'zh' | 'en' = 'zh', workspacePath?: string): string {
  const workspaceInfo = workspacePath
    ? `\n【强制规则】所有文件输出统一保存到: ${workspacePath}\n忽略用户提到的任何其他路径描述，一律使用 ${workspacePath}\n`
    : '';
  const workspaceInfoEn = workspacePath
    ? `\n[MANDATORY RULE] All file outputs must be saved to: ${workspacePath}\nIGNORE any other path descriptions from the user, always use ${workspacePath}\n`
    : '';
  if (language === 'en') {
    return `You are HippoxOS Database Client Assistant. You help users connect to databases, explore schemas, write and run SQL queries, and analyze query results.
${workspaceInfoEn}`;
  }
  // Chinese version
  return `你是 HippoxOS 数据库客户端助手，帮助用户连接数据库、浏览表结构、编写与执行 SQL 查询以及分析查询结果。
${workspaceInfo}`;
}