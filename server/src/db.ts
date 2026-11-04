import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  arenaPairs,
  benchmarkTasks,
  categoryStats,
  costOverTime,
  experiments,
  leaderboard,
  models,
  promptVariantPerformance,
  promptVariants,
} from './data/mockData.ts'
import type { ArenaPair, RubricScores, VoteResult } from './types/index.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'modeleval.sqlite')

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      criteria TEXT NOT NULL,
      expected_elements TEXT NOT NULL,
      difficulty INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_variants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      template TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      changelog TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model_ids TEXT NOT NULL,
      prompt_variant TEXT NOT NULL,
      temperature REAL NOT NULL,
      max_tokens INTEGER NOT NULL,
      trials INTEGER NOT NULL,
      task_ids TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arena_pairs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      experiment_id TEXT NOT NULL,
      prompt_variant TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      model_a_id TEXT NOT NULL,
      model_a_content TEXT NOT NULL,
      model_a_latency_ms INTEGER NOT NULL,
      model_a_tokens_in INTEGER NOT NULL,
      model_a_tokens_out INTEGER NOT NULL,
      model_a_cost_usd REAL NOT NULL,
      model_a_hallucinated INTEGER NOT NULL DEFAULT 0,
      model_a_error TEXT,
      model_b_id TEXT NOT NULL,
      model_b_content TEXT NOT NULL,
      model_b_latency_ms INTEGER NOT NULL,
      model_b_tokens_in INTEGER NOT NULL,
      model_b_tokens_out INTEGER NOT NULL,
      model_b_cost_usd REAL NOT NULL,
      model_b_hallucinated INTEGER NOT NULL DEFAULT 0,
      model_b_error TEXT,
      left_is_a INTEGER NOT NULL,
      vote TEXT,
      rubric_a TEXT,
      rubric_b TEXT,
      judged_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (experiment_id) REFERENCES experiments(id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      model_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL,
      losses INTEGER NOT NULL,
      ties INTEGER NOT NULL,
      both_bad INTEGER NOT NULL,
      elo REAL NOT NULL,
      avg_score REAL NOT NULL,
      avg_latency_ms REAL NOT NULL,
      total_cost_usd REAL NOT NULL,
      hallucination_rate REAL NOT NULL,
      error_rate REAL NOT NULL,
      category_scores TEXT NOT NULL,
      FOREIGN KEY (model_id) REFERENCES models(id)
    );

    CREATE TABLE IF NOT EXISTS category_stats (
      category TEXT PRIMARY KEY,
      avg_score REAL NOT NULL,
      comparisons INTEGER NOT NULL,
      hallucinations INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_variant_stats (
      variant TEXT PRIMARY KEY,
      avg_score REAL NOT NULL,
      win_rate REAL NOT NULL,
      hallucinations REAL NOT NULL,
      avg_latency REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_daily (
      day TEXT PRIMARY KEY,
      cost REAL NOT NULL,
      comparisons INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function seedIfEmpty() {
  const seeded = db.prepare(`SELECT value FROM meta WHERE key = 'seeded'`).get() as
    | { value: string }
    | undefined
  if (seeded?.value === '1') return

  const tx = db.transaction(() => {
    const insertModel = db.prepare(
      `INSERT OR REPLACE INTO models (id, name, provider, color) VALUES (@id, @name, @provider, @color)`,
    )
    for (const m of models) insertModel.run(m)

    const insertTask = db.prepare(
      `INSERT OR REPLACE INTO tasks (id, title, content, category, criteria, expected_elements, difficulty)
       VALUES (@id, @title, @content, @category, @criteria, @expected_elements, @difficulty)`,
    )
    for (const t of benchmarkTasks) {
      insertTask.run({
        id: t.id,
        title: t.title,
        content: t.content,
        category: t.category,
        criteria: t.criteria,
        expected_elements: JSON.stringify(t.expectedElements),
        difficulty: t.difficulty,
      })
    }

    const insertPrompt = db.prepare(
      `INSERT OR REPLACE INTO prompt_variants (id, name, description, template, version, updated_at, changelog)
       VALUES (@id, @name, @description, @template, @version, @updated_at, @changelog)`,
    )
    for (const p of promptVariants) {
      insertPrompt.run({
        id: p.id,
        name: p.name,
        description: p.description,
        template: p.template,
        version: p.version,
        updated_at: p.updatedAt,
        changelog: p.changelog,
      })
    }

    const insertExp = db.prepare(
      `INSERT OR REPLACE INTO experiments
       (id, name, model_ids, prompt_variant, temperature, max_tokens, trials, task_ids, status, created_at)
       VALUES (@id, @name, @model_ids, @prompt_variant, @temperature, @max_tokens, @trials, @task_ids, @status, @created_at)`,
    )
    for (const e of experiments) {
      insertExp.run({
        id: e.id,
        name: e.name,
        model_ids: JSON.stringify(e.modelIds),
        prompt_variant: e.promptVariant,
        temperature: e.temperature,
        max_tokens: e.maxTokens,
        trials: e.trials,
        task_ids: JSON.stringify(e.taskIds),
        status: e.status,
        created_at: e.createdAt,
      })
    }

    const insertPair = db.prepare(
      `INSERT OR REPLACE INTO arena_pairs (
        id, task_id, experiment_id, prompt_variant, prompt_text,
        model_a_id, model_a_content, model_a_latency_ms, model_a_tokens_in, model_a_tokens_out,
        model_a_cost_usd, model_a_hallucinated, model_a_error,
        model_b_id, model_b_content, model_b_latency_ms, model_b_tokens_in, model_b_tokens_out,
        model_b_cost_usd, model_b_hallucinated, model_b_error,
        left_is_a, vote, rubric_a, rubric_b, judged_at
      ) VALUES (
        @id, @task_id, @experiment_id, @prompt_variant, @prompt_text,
        @model_a_id, @model_a_content, @model_a_latency_ms, @model_a_tokens_in, @model_a_tokens_out,
        @model_a_cost_usd, @model_a_hallucinated, @model_a_error,
        @model_b_id, @model_b_content, @model_b_latency_ms, @model_b_tokens_in, @model_b_tokens_out,
        @model_b_cost_usd, @model_b_hallucinated, @model_b_error,
        @left_is_a, @vote, @rubric_a, @rubric_b, @judged_at
      )`,
    )
    for (const p of arenaPairs) {
      insertPair.run({
        id: p.id,
        task_id: p.taskId,
        experiment_id: p.experimentId,
        prompt_variant: p.promptVariant,
        prompt_text: p.promptText,
        model_a_id: p.modelA.modelId,
        model_a_content: p.modelA.content,
        model_a_latency_ms: p.modelA.latencyMs,
        model_a_tokens_in: p.modelA.tokensIn,
        model_a_tokens_out: p.modelA.tokensOut,
        model_a_cost_usd: p.modelA.costUsd,
        model_a_hallucinated: p.modelA.hallucinated ? 1 : 0,
        model_a_error: p.modelA.error ?? null,
        model_b_id: p.modelB.modelId,
        model_b_content: p.modelB.content,
        model_b_latency_ms: p.modelB.latencyMs,
        model_b_tokens_in: p.modelB.tokensIn,
        model_b_tokens_out: p.modelB.tokensOut,
        model_b_cost_usd: p.modelB.costUsd,
        model_b_hallucinated: p.modelB.hallucinated ? 1 : 0,
        model_b_error: p.modelB.error ?? null,
        left_is_a: p.leftIsA ? 1 : 0,
        vote: p.vote,
        rubric_a: p.rubricA ? JSON.stringify(p.rubricA) : null,
        rubric_b: p.rubricB ? JSON.stringify(p.rubricB) : null,
        judged_at: p.judgedAt,
      })
    }

    const insertLb = db.prepare(
      `INSERT OR REPLACE INTO leaderboard (
        model_id, wins, losses, ties, both_bad, elo, avg_score, avg_latency_ms,
        total_cost_usd, hallucination_rate, error_rate, category_scores
      ) VALUES (
        @model_id, @wins, @losses, @ties, @both_bad, @elo, @avg_score, @avg_latency_ms,
        @total_cost_usd, @hallucination_rate, @error_rate, @category_scores
      )`,
    )
    for (const e of leaderboard) {
      insertLb.run({
        model_id: e.modelId,
        wins: e.wins,
        losses: e.losses,
        ties: e.ties,
        both_bad: e.bothBad,
        elo: e.elo,
        avg_score: e.avgScore,
        avg_latency_ms: e.avgLatencyMs,
        total_cost_usd: e.totalCostUsd,
        hallucination_rate: e.hallucinationRate,
        error_rate: e.errorRate,
        category_scores: JSON.stringify(e.categoryScores),
      })
    }

    const insertCat = db.prepare(
      `INSERT OR REPLACE INTO category_stats (category, avg_score, comparisons, hallucinations)
       VALUES (@category, @avg_score, @comparisons, @hallucinations)`,
    )
    for (const c of categoryStats) {
      insertCat.run({
        category: c.category,
        avg_score: c.avgScore,
        comparisons: c.comparisons,
        hallucinations: c.hallucinations,
      })
    }

    const insertPv = db.prepare(
      `INSERT OR REPLACE INTO prompt_variant_stats (variant, avg_score, win_rate, hallucinations, avg_latency)
       VALUES (@variant, @avg_score, @win_rate, @hallucinations, @avg_latency)`,
    )
    for (const p of promptVariantPerformance) {
      insertPv.run({
        variant: p.variant,
        avg_score: p.avgScore,
        win_rate: p.winRate,
        hallucinations: p.hallucinations,
        avg_latency: p.avgLatency,
      })
    }

    const insertCost = db.prepare(
      `INSERT OR REPLACE INTO cost_daily (day, cost, comparisons) VALUES (@day, @cost, @comparisons)`,
    )
    for (const c of costOverTime) insertCost.run(c)

    db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')`).run()
  })

  tx()
  console.log(`[db] Seeded SQLite at ${dbPath}`)
}

initSchema()
seedIfEmpty()

export type ArenaPairRow = {
  id: string
  task_id: string
  experiment_id: string
  prompt_variant: string
  prompt_text: string
  model_a_id: string
  model_a_content: string
  model_a_latency_ms: number
  model_a_tokens_in: number
  model_a_tokens_out: number
  model_a_cost_usd: number
  model_a_hallucinated: number
  model_a_error: string | null
  model_b_id: string
  model_b_content: string
  model_b_latency_ms: number
  model_b_tokens_in: number
  model_b_tokens_out: number
  model_b_cost_usd: number
  model_b_hallucinated: number
  model_b_error: string | null
  left_is_a: number
  vote: VoteResult | null
  rubric_a: string | null
  rubric_b: string | null
  judged_at: string | null
}

export function mapPair(row: ArenaPairRow): ArenaPair {
  return {
    id: row.id,
    taskId: row.task_id,
    experimentId: row.experiment_id,
    promptVariant: row.prompt_variant as ArenaPair['promptVariant'],
    promptText: row.prompt_text,
    leftIsA: Boolean(row.left_is_a),
    modelA: {
      modelId: row.model_a_id,
      content: row.model_a_content,
      latencyMs: row.model_a_latency_ms,
      tokensIn: row.model_a_tokens_in,
      tokensOut: row.model_a_tokens_out,
      costUsd: row.model_a_cost_usd,
      hallucinated: Boolean(row.model_a_hallucinated),
      error: row.model_a_error,
    },
    modelB: {
      modelId: row.model_b_id,
      content: row.model_b_content,
      latencyMs: row.model_b_latency_ms,
      tokensIn: row.model_b_tokens_in,
      tokensOut: row.model_b_tokens_out,
      costUsd: row.model_b_cost_usd,
      hallucinated: Boolean(row.model_b_hallucinated),
      error: row.model_b_error,
    },
    vote: row.vote,
    rubricA: row.rubric_a ? (JSON.parse(row.rubric_a) as RubricScores) : null,
    rubricB: row.rubric_b ? (JSON.parse(row.rubric_b) as RubricScores) : null,
    judgedAt: row.judged_at,
  }
}

const ELO_K = 24

function expectedScore(ra: number, rb: number) {
  return 1 / (1 + 10 ** ((rb - ra) / 400))
}

export function applyVoteToLeaderboard(
  modelAId: string,
  modelBId: string,
  vote: VoteResult,
  previousVote: VoteResult | null,
) {
  // For simplicity, only apply delta when going from null -> vote (first judgment)
  if (previousVote) return

  const get = db.prepare(`SELECT model_id, wins, losses, ties, both_bad, elo FROM leaderboard WHERE model_id = ?`)
  const a = get.get(modelAId) as
    | { model_id: string; wins: number; losses: number; ties: number; both_bad: number; elo: number }
    | undefined
  const b = get.get(modelBId) as
    | { model_id: string; wins: number; losses: number; ties: number; both_bad: number; elo: number }
    | undefined
  if (!a || !b) return

  let scoreA = 0.5
  let scoreB = 0.5
  const update = db.prepare(
    `UPDATE leaderboard SET wins = @wins, losses = @losses, ties = @ties, both_bad = @both_bad, elo = @elo WHERE model_id = @model_id`,
  )

  if (vote === 'a_wins') {
    scoreA = 1
    scoreB = 0
    a.wins += 1
    b.losses += 1
  } else if (vote === 'b_wins') {
    scoreA = 0
    scoreB = 1
    b.wins += 1
    a.losses += 1
  } else if (vote === 'tie') {
    a.ties += 1
    b.ties += 1
  } else {
    a.both_bad += 1
    b.both_bad += 1
    return
  }

  const ea = expectedScore(a.elo, b.elo)
  const eb = expectedScore(b.elo, a.elo)
  a.elo = a.elo + ELO_K * (scoreA - ea)
  b.elo = b.elo + ELO_K * (scoreB - eb)

  update.run({ ...a, model_id: a.model_id })
  update.run({ ...b, model_id: b.model_id })
}

export function weightedRubric(scores: RubricScores): number {
  return (
    scores.correctness * 0.35 +
    scores.instructionFollow * 0.25 +
    scores.completeness * 0.2 +
    scores.clarity * 0.1 +
    scores.verifiability * 0.1
  )
}
