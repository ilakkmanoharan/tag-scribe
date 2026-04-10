import Foundation

/// Encode/decode multiple HTTP URLs in a single `Item.content` string (newline-separated). Backward-compatible with a single URL with no newlines.
enum LinkStorage {
    static func linkLines(from content: String) -> [String] {
        content
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    static func joinedHTTPURLs(_ lines: [String]) -> String {
        lines
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { isValidHTTPURL($0) }
            .joined(separator: "\n")
    }

    static func isValidHTTPURL(_ s: String) -> Bool {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.hasPrefix("http://") || t.hasPrefix("https://")
    }
}

/// One row in Add / Edit link lists (stable `id` for `ForEach` bindings).
struct EditableLinkRow: Identifiable {
    let id = UUID()
    var value: String = ""
}

/// Mirrors API type: see private/specifications/mobile-apps/API-CONTRACT.md
struct Item: Codable, Identifiable {
    let id: String
    let type: String
    let content: String
    var imageUrls: [String]?
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
