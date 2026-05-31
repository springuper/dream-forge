pub mod handlers;
pub mod llm;
pub mod models;
pub mod skill;

use crate::handlers::auth::{get_current_user, google_callback, google_login};
use crate::handlers::chat::{answer_question, complete_conversation, generate_advice, start_conversation, AppState};
use crate::handlers::profile::{get_profile, update_profile};
use axum::{routing::{get, put}, Router};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::new());
    state.load_skills(std::path::PathBuf::from("skills")).await;

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/auth/google", get(google_login))
        .route("/api/auth/callback", get(google_callback))
        .route("/api/auth/me", get(get_current_user))
        .route("/api/chat/start", get(start_conversation))
        .route("/api/chat/answer", get(answer_question))
        .route("/api/chat/advice", get(generate_advice))
        .route("/api/chat/complete", get(complete_conversation))
        .route("/api/profile/:user_id", get(get_profile))
        .route("/api/profile", put(update_profile))
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_headers(Any));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}