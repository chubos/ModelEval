import { RUBRIC_WEIGHTS, type RubricScores } from '../types'

export function weightedScore(scores: RubricScores): number {
  return (
    scores.correctness * RUBRIC_WEIGHTS.correctness +
    scores.instructionFollow * RUBRIC_WEIGHTS.instructionFollow +
    scores.completeness * RUBRIC_WEIGHTS.completeness +
    scores.clarity * RUBRIC_WEIGHTS.clarity +
    scores.verifiability * RUBRIC_WEIGHTS.verifiability
  )
}

export function emptyRubric(): RubricScores {
  return {
    correctness: 3,
    instructionFollow: 3,
    completeness: 3,
    clarity: 3,
    verifiability: 3,
  }
}

export function winRate(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties
  if (total === 0) return 0
  return (wins + ties * 0.5) / total
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`
}

export function formatMs(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`
}
