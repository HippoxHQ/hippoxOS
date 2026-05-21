use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub provider_name: String,
    pub description: String,
    pub streaming: bool,
    pub context_length: Option<usize>,
    pub recommended: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub requires_api_key: bool,
    pub requires_extra_config: bool,
    pub extra_config_fields: Vec<ExtraConfigField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtraConfigField {
    pub key: String,
    pub name: String,
    pub placeholder: String,
    pub required: bool,
}

#[tauri::command]
pub fn get_all_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "gpt-4".to_string(),
            name: "GPT-4".to_string(),
            provider: "openai".to_string(),
            provider_name: "OpenAI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "gpt-4-turbo".to_string(),
            name: "GPT-4 Turbo".to_string(),
            provider: "openai".to_string(),
            provider_name: "OpenAI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "gpt-3.5-turbo".to_string(),
            name: "GPT-3.5 Turbo".to_string(),
            provider: "openai".to_string(),
            provider_name: "OpenAI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(16384),
            recommended: false,
        },
        ModelInfo {
            id: "claude-3-opus".to_string(),
            name: "Claude 3 Opus".to_string(),
            provider: "anthropic".to_string(),
            provider_name: "Anthropic".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(200000),
            recommended: true,
        },
        ModelInfo {
            id: "claude-3-sonnet".to_string(),
            name: "Claude 3 Sonnet".to_string(),
            provider: "anthropic".to_string(),
            provider_name: "Anthropic".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(200000),
            recommended: true,
        },
        ModelInfo {
            id: "claude-3-haiku".to_string(),
            name: "Claude 3 Haiku".to_string(),
            provider: "anthropic".to_string(),
            provider_name: "Anthropic".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(200000),
            recommended: false,
        },
        ModelInfo {
            id: "deepseek-chat".to_string(),
            name: "DeepSeek Chat".to_string(),
            provider: "deepseek".to_string(),
            provider_name: "DeepSeek".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(64000),
            recommended: true,
        },
        ModelInfo {
            id: "gemini-1.5-pro".to_string(),
            name: "Gemini 1.5 Pro".to_string(),
            provider: "google".to_string(),
            provider_name: "Google".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(1000000),
            recommended: true,
        },
        ModelInfo {
            id: "gemini-1.5-flash".to_string(),
            name: "Gemini 1.5 Flash".to_string(),
            provider: "google".to_string(),
            provider_name: "Google".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(1000000),
            recommended: false,
        },
        ModelInfo {
            id: "command-r-plus".to_string(),
            name: "Command R+".to_string(),
            provider: "cohere".to_string(),
            provider_name: "Cohere".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(128000),
            recommended: false,
        },
        ModelInfo {
            id: "mistral-large".to_string(),
            name: "Mistral Large".to_string(),
            provider: "mistral".to_string(),
            provider_name: "Mistral AI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "mixtral-8x7b".to_string(),
            name: "Mixtral 8x7B".to_string(),
            provider: "mistral".to_string(),
            provider_name: "Mistral AI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "mixtral-8x7b-32k".to_string(),
            name: "Mixtral 8x7B (Groq)".to_string(),
            provider: "groq".to_string(),
            provider_name: "Groq".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "llama3-70b-8192".to_string(),
            name: "Llama 3 70B (Groq)".to_string(),
            provider: "groq".to_string(),
            provider_name: "Groq".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "qwen-plus".to_string(),
            name: "通义千问 Plus".to_string(),
            provider: "alibaba".to_string(),
            provider_name: "阿里云".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "glm-4".to_string(),
            name: "GLM-4".to_string(),
            provider: "zhipu".to_string(),
            provider_name: "智谱 AI".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "baichuan4".to_string(),
            name: "Baichuan 4".to_string(),
            provider: "baichuan".to_string(),
            provider_name: "百川智能".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "yi-34b-chat".to_string(),
            name: "Yi-34B-Chat".to_string(),
            provider: "yi".to_string(),
            provider_name: "零一万物".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "moonshot-v1-128k".to_string(),
            name: "Moonshot V1 128K".to_string(),
            provider: "moonshot".to_string(),
            provider_name: "月之暗面".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "llama3-70b".to_string(),
            name: "Llama 3 70B".to_string(),
            provider: "together".to_string(),
            provider_name: "Together.ai".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "llama3-8b".to_string(),
            name: "Llama 3 8B".to_string(),
            provider: "together".to_string(),
            provider_name: "Together.ai".to_string(),
            description: "".to_string(),
            streaming: true,
            context_length: Some(8192),
            recommended: false,
        },
    ]
}

#[tauri::command]
pub fn get_all_providers() -> Vec<ProviderInfo> {
    vec![
        ProviderInfo {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            icon: "🔵".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            icon: "🟣".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "deepseek".to_string(),
            name: "DeepSeek".to_string(),
            icon: "🟢".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "google".to_string(),
            name: "Google AI".to_string(),
            icon: "🔴".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            icon: "⚡".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "together".to_string(),
            name: "Together.ai".to_string(),
            icon: "🤝".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "mistral".to_string(),
            name: "Mistral AI".to_string(),
            icon: "🪶".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "cohere".to_string(),
            name: "Cohere".to_string(),
            icon: "📐".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "alibaba".to_string(),
            name: "阿里云".to_string(),
            icon: "☁️".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "zhipu".to_string(),
            name: "智谱 AI".to_string(),
            icon: "🧠".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "moonshot".to_string(),
            name: "月之暗面".to_string(),
            icon: "🌙".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "baichuan".to_string(),
            name: "百川智能".to_string(),
            icon: "🌊".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
        ProviderInfo {
            id: "yi".to_string(),
            name: "零一万物".to_string(),
            icon: "1️⃣".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
        },
    ]
}

#[tauri::command]
pub fn get_models_by_provider(provider: String) -> Vec<ModelInfo> {
    get_all_models()
        .into_iter()
        .filter(|m| m.provider == provider)
        .collect()
}

#[tauri::command]
pub fn get_recommended_models() -> Vec<ModelInfo> {
    get_all_models()
        .into_iter()
        .filter(|m| m.recommended)
        .collect()
}
