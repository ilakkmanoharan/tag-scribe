import SwiftUI
import FirebaseCore

@main
struct TagScribeApp: App {
    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
