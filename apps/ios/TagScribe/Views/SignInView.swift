import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @State private var errorMessage: String?
    @State private var loading = false
    @State private var email = ""
    @State private var password = ""
    @State private var emailPasswordLoading = false
    @State private var isSignUp = false
    @State private var forgotPasswordEmail = ""
    @State private var showForgotPassword = false
    @State private var forgotPasswordLink: URL?
    @State private var showForgotSuccess = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SignInWithAppleButtonView(errorMessage: $errorMessage, loading: $loading)
                } header: {
                    Text("Tag Scribe")
                } footer: {
                    Text("Sign in with Apple to use your library on this device and in the Share Sheet. Your account is the same as on the web.")
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
                    Button(isSignUp ? "Already have an account? Login" : "No account? Sign up") {
                        isSignUp.toggle()
                    }
                    .foregroundStyle(.blue)
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

                if let err = errorMessage {
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
                    Button("Send reset link") {
                        Task { await requestForgotPassword() }
                    }
                    .disabled(forgotPasswordEmail.isEmpty)
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
        do {
            let link = try await AuthManager.shared.forgotPassword(email: forgotPasswordEmail)
            await MainActor.run {
                showForgotSuccess = true
                UIApplication.shared.open(link)
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }
}

private struct SignInWithAppleButtonView: View {
    @Binding var errorMessage: String?
    @Binding var loading: Bool

    var body: some View {
        SignInWithAppleButtonRepresentable(errorMessage: $errorMessage, loading: $loading)
            .frame(height: 50)
            .frame(maxWidth: .infinity)
    }
}

private struct SignInWithAppleButtonRepresentable: UIViewRepresentable {
    @Binding var errorMessage: String?
    @Binding var loading: Bool

    func makeUIView(context: Context) -> ASAuthorizationAppleIDButton {
        let button = ASAuthorizationAppleIDButton(type: .signIn, style: .black)
        button.cornerRadius = 8
        button.addTarget(context.coordinator, action: #selector(Coordinator.handleTap), for: .touchUpInside)
        return button
    }

    func updateUIView(_ uiView: ASAuthorizationAppleIDButton, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        let parent: SignInWithAppleButtonRepresentable

        init(_ parent: SignInWithAppleButtonRepresentable) {
            self.parent = parent
        }

        @objc func handleTap() {
            parent.errorMessage = nil
            parent.loading = true
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
                    await MainActor.run { parent.loading = false }
                } catch {
                    await MainActor.run {
                        parent.errorMessage = error.localizedDescription
                        parent.loading = false
                    }
                }
            }
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            let authError = error as NSError
            if authError.code == ASAuthorizationError.canceled.rawValue {
                parent.errorMessage = nil
            } else {
                parent.errorMessage = error.localizedDescription
            }
            parent.loading = false
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
}

#Preview {
    SignInView()
}
