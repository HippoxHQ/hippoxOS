pub fn get_system_prompt(workspace_path: &str) -> String {
    format!(
        "[Important Rule] When performing file download, file write, or file creation operations, \
         if no target directory is explicitly specified, please use the following workspace directory by default: {}\n\
         Do not write files to system temp directory or any other non-workspace directories. \
         If subdirectories need to be created, create them under the workspace directory.",
        workspace_path
    )
}

pub fn get_enhanced_system_prompt(
    workspace_path: &str,
    additional_context: Option<&str>,
) -> String {
    let base_prompt = get_system_prompt(workspace_path);

    if let Some(context) = additional_context {
        format!("{}\n\n{}", base_prompt, context)
    } else {
        base_prompt
    }
}
