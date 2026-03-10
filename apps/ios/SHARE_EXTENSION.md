# Share Extension – Save links to Tag Scribe from the Share Sheet

Tag Scribe includes a **Share Extension** so users can save links directly from X, LinkedIn, Safari, and any app that uses the system Share Sheet.

## What was added

- **TagScribeShareExtension** target: appears as “Tag Scribe” in the Share Sheet when sharing a URL or link-like text.
- User taps **Share** → chooses **Tag Scribe** → optional note → **Post**. The link is saved to their library (Inbox) via the API.
- The extension uses the same Firebase Auth session as the main app (shared keychain via App Group).

## One-time setup: App Group and Keychain Sharing

For the extension to see the user’s sign-in (and for the main app to share it), you must enable the same **App Group** and **Keychain Sharing** in the Apple Developer portal and in Xcode.

1. **Apple Developer Portal**
   - Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers**.
   - Edit the **App ID** for `app.tagscribe.ios` and enable:
     - **App Groups** (add or create `group.app.tagscribe.ios`).
     - **Keychain Sharing** (same capability).
   - Create (or edit) an **App ID** for the extension `app.tagscribe.ios.TagScribeShareExtension` and enable the **same** App Group and Keychain Sharing.

2. **Xcode**
   - Select the **TagScribe** project → **Signing & Capabilities** for both the **TagScribe** app target and the **TagScribeShareExtension** target.
   - For each, ensure **App Groups** includes `group.app.tagscribe.ios` and **Keychain Sharing** includes the same group. (The entitlements files in the repo already reference `group.app.tagscribe.ios`; Xcode will sync these with the portal when you have the right App ID capabilities.)

3. **Clean and run**
   - Build and run the app on a device (or simulator). Open any app (e.g. Safari or X), share a link, and you should see **Tag Scribe** in the share options.

## Behaviour

- **Eligible content:** URLs (e.g. from Safari, X, LinkedIn) and plain text that starts with `http://` or `https://`.
- **Requirement:** The user must be signed in to Tag Scribe in the main app at least once so the shared keychain has credentials.
- **Where links go:** They are created as items with `type: "link"`, `source: "social"`, and `categoryId: "cat-inbox"` (Inbox).

## If “Tag Scribe” doesn’t appear in the Share Sheet

- Confirm the extension target is built and embedded in the app (it’s in the **Embed Foundation Extensions** phase).
- On the device, **Share** → scroll the app row or tap **Edit Actions** and enable **Tag Scribe**.
- Ensure both app and extension have the **App Group** and **Keychain Sharing** capabilities and the same group id.
