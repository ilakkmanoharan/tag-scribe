import Foundation

/// Mirrors API type: see private/specifications/mobile-apps/API-CONTRACT.md
struct Item: Codable, Identifiable {
    let id: String
    let type: String
    let content: String
    var title: String?
    var highlight: String?
    var caption: String?
    var tags: [String]
    var categoryId: String?
    var source: String?
    let createdAt: String
    let updatedAt: String
    var archivedAt: String?
}
