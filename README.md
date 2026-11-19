# ModelEval Arena

Ocena i porównywanie odpowiedzi prawdziwych modeli językowych AI (inspiracja: LMSYS Chatbot Arena).

```
ModelEval/
├── client/   # React + Vite + Tailwind (Interfejs Areny, Ustawienia, Benchmark, Dashboard)
└── server/   # Express + SQLite + Uniwersalny klient LLM (OpenRouter / OpenAI-compatible API)
```

## Konfiguracja API modeli (OpenRouter / OpenAI)

Aplikacja nie korzysta ze zmockowanych odpowiedzi — odpytuje modele w czasie rzeczywistym. Klucz API możesz skonfigurować na dwa sposoby:

### 1. W interfejsie aplikacji (zalecane)
Kliknij przycisk **„Ustawienia API ⚙️”** w menu bocznym lub na pasku Areny. Możesz tam:
- Wkleić swój klucz API (np. z [openrouter.ai/keys](https://openrouter.ai/keys)) — zostanie bezpiecznie zapisany w `localStorage` Twojej przeglądarki.
- Zmienić **Base URL** (domyślnie `https://openrouter.ai/api/v1`, ale możesz podać oficjalne OpenAI `https://api.openai.com/v1`, Groq `https://api.groq.com/openai/v1` czy lokalną Ollamę `http://localhost:11434/v1`).
- Wybrać domyślne modele do pojedynków (np. `google/gemini-2.5-flash`, `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`).
- Przetestować połączenie przyciskiem **„Testuj połączenie”**.

### 2. Za pomocą pliku `.env`
Skopiuj plik `.env.example` do `.env`:
```bash
cp .env.example .env
```
I uzupełnij klucz:
```env
OPENROUTER_API_KEY=sk-or-v1-twoj-klucz-openrouter
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_MODEL_A=google/gemini-2.5-flash
DEFAULT_MODEL_B=openai/gpt-4o-mini
```

---

## Uruchomienie aplikacji

Z katalogu głównego projektu:

```bash
npm install
npm run dev
```

- **Aplikacja Webowa:** [http://localhost:5173](http://localhost:5173)  
- **Backend API:** [http://localhost:3001](http://localhost:3001)  

Uruchomienie osobno:

```bash
npm run dev:web   # uruchamia tylko frontend (Vite)
npm run dev:api   # uruchamia tylko backend (Express + TSX)
npm run db:reset  # resetuje bazę danych SQLite do czystego stanu
```

---

## Jak przetestować działanie?

1. Otwórz [http://localhost:5173](http://localhost:5173).
2. Jeśli nie podałeś klucza w `.env`, kliknij **„Ustawienia API ⚙️”** w lewym dolnym rogu i wklej swój klucz OpenRouter.
3. W sekcji **Arena** kliknij dowolny z **5 kafelków z przykładowymi zadaniami**:
   - 📄 **Podsumowanie tekstu** (zwięzłe streszczenie artykułu o postępach w AI)
   - 💻 **Generowanie kodu TypeScript** (generyczny algorytm debounce z typami)
   - 💡 **Burza mózgów: 5 pomysłów SaaS** (niszowe produkty B2B dla programistów)
   - 🌐 **Korekta i tłumaczenie e-maila** (wersja formalna i semi-formalna)
   - 📊 **Analiza danych sprzedaży JSON** (kalkulacja przychodów, średnich ocen i rekomendacji)
4. Kliknij **„Wygeneruj pojedynek AI”**.
5. Obserwuj animowane wskaźniki ładowania (loading skeletons), a następnie porównaj odpowiedzi Modelu A i Modelu B (blind test), sprawdź rzeczywisty czas odpowiedzi (`latencyMs`) oraz liczbę tokenów, a na koniec oddaj głos i oceń jakość w rubryce!
