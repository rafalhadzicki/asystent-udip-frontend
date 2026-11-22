import { LOCAL_STORAGE_KEY } from './local-store-provider'

// Drafts and redaction decisions hold personal data, so they are removed for
// every user when someone signs out.
export const clearLocalStore = () =>
  Object.keys(localStorage)
    .filter(
      (key) =>
        key === LOCAL_STORAGE_KEY || key.startsWith(`${LOCAL_STORAGE_KEY}:`),
    )
    .forEach((key) => localStorage.removeItem(key))
