import Foundation

/// Named list of library item ids from the API (`/api/lists`).
struct SavedList: Codable, Identifiable {
    let id: String
    let name: String
    let itemIds: [String]
    let createdAt: String
    let updatedAt: String
}
