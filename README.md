# Asystent UDIP — frontend

Aplikacja demonstracyjna React i TypeScript dla projektu hackathonowego.
Widoki są połączone wspólnym modelem sprawy; integracja z backendem jest
jeszcze niezaimplementowana.

## Logowanie demonstracyjne

Ekran `/login` ma walidację, podgląd hasła i symulację logowania.
Konto testowe: login `demo`, hasło `demo123`. Nie używaj rzeczywistych danych.
Po zalogowaniu `/sprawy` pokazuje rejestr dziesięciu spraw demonstracyjnych.

Sesja logowania istnieje tylko w pamięci i kończy się po odświeżeniu strony.
Nie zapisujemy hasła ani tokenów. Mock i przekierowania w przeglądarce
nie zapewniają uwierzytelniania ani ochrony danych; wymagają zastąpienia
rzeczywistą integracją przed użyciem aplikacji z prawdziwymi dokumentami.

## Przepływ demonstracyjny

Rejestr → nowy wniosek → wybór PDF/DOCX → symulacja OCR → weryfikacja
tekstu i dat → analiza pytań i jednostek → materiały i odpowiedź →
anonimizacja tekstu → pobranie TXT → ręczne odnotowanie wysyłki poza aplikacją.

- `/sprawy`: wyszukiwanie, filtry w URL, sortowanie, paginacja, eksport CSV.
- `/sprawy/nowy` i `/sprawy/nowy/weryfikacja`: wybór rzeczywistego pliku,
  walidacja i tworzenie sprawy. OCR zwraca wyraźnie oznaczony przykład,
  **nie odczytuje treści wybranego dokumentu**.
- `/sprawy/:caseId/wniosek`: metryka i korekta tekstu.
- `/sprawy/:caseId/analiza`: edycja pytań i wybór jednostek,
  przykłady z bazy wiedzy.
- `/sprawy/:caseId/materialy`: odnotowanie kontaktu poza aplikacją,
  metadane załączników, wklejenie tekstu materiałów, jawne generowanie
  demonstracyjnego projektu i edycja. Projekt korzysta z wpisanych tekstów,
  nie z treści plików; nie dodaje własnych ustaleń faktycznych.
- `/sprawy/:caseId/anonimizacja`: propozycja dotycząca nazwiska wnioskodawcy
  i ręczne fragmenty, decyzje człowieka, podgląd i rzeczywiste pobranie TXT.
- `/kalendarz`: terminy pochodzące z tego samego rejestru.
- `/baza-wiedzy`: wyszukiwanie, dodawanie i aktualizacja metadanych materiałów.

Anonimizacja usuwa wszystkie dokładne wystąpienia zatwierdzonych fragmentów
z nowego pliku TXT. **Nie anonimizuje oryginalnego PDF/DOCX ani załączników**,
nie jest kompletnym wykrywaniem danych osobowych. Oryginalny tekst odpowiedzi
pozostaje w lokalnym demo do porównania. Oświadczenie nie zastępuje przeglądu
całości przez człowieka. Aplikacja nie wysyła korespondencji ani nie integruje
się z EZD/ePUAP.

## Zapis demo

Metadane i teksty spraw oraz bazy wiedzy są zapisywane w LocalStorage
pod kluczem `asystent-udip-demo-v1`. Nie zapisujemy plików, haseł ani tokenów.
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
- React Hook Form z walidacją w `rules`; date-fns do pracy z datami.
- Axios z typowanym klientem HTTP (jeszcze niepodłączonym do logowania).
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
Vitest. Nie używamy Emotion, Tailwind, shadcn ani Zod.

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

## Klient HTTP

`src/lib/api-client.ts` to cienka nakładka na Axios z metodami
`get/post/put/patch/delete`, zwracająca `response.data`.
Typ odpowiedzi nie jest walidacją danych w runtime.
Drugi generyk metod zapisujących określa typ payloadu.

```ts
apiClient.get<CaseResponse[]>('/cases', {
  params: { page: 1 },
  signal,
})
apiClient.post<CaseResponse, CreateCaseRequest>('/cases', payload)
apiClient.get<Blob>('/documents/demo', { responseType: 'blob' })
```

Konfiguracja requestu pozwala także przekazać `onUploadProgress`.
Docelowy adres serwera ustawia `VITE_API_BASE_URL` w lokalnym pliku
`.env.local`; bez niego adresy są względne do origin aplikacji.
Nie dodawaj sekretów do zmiennych `VITE_*`: są widoczne w przeglądarce.
Klient nie wykonuje żądań podczas importu i nie jest używany przez mock logowania.
Błędy oraz anulowanie propaguje do wywołującego, bez toastów i pustych fallbacków.
Przyszłe endpointy i hooki Query umieszczamy przy odpowiednim feature;
mocków nie zaszywamy w kliencie HTTP.

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
