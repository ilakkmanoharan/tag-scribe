import SwiftUI

/// Categories tab: show item count per category; edit name; delete (items move to Inbox). Inbox cannot be deleted.
struct CategoriesView: View {
    @State private var categories: [Category] = []
    @State private var itemCountByCategoryId: [String: Int] = [:]
    @State private var errorMessage: String?
    @State private var loading = true
    @State private var editingCategory: Category?
    @State private var editName = ""
    @State private var savingEdit = false
    @State private var categoryToDelete: Category?
    @State private var deleting = false

    private func itemCount(for categoryId: String) -> Int {
        itemCountByCategoryId[categoryId] ?? 0
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
            } else if categories.isEmpty {
                VStack(spacing: 12) {
                    Text("No categories yet.")
                        .font(.headline)
                    Text("Create folders on the web app or add a category from the Add screen.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(categories) { cat in
                        NavigationLink(value: cat) {
                            CategoryRow(
                                category: cat,
                                itemCount: itemCount(for: cat.id),
                                canDelete: cat.id != "cat-inbox",
                                onEdit: {
                                    editingCategory = cat
                                    editName = cat.name
                                },
                                onDelete: {
                                    categoryToDelete = cat
                                }
                            )
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button {
                                editingCategory = cat
                                editName = cat.name
                            } label: { Label("Edit category", systemImage: "pencil") }
                            if cat.id != "cat-inbox" {
                                Button(role: .destructive) {
                                    categoryToDelete = cat
                                } label: { Label("Delete", systemImage: "trash") }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Categories")
        .refreshable { await load() }
        .task { await load() }
        .sheet(item: $editingCategory) { cat in
            NavigationStack {
                Form {
                    TextField("Category name", text: $editName)
                    if savingEdit {
                        ProgressView()
                    }
                }
                .navigationTitle("Edit category")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            editingCategory = nil
                        }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            saveCategoryName(categoryId: cat.id)
                        }
                        .disabled(editName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingEdit)
                    }
                }
            }
        }
        .confirmationDialog(categoryToDelete.map { "Delete \"\($0.name)\"?" } ?? "Delete category?", isPresented: Binding(
            get: { categoryToDelete != nil },
            set: { if !$0 { categoryToDelete = nil } }
        ), titleVisibility: .visible) {
            if let cat = categoryToDelete {
                Button("Delete", role: .destructive) {
                    deleteCategory(cat)
                    categoryToDelete = nil
                }
                Button("Cancel", role: .cancel) {
                    categoryToDelete = nil
                }
            }
        } message: {
            if let cat = categoryToDelete {
                Text("Items in \"\(cat.name)\" will move to Inbox.")
            }
        }
        .navigationDestination(for: Category.self) { cat in
            CategoryItemsView(categoryId: cat.id, categoryName: cat.name)
        }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            async let catsTask = APIClient.shared.getCategories()
            async let itemsTask = APIClient.shared.getItems()
            let (cats, items) = try await (catsTask, itemsTask)
            categories = cats
            var counts: [String: Int] = [:]
            for item in items {
                let cid = item.categoryId ?? "cat-inbox"
                counts[cid, default: 0] += 1
            }
            itemCountByCategoryId = counts
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveCategoryName(categoryId: String) {
        let name = editName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        savingEdit = true
        Task {
            do {
                let updated = try await APIClient.shared.updateCategory(id: categoryId, name: name)
                await MainActor.run {
                    if let idx = categories.firstIndex(where: { $0.id == categoryId }) {
                        categories[idx] = updated
                    }
                    editingCategory = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { savingEdit = false }
        }
    }

    private func deleteCategory(_ cat: Category) {
        deleting = true
        Task {
            do {
                try await APIClient.shared.deleteCategory(id: cat.id)
                await MainActor.run {
                    categories.removeAll { $0.id == cat.id }
                    itemCountByCategoryId.removeValue(forKey: cat.id)
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { deleting = false }
        }
    }
}

// MARK: - Category row with count, edit, delete
private struct CategoryRow: View {
    let category: Category
    let itemCount: Int
    let canDelete: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(category.name)
                    .foregroundStyle(.primary)
                Text("\(itemCount) item\(itemCount == 1 ? "" : "s") saved")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            HStack(spacing: 12) {
                Button {
                    onEdit()
                } label: {
                    Image(systemName: "pencil")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                if canDelete {
                    Button(role: .destructive) {
                        onDelete()
                    } label: {
                        Image(systemName: "trash")
                            .font(.body)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Category items list (Library-style)
private struct CategoryItemsView: View {
    let categoryId: String
    let categoryName: String
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
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
            } else if items.isEmpty {
                ContentUnavailableView(
                    "No items in this category",
                    systemImage: "folder",
                    description: Text("Items you move here will appear in this list.")
                )
            } else {
                List {
                    ForEach(items) { item in
                        LibraryItemRow(
                            item: item,
                            categoryName: categoryName(for: item.categoryId),
                            existingTags: existingTags,
                            categories: categories,
                            onUpdated: { Task { await loadItems() } },
                            onDeleted: { Task { await loadItems() } }
                        )
                    }
                }
            }
        }
        .navigationTitle(categoryName)
        .task {
            await loadItems()
        }
        .task {
            do {
                categories = try await APIClient.shared.getCategories()
                existingTags = try await APIClient.shared.getTags()
            } catch {
                categories = []
                existingTags = []
            }
        }
    }

    private func loadItems() async {
        loading = true
        defer { loading = false }
        do {
            items = try await APIClient.shared.getItems(categoryId: categoryId)
        } catch {
            items = []
        }
    }
}

#Preview {
    NavigationStack { CategoriesView() }
}
