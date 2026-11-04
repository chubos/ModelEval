export type TaskCategory =
  | 'programowanie'
  | 'logika'
  | 'streszczanie'
  | 'instrukcje'
  | 'wiedza'

export type PromptVariantId = 'A' | 'B' | 'C'

export type VoteResult = 'a_wins' | 'b_wins' | 'tie' | 'both_bad'

export interface RubricScores {
  correctness: number
  instructionFollow: number
  completeness: number
  clarity: number
  verifiability: number
}

export const RUBRIC_WEIGHTS = {
  correctness: 0.35,
  instructionFollow: 0.25,
  completeness: 0.2,
  clarity: 0.1,
  verifiability: 0.1,
} as const

export const RUBRIC_LABELS: Record<keyof RubricScores, string> = {
  correctness: 'Poprawność merytoryczna',
  instructionFollow: 'Zgodność z poleceniem',
  completeness: 'Kompletność',
  clarity: 'Jasność i struktura',
  verifiability: 'Uzasadnienie / weryfikowalność',
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  color: string
}

export interface BenchmarkTask {
  id: string
  title: string
  content: string
  category: TaskCategory
  criteria: string
  expectedElements: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
}

export interface PromptVariant {
  id: PromptVariantId
  name: string
  description: string
  template: string
  version: number
  updatedAt: string
  changelog: string
}

export interface ExperimentConfig {
  id: string
  name: string
  modelIds: string[]
  promptVariant: PromptVariantId
  temperature: number
  maxTokens: number
  trials: number
  taskIds: string[]
  status: 'draft' | 'running' | 'completed'
  createdAt: string
}

export interface ModelResponse {
  modelId: string
  content: string
  latencyMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  hallucinated?: boolean
  error?: string | null
}

export interface ArenaPair {
  id: string
  taskId: string
  experimentId: string
  promptVariant: PromptVariantId
  promptText: string
  modelA: ModelResponse
  modelB: ModelResponse
  /** Shuffled so UI never knows true identity until reveal */
  leftIsA: boolean
  vote: VoteResult | null
  rubricA: RubricScores | null
  rubricB: RubricScores | null
  judgedAt: string | null
}

export interface LeaderboardEntry {
  modelId: string
  wins: number
  losses: number
  ties: number
  bothBad: number
  elo: number
  avgScore: number
  avgLatencyMs: number
  totalCostUsd: number
  hallucinationRate: number
  errorRate: number
  categoryScores: Record<TaskCategory, number>
}

export interface CategoryStat {
  category: TaskCategory
  avgScore: number
  comparisons: number
  hallucinations: number
}
