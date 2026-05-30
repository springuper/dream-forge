use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub supabase_user_id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}