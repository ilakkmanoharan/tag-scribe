import Foundation

/// Mirrors API type: see private/specifications/mobile-apps/API-CONTRACT.md
struct Category: Codable, Identifiable {
    let id: String
    let name: String
    var description: String?
    var order: Int
    let createdAt: String
    let updatedAt: String
}
