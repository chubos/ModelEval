import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Scale,
  Swords,
  ThumbsDown,
  Trophy,
} from 'lucide-react'
import { arenaPairs as initialPairs, benchmarkTasks, models } from '../data/mockData'
import type { ArenaPair, RubricScores, VoteResult } from '../types'
import { Badge, Button, Card } from '../components/ui'
import { ScoreRubric } from '../components/ScoreRubric'
import { emptyRubric, formatMs, formatUsd, weightedScore } from '../utils/scoring'
import { cn } from '../utils/cn'
import { categoryLabels } from '../data/mockData'

const voteOptions: {
  id: VoteResult
  label: string
  short: string
  icon: typeof Trophy
  className: string
  active: string
}[] = [
  {
    id: 'a_wins',
    label: 'Model A lepszy',
    short: 'A wygrywa',
    icon: Trophy,
    className: 'hover:border-sky-500/50 hover:bg-sky-950/40',
    active: 'border-sky-500 bg-sky-950/60 text-arena-model-a ring-2 ring-sky-500/40',
  },
  {
    id: 'b_wins',
    label: 'Model B lepszy',
    short: 'B wygrywa',
    icon: Trophy,
    className: 'hover:border-orange-500/50 hover:bg-orange-950/40',
    active: 'border-orange-500 bg-orange-950/60 text-arena-model-b ring-2 ring-orange-500/40',
  },
  {
    id: 'tie',
    label: 'Remis',
    short: 'Remis',
    icon: Scale,
    className: 'hover:border-violet-500/50 hover:bg-violet-950/40',
    active: 'border-violet-500 bg-violet-950/60 text-arena-tie ring-2 ring-violet-500/40',
  },
  {
    id: 'both_bad',
    label: 'Obie złe',
    short: 'Obie złe',
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
          {revealedName && (
            <span className="text-xs text-arena-muted">{revealedName}</span>
          )}
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
  const [pairs, setPairs] = useState<ArenaPair[]>(initialPairs)
  const [index, setIndex] = useState(0)
  const [rubricOpen, setRubricOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [draftA, setDraftA] = useState<RubricScores>(emptyRubric())
  const [draftB, setDraftB] = useState<RubricScores>(emptyRubric())

  const pair = pairs[index]
  const task = benchmarkTasks.find((t) => t.id === pair.taskId)
  const pending = pairs.filter((p) => !p.vote).length

  const left = pair.leftIsA ? pair.modelA : pair.modelB
  const right = pair.leftIsA ? pair.modelB : pair.modelA
  const leftSide: 'A' | 'B' = 'A'
  const rightSide: 'A' | 'B' = 'B'

  const leftTrueId = pair.leftIsA ? pair.modelA.modelId : pair.modelB.modelId
  const rightTrueId = pair.leftIsA ? pair.modelB.modelId : pair.modelA.modelId

  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id

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

  const applyVote = (uiVote: VoteResult) => {
    const trueVote = mapVoteToTrue(uiVote)
    setPairs((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              vote: trueVote,
              rubricA: draftA,
              rubricB: draftB,
              judgedAt: new Date().toISOString(),
            }
          : p,
      ),
    )
  }

  const progress = useMemo(() => {
    const done = pairs.filter((p) => p.vote).length
    return Math.round((done / pairs.length) * 100)
  }, [pairs])

  // Sync drafts when navigating
  const loadPair = (nextIndex: number) => {
    const p = pairs[nextIndex]
    setIndex(nextIndex)
    setRevealed(false)
    setDraftA(p.rubricA ?? emptyRubric())
    setDraftB(p.rubricB ?? emptyRubric())
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
              Blind test · Pairwise comparison · {pending} oczekujących ocen
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
          </div>
        </div>
      </header>

      <div className="border-b border-arena-border bg-arena-card/50 px-6 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{pair.promptVariant ? `Prompt ${pair.promptVariant}` : 'Prompt'}</Badge>
          {task && <Badge>{categoryLabels[task.category]}</Badge>}
          <Badge tone="neutral">{pair.experimentId}</Badge>
          {pair.vote && <Badge tone="success">Ocenione</Badge>}
        </div>
        <p className="max-w-5xl text-sm leading-relaxed text-arena-text/90">{pair.promptText}</p>
        {task && (
          <p className="mt-2 text-xs text-arena-dim">
            Kryteria: {task.criteria}
          </p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
        <ResponsePanel
          side={leftSide}
          content={left.content}
          meta={left}
          revealedName={revealed ? modelName(leftTrueId) : undefined}
        />
        <ResponsePanel
          side={rightSide}
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
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition', rubricOpen && 'rotate-180')}
            />
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
                onClick={() => applyVote(opt.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border border-arena-border bg-arena-card px-3 py-3 text-sm font-medium text-arena-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arena-accent focus-visible:ring-offset-2 focus-visible:ring-offset-arena-bg',
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
            <div className="md:col-span-2 flex items-center justify-between border-t border-arena-border pt-3 text-xs text-arena-muted">
              <span>
                Wynik ważony A:{' '}
                <span className="font-mono text-arena-model-a">
                  {weightedScore(pair.leftIsA ? draftA : draftB).toFixed(2)}
                </span>
                {' · '}
                B:{' '}
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
