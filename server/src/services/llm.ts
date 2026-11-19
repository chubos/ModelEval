export interface LlmRequestConfig {
  apiKey?: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface LlmCompletionResult {
  content: string
  latencyMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  modelId: string
  error?: string
}

// Ceny orientacyjne za 1M tokenów (prompt / completion w USD) dla popularnych modeli,
// do estymacji kosztu jeśli API OpenRouter nie zwróci dokładnego kosztu
const MODEL_PRICING: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'google/gemini-2.5-flash': { promptPer1M: 0.075, completionPer1M: 0.3 },
  'google/gemini-1.5-flash': { promptPer1M: 0.075, completionPer1M: 0.3 },
  'google/gemini-1.5-pro': { promptPer1M: 1.25, completionPer1M: 5.0 },
  'openai/gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.6 },
  'openai/gpt-4o': { promptPer1M: 2.5, completionPer1M: 10.0 },
  'anthropic/claude-3.5-sonnet': { promptPer1M: 3.0, completionPer1M: 15.0 },
  'anthropic/claude-3-haiku': { promptPer1M: 0.25, completionPer1M: 1.25 },
  'meta-llama/llama-3.3-70b-instruct': { promptPer1M: 0.2, completionPer1M: 0.4 },
  'deepseek/deepseek-chat': { promptPer1M: 0.14, completionPer1M: 0.28 },
  'mistralai/mistral-large-2411': { promptPer1M: 2.0, completionPer1M: 6.0 },
}

// Mapowanie starych/uproszczonych identyfikatorów na pełne nazwy OpenRouter
export const MODEL_ALIASES: Record<string, string> = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-3.5': 'anthropic/claude-3.5-sonnet',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-1.5': 'google/gemini-2.5-flash',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'llama-3.1-70b': 'meta-llama/llama-3.3-70b-instruct',
  'mistral-large': 'mistralai/mistral-large-2411',
  'qwen-2.5-72b': 'qwen/qwen-2.5-72b-instruct',
}

export function resolveModelName(model: string): string {
  const trimmed = model.trim()
  return MODEL_ALIASES[trimmed] || trimmed
}

export function normalizeBaseUrl(inputUrl?: string): string {
  const defaultUrl = 'https://openrouter.ai/api/v1'
  let url = (inputUrl || process.env.OPENROUTER_BASE_URL || process.env.OPENAI_BASE_URL || defaultUrl).trim()
  
  // Usuń końcowe ukośniki
  url = url.replace(/\/+$/, '')
  
  // Jeśli użytkownik wpisał pełny endpoint kończący się na /chat/completions, usuń go aby zachować spójność
  if (url.endsWith('/chat/completions')) {
    url = url.substring(0, url.length - '/chat/completions'.length)
  }
  
  return url
}

export function resolveApiKey(providedKey?: string): string {
  const key = (
    providedKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ''
  ).trim()
  return key
}

export async function callLlmChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: LlmRequestConfig,
): Promise<LlmCompletionResult> {
  const apiKey = resolveApiKey(config.apiKey)
  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const endpoint = `${baseUrl}/chat/completions`

  if (!apiKey) {
    throw new Error(
      'Brak klucza API. Podaj klucz w Ustawieniach aplikacji lub zdefiniuj zmienną środowiskową OPENROUTER_API_KEY w pliku .env.',
    )
  }

  const model = resolveModelName(config.model)
  if (!model) {
    throw new Error('Nie określono nazwy modelu.')
  }

  const temperature = config.temperature ?? 0.2
  const maxTokens = config.maxTokens ?? 1024

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    // Nagłówki rekomendowane przez OpenRouter.ai:
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'ModelEval Arena',
  }

  const startTime = Date.now()

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Błąd połączenia sieciowego z API (${endpoint}): ${message}`)
  }

  const latencyMs = Date.now() - startTime

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorJson = await response.json()
      errorDetail =
        errorJson?.error?.message ||
        errorJson?.message ||
        JSON.stringify(errorJson)
    } catch {
      errorDetail = await response.text().catch(() => '')
    }

    if (response.status === 401) {
      throw new Error(
        `Błąd autoryzacji (401 Unauthorized): Nieprawidłowy klucz API dla dostawcy ${baseUrl}. Szczegóły: ${errorDetail}`,
      )
    }
    if (response.status === 402) {
      throw new Error(
        `Brak środków na koncie (402 Payment Required / Insufficient Credits): Uzupełnij kredyty na OpenRouter lub u wybranego dostawcy. Szczegóły: ${errorDetail}`,
      )
    }
    if (response.status === 429) {
      throw new Error(
        `Przekroczono limit zapytań (429 Rate Limit Exceeded): Zbyt wiele żądań lub wyczerpany limit minutowy. Szczegóły: ${errorDetail}`,
      )
    }
    if (response.status === 404) {
      throw new Error(
        `Model nie został znaleziony (404 Not Found): Sprawdź czy nazwa modelu "${model}" jest poprawna dla dostawcy ${baseUrl}.`,
      )
    }

    throw new Error(
      `Błąd API (${response.status} ${response.statusText}): ${errorDetail || 'Nieznany błąd dostawcy'}`,
    )
  }

  const data = await response.json()

  const choice = data.choices?.[0]
  const content = choice?.message?.content ?? ''
  const tokensIn = Number(data.usage?.prompt_tokens ?? 0)
  const tokensOut = Number(data.usage?.completion_tokens ?? 0)

  // Wyliczanie kosztu
  let costUsd = 0
  if (typeof data.usage?.total_cost === 'number') {
    costUsd = data.usage.total_cost
  } else {
    const pricing = MODEL_PRICING[model]
    if (pricing) {
      costUsd =
        (tokensIn / 1_000_000) * pricing.promptPer1M +
        (tokensOut / 1_000_000) * pricing.completionPer1M
    } else {
      // Domyślna szacunkowa stawka orientacyjna (np. $0.5 / 1M prompt, $1.5 / 1M completion)
      costUsd = (tokensIn / 1_000_000) * 0.5 + (tokensOut / 1_000_000) * 1.5
    }
  }

  return {
    content: content.trim(),
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd: Math.round(costUsd * 100000) / 100000,
    modelId: model,
  }
}
