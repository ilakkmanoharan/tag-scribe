import Foundation
import FirebaseAuth

/// Provides Firebase Auth: sign in, sign up, ID token for API requests.
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var isSignedIn: Bool = false
    @Published private(set) var currentEmail: String?

    private var authStateListener: AuthStateDidChangeListenerHandle?

    private init() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.isSignedIn = user != nil
            self?.currentEmail = user?.email
        }
    }

    deinit {
        if let handle = authStateListener {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    /// Returns the Bearer token for Authorization header, or nil if not signed in.
    func getIdToken() async -> String? {
        try? await Auth.auth().currentUser?.getIDToken()
    }

    func signIn(email: String, password: String) async throws {
        try await Auth.auth().signIn(withEmail: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
    }

    func signUp(email: String, password: String) async throws {
        _ = try await Auth.auth().createUser(withEmail: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
    }

    func signOut() throws {
        try Auth.auth().signOut()
        isSignedIn = false
        currentEmail = nil
    }
}
