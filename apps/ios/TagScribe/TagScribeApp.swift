import SwiftUI
import FirebaseCore
import FirebaseAuth

@main
struct TagScribeApp: App {
    init() {
        FirebaseApp.configure()
        try? Auth.auth().useUserAccessGroup("group.app.tagscribe.ios")
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
