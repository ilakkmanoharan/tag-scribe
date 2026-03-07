import SwiftUI

struct ContentView: View {
    @State private var items: [Item] = []
    @State private var error: String?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                } else if let err = error {
                    VStack(spacing: 12) {
                        Text(err)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Text("Sign in on the web app to see your library here.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding()
                } else {
                    List(items) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title ?? item.content.prefix(60).description)
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
            .navigationTitle("Tag Scribe")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign out") {
                        try? AuthManager.shared.signOut()
                    }
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            items = try await APIClient.shared.getItems()
        } catch APIError.unauthorized {
            error = "Not signed in"
        } catch {
            error = error.localizedDescription
        }
    }
}

#Preview {
    ContentView()
}
