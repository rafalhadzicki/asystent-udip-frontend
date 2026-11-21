# Asystent UDIP — frontend

Szkielet aplikacji React i TypeScript dla projektu hackathonowego. Widoki
obsługi spraw i integracja z API nie są jeszcze zaimplementowane.

## Logowanie demonstracyjne

Ekran `/login` ma walidację, podgląd hasła i symulację logowania.
Konto testowe: login `demo`, hasło `demo123`. Nie używaj rzeczywistych danych.
Po zalogowaniu `/sprawy` pokazuje ekran tymczasowy z wylogowaniem.

Sesja istnieje tylko w pamięci i kończy się po odświeżeniu strony.
Nie zapisujemy hasła ani tokenów. Mock i przekierowania w przeglądarce
nie zapewniają uwierzytelniania ani ochrony danych; wymagają zastąpienia
rzeczywistą integracją przed użyciem aplikacji z prawdziwymi dokumentami.

## Uruchomienie

Wymagany jest Node.js zgodny z wymaganiami Vite oraz npm.

```bash
npm ci
npm run dev
```

Adres serwera deweloperskiego pojawi się w terminalu.

## Weryfikacja

```bash
npm run lint
npm test
npm run build
npm run format:check
```

## Stack

- Vite, React, TypeScript, React Router i TanStack Query.
- MUI z silnikiem styled-components i Lucide.
- React Hook Form z walidacją w `register`; date-fns do pracy z datami.
- Vitest, Testing Library, ESLint i Prettier.

Alias `@/` wskazuje na `src/`. Font jest lokalną zależnością, a nie zasobem
pobieranym z CDN. Motyw MUI znajduje się w `src/app/theme.ts`, a style
logowania w `src/features/auth/login-page.styles.ts`.

Komponenty definiujemy jako `const Component = (...) => ...`. Stylowane
komponenty tworzymy przez `styled` z MUI, korzystające z silnika
`@mui/styled-engine-sc`. Alias silnika jest skonfigurowany w Vite i TypeScript,
a npm override zapewnia ten sam silnik dla zależności uruchamianych przez
Vitest. Nie używamy Emotion, Tailwind, shadcn ani Zod.

Nie umieszczaj rzeczywistych dokumentów, danych osobowych ani sekretów
w repozytorium lub przykładowych danych projektu.
