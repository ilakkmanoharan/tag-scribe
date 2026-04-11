import SwiftUI
import PhotosUI
import UIKit

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
    /// Multi-select in Library: show checkbox; `onToggleSelection` toggles this row in the parent's selection set.
    var selectionMode: Bool = false
    var isSelected: Bool = false
    var onToggleSelection: (() -> Void)? = nil

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
    @State private var editLinkRows: [EditableLinkRow] = [EditableLinkRow()]
    @State private var editVideoUrl = ""
    @State private var editHighlight = ""
    @State private var editCaption = ""
    @State private var editTags: [String] = []
    @State private var editCategoryId: String?
    @State private var editNewTagInput = ""
    @State private var savingEdit = false
    @State private var loadedImages: [(url: URL?, data: Data?)] = []
    @State private var editPhotoItems: [PhotosPickerItem] = []
    @State private var appendingPhotos = false
    @State private var editExistingImageData: [(url: URL?, data: Data?)] = []
    @State private var editImageUrls: [String] = []
    @State private var editCategories: [Category] = []
    @State private var editNewCategoryName = ""
    @State private var addingCategory = false
    @State private var removingImageAt: Int? = nil
    @State private var editHasDueDate = false
    @State private var editDueDatePicker = Date()
    @State private var editPriority = ""

    private var imageCount: Int {
        guard item.type == "image" else { return 0 }
        if let urls = item.imageUrls, !urls.isEmpty { return urls.count }
        return 1
    }

    /// URLs to show in the expanded row (multi-line `content` for `link` items; excludes embedded video line).
    private var displayLinkURLs: [URL] {
        if item.type == "link" {
            return LinkStorage.displayWebLinkStrings(from: item.content).compactMap { URL(string: $0) }
        }
        if item.content.hasPrefix("http://") || item.content.hasPrefix("https://"),
           let first = LinkStorage.linkLines(from: item.content).first,
           let u = URL(string: first) {
            return [u]
        }
        return []
    }

    private var displayEmbeddedVideoURL: URL? {
        guard item.type == "link",
              let v = LinkStorage.embeddedVideo(from: item.content),
              LinkStorage.isValidHTTPURL(v) else { return nil }
        return URL(string: v)
    }

    private var displayVideoItemURL: URL? {
        guard item.type == "video" else { return nil }
        let t = item.content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard LinkStorage.isValidHTTPURL(t) else { return nil }
        return URL(string: t)
    }

    private var imageURL: URL? {
        guard item.type == "image", let url = URL(string: item.content), item.content.hasPrefix("http") else { return nil }
        return url
    }

    private func loadImages() async {
        guard item.type == "image", imageCount > 0 else {
            await MainActor.run { loadedImages = [] }
            return
        }
        var results: [(url: URL?, data: Data?)] = []
        for index in 0..<imageCount {
            let pair = try? await APIClient.shared.getItemImage(itemId: item.id, index: index)
            results.append((url: pair?.url, data: pair?.data))
        }
        await MainActor.run { loadedImages = results }
    }

    /// Copies `item` + `categories` into edit-sheet @State. Call before presenting the sheet and again when the sheet appears so the first open shows correct tags/category (SwiftUI can build the sheet before same-transaction state updates are visible).
    private func syncEditFormFromItem() {
        editTitle = item.title ?? ""
        editContent = item.type == "text" ? item.content : ""
        let contentIsUrl = item.content.hasPrefix("http://") || item.content.hasPrefix("https://")
        if item.type == "link" {
            let (segments, embeddedVideo) = LinkStorage.parseLinkItemContent(item.content)
            editLinkRows = segments.isEmpty ? [EditableLinkRow()] : segments.map { EditableLinkRow(value: $0) }
            editVideoUrl = embeddedVideo ?? ""
        } else if item.type == "image", contentIsUrl, !item.content.lowercased().contains("mp4") {
            editLinkRows = [EditableLinkRow(value: item.content)]
        } else {
            editLinkRows = [EditableLinkRow()]
        }
        // `link` items set `editVideoUrl` from embedded line above; do not overwrite here.
        if item.type == "video" {
            editVideoUrl = item.content
        } else if item.type == "image", contentIsUrl, item.content.lowercased().contains("mp4") {
            editVideoUrl = item.content
        } else if item.type != "link" {
            editVideoUrl = ""
        }
        editHighlight = item.highlight ?? ""
        editCaption = item.caption ?? ""
        if let d = item.dueDate, !d.isEmpty, let parsed = ItemScheduleFormat.date(fromIso: d) {
            editHasDueDate = true
            editDueDatePicker = parsed
        } else {
            editHasDueDate = false
            editDueDatePicker = Date()
        }
        let p = (item.priority ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        editPriority = ["low", "medium", "high"].contains(p) ? p : ""
        editTags = item.tags
        editCategoryId = item.categoryId
        editPhotoItems = []
        editCategories = categories
        editNewCategoryName = ""
        if item.type == "image" {
            editImageUrls = item.imageUrls ?? (item.content.isEmpty ? [] : [item.content])
        } else {
            editImageUrls = []
        }
        editExistingImageData = []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 12) {
                if selectionMode, let toggle = onToggleSelection {
                    Button {
                        toggle()
                    } label: {
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                            .font(.title2)
                            .foregroundStyle(isSelected ? Color.accentColor : Color.secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(isSelected ? "Deselect" : "Select")
                }
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
            }

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    if let cat = categoryName {
                        HStack(spacing: 6) {
                            Text("Category:")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(cat)
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                        }
                    }

                    if item.type == "image" {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                if loadedImages.isEmpty && imageCount > 0 {
                                    ProgressView()
                                        .frame(width: 120, height: 120)
                                }
                                ForEach(Array(loadedImages.enumerated()), id: \.offset) { _, pair in
                                    if let url = pair.url {
                                        AsyncImage(url: url) { phase in
                                            switch phase {
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .scaledToFit()
                                                    .frame(maxHeight: 200)
                                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                            case .failure:
                                                Image(systemName: "photo")
                                                    .font(.largeTitle)
                                                    .foregroundStyle(.secondary)
                                                    .frame(height: 120)
                                            case .empty:
                                                ProgressView()
                                                    .frame(height: 120)
                                            @unknown default:
                                                EmptyView()
                                            }
                                        }
                                    } else if let data = pair.data, let uiImage = UIImage(data: data) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFit()
                                            .frame(maxHeight: 200)
                                            .clipShape(RoundedRectangle(cornerRadius: 8))
                                    } else {
                                        ProgressView()
                                            .frame(width: 120, height: 120)
                                    }
                                }
                            }
                        }
                        .task(id: "\(item.id)-\(isExpanded)") {
                            if isExpanded { await loadImages() }
                        }
                        .onChange(of: isExpanded) { _, expanded in
                            if !expanded { loadedImages = [] }
                        }
                    }

                    if !displayLinkURLs.isEmpty {
                        Text("Links")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ForEach(Array(displayLinkURLs.enumerated()), id: \.offset) { _, url in
                            Link(destination: url) {
                                HStack(spacing: 6) {
                                    Image(systemName: "link")
                                    Text(url.absoluteString)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                }
                                .font(.subheadline)
                                .foregroundStyle(.blue)
                            }
                        }
                    }

                    if let videoURL = displayEmbeddedVideoURL {
                        Text("Video URL")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Link(destination: videoURL) {
                            HStack(spacing: 6) {
                                Image(systemName: "play.rectangle")
                                Text(videoURL.absoluteString)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                            }
                            .font(.subheadline)
                            .foregroundStyle(.blue)
                        }
                    } else if let videoURL = displayVideoItemURL {
                        Text("Video URL")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Link(destination: videoURL) {
                            HStack(spacing: 6) {
                                Image(systemName: "play.rectangle")
                                Text(videoURL.absoluteString)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                            }
                            .font(.subheadline)
                            .foregroundStyle(.blue)
                        }
                    }

                    if let highlight = item.highlight, !highlight.isEmpty {
                        Text("Highlight")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(highlight)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let caption = item.caption, !caption.isEmpty {
                        Text("Caption")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(caption)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let dueDisplay = ItemScheduleFormat.displayDueDate(fromIso: item.dueDate) {
                        Text("Due date")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(dueDisplay)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }

                    if let priDisplay = ItemScheduleFormat.displayPriority(item.priority) {
                        Text("Priority")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(priDisplay)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
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
                                Task { @MainActor in
                                    syncEditFormFromItem()
                                    // Present after sync so the sheet reads up-to-date @State (fixes empty tags / None category on first open).
                                    showEdit = true
                                }
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

                            Spacer(minLength: 48)

                            Button {
                                presentLibraryItemShare()
                            } label: {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.subheadline)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                            }
                            .accessibilityLabel("Share link to this item")
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
                    Section {
                        ForEach($editLinkRows) { $row in
                            HStack(alignment: .center, spacing: 8) {
                                TextField("https://...", text: $row.value)
                                    .keyboardType(.URL)
                                    .textInputAutocapitalization(.never)
                                if editLinkRows.count > 1 {
                                    Button {
                                        editLinkRows.removeAll { $0.id == row.id }
                                    } label: {
                                        Image(systemName: "minus.circle.fill")
                                            .font(.title3)
                                            .foregroundStyle(.secondary)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Remove link row")
                                }
                            }
                        }
                        Button {
                            editLinkRows.append(EditableLinkRow())
                        } label: {
                            Label("Add link", systemImage: "plus.circle")
                        }
                    } header: {
                        Text("Links (optional)")
                    } footer: {
                        Text("Use Add link (+) for multiple URLs. They are stored on this item.")
                    }
                    Section("Video URL (optional)") {
                        TextField("e.g. https://...mp4", text: $editVideoUrl)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                    }
                    if item.type == "text" {
                        Section("Content") {
                            TextField("Content", text: $editContent, axis: .vertical)
                                .lineLimit(3...8)
                        }
                    }
                    Section("Highlight (optional)") {
                        TextField("Highlighted text", text: $editHighlight, axis: .vertical)
                            .lineLimit(3...6)
                    }
                    Section("Caption (optional)") {
                        TextField("Caption", text: $editCaption, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Section {
                        Toggle("Due date", isOn: $editHasDueDate)
                        if editHasDueDate {
                            DatePicker("Due date", selection: $editDueDatePicker, displayedComponents: .date)
                        }
                        Picker("Priority", selection: $editPriority) {
                            Text("None").tag("")
                            Text("Low").tag("low")
                            Text("Medium").tag("medium")
                            Text("High").tag("high")
                        }
                        .pickerStyle(.menu)
                    } header: {
                        Text("Schedule (optional)")
                    }
                    Section {
                        if item.type == "image" && !editExistingImageData.isEmpty {
                            Text("Existing photos")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(Array(editExistingImageData.enumerated()), id: \.offset) { index, pair in
                                        EditExistingPhotoThumbnail(url: pair.url, data: pair.data) {
                                            Button {
                                                removeExistingPhoto(at: index)
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.title2)
                                                    .foregroundStyle(.white)
                                                    .shadow(radius: 2)
                                            }
                                        }
                                        .disabled(removingImageAt != nil)
                                    }
                                }
                            }
                        }
                        PhotosPicker(
                            selection: $editPhotoItems,
                            maxSelectionCount: 20,
                            matching: .images
                        ) {
                            Label("Add photos", systemImage: "photo.on.rectangle.angled")
                        }
                        .disabled(appendingPhotos)
                        if !editPhotoItems.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(Array(editPhotoItems.enumerated()), id: \.offset) { index, pickerItem in
                                        EditPhotoThumbnail(item: pickerItem) {
                                            Button {
                                                editPhotoItems.remove(at: index)
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.title2)
                                                    .foregroundStyle(.white)
                                                    .shadow(radius: 2)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if appendingPhotos || removingImageAt != nil {
                            HStack {
                                ProgressView()
                                Text(removingImageAt != nil ? "Removing…" : "Adding…")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    } header: {
                        Text("Pictures (optional) — add multiple")
                    } footer: {
                        Text("All selected photos are saved as one item in your library.")
                    }
                    Section("Category (optional)") {
                        Picker("Category", selection: Binding(
                            get: { editCategoryId ?? "" },
                            set: { editCategoryId = $0.isEmpty ? nil : $0 }
                        )) {
                            Text("None").tag("")
                            ForEach(editCategories) { cat in
                                Text(cat.name).tag(cat.id)
                            }
                        }
                        .pickerStyle(.menu)
                        HStack {
                            TextField("New category name", text: $editNewCategoryName)
                            Button("Add category") {
                                addNewCategoryInEdit()
                            }
                            .disabled(editNewCategoryName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || addingCategory)
                        }
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
                            FlowLayout(spacing: 16, lineSpacing: 20) {
                                ForEach(existingTags.filter { !editTags.contains($0) }, id: \.self) { tag in
                                    Button {
                                        if !editTags.contains(where: { $0.lowercased() == tag.lowercased() }) {
                                            editTags.append(tag)
                                        }
                                    } label: {
                                        Text(tag)
                                            .font(.subheadline)
                                            .multilineTextAlignment(.center)
                                            .lineLimit(2)
                                            .minimumScaleFactor(0.85)
                                            .padding(.horizontal, 18)
                                            .padding(.vertical, 14)
                                            .frame(minHeight: 44)
                                            .background(Color.secondary.opacity(0.2))
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                    .contentShape(Capsule())
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .navigationTitle("Edit item")
                .navigationBarTitleDisplayMode(.inline)
                .task(id: "\(showEdit)-\(item.id)-\(editImageUrls.count)") {
                    if showEdit, item.type == "image", !editImageUrls.isEmpty {
                        await loadEditExistingImages()
                    }
                }
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
                .onChange(of: showEdit) { _, isPresented in
                    if isPresented {
                        syncEditFormFromItem()
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

    private func loadEditExistingImages() async {
        guard item.type == "image", !editImageUrls.isEmpty else { return }
        var results: [(url: URL?, data: Data?)] = []
        for index in 0..<editImageUrls.count {
            let pair = try? await APIClient.shared.getItemImage(itemId: item.id, index: index)
            results.append((url: pair?.url, data: pair?.data))
        }
        await MainActor.run { editExistingImageData = results }
    }

    private func removeExistingPhoto(at index: Int) {
        guard index >= 0, index < editImageUrls.count else { return }
        removingImageAt = index
        var newUrls = editImageUrls
        newUrls.remove(at: index)
        editImageUrls = newUrls
        editExistingImageData.remove(at: index)
        Task {
            do {
                _ = try await APIClient.shared.updateItem(
                    id: item.id,
                    content: newUrls.isEmpty ? "" : newUrls[0],
                    imageUrls: newUrls
                )
                await onUpdated()
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
            await MainActor.run { removingImageAt = nil }
        }
    }

    private func addNewCategoryInEdit() {
        let name = editNewCategoryName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        addingCategory = true
        Task {
            do {
                let cat = try await APIClient.shared.createCategory(name: name)
                await MainActor.run {
                    editCategories.append(cat)
                    editCategoryId = cat.id
                    editNewCategoryName = ""
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
            await MainActor.run { addingCategory = false }
        }
    }

    private func saveEdit() {
        savingEdit = true
        errorMessage = nil
        Task {
            do {
                // Selected photos: always update this same item (append if already image, else convert to image)
                if !editPhotoItems.isEmpty {
                    await MainActor.run { appendingPhotos = true }
                    var imagePayloads: [(Data, mimeType: String)] = []
                    for pickerItem in editPhotoItems {
                        if let data = try? await pickerItem.loadTransferable(type: Data.self),
                           let uiImage = UIImage(data: data) {
                            let jpeg = uiImage.jpegData(compressionQuality: 0.85) ?? data
                            imagePayloads.append((jpeg, "image/jpeg"))
                        }
                    }
                    if !imagePayloads.isEmpty {
                        _ = try await APIClient.shared.appendItemImages(itemId: item.id, imageDataList: imagePayloads)
                        await MainActor.run { editPhotoItems = [] }
                        await onUpdated()
                    }
                    await MainActor.run { appendingPhotos = false }
                }

                let titleVal = editTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                let linkJoined = LinkStorage.joinedHTTPURLs(editLinkRows.map(\.value))
                let videoVal = editVideoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                let videoOptional: String? = videoVal.isEmpty ? nil : videoVal
                let contentVal: String? = {
                    if item.type == "link" {
                        return LinkStorage.packLinkItemContent(linkFieldValues: editLinkRows.map(\.value), videoURL: videoOptional)
                    }
                    if !linkJoined.isEmpty { return linkJoined }
                    if LinkStorage.isValidHTTPURL(videoVal) { return videoVal }
                    if item.type == "text" { return editContent.trimmingCharacters(in: .whitespacesAndNewlines) }
                    if item.type == "video" { return item.content }
                    return nil
                }()
                let highlightVal = editHighlight.trimmingCharacters(in: .whitespacesAndNewlines)
                let captionVal = editCaption.trimmingCharacters(in: .whitespacesAndNewlines)
                let dueForPatch: String? = editHasDueDate ? ItemScheduleFormat.isoString(from: editDueDatePicker) : nil
                _ = try await APIClient.shared.updateItem(
                    id: item.id,
                    categoryId: editCategoryId,
                    tags: editTags,
                    title: titleVal.isEmpty ? nil : titleVal,
                    content: contentVal,
                    highlight: highlightVal.isEmpty ? nil : highlightVal,
                    caption: captionVal.isEmpty ? nil : captionVal,
                    dueDate: dueForPatch,
                    priority: editPriority,
                    includeScheduleFields: true
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

    /// Web library URL with `?item=` so recipients can open the site (and scroll to the item when logged in).
    private func libraryItemShareWebURL() -> URL? {
        var trimmed = APIClient.shared.baseURL.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if !trimmed.lowercased().hasPrefix("http") {
            trimmed = "https://\(trimmed)"
        }
        var c = URLComponents(string: trimmed)
        c?.queryItems = [URLQueryItem(name: "item", value: item.id)]
        return c?.url
    }

    private func libraryItemShareText() -> String {
        let t = item.title?.trimmingCharacters(in: .whitespacesAndNewlines)
        let headline = (t?.isEmpty == false) ? t! : "Tag Scribe item"
        var parts = [headline, ""]
        if let u = libraryItemShareWebURL() {
            parts.append("Open in browser: \(u.absoluteString)")
        }
        parts.append("Open in app: tagscribe://item/\(item.id)")
        return parts.joined(separator: "\n")
    }

    private func presentLibraryItemShare() {
        guard let url = libraryItemShareWebURL() else { return }
        let text = libraryItemShareText()
        let av = UIActivityViewController(activityItems: [text, url], applicationActivities: nil)
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive })
                ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
              let root = scene.windows.first(where: \.isKeyWindow)?.rootViewController else { return }
        if let pop = av.popoverPresentationController {
            pop.sourceView = root.view
            pop.sourceRect = CGRect(x: root.view.bounds.midX, y: root.view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = [.up, .down]
        }
        var top = root
        while let presented = top.presentedViewController {
            top = presented
        }
        top.present(av, animated: true)
    }
}

/// Simple flow layout for tag chips. `spacing` = horizontal gap between items; `lineSpacing` = gap between rows (defaults to `spacing`).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat? = nil

    private var rowGap: CGFloat { lineSpacing ?? spacing }

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
                y += rowHeight + rowGap
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}

/// Thumbnail for existing item images in Edit sheet (from URL or Data).
private struct EditExistingPhotoThumbnail<Overlay: View>: View {
    let url: URL?
    let data: Data?
    @ViewBuilder let trailingOverlay: () -> Overlay

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 80, height: 80)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(alignment: .topTrailing) { trailingOverlay() }
                    case .failure:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 80, height: 80)
                            .overlay(alignment: .topTrailing) { trailingOverlay() }
                    case .empty:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 80, height: 80)
                            .overlay { ProgressView() }
                    @unknown default:
                        EmptyView()
                    }
                }
            } else if let data, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(alignment: .topTrailing) { trailingOverlay() }
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay { ProgressView() }
                    .overlay(alignment: .topTrailing) { trailingOverlay() }
            }
        }
    }
}

/// Thumbnail for selected photos in Edit sheet — matches Add view.
private struct EditPhotoThumbnail<Overlay: View>: View {
    let item: PhotosPickerItem
    @ViewBuilder let trailingOverlay: () -> Overlay
    @State private var image: UIImage?

    init(item: PhotosPickerItem, @ViewBuilder trailingOverlay: @escaping () -> Overlay) {
        self.item = item
        self.trailingOverlay = trailingOverlay
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(alignment: .topTrailing) { trailingOverlay() }
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay { ProgressView() }
            }
        }
        .task {
            if let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) {
                image = ui
            }
        }
    }
}
