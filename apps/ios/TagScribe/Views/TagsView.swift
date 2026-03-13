import SwiftUI

/// Tags tab: list of tags; tap a tag to see items with that tag (same as Library view).
struct TagsView: View {
    @State private var tags: [String] = []
    @State private var selectedTag: String?
    @State private var items: [Item] = []
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var errorMessage: String?
    @State private var loadingTags = true
    @State private var loadingItems = false

    private func categoryName(for id: String?) -> String? {
        guard let id = id else { return nil }
        return categories.first(where: { $0.id == id })?.name
    }

    var body: some View {
        Group {
            if loadingTags {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack(spacing: 12) {
                    Text(err)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Instructional text (match web)
                        Text("Search by tag across all links, images, and text. Tap a tag to see everything saved with that tag.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)

                        if tags.isEmpty {
                            VStack(spacing: 12) {
                                Text("No tags yet.")
                                    .font(.headline)
                                Text("Add tags to items in the Library or when adding new items.")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                        } else {
                            // Tag pills (tap to select)
                            FlowLayout(spacing: 8) {
                                ForEach(tags.sorted(), id: \.self) { tag in
                                    Button {
                                        selectedTag = tag
                                        Task { await loadItems(for: tag) }
                                    } label: {
                                        Text(tag)
                                            .font(.subheadline)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(selectedTag == tag ? Color.accentColor.opacity(0.3) : Color(.secondarySystemFill))
                                            .foregroundStyle(selectedTag == tag ? Color.accentColor : .primary)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        // Selected tag: show items (same as Library view)
                        if let tag = selectedTag {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Tag: \(tag)")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                Text("\(items.count) item\(items.count == 1 ? "" : "s") with this tag.")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)

                                if loadingItems {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 24)
                                } else if items.isEmpty {
                                    Text("No items with this tag.")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .padding(.vertical, 16)
                                } else {
                                    ForEach(items) { item in
                                        LibraryItemRow(
                                            item: item,
                                            categoryName: categoryName(for: item.categoryId),
                                            existingTags: existingTags,
                                            categories: categories,
                                            onUpdated: { await loadItems(for: tag); await loadTags() },
                                            onDeleted: { Task { await loadItems(for: tag); await loadTags() } }
                                        )
                                        .padding(.vertical, 4)
                                    }
                                }
                            }
                            .padding(.top, 8)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Tags")
        .refreshable {
            await loadTags()
            if let tag = selectedTag { await loadItems(for: tag) }
        }
        .task {
            await loadTags()
            if let tag = selectedTag { await loadItems(for: tag) }
        }
        .onChange(of: selectedTag) { _, newTag in
            if let tag = newTag {
                Task { await loadItems(for: tag) }
            } else {
                items = []
            }
        }
    }

    private func loadTags() async {
        loadingTags = true
        errorMessage = nil
        defer { loadingTags = false }
        do {
            tags = try await APIClient.shared.getTags()
            async let categoriesTask = APIClient.shared.getCategories()
            existingTags = try await APIClient.shared.getTags()
            categories = try await categoriesTask
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadItems(for tag: String) async {
        loadingItems = true
        defer { loadingItems = false }
        do {
            items = try await APIClient.shared.getItems(tag: tag)
            if categories.isEmpty {
                categories = try await APIClient.shared.getCategories()
            }
            if existingTags.isEmpty {
                existingTags = try await APIClient.shared.getTags()
            }
        } catch {
            items = []
        }
    }
}

#Preview {
    NavigationStack { TagsView() }
}
