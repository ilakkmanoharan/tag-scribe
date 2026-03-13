import SwiftUI

/// One library item: collapsed (title + tags) or expanded (link, highlight, tags, Add tag, Archive/Unarchive, Move, Delete).
struct LibraryItemRow: View {
    let item: Item
    let categoryName: String?
    let existingTags: [String]
    let categories: [Category]
    /// true when used in Archive tab (show Unarchive instead of Archive).
    var isArchived: Bool = false
    var onUpdated: () async -> Void
    var onDeleted: () -> Void

    @State private var isExpanded = false
    @State private var newTagInput = ""
    @State private var showAddTag = false
    @State private var showMove = false
    @State private var showDeleteConfirm = false
    @State private var loading = false
    @State private var errorMessage: String?

    private var contentURL: URL? {
        guard item.type == "link" || item.content.hasPrefix("http") else { return nil }
        return URL(string: item.content)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.title ?? String(item.content.prefix(50)))
                            .lineLimit(1)
                            .foregroundStyle(.primary)
                        if !item.tags.isEmpty || categoryName != nil {
                            HStack(spacing: 6) {
                                if let cat = categoryName {
                                    Text(cat)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                if !item.tags.isEmpty {
                                    Text(item.tags.prefix(3).joined(separator: ", "))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    if let url = contentURL {
                        Link(destination: url) {
                            HStack(spacing: 6) {
                                Image(systemName: "link")
                                Text(item.content)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                            }
                            .font(.subheadline)
                            .foregroundStyle(.blue)
                        }
                    }

                    if let highlight = item.highlight, !highlight.isEmpty {
                        Text(highlight)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if !item.tags.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(item.tags, id: \.self) { tag in
                                HStack(spacing: 4) {
                                    Text(tag)
                                    Button {
                                        removeTag(tag)
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.caption2)
                                    }
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.secondary.opacity(0.2))
                                .clipShape(Capsule())
                            }
                        }
                    }

                    Button {
                        showAddTag = true
                    } label: {
                        Label("Add tag", systemImage: "plus.circle")
                            .font(.subheadline)
                    }

                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    HStack(spacing: 16) {
                        Button {
                            archiveItem()
                        } label: {
                            Label(isArchived ? "Unarchive" : "Archive", systemImage: "archivebox")
                                .font(.subheadline)
                        }
                        .disabled(loading)

                        Button {
                            showMove = true
                        } label: {
                            Label("Move", systemImage: "folder")
                                .font(.subheadline)
                        }
                        .disabled(loading)

                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            Label("Delete", systemImage: "trash")
                                .font(.subheadline)
                        }
                        .disabled(loading)
                    }
                }
                .padding(.leading, 4)
                .padding(.bottom, 12)
            }
        }
        .padding(.horizontal, 4)
        .sheet(isPresented: $showAddTag) {
            NavigationStack {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        TextField("New tag", text: $newTagInput)
                        Button("Add") {
                            addTag(newTagInput.trimmingCharacters(in: .whitespacesAndNewlines))
                            newTagInput = ""
                            showAddTag = false
                        }
                        .disabled(newTagInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    .padding()
                    Text("Existing tags — tap to add:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)
                    List {
                        ForEach(existingTags.filter { !item.tags.contains($0) }, id: \.self) { tag in
                            Button(tag) {
                                addTag(tag)
                                showAddTag = false
                            }
                        }
                    }
                }
                .navigationTitle("Add tag")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .sheet(isPresented: $showMove) {
            NavigationStack {
                List(categories) { cat in
                    Button(cat.name) {
                        moveToCategory(cat.id)
                        showMove = false
                    }
                }
                .navigationTitle("Move to category")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .confirmationDialog("Delete this item?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                deleteItem()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This cannot be undone.")
        }
    }

    private func addTag(_ tag: String) {
        guard !tag.isEmpty else { return }
        let updated = item.tags.contains(tag) ? item.tags : item.tags + [tag]
        performUpdate(tags: updated)
    }

    private func removeTag(_ tag: String) {
        let updated = item.tags.filter { $0 != tag }
        performUpdate(tags: updated)
    }

    private func performUpdate(tags: [String]? = nil, archived: Bool? = nil, categoryId: String? = nil) {
        loading = true
        errorMessage = nil
        Task {
            do {
                _ = try await APIClient.shared.updateItem(id: item.id, archived: archived, categoryId: categoryId, tags: tags)
                await onUpdated()
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { loading = false }
        }
    }

    private func archiveItem() {
        performUpdate(archived: !isArchived)
    }

    private func moveToCategory(_ categoryId: String) {
        performUpdate(categoryId: categoryId)
    }

    private func deleteItem() {
        loading = true
        errorMessage = nil
        Task {
            do {
                try await APIClient.shared.deleteItem(id: item.id)
                await MainActor.run { onDeleted() }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { loading = false }
        }
    }
}

/// Simple flow layout for tag chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (i, subview) in subviews.enumerated() {
            let pt = CGPoint(x: bounds.minX + result.positions[i].x, y: bounds.minY + result.positions[i].y)
            subview.place(at: pt, anchor: .topLeading, proposal: .unspecified)
        }
    }
    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var positions: [CGPoint] = []
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
