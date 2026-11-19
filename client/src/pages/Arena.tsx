import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Languages,
  Lightbulb,
  Loader2,
  Plus,
  Scale,
  Sparkles,
  Swords,
  ThumbsDown,
  Trash2,
  Trophy,
} from 'lucide-react'
import { api } from '../api/client'
import { ScoreRubric } from '../components/ScoreRubric'
import { SettingsModal } from '../components/SettingsModal'
import { Badge, Button, Card } from '../components/ui'
import { EXAMPLE_TASKS } from '../data/exampleTasks'
import { categoryLabels } from '../data/labels'
import type {
  ArenaPair,
  BenchmarkTask,
  ExampleTask,
  ModelInfo,
  PromptVariant,
  PromptVariantId,
  RubricScores,
  VoteResult,
} from '../types'
import { cn } from '../utils/cn'
import { emptyRubric, formatMs, formatUsd, weightedScore } from '../utils/scoring'
import { getStoredSettings } from '../utils/settings'

const voteOptions: {
  id: VoteResult
  label: string
  icon: typeof Trophy
  className: string
  active: string
}[] = [
  {
    id: 'a_wins',
    label: 'Model A lepszy',
    icon: Trophy,
    className: 'hover:border-sky-500/50 hover:bg-sky-950/40',
    active: 'border-sky-500 bg-sky-950/60 text-arena-model-a ring-2 ring-sky-500/40',
  },
  {
    id: 'b_wins',
    label: 'Model B lepszy',
    icon: Trophy,
    className: 'hover:border-orange-500/50 hover:bg-orange-950/40',
    active: 'border-orange-500 bg-orange-950/60 text-arena-model-b ring-2 ring-orange-500/40',
  },
  {
    id: 'tie',
    label: 'Remis',
    icon: Scale,
    className: 'hover:border-violet-500/50 hover:bg-violet-950/40',
    active: 'border-violet-500 bg-violet-950/60 text-arena-tie ring-2 ring-violet-500/40',
  },
  {
    id: 'both_bad',
    label: 'Obie złe',
    icon: ThumbsDown,
    className: 'hover:border-red-500/50 hover:bg-red-950/40',
    active: 'border-red-500 bg-red-950/60 text-arena-danger ring-2 ring-red-500/40',
  },
]

function getTaskIcon(iconName: ExampleTask['iconName']) {
  switch (iconName) {
    case 'FileText':
      return FileText
    case 'Code':
      return Code
    case 'Lightbulb':
      return Lightbulb
    case 'Languages':
      return Languages
    case 'FileSpreadsheet':
      return FileSpreadsheet
    default:
      return Sparkles
  }
}

function ResponsePanelSkeleton({ side }: { side: 'A' | 'B' }) {
  return (
    <Card className="flex min-h-[300px] flex-1 flex-col overflow-hidden animate-pulse">
      <div className="flex items-center justify-between border-b border-arena-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={side === 'A' ? 'a' : 'b'}>Model {side}</Badge>
          <span className="text-xs text-arena-dim">Oczekiwanie na odpowiedź API…</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-arena-dim">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-arena-accent" />
          <span>Generowanie…</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-arena-elevated" />
        <div className="h-4 w-5/6 rounded bg-arena-elevated/70" />
        <div className="h-4 w-2/3 rounded bg-arena-elevated/50" />
        <div className="h-20 w-full rounded-lg bg-arena-elevated/30" />
        <div className="h-4 w-4/5 rounded bg-arena-elevated/60" />
      </div>
    </Card>
  )
}

function ResponsePanel({
  side,
  content,
  meta,
  revealedName,
}: {
  side: 'A' | 'B'
  content: string
  meta: { latencyMs: number; tokensOut: number; costUsd: number; hallucinated?: boolean; error?: string | null }
  revealedName?: string
}) {
  const isError = Boolean(meta.error)

  return (
    <Card className="flex min-h-[300px] flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-arena-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={side === 'A' ? 'a' : 'b'}>Model {side}</Badge>
          {revealedName && (
            <span className="font-mono text-xs font-semibold text-arena-text">
              {revealedName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-arena-dim">
          {meta.latencyMs > 0 && <span>{formatMs(meta.latencyMs)}</span>}
          {meta.tokensOut > 0 && <span>{meta.tokensOut} tok</span>}
          {meta.costUsd > 0 && <span>{formatUsd(meta.costUsd)}</span>}
          {meta.hallucinated && <Badge tone="danger">halucynacja?</Badge>}
          {isError && <Badge tone="danger">Błąd API</Badge>}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300">
            <p className="font-semibold">Błąd podczas generowania odpowiedzi:</p>
            <p className="mt-1 whitespace-pre-wrap font-mono">{meta.error || content}</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-arena-text/95">
            {content || <span className="italic text-arena-dim">Brak odpowiedzi.</span>}
          </pre>
        )}
      </div>
    </Card>
  )
}

export function Arena() {
  const [pairs, setPairs] = useState<ArenaPair[]>([])
  const [tasks, setTasks] = useState<BenchmarkTask[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [variants, setVariants] = useState<PromptVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [index, setIndex] = useState(0)
  const [rubricOpen, setRubricOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [draftA, setDraftA] = useState<RubricScores>(emptyRubric())
  const [draftB, setDraftB] = useState<RubricScores>(emptyRubric())

  // Stan kreacji pojedynku
  const [promptInput, setPromptInput] = useState('')
  const [selectedVariant, setSelectedVariant] = useState<PromptVariantId>('A')
  const [selectedModelA, setSelectedModelA] = useState('')
  const [selectedModelB, setSelectedModelB] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Inicjalizacja modeli i ustawień
  const reloadSettings = () => {
    const stored = getStoredSettings()
    setSelectedModelA((curr) => curr || stored.modelA || 'google/gemini-2.5-flash')
    setSelectedModelB((curr) => curr || stored.modelB || 'openai/gpt-4o-mini')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [p, t, m, v] = await Promise.all([
          api.arena.list(),
          api.tasks.list(),
          api.models(),
          api.prompts.list(),
        ])
        if (cancelled) return
        setPairs(p)
        setTasks(t)
        setModels(m)
        setVariants(v)
        if (p.length > 0) {
          setIndex(p.length - 1)
          setDraftA(p[p.length - 1].rubricA ?? emptyRubric())
          setDraftB(p[p.length - 1].rubricB ?? emptyRubric())
        }
        reloadSettings()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Błąd API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const handler = () => reloadSettings()
    window.addEventListener('modeleval-settings-changed', handler)

    return () => {
      cancelled = true
      window.removeEventListener('modeleval-settings-changed', handler)
    }
  }, [])

  const pair = pairs[index]
  const task = pair ? tasks.find((t) => t.id === pair.taskId) : undefined
  const pending = pairs.filter((p) => !p.vote).length

  const progress = useMemo(() => {
    if (!pairs.length) return 0
    return Math.round((pairs.filter((p) => p.vote).length / pairs.length) * 100)
  }, [pairs])

  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id

  const loadPair = (nextIndex: number) => {
    const p = pairs[nextIndex]
    if (!p) return
    setIndex(nextIndex)
    setRevealed(false)
    setDraftA(p.rubricA ?? emptyRubric())
    setDraftB(p.rubricB ?? emptyRubric())
  }

  const handleSelectExample = (ex: ExampleTask) => {
    setPromptInput(ex.prompt)
    setGenerateError(null)
  }

  const handleGeneratePair = async (customPrompt?: string) => {
    const text = (customPrompt || promptInput).trim()
    if (!text) {
      setGenerateError('Wprowadź treść promptu lub wybierz jedno z przykładowych zadań poniżej.')
      return
    }

    const stored = getStoredSettings()
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const newPair = await api.arena.generate({
        promptText: text,
        promptVariant: selectedVariant,
        modelAId: selectedModelA || stored.modelA,
        modelBId: selectedModelB || stored.modelB,
        config: {
          apiKey: stored.apiKey || undefined,
          baseUrl: stored.baseUrl || undefined,
        },
      })

      setPairs((prev) => [...prev, newPair])
      setIndex(pairs.length)
      setRevealed(false)
      setDraftA(emptyRubric())
      setDraftB(emptyRubric())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setGenerateError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeletePair = async (id: string) => {
    try {
      await api.arena.remove(id)
      const nextPairs = pairs.filter((p) => p.id !== id)
      setPairs(nextPairs)
      if (nextPairs.length > 0) {
        const nextIndex = Math.max(0, index - 1)
        loadPair(nextIndex)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się usunąć pary')
    }
  }

  const applyVote = async (uiVote: VoteResult) => {
    if (!pair) return
    const trueVote = !pair.leftIsA
      ? uiVote === 'a_wins'
        ? 'b_wins'
        : uiVote === 'b_wins'
          ? 'a_wins'
          : uiVote
      : uiVote

    setSaving(true)
    try {
      const updated = await api.arena.vote(pair.id, {
        vote: trueVote,
        rubricA: draftA,
        rubricB: draftB,
      })
      setPairs((prev) => prev.map((p, i) => (i === index ? updated : p)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się zapisać głosu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-arena-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie Areny z bazy SQLite…
      </div>
    )
  }

  const left = pair ? (pair.leftIsA ? pair.modelA : pair.modelB) : null
  const right = pair ? (pair.leftIsA ? pair.modelB : pair.modelA) : null
  const leftTrueId = pair ? (pair.leftIsA ? pair.modelA.modelId : pair.modelB.modelId) : ''
  const rightTrueId = pair ? (pair.leftIsA ? pair.modelB.modelId : pair.modelA.modelId) : ''

  const currentUiVote = pair?.vote
    ? !pair.leftIsA
      ? pair.vote === 'a_wins'
        ? 'b_wins'
        : pair.vote === 'b_wins'
          ? 'a_wins'
          : pair.vote
      : pair.vote
    : null

  return (
    <div className="flex min-h-screen flex-col animate-fade-in pb-12">
      {/* Header Areny */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-arena-border bg-arena-surface/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-arena-accent/15 text-arena-accent">
            <Swords className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-arena-text">
              Arena porównawcza modeli LLM
            </h1>
            <p className="text-xs text-arena-muted">
              Blind test na żywo · {pairs.length} pojedynków ({pending} do oceny)
              {saving ? ' · zapisywanie głosu…' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pairs.length > 0 && (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-arena-elevated">
                  <div
                    className="h-full rounded-full bg-arena-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-arena-muted">{progress}%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevealed((v) => !v)}
              >
                {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {revealed ? 'Ukryj modele' : 'Ujawnij modele'}
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => loadPair(index - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center font-mono text-xs text-arena-muted">
                  {index + 1} / {pairs.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={index === pairs.length - 1}
                  onClick={() => loadPair(index + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {pair && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-950/30 hover:text-red-300"
                    onClick={() => void handleDeletePair(pair.id)}
                    title="Usuń ten pojedynek"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sekcja: NOWY POJEDYNEK + 5 PRZYKŁADOWYCH ZADAŃ */}
      <section className="border-b border-arena-border bg-arena-card/40 p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-arena-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-arena-text">
                Przetestuj na gotowych zadaniach (1 kliknięcie) lub wpisz własny prompt
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-xs text-arena-accent transition hover:underline"
            >
              Zmień klucz API / modele ⚙️
            </button>
          </div>

          {/* 5 kafelków przykładowych zadań */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {EXAMPLE_TASKS.map((ex) => {
              const Icon = getTaskIcon(ex.iconName)
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectExample(ex)}
                  className="flex flex-col justify-between rounded-xl border border-arena-border bg-arena-card p-3 text-left transition-all hover:border-arena-accent/50 hover:bg-arena-elevated/80 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-arena-accent/15 text-arena-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <Badge tone="accent">{ex.badge}</Badge>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-semibold text-arena-text">{ex.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-arena-muted">
                      {ex.category}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Formularz promptu i modeli */}
          <div className="space-y-3 rounded-2xl border border-arena-border bg-arena-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-arena-muted">Model A:</span>
                <input
                  type="text"
                  value={selectedModelA}
                  onChange={(e) => setSelectedModelA(e.target.value)}
                  placeholder="google/gemini-2.5-flash"
                  className="w-48 rounded-lg border border-arena-border bg-arena-elevated px-2.5 py-1.5 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
                />
              </div>

              <span className="text-xs font-bold text-arena-dim">VS</span>

              <div className="flex items-center gap-2">
                <span className="text-xs text-arena-muted">Model B:</span>
                <input
                  type="text"
                  value={selectedModelB}
                  onChange={(e) => setSelectedModelB(e.target.value)}
                  placeholder="openai/gpt-4o-mini"
                  className="w-48 rounded-lg border border-arena-border bg-arena-elevated px-2.5 py-1.5 font-mono text-xs text-arena-text outline-none focus:border-arena-accent"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-arena-muted">Szablon:</span>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value as PromptVariantId)}
                  className="rounded-lg border border-arena-border bg-arena-elevated px-2 py-1.5 text-xs text-arena-text outline-none focus:border-arena-accent"
                >
                  {variants.length > 0 ? (
                    variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="A">Wariant A (Podstawowy)</option>
                      <option value="B">Wariant B (Ograniczenia)</option>
                      <option value="C">Wariant C (Ustrukturyzowany)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Wpisz pytanie, zadanie lub wybierz kafelek z przykładowym zadaniem powyżej…"
              rows={3}
              className="w-full resize-y rounded-xl border border-arena-border bg-arena-elevated p-3 text-xs leading-relaxed text-arena-text outline-none placeholder:text-arena-dim focus:border-arena-accent"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-arena-dim">
                {promptInput.length > 0 ? `${promptInput.length} znaków` : 'Wybierz kafelek lub wpisz treść'}
              </span>

              <div className="flex items-center gap-2">
                {promptInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPromptInput('')}
                    disabled={isGenerating}
                  >
                    Wyczyść
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={isGenerating || !promptInput.trim()}
                  onClick={() => void handleGeneratePair()}
                  className="bg-arena-accent hover:bg-arena-accent/90"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Swords className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Generowanie odpowiedzi…' : 'Wygeneruj pojedynek AI'}
                </Button>
              </div>
            </div>
          </div>

          {/* Komunikat błędu generowania */}
          {generateError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <div className="flex-1">
                <p className="font-semibold">Nie udało się wygenerować odpowiedzi:</p>
                <p className="mt-0.5">{generateError}</p>
                {generateError.includes('Brak klucza API') && (
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/30"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Otwórz Ustawienia i podaj klucz API
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PUSTY STAN / BRAK PAR */}
      {!pair && !isGenerating && (
        <div className="flex flex-1 flex-col items-center justify-center p-12 text-center animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arena-accent/15 text-arena-accent">
            <Swords className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-arena-text">
            Brak aktywnych pojedynków w bazie
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-arena-muted">
            Wybierz jedno z 5 gotowych przykładowych zadań u góry lub wpisz własne pytanie, a następnie kliknij{' '}
            <strong className="text-arena-text">„Wygeneruj pojedynek AI”</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {EXAMPLE_TASKS.slice(0, 3).map((ex) => (
              <Button
                key={ex.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setPromptInput(ex.prompt)
                  void handleGeneratePair(ex.prompt)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Uruchom: {ex.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* AKTYWNY POJEDYNEK */}
      {(pair || isGenerating) && (
        <div className="flex-1 space-y-4 p-6">
          {/* Informacja o prompcie aktywnej pary */}
          {pair && (
            <div className="rounded-2xl border border-arena-border bg-arena-card/60 p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">Prompt {pair.promptVariant}</Badge>
                {task && <Badge>{categoryLabels[task.category] || task.category}</Badge>}
                <Badge tone="neutral">{pair.experimentId}</Badge>
                {pair.vote && <Badge tone="success">Ocenione</Badge>}
              </div>
              <p className="max-w-5xl text-sm leading-relaxed text-arena-text/95 font-medium">
                {pair.promptText}
              </p>
              {task && <p className="mt-2 text-xs text-arena-dim">Kryteria: {task.criteria}</p>}
            </div>
          )}

          {/* Panele odpowiedzi (A vs B) lub szkielety ładowania */}
          <div className="grid min-h-[360px] grid-cols-1 gap-5 lg:grid-cols-2">
            {isGenerating ? (
              <>
                <ResponsePanelSkeleton side="A" />
                <ResponsePanelSkeleton side="B" />
              </>
            ) : pair && left && right ? (
              <>
                <ResponsePanel
                  side="A"
                  content={left.content}
                  meta={left}
                  revealedName={revealed ? modelName(leftTrueId) : undefined}
                />
                <ResponsePanel
                  side="B"
                  content={right.content}
                  meta={right}
                  revealedName={revealed ? modelName(rightTrueId) : undefined}
                />
              </>
            ) : null}
          </div>

          {/* Panel głosowania i rubryka ocen */}
          {pair && !isGenerating && (
            <div className="rounded-2xl border border-arena-border bg-arena-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-arena-dim">
                  Głosowanie parami (Blind evaluation)
                </p>
                <button
                  type="button"
                  onClick={() => setRubricOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-arena-muted transition hover:text-arena-text"
                >
                  Szczegółowa rubryka ocen
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition', rubricOpen && 'rotate-180')}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {voteOptions.map((opt) => {
                  const Icon = opt.icon
                  const active = currentUiVote === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={saving}
                      onClick={() => void applyVote(opt.id)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border border-arena-border bg-arena-card px-3 py-3 text-sm font-medium text-arena-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arena-accent disabled:opacity-50',
                        opt.className,
                        active && opt.active,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {rubricOpen && (
                <div className="mt-4 grid gap-4 rounded-xl border border-arena-border bg-arena-card p-4 md:grid-cols-2">
                  <ScoreRubric
                    label="Ocena Modelu A (lewy panel)"
                    tone="a"
                    scores={pair.leftIsA ? draftA : draftB}
                    onChange={(s) => (pair.leftIsA ? setDraftA(s) : setDraftB(s))}
                  />
                  <ScoreRubric
                    label="Ocena Modelu B (prawy panel)"
                    tone="b"
                    scores={pair.leftIsA ? draftB : draftA}
                    onChange={(s) => (pair.leftIsA ? setDraftB(s) : setDraftA(s))}
                  />
                  <div className="flex items-center justify-between border-t border-arena-border pt-3 text-xs text-arena-muted md:col-span-2">
                    <span>
                      Wynik ważony A:{' '}
                      <span className="font-mono text-arena-model-a">
                        {weightedScore(pair.leftIsA ? draftA : draftB).toFixed(2)}
                      </span>
                      {' · '}B:{' '}
                      <span className="font-mono text-arena-model-b">
                        {weightedScore(pair.leftIsA ? draftB : draftA).toFixed(2)}
                      </span>
                    </span>
                    <span>Wagi: 35% · 25% · 20% · 10% · 10%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
