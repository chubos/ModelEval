import { callLlmChat, resolveModelName, type LlmRequestConfig } from './llm.ts'
import type { RubricScores, VoteResult } from '../types/index.ts'

export interface JudgeInput {
  taskTitle: string
  taskContent: string
  criteria: string
  expectedElements: string[]
  category: string
  promptText: string
  responseA: string
  responseB: string
  /** Blind labels stay A/B — judge must not know real model names */
}

export interface JudgeResult {
  vote: VoteResult
  rubricA: RubricScores
  rubricB: RubricScores
  hallucinationA: boolean
  hallucinationB: boolean
  rationale: string
  judgeModel: string
  latencyMs: number
  costUsd: number
  raw?: string
}

const JUDGE_SYSTEM = `Jesteś bezstronnym sędzią jakości odpowiedzi modeli językowych (LLM-as-a-judge).
Oceniasz uniwersalnie: programowanie, logikę, streszczanie, wykonywanie instrukcji i wiedzę ogólną.

Zasady:
- Nie faworyzuj dłuższych odpowiedzi ani ładniejszego formatowania, jeśli treść jest gorsza.
- Karaj halucynacje, zmyślone fakty, złamanie formatu i pominięcie instrukcji.
- Skale rubryki: liczby całkowite 1–5.
- Głos pairwise: a_wins | b_wins | tie | both_bad.
- Zwróć WYŁĄCZNIE poprawny JSON (bez markdown fence).`

function clampScore(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 3
  return Math.min(5, Math.max(1, v))
}

function normalizeRubric(raw: Partial<RubricScores> | undefined): RubricScores {
  return {
    correctness: clampScore(raw?.correctness),
    instructionFollow: clampScore(raw?.instructionFollow),
    completeness: clampScore(raw?.completeness),
    clarity: clampScore(raw?.clarity),
    verifiability: clampScore(raw?.verifiability),
  }
}

function normalizeVote(raw: unknown): VoteResult {
  const v = String(raw ?? '').toLowerCase().trim()
  if (v === 'a_wins' || v === 'b_wins' || v === 'tie' || v === 'both_bad') return v
  if (v.includes('both') || v.includes('obie')) return 'both_bad'
  if (v.includes('tie') || v.includes('remis')) return 'tie'
  if (v.includes('b')) return 'b_wins'
  return 'a_wins'
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) {
      return JSON.parse(fence[1].trim())
    }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Sędzia LLM nie zwrócił poprawnego JSON.')
  }
}

export function buildJudgeUserPrompt(input: JudgeInput): string {
  const expected =
    input.expectedElements.length > 0
      ? input.expectedElements.map((e) => `- ${e}`).join('\n')
      : '- (brak listy — oceniaj wg kryteriów)'

  return `Oceń dwie anonimowe odpowiedzi (Model A i Model B) na to samo zadanie.

## Zadanie
Tytuł: ${input.taskTitle || '(bez tytułu)'}
Kategoria: ${input.category || 'ogólna'}

Treść:
${input.taskContent}

## Kryteria poprawności
${input.criteria || 'Poprawność merytoryczna, zgodność z poleceniem, kompletność.'}

## Oczekiwane elementy
${expected}

## Prompt wysłany do modeli
${input.promptText}

## Odpowiedź Modelu A
${input.responseA || '(pusta)'}

## Odpowiedź Modelu B
${input.responseB || '(pusta)'}

## Rubryka (oceń 1–5)
- correctness (35%): poprawność merytoryczna / zgodność z faktami lub testami
- instructionFollow (25%): zgodność z poleceniem
- completeness (20%): kompletność
- clarity (10%): jasność i struktura
- verifiability (10%): uzasadnienie / weryfikowalność

## Format odpowiedzi (tylko JSON)
{
  "vote": "a_wins" | "b_wins" | "tie" | "both_bad",
  "rubricA": { "correctness": 1, "instructionFollow": 1, "completeness": 1, "clarity": 1, "verifiability": 1 },
  "rubricB": { "correctness": 1, "instructionFollow": 1, "completeness": 1, "clarity": 1, "verifiability": 1 },
  "hallucinationA": false,
  "hallucinationB": false,
  "rationale": "2-4 zdania po polsku"
}`
}

export async function judgePairwise(
  input: JudgeInput,
  config: LlmRequestConfig & { judgeModel?: string },
): Promise<JudgeResult> {
  const judgeModel = resolveModelName(
    config.judgeModel ||
      process.env.DEFAULT_JUDGE_MODEL ||
      process.env.DEFAULT_MODEL_A ||
      'google/gemini-2.5-flash',
  )

  const completion = await callLlmChat(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: buildJudgeUserPrompt(input) },
    ],
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: judgeModel,
      temperature: 0,
      maxTokens: config.maxTokens ?? 900,
    },
  )

  const parsed = extractJson(completion.content) as {
    vote?: string
    rubricA?: Partial<RubricScores>
    rubricB?: Partial<RubricScores>
    hallucinationA?: boolean
    hallucinationB?: boolean
    rationale?: string
  }

  return {
    vote: normalizeVote(parsed.vote),
    rubricA: normalizeRubric(parsed.rubricA),
    rubricB: normalizeRubric(parsed.rubricB),
    hallucinationA: Boolean(parsed.hallucinationA),
    hallucinationB: Boolean(parsed.hallucinationB),
    rationale: String(parsed.rationale ?? '').trim() || 'Brak uzasadnienia od sędziego.',
    judgeModel: completion.modelId,
    latencyMs: completion.latencyMs,
    costUsd: completion.costUsd,
    raw: completion.content,
  }
}
