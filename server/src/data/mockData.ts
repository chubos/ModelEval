import type {
  ArenaPair,
  BenchmarkTask,
  CategoryStat,
  ExperimentConfig,
  LeaderboardEntry,
  ModelInfo,
  PromptVariant,
} from '../types/index.ts'

export const models: ModelInfo[] = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', color: '#4285f4' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', color: '#10a37f' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: '#d97706' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', color: '#0668E1' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', color: '#4e54c8' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral', color: '#f5471a' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Alibaba', color: '#615ced' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', color: '#059669' },
  // Aliasy zgodne wstecznie
  { id: 'gpt-4o', name: 'GPT-4o (alias)', provider: 'OpenAI', color: '#10a37f' },
  { id: 'claude-3.5', name: 'Claude 3.5 (alias)', provider: 'Anthropic', color: '#d97706' },
  { id: 'gemini-1.5', name: 'Gemini Flash (alias)', provider: 'Google', color: '#4285f4' },
]

export const benchmarkTasks: BenchmarkTask[] = [
  {
    id: 'task-001',
    title: 'Binary search w Pythonie',
    content:
      'Napisz funkcję binary_search(arr, target) w Pythonie, która zwraca indeks elementu lub -1. Tablica jest posortowana rosnąco. Podaj złożoność czasową.',
    category: 'programowanie',
    criteria: 'Poprawna implementacja O(log n), obsługa braków, czytelny kod.',
    expectedElements: ['pętla while lub rekurencja', 'środkowy indeks', 'zwrot -1', 'O(log n)'],
    difficulty: 2,
  },
  {
    id: 'task-002',
    title: 'Debounce w TypeScript',
    content:
      'Zaimplementuj generyczną funkcję debounce<T>(fn, delayMs) w TypeScript z poprawnymi typami. Wyjaśnij różnicę względem throttle.',
    category: 'programowanie',
    criteria: 'Generics, clearTimeout, różnica debounce vs throttle.',
    expectedElements: ['generics', 'clearTimeout', 'setTimeout', 'porównanie z throttle'],
    difficulty: 3,
  },
  {
    id: 'task-003',
    title: 'Zagadka trzech przełączników',
    content:
      'W pokoju A są 3 przełączniki. W pokoju B jest 1 żarówka. Możesz wejść do B tylko raz. Jak znaleźć, który przełącznik steruje żarówką? (klasyczna wersja z ciepłem).',
    category: 'logika',
    criteria: 'Rozwiązanie wykorzystujące ciepło żarówki; pełna identyfikacja wszystkich 3.',
    expectedElements: ['włączenie na dłużej', 'ciepło', 'mapowanie 3 stanów'],
    difficulty: 3,
  },
  {
    id: 'task-004',
    title: 'Sylogizm i kontrprzykład',
    content:
      'Wszystkie A są B. Niektóre B są C. Czy wynika, że niektóre A są C? Uzasadnij lub podaj kontrprzykład.',
    category: 'logika',
    criteria: 'Poprawna odpowiedź: nie wynika; poprawny kontrprzykład.',
    expectedElements: ['odpowiedź negatywna', 'kontrprzykład', 'diagram Venna lub opis zbiorów'],
    difficulty: 2,
  },
  {
    id: 'task-005',
    title: 'Streszczenie paperu Transformer',
    content:
      'Streść w 5 zdaniach ideę architektury Transformer (Attention Is All You Need) dla inżyniera bez doświadczenia NLP. Unikaj żargonu lub wyjaśnij go.',
    category: 'streszczanie',
    criteria: 'self-attention, paralelizm, brak rekurencji RNN, enkodery/dekodery — jasny język.',
    expectedElements: ['self-attention', 'równoległość', 'pozycje', '5 zdań'],
    difficulty: 3,
  },
  {
    id: 'task-006',
    title: 'TL;DR raportu kwartalnego',
    content:
      'Na podstawie poniższych punktów napisz streszczenie dla zarządu (max 120 słów): przychód +12% QoQ, churn 3.2%→2.8%, NPS 41→48, opóźnienie launchu produktu X o 3 tyg., koszt infra +18%.',
    category: 'streszczanie',
    criteria: 'Limit słów, zrównoważenie pozytywów i ryzyk, język biznesowy.',
    expectedElements: ['limit ~120 słów', 'metryki', 'ryzyko X', 'rekomendacja opcjonalna'],
    difficulty: 2,
  },
  {
    id: 'task-007',
    title: 'Format JSON zgodny ze schematem',
    content:
      'Zwróć WYŁĄCZNIE poprawny JSON (bez markdown) zgodny ze schematem: { "userId": number, "roles": string[], "active": boolean, "meta": { "source": string } }. Wymyśl przykładowe dane.',
    category: 'instrukcje',
    criteria: 'Czysty JSON, zgodność typów, brak dodatkowego tekstu.',
    expectedElements: ['brak fence markdown', 'wszystkie pola', 'poprawne typy'],
    difficulty: 1,
  },
  {
    id: 'task-008',
    title: 'Wielokrokowa procedura deploy',
    content:
      'Opisz procedurę canary deploy dla serwisu Node.js na Kubernetes w dokładnie 6 ponumerowanych krokach. Każdy krok max 2 zdania. Na końcu dodaj sekcję „Rollback” w 2 punktach.',
    category: 'instrukcje',
    criteria: 'Dokładnie 6 kroków, sekcja Rollback, zwięzłość.',
    expectedElements: ['6 kroków', 'canary / traffic split', 'Rollback 2 punkty'],
    difficulty: 3,
  },
  {
    id: 'task-009',
    title: 'Stolica Australii',
    content: 'Jaka jest stolica Australii? Podaj też rok, w którym formalnie stała się stolicą federalną, oraz jedno zdanie kontekstu historycznego.',
    category: 'wiedza',
    criteria: 'Canberra; kontekst (nie Sydney); data/rok.',
    expectedElements: ['Canberra', 'rok', 'kontekst historyczny'],
    difficulty: 1,
  },
  {
    id: 'task-010',
    title: 'Prawo Ohma i jednostki',
    content:
      'Wyjaśnij prawo Ohma w jednym akapicie. Podaj wzór, jednostki SI oraz przykład liczbowy dla R=10Ω i I=0.5A.',
    category: 'wiedza',
    criteria: 'V=IR, jednostki, poprawne obliczenie V=5V.',
    expectedElements: ['wzór', 'jednostki', 'V=5V'],
    difficulty: 1,
  },
  {
    id: 'task-011',
    title: 'Race condition w concurrent map',
    content:
      'Wyjaśnij, czym jest race condition przy współbieżnym zapisie do mapy w Go. Pokaż problematyczny snippet i poprawkę z sync.Mutex lub sync.Map.',
    category: 'programowanie',
    criteria: 'Poprawna diagnoza, działający przykład poprawki.',
    expectedElements: ['opis race', 'snippet błędny', 'mutex lub sync.Map'],
    difficulty: 4,
  },
  {
    id: 'task-012',
    title: 'Zadanie wież Hanoi — minimalna liczba ruchów',
    content:
      'Dla n=4 dysków, ile minimalnych ruchów potrzeba w klasycznym problemie Wież Hanoi? Wyprowadź wzór ogólny i oblicz wartość.',
    category: 'logika',
    criteria: '2^n - 1 = 15; poprawne wyprowadzenie.',
    expectedElements: ['wzór 2^n-1', 'wynik 15', 'rekurencyjne uzasadnienie'],
    difficulty: 2,
  },
]

export const promptVariants: PromptVariant[] = [
  {
    id: 'A',
    name: 'Wariant A — podstawowy',
    description: 'Samo zadanie, bez dodatkowego kontekstu.',
    template: `{{task}}

Odpowiedz zwięźle i precyzyjnie.`,
    version: 3,
    updatedAt: '2026-10-28T14:20:00Z',
    changelog: 'v3: skrócono instrukcję końcową; usunięto zbędne „Bądź pomocny”.',
  },
  {
    id: 'B',
    name: 'Wariant B — kontekst i ograniczenia',
    description: 'Dodaje rolę, ograniczenia długości i zakazy.',
    template: `Jesteś ekspertem ocenianym w benchmarku jakości odpowiedzi.

Ograniczenia:
- Nie wymyślaj faktów; jeśli nie wiesz, napisz „niepewne”.
- Unikaj zbędnego wstępu i podsumowań marketingowych.
- Max 350 słów, chyba że zadanie wymaga kodu.

Zadanie:
{{task}}`,
    version: 5,
    updatedAt: '2026-11-01T09:10:00Z',
    changelog: 'v5: dodano limit słów i zasadę niepewności.',
  },
  {
    id: 'C',
    name: 'Wariant C — ustrukturyzowany',
    description: 'Definiuje etapy pracy i format odpowiedzi.',
    template: `Wykonaj zadanie według etapów:

1. Zrozumienie — 1–2 zdania: co jest wymagane.
2. Rozwiązanie — właściwa treść / kod.
3. Weryfikacja — checklist zgodności z kryteriami.
4. Format — użyj nagłówków: ## Zrozumienie, ## Rozwiązanie, ## Weryfikacja.

Zadanie:
{{task}}

Kryteria poprawności:
{{criteria}}`,
    version: 4,
    updatedAt: '2026-11-02T16:45:00Z',
    changelog: 'v4: wymuszono nagłówki markdown i checklistę.',
  },
]

export const experiments: ExperimentConfig[] = [
  {
    id: 'exp-001',
    name: 'Pojedynek modeli Gemini vs GPT',
    modelIds: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini'],
    promptVariant: 'A',
    temperature: 0.2,
    maxTokens: 1024,
    trials: 3,
    taskIds: ['task-001', 'task-003', 'task-007', 'task-009'],
    status: 'draft',
    createdAt: '2026-11-18T10:00:00Z',
  },
  {
    id: 'exp-002',
    name: 'Prompt ablation B vs C',
    modelIds: ['google/gemini-2.5-flash', 'anthropic/claude-3.5-sonnet'],
    promptVariant: 'C',
    temperature: 0.0,
    maxTokens: 1500,
    trials: 2,
    taskIds: ['task-002', 'task-005', 'task-008', 'task-011'],
    status: 'draft',
    createdAt: '2026-11-18T11:30:00Z',
  },
]

// Usunięto zmockowane odpowiedzi sztucznych par — od teraz każda para jest generowana przez prawdziwe API modeli!
export const arenaPairs: ArenaPair[] = []

export const leaderboard: LeaderboardEntry[] = [
  {
    modelId: 'google/gemini-2.5-flash',
    wins: 0,
    losses: 0,
    ties: 0,
    bothBad: 0,
    elo: 1200,
    avgScore: 0,
    avgLatencyMs: 0,
    totalCostUsd: 0,
    hallucinationRate: 0,
    errorRate: 0,
    categoryScores: {
      programowanie: 0,
      logika: 0,
      streszczanie: 0,
      instrukcje: 0,
      wiedza: 0,
    },
  },
  {
    modelId: 'openai/gpt-4o-mini',
    wins: 0,
    losses: 0,
    ties: 0,
    bothBad: 0,
    elo: 1200,
    avgScore: 0,
    avgLatencyMs: 0,
    totalCostUsd: 0,
    hallucinationRate: 0,
    errorRate: 0,
    categoryScores: {
      programowanie: 0,
      logika: 0,
      streszczanie: 0,
      instrukcje: 0,
      wiedza: 0,
    },
  },
  {
    modelId: 'anthropic/claude-3.5-sonnet',
    wins: 0,
    losses: 0,
    ties: 0,
    bothBad: 0,
    elo: 1250,
    avgScore: 0,
    avgLatencyMs: 0,
    totalCostUsd: 0,
    hallucinationRate: 0,
    errorRate: 0,
    categoryScores: {
      programowanie: 0,
      logika: 0,
      streszczanie: 0,
      instrukcje: 0,
      wiedza: 0,
    },
  },
  {
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    wins: 0,
    losses: 0,
    ties: 0,
    bothBad: 0,
    elo: 1180,
    avgScore: 0,
    avgLatencyMs: 0,
    totalCostUsd: 0,
    hallucinationRate: 0,
    errorRate: 0,
    categoryScores: {
      programowanie: 0,
      logika: 0,
      streszczanie: 0,
      instrukcje: 0,
      wiedza: 0,
    },
  },
  {
    modelId: 'deepseek/deepseek-chat',
    wins: 0,
    losses: 0,
    ties: 0,
    bothBad: 0,
    elo: 1210,
    avgScore: 0,
    avgLatencyMs: 0,
    totalCostUsd: 0,
    hallucinationRate: 0,
    errorRate: 0,
    categoryScores: {
      programowanie: 0,
      logika: 0,
      streszczanie: 0,
      instrukcje: 0,
      wiedza: 0,
    },
  },
]

export const categoryStats: CategoryStat[] = [
  { category: 'programowanie', avgScore: 0, comparisons: 0, hallucinations: 0 },
  { category: 'logika', avgScore: 0, comparisons: 0, hallucinations: 0 },
  { category: 'streszczanie', avgScore: 0, comparisons: 0, hallucinations: 0 },
  { category: 'instrukcje', avgScore: 0, comparisons: 0, hallucinations: 0 },
  { category: 'wiedza', avgScore: 0, comparisons: 0, hallucinations: 0 },
]

export const promptVariantPerformance = [
  { variant: 'A', avgScore: 0, winRate: 0, hallucinations: 0, avgLatency: 0 },
  { variant: 'B', avgScore: 0, winRate: 0, hallucinations: 0, avgLatency: 0 },
  { variant: 'C', avgScore: 0, winRate: 0, hallucinations: 0, avgLatency: 0 },
]

export const costOverTime: Array<{ day: string; cost: number; comparisons: number }> = []
