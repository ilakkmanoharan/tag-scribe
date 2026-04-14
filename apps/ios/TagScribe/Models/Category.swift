import Foundation

/// Mirrors API type: see private/specifications/mobile-apps/API-CONTRACT.md
struct Category: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    var description: String?
    var order: Int
    let createdAt: String
    let updatedAt: String
}

// MARK: - Reuse existing names (spec: no duplicate category/tag when case-insensitive match)

enum LibraryNaming {
    /// Category already in the list (trimmed, case-insensitive name).
    static func existingCategory(named name: String, in categories: [Category]) -> Category? {
        let t = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return nil }
        return categories.first {
            $0.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == t.lowercased()
        }
    }

    /// Prefer the spelling from `existingTags` when any entry matches case-insensitively.
    static func canonicalTag(_ input: String, existing existingTags: [String]) -> String {
        let t = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return "" }
        if let m = existingTags.first(where: {
            $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == t.lowercased()
        }) {
            return m
        }
        return t
    }

    /// Normalize each tag and drop case-insensitive duplicates (order preserved).
    static func canonicalTags(_ tags: [String], existing existingTags: [String]) -> [String] {
        var out: [String] = []
        for tag in tags {
            let pool = existingTags + out
            let c = canonicalTag(tag, existing: pool)
            guard !c.isEmpty else { continue }
            if !out.contains(where: { $0.lowercased() == c.lowercased() }) {
                out.append(c)
            }
        }
        return out
    }
}
