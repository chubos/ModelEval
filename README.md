# ModelEval Arena

Ocena i porównywanie odpowiedzi modeli AI (inspiracja: LMSYS Chatbot Arena).

```
LLM/
├── client/   # React + Vite + Tailwind
└── server/   # Express + SQLite
```

## Uruchomienie

Z katalogu głównego:

```bash
npm install
npm run dev
```

- Client: http://localhost:5173  
- API: http://localhost:3001  

Osobno:

```bash
npm run dev:web   # tylko client
npm run dev:api   # tylko server
npm run db:reset  # wyczyść SQLite (seed przy kolejnym starcie API)
```

## Pakiety

| Folder | Nazwa npm | Opis |
|--------|-----------|------|
| `client/` | `modeleval-client` | UI Areny, eksperymentów, benchmarku, dashboardu |
| `server/` | `modeleval-server` | REST API + baza `server/data/modeleval.sqlite` |
