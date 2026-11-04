import cors from 'cors'
import express from 'express'
import {
  applyVoteToLeaderboard,
  db,
  mapPair,
  type ArenaPairRow,
  weightedRubric,
} from './db.ts'
import type {
  BenchmarkTask,
  ExperimentConfig,
  PromptVariant,
  PromptVariantId,
  RubricScores,
  VoteResult,
} from './types/index.ts'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'modeleval-api', db: 'sqlite' })
})

/* ─── Models ─── */
app.get('/api/models', (_req, res) => {
  const rows = db.prepare(`SELECT id, name, provider, color FROM models ORDER BY name`).all()
  res.json(rows)
})

/* ─── Tasks ─── */
function mapTask(row: {
  id: string
  title: string
  content: string
  category: string
  criteria: string
  expected_elements: string
  difficulty: number
}): BenchmarkTask {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category as BenchmarkTask['category'],
    criteria: row.criteria,
    expectedElements: JSON.parse(row.expected_elements) as string[],
    difficulty: row.difficulty as BenchmarkTask['difficulty'],
  }
}

app.get('/api/tasks', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM tasks ORDER BY id`)
    .all() as Parameters<typeof mapTask>[0][]
  res.json(rows.map(mapTask))
})

app.post('/api/tasks', (req, res) => {
  const body = req.body as Partial<BenchmarkTask>
  const count = (
    db.prepare(`SELECT COUNT(*) AS c FROM tasks`).get() as { c: number }
  ).c
  const id = body.id ?? `task-${String(count + 1).padStart(3, '0')}`
  const task: BenchmarkTask = {
    id,
    title: body.title ?? 'Nowe zadanie',
    content: body.content ?? '',
    category: body.category ?? 'wiedza',
    criteria: body.criteria ?? '',
    expectedElements: body.expectedElements ?? [],
    difficulty: body.difficulty ?? 2,
  }
  db.prepare(
    `INSERT INTO tasks (id, title, content, category, criteria, expected_elements, difficulty)
     VALUES (@id, @title, @content, @category, @criteria, @expected_elements, @difficulty)`,
  ).run({
    id: task.id,
    title: task.title,
    content: task.content,
    category: task.category,
    criteria: task.criteria,
    expected_elements: JSON.stringify(task.expectedElements),
    difficulty: task.difficulty,
  })
  res.status(201).json(task)
})

app.put('/api/tasks/:id', (req, res) => {
  const existing = db.prepare(`SELECT id FROM tasks WHERE id = ?`).get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  const body = req.body as Partial<BenchmarkTask>
  const current = mapTask(
    db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id) as Parameters<
      typeof mapTask
    >[0],
  )
  const next: BenchmarkTask = {
    ...current,
    ...body,
    id: current.id,
    expectedElements: body.expectedElements ?? current.expectedElements,
  }
  db.prepare(
    `UPDATE tasks SET title=@title, content=@content, category=@category, criteria=@criteria,
     expected_elements=@expected_elements, difficulty=@difficulty WHERE id=@id`,
  ).run({
    id: next.id,
    title: next.title,
    content: next.content,
    category: next.category,
    criteria: next.criteria,
    expected_elements: JSON.stringify(next.expectedElements),
    difficulty: next.difficulty,
  })
  res.json(next)
})

app.delete('/api/tasks/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(req.params.id)
  if (info.changes === 0) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  res.status(204).end()
})

/* ─── Prompts ─── */
function mapPrompt(row: {
  id: string
  name: string
  description: string
  template: string
  version: number
  updated_at: string
  changelog: string
}): PromptVariant {
  return {
    id: row.id as PromptVariantId,
    name: row.name,
    description: row.description,
    template: row.template,
    version: row.version,
    updatedAt: row.updated_at,
    changelog: row.changelog,
  }
}

app.get('/api/prompts', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM prompt_variants ORDER BY id`)
    .all() as Parameters<typeof mapPrompt>[0][]
  res.json(rows.map(mapPrompt))
})

app.put('/api/prompts/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM prompt_variants WHERE id = ?`).get(req.params.id) as
    | Parameters<typeof mapPrompt>[0]
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Prompt variant not found' })
    return
  }
  const body = req.body as Partial<PromptVariant>
  const nextVersion = body.template && body.template !== row.template ? row.version + 1 : row.version
  const updated = {
    id: row.id,
    name: body.name ?? row.name,
    description: body.description ?? row.description,
    template: body.template ?? row.template,
    version: nextVersion,
    updated_at: new Date().toISOString(),
    changelog:
      body.changelog ??
      (nextVersion !== row.version
        ? `v${nextVersion}: ręczna edycja szablonu.`
        : row.changelog),
  }
  db.prepare(
    `UPDATE prompt_variants SET name=@name, description=@description, template=@template,
     version=@version, updated_at=@updated_at, changelog=@changelog WHERE id=@id`,
  ).run(updated)
  res.json(mapPrompt(updated))
})

/* ─── Experiments ─── */
function mapExperiment(row: {
  id: string
  name: string
  model_ids: string
  prompt_variant: string
  temperature: number
  max_tokens: number
  trials: number
  task_ids: string
  status: string
  created_at: string
}): ExperimentConfig {
  return {
    id: row.id,
    name: row.name,
    modelIds: JSON.parse(row.model_ids) as string[],
    promptVariant: row.prompt_variant as PromptVariantId,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    trials: row.trials,
    taskIds: JSON.parse(row.task_ids) as string[],
    status: row.status as ExperimentConfig['status'],
    createdAt: row.created_at,
  }
}

app.get('/api/experiments', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM experiments ORDER BY created_at DESC`)
    .all() as Parameters<typeof mapExperiment>[0][]
  res.json(rows.map(mapExperiment))
})

app.post('/api/experiments', (req, res) => {
  const body = req.body as Partial<ExperimentConfig>
  if (!body.name || !body.modelIds || body.modelIds.length < 2) {
    res.status(400).json({ error: 'name and at least 2 modelIds required' })
    return
  }
  const count = (
    db.prepare(`SELECT COUNT(*) AS c FROM experiments`).get() as { c: number }
  ).c
  const exp: ExperimentConfig = {
    id: `exp-${String(count + 1).padStart(3, '0')}`,
    name: body.name,
    modelIds: body.modelIds,
    promptVariant: body.promptVariant ?? 'A',
    temperature: body.temperature ?? 0.2,
    maxTokens: body.maxTokens ?? 1024,
    trials: body.trials ?? 3,
    taskIds: body.taskIds ?? [],
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    `INSERT INTO experiments
     (id, name, model_ids, prompt_variant, temperature, max_tokens, trials, task_ids, status, created_at)
     VALUES (@id, @name, @model_ids, @prompt_variant, @temperature, @max_tokens, @trials, @task_ids, @status, @created_at)`,
  ).run({
    id: exp.id,
    name: exp.name,
    model_ids: JSON.stringify(exp.modelIds),
    prompt_variant: exp.promptVariant,
    temperature: exp.temperature,
    max_tokens: exp.maxTokens,
    trials: exp.trials,
    task_ids: JSON.stringify(exp.taskIds),
    status: exp.status,
    created_at: exp.createdAt,
  })
  res.status(201).json(exp)
})

app.patch('/api/experiments/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM experiments WHERE id = ?`).get(req.params.id) as
    | Parameters<typeof mapExperiment>[0]
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Experiment not found' })
    return
  }
  const current = mapExperiment(row)
  const body = req.body as Partial<ExperimentConfig>
  const next: ExperimentConfig = {
    ...current,
    ...body,
    id: current.id,
    modelIds: body.modelIds ?? current.modelIds,
    taskIds: body.taskIds ?? current.taskIds,
  }
  db.prepare(
    `UPDATE experiments SET name=@name, model_ids=@model_ids, prompt_variant=@prompt_variant,
     temperature=@temperature, max_tokens=@max_tokens, trials=@trials, task_ids=@task_ids, status=@status
     WHERE id=@id`,
  ).run({
    id: next.id,
    name: next.name,
    model_ids: JSON.stringify(next.modelIds),
    prompt_variant: next.promptVariant,
    temperature: next.temperature,
    max_tokens: next.maxTokens,
    trials: next.trials,
    task_ids: JSON.stringify(next.taskIds),
    status: next.status,
  })
  res.json(next)
})

/* ─── Arena ─── */
app.get('/api/arena', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM arena_pairs ORDER BY id`)
    .all() as ArenaPairRow[]
  res.json(rows.map(mapPair))
})

app.get('/api/arena/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM arena_pairs WHERE id = ?`).get(req.params.id) as
    | ArenaPairRow
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Pair not found' })
    return
  }
  res.json(mapPair(row))
})

app.post('/api/arena/:id/vote', (req, res) => {
  const row = db.prepare(`SELECT * FROM arena_pairs WHERE id = ?`).get(req.params.id) as
    | ArenaPairRow
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Pair not found' })
    return
  }

  const { vote, rubricA, rubricB } = req.body as {
    vote: VoteResult
    rubricA?: RubricScores | null
    rubricB?: RubricScores | null
  }

  if (!vote || !['a_wins', 'b_wins', 'tie', 'both_bad'].includes(vote)) {
    res.status(400).json({ error: 'Invalid vote' })
    return
  }

  const judgedAt = new Date().toISOString()
  db.prepare(
    `UPDATE arena_pairs SET vote=@vote, rubric_a=@rubric_a, rubric_b=@rubric_b, judged_at=@judged_at WHERE id=@id`,
  ).run({
    id: row.id,
    vote,
    rubric_a: rubricA ? JSON.stringify(rubricA) : row.rubric_a,
    rubric_b: rubricB ? JSON.stringify(rubricB) : row.rubric_b,
    judged_at: judgedAt,
  })

  applyVoteToLeaderboard(row.model_a_id, row.model_b_id, vote, row.vote)

  if (rubricA) {
    const score = weightedRubric(rubricA)
    db.prepare(
      `UPDATE leaderboard SET avg_score = (avg_score * 0.95) + (? * 0.05) WHERE model_id = ?`,
    ).run(score, row.model_a_id)
  }
  if (rubricB) {
    const score = weightedRubric(rubricB)
    db.prepare(
      `UPDATE leaderboard SET avg_score = (avg_score * 0.95) + (? * 0.05) WHERE model_id = ?`,
    ).run(score, row.model_b_id)
  }

  const updated = db.prepare(`SELECT * FROM arena_pairs WHERE id = ?`).get(req.params.id) as ArenaPairRow
  res.json(mapPair(updated))
})

/* ─── Analytics ─── */
app.get('/api/analytics/overview', (_req, res) => {
  const pairs = (
    db.prepare(`SELECT COUNT(*) AS c FROM arena_pairs`).get() as { c: number }
  ).c
  const judged = (
    db.prepare(`SELECT COUNT(*) AS c FROM arena_pairs WHERE vote IS NOT NULL`).get() as {
      c: number
    }
  ).c
  const cost = (
    db.prepare(`SELECT COALESCE(SUM(total_cost_usd), 0) AS s FROM leaderboard`).get() as {
      s: number
    }
  ).s
  const avgHalluc = (
    db
      .prepare(`SELECT COALESCE(AVG(hallucination_rate), 0) AS a FROM leaderboard`)
      .get() as { a: number }
  ).a
  const top = db
    .prepare(`SELECT model_id, elo FROM leaderboard ORDER BY elo DESC LIMIT 1`)
    .get() as { model_id: string; elo: number } | undefined

  res.json({
    pairs,
    judged,
    totalComparisons: judged,
    totalCostUsd: cost,
    avgHallucinationRate: avgHalluc,
    topModelId: top?.model_id ?? null,
    topElo: top?.elo ?? null,
  })
})

app.get('/api/analytics/leaderboard', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM leaderboard ORDER BY elo DESC`)
    .all() as Array<{
    model_id: string
    wins: number
    losses: number
    ties: number
    both_bad: number
    elo: number
    avg_score: number
    avg_latency_ms: number
    total_cost_usd: number
    hallucination_rate: number
    error_rate: number
    category_scores: string
  }>
  res.json(
    rows.map((r) => ({
      modelId: r.model_id,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      bothBad: r.both_bad,
      elo: Math.round(r.elo),
      avgScore: r.avg_score,
      avgLatencyMs: r.avg_latency_ms,
      totalCostUsd: r.total_cost_usd,
      hallucinationRate: r.hallucination_rate,
      errorRate: r.error_rate,
      categoryScores: JSON.parse(r.category_scores),
    })),
  )
})

app.get('/api/analytics/categories', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM category_stats`).all() as Array<{
    category: string
    avg_score: number
    comparisons: number
    hallucinations: number
  }>
  res.json(
    rows.map((r) => ({
      category: r.category,
      avgScore: r.avg_score,
      comparisons: r.comparisons,
      hallucinations: r.hallucinations,
    })),
  )
})

app.get('/api/analytics/prompt-variants', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM prompt_variant_stats ORDER BY variant`).all() as Array<{
    variant: string
    avg_score: number
    win_rate: number
    hallucinations: number
    avg_latency: number
  }>
  res.json(
    rows.map((r) => ({
      variant: r.variant,
      avgScore: r.avg_score,
      winRate: r.win_rate,
      hallucinations: r.hallucinations,
      avgLatency: r.avg_latency,
    })),
  )
})

app.get('/api/analytics/cost-over-time', (_req, res) => {
  const rows = db.prepare(`SELECT day, cost, comparisons FROM cost_daily`).all()
  res.json(rows)
})

app.get('/api/analytics/export', (_req, res) => {
  const leaderboard = (
    db.prepare(`SELECT * FROM leaderboard ORDER BY elo DESC`).all() as Array<Record<string, unknown>>
  ).map((r) => ({
    modelId: r.model_id,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    bothBad: r.both_bad,
    elo: r.elo,
    avgScore: r.avg_score,
    avgLatencyMs: r.avg_latency_ms,
    totalCostUsd: r.total_cost_usd,
    hallucinationRate: r.hallucination_rate,
    errorRate: r.error_rate,
    categoryScores: JSON.parse(String(r.category_scores)),
  }))
  const pairs = (db.prepare(`SELECT * FROM arena_pairs`).all() as ArenaPairRow[]).map(mapPair)
  res.json({
    exportedAt: new Date().toISOString(),
    leaderboard,
    pairs,
    categoryStats: db.prepare(`SELECT * FROM category_stats`).all(),
    promptVariantStats: db.prepare(`SELECT * FROM prompt_variant_stats`).all(),
    costOverTime: db.prepare(`SELECT * FROM cost_daily`).all(),
  })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal error' })
})

app.listen(PORT, () => {
  console.log(`[api] ModelEval backend listening on http://localhost:${PORT}`)
})
