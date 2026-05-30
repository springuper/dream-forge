use crate::models::auth::{AuthCallback, User};
use axum::{extract::Query, http::StatusCode, response::IntoResponse, Json};

/// Redirect to Google OAuth
/// For now, returns mock redirect info
pub async fn google_login() -> impl IntoResponse {
    Json(serde_json::json!({
        "message": "Redirect to Google OAuth",
        "redirect_url": "https://accounts.google.com/o/oauth2/v2/auth"
    }))
}

/// Handle OAuth callback from Google
/// For now, returns mock user (actual Google OAuth requires GOOGLE_CLIENT_ID/SECRET env vars)
pub async fn google_callback(Query(params): Query<AuthCallback>) -> impl IntoResponse {
    tracing::info!("Google OAuth callback received with code: {}", params.code);

    // TODO: Exchange code for token using Google OAuth API
    // TODO: Fetch user info from Google
    // For now, return mock user
    let mock_user = User {
        id: "mock_user_id_123".to_string(),
        email: "strategist@council.ancient".to_string(),
        name: Some("Sun Tzu".to_string()),
        picture: None,
    };

    (StatusCode::OK, Json(serde_json::json!({ "user": mock_user })))
}

/// Get current authenticated user
/// For now, returns mock user from session
pub async fn get_current_user() -> impl IntoResponse {
    // TODO: Extract user from session/token
    // For now, return mock user
    let mock_user = User {
        id: "mock_user_id_123".to_string(),
        email: "strategist@council.ancient".to_string(),
        name: Some("Sun Tzu".to_string()),
        picture: None,
    };

    Json(serde_json::json!({ "user": mock_user }))
}