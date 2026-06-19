# Council 会话持久化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持本地开发时刷新页面继续任意阶段的会话，以及查看历史会话

**Architecture:** 后端新增两个 API 接口（获取单个会话、获取会话列表），前端引入 react-router-dom 管理路由，localStorage 保存 `last_conversation_id`，页面加载时根据 phase 恢复状态

**Tech Stack:** Fastify（后端）、react-router-dom 6（前端）、pg（数据库）

---

## 文件变更概览

### 后端
- `projects/council/backend/src/db/conversation.ts` — 新增 `getMessages()` 已存在，新增 `getConversationsByUser()`
- `projects/council/backend/src/handlers/conversation.ts` — 新增 `GET /conversation/:id` 和 `GET /conversations` 路由
- `projects/council/backend/src/models/types.ts` — `WorkflowPhase` 扩展 `problem-input` 阶段

### 前端
- `projects/council/frontend/src/App.tsx` — 重构为 react-router 路由结构
- `projects/council/frontend/src/pages/Home.tsx` — 新增：首页（继续上次 / 开始新会话）
- `projects/council/frontend/src/pages/CounselorSelectPage.tsx` — 新增：选择谋士页面
- `projects/council/frontend/src/pages/ConversationPage.tsx` — 新增：对话页面（根据 phase 渲染不同内容）
- `projects/council/frontend/src/api/client.ts` — 新增 `getConversation()` 和 `listConversations()` API 方法
- `projects/council/frontend/src/hooks/useLastConversation.ts` — 新增：管理 localStorage `last_conversation_id`

---

## Task 1: 后端扩展 WorkflowPhase 类型

**Files:**
- Modify: `projects/council/backend/src/models/types.ts:22-26`

- [ ] **Step 1: 添加 problem-input 阶段到 WorkflowPhase**

```typescript
export type WorkflowPhase =
  | 'counselors-select'
  | 'problem-input'
  | 'socratic-qa'
  | 'advice-generation'
  | 'finished';
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shangchun/Repo/dream-forge
git add projects/council/backend/src/models/types.ts
git commit -m "feat(models): add problem-input phase to WorkflowPhase"
```

---

## Task 2: 后端新增 listConversations 数据库函数

**Files:**
- Modify: `projects/council/backend/src/db/conversation.ts:111-118`

- [ ] **Step 1: 在 conversation.ts 末尾添加 getConversationsByUser 函数**

```typescript
export async function getConversationsByUser(userId: string): Promise<ConversationRow[]> {
  const client = getPool();
  const result = await client.query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/backend/src/db/conversation.ts
git commit -m "feat(db): add getConversationsByUser function"
```

---

## Task 3: 后端新增 GET /conversation/:id 和 GET /conversations 路由

**Files:**
- Modify: `projects/council/backend/src/handlers/conversation.ts`

- [ ] **Step 1: 在 conversationHandlers 中添加新路由**

在 `fastify.get('/counselors', ...)` 之后添加：

```typescript
fastify.get('/conversation/:id', async (request) => {
  const { id } = request.params as { id: string };
  const conversation = await getConversation(id);
  if (!conversation) {
    return { error: 'Conversation not found' };
  }
  const messages = await getMessages(id);
  return {
    ...conversation,
    messages: messages.map(m => m.content), // Return parsed content
  };
});

fastify.get('/conversations', async (request) => {
  const { user_id } = request.query as { user_id?: string };
  if (!user_id) {
    return { error: 'user_id is required' };
  }
  const conversations = await getConversationsByUser(user_id);
  return { conversations };
});
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/backend/src/handlers/conversation.ts
git commit -m "feat(api): add GET /conversation/:id and GET /conversations endpoints"
```

---

## Task 4: 前端新增 useLastConversation hook

**Files:**
- Create: `projects/council/frontend/src/hooks/useLastConversation.ts`

- [ ] **Step 1: 创建 useLastConversation hook**

```typescript
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'last_conversation_id'

export function useLastConversation() {
  const [lastConversationId, setLastConversationId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setLastConversationId(stored)
  }, [])

  const saveConversationId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setLastConversationId(id)
  }

  const clearConversationId = () => {
    localStorage.removeItem(STORAGE_KEY)
    setLastConversationId(null)
  }

  return { lastConversationId, saveConversationId, clearConversationId }
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/hooks/useLastConversation.ts
git commit -m "feat(frontend): add useLastConversation hook"
```

---

## Task 5: 前端新增 API 方法

**Files:**
- Modify: `projects/council/frontend/src/api/client.ts`

- [ ] **Step 1: 添加 getConversation 和 listConversations 方法**

在文件末尾添加：

```typescript
export interface ConversationDetail {
  id: string
  user_id: string
  problem: string
  counselors: string[]
  current_phase: string
  messages: unknown[]
  created_at: string
  updated_at: string
}

export interface ConversationSummary {
  id: string
  problem: string
  counselors: string[]
  current_phase: string
  created_at: string
  updated_at: string
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  return apiRequest(`/conversation/${id}`)
}

export async function listConversations(userId: string): Promise<{ conversations: ConversationSummary[] }> {
  return apiRequest(`/conversations?user_id=${encodeURIComponent(userId)}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/api/client.ts
git commit -m "feat(api): add getConversation and listConversations methods"
```

---

## Task 6: 前端新增 Home 页面组件

**Files:**
- Create: `projects/council/frontend/src/pages/Home.tsx`

- [ ] **Step 1: 创建 Home 页面组件**

```typescript
import { useNavigate } from 'react-router-dom'
import { useLastConversation } from '../hooks/useLastConversation'

interface HomeProps {
  userId: string
}

export function Home({ userId }: HomeProps) {
  const navigate = useNavigate()
  const { lastConversationId, clearConversationId } = useLastConversation()

  const handleContinue = () => {
    if (lastConversationId) {
      navigate(`/conversation/${lastConversationId}`)
    }
  }

  const handleNewConversation = () => {
    clearConversationId()
    navigate('/counselors')
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 text-center">个人智囊团</h1>
        <p className="text-stone-500 text-center mb-8">古代智者的智慧，为您的决策护航</p>

        {lastConversationId && (
          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors mb-4"
          >
            继续上次会话
          </button>
        )}

        <button
          onClick={handleNewConversation}
          className="w-full py-3 px-4 bg-stone-700 text-white font-semibold rounded-lg hover:bg-stone-800 transition-colors"
        >
          开始新会话
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/pages/Home.tsx
git commit -m "feat(frontend): add Home page component"
```

---

## Task 7: 前端新增 CounselorSelectPage

**Files:**
- Create: `projects/council/frontend/src/pages/CounselorSelectPage.tsx`

- [ ] **Step 1: 创建 CounselorSelectPage 组件**

```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCounselors, startConversation, type SkillInfo, type StartConversationRequest } from '../api/client'
import { useLastConversation } from '../hooks/useLastConversation'

interface CounselorSelectPageProps {
  userId: string
}

export function CounselorSelectPage({ userId }: CounselorSelectPageProps) {
  const navigate = useNavigate()
  const { saveConversationId } = useLastConversation()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [problem, setProblem] = useState('')
  const [showProblemInput, setShowProblemInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    listCounselors().then(data => setSkills(data.counselors || [])).catch(console.error)
  }, [])

  const toggleCounselor = (skillId: string) => {
    if (selected.includes(skillId)) {
      setSelected(selected.filter(s => s !== skillId))
    } else if (selected.length < 3) {
      setSelected([...selected, skillId])
    }
  }

  const handleConfirm = () => {
    if (selected.length === 3) {
      setShowProblemInput(true)
    }
  }

  const handleProblemSubmit = async () => {
    if (!problem.trim()) return
    setIsLoading(true)

    try {
      const req: StartConversationRequest = {
        user_id: userId,
        problem: problem.trim(),
        counselors: selected,
      }
      const res = await startConversation(req)
      saveConversationId(res.conversation_id)
      navigate(`/conversation/${res.conversation_id}`)
    } catch (e) {
      console.error('Failed to start conversation:', e)
      alert('启动对话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="bg-white border-b border-stone-200 p-4">
        <h1 className="text-xl font-semibold text-stone-800">选择您的智囊团</h1>
        <p className="text-sm text-stone-500">已选择 {selected.length}/3 位智者</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <button
              key={skill.skill_id}
              onClick={() => toggleCounselor(skill.skill_id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected.includes(skill.skill_id)
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <h3 className="font-semibold text-stone-800">{skill.name}</h3>
              <p className="text-sm text-stone-500 mt-1">{skill.description}</p>
            </button>
          ))}
        </div>

        {selected.length === 3 && !showProblemInput && (
          <div className="mt-6 text-center">
            <button
              onClick={handleConfirm}
              className="px-8 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              确认选择
            </button>
          </div>
        )}
      </div>

      {showProblemInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-semibold text-stone-800 mb-4">请描述您的问题</h2>
            <textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="请详细描述您面临的问题或决策..."
              className="w-full h-32 p-3 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowProblemInput(false)}
                className="flex-1 py-2 px-4 border border-stone-300 text-stone-600 font-medium rounded-lg hover:bg-stone-50"
              >
                返回
              </button>
              <button
                onClick={handleProblemSubmit}
                disabled={!problem.trim() || isLoading}
                className="flex-1 py-2 px-4 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {isLoading ? '启动中...' : '开始对话'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/pages/CounselorSelectPage.tsx
git commit -m "feat(frontend): add CounselorSelectPage component"
```

---

## Task 8: 前端新增 ConversationPage

**Files:**
- Create: `projects/council/frontend/src/pages/ConversationPage.tsx`

- [ ] **Step 1: 创建 ConversationPage 组件**

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConversation, answerQuestion, type ConversationDetail } from '../api/client'
import { SocraticQuestions } from '../components/SocraticQuestions'
import { AdviceCards } from '../components/AdviceCards'

interface ConversationPageProps {
  userId: string
}

export function ConversationPage({ userId }: ConversationPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [adviceData, setAdviceData] = useState<{ advice: string } | null>(null)

  useEffect(() => {
    if (!id) return

    getConversation(id)
      .then(data => {
        setConversation(data)
        // Find last unanswered question from messages
        const messages = data.messages as Array<{ question?: string; answer?: string }>
        const lastQuestion = messages.filter(m => m.question).pop()
        if (lastQuestion?.question) {
          setCurrentQuestion(lastQuestion.question)
          setCurrentQuestionIndex(messages.filter(m => m.answer).length)
        }
        setIsLoading(false)
      })
      .catch(e => {
        setError('Failed to load conversation')
        setIsLoading(false)
      })
  }, [id])

  const handleAnswer = async (answer: string) => {
    if (!id) return

    try {
      const res = await answerQuestion(id, { answer })
      if (res.phase === 'advice-generation' || res.done) {
        // TODO: Handle advice generation phase
        setAdviceData({ advice: '建议生成中...' })
      } else if (res.question) {
        setCurrentQuestion(res.question)
        setCurrentQuestionIndex(prev => prev + 1)
      }
    } catch (e) {
      console.error('Failed to submit answer:', e)
      alert('提交回答失败，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '会话不存在'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-stone-700 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // Render based on phase
  if (conversation.current_phase === 'finished' || adviceData) {
    return (
      <div className="min-h-screen bg-stone-100">
        <AdviceCards counselors={conversation.counselors} advice={adviceData?.advice || ''} />
      </div>
    )
  }

  // Socratic Q&A phase
  return (
    <div className="min-h-screen bg-stone-100">
      <SocraticQuestions
        question={currentQuestion}
        questionIndex={currentQuestionIndex}
        totalQuestions={10}
        onAnswer={handleAnswer}
        initialProblem={conversation.problem}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/pages/ConversationPage.tsx
git commit -m "feat(frontend): add ConversationPage component"
```

---

## Task 9: 前端重构 App.tsx 使用 react-router

**Files:**
- Modify: `projects/council/frontend/src/App.tsx`

- [ ] **Step 1: 用新路由结构替换现有 App.tsx**

将整个 App.tsx 替换为：

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthCallback from './pages/AuthCallback'
import { Home } from './pages/Home'
import { CounselorSelectPage } from './pages/CounselorSelectPage'
import { ConversationPage } from './pages/ConversationPage'

function App() {
  const { user, loading, login, logout, devLogin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 mb-2">个人智囊团</h1>
          <p className="text-stone-500">古代智者的智慧，为您的决策护航</p>
        </div>
        <button
          onClick={login}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          使用 Google 登录
        </button>
        <button
          onClick={devLogin}
          className="mt-3 px-8 py-3 bg-stone-400 text-white font-semibold rounded-lg hover:bg-stone-500 transition-colors text-sm"
        >
          本地开发登录（跳过 OAuth）
        </button>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home userId={user.id} />} />
      <Route path="/counselors" element={<CounselorSelectPage userId={user.id} />} />
      <Route path="/conversation/:id" element={<ConversationPage userId={user.id} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add projects/council/frontend/src/App.tsx
git commit -m "feat(frontend): refactor App.tsx to use react-router routes"
```

---

## Task 10: 前端集成测试

**Files:**
- Test: `projects/council/frontend/` — 手动测试

- [ ] **Step 1: 启动后端**

```bash
cd /Users/shangchun/Repo/dream-forge/projects/council/backend
npm run dev
```

- [ ] **Step 2: 启动前端**

```bash
cd /Users/shangchun/Repo/dream-forge/projects/council/frontend
npm run dev
```

- [ ] **Step 3: 测试流程**

1. 访问 `http://localhost:5173`
2. 点击"本地开发登录"
3. 点击"开始新会话"
4. 选择3个谋士，确认
5. 输入问题，开始对话
6. 回答几个问题
7. **刷新页面** — 应该能继续对话
8. 返回首页 — 应该显示"继续上次会话"按钮

- [ ] **Step 4: Commit (if all tests pass)**

```bash
git add -A
git commit -m "test: verify session persistence works correctly"
```

---

## 自检清单

- [ ] Task 1: WorkflowPhase 类型已扩展
- [ ] Task 2: getConversationsByUser 函数已添加
- [ ] Task 3: GET /conversation/:id 和 GET /conversations 路由已注册
- [ ] Task 4: useLastConversation hook 已创建
- [ ] Task 5: API 方法已添加
- [ ] Task 6: Home 页面组件已创建
- [ ] Task 7: CounselorSelectPage 已创建
- [ ] Task 8: ConversationPage 已创建
- [ ] Task 9: App.tsx 已重构
- [ ] Task 10: 手动测试通过

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-19-council-session-persistence-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
