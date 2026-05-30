use axum::{extract::State, http::StatusCode, Json};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::llm::call_gemini;
use crate::models::chat::{
    AnswerQuestionRequest, ConversationContext, ConversationPhase, StartConversationRequest,
};

pub struct AppState {
    pub conversations: Mutex<Vec<ConversationContext>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            conversations: Mutex::new(Vec::new()),
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

    call_gemini(&prompt)
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

    call_gemini(&prompt)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}