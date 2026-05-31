use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::llm::call;
use crate::models::chat::{
    AdviceForCounselor, AdviceRequest, AdviceResponse, AnswerQuestionRequest,
    ConversationContext, ConversationPhase, StartConversationRequest,
};
use crate::models::profile::UserProfileUpdate;
use crate::skill::{SkillLoader, CounselorSkill};

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
) -> Result<Json<ConversationContext>, StatusCode> {
    let conversation = ConversationContext {
        user_id: req.user_id,
        counselors: req.counselors,
        initial_problem: req.initial_problem.clone(),
        socratic_answers: Vec::new(),
        current_phase: ConversationPhase::InitialProblem,
    };

    let mut conversations = state.conversations.lock().await;
    conversations.push(conversation.clone());

    Ok(Json(conversation))
}

/// Submit an answer to the current Socratic question
pub async fn answer_question(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AnswerQuestionRequest>,
) -> Result<Json<ConversationContext>, StatusCode> {
    let mut conversations = state.conversations.lock().await;

    let conv = conversations
        .iter_mut()
        .find(|c| c.user_id == req.conversation_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    // Update conversation based on answer
    conv.current_phase = ConversationPhase::SocraticQuestions;

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

    for counselor_name in &req.context.counselors {
        let skill = skills.iter().find(|s| s.name == *counselor_name);

        if let Some(skill) = skill {
            let prompt = build_advice_prompt(skill, &req.context);
            let advice_text = call(&prompt)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let fragments = extract_fragments(skill, &req.context.initial_problem);

            advice_map.insert(counselor_name.clone(), AdviceForCounselor {
                advice: advice_text,
                fragments,
            });
        }
    }

    Ok(Json(AdviceResponse { advice: advice_map }))
}

fn build_advice_prompt(skill: &CounselorSkill, context: &ConversationContext) -> String {
    format!(
        "你扮演{}。\n\n人格特点：{:?}\n\n决策风格：{}\n\n用户的处境是：{}\n\n用户的回答：{:?}\n\n请给出你的独立建议和观点。",
        skill.name,
        skill.personality.traits,
        skill.personality.decision_style,
        context.initial_problem,
        context.socratic_answers
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