import SwiftUI
import PhotosUI

/// Add tab: full form matching web — Title, Link, Video, Pictures, Highlight, Tags (new + existing), Category (picker + add new).
struct AddView: View {
    @State private var title = ""
    @State private var linkFields: [EditableLinkRow] = [EditableLinkRow()]
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
    @State private var hasDueDate = false
    @State private var dueDatePicker = Date()
    @State private var priorityChoice = ""

    private var hasValidTitle: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        Form {
            Section {
                TextField("Display title", text: $title)
                ForEach($linkFields) { $field in
                    HStack(alignment: .center, spacing: 8) {
                        TextField("https://...", text: $field.value)
                            .textContentType(.URL)
                            .autocapitalization(.none)
                            .keyboardType(.URL)
                        if linkFields.count > 1 {
                            Button {
                                linkFields.removeAll { $0.id == field.id }
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
                    linkFields.append(EditableLinkRow())
                } label: {
                    Label("Add link", systemImage: "plus.circle")
                }
                TextField("Video URL (optional, e.g. https://...mp4)", text: $videoUrl)
                    .textContentType(.URL)
                    .autocapitalization(.none)
                    .keyboardType(.URL)
            } header: {
                Text("Link & media")
            } footer: {
                Text("Display title is required. Use Add link (+) for multiple URLs. Video URL and pictures are optional.")
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
            } header: {
                Text("Schedule (optional)")
            } footer: {
                Text("Due date and priority appear in the library when set.")
            }

            Section("Tags (optional)") {
                ForEach(selectedTags, id: \.self) { tag in
                    HStack {
                        Text(tag)
                        Spacer()
                        Button("Remove") {
                            selectedTags.removeAll { $0 == tag }
                        }
                        .font(.caption)
                    }
                }
                HStack {
                    TextField("New tag", text: $newTagInput)
                    Button("Add") {
                        let t = newTagInput.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !t.isEmpty, !selectedTags.contains(where: { $0.lowercased() == t.lowercased() }) {
                            selectedTags.append(t)
                            newTagInput = ""
                        }
                    }
                    .disabled(newTagInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                if existingTags.isEmpty {
                    Text("No existing tags.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                } else if !existingTags.filter({ tag in !selectedTags.contains(where: { $0.lowercased() == tag.lowercased() }) }).isEmpty {
                    Text("Existing — tap to add:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    FlowLayout(spacing: 16, lineSpacing: 20) {
                        ForEach(
                            existingTags.filter { tag in !selectedTags.contains(where: { $0.lowercased() == tag.lowercased() }) },
                            id: \.self
                        ) { tag in
                            Button {
                                if !selectedTags.contains(where: { $0.lowercased() == tag.lowercased() }) {
                                    selectedTags.append(tag)
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
        let linkJoined = LinkStorage.joinedHTTPURLs(linkFields.map(\.value))
        let videoTrimmed = videoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasLink = !linkJoined.isEmpty
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
        let videoForTask = videoTrimmed
        let highlightForTask = highlight
        let tagsForTask = selectedTags
        let categoryForTask = categoryId
        let dueForTask: String? = hasDueDate ? ItemScheduleFormat.isoString(from: dueDatePicker) : nil
        let priorityForTask: String? = priorityChoice.isEmpty ? nil : priorityChoice

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
                            categoryId: categoryForTask,
                            dueDate: dueForTask,
                            priority: priorityForTask
                        )
                    }
                }
                if hasLink {
                    let linkContent = LinkStorage.packLinkItemContent(
                        linkFieldValues: linkFields.map(\.value),
                        videoURL: hasVideo ? videoTrimmed : nil
                    )
                    _ = try await APIClient.shared.createItem(
                        type: "link",
                        content: linkContent,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual",
                        dueDate: dueForTask,
                        priority: priorityForTask
                    )
                } else if hasVideo {
                    _ = try await APIClient.shared.createItem(
                        type: "video",
                        content: videoForTask,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual",
                        dueDate: dueForTask,
                        priority: priorityForTask
                    )
                } else if !hasImages {
                    _ = try await APIClient.shared.createItem(
                        type: "text",
                        content: titleForTask,
                        title: titleForTask,
                        highlight: highlightForTask.isEmpty ? nil : highlightForTask,
                        tags: tagsForTask,
                        categoryId: categoryForTask,
                        source: "manual",
                        dueDate: dueForTask,
                        priority: priorityForTask
                    )
                }
                await MainActor.run {
                    isSuccess = true
                    message = "Saved to library."
                    title = ""
                    linkFields = [EditableLinkRow()]
                    videoUrl = ""
                    highlight = ""
                    selectedTags = []
                    selectedPhotoItems = []
                    hasDueDate = false
                    priorityChoice = ""
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
