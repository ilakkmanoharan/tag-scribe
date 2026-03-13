import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @State private var errorMessage: String?
    @State private var loading = false

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
