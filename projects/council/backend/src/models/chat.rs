use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationContext {
    pub user_id: String,
    pub counselors: Vec<String>,
    pub initial_problem: String,
    pub socratic_answers: Vec<SocraticAnswer>,
    pub current_phase: ConversationPhase,
}

#[derive(Debug, Serialize, Deserialize)]
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
pub struct AnswerQuestionRequest {
    pub conversation_id: String,
    pub answer: String,
}