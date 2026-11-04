import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, LayoutDashboard, Medal } from 'lucide-react'
import {
  categoryLabels,
  categoryStats,
  costOverTime,
  leaderboard,
  models,
  promptVariantPerformance,
} from '../data/mockData'
import { Badge, Button, Card, CardHeader, Stat } from '../components/ui'
import { exportCSV, exportJSON } from '../utils/export'
import { formatMs, formatUsd, winRate } from '../utils/scoring'

const tooltipStyle = {
  backgroundColor: '#161e2e',
  border: '1px solid #2a3548',
  borderRadius: 8,
  fontSize: 12,
}

function modelName(id: string) {
  return models.find((m) => m.id === id)?.name ?? id
}

function modelColor(id: string) {
  return models.find((m) => m.id === id)?.color ?? '#3b82f6'
}

function shortName(id: string) {
  return modelName(id)
    .replace(' 3.5 Sonnet', '')
    .replace(' 1.5 Pro', '')
    .replace(' 70B', '')
    .replace(' 72B', '')
}

export function Dashboard() {
  const top = leaderboard[0]
  const totalComparisons = leaderboard.reduce(
    (s, e) => s + e.wins + e.losses + e.ties + e.bothBad,
    0,
  )
  const avgHalluc =
    leaderboard.reduce((s, e) => s + e.hallucinationRate, 0) / leaderboard.length
  const totalCost = leaderboard.reduce((s, e) => s + e.totalCostUsd, 0)

  const eloBars = leaderboard.map((e) => ({
    name: shortName(e.modelId),
    elo: e.elo,
  }))

  const categoryBars = categoryStats.map((c) => ({
    category: categoryLabels[c.category],
    score: Number(c.avgScore.toFixed(2)),
    comparisons: c.comparisons,
    hallucinations: c.hallucinations,
  }))

  const radarData = (
    ['programowanie', 'logika', 'streszczanie', 'instrukcje', 'wiedza'] as const
  ).map((cat) => {
    const row: Record<string, string | number> = {
      category: categoryLabels[cat],
    }
    for (const entry of leaderboard.slice(0, 3)) {
      row[shortName(entry.modelId)] = entry.categoryScores[cat]
    }
    return row
  })

  const top3 = leaderboard.slice(0, 3)
  const qualityBars = leaderboard.map((e) => ({
    name: shortName(e.modelId).split(' ')[0],
    hallucinations: Number((e.hallucinationRate * 100).toFixed(1)),
    errors: Number((e.errorRate * 100).toFixed(1)),
  }))

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    leaderboard,
    categoryStats,
    promptVariantPerformance,
    costOverTime,
  }

  return (
    <div className="animate-fade-in space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-arena-text">Dashboard i ranking</h1>
            <p className="text-sm text-arena-muted">
              Wyniki zbiorcze, Elo, kategorie, koszty i jakość odpowiedzi
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportJSON('modeleval-export.json', exportPayload)}
          >
            <Download className="h-3.5 w-3.5" />
            Eksportuj JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                'modeleval-leaderboard.csv',
                leaderboard.map((e) => ({
                  model: modelName(e.modelId),
                  elo: e.elo,
                  wins: e.wins,
                  losses: e.losses,
                  ties: e.ties,
                  avgScore: e.avgScore,
                  avgLatencyMs: e.avgLatencyMs,
                  totalCostUsd: e.totalCostUsd,
                  hallucinationRate: e.hallucinationRate,
                  errorRate: e.errorRate,
                })),
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            Eksportuj CSV
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Porównania" value={totalComparisons} hint="suma głosów pairwise" />
        <Stat
          label="Lider Elo"
          value={shortName(top.modelId)}
          hint={`Elo ${top.elo}`}
        />
        <Stat label="Koszt łącznie" value={formatUsd(totalCost)} hint="wszystkie modele" />
        <Stat
          label="Śr. halucynacje"
          value={`${(avgHalluc * 100).toFixed(1)}%`}
          hint="średnia między modelami"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Leaderboard"
          subtitle="Ranking Elo · win rate · jakość ważona"
          action={<Medal className="h-4 w-4 text-amber-400" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-arena-border text-[11px] uppercase tracking-wider text-arena-dim">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Model</th>
                <th className="px-3 py-3 font-medium">Elo</th>
                <th className="px-3 py-3 font-medium">W-L-T</th>
                <th className="px-3 py-3 font-medium">Win%</th>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium">Latency</th>
                <th className="px-3 py-3 font-medium">Koszt</th>
                <th className="px-5 py-3 font-medium">Halluc.</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr
                  key={e.modelId}
                  className="border-b border-arena-border/60 hover:bg-arena-elevated/40"
                >
                  <td className="px-5 py-3 font-mono text-xs text-arena-dim">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: modelColor(e.modelId) }}
                      />
                      <div>
                        <div className="font-medium text-arena-text">{modelName(e.modelId)}</div>
                        <div className="text-[11px] text-arena-dim">
                          {models.find((m) => m.id === e.modelId)?.provider}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-arena-text">{e.elo}</td>
                  <td className="px-3 py-3 font-mono text-xs text-arena-muted">
                    {e.wins}-{e.losses}-{e.ties}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {(winRate(e.wins, e.losses, e.ties) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{e.avgScore.toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-arena-muted">
                    {formatMs(e.avgLatencyMs)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{formatUsd(e.totalCostUsd)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={e.hallucinationRate > 0.12 ? 'danger' : 'neutral'}>
                      {(e.hallucinationRate * 100).toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Elo ranking" subtitle="Bar chart — siła modeli" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eloBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#5c6b82" fontSize={11} tickLine={false} />
                <YAxis stroke="#5c6b82" fontSize={11} domain={[1000, 1350]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="elo" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Radar — top 3 × kategorie"
            subtitle="Średni wynik rubryki 1–5"
          />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a3548" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#8b9bb4', fontSize: 11 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  tick={{ fill: '#5c6b82', fontSize: 10 }}
                />
                {top3.map((entry, i) => (
                  <Radar
                    key={entry.modelId}
                    name={shortName(entry.modelId)}
                    dataKey={shortName(entry.modelId)}
                    stroke={modelColor(entry.modelId)}
                    fill={modelColor(entry.modelId)}
                    fillOpacity={0.12 - i * 0.02}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Wyniki per kategoria" subtitle="Score i halucynacje" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBars}>
                <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" stroke="#5c6b82" fontSize={10} tickLine={false} />
                <YAxis stroke="#5c6b82" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="score" name="Avg score" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="hallucinations"
                  name="Halucynacje"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Warianty promptów A/B/C" subtitle="Ablation study" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={promptVariantPerformance.map((p) => ({
                  ...p,
                  winRatePct: Number((p.winRate * 100).toFixed(0)),
                }))}
              >
                <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="variant" stroke="#5c6b82" fontSize={12} />
                <YAxis stroke="#5c6b82" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="avgScore" name="Avg score" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="winRatePct" name="Win rate %" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Koszt w czasie" subtitle="USD i liczba porównań" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costOverTime}>
                <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#5c6b82" fontSize={11} />
                <YAxis stroke="#5c6b82" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Koszt USD"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="comparisons"
                  name="Porównania"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Błędy i halucynacje"
            subtitle="Metryki jakości operacyjnej (%)"
          />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityBars}>
                <CartesianGrid stroke="#2a3548" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#5c6b82" fontSize={11} />
                <YAxis stroke="#5c6b82" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="hallucinations"
                  name="Halluc. %"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="errors" name="Error %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
