# Tag Scribe — Android (Kotlin)

Native Android app for Tag Scribe. Uses the same API as the web app (`https://tag-scribe.vercel.app`).

## Open in Android Studio

1. Open the `apps/android` folder in Android Studio (File → Open).
2. Sync Gradle, then run on an emulator or device (Run ▶).

## Structure

- **app/src/main/java/app/tagscribe/**
  - **MainActivity.kt** — Single screen: library list (items). Shows “Not signed in” until Firebase Auth is wired.
  - **models/** — `Item`, `Category` (mirror API types).
  - **auth/AuthManager.kt** — Placeholder for Firebase ID token. Integrate Firebase Auth and return `Firebase.auth.currentUser?.getIdToken(false)?.result?.token`.
  - **api/ApiService.kt** — Retrofit interface for `/api/items`, `/api/categories`, `/api/tags`.
  - **api/ApiClient.kt** — Retrofit + OkHttp with an interceptor that adds `Authorization: Bearer <token>`.

## API base URL

Set in **ApiClient.kt** as `DEFAULT_BASE_URL` (default: `https://tag-scribe.vercel.app/`). Change for local dev if needed.

## Next steps

1. **Firebase Auth** — Add Firebase Android SDK (Firebase BOM + `firebase-auth-ktx`). In `AuthManager`, sign in and return the ID token from `currentUser?.getIdToken(false)`.
2. **Sign-in UI** — Add a login/sign-up screen when token is null; after sign-in, refresh the library.
3. **Add / Edit / Archive** — Extend `ApiService` with `POST /api/items`, `PATCH /api/items/{id}`, and add corresponding screens.

See **private/specifications/mobile-apps/API-CONTRACT.md** for the full API.
