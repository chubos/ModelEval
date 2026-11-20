import type {
  ArenaPair,
  BenchmarkTask,
  CategoryStat,
  ExperimentConfig,
  LeaderboardEntry,
  ModelInfo,
  PromptVariant,
} from '../types/index.ts'

/**
 * Drabinka 10 modeli OpenRouter: free → premium (ceny ~prompt/completion za 1M tok.).
 * Dobór celowo z różnych przedziałów jakości/kosztu, żeby różnice były widoczne w Arenie.
 */
export const models: ModelInfo[] = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (free)', provider: 'Google', color: '#34a853' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta', color: '#0668E1' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', color: '#0d9488' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', color: '#10a37f' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', color: '#4e54c8' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', color: '#4285f4' },
  { id: 'mistralai/mistral-large-2512', name: 'Mistral Large 3', provider: 'Mistral', color: '#f5471a' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', color: '#1d4ed8' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', color: '#059669' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', color: '#d97706' },
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

/** Brak seedowanych eksperymentów — powstają dopiero przy realnym Run / teście uniwersalnym. */
export const experiments: ExperimentConfig[] = []

// Usunięto zmockowane odpowiedzi sztucznych par — od teraz każda para jest generowana przez prawdziwe API modeli!
export const arenaPairs: ArenaPair[] = []

/** Ranking i statystyki budowane wyłącznie z realnych ocen — bez seedowanych wyników. */
export const leaderboard: LeaderboardEntry[] = []

export const categoryStats: CategoryStat[] = []

export const promptVariantPerformance: Array<{
  variant: string
  avgScore: number
  winRate: number
  hallucinations: number
  avgLatency: number
}> = []

export const costOverTime: Array<{ day: string; cost: number; comparisons: number }> = []