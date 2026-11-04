import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  FlaskConical,
  GitBranch,
  Play,
  Plus,
  Save,
} from 'lucide-react'
import {
  benchmarkTasks,
  experiments as initialExperiments,
  models,
  promptVariants as initialVariants,
} from '../data/mockData'
import type { ExperimentConfig, PromptVariant, PromptVariantId } from '../types'
import { Badge, Button, Card, CardHeader } from '../components/ui'
import { cn } from '../utils/cn'

const statusMeta = {
  draft: { label: 'Szkic', tone: 'neutral' as const, icon: CircleDashed },
  running: { label: 'W toku', tone: 'warning' as const, icon: Clock3 },
  completed: { label: 'Ukończony', tone: 'success' as const, icon: CheckCircle2 },
}

export function Experiments() {
  const [experiments, setExperiments] = useState(initialExperiments)
  const [variants, setVariants] = useState(initialVariants)
  const [selectedVariant, setSelectedVariant] = useState<PromptVariantId>('A')
  const [editingTemplate, setEditingTemplate] = useState(variants[0].template)

  const [form, setForm] = useState({
    name: '',
    modelIds: ['gpt-4o', 'claude-3.5'] as string[],
    promptVariant: 'B' as PromptVariantId,
    temperature: 0.2,
    maxTokens: 1024,
    trials: 3,
    taskIds: ['task-001', 'task-007'] as string[],
  })

  const activeVariant = variants.find((v) => v.id === selectedVariant)!

  const selectVariant = (id: PromptVariantId) => {
    setSelectedVariant(id)
    const v = variants.find((x) => x.id === id)!
    setEditingTemplate(v.template)
  }

  const saveVariant = () => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === selectedVariant
          ? {
              ...v,
              template: editingTemplate,
              version: v.version + 1,
              updatedAt: new Date().toISOString(),
              changelog: `v${v.version + 1}: ręczna edycja szablonu.`,
            }
          : v,
      ),
    )
  }

  const toggleModel = (id: string) => {
    setForm((f) => ({
      ...f,
      modelIds: f.modelIds.includes(id)
        ? f.modelIds.filter((m) => m !== id)
        : [...f.modelIds, id],
    }))
  }

  const toggleTask = (id: string) => {
    setForm((f) => ({
      ...f,
      taskIds: f.taskIds.includes(id)
        ? f.taskIds.filter((t) => t !== id)
        : [...f.taskIds, id],
    }))
  }

  const createExperiment = () => {
    if (!form.name.trim() || form.modelIds.length < 2 || form.taskIds.length === 0) return
    const exp: ExperimentConfig = {
      id: `exp-${String(experiments.length + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      modelIds: form.modelIds,
      promptVariant: form.promptVariant,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      trials: form.trials,
      taskIds: form.taskIds,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    setExperiments((prev) => [exp, ...prev])
    setForm((f) => ({ ...f, name: '' }))
  }

  const variantCards: PromptVariant[] = useMemo(() => variants, [variants])

  return (
    <div className="animate-fade-in space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-arena-text">Eksperymenty i prompty</h1>
            <p className="text-sm text-arena-muted">
              Konfiguracja przebiegów, parametry modeli i wersjonowanie wariantów A/B/C
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Nowy eksperyment"
            subtitle="Wybierz modele, wariant promptu i zadania benchmarku"
          />
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs text-arena-muted">Nazwa</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Ablation temperatura 0.0"
                className="w-full rounded-lg border border-arena-border bg-arena-elevated px-3 py-2 text-sm text-arena-text outline-none placeholder:text-arena-dim focus:border-arena-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-arena-muted">Modele (min. 2)</label>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => {
                  const on = form.modelIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs transition',
                        on
                          ? 'border-arena-accent/50 bg-arena-accent/15 text-arena-accent'
                          : 'border-arena-border text-arena-muted hover:border-arena-border-hover',
                      )}
                    >
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-arena-muted">Wariant</label>
                <select
                  value={form.promptVariant}
                  onChange={(e) =>
                    setForm({ ...form, promptVariant: e.target.value as PromptVariantId })
                  }
                  className="w-full rounded-lg border border-arena-border bg-arena-elevated px-2 py-2 text-sm text-arena-text outline-none focus:border-arena-accent"
                >
                  <option value="A">A — podstawowy</option>
                  <option value="B">B — kontekst</option>
                  <option value="C">C — struktura</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-arena-muted">Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                  className="w-full rounded-lg border border-arena-border bg-arena-elevated px-2 py-2 font-mono text-sm text-arena-text outline-none focus:border-arena-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-arena-muted">Próby</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.trials}
                  onChange={(e) => setForm({ ...form, trials: Number(e.target.value) })}
                  className="w-full rounded-lg border border-arena-border bg-arena-elevated px-2 py-2 font-mono text-sm text-arena-text outline-none focus:border-arena-accent"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-arena-muted">
                Max tokens: <span className="font-mono text-arena-text">{form.maxTokens}</span>
              </label>
              <input
                type="range"
                min={256}
                max={4096}
                step={128}
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-arena-muted">Zadania</label>
              <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-arena-border bg-arena-bg/50 p-2">
                {benchmarkTasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-arena-elevated"
                  >
                    <input
                      type="checkbox"
                      checked={form.taskIds.includes(t.id)}
                      onChange={() => toggleTask(t.id)}
                      className="accent-blue-500"
                    />
                    <span className="text-arena-text">{t.title}</span>
                    <span className="ml-auto text-arena-dim">{t.category}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={createExperiment}>
              <Plus className="h-4 w-4" />
              Utwórz eksperyment
            </Button>
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Lista eksperymentów"
            subtitle="Historia konfiguracji (symulacja SQLite)"
            action={
              <Badge tone="accent">{experiments.length} zapisanych</Badge>
            }
          />
          <div className="divide-y divide-arena-border">
            {experiments.map((exp) => {
              const meta = statusMeta[exp.status]
              const Icon = meta.icon
              return (
                <div key={exp.id} className="flex items-start gap-4 px-5 py-4 hover:bg-arena-elevated/40">
                  <div className="mt-0.5 text-arena-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-arena-text">{exp.name}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <Badge>Prompt {exp.promptVariant}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-arena-muted">
                      <span className="font-mono">{exp.id}</span>
                      <span>T={exp.temperature}</span>
                      <span>{exp.maxTokens} tok</span>
                      <span>{exp.trials} prób</span>
                      <span>{exp.taskIds.length} zadań</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.modelIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-md bg-arena-bg px-2 py-0.5 text-[11px] text-arena-muted"
                        >
                          {models.find((m) => m.id === id)?.name ?? id}
                        </span>
                      ))}
                    </div>
                  </div>
                  {exp.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setExperiments((prev) =>
                          prev.map((e) =>
                            e.id === exp.id ? { ...e, status: 'running' } : e,
                          ),
                        )
                      }
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Wersjonowanie promptów"
          subtitle="Minimum trzy warianty: podstawowy, z kontekstem, ustrukturyzowany"
          action={
            <div className="flex items-center gap-2 text-xs text-arena-muted">
              <GitBranch className="h-3.5 w-3.5" />
              v{activeVariant.version}
            </div>
          }
        />
        <div className="grid gap-0 lg:grid-cols-3">
          {variantCards.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v.id)}
              className={cn(
                'border-b border-arena-border p-4 text-left transition lg:border-b-0 lg:border-r lg:last:border-r-0',
                selectedVariant === v.id
                  ? 'bg-arena-accent/10'
                  : 'hover:bg-arena-elevated/50',
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={selectedVariant === v.id ? 'accent' : 'neutral'}>
                  Wariant {v.id}
                </Badge>
                <span className="font-mono text-[10px] text-arena-dim">v{v.version}</span>
              </div>
              <div className="text-sm font-medium text-arena-text">{v.name}</div>
              <p className="mt-1 text-xs text-arena-muted">{v.description}</p>
            </button>
          ))}
        </div>
        <div className="space-y-3 border-t border-arena-border p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-arena-muted">{activeVariant.changelog}</p>
            <Button size="sm" variant="secondary" onClick={saveVariant}>
              <Save className="h-3.5 w-3.5" />
              Zapisz wersję
            </Button>
          </div>
          <textarea
            value={editingTemplate}
            onChange={(e) => setEditingTemplate(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-arena-border bg-arena-bg p-4 font-mono text-xs leading-relaxed text-arena-text outline-none focus:border-arena-accent"
          />
          <p className="text-[11px] text-arena-dim">
            Placeholdery: {'{{task}}'}, {'{{criteria}}'} — podstawiane przy generowaniu przebiegu.
          </p>
        </div>
      </Card>
    </div>
  )
}
