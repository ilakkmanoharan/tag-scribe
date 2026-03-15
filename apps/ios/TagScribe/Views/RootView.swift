import SwiftUI

/// Shows SignInView when not signed in, otherwise the main library (ContentView).
struct RootView: View {
    @ObservedObject private var auth = AuthManager.shared

    var body: some View {
        if auth.isSignedIn {
            ContentView()
                .overlay(alignment: .top) {
                    if auth.lastSignInWithApple {
                        Text("Welcome back — signed in with Apple.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                            .padding(.top, 8)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                            .onAppear {
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                                    auth.lastSignInWithApple = false
                                }
                            }
                    }
                }
                .animation(.easeOut(duration: 0.25), value: auth.lastSignInWithApple)
        } else {
            SignInView()
        }
    }
}
