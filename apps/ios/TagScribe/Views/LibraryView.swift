import SwiftUI

/// Library tab: all saved items. Shows empty state when no content.
struct LibraryView: View {
    @State private var items: [Item] = []
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
                    Text("Sign in on the web app to see your library here.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding()
            } else if items.isEmpty {
                VStack(spacing: 12) {
                    Text("No items yet.")
                        .font(.headline)
                    Text("Add from the Share Sheet or use Add to paste a link.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(items) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.title ?? String(item.content.prefix(60)))
                            .lineLimit(1)
                        if !item.tags.isEmpty {
                            Text(item.tags.joined(separator: ", "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Library")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            items = try await APIClient.shared.getItems()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack { LibraryView() }
}
