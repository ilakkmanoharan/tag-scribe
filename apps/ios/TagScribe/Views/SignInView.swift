import SwiftUI
import AuthenticationServices

enum AuthTab: String, CaseIterable {
    case signIn = "Sign In"
    case login = "Log In"
}

struct SignInView: View {
    @State private var selectedTab: AuthTab = .login
    @State private var errorMessage: String?
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var emailPasswordLoading = false
    @State private var forgotPasswordEmail = ""
    @State private var showForgotPassword = false
    @State private var forgotPasswordLoading = false
    @State private var showForgotSuccess = false
    @StateObject private var appleSignInRunner = AppleSignInRunner()

    // Inline validation (Sign In)
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var confirmPasswordError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Tag Scribe")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                } header: {
                    EmptyView()
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 4, trailing: 0))

                Section {
                    tabSwitcher
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 16, trailing: 16))

                switch selectedTab {
                case .signIn:
                    signInTabContent
                case .login:
                    loginTabContent
                }

                if let err = errorMessage ?? appleSignInRunner.errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .listRowBackground(Color.red.opacity(0.1))
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
            .animation(.easeInOut(duration: 0.2), value: selectedTab)
        }
    }

    // MARK: - Tab Switcher (44pt height, 12pt radius, systemGray6)
    private var tabSwitcher: some View {
        HStack(spacing: 0) {
            ForEach(AuthTab.allCases, id: \.self) { tab in
                Button {
                    clearErrors()
                    selectedTab = tab
                } label: {
                    Text(tab.rawValue)
                        .font(selectedTab == tab ? .headline.weight(.semibold) : .body)
                        .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .buttonStyle(.plain)
                .background(
                    Group {
                        if selectedTab == tab {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(.systemBackground))
                                .shadow(color: .black.opacity(0.06), radius: 2, x: 0, y: 1)
                        } else {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color.clear)
                        }
                    }
                )
                .accessibilityLabel(selectedTab == tab ? "\(tab.rawValue) tab selected" : "Switch to \(tab.rawValue) tab")
            }
        }
        .padding(4)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Sign In Tab (Create Account)
    private var signInTabContent: some View {
        Group {
            Section {
                appleButton(label: "Sign in with Apple")
            } header: {
                EmptyView()
            }

            Section {
                dividerText("or with email")
            }
            .listRowBackground(Color.clear)

            Section {
                emailField
                if let msg = emailError {
                    Text(msg).font(.caption).foregroundStyle(.red)
                }
                passwordField(isNew: true)
                if let msg = passwordError {
                    Text(msg).font(.caption).foregroundStyle(.red)
                }
                confirmPasswordField
                if let msg = confirmPasswordError {
                    Text(msg).font(.caption).foregroundStyle(.red)
                }
                Button(emailPasswordLoading ? "Creating…" : "Create Account") {
                    Task { await submitSignUp() }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .disabled(!signUpFormValid || emailPasswordLoading)
                .buttonStyle(.borderedProminent)
                Button("Already have an account? Log In") {
                    clearErrors()
                    selectedTab = .login
                }
                .foregroundStyle(.blue)
                .font(.subheadline)
            } header: {
                EmptyView()
            }
        }
    }

    // MARK: - Log In Tab (Existing User)
    private var loginTabContent: some View {
        Group {
            Section {
                appleButton(label: "Sign in with Apple")
            } header: {
                EmptyView()
            }

            Section {
                dividerText("or with email")
            }
            .listRowBackground(Color.clear)

            Section {
                emailField
                passwordField(isNew: false)
                Button(emailPasswordLoading ? "Signing in…" : "Log In") {
                    Task { await submitLogin() }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .disabled(!loginFormValid || emailPasswordLoading)
                .buttonStyle(.borderedProminent)
                Button("Forgot password?") {
                    forgotPasswordEmail = email
                    showForgotPassword = true
                }
                .foregroundStyle(.blue)
                Button("New here? Sign In") {
                    clearErrors()
                    selectedTab = .signIn
                }
                .foregroundStyle(.blue)
                .font(.subheadline)
            } header: {
                EmptyView()
            }
        }
    }

    private func appleButton(label: String) -> some View {
        Button {
            appleSignInRunner.start()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "apple.logo")
                    .font(.title2)
                Text(appleSignInRunner.loading ? "Signing in…" : label)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .background(Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .disabled(appleSignInRunner.loading)
        .accessibilityLabel(label)
    }

    private func dividerText(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(Color(.systemGray2))
            .frame(maxWidth: .infinity)
    }

    private var emailField: some View {
        TextField("Email", text: $email)
            .textContentType(.emailAddress)
            .autocapitalization(.none)
    }

    private func passwordField(isNew: Bool) -> some View {
        SecureField("Password", text: $password)
            .textContentType(isNew ? .newPassword : .password)
    }

    private var confirmPasswordField: some View {
        SecureField("Confirm Password", text: $confirmPassword)
            .textContentType(.newPassword)
    }

    private var signUpFormValid: Bool {
        let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
        return !e.isEmpty && !password.isEmpty && password == confirmPassword
    }

    private var loginFormValid: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
    }

    private func clearErrors() {
        errorMessage = nil
        appleSignInRunner.errorMessage = nil
        emailError = nil
        passwordError = nil
        confirmPasswordError = nil
    }

    private func validateSignUp() -> Bool {
        emailError = nil
        passwordError = nil
        confirmPasswordError = nil
        let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if e.isEmpty {
            emailError = "Email is required."
            return false
        }
        if !e.contains("@") || !e.contains(".") {
            emailError = "Invalid email."
            return false
        }
        if password.count < 6 {
            passwordError = "Password must be at least 6 characters."
            return false
        }
        if password != confirmPassword {
            confirmPasswordError = "Passwords don't match."
            return false
        }
        return true
    }

    private func submitSignUp() async {
        guard validateSignUp() else { return }
        errorMessage = nil
        emailPasswordLoading = true
        defer { emailPasswordLoading = false }
        do {
            try await AuthManager.shared.signUp(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func submitLogin() async {
        errorMessage = nil
        emailPasswordLoading = true
        defer { emailPasswordLoading = false }
        do {
            try await AuthManager.shared.login(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
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
                    .disabled(!isForgotPasswordEmailValid || forgotPasswordLoading)
                } header: {
                    Text("Reset password")
                } footer: {
                    if showForgotSuccess {
                        Text("If an account exists, a reset link was sent. Open the link in Safari to set a new password.")
                    }
                }
            }
            .onAppear {
                if forgotPasswordEmail.isEmpty, !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    forgotPasswordEmail = email
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

    /// True when the forgot-password email field contains a valid-looking address (so "Send reset link" can be enabled).
    private var isForgotPasswordEmailValid: Bool {
        let s = forgotPasswordEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty, s.contains("@"), s.contains(".") else { return false }
        let parts = s.split(separator: "@", maxSplits: 1, omittingEmptySubsequences: false)
        return parts.count == 2 && !parts[0].isEmpty && parts[1].contains(".")
    }

    private func requestForgotPassword() async {
        let emailToUse = forgotPasswordEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !emailToUse.isEmpty else { return }
        await MainActor.run { forgotPasswordLoading = true }
        do {
            let link = try await AuthManager.shared.forgotPassword(email: emailToUse)
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

// MARK: - Apple Sign In Runner
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
