# GCP Cloud Run 部署完全指南（council）

## 目录

1. [概述](#1-概述)
2. [GCP 内部完整流程](#2-gcp-内部完整流程)
3. [gcloud CLI 环境配置](#3-gcloud-cli-环境配置)
4. [部署命令详解](#4-部署命令详解)
5. [环境变量和 Secrets](#5-环境变量和-secrets)
6. [常用运维命令](#6-常用运维命令)
7. [故障排查](#7-故障排查)
8. [GCP IAM 权限配置详解](#8-gcp-iam-权限配置详解)

---

## 1. 概述

### 涉及的服务

| 服务 | 作用 | 在本项目中的角色 |
|------|------|----------------|
| **Cloud Run** | 容器化 Web 应用托管 | 运行 council 后端服务 |
| **Cloud Build** | 云端构建服务 | 构建 Docker 镜像（`--source .` 方式时） |
| **Artifact Registry** | Docker 镜像仓库 | 存储构建好的镜像 |
| **Secret Manager** | 密钥管理 | 存储 DATABASE_URL 等敏感配置 |
| **Cloud Logging** | 日志服务 | 查看容器运行日志 |

### 整体架构图

```
本地代码
    │
    │  gcloud builds submit --tag <image> .
    ▼
Cloud Build（云端读取 Dockerfile 并构建）
    │
    │  docker push → Artifact Registry
    ▼
Artifact Registry（asia-east1-docker.pkg.dev/dream-forge-498001/council/council）
    │
    │  gcloud run deploy --image <image>
    ▼
Cloud Run（启动容器，执行 CMD，运行服务）
    │
    │  健康检查（TCP PORT）
    ▼
用户请求 https://council-932791894694.asia-east1.run.app/
```

### 两种部署方式

#### 方式 A：云端构建 + 镜像部署（推荐 ✅）

**Step 1**：Cloud Build 构建镜像

```bash
cd projects/council
IMAGE="asia-east1-docker.pkg.dev/dream-forge-498001/council/council:v$(date +%Y%m%d%H%M%S)"
gcloud builds submit --tag "$IMAGE" --project=dream-forge-498001 .
```

**Step 2**：Cloud Run 部署

```bash
gcloud run deploy council \
  --image="$IMAGE" \
  --region=asia-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=$DATABASE_URL" \
  --set-env-vars "ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL" \
  --set-env-vars "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
  --set-env-vars "ANTHROPIC_MODEL=$ANTHROPIC_MODEL" \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL" \
  --set-env-vars "SUPABASE_KEY=$SUPABASE_KEY" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI" \
  --project=dream-forge-498001
```

**优点**：权限路径清晰（Compute Default SA），稳定可靠
**缺点**：需要网络能访问 GCP

#### 方式 B：`--source .`（已废弃 ❌）

```bash
gcloud run deploy council --source . --region=asia-east1 --platform=managed --allow-unauthenticated
```

**问题**：该方式内部权限路径复杂，曾因 Compute Default SA 缺少 `artifactregistry.writer` 权限导致 build 成功但 push 失败。即使后来加了权限仍不稳定。**不推荐使用**。

#### 方式 C：本地 Docker 构建 + 推送

本地构建好镜像，再推送到 Artifact Registry：

```bash
# 1. 切换到 council 目录
cd projects/council

# 2. 本地构建
docker build -t council .

# 3. 打 tag
docker tag council asia-east1-docker.pkg.dev/dream-forge-498001/council/council:v1

# 4. 登录 Artifact Registry（首次）
gcloud auth configure-docker asia-east1-docker.pkg.dev

# 5. 推送
docker push asia-east1-docker.pkg.dev/dream-forge-498001/council/council:v1

# 6. 部署
gcloud run deploy council \
  --image=asia-east1-docker.pkg.dev/dream-forge-498001/council/council:v1 \
  --region=asia-east1 --platform=managed --allow-unauthenticated
```

**优点**：本地构建，原生模块能正确编译
**缺点**：需要本地有 Docker，且网络能访问 GCP Artifact Registry

#### GitHub Actions CI/CD 部署

GitHub Actions 也应使用 `gcloud builds submit` + `gcloud run deploy --image` 方式，而不是本地 Docker 构建。**正确配置如下：**

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      PROJECT_ID: dream-forge-498001
      REGION: asia-east1
      SERVICE_NAME: council

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to GCP
        id: auth
        uses: google-github-actions/auth@v2
        with:
          project_id: ${{ env.PROJECT_ID }}
          workload_identity_provider: projects/932791894694/locations/global/workloadIdentityPools/github-pool/providers/github-oidc

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Build and push Docker image via Cloud Build
        run: |
          IMAGE="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/council/${{ env.SERVICE_NAME }}:${{ github.sha }}"
          gcloud builds submit --tag "$IMAGE" --project="${{ env.PROJECT_ID }}" ./projects/council

      - name: Deploy to Cloud Run
        run: |
          IMAGE="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/council/${{ env.SERVICE_NAME }}:${{ github.sha }}"
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image "$IMAGE" \
            --platform managed \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --set-env-vars "NODE_ENV=production" \
            --set-env-vars "DATABASE_URL=${{ secrets.DATABASE_URL }}" \
            --set-env-vars "ANTHROPIC_BASE_URL=${{ secrets.ANTHROPIC_BASE_URL }}" \
            --set-env-vars "ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}" \
            --set-env-vars "ANTHROPIC_MODEL=${{ secrets.ANTHROPIC_MODEL }}" \
            --set-env-vars "SUPABASE_URL=${{ secrets.SUPABASE_URL }}" \
            --set-env-vars "SUPABASE_KEY=${{ secrets.SUPABASE_KEY }}" \
            --set-env-vars "GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}" \
            --set-env-vars "GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}" \
            --set-env-vars "GOOGLE_REDIRECT_URI=${{ secrets.GOOGLE_REDIRECT_URI }}"
```

**关键点**：
- 使用 `gcloud builds submit` 在云端构建镜像，而不是本地 `docker build` + `docker push`
- **不要**使用 `docker/login-action` 的 `oauth2accesstoken` 方式（对 Artifact Registry 无效）
- GitHub Actions 的认证 SA（`github-actions@...`）只需 `roles/run.admin` + `roles/artifactregistry.writer`（项目级）

---

## 2. GCP 内部完整流程

当你执行 `gcloud run deploy council --source .` 时，GCP 内部发生了以下事情：

### Step 1：上传源代码

```
本地代码
    ↓
GCP Cloud Build 接收到源代码包（.tgz）
存储到 gs://dream-forge-498001_cloudbuild/source/xxx.tgz
```

### Step 2：Cloud Build 读取 Dockerfile 并构建

```
Stage 1 (frontend):
  FROM node:20-alpine
  COPY frontend/package*.json ./
  RUN npm ci
  COPY frontend/ ./
  RUN npm run build

Stage 2 (backend):
  FROM node:20-alpine
  COPY backend/package*.json ./
  RUN npm ci
  COPY backend/ ./
  RUN npm run build

Stage 3 (prod):
  FROM node:20-alpine
  COPY --from=backend-builder /app/node_modules ./node_modules
  COPY --from=backend-builder /app/dist ./dist
  COPY --from=backend-builder /app/package*.json ./
  COPY backend/skills ./skills
  COPY --from=frontend-builder /app/dist ./frontend/dist
  ENV NODE_ENV=production
  ENV PORT=8080
  EXPOSE 8080
  CMD ["node", "dist/index.js"]
```

构建完成后，得到 Docker 镜像。

### Step 3：推送镜像到 Artifact Registry

```
镜像
    ↓
docker push asia-east1-docker.pkg.dev/dream-forge-498001/council/council
    ↓
存储到 Artifact Registry
镜像名格式：
asia-east1-docker.pkg.dev/dream-forge-498001/council/council@sha256:xxxxx
```

### Step 4：Cloud Run 创建 Revision 并启动容器

```
Cloud Run
    ↓
基于新镜像创建新 Revision（council-00001-xxx）
    ↓
按照 Dockerfile 的 EXPOSE 8080 设置健康检查端口（PORT=8080）
    ↓
按照 Dockerfile 的 CMD 启动容器：
  node dist/index.js
    ↓
执行 Startup Probe（TCP 8080）
  - 容器内进程启动
  - Express 服务监听 8080 端口
  - TCP 连接成功 → 容器 ready
    ↓
流量切换到新 Revision
```

---

## 3. gcloud CLI 环境配置

### 查看当前配置

```bash
gcloud config list
gcloud config list project
gcloud config list run/region
```

### 切换项目和 region

```bash
# 切换到 dream-forge-498001 项目
gcloud config set project dream-forge-498001

# 切换 region
gcloud config set run/region asia-east1
```

### 验证配置正确（重要！）

部署前一定要确认：

```bash
gcloud config list project    # 必须是 dream-forge-498001，不能是 dushu-app
gcloud config list run/region # 必须是 asia-east1
```

**常见错误**：如果 project 设置成了别的项目（如 `dushu-app`），部署会失败或部署到错误的项目。

### 认证

```bash
# 登录（浏览器认证）
gcloud auth login

# 或使用服务账号（CI/CD 用）
gcloud auth activate-service-account --key-file=service-account.json

# 查看当前账号
gcloud auth list
```

---

## 4. 部署命令详解

### 基本部署命令

```bash
gcloud run deploy council \
  --source . \                    # 从当前目录源码部署（云端构建）
  --region=asia-east1 \           # 部署到亚洲东部（台湾）
  --platform=managed \            # 使用托管式 Cloud Run（非 Anthos）
  --allow-unauthenticated         # 允许未认证访问（公开服务）
```

### 参数说明

| 参数 | 含义 |
|------|------|
| `--source .` | 从当前目录源码部署，Cloud Build 自动检测 Dockerfile 并构建 |
| `--image=xxx` | 直接指定已构建好的镜像，跳过构建步骤 |
| `--region=asia-east1` | 部署区域 |
| `--platform=managed` | 托管式 Cloud Run，不需要管理集群 |
| `--allow-unauthenticated` | 允许公开访问；不加则需要 IAM 认证 |
| `--no-traffic` | 部署但不切换流量，用于验证新版本 |
| `--min-instances=1` | 保持至少 1 个实例（避免冷启动） |
| `--max-instances=20` | 最多 20 个实例 |

---

## 5. 环境变量和 Secrets

### 环境变量的来源

#### 1. Dockerfile 写死的（构建时）

```dockerfile
ENV NODE_ENV=production
ENV PORT=8080
```

#### 2. 通过 `--set-env-vars` 传入（临时/开发用）

```bash
gcloud run deploy council \
  --set-env-vars="NODE_ENV=production" \
  --region=asia-east1
```

#### 3. 通过 Secret Manager 绑定（生产用）

```bash
gcloud run services update council \
  --region=asia-east1 \
  --update-secrets=DATABASE_URL=DATABASE_URL:latest,ANTHROPIC_AUTH_TOKEN=ANTHROPIC_AUTH_TOKEN:latest
```

### Secret 创建和更新

```bash
# 创建 Secret（如果还没有）
echo -n "postgresql://postgres:password@host:5432/db" | \
  gcloud secrets create DATABASE_URL --data-file=-

# 创建新版本
echo -n "postgresql://postgres:newpassword@host:5432/db" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# 查看 Secret
gcloud secrets versions list DATABASE_URL
gcloud secrets versions access latest --secret=DATABASE_URL
```

---

## 6. 常用运维命令

### 部署相关

```bash
# 查看当前服务配置
gcloud run services describe council --region=asia-east1

# 查看所有 revision
gcloud run revisions list --service=council --region=asia-east1

# 部署但不切换流量（用于验证）
gcloud run deploy council --source . --region=asia-east1 --no-traffic

# 切换流量到最新 revision
gcloud run services update-traffic council --region=asia-east1 --to-latest

# 回滚到上一个 revision
gcloud run services update-traffic council --region=asia-east1 --to-revisions=council-00010-xxf
```

### 日志相关

```bash
# 实时查看日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=council" --follow

# 查看最近 50 条
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=council" --limit=50

# 只看错误
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=council AND severity=ERROR" --limit=30

# 只看某个 revision 的日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.revision_name=council-00001-dd9" --limit=30
```

### 扩缩容相关

```bash
# 设置最小实例数（避免冷启动）
gcloud run services update council --region=asia-east1 --min-instances=1

# 设置最大实例数
gcloud run services update council --region=asia-east1 --max-instances=20

# 设置并发数
gcloud run services update council --region=asia-east1 --concurrency=80

# 设置超时时间
gcloud run services update council --region=asia-east1 --timeout=300s
```

### 删除和清理

```bash
# 删除服务
gcloud run services delete council --region=asia-east1

# 删除 Artifact Registry 中的旧镜像（按日期）
gcloud artifacts docker images delete \
  asia-east1-docker.pkg.dev/dream-forge-498001/council/council@sha256:xxxxx
```

---

## 7. 故障排查

### Build failed

**原因**：Cloud Build 构建失败

**排查**：
```bash
# 查看 Cloud Build 日志
gcloud builds list --project=dream-forge-498001 --limit=5
gcloud builds log <BUILD-ID> --project=dream-forge-498001
```

**常见错误**：
1. `denied: Permission 'artifactregistry.repositories.uploadArtifacts'` → IAM 权限问题
2. `npm ERR!` → 依赖安装失败
3. `COPY failed: file not found` → .dockerignore 排除了需要的文件，或路径错误

**解决方案**：
参见 [第 8 节 IAM 权限配置](#8-gcp-iam-权限配置详解)

### GitHub Actions: `unauthorized: authentication failed` at Login to Artifact Registry

**原因**：使用了 `docker/login-action` 的 `oauth2accesstoken` 方式，该方式对 Artifact Registry **不生效**。Artifact Registry 需要 credential helper 机制，不支持直接 basic auth。

**排查**：
```bash
# 检查 workflow 日志中是否有此错误
Error response from daemon: Get "https://asia-east1-docker.pkg.dev/v2/": unauthorized: authentication failed
```

**解决方案**：
在 workflow 中用 `gcloud auth configure-docker` 替换 `docker/login-action`：

```yaml
# 替换这个（错误方式）：
- name: Login to Artifact Registry
  uses: docker/login-action@v3
  with:
    registry: asia-east1-docker.pkg.dev
    username: oauth2accesstoken
    password: gcloud auth print-access-token

# 改为这个（正确方式）：
- name: Configure Docker for Artifact Registry
  run: gcloud auth configure-docker asia-east1-docker.pkg.dev
```

**原理**：`gcloud auth configure-docker` 会将 gcloud 的认证信息写入 `~/.docker/config.json`，使 Docker CLI 使用 GCP credential helper 进行认证。这是 Artifact Registry 的官方推荐方式。

### Container failed to start / Port timeout

**原因**：容器启动了但没有在 PORT 环境变量指定的端口上监听

**排查**：
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=council" --limit=20
```

**解决方案**：
1. 确认 Dockerfile 里 `EXPOSE 8080` 和代码里 `app.listen(8080)` 一致
2. 确认 CMD 命令正确（如 `node dist/index.js`，不是 `node src/index.ts`）

### 503 Service Unavailable

**原因**：健康检查（Startup Probe）失败

**排查**：
```bash
# 看日志
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=council AND severity=ERROR" --limit=30
```

**常见错误**：
1. `FATAL: (ENOTFOUND) tenant/user postgres.xxx not found` → Supabase 数据库 paused 或连接信息错误
2. `Connection refused` → 后端服务启动失败，端口不对

**解决方案**：
1. 确认 Supabase 项目状态（没 paused）
2. 确认 DATABASE_URL 正确

### 权限问题（Permission denied）

**原因**：gcloud 配置了错误的项目或服务账号没有权限

**排查**：
```bash
gcloud config list project
gcloud auth list
```

**解决方案**：
1. 切到正确项目：`gcloud config set project dream-forge-498001`
2. 使用有权限的服务账号

---

## 8. GCP IAM 权限配置详解

### 涉及的服务账号

| 服务账号 | 格式 | 用途 |
|----------|------|------|
| **Compute Default SA** | `932791894694-compute@developer.gserviceaccount.com` | Cloud Build 构建时推送镜像到 Artifact Registry |
| **Cloud Build SA** | `932791894694@cloudbuild.gserviceaccount.com` | Cloud Build 服务账号 |
| **GitHub Actions SA** | `github-actions@dream-forge-498001.iam.gserviceaccount.com` | GitHub Actions CI/CD |
| **Owner** | `springuper@gmail.com` | 项目 owner |

### 需要的 IAM 角色

| 角色 | 作用 | 绑定在哪里 |
|------|------|----------|
| `roles/artifactregistry.writer` | 上传和读取 Artifact Registry 镜像 | 项目级 + repo 级 |
| `roles/run.admin` | 部署到 Cloud Run | GitHub Actions SA |
| `roles/cloudbuild.builds.builder` | Cloud Build 构建权限 | Cloud Build SA |
| `roles/storage.objectAdmin` | 读写 Cloud Storage（build 中间产物） | Compute Default SA |

### 完整的 IAM 配置命令

```bash
PROJECT_ID="dream-forge-498001"
PROJECT_NUMBER="932791894694"

# === 1. Artifact Registry repo 级别权限 ===
# council repository 的写入权限（repo 级）
gcloud artifacts repositories add-iam-policy-binding council \
  --project=$PROJECT_ID \
  --location=asia-east1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# === 2. 项目级别权限 ===
# Artifact Registry 写入权限（项目级）
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Cloud Build 构建权限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# GitHub Actions 相关权限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### 验证权限配置

```bash
# 验证项目级 IAM
gcloud projects get-iam-policy dream-forge-498001

# 验证 repo 级 IAM
gcloud artifacts repositories get-iam-policy council \
  --project=dream-forge-498001 \
  --location=asia-east1

# 测试 Cloud Build 是否能推送（最直接的验证）
gcloud builds submit \
  --project=dream-forge-498001 \
  --tag "asia-east1-docker.pkg.dev/dream-forge-498001/council/council:test" \
  /Users/shangchun/Repo/dream-forge/projects/council
```

### 排查步骤总结

当遇到 `denied: Permission 'artifactregistry.repositories.uploadArtifacts'` 错误时：

1. **确认 project 设置正确**
   ```bash
   gcloud config list project  # 必须是 dream-forge-498001
   ```

2. **确认使用的是 `--source .` 方式还是 `--image` 方式**
   - `--source .` → Cloud Build 执行 → 需要 Compute Default SA 有权限
   - `--image` → 直接指定镜像 → 同样需要权限

3. **确认是哪个 SA 在执行**
   ```bash
   gcloud builds get-default-service-account --project=dream-forge-498001
   # 返回: 932791894694-compute@developer.gserviceaccount.com
   ```

4. **检查项目级和 repo 级 IAM**
   ```bash
   # 项目级必须有 artifactregistry.writer
   gcloud projects get-iam-policy dream-forge-498001 | grep artifactregistry

   # repo 级也建议有
   gcloud artifacts repositories get-iam-policy council \
     --project=dream-forge-498001 --location=asia-east1 | grep cloudbuild
   ```

5. **特别注意：Compute Default SA 容易被忽略**
   - GitHub Actions 用的是 Workload Identity（`github-actions@...` SA）
   - 但 `gcloud builds submit` 本地触发时用的是 **Compute Default SA**
   - 两者都需要 `artifactregistry.writer` 权限

---

## 附录

### 服务信息

| 项目 | 值 |
|------|-----|
| GCP Project ID | `dream-forge-498001` |
| GCP Project Number | `932791894694` |
| Region | `asia-east1` |
| Cloud Run Service | `council` |
| Artifact Registry | `asia-east1-docker.pkg.dev/dream-forge-498001/council/council` |
| Service URL | https://council-932791894694.asia-east1.run.app |

### 相关文件

| 文件 | 作用 |
|------|------|
| `projects/council/Dockerfile` | 多阶段构建配置 |
| `projects/council/deploy.sh` | 本地部署脚本 |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD |
| `projects/council/backend/.env.production` | 生产环境变量 |
