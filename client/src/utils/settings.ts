import type { LlmSettings } from '../types'

const KEY_API_KEY = 'modeleval_api_key'
const KEY_BASE_URL = 'modeleval_base_url'
const KEY_MODEL_A = 'modeleval_model_a'
const KEY_MODEL_B = 'modeleval_model_b'

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_MODEL_A = 'google/gemma-4-31b-it:free'
export const DEFAULT_MODEL_B = 'openai/gpt-4o-mini'

export function getStoredSettings(): LlmSettings {
  if (typeof window === 'undefined') {
    return {
      apiKey: '',
      baseUrl: DEFAULT_BASE_URL,
      modelA: DEFAULT_MODEL_A,
      modelB: DEFAULT_MODEL_B,
    }
  }

  return {
    apiKey: localStorage.getItem(KEY_API_KEY) ?? '',
    baseUrl: localStorage.getItem(KEY_BASE_URL) || DEFAULT_BASE_URL,
    modelA: localStorage.getItem(KEY_MODEL_A) || DEFAULT_MODEL_A,
    modelB: localStorage.getItem(KEY_MODEL_B) || DEFAULT_MODEL_B,
  }
}

export function saveStoredSettings(next: Partial<LlmSettings>): void {
  if (typeof window === 'undefined') return

  if (next.apiKey !== undefined) {
    if (next.apiKey.trim()) {
      localStorage.setItem(KEY_API_KEY, next.apiKey.trim())
    } else {
      localStorage.removeItem(KEY_API_KEY)
    }
  }

  if (next.baseUrl !== undefined) {
    localStorage.setItem(KEY_BASE_URL, next.baseUrl.trim() || DEFAULT_BASE_URL)
  }

  if (next.modelA !== undefined && next.modelA.trim()) {
    localStorage.setItem(KEY_MODEL_A, next.modelA.trim())
  }

  if (next.modelB !== undefined && next.modelB.trim()) {
    localStorage.setItem(KEY_MODEL_B, next.modelB.trim())
  }

  window.dispatchEvent(new Event('modeleval-settings-changed'))
}
