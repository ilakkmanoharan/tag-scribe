import UIKit
import UniformTypeIdentifiers
import Social
import FirebaseCore
import FirebaseAuth

/// Share Extension: save shared URLs (and text) to Tag Scribe from the system Share Sheet.
final class ShareViewController: SLComposeServiceViewController {

    private let apiBaseURL = "https://tag-scribe.vercel.app"
    private var sharedURL: String?
    private var sharedTitle: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        FirebaseApp.configure()
        try? Auth.auth().useUserAccessGroup("group.app.tagscribe.ios")
        extractSharedContent()
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
        Task {
            do {
                try await saveLink(url: urlString, title: sharedTitle)
                await MainActor.run { extensionContext?.completeRequest(returningItems: nil, completionHandler: nil) }
            } catch {
                await MainActor.run { finishWithError(error.localizedDescription) }
            }
        }
    }

    private func saveLink(url: String, title: String?) async throws {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "ShareViewController", code: 401, userInfo: [NSLocalizedDescriptionKey: "Please sign in to Tag Scribe first."])
        }
        let token: String
        do {
            token = try await user.getIDToken()
        } catch {
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
