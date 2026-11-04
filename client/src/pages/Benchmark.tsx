import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Loader2, Plus, Search, Table2, Upload } from 'lucide-react'
import { api } from '../api/client'
import { categoryLabels } from '../data/labels'
import type { BenchmarkTask, TaskCategory } from '../types'
import { Badge, Button, Card, CardHeader } from '../components/ui'
import { exportCSV, exportJSON } from '../utils/export'
import { cn } from '../utils/cn'

const categories = Object.keys(categoryLabels) as TaskCategory[]

export function Benchmark() {
  const [tasks, setTasks] = useState<BenchmarkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<BenchmarkTask>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.tasks.list()
        if (!cancelled) setTasks(list)
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

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchCat = category === 'all' || t.category === category
      const q = query.toLowerCase()
      const matchQ =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [tasks, query, category])

  const startEdit = (task: BenchmarkTask) => {
    setEditingId(task.id)
    setDraft({ ...task })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const updated = await api.tasks.update(editingId, draft)
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setEditingId(null)
  }

  const addTask = async () => {
    const task = await api.tasks.create({
      title: 'Nowe zadanie',
      content: 'Treść pytania…',
      category: 'wiedza',
      criteria: 'Kryteria poprawności…',
      expectedElements: ['element 1'],
      difficulty: 2,
    })
    setTasks((prev) => [task, ...prev])
    startEdit(task)
  }

  const importDemo = async () => {
    const task = await api.tasks.create({
      title: 'Import CSV — przykładowe zadanie',
      content:
        'Wyjaśnij różnicę między precision a recall w jednym akapicie z przykładem.',
      category: 'wiedza',
      criteria: 'Obie definicje + przykład TP/FP/FN.',
      expectedElements: ['precision', 'recall', 'przykład'],
      difficulty: 2,
    })
    setTasks((prev) => [task, ...prev])
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) map[t.category] = (map[t.category] ?? 0) + 1
    return map
  }, [tasks])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-arena-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie benchmarku…
      </div>
    )
  }

  if (error) return <div className="p-6 text-arena-danger">{error}</div>

  return (
    <div className="animate-fade-in space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Table2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-arena-text">Zarządzanie benchmarkiem</h1>
            <p className="text-sm text-arena-muted">CRUD zadań w SQLite</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void importDemo()}>
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportJSON('benchmark-tasks.json', tasks)}>
            <Download className="h-3.5 w-3.5" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                'benchmark-tasks.csv',
                tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  category: t.category,
                  difficulty: t.difficulty,
                  criteria: t.criteria,
                  expected: t.expectedElements.join('|'),
                })),
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button size="sm" onClick={() => void addTask()}>
            <Plus className="h-3.5 w-3.5" />
            Dodaj zadanie
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? 'all' : c)}
            className={cn(
              'rounded-xl border px-3 py-3 text-left transition',
              category === c
                ? 'border-arena-accent/50 bg-arena-accent/10'
                : 'border-arena-border bg-arena-card hover:border-arena-border-hover',
            )}
          >
            <div className="text-[11px] uppercase tracking-wider text-arena-dim">
              {categoryLabels[c]}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-arena-text">
              {counts[c] ?? 0}
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Zadania"
          subtitle={`${filtered.length} z ${tasks.length} zadań`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-arena-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Szukaj…"
                  className="w-48 rounded-lg border border-arena-border bg-arena-elevated py-1.5 pl-8 pr-3 text-xs text-arena-text outline-none focus:border-arena-accent"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategory('all')
                  setQuery('')
                }}
              >
                <Filter className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-arena-border text-[11px] uppercase tracking-wider text-arena-dim">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Tytuł / treść</th>
                <th className="px-3 py-3 font-medium">Kategoria</th>
                <th className="px-3 py-3 font-medium">Trudność</th>
                <th className="px-3 py-3 font-medium">Kryteria / oczekiwane</th>
                <th className="px-5 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const isEditing = editingId === task.id
                return (
                  <tr
                    key={task.id}
                    className="border-b border-arena-border/70 align-top hover:bg-arena-elevated/30"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-arena-muted">{task.id}</td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={draft.title ?? ''}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                            className="w-full rounded border border-arena-border bg-arena-bg px-2 py-1 text-sm outline-none focus:border-arena-accent"
                          />
                          <textarea
                            value={draft.content ?? ''}
                            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                            rows={3}
                            className="w-full rounded border border-arena-border bg-arena-bg px-2 py-1 text-xs outline-none focus:border-arena-accent"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-arena-text">{task.title}</div>
                          <div className="mt-1 line-clamp-2 max-w-md text-xs text-arena-muted">
                            {task.content}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            setDraft({ ...draft, category: e.target.value as TaskCategory })
                          }
                          className="rounded border border-arena-border bg-arena-bg px-2 py-1 text-xs outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {categoryLabels[c]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge>{categoryLabels[task.category]}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={draft.difficulty ?? 1}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              difficulty: Number(e.target.value) as BenchmarkTask['difficulty'],
                            })
                          }
                          className="w-14 rounded border border-arena-border bg-arena-bg px-2 py-1 font-mono text-xs outline-none"
                        />
                      ) : (
                        <span className="font-mono text-xs text-arena-warning">
                          {'★'.repeat(task.difficulty)}
                          <span className="text-arena-dim">{'★'.repeat(5 - task.difficulty)}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={draft.criteria ?? ''}
                            onChange={(e) => setDraft({ ...draft, criteria: e.target.value })}
                            rows={2}
                            className="w-full rounded border border-arena-border bg-arena-bg px-2 py-1 text-xs outline-none"
                          />
                          <input
                            value={(draft.expectedElements ?? []).join(', ')}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                expectedElements: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full rounded border border-arena-border bg-arena-bg px-2 py-1 text-xs outline-none"
                            placeholder="elementy po przecinku"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="max-w-xs text-xs text-arena-muted">{task.criteria}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {task.expectedElements.map((el) => (
                              <span
                                key={el}
                                className="rounded bg-arena-bg px-1.5 py-0.5 text-[10px] text-arena-dim"
                              >
                                {el}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => void saveEdit()}>
                            Zapisz
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Anuluj
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => startEdit(task)}>
                          Edytuj
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
