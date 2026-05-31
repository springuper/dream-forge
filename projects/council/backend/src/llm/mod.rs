use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct LLMConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            base_url: std::env::var("ANTHROPIC_BASE_URL")
                .unwrap_or_else(|_| "https://api.minimaxi.com/anthropic".to_string()),
            api_key: std::env::var("ANTHROPIC_AUTH_TOKEN")
                .unwrap_or_else(|_| "".to_string()),
            model: std::env::var("ANTHROPIC_MODEL")
                .unwrap_or_else(|_| "MiniMax-M2.7".to_string()),
        }
    }
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct RequestBody {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Tool>>,
}

#[derive(Debug, Serialize)]
struct Tool {
    name: String,
    description: String,
    input_schema: Value,
}

#[derive(Debug, Deserialize)]
struct ResponseBody {
    content: Vec<ResponseContent>,
}

#[derive(Debug, Deserialize)]
struct ResponseContent {
    text: Option<String>,
    #[serde(rename = "type")]
    content_type: String,
}

/// Call LLM with a simple prompt (single turn)
pub async fn call(prompt: &str) -> Result<String> {
    let config = LLMConfig::default();
    call_with_config(&config, prompt, vec![]).await
}

/// Call LLM with conversation history (multi-turn)
pub async fn call_with_history(messages: Vec<(String, String)>) -> Result<String> {
    let config = LLMConfig::default();
    let formatted: Vec<Message> = messages
        .into_iter()
        .map(|(role, content)| Message { role, content })
        .collect();
    call_with_config(&config, "", formatted).await
}

/// Call LLM with config and messages
async fn call_with_config(config: &LLMConfig, prompt: &str, messages: Vec<Message>) -> Result<String> {
    let client = Client::new();

    // Build messages - if prompt provided, add as user message
    let mut all_messages = messages;
    if !prompt.is_empty() {
        all_messages.push(Message {
            role: "user".to_string(),
            content: prompt.to_string(),
        });
    }

    let body = RequestBody {
        model: config.model.clone(),
        messages: all_messages,
        max_tokens: 4096,
        tools: None,
    };

    let url = format!("{}/v1/messages", config.base_url);
    let response = client
        .post(&url)
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .context("Failed to send request to LLM")?
        .json::<ResponseBody>()
        .await
        .context("Failed to parse LLM response")?;

    let text = response
        .content
        .first()
        .and_then(|c| c.text.clone())
        .unwrap_or_default();

    Ok(text)
}

/// Call LLM with tool calling support (for progressive disclosure)
pub async fn call_with_tools(prompt: &str, tools: Vec<(String, String, Value)>) -> Result<String> {
    let config = LLMConfig::default();
    let client = Client::new();

    let formatted_tools: Vec<Tool> = tools
        .into_iter()
        .map(|(name, description, input_schema)| Tool {
            name,
            description,
            input_schema,
        })
        .collect();

    let body = RequestBody {
        model: config.model.clone(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        max_tokens: 4096,
        tools: Some(formatted_tools),
    };

    let url = format!("{}/v1/messages", config.base_url);
    let response = client
        .post(&url)
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .context("Failed to send request to LLM")?
        .json::<ResponseBody>()
        .await
        .context("Failed to parse LLM response")?;

    let text = response
        .content
        .first()
        .and_then(|c| c.text.clone())
        .unwrap_or_default();

    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_call() {
        // Skip if no API key
        if std::env::var("ANTHROPIC_AUTH_TOKEN").is_err() {
            return;
        }

        let result = call("Hello, are you working?").await;
        assert!(result.is_ok());
    }
}