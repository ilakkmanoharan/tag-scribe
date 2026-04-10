import Foundation

/// Encode/decode multiple HTTP URLs in a single `Item.content` string (newline-separated). Backward-compatible with a single URL with no newlines.
enum LinkStorage {
    /// Reserved line so a `link` item can store a separate video URL without an API schema change.
    private static let embeddedVideoLinePrefix = "__TAGSCRIBE_VIDEO__\t"

    static func linkLines(from content: String) -> [String] {
        content
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    /// Splits `content` into web-link segments (for editors / display) and an optional embedded video URL.
    static func parseLinkItemContent(_ content: String) -> (linkSegments: [String], embeddedVideo: String?) {
        var segments: [String] = []
        var video: String?
        for raw in content.split(whereSeparator: \.isNewline) {
            let line = String(raw).trimmingCharacters(in: .whitespaces)
            guard !line.isEmpty else { continue }
            if line.hasPrefix(embeddedVideoLinePrefix) {
                let rest = String(line.dropFirst(embeddedVideoLinePrefix.count)).trimmingCharacters(in: .whitespaces)
                if !rest.isEmpty { video = rest }
            } else {
                segments.append(line)
            }
        }
        return (segments, video)
    }

    /// Packs HTTP link rows and optional video URL for `type: link` item `content`.
    static func packLinkItemContent(linkFieldValues: [String], videoURL: String?) -> String {
        let linksPart = joinedHTTPURLs(linkFieldValues)
        let v = videoURL?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let hasVideo = isValidHTTPURL(v)
        if linksPart.isEmpty, !hasVideo { return "" }
        if linksPart.isEmpty, hasVideo { return embeddedVideoLinePrefix + v }
        if !linksPart.isEmpty, !hasVideo { return linksPart }
        return linksPart + "\n" + embeddedVideoLinePrefix + v
    }

    static func embeddedVideo(from content: String) -> String? {
        parseLinkItemContent(content).embeddedVideo
    }

    /// HTTP URL strings to show as web links (excludes embedded video line).
    static func displayWebLinkStrings(from content: String) -> [String] {
        let (segments, _) = parseLinkItemContent(content)
        return segments.filter { isValidHTTPURL($0) }
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
    /// Calendar due date `YYYY-MM-DD` (optional).
    var dueDate: String?
    /// e.g. `low`, `medium`, `high` (optional).
    var priority: String?
}

/// ISO `yyyy-MM-dd` due dates and priority labels for UI.
enum ItemScheduleFormat {
    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    static func isoString(from date: Date) -> String {
        isoFormatter.string(from: date)
    }

    static func date(fromIso s: String) -> Date? {
        isoFormatter.date(from: s)
    }

    static func displayDueDate(fromIso s: String?) -> String? {
        guard let s, !s.isEmpty, let d = isoFormatter.date(from: s) else { return nil }
        return displayFormatter.string(from: d)
    }

    static func displayPriority(_ raw: String?) -> String? {
        guard let r = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !r.isEmpty else { return nil }
        switch r.lowercased() {
        case "low": return "Low"
        case "medium": return "Medium"
        case "high": return "High"
        default: return r.localizedCapitalized
        }
    }
}
