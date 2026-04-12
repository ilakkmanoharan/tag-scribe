import Foundation

/// Named list of library item ids from the API (`/api/lists`).
struct SavedList: Codable, Identifiable {
    let id: String
    var name: String
    let itemIds: [String]
    let createdAt: String
    var updatedAt: String
    /// Calendar day `YYYY-MM-DD` (optional).
    var dueDate: String?
    /// `low` | `medium` | `high` (optional).
    var priority: String?
}
