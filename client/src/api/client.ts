import type {
  ArenaPair,
  BenchmarkTask,
  CategoryStat,
  ExperimentConfig,
  LeaderboardEntry,
  ModelInfo,
  PromptVariant,
  RubricScores,
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
  },
  arena: {
    list: () => request<ArenaPair[]>('/api/arena'),
    vote: (
      id: string,
      payload: { vote: VoteResult; rubricA?: RubricScores | null; rubricB?: RubricScores | null },
    ) =>
      request<ArenaPair>(`/api/arena/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
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
