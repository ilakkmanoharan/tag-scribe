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
                            SavedListDetailView(initialList: list)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(list.name)
                                    .font(.body)
                                Text(listSubtitle(list))
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
        .onReceive(NotificationCenter.default.publisher(for: .tagScribeSavedListsDidChange)) { _ in
            Task { await load() }
        }
    }

    private func listSubtitle(_ list: SavedList) -> String {
        var parts: [String] = ["\(list.itemIds.count) items"]
        if let d = list.dueDate, !d.isEmpty, let shown = ItemScheduleFormat.displayDueDate(fromIso: d) {
            parts.append(shown)
        }
        if let p = ItemScheduleFormat.displayPriority(list.priority) {
            parts.append(p)
        }
        return parts.joined(separator: " · ")
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

// MARK: - List detail + edit

/// Items in a saved list (same order as `itemIds`; omits missing or deleted items).
private struct SavedListDetailView: View {
    @State private var list: SavedList
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var errorMessage: String?
    @State private var loading = true
    @State private var showEditList = false

    init(initialList: SavedList) {
        _list = State(initialValue: initialList)
    }

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
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit") {
                    showEditList = true
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showEditList) {
            EditSavedListView(list: list) { updated in
                list = updated
                showEditList = false
                NotificationCenter.default.post(name: .tagScribeSavedListsDidChange, object: nil)
            } onCancel: {
                showEditList = false
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
            async let listsTask = APIClient.shared.getLists()
            items = try await itemsTask
            categories = try await categoriesTask
            existingTags = try await tagsTask
            let allLists = try await listsTask
            if let fresh = allLists.first(where: { $0.id == list.id }) {
                list = fresh
            }
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct EditSavedListView: View {
    let list: SavedList
    let onSave: (SavedList) -> Void
    let onCancel: () -> Void

    @State private var name: String = ""
    @State private var hasDueDate = false
    @State private var dueDatePicker = Date()
    @State private var priorityChoice = ""
    @State private var saving = false
    @State private var errorMessage: String?

    init(list: SavedList, onSave: @escaping (SavedList) -> Void, onCancel: @escaping () -> Void) {
        self.list = list
        self.onSave = onSave
        self.onCancel = onCancel
        _name = State(initialValue: list.name)
        let hasD = list.dueDate.map { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } ?? false
        _hasDueDate = State(initialValue: hasD)
        if hasD, let d = list.dueDate, let parsed = ItemScheduleFormat.date(fromIso: d) {
            _dueDatePicker = State(initialValue: parsed)
        } else {
            _dueDatePicker = State(initialValue: Date())
        }
        _priorityChoice = State(initialValue: list.priority ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("List") {
                    TextField("Name", text: $name)
                }
                Section {
                    Toggle("Due date", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Due date", selection: $dueDatePicker, displayedComponents: .date)
                    }
                    Picker("Priority", selection: $priorityChoice) {
                        Text("None").tag("")
                        Text("Low").tag("low")
                        Text("Medium").tag("medium")
                        Text("High").tag("high")
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text("Schedule (optional)")
                } footer: {
                    Text("Used in the Planner tab together with item due dates.")
                }
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit list")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        await MainActor.run {
            saving = true
            errorMessage = nil
        }
        let dueISO = hasDueDate ? ItemScheduleFormat.isoString(from: dueDatePicker) : nil
        let pri: String? = priorityChoice.isEmpty ? nil : priorityChoice
        do {
            let updated = try await APIClient.shared.updateList(
                id: list.id,
                name: trimmed,
                hasDueDate: hasDueDate,
                dueDateISO: dueISO,
                priority: pri
            )
            await MainActor.run {
                saving = false
                onSave(updated)
            }
        } catch {
            await MainActor.run {
                saving = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

#Preview {
    NavigationStack { ListsView() }
}
