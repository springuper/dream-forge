# Council 项目 - 会话持久化设计

## 背景

本地开发时，每次修改代码或遇到问题，刷新页面会丢失所有状态（已选谋士、已填问题、对话历史），需要从头开始。会话持久化旨在支持：

1. **刷新继续** — 任意阶段刷新后可继续
2. **新会话** — 重新选谋士、问新问题
3. **历史会话** — 查看之前的会话记录

## 技术方案

### URL 设计

```
/                           → 首页（选择继续还是新会话）
/counselors                 → 选择谋士页面
/conversation/:id          → 根据 phase 渲染对应阶段
```

Phase 枚举：
- `counselors-select` — 选择谋士阶段
- `problem-input` — 填写问题阶段
- `socratic-qa` — 问答阶段
- `advice-generation` — 建议生成中
- `finished` — 完成

### 后端接口

#### 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /conversation/:id` | GET | 获取会话完整状态（含 problem, counselors, current_phase, messages） |
| `GET /conversations` | GET | 获取用户会话列表（?user_id=xxx） |

#### `GET /conversation/:id` 响应

```typescript
{
  id: string
  user_id: string
  problem: string
  counselors: string[]
  current_phase: WorkflowPhase
  messages: MessageRow[]  // 含 question + answer 历史
  created_at: string
  updated_at: string
}
```

#### `GET /conversations?user_id=xxx` 响应

```typescript
{
  conversations: {
    id: string
    problem: string
    counselors: string[]
    current_phase: WorkflowPhase
    created_at: string
    updated_at: string
  }[]
}
```

### 前端存储

| Key | 内容 | 用途 |
|-----|------|------|
| `council_session_token` | session token | 已有 |
| `last_conversation_id` | 最近会话 ID | 刷新恢复 |

### 前端流程

1. **首页 `/`**
   - 检查 `last_conversation_id`
   - 有 → 显示"继续上次会话"按钮 + "开始新会话"按钮
   - 无 → 直接跳转 `/counselors`

2. **页面加载时**
   - 解析 URL path
   - 如有 `:id`，调用 `GET /conversation/:id` 恢复状态
   - 根据 `current_phase` 渲染对应页面

3. **状态变更时**
   - 更新 localStorage `last_conversation_id`
   - 更新 URL path

## 数据模型

现有 `conversations` 和 `conversation_messages` 表已满足需求，无需修改。

## 实现顺序

1. 后端新增 `GET /conversation/:id` 和 `GET /conversations` 接口
2. 前端 localStorage 保存 `last_conversation_id`
3. 前端页面加载时检查并恢复会话
4. 首页添加"继续上次会话"入口
5. 添加"开始新会话"按钮，清除 `last_conversation_id`

## 待确认

- [x] 前端路由方案 — 已有 react-router，会引入 react-router
- [x] 历史会话列表是否需要支持删除？ — 暂时不需要删除
