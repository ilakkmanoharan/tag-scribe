import SwiftUI

/// Library tab: all saved items. Expandable rows with link, tags, Add tag, Archive, Move, Delete.
struct LibraryView: View {
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var errorMessage: String?
    @State private var loading = true

    private func categoryName(for id: String?) -> String? {
        guard let id = id else { return nil }
        return categories.first(where: { $0.id == id })?.name
    }

    var body: some View {
        Group {
            if loading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack(spacing: 12) {
                    Text(err)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Text("Sign in on the web app to see your library here.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding()
            } else if items.isEmpty {
                VStack(spacing: 12) {
                    Text("No items yet.")
                        .font(.headline)
                    Text("Add from the Share Sheet or use Add to paste a link.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(items) { item in
                        LibraryItemRow(
                            item: item,
                            categoryName: categoryName(for: item.categoryId),
                            existingTags: existingTags,
                            categories: categories,
                            onUpdated: { await load() },
                            onDeleted: { Task { await load() } }
                        )
                    }
                }
            }
        }
        .navigationTitle("Library")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            async let itemsTask = APIClient.shared.getItems()
            async let categoriesTask = APIClient.shared.getCategories()
            async let tagsTask = APIClient.shared.getTags()
            items = try await itemsTask
            categories = try await categoriesTask
            existingTags = try await tagsTask
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack { LibraryView() }
}
