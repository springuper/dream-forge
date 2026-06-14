pub mod handlers;
pub mod llm;
pub mod models;
pub mod skill;

use crate::handlers::auth::{get_current_user, google_callback, google_login};
use crate::handlers::chat::{answer_question, complete_conversation, generate_advice, get_skill_content, get_skill_topics, list_skills, start_conversation, AppState};
use crate::handlers::profile::{get_profile, update_profile};
use axum::{routing::{get, post, put}, Router};
use axum::response::{IntoResponse, Response};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::new());
    state.load_skills(std::path::PathBuf::from("skills")).await;

    let app = Router::new()
        // Serve dist static files
        .route("/assets/:path", get(static_handler))
        // SPA fallback - serve index.html for non-API routes
        .route("/:path", get(spa_handler))
        .route("/", get(spa_handler))
        // Health check
        .route("/health", get(|| async { "ok" }))
        // Auth routes
        .route("/api/auth/google", get(google_login))
        .route("/api/auth/callback", get(google_callback))
        .route("/api/auth/me", get(get_current_user))
        // Chat routes
        .route("/api/chat/start", post(start_conversation))
        .route("/api/chat/answer", post(answer_question))
        .route("/api/chat/advice", post(generate_advice))
        .route("/api/chat/complete", post(complete_conversation))
        // Skills routes
        .route("/api/skills", get(list_skills))
        .route("/api/skills/:skill_id/topics", get(get_skill_topics))
        .route("/api/skills/:skill_id/content/:topic", get(get_skill_content))
        // Profile routes
        .route("/api/profile/:user_id", get(get_profile))
        .route("/api/profile", put(update_profile))
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn static_handler(axum::extract::Path(path): axum::extract::Path<String>) -> Response {
    let file_path = format!("dist/assets/{}", path);
    match tokio::fs::read(&file_path).await {
        Ok(content) => {
            let mime = if path.ends_with(".js") {
                "application/javascript"
            } else if path.ends_with(".css") {
                "text/css"
            } else {
                "application/octet-stream"
            };
            axum::http::Response::builder()
                .header("Content-Type", mime)
                .body(axum::body::Body::from(content))
                .unwrap()
                .into_response()
        }
        Err(_) => axum::http::StatusCode::NOT_FOUND.into_response(),
    }
}

async fn spa_handler() -> Response {
    match tokio::fs::read("dist/index.html").await {
        Ok(content) => axum::http::Response::builder()
            .header("Content-Type", "text/html")
            .body(axum::body::Body::from(content))
            .unwrap()
            .into_response(),
        Err(_) => axum::http::StatusCode::NOT_FOUND.into_response(),
    }
}