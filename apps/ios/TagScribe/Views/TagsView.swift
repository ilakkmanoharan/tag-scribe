import SwiftUI

/// Tags tab: list of tags. Empty state when none.
struct TagsView: View {
    @State private var tags: [String] = []
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
                }
                .padding()
            } else if tags.isEmpty {
                VStack(spacing: 12) {
                    Text("No tags yet.")
                        .font(.headline)
                    Text("Add tags to items in the Library or when adding new items.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(tags.sorted(), id: \.self) { tag in
                    Text(tag)
                }
            }
        }
        .navigationTitle("Tags")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            tags = try await APIClient.shared.getTags()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack { TagsView() }
}
