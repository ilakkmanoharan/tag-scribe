import SwiftUI
import PhotosUI

/// Add tab: full form matching web — Title, Link, Video, Pictures, Highlight, Tags (new + existing), Category (picker + add new).
struct AddView: View {
    @State private var title = ""
    @State private var link = ""
    @State private var videoUrl = ""
    @State private var highlight = ""
    @State private var selectedTags: [String] = []
    @State private var newTagInput = ""
    @State private var categoryId: String = "cat-inbox"
    @State private var newCategoryName = ""
    @State private var categories: [Category] = []
    @State private var existingTags: [String] = []
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var saving = false
    @State private var addingCategory = false
    @State private var message: String?
    @State private var isSuccess = false

    private var hasValidTitle: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        Form {
            Section {
                TextField("Display title", text: $title)
                TextField("Paste or drop a link (optional, e.g. https://...)", text: $link)
                    .textContentType(.URL)
                    .autocapitalization(.none)
                    .keyboardType(.URL)
                TextField("Video URL (optional, e.g. https://...mp4)", text: $videoUrl)
                    .textContentType(.URL)
                    .autocapitalization(.none)
                    .keyboardType(.URL)
            } header: {
                Text("Link & media")
            } footer: {
                Text("Display title is required. Link, video URL, and pictures are optional.")
            }

            Section {
                PhotosPicker(
                    selection: $selectedPhotoItems,
                    maxSelectionCount: 20,
                    matching: .images
                ) {
                    Label("Add photos", systemImage: "photo.on.rectangle.angled")
                }
                if !selectedPhotoItems.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Array(selectedPhotoItems.enumerated()), id: \.offset) { index, item in
                                PhotosPickerItemThumbnail(item: item) {
                                    Button {
                                        selectedPhotoItems.remove(at: index)
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
            } header: {
                Text("Pictures (optional) — add multiple")
            } footer: {
                Text("All selected photos are saved as one item in your library.")
            }

            Section("Highlight (optional)") {
                TextEditor(text: $highlight)
                    .frame(minHeight: 80)
            }

            Section("Tags (optional)") {
                if !selectedTags.isEmpty {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 6) {
                            ForEach(selectedTags, id: \.self) { tag in
                                HStack(spacing: 4) {
                                    Text(tag)
                                    Button {
                                        selectedTags.removeAll { $0 == tag }
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
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(selectedTags, id: \.self) { tag in
                                    HStack(spacing: 4) {
                                        Text(tag)
                                        Button {
                                            selectedTags.removeAll { $0 == tag }
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
                    }
                }
                HStack {
                    TextField("New tag", text: $newTagInput)
                    Button("+") {
                        let t = newTagInput.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !t.isEmpty, !selectedTags.contains(t) {
                            selectedTags.append(t)
                            newTagInput = ""
                        }
                    }
                }
                Text("Existing tags — tap to add:")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if existingTags.isEmpty {
                    Text("No existing tags.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(existingTags.filter { !selectedTags.contains($0) }, id: \.self) { tag in
                            Button(tag) {
                                if !selectedTags.contains(tag) { selectedTags.append(tag) }
                            }
                            .font(.caption)
                        }
                    }
                }
            }

            Section("Category (optional)") {
                Picker("Category", selection: $categoryId) {
                    ForEach(categories) { cat in
                        Text(cat.name).tag(cat.id)
                    }
                    if categories.isEmpty {
                        Text("Inbox").tag("cat-inbox")
                    }
                }
                .pickerStyle(.menu)
                HStack {
                    TextField("New category name", text: $newCategoryName)
                    Button("Add category") {
                        addNewCategory()
                    }
                    .disabled(newCategoryName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || addingCategory)
                }
            }

            if let msg = message {
                Section {
                    Text(msg)
                        .foregroundStyle(isSuccess ? .green : .red)
                        .font(.caption)
                }
            }

            Section {
                Button {
                    save()
                } label: {
                    HStack {
                        if saving {
                            ProgressView()
                                .scaleEffect(0.9)
                        }
                        Text(saving ? "Saving…" : "Save to Library")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(saving || !hasValidTitle)
            }
        }
        .navigationTitle("Add")
        .onAppear {
            message = nil
            Task { await load() }
        }
    }

    private func load() async {
        do {
            categories = try await APIClient.shared.getCategories()
            existingTags = try await APIClient.shared.getTags()
            if categoryId == "cat-inbox" && categories.first(where: { $0.id == "cat-inbox" }) == nil, let first = categories.first {
                categoryId = first.id
            }
        } catch {
            categories = []
            existingTags = []
        }
    }

    private func addNewCategory() {
        let name = newCategoryName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        addingCategory = true
        Task {
            do {
                let cat = try await APIClient.shared.createCategory(name: name)
                await MainActor.run {
                    categories.append(cat)
                    categoryId = cat.id
                    newCategoryName = ""
                }
            } catch {
                await MainActor.run {
                    message = error.localizedDescription
                    isSuccess = false
                }
            }
            await MainActor.run { addingCategory = false }
        }
    }

    private func save() {
        let titleTrimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let linkTrimmed = link.trimmingCharacters(in: .whitespacesAndNewlines)
        let videoTrimmed = videoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasLink = !linkTrimmed.isEmpty && (linkTrimmed.hasPrefix("http://") || linkTrimmed.hasPrefix("https://"))
        let hasVideo = !videoTrimmed.isEmpty && (videoTrimmed.hasPrefix("http://") || videoTrimmed.hasPrefix("https://"))
        let hasImages = !selectedPhotoItems.isEmpty

        if titleTrimmed.isEmpty {
            message = "Please enter a display title."
            isSuccess = false
            return
        }

        saving = true
        message = nil
        let photoItems = selectedPhotoItems
        let titleForTask = titleTrimmed
        let linkForTask = linkTrimmed
        let videoForTask = videoTrimmed
        let highlightForTask = highlight
        let tagsForTask = selectedTags
        let categoryForTask = categoryId

        Task {
            do {
                if hasImages {
                    var imagePayloads: [(Data, mimeType: String)] = []
                    for item in photoItems {
                        if let data = try await item.loadTransferable(type: Data.self),
                           let uiImage = UIImage(data: data) {
                            let jpegData = uiImage.jpegData(compressionQuality: 0.85) ?? data
                            imagePayloads.append((jpegData, "image/jpeg"))
                        }
                    }
                    if !imagePayloads.isEmpty {
                        _ = try await APIClient.shared.uploadImages(
                            imageDataList: imagePayloads,
                            title: titleForTask,
                            caption: highlightForTask.isEmpty ? nil : highlightForTask,
                            tags: tagsForTask,
                            categoryId: categoryForTask
                        )
                    }
                }
                if hasLink {
                    _ = try await APIClient.shared.createItem(
                        type: "link",
                        content: linkForTask,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual"
                    )
                } else if hasVideo {
                    _ = try await APIClient.shared.createItem(
                        type: "video",
                        content: videoForTask,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual"
                    )
                } else if !hasImages {
                    _ = try await APIClient.shared.createItem(
                        type: "text",
                        content: titleForTask,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual"
                    )
                }
                await MainActor.run {
                    isSuccess = true
                    message = "Saved to library."
                    title = ""
                    link = ""
                    videoUrl = ""
                    highlight = ""
                    selectedTags = []
                    selectedPhotoItems = []
                }
            } catch APIError.unauthorized {
                await MainActor.run {
                    message = "Not signed in."
                    isSuccess = false
                }
            } catch {
                await MainActor.run {
                    message = error.localizedDescription
                    isSuccess = false
                }
            }
            await MainActor.run { saving = false }
        }
    }
}

private struct PhotosPickerItemThumbnail<Overlay: View>: View {
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

#Preview {
    NavigationStack { AddView() }
}
