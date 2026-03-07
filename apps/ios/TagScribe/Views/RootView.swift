import SwiftUI

/// Shows SignInView when not signed in, otherwise the main library (ContentView).
struct RootView: View {
    @ObservedObject private var auth = AuthManager.shared

    var body: some View {
        if auth.isSignedIn {
            ContentView()
        } else {
            SignInView()
        }
    }
}
