# Council - Personal Brain Trust

古代智囊团，为您出谋划策。

## 本地开发

### 前置条件
- Rust 1.75+
- Node.js 18+
- Docker (可选)

### 启动后端
```bash
cd backend
cargo run
```

### 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 环境变量

**后端 (.env)**
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 部署到 GCP Cloud Run

### 前置条件
- Google Cloud SDK (`gcloud`)
- Docker
- Supabase 项目

### 构建并部署

```bash
# 设置环境变量
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# 构建 Docker 镜像
gcloud builds submit --tag gcr.io/$PROJECT_ID/council:latest

# 部署到 Cloud Run
gcloud run deploy council \
  --image gcr.io/$PROJECT_ID/council:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY,SUPABASE_URL=$SUPABASE_URL,SUPABASE_KEY=$SUPABASE_KEY,GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
```

### 前端部署

前端可以部署到 Firebase Hosting 或 Cloud Storage:

```bash
cd frontend
npm run build
# 上传 dist/ 目录到 Firebase Hosting
```

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /api/auth/google | Google OAuth 登录 |
| GET | /api/auth/callback | OAuth 回调 |
| GET | /api/auth/me | 获取当前用户 |
| POST | /api/chat/start | 开始对话 |
| POST | /api/chat/answer | 回答问题 |
| POST | /api/chat/advice | 生成建议 |
| POST | /api/chat/complete | 完成对话（含画像更新） |
| GET | /api/profile/:user_id | 获取用户画像 |
| PUT | /api/profile | 更新用户画像 |
```

## 技术栈

- **后端**: Rust + Axum
- **前端**: React + Vite + Tailwind
- **数据库**: Supabase (PostgreSQL)
- **认证**: Google OAuth (via Supabase)
- **LLM**: Google Gemini API
- **部署**: GCP Cloud Run