# Google OAuth 登录设计

> **日期：** 2026-06-14
> **状态：** 设计中

---

## 1. 目标

实现 Google OAuth 登录，支持本地开发环境和 GCP 部署环境。

## 2. 架构概览

```
用户浏览器                     前端(Vite)              后端(Fastify)              Google OAuth
    │                            │                        │                        │
    │──点击"使用 Google 登录"──▶│                        │                        │
    │                            │──── GET /api/auth/google ────▶│                    │
    │                            │                        │                        │
    │                            │                        │──生成 state ──────────▶│
    │                            │                        │◀──OAuth URL──────────────│
    │◀──────302 重定向─────────────────────────────────────────│                    │
    │                            │                        │                        │
    │──授权页面──▶│                        │                        │
    │◀──回调 localhost:5173/#/auth/callback?code=xxx&state=yyy──│                   │
    │                            │                        │                        │
    │                            │──POST /api/auth/callback────▶│                    │
    │                            │    {code, state}            │                        │
    │                            │                        │──验证 code ───────────▶│
    │                            │                        │◀──id_token──────────────│
    │                            │                        │──创建 session ──────────▶│
    │                            │◀──200 {token, user}────────────────────────────────│
    │                            │                        │                        │
    │◀──存储 token，跳转首页───│                        │                        │
```

## 3. 前端改动

### 3.1 安装路由

```bash
cd frontend
npm install react-router-dom
```

### 3.2 路由结构

```
App
├── / (主页面，当前 App 内容)
└── /auth/callback (OAuth 回调处理页)
```

### 3.3 AuthCallback 页面逻辑

```typescript
// 从 URL 提取 code 和 state
// POST /api/auth/callback {code, state}
// 成功后存 token 到 localStorage
// 重定向到 /
```

### 3.4 useAuth hook 更新

```typescript
// login() → window.location.href = '/api/auth/google'
// handleCallback() → 提取 URL 参数 → 调 /api/auth/callback
```

## 4. 后端改动

### 4.1 新增 handlers/auth.ts

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/google` | GET | 生成 state，跳转 Google OAuth |
| `/api/auth/callback` | POST | 接收 code，返回 session token |
| `/api/auth/me` | GET | 返回当前用户信息 |
| `/api/auth/logout` | POST | 删除 session |

### 4.2 Session 存储（PostgreSQL）

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 环境变量

**本地开发 (.env)：**
```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5173/#/auth/callback
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/council
```

**GCP 部署 (Cloud Run env vars)：**
```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://council-xxx.run.app/auth/callback
DATABASE_URL=postgresql://postgres:postgres@10.x.x.x:5432/council
```

## 5. OAuth 流程详解

### 5.1 登录请求

```
GET /api/auth/google

后端：
1. 生成随机 state（16字节 hex，60分钟过期）
2. 存储 state → session（临时记录）
3. 构造 Google OAuth URL：
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id={GOOGLE_CLIENT_ID}
     &redirect_uri={GOOGLE_REDIRECT_URI}
     &response_type=code
     &scope=openid%20email%20profile
     &state={state}
     &access_type=offline
4. 302 重定向到 Google OAuth URL
```

### 5.2 回调处理

```
POST /api/auth/callback
Body: {code: string, state: string}

后端：
1. 验证 state（存在且未过期）
2. 用 code 换 id_token：
   POST https://oauth2.googleapis.com/token
   {
     code,
     client_id,
     client_secret,
     redirect_uri,
     grant_type=authorization_code
   }
3. 解析 id_token 获取 user info（sub, email, name, picture）
4. 删除临时 state session
5. 创建正式 session（7天过期）：
   INSERT INTO sessions (id, user_id, email, name, picture, expires_at)
6. 返回 {session_token, user: {id, email, name, picture}}
```

### 5.3 请求认证

后续请求带 header：
```
X-Session-Token: {session_token}
```

后端验证 token 存在且未过期，返回用户信息或 401。

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| state 不存在或过期 | 401，返回错误 |
| Google OAuth 失败 | 401，返回错误 |
| Session 已过期 | 401，前端清除 token 跳转登录 |
| Database 连接失败 | 500，日志记录 |

## 7. 数据库迁移

启动时后端自动检查并创建 sessions 表：

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 8. 本地开发流程

```bash
# 1. 配置本地 .env
cp backend/.env.example backend/.env
# 编辑填入 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL

# 2. 启动 postgres
docker-compose up -d

# 3. 启动后端
cd backend && npm run dev

# 4. 启动前端
cd frontend && npm run dev

# 5. 访问 http://localhost:5173，点击"使用 Google 登录"
```

## 9. 待确认事项

- [ ] Google Cloud Console 添加 `http://localhost:5173/#/auth/callback` 到 OAuth 允许的 redirect_uri
- [ ] GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET 从 Google Cloud Console 获取
- [ ] 本地 postgres DATABASE_URL 确认