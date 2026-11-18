import type { ExampleTask } from '../types'

export const EXAMPLE_TASKS: ExampleTask[] = [
  {
    id: 'ex-summary',
    title: 'Podsumowanie tekstu',
    category: 'Streszczanie',
    badge: 'TL;DR',
    iconName: 'FileText',
    prompt: `Streść poniższy tekst w dokładnie 3 zwięzłych punktach w języku polskim:

"Sztuczna inteligencja przechodzi obecnie dynamiczną ewolucję od pojedynczych modeli generujących tekst do autonomicznych systemów wieloagentowych (multi-agent systems). Nowoczesne architektury nie tylko odpowiadają na pytania, ale potrafią samodzielnie planować sekwencję kroków, korzystać z zewnętrznych narzędzi (takich jak interpretery kodu, bazy danych czy przeglądarki) i iteracyjnie debugować swoje błędy. Równolegle obserwujemy gwałtowny spadek kosztów wnioskowania oraz wzrost efektywności mniejszych modeli, które w wyspecjalizowanych domenach dorównują najdroższym modelom flagowym."`,
  },
  {
    id: 'ex-code',
    title: 'Generowanie kodu TypeScript',
    category: 'Programowanie',
    badge: 'Code',
    iconName: 'Code',
    prompt: `Napisz w języku TypeScript generyczną funkcję \`debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number)\`.
Wymagania:
1. Pełne i bezpieczne otypowanie (Parameters<T>).
2. Czyszczenie timera przy kolejnych wywołaniach (clearTimeout).
3. Dodaj metodę lub możliwość anulowania oczekującego wywołania (cancel).
4. Dołącz krótki, 3-linijkowy przykład użycia.`,
  },
  {
    id: 'ex-brainstorm',
    title: 'Burza mózgów: 5 pomysłów SaaS',
    category: 'Kreatywność',
    badge: 'Ideation',
    iconName: 'Lightbulb',
    prompt: `Zaproponuj 5 innowacyjnych i niszowych pomysłów na aplikację mikro-SaaS dla developerów lub zespołów technologicznych.
Dla każdego pomysłu podaj:
1. Nazwę produktu.
2. Problem rynkowy, który rozwiązuje (pain point).
3. Kluczową funkcjonalność (killer feature).
4. Model monetyzacji (np. freemium, usage-based).`,
  },
  {
    id: 'ex-correction',
    title: 'Korekta i tłumaczenie e-maila',
    category: 'Język / Korekta',
    badge: 'Email',
    iconName: 'Languages',
    prompt: `Przeprowadź profesjonalną korektę językową i stylistyczną poniższego roboczego szkicu e-maila.
Przygotuj dwie wersje w języku angielskim:
1) Uprzejmą i formalną (Formal Business).
2) Przyjazną i zwięzłą (Semi-formal / Startup).

Oryginalny tekst:
"Cześć John, sory za duże opóźnienie z raportem kwartalnym, ale wczoraj mieliśmy awarię bazy danych i musieliśmy ratować serwery. Teraz wszystko już śmiga jak należy. W załączniku przesyłam plik PDF ze wszystkimi metrykami. Sprawdź to proszę i daj znać, czy pasuje Ci szybki call w piątek o 14:00 żeby omówić szczegóły."`,
  },
  {
    id: 'ex-data',
    title: 'Analiza danych sprzedaży JSON',
    category: 'Analiza danych',
    badge: 'JSON',
    iconName: 'FileSpreadsheet',
    prompt: `Przeanalizuj poniższe dane sprzedaży w formacie JSON i odpowiedz na pytania:
1. Który produkt wygenerował najwyższy całkowity przychód (cena * sprzedana ilość)?
2. Jaka jest średnia ocena zadowolenia (satisfaction) ważona liczbą sprzedanych sztuk?
3. Wskaż 2 konkretne rekomendacje biznesowe i potencjalne ryzyka wynikające z tych liczb.

Dane do analizy:
[
  { "id": 1, "product": "Kurs Python & AI", "price": 199, "sold": 60, "satisfaction": 4.8 },
  { "id": 2, "product": "E-book Prompt Engineering", "price": 49, "sold": 220, "satisfaction": 4.3 },
  { "id": 3, "product": "Konsultacja Architektoniczna 1:1", "price": 600, "sold": 12, "satisfaction": 5.0 },
  { "id": 4, "product": "Subskrypcja API Dev (Miesięczna)", "price": 79, "sold": 110, "satisfaction": 3.7 }
]`,
  },
]
