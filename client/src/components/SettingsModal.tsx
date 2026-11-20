import { useEffect, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Server,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { api } from '../api/client'
import type { ServerConfig } from '../types'
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL_A,
  DEFAULT_MODEL_B,
  getStoredSettings,
  saveStoredSettings,
} from '../utils/settings'
import { Badge, Button } from './ui'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const POPULAR_PROVIDERS = [
  { label: 'OpenRouter (domyślny)', url: 'https://openrouter.ai/api/v1' },
  { label: 'OpenAI API', url: 'https://api.openai.com/v1' },
  { label: 'Groq Cloud', url: 'https://api.groq.com/openai/v1' },
  { label: 'Ollama (Local)', url: 'http://localhost:11434/v1' },
]

const POPULAR_MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.1-8b-instruct',
  'openai/gpt-5-nano',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-chat',
  'google/gemini-2.5-flash',
  'mistralai/mistral-large-2512',
  'meta-llama/llama-3.3-70b-instruct',
  'openai/gpt-4o',
  'anthropic/claude-sonnet-4.5',
]

function SettingsModalContent({ onClose }: { onClose: () => void }) {
  const initial = getStoredSettings()
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || DEFAULT_BASE_URL)
  const [modelA, setModelA] = useState(initial.modelA || DEFAULT_MODEL_A)
  const [modelB, setModelB] = useState(initial.modelB || DEFAULT_MODEL_B)
  const [showKey, setShowKey] = useState(false)
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latencyMs?: number
  } | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.config()
      .then((cfg) => {
        if (!cancelled) setServerConfig(cfg)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = () => {
    saveStoredSettings({ apiKey, baseUrl, modelA, modelB })
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
      onClose()
    }, 600)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.llm.verify({
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        model: modelA.trim() || undefined,
      })
      setTestResult({
        success: true,
        message: `Połączenie udane! Model ${res.model} odpowiedział w ${res.latencyMs} ms.`,
        latencyMs: res.latencyMs,
      })
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-arena-overlay p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-arena-border bg-arena-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-arena-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-arena-accent/15 text-arena-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-arena-text">
                Ustawienia modeli i API
              </h2>
              <p className="text-xs text-arena-muted">
                Komunikacja ze standardem OpenAI / OpenRouter.ai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-arena-muted transition hover:bg-arena-elevated hover:text-arena-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
          {/* Informacja o statusie serwera */}
          {serverConfig?.hasApiKey && !apiKey && (
            <div className="flex items-center gap-2 rounded-xl border border-arena-success/30 bg-arena-success-soft px-3.5 py-2.5 text-xs text-arena-success">
              <Server className="h-4 w-4 shrink-0" />
              <span>
                Wykryto klucz na serwerze w pliku <code className="font-mono">.env</code> (
                {serverConfig.maskedKey}). Możesz pozostawić poniższe pole puste, by użyć klucza z serwera.
              </span>
            </div>
          )}

          {/* Klucz API */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-arena-text">
                Klucz API (OpenRouter / OpenAI)
              </label>
              <span className="text-[11px] text-arena-dim">
                Zapisywany lokalnie w <code className="font-mono">localStorage</code>
              </span>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  serverConfig?.hasApiKey
                    ? 'Klucz z .env aktywny (lub wpisz inny aby nadpisać)'
                    : 'sk-or-v1-... wklej swój klucz OpenRouter'
                }
                className="w-full rounded-xl border border-arena-border bg-arena-elevated py-2.5 pl-3.5 pr-10 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-arena-dim hover:text-arena-text"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-arena-muted">
              Pobierz bezpłatny lub doładowany klucz z{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-arena-accent hover:underline"
              >
                openrouter.ai/keys
              </a>
              .
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-arena-text">
              Base URL (OpenAI-compatible)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              className="w-full rounded-xl border border-arena-border bg-arena-elevated px-3.5 py-2 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_PROVIDERS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setBaseUrl(p.url)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                    baseUrl === p.url
                      ? 'border-arena-accent/60 bg-arena-accent/15 text-arena-accent'
                      : 'border-arena-border text-arena-muted hover:border-arena-border-hover'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modele A i B */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-arena-text">
                <span>Domyślny Model A</span>
                <Badge tone="a">Lewy</Badge>
              </label>
              <input
                type="text"
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                placeholder="google/gemini-2.5-flash"
                className="w-full rounded-xl border border-arena-border bg-arena-elevated px-3 py-2 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-arena-text">
                <span>Domyślny Model B</span>
                <Badge tone="b">Prawy</Badge>
              </label>
              <input
                type="text"
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                placeholder="openai/gpt-4o-mini"
                className="w-full rounded-xl border border-arena-border bg-arena-elevated px-3 py-2 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
              />
            </div>
          </div>

          {/* Szybkie propozycje modeli */}
          <div>
            <span className="mb-1.5 block text-[11px] text-arena-dim">
              Kliknij model aby wstawić jako Model A / Model B:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (modelA !== m) setModelA(m)
                    else setModelB(m)
                  }}
                  className="rounded-md border border-arena-border bg-arena-bg px-2 py-0.5 font-mono text-[11px] text-arena-muted hover:border-arena-accent/50 hover:text-arena-text"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`rounded-xl border p-3 text-xs leading-relaxed ${
                testResult.success
                  ? 'border-arena-success/40 bg-arena-success-soft text-arena-success'
                  : 'border-arena-danger/40 bg-arena-danger-soft text-arena-danger'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-arena-border bg-arena-surface px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={testing}
            onClick={() => void handleTest()}
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {testing ? 'Testowanie…' : 'Testuj połączenie'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Anuluj
            </Button>
            <Button size="sm" onClick={handleSave}>
              {savedNotice ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Zapisano!
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Zapisz ustawienia
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  if (!open) return null
  return <SettingsModalContent onClose={onClose} />
}
