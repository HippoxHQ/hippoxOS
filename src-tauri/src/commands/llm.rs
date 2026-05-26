use serde::{Deserialize, Serialize};

use crate::commands::{ModelConfig, ModelInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmInstance {
    pub id: Option<String>,
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub workflow_mode: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(default)]
    pub extra: std::collections::HashMap<String, String>,
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
pub fn cmd_get_all_models(language: Option<String>) -> Vec<ModelInfo> {
    let lang = language.unwrap_or_else(|| "en".to_string());
    let is_zh = lang == "zh";

    vec![
        ModelInfo {
            id: "gpt-4".to_string(),
            name: if is_zh {
                "GPT-4".to_string()
            } else {
                "GPT-4".to_string()
            },
            provider: "openai".to_string(),
            provider_name: if is_zh {
                "OpenAI".to_string()
            } else {
                "OpenAI".to_string()
            },
            description: if is_zh {
                "最强大的GPT-4模型，适合复杂任务".to_string()
            } else {
                "The most powerful GPT-4 model, suitable for complex tasks".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "claude-3-opus".to_string(),
            name: if is_zh {
                "Claude 3 Opus".to_string()
            } else {
                "Claude 3 Opus".to_string()
            },
            provider: "anthropic".to_string(),
            provider_name: if is_zh {
                "Anthropic".to_string()
            } else {
                "Anthropic".to_string()
            },
            description: if is_zh {
                "最强大的Claude 3模型".to_string()
            } else {
                "The most powerful Claude 3 model".to_string()
            },
            streaming: true,
            context_length: Some(200000),
            recommended: true,
        },
        ModelInfo {
            id: "deepseek-chat".to_string(),
            name: if is_zh {
                "DeepSeek Chat".to_string()
            } else {
                "DeepSeek Chat".to_string()
            },
            provider: "deepseek".to_string(),
            provider_name: if is_zh {
                "DeepSeek".to_string()
            } else {
                "DeepSeek".to_string()
            },
            description: if is_zh {
                "DeepSeek对话模型".to_string()
            } else {
                "DeepSeek chat model".to_string()
            },
            streaming: true,
            context_length: Some(64000),
            recommended: true,
        },
        ModelInfo {
            id: "gemini-1.5-pro".to_string(),
            name: if is_zh {
                "Gemini 1.5 Pro".to_string()
            } else {
                "Gemini 1.5 Pro".to_string()
            },
            provider: "google".to_string(),
            provider_name: if is_zh {
                "Google".to_string()
            } else {
                "Google".to_string()
            },
            description: if is_zh {
                "Gemini 1.5 Pro，百万级上下文".to_string()
            } else {
                "Gemini 1.5 Pro, million-level context".to_string()
            },
            streaming: true,
            context_length: Some(1000000),
            recommended: true,
        },
        ModelInfo {
            id: "mixtral-8x7b-32k".to_string(),
            name: if is_zh {
                "Mixtral 8x7B".to_string()
            } else {
                "Mixtral 8x7B".to_string()
            },
            provider: "groq".to_string(),
            provider_name: if is_zh {
                "Groq".to_string()
            } else {
                "Groq".to_string()
            },
            description: if is_zh {
                "Groq加速的Mixtral模型".to_string()
            } else {
                "Groq-accelerated Mixtral model".to_string()
            },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "llama3-70b".to_string(),
            name: if is_zh {
                "Llama 3 70B".to_string()
            } else {
                "Llama 3 70B".to_string()
            },
            provider: "together".to_string(),
            provider_name: if is_zh {
                "Together.ai".to_string()
            } else {
                "Together.ai".to_string()
            },
            description: if is_zh {
                "Together.ai托管的Llama 3 70B".to_string()
            } else {
                "Together.ai hosted Llama 3 70B".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "mistral-large".to_string(),
            name: if is_zh {
                "Mistral Large".to_string()
            } else {
                "Mistral Large".to_string()
            },
            provider: "mistral".to_string(),
            provider_name: if is_zh {
                "Mistral AI".to_string()
            } else {
                "Mistral AI".to_string()
            },
            description: if is_zh {
                "Mistral Large模型".to_string()
            } else {
                "Mistral Large model".to_string()
            },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "command-r-plus".to_string(),
            name: if is_zh {
                "Command R+".to_string()
            } else {
                "Command R+".to_string()
            },
            provider: "cohere".to_string(),
            provider_name: if is_zh {
                "Cohere".to_string()
            } else {
                "Cohere".to_string()
            },
            description: if is_zh {
                "Cohere Command R+模型".to_string()
            } else {
                "Cohere Command R+ model".to_string()
            },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "qwen-plus".to_string(),
            name: if is_zh {
                "通义千问 Plus".to_string()
            } else {
                "Qwen Plus".to_string()
            },
            provider: "alibaba".to_string(),
            provider_name: if is_zh {
                "阿里云".to_string()
            } else {
                "Alibaba Cloud".to_string()
            },
            description: if is_zh {
                "阿里云通义千问Plus模型".to_string()
            } else {
                "Alibaba Tongyi Qianwen Plus model".to_string()
            },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "glm-4".to_string(),
            name: if is_zh {
                "GLM-4".to_string()
            } else {
                "GLM-4".to_string()
            },
            provider: "zhipu".to_string(),
            provider_name: if is_zh {
                "智谱 AI".to_string()
            } else {
                "Zhipu AI".to_string()
            },
            description: if is_zh {
                "智谱AI GLM-4模型".to_string()
            } else {
                "Zhipu AI GLM-4 model".to_string()
            },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "moonshot-v1-128k".to_string(),
            name: if is_zh {
                "Moonshot V1".to_string()
            } else {
                "Moonshot V1".to_string()
            },
            provider: "moonshot".to_string(),
            provider_name: if is_zh {
                "月之暗面".to_string()
            } else {
                "Moonshot AI".to_string()
            },
            description: if is_zh {
                "月之暗面Kimi模型".to_string()
            } else {
                "Moonshot Kimi model".to_string()
            },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "baichuan4".to_string(),
            name: if is_zh {
                "Baichuan 4".to_string()
            } else {
                "Baichuan 4".to_string()
            },
            provider: "baichuan".to_string(),
            provider_name: if is_zh {
                "百川智能".to_string()
            } else {
                "Baichuan AI".to_string()
            },
            description: if is_zh {
                "百川智能Baichuan 4模型".to_string()
            } else {
                "Baichuan AI Baichuan 4 model".to_string()
            },
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "yi-34b-chat".to_string(),
            name: if is_zh {
                "Yi-34B-Chat".to_string()
            } else {
                "Yi-34B-Chat".to_string()
            },
            provider: "yi".to_string(),
            provider_name: if is_zh {
                "零一万物".to_string()
            } else {
                "01.AI".to_string()
            },
            description: if is_zh {
                "零一万物Yi-34B对话模型".to_string()
            } else {
                "01.AI Yi-34B chat model".to_string()
            },
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "gpt-4".to_string(),
            name: if is_zh {
                "GPT-4".to_string()
            } else {
                "GPT-4".to_string()
            },
            provider: "azure".to_string(),
            provider_name: if is_zh {
                "Azure OpenAI".to_string()
            } else {
                "Azure OpenAI".to_string()
            },
            description: if is_zh {
                "Azure托管的GPT-4".to_string()
            } else {
                "Azure hosted GPT-4".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "ernie-4.0".to_string(),
            name: if is_zh {
                "ERNIE 4.0".to_string()
            } else {
                "ERNIE 4.0".to_string()
            },
            provider: "baidu".to_string(),
            provider_name: if is_zh {
                "百度文心".to_string()
            } else {
                "Baidu".to_string()
            },
            description: if is_zh {
                "百度文心一言ERNIE 4.0".to_string()
            } else {
                "Baidu Wenxin ERNIE 4.0".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "hunyuan-pro".to_string(),
            name: if is_zh {
                "Hunyuan Pro".to_string()
            } else {
                "Hunyuan Pro".to_string()
            },
            provider: "tencent".to_string(),
            provider_name: if is_zh {
                "腾讯混元".to_string()
            } else {
                "Tencent".to_string()
            },
            description: if is_zh {
                "腾讯混元Pro模型".to_string()
            } else {
                "Tencent Hunyuan Pro model".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "abab6.5".to_string(),
            name: if is_zh {
                "abab6.5".to_string()
            } else {
                "abab6.5".to_string()
            },
            provider: "minimax".to_string(),
            provider_name: if is_zh {
                "MiniMax".to_string()
            } else {
                "MiniMax".to_string()
            },
            description: if is_zh {
                "MiniMax abab6.5模型".to_string()
            } else {
                "MiniMax abab6.5 model".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
    ]
}

#[tauri::command]
pub fn cmd_get_models_by_provider(provider: String, language: Option<String>) -> Vec<ModelInfo> {
    cmd_get_all_models(language)
        .into_iter()
        .filter(|m| m.provider == provider)
        .collect()
}

#[tauri::command]
pub fn cmd_get_recommended_models(language: Option<String>) -> Vec<ModelInfo> {
    cmd_get_all_models(language)
        .into_iter()
        .filter(|m| m.recommended)
        .collect()
}

#[tauri::command]
pub fn cmd_get_all_providers() -> Vec<ProviderInfo> {
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
            name: "Google".to_string(),
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
        ProviderInfo {
            id: "azure".to_string(),
            name: "Azure OpenAI".to_string(),
            icon: "☁️".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![
                ExtraConfigField {
                    key: "endpoint".to_string(),
                    name: "Endpoint URL".to_string(),
                    placeholder: "https://your-resource.openai.azure.com/".to_string(),
                    required: true,
                },
                ExtraConfigField {
                    key: "deployment_name".to_string(),
                    name: "Deployment Name".to_string(),
                    placeholder: "gpt-4".to_string(),
                    required: true,
                },
            ],
        },
        ProviderInfo {
            id: "baidu".to_string(),
            name: "百度文心".to_string(),
            icon: "🔍".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "secret_key".to_string(),
                name: "Secret Key".to_string(),
                placeholder: "your secret key".to_string(),
                required: true,
            }],
        },
        ProviderInfo {
            id: "tencent".to_string(),
            name: "腾讯混元".to_string(),
            icon: "🐧".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![
                ExtraConfigField {
                    key: "secret_id".to_string(),
                    name: "Secret ID".to_string(),
                    placeholder: "your secret id".to_string(),
                    required: true,
                },
                ExtraConfigField {
                    key: "secret_key".to_string(),
                    name: "Secret Key".to_string(),
                    placeholder: "your secret key".to_string(),
                    required: true,
                },
            ],
        },
        ProviderInfo {
            id: "minimax".to_string(),
            name: "MiniMax".to_string(),
            icon: "🎯".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "group_id".to_string(),
                name: "Group ID".to_string(),
                placeholder: "your group id".to_string(),
                required: true,
            }],
        },
        ProviderInfo {
            id: "custom".to_string(),
            name: "Custom".to_string(),
            icon: "🦛".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "api_base".to_string(),
                name: "API Base URL".to_string(),
                placeholder: "https://api.custom.com/v1".to_string(),
                required: true,
            }],
        },
    ]
}
