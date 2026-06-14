use crate::models::auth::User;
use axum::{
    extract::Query,
    http::{StatusCode, HeaderMap, HeaderValue},
    response::{IntoResponse, Redirect, Response, Json},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    token_type: String,
    id_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleUserInfo {
    id: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
}

/// Redirect to Google OAuth login
pub async fn google_login() -> impl IntoResponse {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let redirect_uri = "http://localhost:8080/api/auth/callback";

    let redirect_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
        ?client_id={}\
        &response_type=code\
        &redirect_uri={}\
        &scope=openid%20email%20profile\
        &state=random_state_string",
        client_id, redirect_uri
    );

    Redirect::temporary(&redirect_url)
}

/// Handle OAuth callback from Google - exchange code for tokens
pub async fn google_callback(Query(params): Query<crate::models::auth::AuthCallback>) -> Response {
    tracing::info!("Google OAuth callback received with code: {}", params.code);

    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default();
    let redirect_uri = "http://localhost:8080/api/auth/callback";

    // Exchange code for tokens
    let token_url = "https://oauth2.googleapis.com/token";
    let client = reqwest::Client::new();

    let params = [
        ("grant_type", "authorization_code"),
        ("code", &params.code),
        ("redirect_uri", redirect_uri),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
    ];

    let token_response = match client
        .post(token_url)
        .form(&params)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            tracing::error!("Failed to exchange code for token: {}", e);
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(axum::body::Body::from(r#"{"error":"token exchange failed"}"#))
                .unwrap()
                .into_response();
        }
    };

    let token_data: GoogleTokenResponse = match token_response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Failed to parse token response: {}", e);
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(axum::body::Body::from(r#"{"error":"invalid token response"}"#))
                .unwrap()
                .into_response();
        }
    };

    // Get user info using access token
    let user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo";
    let user_response = match client
        .get(user_info_url)
        .header("Authorization", format!("Bearer {}", token_data.access_token))
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            tracing::error!("Failed to get user info: {}", e);
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(axum::body::Body::from(r#"{"error":"user info fetch failed"}"#))
                .unwrap()
                .into_response();
        }
    };

    let google_user: GoogleUserInfo = match user_response.json().await {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Failed to parse user info: {}", e);
            return axum::http::Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(axum::body::Body::from(r#"{"error":"invalid user info"}"#))
                .unwrap()
                .into_response();
        }
    };

    tracing::info!("User logged in: {} ({})", google_user.name.as_deref().unwrap_or("unknown"), google_user.email);

    // Return user with session token as JSON (frontend stores it)
    let session_token = format!("session_{}", google_user.id);

    let body = serde_json::json!({
        "user": {
            "id": google_user.id,
            "email": google_user.email,
            "name": google_user.name,
            "picture": google_user.picture,
        },
        "session_token": session_token
    });

    axum::http::Response::builder()
        .status(StatusCode::OK)
        .header("X-Session-Token", &session_token)
        .body(axum::body::Body::from(serde_json::to_string(&body).unwrap()))
        .unwrap()
        .into_response()
}

/// Get current authenticated user
pub async fn get_current_user(headers: HeaderMap) -> Response {
    // Extract session token from header
    let session_token = headers
        .get("X-Session-Token")
        .and_then(|v| v.to_str().ok());

    if session_token.is_none() {
        return axum::http::Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(axum::body::Body::from(r#"{"error":"not authenticated"}"#))
            .unwrap()
            .into_response();
    }

    let token = session_token.unwrap();
    if !token.starts_with("session_") {
        return axum::http::Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(axum::body::Body::from(r#"{"error":"invalid session"}"#))
            .unwrap()
            .into_response();
    }

    let user_id = &token[8..];

    // In production, fetch user from database by session
    // For now, return mock user with the ID from session
    let user = User {
        id: user_id.to_string(),
        email: format!("user_{}@example.com", user_id),
        name: Some("User".to_string()),
        picture: None,
    };

    let body = serde_json::json!({ "user": user });

    axum::http::Response::builder()
        .status(StatusCode::OK)
        .body(axum::body::Body::from(serde_json::to_string(&body).unwrap()))
        .unwrap()
        .into_response()
}