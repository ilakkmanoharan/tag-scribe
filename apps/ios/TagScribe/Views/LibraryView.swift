import SwiftUI

/// Library tab: all saved items (including Inbox / shared via Share Sheet). Expandable rows with link, tags, Add tag, Archive, Move, Delete.
struct LibraryView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var errorMessage: String?
    @State private var loading = true
    @State private var isSelecting = false
    @State private var selectedItemIds = Set<String>()
    @State private var showCreateListSheet = false
    @State private var newListName = ""
    @State private var createListSaving = false
    @State private var createListBanner: String?
    @State private var createListBannerIsError = false

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
                VStack(spacing: 0) {
                    if isSelecting {
                        HStack(spacing: 20) {
                            Text("\(selectedItemIds.count) selected")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer(minLength: 24)
                            Button("Create list") {
                                newListName = ""
                                showCreateListSheet = true
                            }
                            .font(.subheadline.weight(.semibold))
                            .disabled(selectedItemIds.isEmpty)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(Color(.secondarySystemGroupedBackground))
                    }
                    if let banner = createListBanner {
                        Text(banner)
                            .font(.caption)
                            .foregroundStyle(createListBannerIsError ? Color.red : Color.green)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .padding(.horizontal, 12)
                    }
                    List {
                        ForEach(items) { item in
                            LibraryItemRow(
                                item: item,
                                categoryName: categoryName(for: item.categoryId),
                                existingTags: existingTags,
                                categories: categories,
                                onUpdated: { await load() },
                                onDeleted: { Task { await load() } },
                                selectionMode: isSelecting,
                                isSelected: selectedItemIds.contains(item.id),
                                onToggleSelection: {
                                    if selectedItemIds.contains(item.id) {
                                        selectedItemIds.remove(item.id)
                                    } else {
                                        selectedItemIds.insert(item.id)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
        .navigationTitle("Library")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                if !loading, errorMessage == nil, !items.isEmpty {
                    Button(isSelecting ? "Done" : "Select") {
                        if isSelecting {
                            isSelecting = false
                            selectedItemIds.removeAll()
                        } else {
                            isSelecting = true
                        }
                    }
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await load() }
            }
        }
        .sheet(isPresented: $showCreateListSheet) {
            NavigationStack {
                Form {
                    Section {
                        TextField("List name", text: $newListName)
                    } footer: {
                        Text("Creates a private list from the selected items. Open it anytime from the Lists tab.")
                    }
                }
                .navigationTitle("New list")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            showCreateListSheet = false
                        }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            Task { await saveNewList() }
                        }
                        .disabled(newListName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || createListSaving || selectedItemIds.isEmpty)
                    }
                }
            }
        }
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

    private func saveNewList() async {
        let name = newListName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, !selectedItemIds.isEmpty else { return }
        await MainActor.run { createListSaving = true }
        let ids = Array(selectedItemIds)
        do {
            _ = try await APIClient.shared.createList(name: name, itemIds: ids)
            await MainActor.run {
                showCreateListSheet = false
                newListName = ""
                isSelecting = false
                selectedItemIds.removeAll()
                createListBannerIsError = false
                createListBanner = "List “\(name)” saved (\(ids.count) items)."
                createListSaving = false
            }
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            await MainActor.run { createListBanner = nil }
        } catch {
            await MainActor.run {
                createListBannerIsError = true
                createListBanner = error.localizedDescription
                createListSaving = false
            }
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            await MainActor.run {
                createListBanner = nil
                createListBannerIsError = false
            }
        }
    }
}

#Preview {
    NavigationStack { LibraryView() }
}
