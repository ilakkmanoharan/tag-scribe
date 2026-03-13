import SwiftUI

struct ContentView: View {
    @State private var items: [Item] = []
    @State private var errorMessage: String?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
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
                ToolbarItem(placement: .primaryAction) {
                    Button("Sign out") {
                        AuthManager.shared.signOut()
                    }
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            items = try await APIClient.shared.getItems()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch let err {
            errorMessage = err.localizedDescription
        }
    }
}

#Preview {
    ContentView()
}
