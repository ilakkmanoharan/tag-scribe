import SwiftUI

struct SignInView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var errorMessage: String?
    @State private var loading = false
    @FocusState private var focusedField: Field?

    enum Field { case email, password }

    private var emailField: some View {
        Group {
            #if os(iOS)
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
                .focused($focusedField, equals: .email)
            #else
            TextField("Email", text: $email)
                .focused($focusedField, equals: .email)
            #endif
        }
    }

    private var passwordField: some View {
        Group {
            #if os(iOS)
            SecureField("Password", text: $password)
                .textContentType(isSignUp ? .newPassword : .password)
                .focused($focusedField, equals: .password)
            #else
            SecureField("Password", text: $password)
                .focused($focusedField, equals: .password)
            #endif
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    emailField
                    passwordField
                } header: {
                    Text("Tag Scribe")
                } footer: {
                    if isSignUp {
                        Text("Create an account with email and password. Use the same credentials on the web app.")
                    } else {
                        Text("Sign in with the same email and password you use on tag-scribe.vercel.app.")
                    }
                }

                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button {
                        submit()
                    } label: {
                        HStack {
                            if loading {
                                ProgressView()
                                    .scaleEffect(0.9)
                            }
                            Text(isSignUp ? "Sign up" : "Sign in")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(loading || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)

                    Button {
                        isSignUp.toggle()
                        errorMessage = nil
                    } label: {
                        Text(isSignUp ? "Already have an account? Sign in" : "Create an account")
                            .font(.subheadline)
                    }
                    .buttonStyle(.borderless)
                }
            }
            .accessibilityIdentifier("signInView")
            .navigationTitle(isSignUp ? "Sign up" : "Sign in")
            .onSubmit { submit() }
        }
    }

    private func submit() {
        focusedField = nil
        errorMessage = nil
        loading = true
        Task {
            do {
                if isSignUp {
                    try await AuthManager.shared.signUp(email: email, password: password)
                } else {
                    try await AuthManager.shared.signIn(email: email, password: password)
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    loading = false
                }
            }
            await MainActor.run { loading = false }
        }
    }
}

#Preview {
    SignInView()
}
