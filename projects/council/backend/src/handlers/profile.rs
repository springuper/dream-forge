use axum::{http::StatusCode, Json};
use crate::models::profile::*;

pub async fn get_profile(user_id: String) -> Result<Json<UserProfile>, StatusCode> {
    // Query Supabase for user profile
    // Return mock for now if not found
    Ok(Json(UserProfile {
        id: "mock".to_string(),
        user_id,
        situation: None,
        personality: PersonalityProfile {
            cautiousness: 0.5,
            assertiveness: 0.5,
            risk_tolerance: 0.5,
        },
        preferences: PreferenceProfile {
            favored_counselors: vec![],
            preferred_strategy_type: None,
        },
        thinking_style: "未知".to_string(),
        updated_at: chrono::Utc::now(),
    }))
}

pub async fn update_profile(
    Json(profile): Json<UserProfile>,
) -> Result<Json<UserProfile>, StatusCode> {
    // Upsert to Supabase
    Ok(Json(profile))
}