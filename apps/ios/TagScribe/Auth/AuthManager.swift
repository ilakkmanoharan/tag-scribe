import Foundation
import AuthenticationServices
import os.log

/// iOS auth: Sign in with Apple → API JWT. No Firebase in the app.
/// Token is stored in app group keychain for the share extension.
final class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    private static let authLog = Logger(subsystem: Bundle.main.bundleIdentifier ?? "TagScribe", category: "Auth")

    @Published private(set) var isSignedIn: Bool = false
    @Published private(set) var currentEmail: String?
    /// Set briefly after Apple sign-in so UI can show "Welcome back — signed in with Apple."
    @Published var lastSignInWithApple: Bool = false

    private let apiBaseURL = "https://tag-scribe.vercel.app"
    /// Auth requests: explicit timeout for slow / offline networks (App Review).
    private static let authRequestTimeout: TimeInterval = 45
    private static let privateRelaySuffix = "@privaterelay.appleid.com"

    override private init() {
        super.init()
        updateStateFromKeychain()
    }

    private func updateStateFromKeychain() {
        if let token = JWTKeychain.load() {
            isSignedIn = !token.isEmpty
            currentEmail = decodeJwtPayload(token)?.email
        } else {
            isSignedIn = false
            currentEmail = nil
        }
    }

    /// Decode email and provider from JWT payload (base64 middle part). Best-effort; for display only.
    private func decodeJwtPayload(_ token: String) -> (email: String?, provider: String?)? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        guard let data = Data(base64Encoded: String(parts[1]).base64Padding()) else { return nil }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        let email = json["email"] as? String
        let provider = json["provider"] as? String
        return (email, provider)
    }

    /// User-facing account label for Settings. Hides private relay / internal identifiers; shows e.g. "ilakkmanoharan@gmail.com (Apple Id)" or "Signed in with Apple".
    var accountDisplayLabel: String {
        guard let token = JWTKeychain.load(), !token.isEmpty,
              let payload = decodeJwtPayload(token) else { return "Signed in with Apple" }
        let email = payload.email?.trimmingCharacters(in: .whitespacesAndNewlines)
        let isRelay = email?.lowercased().hasSuffix(Self.privateRelaySuffix) ?? true
        if email?.isEmpty ?? true || isRelay {
            return "Signed in with Apple"
        }
        let displayEmail = email ?? ""
        if payload.provider == "apple" {
            return "\(displayEmail) (Apple Id)"
        }
        if payload.provider == "email" {
            return "\(displayEmail) (Email)"
        }
        return displayEmail.isEmpty ? "Signed in with Apple" : displayEmail
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
            Self.authLog.error("AUTH apple: invalid credential")
            throw AuthError.invalidAppleCredential
        }

        let url = URL(string: apiBaseURL + "/api/auth/apple")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["identityToken": identityToken])

        let (data, http) = try await performAuthData(request: request, operation: "apple")
        if http.statusCode == 401 {
            Self.authLog.error("AUTH apple: HTTP 401")
            throw AuthError.invalidAppleToken
        }
        if http.statusCode != 200 {
            Self.authLog.error("AUTH apple: HTTP \(http.statusCode)")
            throw AuthError.serverError(http.statusCode)
        }

        struct AppleAuthResponse: Decodable { let token: String }
        let decoded = try JSONDecoder().decode(AppleAuthResponse.self, from: data)
        guard JWTKeychain.save(decoded.token) else {
            Self.authLog.error("AUTH apple: keychain save failed")
            throw AuthError.couldNotSaveToken
        }
        Self.authLog.info("AUTH apple: success")
        await MainActor.run {
            updateStateFromKeychain()
            lastSignInWithApple = true
        }
    }

    func signOut() {
        JWTKeychain.delete()
        isSignedIn = false
        currentEmail = nil
        lastSignInWithApple = false
    }

    /// Login with email + password via API. Saves returned JWT.
    func login(email: String, password: String) async throws {
        let url = URL(string: apiBaseURL + "/api/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
        let (data, http) = try await performAuthData(request: request, operation: "login")
        if http.statusCode == 401 {
            Self.authLog.error("AUTH login: HTTP 401")
            throw AuthError.invalidEmailPassword
        }
        if http.statusCode != 200 {
            Self.authLog.error("AUTH login: HTTP \(http.statusCode)")
            throw AuthError.serverError(http.statusCode)
        }
        struct LoginResponse: Decodable { let token: String }
        let decoded = try JSONDecoder().decode(LoginResponse.self, from: data)
        guard JWTKeychain.save(decoded.token) else {
            Self.authLog.error("AUTH login: keychain save failed")
            throw AuthError.couldNotSaveToken
        }
        Self.authLog.info("AUTH login: success")
        await MainActor.run { updateStateFromKeychain() }
    }

    /// Sign up with email + password via API. 409 = User already exists, please Login.
    func signUp(email: String, password: String) async throws {
        let url = URL(string: apiBaseURL + "/api/auth/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
        let (data, http) = try await performAuthData(request: request, operation: "signup")
        if http.statusCode == 409 {
            Self.authLog.error("AUTH signup: HTTP 409 user exists")
            throw AuthError.userAlreadyExists
        }
        if http.statusCode != 200 {
            Self.authLog.error("AUTH signup: HTTP \(http.statusCode)")
            throw AuthError.serverError(http.statusCode)
        }
        struct SignUpResponse: Decodable { let token: String }
        let decoded = try JSONDecoder().decode(SignUpResponse.self, from: data)
        guard JWTKeychain.save(decoded.token) else {
            Self.authLog.error("AUTH signup: keychain save failed")
            throw AuthError.couldNotSaveToken
        }
        Self.authLog.info("AUTH signup: success")
        await MainActor.run { updateStateFromKeychain() }
    }

    /// Forgot password: get reset link from API, open in Safari.
    func forgotPassword(email: String) async throws -> URL {
        let url = URL(string: apiBaseURL + "/api/auth/forgot-password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines)])
        let (data, http) = try await performAuthData(request: request, operation: "forgot-password")
        if http.statusCode != 200 {
            Self.authLog.error("AUTH forgot-password: HTTP \(http.statusCode)")
            throw AuthError.serverError(http.statusCode)
        }
        struct ForgotResponse: Decodable { let link: String }
        let decoded = try JSONDecoder().decode(ForgotResponse.self, from: data)
        guard let linkURL = URL(string: decoded.link) else {
            Self.authLog.error("AUTH forgot-password: invalid link in response")
            throw AuthError.networkError
        }
        Self.authLog.info("AUTH forgot-password: success")
        return linkURL
    }

    /// Merge current account with email/password account. Requires valid JWT.
    func mergeAccounts(email: String, password: String) async throws {
        guard let token = JWTKeychain.load(), !token.isEmpty else { throw AuthError.invalidEmailPassword }
        let url = URL(string: apiBaseURL + "/api/auth/merge-accounts")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
        let (_, http) = try await performAuthData(request: request, operation: "merge-accounts")
        if http.statusCode == 401 {
            throw AuthError.invalidEmailPassword
        }
        if http.statusCode != 200 {
            throw AuthError.serverError(http.statusCode)
        }
        Self.authLog.info("AUTH merge-accounts: success")
    }

    /// Delete account via API. Call signOut() after success.
    func deleteAccount() async throws {
        guard let token = JWTKeychain.load(), !token.isEmpty else { throw AuthError.unauthorized }
        let url = URL(string: apiBaseURL + "/api/auth/delete-account")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, http) = try await performAuthData(request: request, operation: "delete-account")
        if http.statusCode != 200 {
            throw AuthError.serverError(http.statusCode)
        }
        Self.authLog.info("AUTH delete-account: success")
    }

    /// Shared auth HTTP: timeout, logging, URLError → user-facing errors.
    private func performAuthData(request: URLRequest, operation: String) async throws -> (Data, HTTPURLResponse) {
        var req = request
        req.timeoutInterval = Self.authRequestTimeout
        Self.authLog.info("AUTH \(operation): request start url=\(req.url?.absoluteString ?? "", privacy: .public)")
        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else {
                Self.authLog.error("AUTH \(operation): non-HTTP response")
                throw AuthError.networkError
            }
            Self.authLog.info("AUTH \(operation): response status=\(http.statusCode) bytes=\(data.count)")
            return (data, http)
        } catch let urlError as URLError {
            Self.authLog.error("AUTH \(operation): URLError code=\(urlError.code.rawValue) \(urlError.localizedDescription, privacy: .public)")
            throw AuthError.from(urlError: urlError)
        } catch let authError as AuthError {
            throw authError
        } catch {
            Self.authLog.error("AUTH \(operation): \(String(describing: error), privacy: .public)")
            throw AuthError.networkError
        }
    }
}

enum AuthError: LocalizedError {
    case invalidAppleCredential
    case invalidAppleToken
    case invalidEmailPassword
    case networkError
    /// No connectivity (App Review–friendly copy).
    case offline
    /// Request timed out.
    case timeout
    /// DNS / cannot reach host.
    case cannotReachServer
    case serverError(Int)
    case couldNotSaveToken
    case userAlreadyExists
    case unauthorized

    static func from(urlError: URLError) -> AuthError {
        switch urlError.code {
        case .notConnectedToInternet, .dataNotAllowed, .callIsActive:
            return .offline
        case .timedOut:
            return .timeout
        case .cannotFindHost, .dnsLookupFailed, .cannotConnectToHost, .networkConnectionLost:
            return .cannotReachServer
        case .cancelled:
            return .networkError
        default:
            return .networkError
        }
    }

    var errorDescription: String? {
        switch self {
        case .invalidAppleCredential: return "Invalid Sign in with Apple credential."
        case .invalidAppleToken: return "Apple sign-in was not recognized. Try again."
        case .invalidEmailPassword: return "Invalid email or password."
        case .networkError: return "Unable to connect. Please check your internet and try again."
        case .offline: return "Unable to connect. Please check your internet."
        case .timeout: return "The request timed out. Check your connection and try again."
        case .cannotReachServer: return "Unable to reach the server. Check your internet and try again."
        case .serverError(let code): return "Server error (\(code)). Try again later."
        case .couldNotSaveToken: return "Could not save sign-in. Try again."
        case .userAlreadyExists: return "User already exists, please Login"
        case .unauthorized: return "Please sign in first."
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
