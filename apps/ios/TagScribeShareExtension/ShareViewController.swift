import UIKit
import UniformTypeIdentifiers
import Social

/// Share Extension: save shared URLs (and text) to Tag Scribe from the system Share Sheet.
/// Uses API JWT from app group keychain. Checks login every time; if not logged in, does not save and offers to open the app.
final class ShareViewController: SLComposeServiceViewController {

    private let apiBaseURL = "https://tag-scribe.vercel.app"
    private static let tagscribeSignInURL = URL(string: "tagscribe://signin")!
    private var sharedURL: String?
    private var sharedTitle: String?

    /// Check if user is logged in (has valid token). Called every time the extension is used.
    private var isLoggedIn: Bool {
        guard let token = JWTKeychain.load(), !token.isEmpty else { return false }
        return true
    }

    /// Which account will receive the link (for display). Nil if not logged in.
    private var currentAccountDisplay: String? {
        guard let token = JWTKeychain.load(), !token.isEmpty else { return nil }
        return Self.accountDisplay(from: token)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        extractSharedContent()
        updatePlaceholderForAuth()
    }

    private func updatePlaceholderForAuth() {
        if isLoggedIn, let account = currentAccountDisplay {
            placeholder = "Save to Library (\(account))"
        } else {
            placeholder = "Not signed in. Open Tag Scribe to sign in."
        }
    }

    private static func accountDisplay(from token: String) -> String {
        let parts = token.split(separator: ".")
        guard parts.count >= 2,
              let data = Data(base64Encoded: String(parts[1]).base64Padding()),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return "Signed in with Apple"
        }
        let email = (json["email"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let provider = json["provider"] as? String
        let isRelay = email?.lowercased().hasSuffix("@privaterelay.appleid.com") ?? true
        if email?.isEmpty ?? true || isRelay {
            return "Signed in with Apple"
        }
        let displayEmail = email ?? ""
        if provider == "apple" { return "\(displayEmail) (Apple Id)" }
        if provider == "email" { return "\(displayEmail) (Email)" }
        return displayEmail.isEmpty ? "Signed in with Apple" : displayEmail
    }

    private func extractSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else { return }
        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    _ = provider.loadObject(ofClass: URL.self) { [weak self] url, _ in
                        DispatchQueue.main.async {
                            self?.sharedURL = url?.absoluteString
                            self?.sharedTitle = url?.host ?? url?.absoluteString
                            self?.reloadConfigurationItems()
                        }
                    }
                    return
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    _ = provider.loadObject(ofClass: String.self) { [weak self] text, _ in
                        DispatchQueue.main.async {
                            if let s = text?.trimmingCharacters(in: .whitespacesAndNewlines),
                               s.hasPrefix("http://") || s.hasPrefix("https://") {
                                self?.sharedURL = s
                                self?.sharedTitle = URL(string: s)?.host ?? s
                            }
                            self?.reloadConfigurationItems()
                        }
                    }
                    return
                }
            }
        }
    }

    override func isContentValid() -> Bool {
        return sharedURL != nil && !(sharedURL?.isEmpty ?? true)
    }

    override func didSelectPost() {
        guard let urlString = sharedURL, !urlString.isEmpty else {
            finishWithError("No link to save.")
            return
        }
        guard isLoggedIn else {
            promptToSignInAndOpenApp()
            return
        }
        let userTypedTitle = (contentText ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let displayTitle = userTypedTitle.isEmpty ? sharedTitle : userTypedTitle
        Task {
            do {
                try await saveLink(url: urlString, title: displayTitle)
                await MainActor.run { extensionContext?.completeRequest(returningItems: nil, completionHandler: nil) }
            } catch {
                if (error as NSError).code == 401 {
                    await MainActor.run { promptToSignInAndOpenApp() }
                } else {
                    await MainActor.run { finishWithError(error.localizedDescription) }
                }
            }
        }
    }

    /// Show alert and open main app for sign-in; then cancel the share. Do not save when logged out.
    private func promptToSignInAndOpenApp() {
        let alert = UIAlertController(
            title: "Sign in required",
            message: "You’re not signed in to Tag Scribe. Open the app to sign in, then try sharing again.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in
            self?.extensionContext?.cancelRequest(withError: NSError(domain: "ShareViewController", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in required."]))
        })
        alert.addAction(UIAlertAction(title: "Open Tag Scribe", style: .default) { [weak self] _ in
            self?.openMainAppForSignIn()
            self?.extensionContext?.cancelRequest(withError: NSError(domain: "ShareViewController", code: 401, userInfo: [NSLocalizedDescriptionKey: "Sign in required."]))
        })
        present(alert, animated: true)
    }

    private func openMainAppForSignIn() {
        extensionContext?.open(Self.tagscribeSignInURL, completionHandler: nil)
    }

    private func saveLink(url: String, title: String?) async throws {
        guard let token = JWTKeychain.load(), !token.isEmpty else {
            throw NSError(domain: "ShareViewController", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in to Tag Scribe first."])
        }
        let endpoint = URL(string: apiBaseURL + "/api/items")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = [
            "type": "link",
            "content": url,
            "title": title ?? url,
            "categoryId": "cat-inbox",
            "source": "social"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { return }
        if http.statusCode == 401 {
            throw NSError(domain: "ShareViewController", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in to Tag Scribe first."])
        }
        if http.statusCode != 200 {
            throw NSError(domain: "ShareViewController", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: "Could not save link (\(http.statusCode))."])
        }
    }

    private func finishWithError(_ message: String) {
        let error = NSError(domain: "ShareViewController", code: -1, userInfo: [NSLocalizedDescriptionKey: message])
        extensionContext?.cancelRequest(withError: error)
    }

    override func configurationItems() -> [Any]! {
        return []
    }
}

private extension String {
    func base64Padding() -> String {
        var s = self
        s = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        let remainder = s.count % 4
        if remainder > 0 { s += String(repeating: "=", count: 4 - remainder) }
        return s
    }
}
