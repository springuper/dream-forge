use anyhow::Result;
use serde_json::Value;

pub async fn call_gemini(prompt: &str) -> Result<String> {
    let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await?
        .json::<Value>()
        .await?;

    let text = response["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(text)
}