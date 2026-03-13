import SwiftUI

/// Main app content: tabbed UI (Library, Archive, Categories, Tags, Add) matching web. Sign out in each tab's toolbar.
struct ContentView: View {
    var body: some View {
        TabView {
            tab(NavigationStack { LibraryView().toolbar { signOutToolbar } }, title: "Library", systemImage: "book.pages")
            tab(NavigationStack { ArchiveView().toolbar { signOutToolbar } }, title: "Archive", systemImage: "archivebox")
            tab(NavigationStack { CategoriesView().toolbar { signOutToolbar } }, title: "Categories", systemImage: "folder")
            tab(NavigationStack { TagsView().toolbar { signOutToolbar } }, title: "Tags", systemImage: "tag")
            tab(NavigationStack { AddView().toolbar { signOutToolbar } }, title: "Add", systemImage: "plus.circle")
        }
    }

    private var signOutToolbar: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button("Sign out") { AuthManager.shared.signOut() }
        }
    }

    private func tab<Content: View>(_ content: Content, title: String, systemImage: String) -> some View {
        content
            .tabItem { Label(title, systemImage: systemImage) }
    }
}

#Preview {
    ContentView()
}
