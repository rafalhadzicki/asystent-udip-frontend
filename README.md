# Asystent UDIP — frontend

Aplikacja demonstracyjna React i TypeScript dla projektu hackathonowego.
Logowanie, odczyt wniosku i podpowiedzi nazw jednostek korzystają z backendu;
pozostałe funkcje są nadal połączone lokalnym, demonstracyjnym modelem sprawy.

## Logowanie i stan integracji

Ekran `/login` wysyła e-mail i hasło do `POST /api/auth/login`.
Po zalogowaniu `/sprawy` nadal pokazuje lokalne dane demonstracyjne, a nie
sprawy z API. Pozostałe operacje również nie zapisują danych w backendzie.
W widokach spraw i bazy wiedzy używaj wyłącznie danych testowych.

Sesja logowania istnieje tylko w pamięci i kończy się po odświeżeniu strony.
Token jest przechowywany tylko w pamięci, nie zapisujemy hasła ani tokenu
w LocalStorage. Lokalne dane demo są zapisywane osobno dla każdego konta
(klucz zawiera e-mail), ale nie są szyfrowane ani chronione przed osobą
korzystającą z tej samej przeglądarki.
Nie używaj aplikacji z prawdziwymi dokumentami na tym etapie integracji.

## Przepływ demonstracyjny

Rejestr → nowy wniosek → wybór PDF/DOCX → odczyt przez API → weryfikacja
tekstu i dat → analiza pytań i jednostek → materiały i odpowiedź →
anonimizacja tekstu → pobranie TXT → ręczne odnotowanie wysyłki poza aplikacją.

- `/sprawy`: lista z `GET /api/cases` (wyszukiwanie, rok, etap, sortowanie
  i paginacja po stronie serwera; filtry w URL) oraz lata z `GET /api/cases/years`.
  API listuje jeden rok wpływu naraz, domyślnie najnowszy — brak opcji
  „wszystkie lata”. Eksport CSV pobiera wszystkie sprawy spełniające filtry.
  Rejestr nie pokazuje wnioskodawcy (lista API go nie zwraca). Liczniki
  terminów obejmują niezakończone sprawy ze wszystkich lat, ale pojedyncze
  pobranie jest ograniczone do 500 spraw na rok — przy większej liczbie
  aplikacja oznacza liczby jako przybliżone.
- `/sprawy/nowy` i `/sprawy/nowy/weryfikacja`: wybór rzeczywistego pliku,
  walidacja i tworzenie lokalnej sprawy. Plik jest wysyłany do
  `POST /api/cases/analyze`, który zwraca tekst i sugestie do weryfikacji.
  Odczyt może się nie powieść lub być niepełny; dane należy sprawdzić.
  Utworzenie sprawy nadal nie wysyła jej do backendu, więc taka sprawa jest
  dostępna tylko lokalnie i **nie pojawia się w rejestrze z API**.
- `/sprawy/:caseId/wniosek`: metryka i korekta tekstu. Sprawa z rejestru API
  jest czytana z `GET /api/cases/{id}` (cache TanStack Query) i nie jest
  kopiowana do `localStorage`. Edycja numeru, tematu, wnioskodawcy, daty wpływu
  i treści zapisuje się przez `PATCH /api/cases/{id}`; termin liczy backend,
  więc pole jest zablokowane. Data sporządzenia, analiza, materiały, odpowiedź
  i anonimizacja pozostają lokalne: dla spraw z API zapisujemy tylko te pola
  (nakładka po `id` sprawy, osobno dla każdego konta). Lokalny etap pracy nie
  jest nadpisywany zmianą statusu na serwerze; w nagłówku widać status z API.
- `/sprawy/:caseId/analiza`: edycja pytań i wybór jednostek,
  przykłady z bazy wiedzy. Pole nazwy podpowiada jednostki z `GET /api/departments`,
  jednak wybór jednostek nadal jest zapisywany tylko lokalnie.
- `/sprawy/:caseId/materialy`: odnotowanie kontaktu poza aplikacją,
  metadane załączników, wklejenie tekstu materiałów, jawne generowanie
  demonstracyjnego projektu i edycja. Projekt korzysta z wpisanych tekstów,
  nie z treści plików; nie dodaje własnych ustaleń faktycznych.
- `/sprawy/:caseId/anonimizacja`: propozycja dotycząca nazwiska wnioskodawcy
  i ręczne fragmenty, decyzje człowieka, podgląd i rzeczywiste pobranie TXT.
- `/kalendarz`: terminy pochodzące z tego samego rejestru.
- `/baza-wiedzy`: wyszukiwanie, dodawanie i aktualizacja metadanych materiałów.

Analiza proponuje osobno warianty wielkości liter pełnych danych wnioskodawcy.
Każda decyzja usuwa z nowego TXT wyłącznie dokładne wystąpienia wybranego
wariantu, z uwzględnieniem wielkości liter. Analiza nie wykrywa odmian imion
i nazwisk ani wszystkich innych danych osobowych. **Nie anonimizuje oryginalnego
PDF/DOCX ani załączników** i nie gwarantuje bezpieczeństwa tekstu. Oryginalny tekst odpowiedzi
pozostaje w lokalnym demo do porównania. Oświadczenie nie zastępuje przeglądu
całości przez człowieka. Aplikacja nie wysyła korespondencji ani nie integruje
się z EZD/ePUAP.

## Zapis demo

Metadane i teksty spraw oraz bazy wiedzy są zapisywane w LocalStorage
pod kluczem `asystent-udip-demo-v1:<e-mail>`. Nie zapisujemy plików, haseł ani tokenów.
Wgrywany wniosek przed zatwierdzeniem istnieje tylko w pamięci; odświeżenie
na weryfikacji wymaga ponownego wyboru pliku. Oryginalny plik nie będzie
dostępny do podglądu po jego rejestracji.

Zapis jest jawnie oznaczony w UI: używaj wyłącznie danych testowych.
Reset demo wymaga potwierdzenia i przywraca początkowe dane.
Błędy odczytu lub zapisu są pokazywane użytkownikowi.
Jeżeli dane zmienią się w innej karcie, zapis w bieżącej karcie zostaje
wstrzymany, aby nie nadpisać tamtych zmian. Przed odświeżeniem skopiuj
potrzebne niezapisane treści. To mechanizm ostrzegawczy demo, a nie
transakcyjna synchronizacja wielu użytkowników.
Stała data odniesienia demo to **21.11.2026**, żeby rejestr i kalendarz
miały spójne, powtarzalne stany pilności. Sugestia 14 dni jest propozycją
do zatwierdzenia, a nie pełnym silnikiem obliczania terminów prawnych.
Backend będzie musiał zapewnić ekstrakcję dokumentów, kontrolę dostępu,
trwały zapis i reguły terminów uzgodnione z organizatorem.

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
  session.ts         # sesja w pamięci (token + e-mail), useSession()
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
