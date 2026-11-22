# Asystent UDIP — frontend

Aplikacja React i TypeScript wspierająca urzędników w obsłudze wniosków o
informację publiczną (Hacknation 2026, Urząd Miasta Bydgoszczy). Sprawy,
terminy, analiza, projekt odpowiedzi, sugestie anonimizacji i baza wiedzy
pochodzą z backendu (NestJS, `/api`). Aplikacja niczego nie wysyła na zewnątrz:
wysyłkę odpowiedzi urzędnik odnotowuje ręcznie, a decyzję zawsze podejmuje
człowiek.

## Przepływ pracy

Rejestr → nowy wniosek (PDF, DOC lub DOCX) → weryfikacja odczytanych danych →
analiza pytań i wybór jednostek → materiały i projekt odpowiedzi →
anonimizacja → pobranie TXT lub DOCX → odnotowanie wysyłki.

| Adres                          | Widok                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| `/sprawy`                      | rejestr z filtrami w URL i eksportem CSV                   |
| `/kalendarz`                   | terminy spraw w siatce miesiąca                            |
| `/sprawy/nowy`                 | wgranie pisma, odczyt AI, weryfikacja, utworzenie sprawy   |
| `/sprawy/:caseId/wniosek`      | treść wniosku, zmiana terminu (kwerenda), usunięcie sprawy |
| `/sprawy/:caseId/analiza`      | pytania, jednostki, podobne odpowiedzi z archiwum          |
| `/sprawy/:caseId/materialy`    | odpowiedzi jednostek, generowanie i edycja projektu        |
| `/sprawy/:caseId/anonimizacja` | decyzje o ukryciu fragmentów, eksport, odnotowanie wysyłki |
| `/baza-wiedzy`                 | ustawy, wzory odpowiedzi i wytyczne (PDF, DOCX, TXT)       |

Anonimizacja dotyczy tekstu odpowiedzi, nie oryginalnego pliku ani załączników,
i nie zastępuje przeglądu przez człowieka. Aplikacja nie integruje się z EZD,
ePUAP ani SIDAS.

## Dane lokalne

Pola bez odpowiednika w API (tekst odpowiedzi, decyzje anonimizacji, notatki do
materiałów, powody wyboru jednostek, lokalny etap pracy, data i notatka
wysyłki) zapisujemy w LocalStorage (`asystent-udip-demo-v1:<e-mail>`) jako
nakładkę na dane z API, osobno dla każdego konta. Ręczne wylogowanie czyści
dane wszystkich kont; wygaśnięcie sesji (401) ich nie usuwa. Nie zapisujemy plików ani
haseł. Klucz `asystent-udip-session` trzyma tylko id i e-mail użytkownika jako
podpowiedź do pierwszego renderu; sesją jest ciasteczko httpOnly z backendu.
Dane lokalne nie są szyfrowane, używaj wyłącznie danych testowych.

## Uruchomienie

Wymagane: Node.js zgodny z Vite i npm.

```bash
npm ci
cp .env.example .env.local   # ustaw BACKEND_URL
npm run dev
```

Sesja to ciasteczko, więc frontend i API muszą być w jednej witrynie. W trybie
deweloperskim Vite przekazuje `/api` do `BACKEND_URL` (adres bez końcowego
`/api`), a aplikacja woła własny adres (`VITE_API_BASE_URL=http://localhost:5173`).
Bez proxy ustaw `VITE_API_BASE_URL` na adres backendu i dodaj nasz adres do jego
`CORS_ORIGINS`; przy tunelu ngrok ustaw też `VITE_API_NGROK=true`. W produkcji
frontend i API powinny być pod jedną domeną lub jej subdomenami. Zmienne
`VITE_*` są publiczne: nie wpisuj w nich sekretów.

Frontend to statyczna aplikacja (`npm run build`) bez usług zewnętrznych: font
jest lokalną zależnością, a teksty są w `pl.json`.

## Weryfikacja

```bash
npm run lint
npm test
npm run build
npm run format:check
```

CircleCI uruchamia te same kroki, a z gałęzi `main` wdraża też build.

## Stack i konwencje

- Vite, React, TypeScript, React Router, TanStack Query.
- MUI ze styled-components (`@mui/styled-engine-sc`) i Lucide; bez Emotion,
  Tailwinda i shadcn.
- React Hook Form (walidacja w `rules`), date-fns, Axios, Zod, i18next.
- Vitest, Testing Library, ESLint, Prettier.

Zasady:

- Alias `@/` wskazuje na `src/`; ścieżki widoków są w `src/app/routes.ts`,
  motyw MUI w `src/app/theme.ts`.
- Komponenty to `const Component = (...) => ...`. Większe style niż drobne
  korekty (`sx`) trafiają do plików `.styles.ts` obok widoku.
- Każdy widok sprawy ma własny folder (komponent, style, testy); kod wspólny
  dla kilku widoków leży w `src/features/cases`.
- Wspólne pola formularzy (`FormTextField`, `FormPasswordField`) są w
  `src/components/form`, a `SectionCard` i `FileDropArea` w `src/components/ui`.
  `defaultValues` ustawiamy w `useForm`.
- Wszystkie teksty interfejsu są w `src/i18n/locales/pl.json` i używane przez
  `t('klucz')` (`Trans` dla tekstu z JSX). Typy kluczy wynikają ze słownika.
  Tytuły testów piszemy po angielsku.
- Nie umieszczaj w repozytorium prawdziwych dokumentów, danych osobowych ani
  sekretów.

## Warstwa API

Cała komunikacja z backendem leży w `src/api/`:

```
src/api/
  client.ts       # Axios: adres API, timeout, ciasteczka, obsługa 401
  session.ts      # sesja (id + e-mail jako podpowiedź), useSession()
  query-client.ts # QueryClient z domyślnymi opcjami
  query-keys.ts   # klucze Query zakresowane e-mailem użytkownika
  auth/ departments/ cases/ knowledge/   # <zasób>.{api,schemas,queries}.ts
```

- `*.schemas.ts`: schematy Zod zgodne z kontraktem; odpowiedź niezgodna z nim
  kończy się `ZodError`.
- `*.api.ts`: czyste funkcje wołające `apiClient` i parsujące odpowiedź.
- `*.queries.ts`: hooki `useGetX` / `useCreateX`; mutacje zapisują wynik w cache
  i unieważniają listy. Komponenty nie wołają `apiClient` bezpośrednio.

Klient wysyła ciasteczko sesji (`withCredentials`). 401 z każdego endpointu poza
logowaniem i rejestracją kończy sesję; po starcie zapamiętana sesja jest
sprawdzana przez `GET /api/auth/me`, a wylogowanie woła `POST /api/auth/logout`.
Zmiana sesji czyści cache Query, a błędy 4xx nie są ponawiane.
