import { RUBRIC_LABELS, RUBRIC_WEIGHTS, type RubricScores } from '../types'
import { weightedScore } from '../utils/scoring'
import { cn } from '../utils/cn'

const keys = Object.keys(RUBRIC_LABELS) as (keyof RubricScores)[]

export function ScoreRubric({
  label,
  tone,
  scores,
  onChange,
  readOnly,
}: {
  label: string
  tone: 'a' | 'b'
  scores: RubricScores
  onChange?: (next: RubricScores) => void
  readOnly?: boolean
}) {
  const total = weightedScore(scores)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            tone === 'a' ? 'text-arena-model-a' : 'text-arena-model-b',
          )}
        >
          {label}
        </span>
        <span className="font-mono text-sm font-semibold text-arena-text">
          {total.toFixed(2)}
          <span className="text-arena-dim"> / 5</span>
        </span>
      </div>

      {keys.map((key) => (
        <div key={key}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-xs text-arena-muted">
              {RUBRIC_LABELS[key]}
              <span className="ml-1.5 font-mono text-arena-dim">
                {(RUBRIC_WEIGHTS[key] * 100).toFixed(0)}%
              </span>
            </label>
            <span className="font-mono text-xs text-arena-text">{scores[key]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={scores[key]}
            disabled={readOnly}
            onChange={(e) =>
              onChange?.({ ...scores, [key]: Number(e.target.value) })
            }
            className={cn(
              'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-arena-elevated accent-current disabled:cursor-default',
              tone === 'a' ? 'accent-sky-400' : 'accent-orange-400',
            )}
          />
        </div>
      ))}
    </div>
  )
}
