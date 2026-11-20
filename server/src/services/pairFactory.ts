import {
  db,
  ensureExperimentExists,
  ensureModelExists,
  ensureTaskExists,
  type ArenaPairRow,
} from '../db.ts'
import { callLlmChat, resolveModelName } from './llm.ts'
import type { PromptVariantId } from '../types/index.ts'

export async function generateArenaPair(opts: {
  taskId: string
  taskContent: string
  taskTitle?: string
  criteria?: string
  experimentId: string
  experimentName?: string
  promptVariant: PromptVariantId
  modelAId: string
  modelBId: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
  baseUrl?: string
}): Promise<ArenaPairRow> {
  const modelAId = resolveModelName(opts.modelAId)
  const modelBId = resolveModelName(opts.modelBId)
  ensureModelExists(modelAId)
  ensureModelExists(modelBId)
  ensureExperimentExists(opts.experimentId, opts.experimentName)
  ensureTaskExists(opts.taskId, opts.taskTitle, opts.taskContent)

  const variantRow = db
    .prepare(`SELECT template FROM prompt_variants WHERE id = ?`)
    .get(opts.promptVariant) as { template: string } | undefined
  const template = variantRow?.template ?? '{{task}}'

  let renderedPrompt = template.replace('{{task}}', opts.taskContent)
  if (renderedPrompt.includes('{{criteria}}')) {
    renderedPrompt = renderedPrompt.replace(
      '{{criteria}}',
      opts.criteria ?? 'Ogólna poprawność i precyzja',
    )
  }

  const messages: Array<{ role: 'user'; content: string }> = [
    { role: 'user', content: renderedPrompt },
  ]

  const [resA, resB] = await Promise.allSettled([
    callLlmChat(messages, {
      model: modelAId,
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    }),
    callLlmChat(messages, {
      model: modelBId,
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
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

  // Nie zapisuj porównań z błędem API (czerwone w Arenie) — nie wpływają na ranking
  if (outcomeA.error || outcomeB.error) {
    const parts = [
      outcomeA.error ? `A (${modelAId}): ${outcomeA.error}` : null,
      outcomeB.error ? `B (${modelBId}): ${outcomeB.error}` : null,
    ].filter(Boolean)
    throw new Error(`Pominięto parę (błąd API): ${parts.join(' | ')}`)
  }

  const pairId = `pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const leftIsA = Math.random() < 0.5 ? 1 : 0

  const pairRow: ArenaPairRow = {
    id: pairId,
    task_id: opts.taskId,
    experiment_id: opts.experimentId,
    prompt_variant: opts.promptVariant,
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
  `).run(pairRow)

  return pairRow
}
