# ModelEval Arena

Aplikacja webowa do oceny, testowania i porównywania odpowiedzi modeli AI — inspirowana LMSYS Chatbot Arena.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Recharts
- Lucide React

## Uruchomienie

```bash
npm install
npm run dev
```

## Widoki

| Ścieżka | Opis |
|---------|------|
| `/` | Arena porównawcza (blind pairwise + rubryka) |
| `/experiments` | Konfiguracja eksperymentów i warianty promptów A/B/C |
| `/benchmark` | Zarządzanie zadaniami benchmarku |
| `/dashboard` | Leaderboard, wykresy, eksport CSV/JSON |

Dane pochodzą z mocków symulujących zapisaną bazę (SQLite-like).
