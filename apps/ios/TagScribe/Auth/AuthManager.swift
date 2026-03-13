import Foundation
import AuthenticationServices

/// iOS auth: Sign in with Apple → API JWT. No Firebase in the app.
/// Token is stored in app group keychain for the share extension.
final class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var isSignedIn: Bool = false
    @Published private(set) var currentEmail: String?

    private let apiBaseURL = "https://tag-scribe.vercel.app"

    override private init() {
        super.init()
        updateStateFromKeychain()
    }

    private func updateStateFromKeychain() {
        if let token = JWTKeychain.load() {
            isSignedIn = !token.isEmpty
            currentEmail = decodeEmailFromJWT(token)
        } else {
            isSignedIn = false
            currentEmail = nil
        }
    }

    /// Decode email from JWT payload (base64 middle part). Best-effort; used for display only.
    private func decodeEmailFromJWT(_ token: String) -> String? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        guard let data = Data(base64Encoded: String(parts[1]).base64Padding()) else { return nil }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let email = json["email"] as? String else { return nil }
        return email
    }

    /// Returns the stored JWT for API Authorization header, or nil if not signed in.
    func getToken() -> String? {
        JWTKeychain.load()
    }

    /// Returns the Bearer token for Authorization header (async for consistency with previous API).
    func getIdToken() async -> String? {
        JWTKeychain.load()
    }

    /// Sign in with Apple: request credential, send identity token to API, store returned JWT.
    func signInWithApple(authorization: ASAuthorization) async throws {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            throw AuthError.invalidAppleCredential
        }

        let url = URL(string: apiBaseURL + "/api/auth/apple")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(with: ["identityToken": identityToken])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthError.networkError }

        if http.statusCode == 401 {
            throw AuthError.invalidAppleToken
        }
        if http.statusCode != 200 {
            throw AuthError.serverError(http.statusCode)
        }

        struct AppleAuthResponse: Decodable { let token: String }
        let decoded = try JSONDecoder().decode(AppleAuthResponse.self, from: data)
        guard JWTKeychain.save(decoded.token) else {
            throw AuthError.couldNotSaveToken
        }
        await MainActor.run { updateStateFromKeychain() }
    }

    func signOut() {
        JWTKeychain.delete()
        isSignedIn = false
        currentEmail = nil
    }
}

enum AuthError: LocalizedError {
    case invalidAppleCredential
    case invalidAppleToken
    case networkError
    case serverError(Int)
    case couldNotSaveToken

    var errorDescription: String? {
        switch self {
        case .invalidAppleCredential: return "Invalid Sign in with Apple credential."
        case .invalidAppleToken: return "Apple sign-in was not recognized. Try again."
        case .networkError: return "Network error. Check your connection."
        case .serverError(let code): return "Server error (\(code)). Try again later."
        case .couldNotSaveToken: return "Could not save sign-in. Try again."
        }
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
