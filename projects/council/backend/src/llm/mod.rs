use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

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

#[derive(Debug, Clone, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize)]
struct Tool {
    name: String,
    description: String,
    input_schema: Value,
}

#[derive(Debug, Clone, Serialize)]
struct RequestBody {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Tool>>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct ResponseBody {
    content: Vec<ResponseContent>,
    #[serde(default)]
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ResponseContent {
    #[serde(default)]
    text: Option<String>,
    #[serde(rename = "type")]
    content_type: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    input: Option<serde_json::Value>,
}

/// Call LLM with a simple prompt (single turn)
pub async fn call(prompt: &str) -> Result<String> {
    let config = LLMConfig::default();
    call_with_config(&config, prompt, vec![], None).await
}

/// Call LLM with conversation history (multi-turn)
pub async fn call_with_history(messages: Vec<(String, String)>) -> Result<String> {
    let config = LLMConfig::default();
    let formatted: Vec<Message> = messages
        .into_iter()
        .map(|(role, content)| Message { role, content })
        .collect();
    call_with_config(&config, "", formatted, None).await
}

/// Call LLM with config and messages
async fn call_with_config(config: &LLMConfig, prompt: &str, mut messages: Vec<Message>, tools: Option<Vec<Tool>>) -> Result<String> {
    let client = Client::new();

    // Build messages - if prompt provided, add as user message
    if !prompt.is_empty() {
        messages.push(Message {
            role: "user".to_string(),
            content: prompt.to_string(),
        });
    }

    let body = RequestBody {
        model: config.model.clone(),
        messages,
        max_tokens: 4096,
        tools,
    };

    let url = format!("{}/v1/messages", config.base_url);
    tracing::debug!("LLM request to: {}", url);

    let response = client
        .post(&url)
        .header("x-api-key", &config.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .context("Failed to send request to LLM")?;

    let status = response.status();
    let body_text = response.text().await.unwrap_or_default();
    tracing::debug!("LLM response status: {}, body: {}", status, body_text);

    let response_body: ResponseBody = serde_json::from_str(&body_text)
        .context("Failed to parse LLM response")?;

    // MiniMax may return multiple content items - find the first text type
    let text = response_body
        .content
        .iter()
        .find(|c| c.content_type.as_deref() == Some("text"))
        .and_then(|c| c.text.clone())
        .unwrap_or_default();

    tracing::debug!("LLM extracted text: {}", text);
    Ok(text)
}

/// Call LLM with tool calling support - handles multi-turn tool calls
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

    let mut messages = vec![Message {
        role: "user".to_string(),
        content: prompt.to_string(),
    }];

    // Tool use loop - continue until no more tool calls
    loop {
        let body = RequestBody {
            model: config.model.clone(),
            messages: messages.clone(),
            max_tokens: 4096,
            tools: Some(formatted_tools.clone()),
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
            .context("Failed to send request to LLM")?;

        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        tracing::debug!("LLM response status: {}, body: {}", status, body_text);

        let response_body: ResponseBody = serde_json::from_str(&body_text)
            .context("Failed to parse LLM response")?;

        // Check if there are tool calls
        let tool_calls: Vec<_> = response_body.content.iter()
            .filter(|c| c.content_type.as_deref() == Some("tool_use"))
            .collect();

        if tool_calls.is_empty() {
            // No tool calls, return the text response
            let text = response_body
                .content
                .iter()
                .find(|c| c.content_type.as_deref() == Some("text"))
                .and_then(|c| c.text.clone())
                .unwrap_or_default();
            return Ok(text);
        }

        // Process each tool call and add results to messages
        for tool_call in tool_calls {
            if let (Some(name), Some(input)) = (&tool_call.name, &tool_call.input) {
                let tool_name = name.clone();
                let tool_input = input.clone();

                // Execute the tool call
                let tool_result = execute_tool(&tool_name, tool_input.clone()).await?;

                // Add assistant message with tool call
                messages.push(Message {
                    role: "assistant".to_string(),
                    content: serde_json::to_string(&serde_json::json!({
                        "type": "tool_use",
                        "name": tool_name,
                        "input": tool_input
                    })).unwrap_or_default(),
                });

                // Add user message with tool result
                messages.push(Message {
                    role: "user".to_string(),
                    content: serde_json::to_string(&serde_json::json!({
                        "type": "tool_result",
                        "content": tool_result
                    })).unwrap_or_default(),
                });
            }
        }
    }
}

/// Execute a tool based on name and input
async fn execute_tool(name: &str, input: serde_json::Value) -> Result<String> {
    match name {
        "read_file" => {
            let skill = input.get("skill")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let file = input.get("file")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let content = read_skill_file(skill, file)?;
            Ok(content)
        }
        "grep" => {
            let skill = input.get("skill")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let keyword = input.get("keyword")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let results = grep_skill(skill, keyword)?;
            Ok(results)
        }
        "list_skills" => {
            let results = list_all_skills()?;
            Ok(results)
        }
        "list_files" => {
            let skill = input.get("skill")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let results = list_skill_files(skill)?;
            Ok(results)
        }
        _ => Ok(format!("Unknown tool: {}", name))
    }
}

/// Read a specific file from a skill directory
fn read_skill_file(skill: &str, file: &str) -> Result<String> {
    let skills_dir = PathBuf::from("skills");
    let skill_path = skills_dir.join(skill).join(file);

    if !skill_path.exists() {
        return Ok(format!("File not found: {}/{}", skill, file));
    }

    let content = std::fs::read_to_string(&skill_path)
        .context("Failed to read skill file")?;

    Ok(content)
}

/// Grep through all files in a skill directory for keyword
fn grep_skill(skill: &str, keyword: &str) -> Result<String> {
    let skills_dir = PathBuf::from("skills");
    let skill_path = skills_dir.join(skill);

    if !skill_path.exists() {
        return Ok(format!("Skill not found: {}", skill));
    }

    let mut results = Vec::new();
    let keyword_lower = keyword.to_lowercase();

    for entry in std::fs::read_dir(skill_path)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let content = std::fs::read_to_string(&path)?;
            for line in content.lines() {
                if line.to_lowercase().contains(&keyword_lower) {
                    results.push(format!("{}: {}", path.file_name().unwrap().to_string_lossy(), line.trim()));
                }
            }
        }
    }

    if results.is_empty() {
        Ok(format!("No matches found for '{}' in {}", keyword, skill))
    } else {
        Ok(results.join("\n"))
    }
}

/// List all available skills (counselors)
fn list_all_skills() -> Result<String> {
    let skills_dir = PathBuf::from("skills");

    let mut skills = Vec::new();
    for entry in std::fs::read_dir(skills_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            // Check for index.md to get display name
            let index_path = path.join("index.md");
            let display_name = if index_path.exists() {
                let content = std::fs::read_to_string(&index_path)?;
                content.lines().next()
                    .map(|l| l.trim_start_matches("# ").to_string())
                    .unwrap_or(name.clone())
            } else {
                name.clone()
            };
            skills.push(format!("- {} ({})", name, display_name));
        }
    }

    Ok(skills.join("\n"))
}

/// List all files in a skill directory
fn list_skill_files(skill: &str) -> Result<String> {
    let skills_dir = PathBuf::from("skills");
    let skill_path = skills_dir.join(skill);

    if !skill_path.exists() {
        return Ok(format!("Skill not found: {}", skill));
    }

    let mut files = Vec::new();
    for entry in std::fs::read_dir(skill_path)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            files.push(name);
        }
    }

    files.sort();
    Ok(files.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_call() {
        if std::env::var("ANTHROPIC_AUTH_TOKEN").is_err() {
            return;
        }

        let result = call("Hello, are you working?").await;
        assert!(result.is_ok());
    }
}