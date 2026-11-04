import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Scale,
  Swords,
  ThumbsDown,
  Trophy,
} from 'lucide-react'
import { api } from '../api/client'
import { categoryLabels } from '../data/labels'
import type { ArenaPair, BenchmarkTask, ModelInfo, RubricScores, VoteResult } from '../types'
import { Badge, Button, Card } from '../components/ui'
import { ScoreRubric } from '../components/ScoreRubric'
import { emptyRubric, formatMs, formatUsd, weightedScore } from '../utils/scoring'
import { cn } from '../utils/cn'

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

function ResponsePanel({
  side,
  content,
  meta,
  revealedName,
}: {
  side: 'A' | 'B'
  content: string
  meta: { latencyMs: number; tokensOut: number; costUsd: number; hallucinated?: boolean }
  revealedName?: string
}) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-arena-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={side === 'A' ? 'a' : 'b'}>Model {side}</Badge>
          {revealedName && <span className="text-xs text-arena-muted">{revealedName}</span>}
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-arena-dim">
          <span>{formatMs(meta.latencyMs)}</span>
          <span>{meta.tokensOut} tok</span>
          <span>{formatUsd(meta.costUsd)}</span>
          {meta.hallucinated && <Badge tone="danger">halucynacja?</Badge>}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-arena-text/95">
          {content}
        </pre>
      </div>
    </Card>
  )
}

export function Arena() {
  const [pairs, setPairs] = useState<ArenaPair[]>([])
  const [tasks, setTasks] = useState<BenchmarkTask[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [index, setIndex] = useState(0)
  const [rubricOpen, setRubricOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [draftA, setDraftA] = useState<RubricScores>(emptyRubric())
  const [draftB, setDraftB] = useState<RubricScores>(emptyRubric())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [p, t, m] = await Promise.all([
          api.arena.list(),
          api.tasks.list(),
          api.models(),
        ])
        if (cancelled) return
        setPairs(p)
        setTasks(t)
        setModels(m)
        if (p[0]) {
          setDraftA(p[0].rubricA ?? emptyRubric())
          setDraftB(p[0].rubricB ?? emptyRubric())
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Błąd API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-arena-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie Areny z SQLite…
      </div>
    )
  }

  if (error || !pair) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-arena-danger">{error ?? 'Brak par do oceny'}</p>
        <p className="text-sm text-arena-muted">Upewnij się, że API działa na porcie 3001.</p>
      </div>
    )
  }

  const left = pair.leftIsA ? pair.modelA : pair.modelB
  const right = pair.leftIsA ? pair.modelB : pair.modelA
  const leftTrueId = pair.leftIsA ? pair.modelA.modelId : pair.modelB.modelId
  const rightTrueId = pair.leftIsA ? pair.modelB.modelId : pair.modelA.modelId

  const mapVoteToTrue = (uiVote: VoteResult): VoteResult => {
    if (!pair.leftIsA) {
      if (uiVote === 'a_wins') return 'b_wins'
      if (uiVote === 'b_wins') return 'a_wins'
    }
    return uiVote
  }

  const uiVoteFromStored = (stored: VoteResult | null): VoteResult | null => {
    if (!stored) return null
    if (!pair.leftIsA) {
      if (stored === 'a_wins') return 'b_wins'
      if (stored === 'b_wins') return 'a_wins'
    }
    return stored
  }

  const currentUiVote = uiVoteFromStored(pair.vote)

  const applyVote = async (uiVote: VoteResult) => {
    const trueVote = mapVoteToTrue(uiVote)
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

  return (
    <div className="flex h-screen flex-col animate-fade-in">
      <header className="flex items-center justify-between gap-4 border-b border-arena-border bg-arena-surface/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-arena-accent/15 text-arena-accent">
            <Swords className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-arena-text">Arena porównawcza</h1>
            <p className="text-xs text-arena-muted">
              Blind test · SQLite · {pending} oczekujących ocen
              {saving ? ' · zapis…' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-arena-elevated">
              <div
                className="h-full rounded-full bg-arena-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-arena-muted">{progress}%</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRevealed((v) => !v)}>
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
          </div>
        </div>
      </header>

      <div className="border-b border-arena-border bg-arena-card/50 px-6 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="accent">Prompt {pair.promptVariant}</Badge>
          {task && <Badge>{categoryLabels[task.category]}</Badge>}
          <Badge tone="neutral">{pair.experimentId}</Badge>
          {pair.vote && <Badge tone="success">Ocenione</Badge>}
        </div>
        <p className="max-w-5xl text-sm leading-relaxed text-arena-text/90">{pair.promptText}</p>
        {task && <p className="mt-2 text-xs text-arena-dim">Kryteria: {task.criteria}</p>}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
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
      </div>

      <div className="border-t border-arena-border bg-arena-surface px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-arena-dim">
            Głosowanie parami
          </p>
          <button
            type="button"
            onClick={() => setRubricOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-arena-muted transition hover:text-arena-text"
          >
            Rubryka ocen
            <ChevronDown className={cn('h-3.5 w-3.5 transition', rubricOpen && 'rotate-180')} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                  'flex items-center justify-center gap-2 rounded-xl border border-arena-border bg-arena-card px-3 py-3 text-sm font-medium text-arena-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arena-accent focus-visible:ring-offset-2 focus-visible:ring-offset-arena-bg disabled:opacity-50',
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
    </div>
  )
}
