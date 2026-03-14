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
    @State private var showEdit = false
    @State private var showMove = false
    @State private var showDeleteConfirm = false
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var editTitle = ""
    @State private var editContent = ""
    @State private var editHighlight = ""
    @State private var editCaption = ""
    @State private var editTags: [String] = []
    @State private var editCategoryId: String?
    @State private var editNewTagInput = ""
    @State private var savingEdit = false

    private var contentURL: URL? {
        guard item.type == "link" || item.content.hasPrefix("http") else { return nil }
        return URL(string: item.content)
    }

    private var imageURL: URL? {
        guard item.type == "image", let url = URL(string: item.content), item.content.hasPrefix("http") else { return nil }
        return url
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
                    if let url = imageURL {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxHeight: 200)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            case .failure:
                                Link(destination: url) {
                                    Label("View image", systemImage: "photo")
                                        .font(.subheadline)
                                        .foregroundStyle(.blue)
                                }
                            case .empty:
                                ProgressView()
                                    .frame(height: 120)
                            @unknown default:
                                EmptyView()
                            }
                        }
                    }

                    if let url = contentURL, item.type != "image" {
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

                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 24) {
                            Button {
                                showAddTag = true
                            } label: {
                                Label("Add tag", systemImage: "plus.circle")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .buttonStyle(.plain)

                            Button {
                                editTitle = item.title ?? ""
                                editContent = item.content
                                editHighlight = item.highlight ?? ""
                                editCaption = item.caption ?? ""
                                editTags = item.tags
                                editCategoryId = item.categoryId
                                showEdit = true
                            } label: {
                                Label("Edit", systemImage: "pencil")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .buttonStyle(.plain)
                        }

                        HStack(spacing: 24) {
                            Button {
                                archiveItem()
                            } label: {
                                Image(systemName: "archivebox")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .accessibilityLabel(isArchived ? "Unarchive" : "Archive")
                            .buttonStyle(.plain)
                            .disabled(loading)

                            Button {
                                showMove = true
                            } label: {
                                Image(systemName: "folder")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .accessibilityLabel("Move")
                            .buttonStyle(.plain)
                            .disabled(loading)

                            Button(role: .destructive) {
                                showDeleteConfirm = true
                            } label: {
                                Image(systemName: "trash")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .accessibilityLabel("Delete")
                            .buttonStyle(.plain)
                            .disabled(loading)
                        }
                    }

                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
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
        .sheet(isPresented: $showEdit) {
            NavigationStack {
                Form {
                    Section("Title") {
                        TextField("Optional title", text: $editTitle)
                    }
                    if item.type == "link" || item.type == "video" || item.type == "text" {
                        Section(item.type == "link" ? "Link" : item.type == "video" ? "Video URL" : "Content") {
                            TextField("URL or content", text: $editContent)
                                .keyboardType(item.type == "text" ? .default : .URL)
                                .textInputAutocapitalization(.never)
                        }
                    }
                    if item.type == "link" {
                        Section("Highlight") {
                            TextField("Highlighted text", text: $editHighlight, axis: .vertical)
                                .lineLimit(3...6)
                        }
                    }
                    if item.type == "image" || item.type == "video" || item.type == "text" {
                        Section("Caption") {
                            TextField("Caption", text: $editCaption, axis: .vertical)
                                .lineLimit(2...4)
                        }
                    }
                    Section("Category") {
                        Picker("Category", selection: Binding(
                            get: { editCategoryId ?? "" },
                            set: { editCategoryId = $0.isEmpty ? nil : $0 }
                        )) {
                            Text("None").tag("")
                            ForEach(categories) { cat in
                                Text(cat.name).tag(cat.id)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    Section("Tags") {
                        ForEach(editTags, id: \.self) { tag in
                            HStack {
                                Text(tag)
                                Spacer()
                                Button("Remove") {
                                    editTags.removeAll { $0 == tag }
                                }
                                .font(.caption)
                            }
                        }
                        HStack {
                            TextField("New tag", text: $editNewTagInput)
                            Button("Add") {
                                let t = editNewTagInput.trimmingCharacters(in: .whitespacesAndNewlines)
                                if !t.isEmpty, !editTags.contains(where: { $0.lowercased() == t.lowercased() }) {
                                    editTags.append(t)
                                    editNewTagInput = ""
                                }
                            }
                            .disabled(editNewTagInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                        if !existingTags.filter({ !editTags.contains($0) }).isEmpty {
                            Text("Existing — tap to add:")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            FlowLayout(spacing: 6) {
                                ForEach(existingTags.filter { !editTags.contains($0) }, id: \.self) { tag in
                                    Button(tag) {
                                        if !editTags.contains(where: { $0.lowercased() == tag.lowercased() }) {
                                            editTags.append(tag)
                                        }
                                    }
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.2))
                                    .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }
                .navigationTitle("Edit item")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            showEdit = false
                        }
                        .disabled(savingEdit)
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            saveEdit()
                        }
                        .disabled(savingEdit)
                    }
                }
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

    private func saveEdit() {
        savingEdit = true
        errorMessage = nil
        Task {
            do {
                let titleVal = editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                let contentVal = (item.type == "link" || item.type == "video" || item.type == "text") ? editContent.trimmingCharacters(in: .whitespacesAndNewlines) : nil
                let highlightVal = item.type == "link" ? editHighlight.trimmingCharacters(in: .whitespacesAndNewlines) : nil
                let captionVal = (item.type == "image" || item.type == "video" || item.type == "text") ? editCaption.trimmingCharacters(in: .whitespacesAndNewlines) : nil
                _ = try await APIClient.shared.updateItem(
                    id: item.id,
                    categoryId: editCategoryId,
                    tags: editTags,
                    title: titleVal.isEmpty ? nil : titleVal,
                    content: contentVal,
                    highlight: highlightVal?.isEmpty == true ? nil : highlightVal,
                    caption: captionVal?.isEmpty == true ? nil : captionVal
                )
                await MainActor.run {
                    showEdit = false
                }
                await onUpdated()
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            await MainActor.run { savingEdit = false }
        }
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
