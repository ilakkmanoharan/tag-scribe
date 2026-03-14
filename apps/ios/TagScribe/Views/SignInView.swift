import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @State private var errorMessage: String?
    @State private var email = ""
    @State private var password = ""
    @State private var emailPasswordLoading = false
    @State private var isSignUp = false
    @State private var forgotPasswordEmail = ""
    @State private var showForgotPassword = false
    @State private var forgotPasswordLoading = false
    @State private var forgotPasswordLink: URL?
    @State private var showForgotSuccess = false
    @StateObject private var appleSignInRunner = AppleSignInRunner()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Button {
                        appleSignInRunner.start()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "apple.logo")
                                .font(.title2)
                            Text(appleSignInRunner.loading ? "Signing in…" : "Login with Apple")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                    .background(Color.black)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .disabled(appleSignInRunner.loading)
                } header: {
                    Text("Tag Scribe")
                }

                Section {
                    Button(isSignUp ? "Already have an account? Login" : "Need an account? Sign up") {
                        isSignUp.toggle()
                    }
                    .foregroundStyle(.blue)
                    .font(.subheadline)
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                    SecureField("Password", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                    Button(emailPasswordLoading ? "…" : (isSignUp ? "Sign up" : "Login")) {
                        Task { await submitEmailPassword() }
                    }
                    .disabled(email.isEmpty || password.isEmpty || emailPasswordLoading)
                    Button("Forgot password?") {
                        forgotPasswordEmail = email
                        showForgotPassword = true
                    }
                    .foregroundStyle(.blue)
                } header: {
                    Text("Or with email")
                } footer: {
                    Text(isSignUp ? "Have an account? Tap Login above to sign in." : "New here? Tap Sign up above to create an account.")
                        .font(.caption)
                }

                if let err = errorMessage ?? appleSignInRunner.errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .accessibilityIdentifier("signInView")
            .navigationTitle("Sign in")
            .sheet(isPresented: $showForgotPassword) {
                forgotPasswordSheet
            }
            .onOpenURL { url in
                if showForgotSuccess { showForgotSuccess = false }
            }
        }
    }

    private var forgotPasswordSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $forgotPasswordEmail)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                    Button(forgotPasswordLoading ? "Sending…" : "Send reset link") {
                        Task { await requestForgotPassword() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(forgotPasswordEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || forgotPasswordLoading)
                } header: {
                    Text("Reset password")
                } footer: {
                    if showForgotSuccess {
                        Text("If an account exists, a reset link was sent. Open the link in Safari to set a new password.")
                    }
                }
            }
            .navigationTitle("Forgot password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { showForgotPassword = false }
                }
            }
        }
    }

    private func submitEmailPassword() async {
        errorMessage = nil
        emailPasswordLoading = true
        defer { emailPasswordLoading = false }
        do {
            if isSignUp {
                try await AuthManager.shared.signUp(email: email, password: password)
            } else {
                try await AuthManager.shared.login(email: email, password: password)
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func requestForgotPassword() async {
        let email = forgotPasswordEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !email.isEmpty else { return }
        await MainActor.run { forgotPasswordLoading = true }
        do {
            let link = try await AuthManager.shared.forgotPassword(email: email)
            await MainActor.run {
                forgotPasswordLoading = false
                showForgotSuccess = true
                UIApplication.shared.open(link)
            }
        } catch {
            await MainActor.run {
                forgotPasswordLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

private final class AppleSignInRunner: NSObject, ObservableObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    @Published var errorMessage: String?
    @Published var loading = false

    func start() {
        errorMessage = nil
        loading = true
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email]
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        Task {
            do {
                try await AuthManager.shared.signInWithApple(authorization: authorization)
                await MainActor.run { loading = false }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    loading = false
                }
            }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let authError = error as NSError
        if authError.code == ASAuthorizationError.canceled.rawValue {
            errorMessage = nil
        } else {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap(\.windows)
            .first(where: { $0.isKeyWindow }) else {
            return ASPresentationAnchor()
        }
        return window
    }
}

#Preview {
    SignInView()
}
