import SwiftUI

/// Add tab: full form matching web — Title, Link, Video, Highlight, Tags (new + existing), Category (picker + add new).
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
    @State private var saving = false
    @State private var addingCategory = false
    @State private var message: String?
    @State private var isSuccess = false

    private var hasContent: Bool {
        let l = link.trimmingCharacters(in: .whitespacesAndNewlines)
        let v = videoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        return (!l.isEmpty && (l.hasPrefix("http://") || l.hasPrefix("https://"))) ||
            (!v.isEmpty && (v.hasPrefix("http://") || v.hasPrefix("https://")))
    }

    var body: some View {
        Form {
            Section {
                TextField("Display title (optional)", text: $title)
                TextField("Paste or drop a link (e.g. https://...)", text: $link)
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
                Text("Add at least one: link or video URL.")
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
                .disabled(saving || !hasContent)
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
        let linkTrimmed = link.trimmingCharacters(in: .whitespacesAndNewlines)
        let videoTrimmed = videoUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasLink = !linkTrimmed.isEmpty && (linkTrimmed.hasPrefix("http://") || linkTrimmed.hasPrefix("https://"))
        let hasVideo = !videoTrimmed.isEmpty && (videoTrimmed.hasPrefix("http://") || videoTrimmed.hasPrefix("https://"))

        if !hasLink && !hasVideo {
            message = "Please enter a valid link or video URL."
            isSuccess = false
            return
        }

        saving = true
        message = nil
        let type: String
        let content: String
        if hasLink {
            type = "link"
            content = linkTrimmed
        } else {
            type = "video"
            content = videoTrimmed
        }
        Task {
            do {
                _ = try await APIClient.shared.createItem(
                    type: type,
                    content: content,
                    title: title.isEmpty ? nil : title,
                    highlight: highlight.isEmpty ? nil : highlight,
                    tags: selectedTags,
                    categoryId: categoryId,
                    source: "manual"
                )
                await MainActor.run {
                    isSuccess = true
                    message = "Saved to library."
                    title = ""
                    link = ""
                    videoUrl = ""
                    highlight = ""
                    selectedTags = []
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

#Preview {
    NavigationStack { AddView() }
}
