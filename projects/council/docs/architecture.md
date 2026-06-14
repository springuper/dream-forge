# Council 架构设计文档

> **状态：** 草稿 v0.1
> **最后更新：** 2026-06-14
> **驱动原则：** Thin Harness, Fat Skills

---

## 1. 核心设计原则

### Thin Harness

Harness（驾驭层）是系统中最薄的一层，负责：

- **编排**（workflow orchestration）
- **工具路由**（tool dispatch）
- **LLM 调用**（API communication）
- **协议转换**（type definitions）

它**不包含任何领域知识**。

### Fat Skills

Skills（技能层）承载所有领域知识：

- Counselor 画像（personality, decision style）
- 历史案例库（cases）
- 苏格拉底追问模板（questions）
- 语录与观点（quotes）
- 知识碎片（knowledge）

Skills 可以在运行时热加载，**不编译进二进制**。

### 分离的价值

| 问题 | Rust 单体方案 | TS Fat Skills 方案 |
|------|--------------|-------------------|
| 更新 counselor 知识 | 改代码 + 重新编译 + 重新部署 | 改 skill 文件 + 重启服务 |
| 新增 counselor | 修改枚举 + 重新编译 | 新增 skill 目录 |
| harness 出 Bug | 影响所有 counselor | 只影响编排层 |
| 跨 counselor 复用知识 | 通过 trait 耦合 | 通过文件引用 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    HTTP API                         │
│              (Fastify, port 3001)                   │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              conversation.ts                          │
│         (请求入口，状态转换路由)                       │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│           workflow.ts (xstate machine)                │
│                                                     │
│  start → counselorSelection → confirmCounselors     │
│       → socraticQA → generateAdvice → finished      │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┼──────────────────────┐
    │             │                      │
    ▼             ▼                      ▼
┌────────┐  ┌────────────┐  ┌──────────────────────────┐
│PHASE   │  │  client.ts │  │     tools/index.ts      │
│SKILLS  │  │ (LLM 调用) │  │    (工具路由分发)         │
│(硬编码)│  └────────────┘  └──────────────────────────┘
└────────┘                            │
    │                           ┌─────┴──────┬────────┬──────┐
    │                           ▼            ▼        ▼      ▼
    │                      skill.ts    memory.ts profile.ts search.ts
    │                       │            │         │         │
    │                       ▼            ▼         ▼         ▼
    │                  skill/loader.ts          ↓         search_online
    │                       │            user_profiles  memory_fragments
    │                       ▼
    │              ../council/backend/skills/
    │              (Fat Skills 目录，运行时读取)
    └─────────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构

```
projects/council/
├── backend-ts/                    # Thin Harness (TypeScript)
│   └── src/
│       ├── index.ts               # Fastify 入口，HTTP 路由
│       ├── handlers/
│       │   └── conversation.ts    # 对话状态管理
│       ├── agent/
│       │   ├── client.ts          # LLM 调用循环（Anthropic SDK）
│       │   ├── workflow.ts        # xstate 状态机 + phase prompts
│       │   └── tools/
│       │       ├── index.ts       # 工具注册 + 路由分发
│       │       ├── skill.ts       # list_skills / read_skill
│       │       ├── memory.ts      # read_memory / record_memory
│       │       ├── profile.ts     # read_user_profile
│       │       ├── search.ts      # search_online
│       │       └── ask.ts         # ask_user
│       ├── skill/
│       │   └── loader.ts          # 加载 skills/ 目录下的文件
│       ├── llm/
│       │   └── prompts.ts         # system prompt 模板
│       ├── models/
│       │   └── types.ts           # 共享类型定义
│       └── types.ts               # Tool 定义
│
├── backend/                       # (Rust 版本，已废弃)
│
└── skills/                        # Fat Skills ( counselor 知识库)
    ├── zhu_ge_liang/
    │   ├── index.md               # 角色定义 + YAML frontmatter
    │   ├── cases.md               # 历史案例
    │   ├── quotes.md               # 语录
    │   ├── questions.md            # 苏格拉底追问
    │   └── knowledge.md           # 知识碎片
    ├── zhang_liang/
    ├── liu_bo_wen/
    ├── xun_you/
    └── zeng_guofan/
```

---

## 4. Skill 文件格式

### 4.1 index.md — 角色定义

```markdown
---
name: 诸葛亮
description: 擅长庙算、联吴抗曹的谋士。触发场景：战略规划、外交联盟。
strengths:
  - 系统性思维
  - 战略规划
  - 外交联盟
style: 严谨、忠诚、长远布局
---

# 诸葛亮（181年—234年）

## 核心性格特征

- 极度严谨与系统性思维
- 极强的责任感与使命感
- 对"德"的坚守
- ...

## 决策原则

"庙算胜于临阵" — 在行动之前进行系统性分析。
```

### 4.2 questions.md — 苏格拉底追问

```markdown
# 诸葛亮苏格拉底追问模板

## 通用问题

**关于信息收集**
- 您现在对这个情况的了解，有多少是确定的，有多少是猜测的？
- ...

## 诸葛亮定制问题

**关于系统性分析的追问**
- 您对这个问题的分析，有没有遗漏重要的变量？
- ...
```

### 4.3 cases.md / quotes.md / knowledge.md

按 counselor 补充，结构由 LLM 使用时自行决定。

---

## 5. 工作流（Workflow）

### 5.1 状态机（xstate）

```
start
  │
  ▼
counselorSelection  ──── CONFIRM ────▶ confirmCounselors
  │                                         │
  │ CHANGE                                  │ CONFIRM
  ▼                                         ▼
counselorSelection                   socraticQA
                                              │
                                     STOP_EARLY │ DONE
                                         ▼
                                   generateAdvice
                                              │
                                              ▼
                                         finished
```

### 5.2 Phase Prompts（硬编码在 workflow.ts）

| Phase | 职责 | LLM 工具 |
|-------|------|---------|
| `counselor-selection` | 理解问题，选定最多 3 个 counselor | list_skills, read_skill |
| `socratic-qa` | 苏格拉底追问，帮助用户澄清思路 | ask_user, read_skill |
| `advice-generation` | 生成每个 counselor 的建议 | read_skill, search_online |

**Phase Prompts 是当前唯一的"薄层知识"** — 未来考虑将它们也抽取为 skill 文件。

---

## 6. 工具系统（Tools）

### 6.1 工具列表

| 工具 | 作用 | 实现 |
|------|------|------|
| `list_skills` | 列出所有 counselor | skill/loader.ts |
| `read_skill` | 读取 counselor 文件 | skill/loader.ts |
| `ask_user` | 向用户提问 | agent/client.ts (special) |
| `read_user_profile` | 读取用户画像 | profile.ts |
| `read_memory` | 读取用户记忆碎片 | memory.ts |
| `record_memory` | 写入记忆碎片 | memory.ts |
| `search_online` | 联网搜索 | search.ts |

### 6.2 工具执行流程

```
LLM response (stop_reason=tool_use)
  │
  ▼
executeTool(toolName, args)  ← 路由到对应模块
  │
  ├── skillTools    → executeSkillTool
  ├── memoryTools   → executeMemoryTool
  ├── profileTools  → executeProfileTool
  ├── searchTools   → executeSearchTool
  └── askTools      → 特殊处理 (ask_user)
  │
  ▼
返回 <tool_result> 格式字符串
  │
  ▼
继续 agent loop
```

---

## 7. 当前问题与待优化项

### 7.1 Phase Prompts 仍是 Harness 的一部分

`workflow.ts` 中的 `PHASE_SKILLS` 是硬编码的字符串。如果要修改 Socratic 策略，需要改代码。

**建议：** 将 phase prompts 也抽取为 skill 文件，放到 `skills/_phases/` 目录。

### 7.2 Skills 路径硬编码

```typescript
// skill/loader.ts:6
const SKILLS_DIR = path.join(process.cwd(), '../council/backend/skills');
```

路径拼接脆弱，跨目录部署会 break。**建议：** 通过环境变量配置。

### 7.3 Socratic Q&A 循环未完整实现

`workflow.ts:186-190` 中 socratic-qa phase 只是简单透传，未真正实现"多轮对话 + 动态问题生成"。

### 7.4 缺少 Skill 版本管理

Skills 没有版本概念，更新后无法追踪。**建议：** frontmatter 中加入 `version` 和 `updated_at`。

### 7.5 没有 skill 热加载

当前每次 `read_skill` 都读文件。生产环境建议加一层内存缓存（TTL ~60s）。

---

## 8. 演进路线

### Phase 1：解决当前问题（v0.2）

- [ ] 将 phase prompts 抽取为 `skills/_phases/*.md`
- [ ] 通过环境变量配置 `SKILLS_DIR`
- [ ] 实现完整的 Socratic Q&A 循环
- [ ] 加入 skill 版本管理（frontmatter `version`/`updated_at`）
- [ ] skill 文件读取加缓存

### Phase 2：丰富 Counselor Skills（v0.3）

- [ ] 补充所有 counselor 的 `cases.md`
- [ ] 补充所有 counselor 的 `quotes.md`
- [ ] 补充所有 counselor 的 `knowledge.md`
- [ ] 验证每个 counselor 的 questions.md 覆盖主要场景

### Phase 3：多语言支持（v0.4）

- [ ] skill 文件支持 i18n（`skills/zhuge_liang/questions.zh.md`）
- [ ] LLM 响应按用户语言偏好适配

### Phase 4：协作工作流（v0.5）

- [ ] Skill 贡献流程（PR → review → merge）
- [ ] Skill 单元测试（验证 skill 文件格式 + 内容质量）
- [ ] counselor 知识图谱（跨 counselor 案例关联）

---

## 9. 附录：类型定义

### 9.1 WorkflowPhase

```typescript
type WorkflowPhase =
  | 'counselor-selection'
  | 'socratic-qa'
  | 'advice-generation'
  | 'finished';
```

### 9.2 CounselorSkill

```typescript
interface CounselorSkill {
  skill_id: string;
  display_name: string;
  personality: string;
  cases: string;
  quotes: string;
  questions: string;
  knowledge: string;
  meta: SkillMeta;
}

interface SkillMeta {
  skill_id: string;
  name: string;
  description: string;
  strengths?: string[];
  style?: string;
}
```

### 9.3 Tool 定义

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}
```