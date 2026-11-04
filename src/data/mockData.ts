import type {
  ArenaPair,
  BenchmarkTask,
  CategoryStat,
  ExperimentConfig,
  LeaderboardEntry,
  ModelInfo,
  PromptVariant,
  RubricScores,
} from '../types'

export const models: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', color: '#10a37f' },
  { id: 'claude-3.5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: '#d97706' },
  { id: 'gemini-1.5', name: 'Gemini 1.5 Pro', provider: 'Google', color: '#4285f4' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta', color: '#0668E1' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', color: '#f5471a' },
  { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', provider: 'Alibaba', color: '#615ced' },
]

export const categoryLabels: Record<string, string> = {
  programowanie: 'Programowanie',
  logika: 'Logika',
  streszczanie: 'Streszczanie',
  instrukcje: 'Wykonywanie instrukcji',
  wiedza: 'Wiedza ogólna',
}

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
    name: 'Baseline v1 — GPT vs Claude',
    modelIds: ['gpt-4o', 'claude-3.5'],
    promptVariant: 'A',
    temperature: 0.2,
    maxTokens: 1024,
    trials: 3,
    taskIds: ['task-001', 'task-003', 'task-007', 'task-009'],
    status: 'completed',
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'exp-002',
    name: 'Prompt ablation B vs C',
    modelIds: ['gpt-4o', 'claude-3.5', 'gemini-1.5'],
    promptVariant: 'C',
    temperature: 0.0,
    maxTokens: 1500,
    trials: 2,
    taskIds: ['task-002', 'task-005', 'task-008', 'task-011'],
    status: 'completed',
    createdAt: '2026-10-27T11:30:00Z',
  },
  {
    id: 'exp-003',
    name: 'Open models stress test',
    modelIds: ['llama-3.1-70b', 'mistral-large', 'qwen-2.5-72b'],
    promptVariant: 'B',
    temperature: 0.3,
    maxTokens: 2048,
    trials: 5,
    taskIds: ['task-001', 'task-004', 'task-006', 'task-010', 'task-012'],
    status: 'running',
    createdAt: '2026-11-03T08:00:00Z',
  },
  {
    id: 'exp-004',
    name: 'Instrukcje — JSON & procedura',
    modelIds: ['gpt-4o', 'gemini-1.5', 'qwen-2.5-72b'],
    promptVariant: 'B',
    temperature: 0.0,
    maxTokens: 800,
    trials: 4,
    taskIds: ['task-007', 'task-008'],
    status: 'draft',
    createdAt: '2026-11-04T07:15:00Z',
  },
]

const score = (
  correctness: number,
  instructionFollow: number,
  completeness: number,
  clarity: number,
  verifiability: number,
): RubricScores => ({
  correctness,
  instructionFollow,
  completeness,
  clarity,
  verifiability,
})

export const arenaPairs: ArenaPair[] = [
  {
    id: 'pair-001',
    taskId: 'task-001',
    experimentId: 'exp-001',
    promptVariant: 'A',
    promptText:
      'Napisz funkcję binary_search(arr, target) w Pythonie, która zwraca indeks elementu lub -1. Tablica jest posortowana rosnąco. Podaj złożoność czasową.\n\nOdpowiedz zwięźle i precyzyjnie.',
    leftIsA: true,
    modelA: {
      modelId: 'gpt-4o',
      content: `\`\`\`python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
\`\`\`
Złożoność czasowa: **O(log n)**, pamięciowa: O(1).`,
      latencyMs: 842,
      tokensIn: 68,
      tokensOut: 142,
      costUsd: 0.0021,
    },
    modelB: {
      modelId: 'claude-3.5',
      content: `Oto implementacja wyszukiwania binarnego:

\`\`\`python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2  # unika overflow
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
\`\`\`

**Złożoność:** czas O(log n), pamięć O(1). Uwaga: wymaga posortowanej tablicy rosnąco.`,
      latencyMs: 1104,
      tokensIn: 68,
      tokensOut: 168,
      costUsd: 0.0034,
    },
    vote: null,
    rubricA: null,
    rubricB: null,
    judgedAt: null,
  },
  {
    id: 'pair-002',
    taskId: 'task-003',
    experimentId: 'exp-001',
    promptVariant: 'A',
    promptText:
      'W pokoju A są 3 przełączniki. W pokoju B jest 1 żarówka. Możesz wejść do B tylko raz. Jak znaleźć, który przełącznik steruje żarówką? (klasyczna wersja z ciepłem).\n\nOdpowiedz zwięźle i precyzyjnie.',
    leftIsA: false,
    modelA: {
      modelId: 'claude-3.5',
      content: `1. Włącz przełącznik 1 na ~5 minut, potem wyłącz.
2. Włącz przełącznik 2 i zostaw włączony.
3. Przełącznik 3 pozostaw wyłączony.
4. Wejdź do pokoju B:
   - żarówka **świeci** → przełącznik 2
   - żarówka **ciemna, ale ciepła** → przełącznik 1
   - żarówka **ciemna i zimna** → przełącznik 3

Wykorzystujemy trzy stany: światło, ciepło, zimno.`,
      latencyMs: 980,
      tokensIn: 92,
      tokensOut: 156,
      costUsd: 0.0031,
    },
    modelB: {
      modelId: 'gpt-4o',
      content: `Włącz pierwszy przełącznik i wejdź do drugiego pokoju. Jeśli żarówka świeci — to ten. Jeśli nie, wróć i spróbuj kolejnego.

(Uwaga: ta strategia wymaga wielu wejść i łamie warunek „tylko raz”.)`,
      latencyMs: 720,
      tokensIn: 92,
      tokensOut: 78,
      costUsd: 0.0014,
      hallucinated: false,
    },
    vote: 'a_wins',
    rubricA: score(5, 5, 5, 5, 5),
    rubricB: score(1, 1, 2, 3, 1),
    judgedAt: '2026-10-21T12:10:00Z',
  },
  {
    id: 'pair-003',
    taskId: 'task-007',
    experimentId: 'exp-001',
    promptVariant: 'B',
    promptText:
      'Zwróć WYŁĄCZNIE poprawny JSON (bez markdown) zgodny ze schematem: { "userId": number, "roles": string[], "active": boolean, "meta": { "source": string } }. Wymyśl przykładowe dane.',
    leftIsA: true,
    modelA: {
      modelId: 'gpt-4o',
      content: `{"userId":42,"roles":["admin","editor"],"active":true,"meta":{"source":"benchmark"}}`,
      latencyMs: 410,
      tokensIn: 80,
      tokensOut: 32,
      costUsd: 0.0008,
    },
    modelB: {
      modelId: 'gemini-1.5',
      content: `\`\`\`json
{
  "userId": 42,
  "roles": ["admin", "editor"],
  "active": true,
  "meta": { "source": "benchmark" }
}
\`\`\``,
      latencyMs: 560,
      tokensIn: 80,
      tokensOut: 58,
      costUsd: 0.0006,
    },
    vote: 'a_wins',
    rubricA: score(5, 5, 5, 4, 4),
    rubricB: score(4, 2, 5, 4, 3),
    judgedAt: '2026-10-21T13:02:00Z',
  },
  {
    id: 'pair-004',
    taskId: 'task-005',
    experimentId: 'exp-002',
    promptVariant: 'C',
    promptText:
      'Streść w 5 zdaniach ideę architektury Transformer… (wariant C — struktura etapów)',
    leftIsA: true,
    modelA: {
      modelId: 'claude-3.5',
      content: `## Zrozumienie
Potrzebne jest 5-zdaniowe streszczenie Transformera dla inżyniera bez NLP.

## Rozwiązanie
1. Transformer to architektura sieci neuronowej oparta na mechanizmie uwagi zamiast rekurencji.
2. Self-attention pozwala każdemu tokenowi „patrzeć” na inne w sekwencji i ważyć ich znaczenie.
3. Dzięki temu model przetwarza sekwencję równolegle, szybciej niż klasyczne RNN/LSTM.
4. Informacja o kolejności słów jest dodawana przez positional encoding.
5. Składa się zwykle z stosu enkoderów i dekoderów — fundament współczesnych LLM.

## Weryfikacja
- [x] 5 zdań w rozwiązaniu
- [x] self-attention i paralelizm
- [x] język zrozumiały`,
      latencyMs: 1450,
      tokensIn: 210,
      tokensOut: 220,
      costUsd: 0.0048,
    },
    modelB: {
      modelId: 'gpt-4o',
      content: `Transformer wykorzystuje attention. Jest szybki. Używa się go w GPT i BERT. Działa dobrze na długich tekstach. To przełom z 2017 roku od Google.`,
      latencyMs: 690,
      tokensIn: 210,
      tokensOut: 55,
      costUsd: 0.0019,
    },
    vote: 'a_wins',
    rubricA: score(5, 5, 5, 5, 5),
    rubricB: score(3, 2, 2, 2, 2),
    judgedAt: '2026-10-28T15:40:00Z',
  },
  {
    id: 'pair-005',
    taskId: 'task-009',
    experimentId: 'exp-001',
    promptVariant: 'A',
    promptText: 'Jaka jest stolica Australii? …',
    leftIsA: false,
    modelA: {
      modelId: 'llama-3.1-70b',
      content: `Stolicą Australii jest **Sydney**. Miasto zostało wybrane ze względu na port i znaczenie gospodarcze; formalnie stało się stolicą federalną w 1901 roku.`,
      latencyMs: 1320,
      tokensIn: 55,
      tokensOut: 48,
      costUsd: 0.0004,
      hallucinated: true,
    },
    modelB: {
      modelId: 'qwen-2.5-72b',
      content: `Stolicą Australii jest **Canberra**. Formalnie stała się stolicą federalną w 1913 r. (plan miasta; parlament przeniósł się później). Wybrano ją jako kompromis między Sydney a Melbourne.`,
      latencyMs: 1180,
      tokensIn: 55,
      tokensOut: 62,
      costUsd: 0.00035,
    },
    vote: 'b_wins',
    rubricA: score(1, 2, 3, 3, 1),
    rubricB: score(5, 5, 4, 4, 4),
    judgedAt: '2026-10-22T09:20:00Z',
  },
  {
    id: 'pair-006',
    taskId: 'task-012',
    experimentId: 'exp-003',
    promptVariant: 'B',
    promptText: 'Dla n=4 dysków, ile minimalnych ruchów…',
    leftIsA: true,
    modelA: {
      modelId: 'mistral-large',
      content: `Wzór: T(n) = 2·T(n-1) + 1, T(1)=1 ⇒ T(n)=2^n − 1.
Dla n=4: 2^4 − 1 = **15** ruchów.`,
      latencyMs: 900,
      tokensIn: 70,
      tokensOut: 55,
      costUsd: 0.0011,
    },
    modelB: {
      modelId: 'llama-3.1-70b',
      content: `Dla 4 dysków potrzeba 16 ruchów (2^n). Wyprowadzenie: każdy dysk przenosimy dwa razy plus bazowy ruch.`,
      latencyMs: 1050,
      tokensIn: 70,
      tokensOut: 42,
      costUsd: 0.0003,
      hallucinated: true,
    },
    vote: 'tie',
    rubricA: score(5, 5, 5, 5, 5),
    rubricB: score(2, 3, 2, 3, 2),
    judgedAt: '2026-11-03T10:05:00Z',
  },
  {
    id: 'pair-007',
    taskId: 'task-008',
    experimentId: 'exp-002',
    promptVariant: 'C',
    promptText: 'Opisz procedurę canary deploy… dokładnie 6 kroków…',
    leftIsA: true,
    modelA: {
      modelId: 'gemini-1.5',
      content: `## Zrozumienie
Canary na K8s dla Node.js w 6 krokach + rollback.

## Rozwiązanie
1. Zbuduj obraz i wypchnij do registry z tagiem wersji.
2. Wdróż Deployment canary z małą liczbą replik obok stable.
3. Skonfiguruj Service/Ingress na podział ruchu (np. 5% canary).
4. Monitoruj latency, error rate i logi przez oкно obserwacji.
5. Stopniowo zwiększaj wagę ruchu canary (25% → 50% → 100%).
6. Przełącz etykiety Service w pełni na nową wersję i usuń stary ReplicaSet.

## Rollback
1. Przywróć wagę ruchu / selector na poprzedni Deployment.
2. Wyskaluj canary do 0 i zostaw stable jako jedyne źródło ruchu.

## Weryfikacja
- [x] 6 kroków
- [x] Rollback 2 punkty`,
      latencyMs: 1600,
      tokensIn: 180,
      tokensOut: 260,
      costUsd: 0.0022,
    },
    modelB: {
      modelId: 'claude-3.5',
      content: `1. Build & push image.
2. Apply canary deployment.
3. Split traffic 10%.
4. Watch metrics.
5. Ramp to 100%.
6. Cleanup old pods.

Rollback: scale down canary; point service to previous revision.`,
      latencyMs: 980,
      tokensIn: 180,
      tokensOut: 90,
      costUsd: 0.0029,
    },
    vote: null,
    rubricA: null,
    rubricB: null,
    judgedAt: null,
  },
  {
    id: 'pair-008',
    taskId: 'task-002',
    experimentId: 'exp-002',
    promptVariant: 'C',
    promptText: 'Zaimplementuj generyczną funkcję debounce…',
    leftIsA: false,
    modelA: {
      modelId: 'gpt-4o',
      content: `## Zrozumienie
Potrzebny generyczny debounce TS + różnica względem throttle.

## Rozwiązanie
\`\`\`ts
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
\`\`\`
**Debounce** odkłada wykonanie do pauzy w wywołaniach; **throttle** gwarantuje co najwyżej jedno wykonanie w oknie czasu.

## Weryfikacja
- [x] generics
- [x] clearTimeout/setTimeout
- [x] porównanie z throttle`,
      latencyMs: 1200,
      tokensIn: 160,
      tokensOut: 210,
      costUsd: 0.0036,
    },
    modelB: {
      modelId: 'mistral-large',
      content: `function debounce(fn, wait) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
}
Debounce i throttle to to samo — ograniczają częstotliwość.`,
      latencyMs: 880,
      tokensIn: 160,
      tokensOut: 70,
      costUsd: 0.001,
      hallucinated: true,
      error: null,
    },
    vote: 'a_wins',
    rubricA: score(5, 5, 5, 5, 4),
    rubricB: score(2, 2, 2, 2, 1),
    judgedAt: '2026-10-29T11:00:00Z',
  },
]

export const leaderboard: LeaderboardEntry[] = [
  {
    modelId: 'claude-3.5',
    wins: 28,
    losses: 9,
    ties: 5,
    bothBad: 1,
    elo: 1284,
    avgScore: 4.42,
    avgLatencyMs: 1120,
    totalCostUsd: 4.82,
    hallucinationRate: 0.04,
    errorRate: 0.01,
    categoryScores: {
      programowanie: 4.5,
      logika: 4.6,
      streszczanie: 4.7,
      instrukcje: 4.3,
      wiedza: 4.1,
    },
  },
  {
    modelId: 'gpt-4o',
    wins: 26,
    losses: 11,
    ties: 6,
    bothBad: 0,
    elo: 1261,
    avgScore: 4.28,
    avgLatencyMs: 890,
    totalCostUsd: 5.14,
    hallucinationRate: 0.06,
    errorRate: 0.02,
    categoryScores: {
      programowanie: 4.6,
      logika: 4.2,
      streszczanie: 4.1,
      instrukcje: 4.5,
      wiedza: 4.0,
    },
  },
  {
    modelId: 'gemini-1.5',
    wins: 18,
    losses: 14,
    ties: 7,
    bothBad: 2,
    elo: 1198,
    avgScore: 3.95,
    avgLatencyMs: 1050,
    totalCostUsd: 2.31,
    hallucinationRate: 0.09,
    errorRate: 0.03,
    categoryScores: {
      programowanie: 3.9,
      logika: 3.8,
      streszczanie: 4.0,
      instrukcje: 4.2,
      wiedza: 3.9,
    },
  },
  {
    modelId: 'qwen-2.5-72b',
    wins: 15,
    losses: 16,
    ties: 4,
    bothBad: 2,
    elo: 1164,
    avgScore: 3.72,
    avgLatencyMs: 1240,
    totalCostUsd: 0.94,
    hallucinationRate: 0.11,
    errorRate: 0.04,
    categoryScores: {
      programowanie: 3.8,
      logika: 3.6,
      streszczanie: 3.5,
      instrukcje: 3.9,
      wiedza: 3.8,
    },
  },
  {
    modelId: 'mistral-large',
    wins: 12,
    losses: 18,
    ties: 5,
    bothBad: 3,
    elo: 1131,
    avgScore: 3.48,
    avgLatencyMs: 980,
    totalCostUsd: 1.62,
    hallucinationRate: 0.13,
    errorRate: 0.05,
    categoryScores: {
      programowanie: 3.5,
      logika: 3.4,
      streszczanie: 3.6,
      instrukcje: 3.3,
      wiedza: 3.6,
    },
  },
  {
    modelId: 'llama-3.1-70b',
    wins: 10,
    losses: 20,
    ties: 4,
    bothBad: 4,
    elo: 1098,
    avgScore: 3.21,
    avgLatencyMs: 1380,
    totalCostUsd: 0.71,
    hallucinationRate: 0.18,
    errorRate: 0.06,
    categoryScores: {
      programowanie: 3.3,
      logika: 3.0,
      streszczanie: 3.2,
      instrukcje: 3.1,
      wiedza: 3.4,
    },
  },
]

export const categoryStats: CategoryStat[] = [
  { category: 'programowanie', avgScore: 3.93, comparisons: 42, hallucinations: 5 },
  { category: 'logika', avgScore: 3.77, comparisons: 36, hallucinations: 4 },
  { category: 'streszczanie', avgScore: 3.85, comparisons: 28, hallucinations: 3 },
  { category: 'instrukcje', avgScore: 3.88, comparisons: 34, hallucinations: 6 },
  { category: 'wiedza', avgScore: 3.8, comparisons: 30, hallucinations: 8 },
]

export const promptVariantPerformance = [
  { variant: 'A', avgScore: 3.62, winRate: 0.48, hallucinations: 0.14, avgLatency: 980 },
  { variant: 'B', avgScore: 3.91, winRate: 0.54, hallucinations: 0.09, avgLatency: 1040 },
  { variant: 'C', avgScore: 4.18, winRate: 0.61, hallucinations: 0.06, avgLatency: 1210 },
]

export const costOverTime = [
  { day: '20.10', cost: 0.42, comparisons: 12 },
  { day: '22.10', cost: 0.68, comparisons: 18 },
  { day: '24.10', cost: 0.55, comparisons: 15 },
  { day: '27.10', cost: 1.12, comparisons: 24 },
  { day: '29.10', cost: 0.94, comparisons: 21 },
  { day: '01.11', cost: 1.35, comparisons: 28 },
  { day: '03.11', cost: 1.08, comparisons: 22 },
]
