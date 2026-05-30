use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CounselorSkill {
    pub name: String,
    pub personality: Personality,
    pub cases: Vec<Case>,
    pub quotes: Quotes,
    pub questions: Questions,
    pub knowledge_fragments: Vec<KnowledgeFragment>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Personality {
    pub traits: Vec<String>,
    pub decision_style: String,
    pub values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Case {
    pub title: String,
    pub background: String,
    pub decision: String,
    pub result: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Quotes {
    pub on_strategy: String,
    pub on_risk: String,
    pub on_human_nature: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Questions {
    pub general: Vec<String>,
    pub customized: Vec<String>,
    pub by_scenario: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeFragment {
    pub topic: String,
    pub content: String,
}