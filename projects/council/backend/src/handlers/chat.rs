use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::llm::{call, call_with_tools};
use crate::models::chat::{
    AdviceForCounselor, AdviceRequest, AdviceResponse, AnswerQuestionRequest,
    ConversationContext, ConversationPhase, StartConversationRequest, StartConversationResponse,
};
use crate::models::profile::UserProfileUpdate;
use crate::skill::{SkillLoader, CounselorSkill};
use crate::models::chat::{SkillTopic, SkillTopicsResponse};
use serde_json::json;

pub struct AppState {
    pub conversations: Mutex<Vec<ConversationContext>>,
    pub skills: Mutex<Vec<CounselorSkill>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            conversations: Mutex::new(Vec::new()),
            skills: Mutex::new(Vec::new()),
        }
    }

    pub async fn load_skills(&self, skills_dir: std::path::PathBuf) {
        let loader = SkillLoader::new(skills_dir);
        if let Ok(skills) = loader.load_all() {
            let mut skills_lock = self.skills.lock().await;
            *skills_lock = skills;
        }
    }
}

/// Start a new conversation with initial problem
pub async fn start_conversation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<StartConversationRequest>,
) -> Result<Json<StartConversationResponse>, StatusCode> {
    // Generate the initial question using LLM
    let prompt = format!(
        "用户选择了以下谋士：{:?}。用户的问题是：\"{}\"\n\n\
        请作为一个睿智的古代谋士，用苏格拉底式提问法，提出一个深入探索这个问题的问题。\
        这个问题应该帮助用户更清晰地理解自己的处境、动机和潜在的选择。\n\n\
        请只返回一个简洁而有深度的问题，不要有多余的解释。",
        req.counselors, req.initial_problem
    );

    let question = call(&prompt)
        .await
        .map_err(|e| {
            tracing::error!("Failed to generate question: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let conversation = ConversationContext {
        user_id: req.user_id.clone(),
        counselors: req.counselors.clone(),
        initial_problem: req.initial_problem.clone(),
        socratic_answers: Vec::new(),
        current_phase: ConversationPhase::SocraticQuestions,
        current_question: Some(question.clone()),
        question_index: 0,
    };

    // Store conversation with ID based on index
    let conversation_id = req.user_id.clone();
    let mut conversations = state.conversations.lock().await;
    let conv_index = conversations.len();
    conversations.push(conversation);

    Ok(Json(StartConversationResponse {
        conversation_id: format!("{}_{}", conversation_id, conv_index),
        counselors: req.counselors,
        current_question: question,
        question_index: 0,
        total_questions: 5, // Fixed for now, could be dynamic
    }))
}

/// Submit an answer to the current Socratic question
pub async fn answer_question(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AnswerQuestionRequest>,
) -> Result<Json<ConversationContext>, StatusCode> {
    let mut conversations = state.conversations.lock().await;

    // Find conversation by user_id prefix (conversation_id may be "user1_0" format)
    let conv = conversations
        .iter_mut()
        .find(|c| req.conversation_id.starts_with(&c.user_id))
        .ok_or(StatusCode::NOT_FOUND)?;

    // Store the answer
    let socratic_answer = crate::models::chat::SocraticAnswer {
        question_id: format!("q_{}", conv.socratic_answers.len()),
        question: conv.current_question.clone().unwrap_or_default(),
        answer: req.answer.clone(),
    };
    conv.socratic_answers.push(socratic_answer);

    // Check if we have enough answers
    if conv.socratic_answers.len() >= 5 {
        // Move to advice phase
        conv.current_phase = ConversationPhase::WaitingForAdvice;
        conv.current_question = None;
    } else {
        // Generate follow-up question
        let followup = generate_followup_question(&conv.initial_problem, &conv.socratic_answers).await?;
        conv.current_question = Some(followup);
        conv.question_index = conv.socratic_answers.len();
    }

    Ok(Json(conv.clone()))
}

/// Generate the initial Socratic question based on the user's problem
pub async fn generate_initial_question(problem: &str) -> Result<String, StatusCode> {
    let prompt = format!(
        "用户提出了以下问题：{}。请用苏格拉底式提问法，提出一个深入探索这个问题的问题，帮助用户更清晰地理解自己的处境和需求。只返回一个问题。",
        problem
    );

    call(&prompt)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Generate a follow-up question based on previous answers
pub async fn generate_followup_question(
    problem: &str,
    answers: &[crate::models::chat::SocraticAnswer],
) -> Result<String, StatusCode> {
    let answers_text = answers
        .iter()
        .map(|a| format!("问：{}\n答：{}", a.question, a.answer))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "用户的问题是：{}。\n之前的问答：\n{}\n\n请基于以上对话，提出下一个苏格拉底式问题，深入探讨问题的另一个方面。只返回一个问题。",
        problem, answers_text
    );

    call(&prompt)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Generate advice from all counselors
pub async fn generate_advice(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AdviceRequest>,
) -> Result<Json<AdviceResponse>, StatusCode> {
    let mut advice_map = std::collections::HashMap::new();
    let skills = state.skills.lock().await;

    // Define tools for LLM to use
    let tools = vec![
        (
            "read_file".to_string(),
            "Read the content of a specific file from a counselour's skill directory.".to_string(),
            json!({
                "type": "object",
                "properties": {
                    "skill": {
                        "type": "string",
                        "description": "The skill/counselor name (e.g., 'zhang_liang', 'zhu_ge_liang')"
                    },
                    "file": {
                        "type": "string",
                        "description": "The filename to read (e.g., 'index.md', 'cases.md', 'quotes.md', 'questions.md', 'knowledge.md')"
                    }
                },
                "required": ["skill", "file"]
            }),
        ),
        (
            "grep".to_string(),
            "Search for a keyword across all files in a counselour's skill directory.".to_string(),
            json!({
                "type": "object",
                "properties": {
                    "skill": {
                        "type": "string",
                        "description": "The skill/counselor name (e.g., 'zhang_liang')"
                    },
                    "keyword": {
                        "type": "string",
                        "description": "The keyword to search for"
                    }
                },
                "required": ["skill", "keyword"]
            }),
        ),
        (
            "list_skills".to_string(),
            "List all available counselours/skills.".to_string(),
            json!({
                "type": "object",
                "properties": {}
            }),
        ),
        (
            "list_files".to_string(),
            "List all files available in a counselour's skill directory.".to_string(),
            json!({
                "type": "object",
                "properties": {
                    "skill": {
                        "type": "string",
                        "description": "The skill/counselor name (e.g., 'zhang_liang')"
                    }
                },
                "required": ["skill"]
            }),
        ),
    ];

    for counselor_name in &req.context.counselors {
        // Try exact match first, then partial match (case insensitive)
        let skill = skills.iter().find(|s| {
            let name_lower = s.name.to_lowercase();
            let display_lower = s.display_name.to_lowercase();
            let counselor_lower = counselor_name.to_lowercase();
            name_lower.contains(&counselor_lower)
                || counselor_lower.contains(&name_lower)
                || display_lower.contains(&counselor_lower)
                || counselor_lower.contains(&display_lower)
        });

        if let Some(skill) = skill {
            let prompt = build_advice_prompt_with_tools(skill, &req.context);
            let advice_text = call_with_tools(&prompt, tools.clone())
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let fragments = extract_fragments(skill, &req.context.initial_problem);

            // Use skill.name as key since it contains the full name
            advice_map.insert(skill.name.clone(), AdviceForCounselor {
                advice: advice_text,
                fragments,
            });
        }
    }

    Ok(Json(AdviceResponse { advice: advice_map }))
}

#[allow(dead_code)]
fn build_advice_prompt(skill: &CounselorSkill, context: &ConversationContext) -> String {
    // Format cases for the prompt
    let cases_text = if skill.cases.is_empty() {
        String::new()
    } else {
        skill.cases.iter()
            .map(|c| format!("【案例：{}】\n背景：{}\n决策：{}\n结果：{}",
                c.title, c.background, c.decision, c.result))
            .collect::<Vec<_>>()
            .join("\n\n")
    };

    // Format quotes for the prompt
    let quotes_text = if skill.quotes.on_strategy.is_empty() && skill.quotes.on_risk.is_empty() && skill.quotes.on_human_nature.is_empty() {
        String::new()
    } else {
        format!("策略观点：{}\n风险观点：{}\n人性观点：{}",
            skill.quotes.on_strategy, skill.quotes.on_risk, skill.quotes.on_human_nature)
    };

    format!(
        "你扮演{}（古代智者)。

背景信息：
- 人格特点：{:?}
- 决策风格：{}
- 价值观：{:?}

历史案例（如适用）：
{}

经典语录（如适用）：
{}

用户情况：
- 初始问题：{}
- 苏格拉底问答：{:?}

请结合你的性格特点和历史经验，给出有深度的独立建议。可以引用相关案例或语录。",
        skill.name,
        skill.personality.traits,
        skill.personality.decision_style,
        skill.personality.values,
        cases_text,
        quotes_text,
        context.initial_problem,
        context.socratic_answers
    )
}

fn build_advice_prompt_with_tools(skill: &CounselorSkill, context: &ConversationContext) -> String {
    format!(
        "你扮演{}（古代智者）。

用户情况：
- 初始问题：{}
- 苏格拉底问答：{:?}

你可以通过工具访问该谋士的 skill 文件。文件结构：
- index.md: 基本信息和文件索引
- cases.md: 历史案例
- quotes.md: 策略/风险/人性的观点语录
- questions.md: 苏格拉底追问模板
- knowledge.md: 知识碎片

你可以使用以下工具：
- read_file(skill=\"{skill_name}\", file=\"xxx.md\") - 读取指定文件
- grep(skill=\"{skill_name}\", keyword=\"xxx\") - 搜索关键词
- list_files(skill=\"{skill_name}\") - 列出可用文件

请先阅读 index.md 了解基本信息，然后根据用户问题选择性加载相关文件，最后给出有深度的建议。",
        skill.name,
        context.initial_problem,
        context.socratic_answers,
        skill_name = skill.name
    )
}

fn extract_fragments(skill: &CounselorSkill, query: &str) -> Vec<crate::models::chat::KnowledgeFragment> {
    // Simple keyword matching on knowledge_fragments
    skill.knowledge_fragments.iter()
        .filter(|f| query.contains(&f.topic) || f.topic.contains("通用"))
        .map(|f| crate::models::chat::KnowledgeFragment {
            topic: f.topic.clone(),
            content: f.content.clone(),
        })
        .collect()
}

/// Complete conversation - generate advice and diarize user profile
#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteConversationRequest {
    pub context: ConversationContext,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationCompleteResponse {
    pub advice: AdviceResponse,
    pub profile_hints: UserProfileUpdate,
}

/// Generate advice and diarize user profile from conversation
pub async fn complete_conversation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CompleteConversationRequest>,
) -> Result<Json<ConversationCompleteResponse>, StatusCode> {
    // Generate advice
    let advice = generate_advice(State(state), Json(AdviceRequest {
        context: req.context.clone(),
    })).await?;

    // Diarize user profile from conversation
    let profile_hints = diarize_user_profile(&req.context).await?;

    Ok(Json(ConversationCompleteResponse {
        advice: advice.0,
        profile_hints,
    }))
}

/// Extract user profile attributes from conversation using LLM
async fn diarize_user_profile(context: &ConversationContext) -> Result<UserProfileUpdate, StatusCode> {
    let prompt = format!(
        "分析以下对话，提取用户画像：\n\n\
        谋士：{:?}\n\
        初始问题：{}\n\
        问答：{:?}\n\n\
        输出JSON格式：{{
            \"situation\": \"用户处境摘要\",
            \"cautiousness\": 0-1分数,
            \"assertiveness\": 0-1分数,
            \"risk_tolerance\": 0-1分数,
            \"thinking_style\": \"理性分析型/直觉型\",
            \"favored_counselors\": [\"偏好的谋士列表\"]
        }}",
        context.counselors,
        context.initial_problem,
        context.socratic_answers
    );

    let response = call(&prompt).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let update: UserProfileUpdate = serde_json::from_str(&response).unwrap_or(UserProfileUpdate {
        situation: None,
        cautiousness: 0.5,
        assertiveness: 0.5,
        risk_tolerance: 0.5,
        thinking_style: "未知".to_string(),
        favored_counselors: vec![],
    });
    Ok(update)
}

// ============ Skill Progressive Disclosure APIs ============

/// List all available skills (counselors)
pub async fn list_skills(
    State(state): State<Arc<AppState>>,
) -> Json<crate::models::chat::SkillsListResponse> {
    let skills = state.skills.lock().await;
    let skill_infos: Vec<crate::models::chat::SkillInfo> = skills.iter().map(|s| {
        // Extract slug from name - e.g., "张良（约前250年—前186年）" -> "zhang_liang"
        // Chinese chars are alphanumeric in Rust, so is_alphanumeric works
        // We need pinyin-style slug for API usage
        let slug: String = s.name.chars()
            .take_while(|c| *c != '（' && *c != '(' && !c.is_ascii_digit())
            .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '_')
            .collect();
        let slug = slug.to_lowercase().replace(' ', "_");
        crate::models::chat::SkillInfo {
            id: slug,
            name: s.name.clone(),
        }
    }).collect();
    Json(crate::models::chat::SkillsListResponse { skills: skill_infos })
}

/// Get topics (case titles, quote categories, knowledge fragment topics) for a counselor
pub async fn get_skill_topics(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(skill_id): axum::extract::Path<String>,
) -> Result<Json<SkillTopicsResponse>, StatusCode> {
    let skills = state.skills.lock().await;

    // Find skill by slug-style match (partial, case-insensitive)
    let skill = skills.iter().find(|s| {
        // Build slug from name - extract just the Chinese characters before parens
        let slug = s.name.chars()
            .take_while(|c| *c != '(' && *c != '（' && !c.is_ascii_digit())
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == ' ')
            .collect::<String>()
            .to_lowercase()
            .replace(' ', "_");
        // Also try simple Chinese name match
        let simple_name = s.name.chars().take_while(|c| *c != '(' && *c != '（').collect::<String>();
        slug.contains(&skill_id.to_lowercase())
            || skill_id.to_lowercase().contains(&slug)
            || simple_name.contains(&skill_id)
            || skill_id.contains(&simple_name)
    }).ok_or(StatusCode::NOT_FOUND)?;

    let topics: Vec<SkillTopic> = skill.cases.iter().map(|c| SkillTopic {
        topic: c.title.clone(),
        category: "case".to_string(),
    }).chain(skill.knowledge_fragments.iter().map(|f| SkillTopic {
        topic: f.topic.clone(),
        category: "knowledge".to_string(),
    })).chain(vec![
        SkillTopic { topic: "策略观点".to_string(), category: "quote".to_string() },
        SkillTopic { topic: "风险观点".to_string(), category: "quote".to_string() },
        SkillTopic { topic: "人性观点".to_string(), category: "quote".to_string() },
    ].into_iter()).collect();

    Ok(Json(SkillTopicsResponse { topics }))
}

/// Get detailed content for a specific topic in a counselor's skill
pub async fn get_skill_content(
    State(state): State<Arc<AppState>>,
    axum::extract::Path((skill_id, topic)): axum::extract::Path<(String, String)>,
) -> Result<Json<crate::models::chat::SkillContentResponse>, StatusCode> {
    let skills = state.skills.lock().await;

    // Find skill by slug-style match
    let skill = skills.iter().find(|s| {
        // Build slug from name
        let slug = s.name.chars()
            .take_while(|c| !c.is_ascii_digit() && *c != '(')
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == ' ')
            .collect::<String>()
            .to_lowercase()
            .replace(' ', "_");
        // Also try simple Chinese name match
        let simple_name = s.name.chars().take_while(|c| *c != '(' && *c != '（').collect::<String>();
        slug.contains(&skill_id.to_lowercase())
            || skill_id.to_lowercase().contains(&slug)
            || simple_name.contains(&skill_id)
            || skill_id.contains(&simple_name)
    }).ok_or(StatusCode::NOT_FOUND)?;

    // Find the content based on topic and category
    // First check cases
    if let Some(case) = skill.cases.iter().find(|c| c.title == topic) {
        return Ok(Json(crate::models::chat::SkillContentResponse {
            topic: topic.clone(),
            content_type: "case".to_string(),
            title: Some(case.title.clone()),
            content: format!("【背景】{}\n\n【决策】{}\n\n【结果】{}",
                case.background, case.decision, case.result),
            quotes: vec![],
        }));
    }

    // Check knowledge fragments
    if let Some(fragment) = skill.knowledge_fragments.iter().find(|f| f.topic == topic) {
        return Ok(Json(crate::models::chat::SkillContentResponse {
            topic: topic.clone(),
            content_type: "knowledge".to_string(),
            title: None,
            content: fragment.content.clone(),
            quotes: vec![],
        }));
    }

    // Check quotes
    let quote = match topic.as_str() {
        "策略观点" => &skill.quotes.on_strategy,
        "风险观点" => &skill.quotes.on_risk,
        "人性观点" => &skill.quotes.on_human_nature,
        _ => return Err(StatusCode::NOT_FOUND),
    };

    if !quote.is_empty() {
        return Ok(Json(crate::models::chat::SkillContentResponse {
            topic,
            content_type: "quote".to_string(),
            title: None,
            content: quote.clone(),
            quotes: vec![],
        }));
    }

    Err(StatusCode::NOT_FOUND)
}