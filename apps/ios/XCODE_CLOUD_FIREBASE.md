# Xcode Cloud: Use real Firebase (GoogleService-Info.plist)

So TestFlight builds can sign in with your real Firebase project, add your `GoogleService-Info.plist` as a **secret** in Xcode Cloud. The build Run Script will write it when the env var is set.

## 1. Encode your plist (base64)

On your Mac, in Terminal:

```bash
cd /path/to/tag-scribe/apps/ios
base64 -i GoogleService-Info.plist | pbcopy
```

Or to save to a file:

```bash
base64 -i GoogleService-Info.plist -o /tmp/GoogleService-Info.b64.txt
```

Use the contents of the clipboard (or the `.b64.txt` file) in the next step.

## 2. Add secret in App Store Connect

1. Open **App Store Connect** → **Apps** → **TagScribe** → **Xcode Cloud**.
2. Go to **Manage Workflows** → open your workflow (e.g. **Default**).
3. In **Environment**, find **Environment Variables** → **Add**.
4. **Name:** `GOOGLE_SERVICE_INFO_PLIST`
5. **Value:** Paste the base64 string (the whole single line from step 1).
6. **Check “Secret”** so the value is not shown in logs.
7. **Save** the workflow.

## 3. Run a new build

Start a new build (e.g. **Start Build** → **main**). The Run Script will decode `GOOGLE_SERVICE_INFO_PLIST` and write `GoogleService-Info.plist` before the app is built, so the bundle will contain your real Firebase config.

- **If the secret is set:** Real plist is used → Firebase sign-in works in TestFlight.
- **If the secret is not set:** Placeholder plist is used (or your local file if building on your Mac) → build still succeeds but TestFlight won’t use your real project.
