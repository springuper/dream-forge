use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationContext {
    pub user_id: String,
    pub counselors: Vec<String>,
    pub initial_problem: String,
    pub socratic_answers: Vec<SocraticAnswer>,
    pub current_phase: ConversationPhase,
    #[serde(default)]
    pub current_question: Option<String>,
    #[serde(default)]
    pub question_index: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SocraticAnswer {
    pub question_id: String,
    pub question: String,
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ConversationPhase {
    InitialProblem,
    SocraticQuestions,
    WaitingForAdvice,
    AdviceGiven,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartConversationRequest {
    pub user_id: String,
    pub counselors: Vec<String>,
    pub initial_problem: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartConversationResponse {
    pub conversation_id: String,
    pub counselors: Vec<String>,
    pub current_question: String,
    pub question_index: usize,
    pub total_questions: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnswerQuestionRequest {
    pub conversation_id: String,
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdviceRequest {
    pub context: ConversationContext,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeFragment {
    pub topic: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdviceForCounselor {
    pub advice: String,
    pub fragments: Vec<KnowledgeFragment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdviceResponse {
    pub advice: std::collections::HashMap<String, AdviceForCounselor>,
}

// ============ Skill Progressive Disclosure Types ============

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillTopic {
    pub topic: String,
    pub category: String, // "case", "knowledge", "quote"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillTopicsResponse {
    pub topics: Vec<SkillTopic>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillContentResponse {
    pub topic: String,
    pub content_type: String, // "case", "knowledge", "quote"
    pub title: Option<String>,
    pub content: String,
    pub quotes: Vec<String>, // For case content, related quotes if any
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub id: String,       // slug like "zhang_liang"
    pub name: String,    // display name like "张良（约前250年—前186年）"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillsListResponse {
    pub skills: Vec<SkillInfo>,
}