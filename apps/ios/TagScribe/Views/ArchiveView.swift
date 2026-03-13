import SwiftUI

/// Archive tab: archived items. Shows empty state when none.
struct ArchiveView: View {
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
                }
                .padding()
            } else if items.isEmpty {
                VStack(spacing: 12) {
                    Text("No archived items.")
                        .font(.headline)
                    Text("Use Archive on any item in the Library to move it here.")
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
                            isArchived: true,
                            onUpdated: { await load() },
                            onDeleted: { Task { await load() } }
                        )
                    }
                }
            }
        }
        .navigationTitle("Archive")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            async let itemsTask = APIClient.shared.getItems(archived: true)
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
    NavigationStack { ArchiveView() }
}
