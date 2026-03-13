import SwiftUI

/// Categories tab: list of categories. Empty state when none.
struct CategoriesView: View {
    @State private var categories: [Category] = []
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
            } else if categories.isEmpty {
                VStack(spacing: 12) {
                    Text("No categories yet.")
                        .font(.headline)
                    Text("Create folders on the web app to organize your library.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(categories) { cat in
                    Label(cat.name, systemImage: "folder")
                }
            }
        }
        .navigationTitle("Categories")
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            categories = try await APIClient.shared.getCategories()
        } catch APIError.unauthorized {
            errorMessage = "Not signed in"
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack { CategoriesView() }
}
