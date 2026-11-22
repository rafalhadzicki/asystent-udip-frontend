# Asystent UDIP — frontend

Aplikacja React i TypeScript dla narzędzia wspierającego urzędników w obsłudze
wniosków o dostęp do informacji publicznej (Hacknation 2026, Urząd Miasta
Bydgoszczy). Wszystkie sprawy, terminy, dokumenty, analiza, projekt odpowiedzi,
sugestie anonimizacji i baza wiedzy pochodzą z backendu (NestJS, `/api`).
Aplikacja niczego nie wysyła na zewnątrz: wysyłkę odpowiedzi urzędnik
odnotowuje ręcznie, a ostateczną decyzję zawsze podejmuje człowiek.

## Przepływ pracy

Rejestr → nowy wniosek (PDF lub DOCX) → weryfikacja odczytanych danych →
analiza pytań i podpowiedź wydziałów → materiały z wydziałów i projekt
odpowiedzi → anonimizacja → pobranie TXT lub DOCX → odnotowanie wysyłki.

- `/sprawy`: rejestr z `GET /api/cases` — numer porządkowy, numer sprawy, temat,
  data wpływu, termin (z oznaczeniem kwerendy i liczbą dodatkowych dni),
  data odpowiedzi, pilność, etap (z postępem odpowiedzi wydziałów) i inicjały
  osoby prowadzącej. Wyszukiwanie, rok, etap, sortowanie (domyślnie od
  najstarszych) i paginacja są po stronie serwera, filtry w URL. API listuje
  jeden rok wpływu naraz. Eksport CSV obejmuje te same kolumny.
- `/kalendarz`: siatka miesiąca z `GET /api/cases/calendar`; sprawy z terminem
  dziś i jutro są wyróżnione.
- `/sprawy/nowy` i `/sprawy/nowy/weryfikacja`: wgranie pliku do
  `POST /api/cases/analyze`, weryfikacja tekstu i dat, kontrola numeru sprawy,
  utworzenie sprawy w backendzie.
- `/sprawy/:caseId/wniosek`: metryka i treść wniosku, zmiana terminu przez
  kwerendę z powodem (można ją wycofać), powrót do poprzednich kroków.
- `/sprawy/:caseId/analiza`: pytania, podpowiedź wydziałów (`/api/departments`)
  i podobne odpowiedzi z archiwum (`POST /api/knowledge/search`) z procentem
  podobieństwa.
- `/sprawy/:caseId/materialy`: odpowiedzi wydziałów (pliki lub tekst),
  jawne generowanie projektu odpowiedzi i jego edycja. Projekt wymaga
  weryfikacji przez człowieka.
- `/sprawy/:caseId/anonimizacja`: sugestie danych do ukrycia (szare), decyzje
  urzędnika (po akceptacji czarne) i eksport, który naprawdę zastępuje tekst.
  Nierozstrzygnięte sugestie blokują potwierdzenie.
- `/baza-wiedzy`: dodawanie, edycja, ponowna indeksacja i usuwanie ustaw,
  wzorów odpowiedzi i wytycznych (PDF, DOCX, TXT).

Anonimizacja dotyczy tekstu odpowiedzi. Nie anonimizuje oryginalnego pliku
PDF/DOCX ani załączników i nie zastępuje przeglądu przez człowieka. Aplikacja
nie integruje się z EZD, ePUAP ani SIDAS.

## Dane lokalne

Backend nie przechowuje jeszcze części pól (tekst odpowiedzi, decyzje
anonimizacji, notatki do materiałów, powody wyboru jednostek, lokalny etap
pracy). Te pola zapisujemy w LocalStorage (`asystent-udip-demo-v1:<e-mail>`)
jako nakładkę na dane z API, osobno dla każdego konta. Nie zapisujemy plików,
haseł ani tokenów sesji poza kluczem `asystent-udip-session` (tymczasowo; przed
pracą na prawdziwych danych token trzeba przenieść do ciasteczka httpOnly).
Dane lokalne nie są szyfrowane. Używaj wyłącznie danych testowych.
Jeżeli dane zmienią się w innej karcie, zapis w bieżącej zostaje wstrzymany,
żeby nie nadpisać tamtych zmian.

## Wdrożenie i model AI

Frontend jest statyczną aplikacją (`npm run build`) i nie korzysta z usług
zewnętrznych: font jest lokalną zależnością, teksty są w `pl.json`. Praca bez
Internetu zależy od backendu, który docelowo powinien używać lokalnego modelu
językowego i lokalnej bazy wektorowej (propozycja modelu: do ustalenia z
zespołem backendowym).

## Uruchomienie

Wymagany jest Node.js zgodny z wymaganiami Vite oraz npm.

```bash
npm ci
npm run dev
```

Przed uruchomieniem skopiuj `.env.example` do `.env.local` i ustaw adres backendu
bez końcowego `/api`:

```env
VITE_API_BASE_URL=https://adres-backendu
```

W przypadku tunelu ngrok wymagającego pominięcia strony ostrzegawczej ustaw
także `VITE_API_NGROK=true`. Zmienne Vite są publiczne: nie umieszczaj w nich
haseł ani tokenów. Adres serwera deweloperskiego pojawi się w terminalu.

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
- React Hook Form z walidacją w `rules`; date-fns do pracy z datami.
- Axios z interceptorami i TanStack Query; odpowiedzi API walidujemy schematami Zod.
- i18next i react-i18next — teksty pod typowanymi kluczami tłumaczeń.
- Vitest, Testing Library, ESLint i Prettier.

Alias `@/` wskazuje na `src/`. Font jest lokalną zależnością, a nie zasobem
pobieranym z CDN. Motyw MUI znajduje się w `src/app/theme.ts`, a style
logowania w `src/features/auth/login-page.styles.ts`.
Ścieżki i funkcja budująca adresy spraw znajdują się w `src/app/routes.ts`.
Każdy widok sprawy ma własny folder z komponentem, stylami i testami;
wspólne dla kilku widoków funkcje pozostają w `src/features/cases`.

Komponenty definiujemy jako `const Component = (...) => ...`. Stylowane
komponenty tworzymy przez `styled` z MUI, korzystające z silnika
`@mui/styled-engine-sc`. Alias silnika jest skonfigurowany w Vite i TypeScript,
a npm override zapewnia ten sam silnik dla zależności uruchamianych przez
Vitest. Nie używamy Emotion, Tailwind ani shadcn.
`sx` stosujemy do drobnych, lokalnych korekt; większe układy i bardziej
rozbudowane style umieszczamy w plikach `.styles.ts` danego widoku.

## Wspólne komponenty i formularze

`src/components/form` zawiera `FormTextField` i `FormPasswordField`.
Pola korzystają z `useController`: nazwa jest sprawdzana względem typu
formularza, a wartość, ref, onBlur i komunikaty błędów są podłączane raz.
`defaultValues` ustawiamy w `useForm`, nie w pojedynczych polach.
Walidację deklarujemy w `rules` przy użyciu pola; nie używamy generatora formularzy.
Pole hasła zarządza wyłącznie widocznością, nie regułami logowania.

Ogólne style przycisków pozostają w motywie MUI. Do ładowania używamy
wbudowanego `Button loading`, a do większej akcji `size="large"`,
bez dodatkowego wrappera. `ScreenReaderText` znajduje się przy logowaniu;
wspólny kontener sekcji `SectionCard` znajduje się w `components/ui`.
Layout logowania pozostaje lokalny w feature `auth`.

## Warstwa API

Cała komunikacja z backendem leży w `src/api/`:

```
src/api/
  client.ts          # Axios: adres API, timeout, token, obsługa 401
  session.ts         # sesja (token + e-mail, tymczasowo w LocalStorage), useSession()
  query-client.ts    # QueryClient z domyślnymi opcjami i globalnym onError
  query-keys.ts      # fabryka kluczy Query, zakresowana e-mailem użytkownika
  auth/        { auth.api.ts, auth.schemas.ts, auth.queries.ts }
  departments/ { departments.api.ts, departments.schemas.ts, departments.queries.ts }
  cases/       { cases.api.ts, cases.schemas.ts, cases.queries.ts }
```

- `*.schemas.ts` — schematy Zod zgodne z kontraktem backendu; typy wyprowadzamy
  przez `z.infer`. Odpowiedź niezgodna z kontraktem kończy się `ZodError`.
- `*.api.ts` — czyste funkcje wywołujące `apiClient` i parsujące odpowiedź.
- `*.queries.ts` — hooki `useGetX` / `useCreateX` zwracające nazwane pola,
  np. `{ departments, isDepartmentsLoading, isDepartmentsError }`. Mutacje spraw
  zapisują zwrócony szczegół w cache i unieważniają listy.

Klient dokleja `Authorization` z bieżącej sesji. 401 z uwierzytelnionego
requestu kończy sesję (powrót do logowania); 401 z logowania obsługuje formularz.
Każda zmiana sesji czyści cache Query. Zapytania nie są ponawiane po błędach 4xx.
Komponenty nie przekazują tokenu ani nie wołają `apiClient` bezpośrednio.

Adres serwera ustawia `VITE_API_BASE_URL` w `.env.local`; bez niego requesty
są odrzucane. Nie dodawaj sekretów do zmiennych `VITE_*`: są widoczne w przeglądarce.

## Tłumaczenia

Polskie teksty interfejsu, walidacji i dostępności znajdują się w
`src/i18n/locales/pl.json`. Konfiguracja w `src/i18n/index.ts` ładuje je lokalnie,
bez żądań do API. Obecnie jedynym językiem jest polski, bez przełącznika.
Teksty widoków są pogrupowane w obiektach jednego pliku `pl.json`.

W komponentach używamy `useTranslation()` i `t('auth.submit')`, a dla tekstu
z elementami JSX — `Trans`. Typy kluczy wynikają ze słownika; nieistniejący
klucz jest błędem TypeScript. Mock logowania zwraca kod błędu, który widok
zamienia na tłumaczenie. Dane użytkowników z przyszłego API nie są
tłumaczeniami — `nameKey` dotyczy wyłącznie użytkownika demonstracyjnego.
W obrębie formularza używamy także `keyPrefix`, aby nie powtarzać prefiksów.

Nie umieszczaj rzeczywistych dokumentów, danych osobowych ani sekretów
w repozytorium lub przykładowych danych projektu.
