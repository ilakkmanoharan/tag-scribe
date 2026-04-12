import SwiftUI

/// Lists tab: named lists created in Library (multi-select). Data is loaded only for the signed-in user via `/api/lists`.
struct ListsView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var lists: [SavedList] = []
    @State private var errorMessage: String?
    @State private var loading = true

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
                    Text("Sign in to see your lists.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding()
            } else if lists.isEmpty {
                VStack(spacing: 12) {
                    Text("No lists yet.")
                        .font(.headline)
                    Text("In Library, tap Select, choose items, then Create list.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(lists) { list in
                        NavigationLink {
                            SavedListDetailView(list: list)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(list.name)
                                    .font(.body)
                                Text("\(list.itemIds.count) items")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 2)
                        }
                    }
                }
            }
        }
        .navigationTitle("Lists")
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await load() }
            }
        }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            lists = try await APIClient.shared.getLists()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Items in a saved list (same order as `itemIds`; omits missing or deleted items).
private struct SavedListDetailView: View {
    let list: SavedList
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var errorMessage: String?
    @State private var loading = true

    private var orderedItems: [Item] {
        let byId = Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
        return list.itemIds.compactMap { byId[$0] }
    }

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
                Text(err)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
            } else if orderedItems.isEmpty {
                VStack(spacing: 12) {
                    Text("No items in this list.")
                        .font(.headline)
                    Text("Items may have been removed from your library.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(orderedItems) { item in
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
        .navigationTitle(list.name)
        .navigationBarTitleDisplayMode(.inline)
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
    NavigationStack { ListsView() }
}
