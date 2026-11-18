import type {
  ArenaPair,
  BenchmarkTask,
  CategoryStat,
  ExperimentConfig,
  GeneratePairPayload,
  LeaderboardEntry,
  ModelInfo,
  PromptVariant,
  RubricScores,
  ServerConfig,
  VoteResult,
} from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),
  config: () => request<ServerConfig>('/api/config'),
  models: () => request<ModelInfo[]>('/api/models'),
  tasks: {
    list: () => request<BenchmarkTask[]>('/api/tasks'),
    create: (task: Partial<BenchmarkTask>) =>
      request<BenchmarkTask>('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
    update: (id: string, task: Partial<BenchmarkTask>) =>
      request<BenchmarkTask>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
    remove: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  prompts: {
    list: () => request<PromptVariant[]>('/api/prompts'),
    update: (id: string, data: Partial<PromptVariant>) =>
      request<PromptVariant>(`/api/prompts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  experiments: {
    list: () => request<ExperimentConfig[]>('/api/experiments'),
    create: (data: Partial<ExperimentConfig>) =>
      request<ExperimentConfig>('/api/experiments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    patch: (id: string, data: Partial<ExperimentConfig>) =>
      request<ExperimentConfig>(`/api/experiments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    run: (id: string, payload?: { config?: { apiKey?: string; baseUrl?: string } }) =>
      request<{ experiment: ExperimentConfig; pairsCreated: ArenaPair[] }>(
        `/api/experiments/${id}/run`,
        {
          method: 'POST',
          body: JSON.stringify(payload ?? {}),
        },
      ),
  },
  arena: {
    list: () => request<ArenaPair[]>('/api/arena'),
    generate: (payload: GeneratePairPayload) =>
      request<ArenaPair>('/api/arena/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    vote: (
      id: string,
      payload: { vote: VoteResult; rubricA?: RubricScores | null; rubricB?: RubricScores | null },
    ) =>
      request<ArenaPair>(`/api/arena/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) => request<void>(`/api/arena/${id}`, { method: 'DELETE' }),
  },
  llm: {
    verify: (payload: { apiKey?: string; baseUrl?: string; model?: string }) =>
      request<{ ok: boolean; model: string; latencyMs: number; response: string }>(
        '/api/llm/verify',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ),
  },
  analytics: {
    overview: () =>
      request<{
        pairs: number
        judged: number
        totalComparisons: number
        totalCostUsd: number
        avgHallucinationRate: number
        topModelId: string | null
        topElo: number | null
      }>('/api/analytics/overview'),
    leaderboard: () => request<LeaderboardEntry[]>('/api/analytics/leaderboard'),
    categories: () => request<CategoryStat[]>('/api/analytics/categories'),
    promptVariants: () =>
      request<
        Array<{
          variant: string
          avgScore: number
          winRate: number
          hallucinations: number
          avgLatency: number
        }>
      >('/api/analytics/prompt-variants'),
    costOverTime: () =>
      request<Array<{ day: string; cost: number; comparisons: number }>>(
        '/api/analytics/cost-over-time',
      ),
    export: () => request<unknown>('/api/analytics/export'),
  },
}
