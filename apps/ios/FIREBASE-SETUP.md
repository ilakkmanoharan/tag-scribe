# Firebase setup for Tag Scribe iOS

Follow these steps once to connect the iOS app to your Firebase project (the same one used by the web app).

## 1. Register the app in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) and select your **Tag Scribe** project.
2. Click the **iOS** icon (or “Add app” → Apple) to add an Apple app.
3. **Apple bundle ID:** enter **`app.tagscribe.ios`** (must match exactly).
   - In Xcode you can confirm: select the **TagScribe** target → **General** → **Bundle Identifier**.
4. **App nickname (optional):** e.g. `Tag Scribe iOS`.
5. **App Store ID (optional):** leave blank until you publish.
6. Click **Register app**.

## 2. Download and add `GoogleService-Info.plist`

1. On the next step, click **Download GoogleService-Info.plist**.
2. Open your project in Xcode: `apps/ios/TagScribe.xcodeproj`.
3. In the Project Navigator, select the **TagScribe** group (the yellow folder).
4. Drag **GoogleService-Info.plist** into the **TagScribe** group (next to `Info.plist`).
   - Check **Copy items if needed**.
   - Ensure the **TagScribe** target is checked under “Add to targets”.
5. Click **Finish**.

## 3. Build and run

1. In Xcode, select a simulator or device.
2. Press **⌘R** to build and run.
3. You should see the **Sign in** screen. Use the same email and password as on the web app (tag-scribe.vercel.app).
4. After signing in, the library list loads; **Sign out** is in the top-right.

## 4. Enable Email/Password sign-in (if not already)

In Firebase Console → **Authentication** → **Sign-in method**, ensure **Email/Password** is **Enabled**. (Same as for the web app.)

## Troubleshooting

- **“No Firebase App ‘[DEFAULT]’ has been created”** — Add `GoogleService-Info.plist` to the app target (step 2).
- **“The operation couldn’t be completed. (auth/operation-not-allowed)”** — Enable Email/Password in Authentication → Sign-in method.
- **401 from API after sign-in** — Ensure the web API (e.g. Vercel) uses the same Firebase project and that the user exists in Firebase Auth.
