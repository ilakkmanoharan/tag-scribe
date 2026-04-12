import SwiftUI

/// Main app content: tabbed UI (Library, Archive, Categories, Tags, Lists, Add, Settings).
struct ContentView: View {
    var body: some View {
        TabView {
            tab(NavigationStack { LibraryView().toolbar { toolbarContent } }, title: "Library", systemImage: "book.pages")
            tab(NavigationStack { ArchiveView().toolbar { toolbarContent } }, title: "Archive", systemImage: "archivebox")
            tab(NavigationStack { CategoriesView().toolbar { toolbarContent } }, title: "Categories", systemImage: "folder")
            tab(NavigationStack { TagsView().toolbar { toolbarContent } }, title: "Tags", systemImage: "tag")
            tab(NavigationStack { ListsView().toolbar { toolbarContent } }, title: "Lists", systemImage: "list.bullet.rectangle")
            tab(NavigationStack { AddView().toolbar { toolbarContent } }, title: "Add", systemImage: "plus.circle")
            tab(NavigationStack { SettingsView() }, title: "Settings", systemImage: "gearshape")
        }
    }

    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            NavigationLink(destination: SettingsView()) {
                Image(systemName: "gearshape")
            }
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
