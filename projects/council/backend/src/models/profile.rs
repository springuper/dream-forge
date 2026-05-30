use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: String,
    pub user_id: String,
    pub situation: Option<String>,
    pub personality: PersonalityProfile,
    pub preferences: PreferenceProfile,
    pub thinking_style: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalityProfile {
    pub cautiousness: f32,    // 0-1
    pub assertiveness: f32,   // 0-1
    pub risk_tolerance: f32,  // 0-1
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PreferenceProfile {
    pub favored_counselors: Vec<String>,
    pub preferred_strategy_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfileUpdate {
    pub situation: Option<String>,
    pub cautiousness: f32,
    pub assertiveness: f32,
    pub risk_tolerance: f32,
    pub thinking_style: String,
    pub favored_counselors: Vec<String>,
}