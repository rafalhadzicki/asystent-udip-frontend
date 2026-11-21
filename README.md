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
- React Hook Form z walidacją w `rules`; date-fns do pracy z datami.
- Axios z typowanym klientem HTTP (jeszcze niepodłączonym do logowania).
- i18next i react-i18next — teksty pod typowanymi kluczami tłumaczeń.
- Vitest, Testing Library, ESLint i Prettier.

Alias `@/` wskazuje na `src/`. Font jest lokalną zależnością, a nie zasobem
pobieranym z CDN. Motyw MUI znajduje się w `src/app/theme.ts`, a style
logowania w `src/features/auth/login-page.styles.ts`.

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
bez dodatkowego wrappera. `ScreenReaderText` znajduje się w `components/ui`.
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

W komponentach używamy `useTranslation()` i `t('auth.submit')`, a dla tekstu
z elementami JSX — `Trans`. Typy kluczy wynikają ze słownika; nieistniejący
klucz jest błędem TypeScript. Mock logowania zwraca kod błędu, który widok
zamienia na tłumaczenie. Dane użytkowników z przyszłego API nie są
tłumaczeniami — `nameKey` dotyczy wyłącznie użytkownika demonstracyjnego.
W obrębie formularza używamy także `keyPrefix`, aby nie powtarzać prefiksów.

Nie umieszczaj rzeczywistych dokumentów, danych osobowych ani sekretów
w repozytorium lub przykładowych danych projektu.
