# Tag Scribe — iOS (Swift/SwiftUI)

Native iOS app for Tag Scribe. Uses the same API and Firebase Auth as the web app (`https://tag-scribe.vercel.app`).

## Firebase setup (required once)

The app uses **Firebase Auth** (Email/Password) and the **Firebase iOS SDK** (added via Swift Package). You must register the app in Firebase and add the config file:

1. **See [FIREBASE-SETUP.md](FIREBASE-SETUP.md)** for step-by-step: bundle ID `app.tagscribe.ios`, download `GoogleService-Info.plist`, add it to the Xcode project.
2. Open `TagScribe.xcodeproj` in Xcode, add `GoogleService-Info.plist` to the **TagScribe** group and target, then run (⌘R).

Without `GoogleService-Info.plist`, the app will crash at launch when calling `FirebaseApp.configure()`.

## Open in Xcode

1. Open `TagScribe.xcodeproj` in Xcode (from the `apps/ios` directory).
2. Add `GoogleService-Info.plist` as in FIREBASE-SETUP.md if you haven’t already.
3. Select a simulator or device and run (⌘R).

## Structure

- **TagScribeApp.swift** — App entry; calls `FirebaseApp.configure()`.
- **Views/RootView.swift** — Shows SignInView or ContentView based on auth state.
- **Views/SignInView.swift** — Email/password sign in and sign up.
- **ContentView.swift** — Library list (items) and Sign out in the toolbar.
- **Models/** — `Item`, `Category` (mirror API types).
- **Auth/AuthManager.swift** — Firebase Auth: sign in/up/out, `getIdToken()` for the API.
- **Services/APIClient.swift** — HTTP client for `/api/items`, `/api/categories`, `/api/tags`. Sends `Authorization: Bearer <token>`.

## API base URL

Set in **Info.plist** as `API_BASE_URL` (default: `https://tag-scribe.vercel.app`). Override for local dev if needed.

## Next steps

- **Add / Edit / Archive** — Extend `APIClient` with `POST /api/items`, `PATCH /api/items/[id]`, and add corresponding screens.
- See **private/specifications/mobile-apps/API-CONTRACT.md** for the full API.
