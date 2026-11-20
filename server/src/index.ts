import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import {
  applyJudgmentToPair,
  applyVoteToLeaderboard,
  db,
  ensureExperimentExists,
  ensureModelExists,
  ensureTaskExists,
  mapPair,
  recordDailyCost,
  type ArenaPairRow,
  weightedRubric,
} from './db.ts'
import { judgePairwise } from './services/judge.ts'
import {
  callLlmChat,
  normalizeBaseUrl,
  resolveApiKey,
  resolveModelName,
} from './services/llm.ts'
import { generateArenaPair } from './services/pairFactory.ts'
import type {
  BenchmarkTask,
  ExperimentConfig,
  PromptVariant,
  PromptVariantId,
  RubricScores,
  VoteResult,
} from './types/index.ts'

// Automatyczne ładowanie zmiennych środowiskowych z .env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envLocations = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
]

for (const envPath of envLocations) {
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath)
      }
    } catch {
      // Ignoruj błędy parsowania
    }
  }
}

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'modeleval-api', db: 'sqlite' })
})

/* ─── Config / Environment Info ─── */
app.get('/api/config', (_req, res) => {
  const apiKey = resolveApiKey()
  res.json({
    hasApiKey: Boolean(apiKey),
    maskedKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null,
    baseUrl: normalizeBaseUrl(),
    defaultModelA: process.env.DEFAULT_MODEL_A || 'google/gemini-2.5-flash',
    defaultModelB: process.env.DEFAULT_MODEL_B || 'openai/gpt-4o-mini',
    defaultJudgeModel:
      process.env.DEFAULT_JUDGE_MODEL ||
      process.env.DEFAULT_MODEL_A ||
      'google/gemini-2.5-flash',
  })
})

/* ─── LLM Verification Probe ─── */
app.post('/api/llm/verify', async (req, res) => {
  const { apiKey, baseUrl, model } = req.body as {
    apiKey?: string
    baseUrl?: string
    model?: string
  }
  const testModel = model || 'google/gemini-2.5-flash'
  try {
    const result = await callLlmChat(
      [
        { role: 'system', content: 'You are a connection test probe. Reply with the single word PONG.' },
        { role: 'user', content: 'Ping' },
      ],
      {
        apiKey,
        baseUrl,
        model: testModel,
        maxTokens: 10,
        temperature: 0,
      },
    )
    res.json({
      ok: true,
      model: result.modelId,
      latencyMs: result.latencyMs,
      response: result.content,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ ok: false, error: message })
  }
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

async function judgeStoredPair(
  row: ArenaPairRow,
  config: { apiKey?: string; baseUrl?: string; judgeModel?: string },
) {
  const taskRow = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(row.task_id) as
    | Parameters<typeof mapTask>[0]
    | undefined
  const task = taskRow
    ? mapTask(taskRow)
    : {
        id: row.task_id,
        title: row.task_id,
        content: row.prompt_text,
        category: 'wiedza' as const,
        criteria: 'Ogólna jakość odpowiedzi',
        expectedElements: [] as string[],
        difficulty: 2 as const,
      }

  const judgment = await judgePairwise(
    {
      taskTitle: task.title,
      taskContent: task.content,
      criteria: task.criteria,
      expectedElements: task.expectedElements,
      category: task.category,
      promptText: row.prompt_text,
      responseA: row.model_a_content,
      responseB: row.model_b_content,
    },
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      judgeModel: config.judgeModel,
      model: config.judgeModel || process.env.DEFAULT_JUDGE_MODEL || 'google/gemini-2.5-flash',
    },
  )

  applyJudgmentToPair({
    pairId: row.id,
    vote: judgment.vote,
    rubricA: judgment.rubricA,
    rubricB: judgment.rubricB,
    hallucinationA: judgment.hallucinationA,
    hallucinationB: judgment.hallucinationB,
    previousVote: row.vote,
    modelAId: row.model_a_id,
    modelBId: row.model_b_id,
    category: task.category,
    promptVariant: row.prompt_variant,
    pairCostUsd: row.model_a_cost_usd + row.model_b_cost_usd,
    judgeCostUsd: judgment.costUsd,
  })

  const updated = db.prepare(`SELECT * FROM arena_pairs WHERE id = ?`).get(row.id) as ArenaPairRow
  return { pair: mapPair(updated), judgment }
}

app.post('/api/arena/:id/judge', async (req, res) => {
  const row = db.prepare(`SELECT * FROM arena_pairs WHERE id = ?`).get(req.params.id) as
    | ArenaPairRow
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Pair not found' })
    return
  }

  const body = req.body as {
    config?: { apiKey?: string; baseUrl?: string; judgeModel?: string }
  }

  try {
    const result = await judgeStoredPair(row, body.config ?? {})
    res.json(result)
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/arena/judge-pending', async (req, res) => {
  const body = req.body as {
    experimentId?: string
    config?: { apiKey?: string; baseUrl?: string; judgeModel?: string }
  }
  const rows = (
    body.experimentId
      ? db
          .prepare(`SELECT * FROM arena_pairs WHERE vote IS NULL AND experiment_id = ? ORDER BY id`)
          .all(body.experimentId)
      : db.prepare(`SELECT * FROM arena_pairs WHERE vote IS NULL ORDER BY id`).all()
  ) as ArenaPairRow[]

  const judged = []
  const errors: Array<{ pairId: string; error: string }> = []

  for (const row of rows) {
    try {
      judged.push(await judgeStoredPair(row, body.config ?? {}))
    } catch (err: unknown) {
      errors.push({
        pairId: row.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  res.json({
    judgedCount: judged.length,
    errorCount: errors.length,
    results: judged,
    errors,
  })
})

app.post('/api/judge/universal', async (req, res) => {
  const body = req.body as {
    modelAId?: string
    modelBId?: string
    promptVariant?: PromptVariantId
    taskIds?: string[]
    temperature?: number
    maxTokens?: number
    judgeModel?: string
    name?: string
    config?: { apiKey?: string; baseUrl?: string }
  }

  const modelAId = resolveModelName(
    body.modelAId || process.env.DEFAULT_MODEL_A || 'google/gemini-2.5-flash',
  )
  const modelBId = resolveModelName(
    body.modelBId || process.env.DEFAULT_MODEL_B || 'openai/gpt-4o-mini',
  )
  if (modelAId === modelBId) {
    res.status(400).json({ error: 'Wybierz dwa różne modele do porównania.' })
    return
  }

  const promptVariant = body.promptVariant ?? 'B'
  const allTasks = db.prepare(`SELECT * FROM tasks ORDER BY id`).all() as Parameters<
    typeof mapTask
  >[0][]
  const selected =
    body.taskIds && body.taskIds.length > 0
      ? allTasks.filter((t) => body.taskIds!.includes(t.id))
      : allTasks

  if (selected.length === 0) {
    res.status(400).json({ error: 'Brak zadań w benchmarku do oceny.' })
    return
  }

  const count = (db.prepare(`SELECT COUNT(*) AS c FROM experiments`).get() as { c: number }).c
  const expId = `exp-univ-${String(count + 1).padStart(3, '0')}`
  const expName =
    body.name?.trim() ||
    `Universal judge · ${modelAId.split('/').pop()} vs ${modelBId.split('/').pop()}`

  db.prepare(
    `INSERT INTO experiments
     (id, name, model_ids, prompt_variant, temperature, max_tokens, trials, task_ids, status, created_at)
     VALUES (@id, @name, @model_ids, @prompt_variant, @temperature, @max_tokens, @trials, @task_ids, @status, @created_at)`,
  ).run({
    id: expId,
    name: expName,
    model_ids: JSON.stringify([modelAId, modelBId]),
    prompt_variant: promptVariant,
    temperature: body.temperature ?? 0.2,
    max_tokens: body.maxTokens ?? 1024,
    trials: 1,
    task_ids: JSON.stringify(selected.map((t) => t.id)),
    status: 'running',
    created_at: new Date().toISOString(),
  })

  const results: Array<{
    pair: ReturnType<typeof mapPair>
    judgment: Awaited<ReturnType<typeof judgeStoredPair>>['judgment']
  }> = []
  const errors: Array<{ taskId: string; error: string }> = []

  try {
    for (const taskRow of selected) {
      const task = mapTask(taskRow)
      try {
        const pairRow = await generateArenaPair({
          taskId: task.id,
          taskContent: task.content,
          taskTitle: task.title,
          criteria: task.criteria,
          experimentId: expId,
          experimentName: expName,
          promptVariant,
          modelAId,
          modelBId,
          temperature: body.temperature ?? 0.2,
          maxTokens: body.maxTokens ?? 1024,
          apiKey: body.config?.apiKey,
          baseUrl: body.config?.baseUrl,
        })

        const judged = await judgeStoredPair(pairRow, {
          apiKey: body.config?.apiKey,
          baseUrl: body.config?.baseUrl,
          judgeModel: body.judgeModel,
        })
        results.push(judged)
      } catch (err: unknown) {
        errors.push({
          taskId: task.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  } finally {
    db.prepare(`UPDATE experiments SET status = 'completed' WHERE id = ?`).run(expId)
  }

  const experiment = mapExperiment(
    db.prepare(`SELECT * FROM experiments WHERE id = ?`).get(expId) as Parameters<
      typeof mapExperiment
    >[0],
  )

  res.status(201).json({
    experiment,
    judgedCount: results.length,
    errorCount: errors.length,
    results,
    errors,
  })
})

app.delete('/api/arena/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM arena_pairs WHERE id = ?`).run(req.params.id)
  if (info.changes === 0) {
    res.status(404).json({ error: 'Pair not found' })
    return
  }
  res.status(204).end()
})

app.post('/api/arena/generate', async (req, res) => {
  const body = req.body as {
    promptText: string
    promptVariant?: PromptVariantId
    modelAId?: string
    modelBId?: string
    taskId?: string
    experimentId?: string
    config?: {
      apiKey?: string
      baseUrl?: string
      temperature?: number
      maxTokens?: number
    }
  }

  const promptText = (body.promptText ?? '').trim()
  if (!promptText) {
    res.status(400).json({ error: 'Treść promptu (promptText) jest wymagana.' })
    return
  }

  const promptVariantId = body.promptVariant ?? 'A'
  const modelAId = resolveModelName(body.modelAId || process.env.DEFAULT_MODEL_A || 'google/gemini-2.5-flash')
  const modelBId = resolveModelName(body.modelBId || process.env.DEFAULT_MODEL_B || 'openai/gpt-4o-mini')
  const taskId = body.taskId || `task-live-${Date.now().toString(36)}`
  const experimentId = body.experimentId || 'exp-live'

  ensureModelExists(modelAId)
  ensureModelExists(modelBId)
  ensureExperimentExists(experimentId, 'Pojedynki Areny na żywo')
  ensureTaskExists(taskId, promptText.slice(0, 60), promptText)

  // Pobierz szablon promptu
  const variantRow = db
    .prepare(`SELECT template FROM prompt_variants WHERE id = ?`)
    .get(promptVariantId) as { template: string } | undefined
  const template = variantRow?.template ?? '{{task}}'

  // Przygotuj właściwy prompt
  let renderedPrompt = template.replace('{{task}}', promptText)
  if (renderedPrompt.includes('{{criteria}}')) {
    const taskRow = db.prepare(`SELECT criteria FROM tasks WHERE id = ?`).get(taskId) as
      | { criteria: string }
      | undefined
    renderedPrompt = renderedPrompt.replace('{{criteria}}', taskRow?.criteria ?? 'Ogólna poprawność i precyzja')
  }

  const messages: Array<{ role: 'user'; content: string }> = [
    { role: 'user', content: renderedPrompt },
  ]

  const llmConfig = body.config ?? {}

  // Równoległe odpytywanie modeli
  const [resA, resB] = await Promise.allSettled([
    callLlmChat(messages, {
      model: modelAId,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
    }),
    callLlmChat(messages, {
      model: modelBId,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
    }),
  ])

  const outcomeA =
    resA.status === 'fulfilled'
      ? resA.value
      : {
          content: `[BŁĄD MODELU A]: ${resA.reason instanceof Error ? resA.reason.message : String(resA.reason)}`,
          latencyMs: 0,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          modelId: modelAId,
          error: resA.reason instanceof Error ? resA.reason.message : String(resA.reason),
        }

  const outcomeB =
    resB.status === 'fulfilled'
      ? resB.value
      : {
          content: `[BŁĄD MODELU B]: ${resB.reason instanceof Error ? resB.reason.message : String(resB.reason)}`,
          latencyMs: 0,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          modelId: modelBId,
          error: resB.reason instanceof Error ? resB.reason.message : String(resB.reason),
        }

  // Nie zapisuj porównań z błędem API (czerwone w Arenie)
  if (outcomeA.error || outcomeB.error) {
    const msg = [outcomeA.error, outcomeB.error].filter(Boolean).join(' | ')
    res.status(502).json({ error: `Błąd API modelu — para nie została zapisana: ${msg}` })
    return
  }

  const pairId = `pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const leftIsA = Math.random() < 0.5 ? 1 : 0

  const newPairRow: ArenaPairRow = {
    id: pairId,
    task_id: taskId,
    experiment_id: experimentId,
    prompt_variant: promptVariantId,
    prompt_text: renderedPrompt,
    model_a_id: modelAId,
    model_a_content: outcomeA.content,
    model_a_latency_ms: outcomeA.latencyMs,
    model_a_tokens_in: outcomeA.tokensIn,
    model_a_tokens_out: outcomeA.tokensOut,
    model_a_cost_usd: outcomeA.costUsd,
    model_a_hallucinated: 0,
    model_a_error: outcomeA.error ?? null,
    model_b_id: modelBId,
    model_b_content: outcomeB.content,
    model_b_latency_ms: outcomeB.latencyMs,
    model_b_tokens_in: outcomeB.tokensIn,
    model_b_tokens_out: outcomeB.tokensOut,
    model_b_cost_usd: outcomeB.costUsd,
    model_b_hallucinated: 0,
    model_b_error: outcomeB.error ?? null,
    left_is_a: leftIsA,
    vote: null,
    rubric_a: null,
    rubric_b: null,
    judged_at: null,
  }

  db.prepare(`
    INSERT INTO arena_pairs (
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
    )
  `).run(newPairRow)

  res.status(201).json(mapPair(newPairRow))
})

/** Unikalne pary (pełny round-robin). */
function fullModelPairs(modelIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < modelIds.length; i++) {
    for (let j = i + 1; j < modelIds.length; j++) {
      pairs.push([modelIds[i], modelIds[j]])
    }
  }
  return pairs
}

/**
 * Pary okrężne: każdy model gra z sąsiadem (po tasowaniu).
 * Dla N>4 tańsze niż pełny RR, a każdy model trafia do rankingu.
 */
function circleModelPairs(modelIds: string[]): Array<[string, string]> {
  if (modelIds.length < 2) return []
  if (modelIds.length === 2) return [[modelIds[0], modelIds[1]]]
  const shuffled = [...modelIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < shuffled.length; i++) {
    pairs.push([shuffled[i], shuffled[(i + 1) % shuffled.length]])
  }
  return pairs
}

function buildModelPairs(
  modelIds: string[],
  mode: 'auto' | 'full' | 'circle' = 'auto',
): { pairs: Array<[string, string]>; mode: 'full' | 'circle' } {
  const resolved =
    mode === 'full' ? 'full' : mode === 'circle' ? 'circle' : modelIds.length <= 4 ? 'full' : 'circle'
  return {
    mode: resolved,
    pairs: resolved === 'full' ? fullModelPairs(modelIds) : circleModelPairs(modelIds),
  }
}

app.post('/api/experiments/:id/run', async (req, res) => {
  const row = db.prepare(`SELECT * FROM experiments WHERE id = ?`).get(req.params.id) as
    | Parameters<typeof mapExperiment>[0]
    | undefined
  if (!row) {
    res.status(404).json({ error: 'Experiment not found' })
    return
  }

  const exp = mapExperiment(row)
  if (exp.modelIds.length < 2) {
    res.status(400).json({ error: 'Eksperyment wymaga co najmniej 2 modeli.' })
    return
  }

  const modelIds = [...new Set(exp.modelIds.map((id) => resolveModelName(id)))]
  if (modelIds.length < 2) {
    res.status(400).json({ error: 'Eksperyment wymaga co najmniej 2 różnych modeli.' })
    return
  }
  for (const id of modelIds) ensureModelExists(id)

  const bodyConfig = req.body as {
    autoJudge?: boolean
    judgeModel?: string
    pairingMode?: 'auto' | 'full' | 'circle'
    config?: { apiKey?: string; baseUrl?: string; judgeModel?: string }
  }
  const llmConfig = bodyConfig?.config ?? {}
  const autoJudge = Boolean(bodyConfig.autoJudge)
  const { pairs: modelPairs, mode: pairingMode } = buildModelPairs(
    modelIds,
    bodyConfig.pairingMode ?? 'auto',
  )

  db.prepare(`UPDATE experiments SET status = 'running' WHERE id = ?`).run(exp.id)

  const taskIds = exp.taskIds.length > 0 ? exp.taskIds : ['task-001']
  const trials = Math.max(1, exp.trials || 1)
  const generatedPairs: ArenaPairRow[] = []
  const judgedResults: Array<Awaited<ReturnType<typeof judgeStoredPair>>> = []
  const errors: Array<{ taskId: string; modelA: string; modelB: string; error: string }> = []

  try {
    for (let trial = 0; trial < trials; trial++) {
      for (const taskId of taskIds) {
        const taskRow = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as
          | Parameters<typeof mapTask>[0]
          | undefined
        if (!taskRow) continue
        const task = mapTask(taskRow)

        // Circle: nowe sąsiedztwo na każde zadanie → szersze pokrycie Elo
        const pairsForTask =
          pairingMode === 'circle' ? circleModelPairs(modelIds) : modelPairs

        for (const [modelAId, modelBId] of pairsForTask) {
          try {
            const pairRow = await generateArenaPair({
              taskId: task.id,
              taskContent: task.content,
              taskTitle: task.title,
              criteria: task.criteria,
              experimentId: exp.id,
              experimentName: exp.name,
              promptVariant: exp.promptVariant,
              modelAId,
              modelBId,
              temperature: exp.temperature,
              maxTokens: exp.maxTokens,
              apiKey: llmConfig.apiKey,
              baseUrl: llmConfig.baseUrl,
            })
            generatedPairs.push(pairRow)

            if (autoJudge) {
              try {
                judgedResults.push(
                  await judgeStoredPair(pairRow, {
                    apiKey: llmConfig.apiKey,
                    baseUrl: llmConfig.baseUrl,
                    judgeModel: bodyConfig.judgeModel || llmConfig.judgeModel,
                  }),
                )
              } catch {
                recordDailyCost(pairRow.model_a_cost_usd + pairRow.model_b_cost_usd, 0)
              }
            } else {
              recordDailyCost(pairRow.model_a_cost_usd + pairRow.model_b_cost_usd, 0)
            }
          } catch (err: unknown) {
            errors.push({
              taskId: task.id,
              modelA: modelAId,
              modelB: modelBId,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }
    }
  } finally {
    db.prepare(`UPDATE experiments SET status = 'completed' WHERE id = ?`).run(exp.id)
  }

  const updatedExp = mapExperiment(
    db.prepare(`SELECT * FROM experiments WHERE id = ?`).get(exp.id) as Parameters<
      typeof mapExperiment
    >[0],
  )

  res.json({
    experiment: updatedExp,
    pairsCreated: generatedPairs.map(mapPair),
    judgedCount: judgedResults.length,
    judged: judgedResults,
    pairingMode,
    modelCount: modelIds.length,
    errorCount: errors.length,
    errors,
  })
})

/* ─── Analytics ─── */
/** Modele z co najmniej jednym realnym wynikiem pairwise (głos / ocena). */
const TESTED_LEADERBOARD_SQL = `
  SELECT * FROM leaderboard
  WHERE (wins + losses + ties + both_bad) > 0
  ORDER BY elo DESC
`

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
    db
      .prepare(
        `SELECT COALESCE(SUM(total_cost_usd), 0) AS s FROM leaderboard
         WHERE (wins + losses + ties + both_bad) > 0`,
      )
      .get() as { s: number }
  ).s
  const avgHalluc = (
    db
      .prepare(
        `SELECT COALESCE(AVG(hallucination_rate), 0) AS a FROM leaderboard
         WHERE (wins + losses + ties + both_bad) > 0`,
      )
      .get() as { a: number }
  ).a
  const top = db
    .prepare(
      `SELECT model_id, elo FROM leaderboard
       WHERE (wins + losses + ties + both_bad) > 0
       ORDER BY elo DESC LIMIT 1`,
    )
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
  const rows = db.prepare(TESTED_LEADERBOARD_SQL).all() as Array<{
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
  const rows = db
    .prepare(`SELECT * FROM category_stats WHERE comparisons > 0 ORDER BY category`)
    .all() as Array<{
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
  const rows = db
    .prepare(
      `SELECT * FROM prompt_variant_stats WHERE avg_score > 0 OR win_rate > 0 ORDER BY variant`,
    )
    .all() as Array<{
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
    db.prepare(TESTED_LEADERBOARD_SQL).all() as Array<Record<string, unknown>>
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
