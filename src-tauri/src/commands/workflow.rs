use serde::{Deserialize, Serialize};
use tauri::command;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowModeInfo {
    pub name: String,
    pub display_name: String,
    pub description: String,
}
/// Get all workflow mode names
#[command]
pub fn cmd_get_workflow_mode_names() -> Vec<String> {
    vec!["ReAct".to_string(), "Batch".to_string(), "Chain".to_string(), "PlanAndExecute".to_string()]
}
/// Get workflow mode names in Chinese
#[command]
pub fn cmd_get_workflow_mode_names_zh() -> Vec<String> {
    vec!["反应式".to_string(), "批量式".to_string(), "链式".to_string(), "计划执行式".to_string()]
}
/// Get workflow mode names in English
#[command]
pub fn cmd_get_workflow_mode_names_en() -> Vec<String> {
    vec!["ReAct".to_string(), "Batch".to_string(), "Chain".to_string(), "PlanAndExecute".to_string()]
}
/// Get workflow mode names by language
#[command]
pub fn cmd_get_workflow_mode_names_by_lang(lang: String) -> Vec<String> {
    match lang.as_str() {
        "zh" | "zh-CN" | "zh-TW" => cmd_get_workflow_mode_names_zh(),
        _ => cmd_get_workflow_mode_names_en(),
    }
}
/// Convert string to workflow mode
#[command]
pub fn cmd_string_to_workflow_mode(s: String) -> Option<String> {
    match s.as_str() {
        "ReAct" | "react" | "反应式" => Some("ReAct".to_string()),
        "Batch" | "batch" | "批量式" => Some("Batch".to_string()),
        "Chain" | "chain" | "链式" => Some("Chain".to_string()),
        "PlanAndExecute" | "plan_and_execute" | "plan" | "计划执行式" => Some("PlanAndExecute".to_string()),
        _ => None,
    }
}
/// Convert workflow mode to string (lowercase)
#[command]
pub fn cmd_workflow_mode_to_string(mode: String) -> String {
    match mode.as_str() {
        "ReAct" => "react".to_string(),
        "Batch" => "batch".to_string(),
        "Chain" => "chain".to_string(),
        "PlanAndExecute" => "plan_and_execute".to_string(),
        _ => mode.to_lowercase(),
    }
}
/// Get workflow mode display name
#[command]
pub fn cmd_workflow_mode_display_name(mode: String) -> String {
    match mode.as_str() {
        "ReAct" => "ReAct".to_string(),
        "Batch" => "Batch".to_string(),
        "Chain" => "Chain".to_string(),
        "PlanAndExecute" => "Plan & Execute".to_string(),
        _ => mode.clone(),
    }
}
/// Get workflow mode display name in Chinese
#[command]
pub fn cmd_workflow_mode_display_name_zh(mode: String) -> String {
    match mode.as_str() {
        "ReAct" => "反应式".to_string(),
        "Batch" => "批量式".to_string(),
        "Chain" => "链式".to_string(),
        "PlanAndExecute" => "计划执行式".to_string(),
        _ => mode.clone(),
    }
}
/// Get workflow mode display name by language
#[command]
pub fn cmd_workflow_mode_display_name_by_lang(mode: String, lang: String) -> String {
    match lang.as_str() {
        "zh" | "zh-CN" | "zh-TW" => cmd_workflow_mode_display_name_zh(mode),
        _ => cmd_workflow_mode_display_name(mode),
    }
}
/// Get workflow mode description in Chinese
#[command]
pub fn cmd_workflow_mode_description_zh(mode: String) -> String {
    match mode.as_str() {
        "ReAct" => "思考 → 行动 → 观察循环模式，每次执行后由 LLM 决策下一步，最适合开放式任务、动态决策和错误恢复".to_string(),
        "Batch" => "批量并行执行多个独立的驱动，驱动之间无依赖关系，最适合批量处理和独立操作".to_string(),
        "Chain" => "链式串行执行，驱动间可传递变量，最适合线性流水线和数据转换链".to_string(),
        "PlanAndExecute" => "先规划后执行模式，支持条件判断、变量引用和错误处理，最适合复杂工作流和确定性任务".to_string(),
        _ => mode,
    }
}
/// Get workflow mode description in English
#[command]
pub fn cmd_workflow_mode_description_en(mode: String) -> String {
    match mode.as_str() {
        "ReAct" => "Think → Act → Observe loop mode. Each driver execution is followed by LLM decision for next step. Best for open-ended tasks, dynamic decision making, and error recovery.".to_string(),
        "Batch" => "Execute multiple independent drivers in parallel. Drivers have no dependencies on each other. Best for batch processing and independent operations.".to_string(),
        "Chain" => "Sequential execution with variable passing between drivers. Best for linear pipelines and data transformation chains.".to_string(),
        "PlanAndExecute" => "One-time planning with full workflow support. Supports conditionals, variable references, and error handling. Best for complex workflows and deterministic tasks.".to_string(),
        _ => mode,
    }
}
/// Get workflow mode description by language
#[command]
pub fn cmd_workflow_mode_description(mode: String, lang: String) -> String {
    match lang.as_str() {
        "zh" | "zh-CN" | "zh-TW" => cmd_workflow_mode_description_zh(mode),
        _ => cmd_workflow_mode_description_en(mode),
    }
}
/// Get all workflow mode info by language
#[command]
pub fn cmd_get_all_workflow_mode_info(lang: String) -> Vec<WorkflowModeInfo> {
    let modes = vec!["ReAct", "Batch", "Chain", "PlanAndExecute"];
    let is_zh = lang == "zh" || lang == "zh-CN" || lang == "zh-TW";
    modes
        .into_iter()
        .map(|mode| {
            let mode_str = mode.to_string();
            let display_name =
                if is_zh { cmd_workflow_mode_display_name_zh(mode_str.clone()) } else { cmd_workflow_mode_display_name(mode_str.clone()) };
            let description =
                if is_zh { cmd_workflow_mode_description_zh(mode_str.clone()) } else { cmd_workflow_mode_description_en(mode_str.clone()) };
            WorkflowModeInfo { name: mode_str, display_name, description }
        })
        .collect()
}
