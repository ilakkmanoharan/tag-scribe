import SwiftUI

struct SettingsView: View {
    @State private var mergeEmail = ""
    @State private var mergePassword = ""
    @State private var message: (type: String, text: String)? = nil
    @State private var mergeLoading = false
    @State private var deleteConfirm = ""
    @State private var deleteLoading = false
    @State private var showDeleteConfirm = false

    var body: some View {
        List {
            Section {
                if let email = AuthManager.shared.currentEmail {
                    Text(email)
                        .font(.subheadline)
                }
                Button("Sign out") {
                    AuthManager.shared.signOut()
                }
            } header: {
                Text("Account")
            }

            Section {
                Text("Enter the email and password of the account you want to merge with. Both accounts will then see the same data.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("Email", text: $mergeEmail)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                SecureField("Password", text: $mergePassword)
                    .textContentType(.password)
                Button(mergeLoading ? "Merging…" : "Merge accounts") {
                    Task { await performMerge() }
                }
                .disabled(mergeEmail.isEmpty || mergePassword.isEmpty || mergeLoading)
            } header: {
                Text("Merge accounts")
            }

            Section {
                Button("Delete account", role: .destructive) {
                    showDeleteConfirm = true
                }
            }
        }
        .navigationTitle("Settings")
        .alert("Delete account?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task { await performDelete() }
            }
        } message: {
            Text("Permanently delete your account and all data. This cannot be undone.")
        }
        .overlay {
            if let msg = message {
                VStack {
                    Spacer()
                    Text(msg.text)
                        .font(.caption)
                        .foregroundStyle(msg.type == "ok" ? Color.green : Color.red)
                        .padding(8)
                        .background(.ultraThinMaterial)
                        .cornerRadius(8)
                        .padding()
                }
                .animation(.easeInOut, value: message?.text)
            }
        }
    }

    private func performMerge() async {
        message = nil
        mergeLoading = true
        defer { mergeLoading = false }
        do {
            try await AuthManager.shared.mergeAccounts(email: mergeEmail, password: mergePassword)
            await MainActor.run {
                message = ("ok", "Accounts merged. You’ll see the same data in both accounts.")
                mergeEmail = ""
                mergePassword = ""
            }
        } catch {
            await MainActor.run {
                message = ("error", error.localizedDescription)
            }
        }
    }

    private func performDelete() async {
        deleteLoading = true
        defer { deleteLoading = false }
        do {
            try await AuthManager.shared.deleteAccount()
            await MainActor.run {
                AuthManager.shared.signOut()
            }
        } catch {
            await MainActor.run {
                message = ("error", error.localizedDescription)
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
