import SwiftUI

/// Add tab: paste a link (or title) and save to library. Same idea as web Add page.
struct AddView: View {
    @State private var link = ""
    @State private var title = ""
    @State private var categoryId: String = "cat-inbox"
    @State private var categories: [Category] = []
    @State private var saving = false
    @State private var message: String?
    @State private var isSuccess = false

    var body: some View {
        Form {
            Section {
                TextField("Paste or drop a link here (e.g. https://...)", text: $link)
                    .textContentType(.URL)
                    .autocapitalization(.none)
                    .keyboardType(.URL)
                TextField("Display title (optional)", text: $title)
                    .textContentType(.none)
            } header: {
                Text("Link")
            } footer: {
                Text("Paste a link and tap Save to add it to your library. Title is optional.")
            }

            Section("Category") {
                Picker("Category", selection: $categoryId) {
                    ForEach(categories) { cat in
                        Text(cat.name).tag(cat.id)
                    }
                    if categories.isEmpty {
                        Text("Inbox").tag("cat-inbox")
                    }
                }
                .pickerStyle(.menu)
                .task { await loadCategories() }
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
                    saveLink()
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
                .disabled(saving || link.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .navigationTitle("Add")
        .onAppear { message = nil }
    }

    private func loadCategories() async {
        do {
            categories = try await APIClient.shared.getCategories()
            if categoryId == "cat-inbox" && categories.first(where: { $0.id == "cat-inbox" }) == nil, let first = categories.first {
                categoryId = first.id
            }
        } catch {
            categories = []
        }
    }

    private func saveLink() {
        let urlString = link.trimmingCharacters(in: .whitespacesAndNewlines)
        guard urlString.hasPrefix("http://") || urlString.hasPrefix("https://") else {
            message = "Please enter a valid link (https://...)"
            isSuccess = false
            return
        }
        saving = true
        message = nil
        Task {
            do {
                _ = try await APIClient.shared.createItem(
                    type: "link",
                    content: urlString,
                    title: title.isEmpty ? nil : title,
                    categoryId: categoryId,
                    source: "manual"
                )
                await MainActor.run {
                    isSuccess = true
                    message = "Saved to library."
                    link = ""
                    title = ""
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
