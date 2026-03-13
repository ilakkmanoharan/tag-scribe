import Foundation

/// Tag Scribe API client. Base URL and auth from AuthManager.
/// See private/specifications/mobile-apps/API-CONTRACT.md
final class APIClient {
    static let shared = APIClient()

    var baseURL: String {
        (Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String)
            ?? "https://tag-scribe.vercel.app"
    }

    private let session: URLSession = .shared
    private let decoder: JSONDecoder = JSONDecoder()

    private init() {}

    func authHeaders() async -> [String: String] {
        guard let token = AuthManager.shared.getToken() else {
            return [:]
        }
        return ["Authorization": "Bearer \(token)"]
    }

    func getItems(archived: Bool = false, categoryId: String? = nil, tag: String? = nil) async throws -> [Item] {
        var components = URLComponents(string: baseURL + "/api/items")!
        var query: [URLQueryItem] = []
        if archived { query.append(URLQueryItem(name: "archived", value: "true")) }
        if let c = categoryId { query.append(URLQueryItem(name: "categoryId", value: c)) }
        if let t = tag { query.append(URLQueryItem(name: "tag", value: t)) }
        if !query.isEmpty { components.queryItems = query }

        var request = URLRequest(url: components.url!)
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }

        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        return try decoder.decode([Item].self, from: data)
    }

    func getCategories() async throws -> [Category] {
        var request = URLRequest(url: URL(string: baseURL + "/api/categories")!)
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }

        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        return try decoder.decode([Category].self, from: data)
    }

    func getTags() async throws -> [String] {
        var request = URLRequest(url: URL(string: baseURL + "/api/tags")!)
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }

        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        return try decoder.decode([String].self, from: data)
    }

    /// Create an item. API: POST /api/items with JSON body.
    func createItem(type: String, content: String, title: String? = nil, highlight: String? = nil, caption: String? = nil, tags: [String] = [], categoryId: String? = "cat-inbox", source: String? = "social") async throws -> Item {
        let url = URL(string: baseURL + "/api/items")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        var body: [String: Any] = ["type": type, "content": content]
        if let t = title { body["title"] = t }
        if let h = highlight { body["highlight"] = h }
        if let c = caption { body["caption"] = c }
        if !tags.isEmpty { body["tags"] = tags }
        if let cid = categoryId { body["categoryId"] = cid }
        if let s = source { body["source"] = s }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw APIError.server(http.statusCode)
        }
        return try decoder.decode(Item.self, from: data)
    }

    /// Update item: archive, category, or tags. API: PATCH /api/items/:id
    func updateItem(id: String, archived: Bool? = nil, categoryId: String? = nil, tags: [String]? = nil) async throws -> Item {
        let url = URL(string: baseURL + "/api/items/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        var body: [String: Any] = [:]
        if let a = archived { body["archived"] = a }
        if let c = categoryId { body["categoryId"] = c }
        if let t = tags { body["tags"] = t }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw APIError.server(http.statusCode)
        }
        return try decoder.decode(Item.self, from: data)
    }

    /// Delete item. API: DELETE /api/items/:id
    func deleteItem(id: String) async throws {
        let url = URL(string: baseURL + "/api/items/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        let (_, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 && http.statusCode != 204 {
            throw APIError.server(http.statusCode)
        }
    }

    /// Create category. API: POST /api/categories with { name: string }
    func createCategory(name: String) async throws -> Category {
        let url = URL(string: baseURL + "/api/categories")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["name": name.trimmingCharacters(in: .whitespacesAndNewlines)])
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw APIError.server(http.statusCode)
        }
        return try decoder.decode(Category.self, from: data)
    }

    /// Update category name. API: PATCH /api/categories/:id with { name: string }
    func updateCategory(id: String, name: String) async throws -> Category {
        let url = URL(string: baseURL + "/api/categories/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["name": name.trimmingCharacters(in: .whitespacesAndNewlines)])
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw APIError.server(http.statusCode)
        }
        return try decoder.decode(Category.self, from: data)
    }

    /// Delete category. Items in the category move to Inbox. Inbox cannot be deleted. API: DELETE /api/categories/:id
    func deleteCategory(id: String) async throws {
        let url = URL(string: baseURL + "/api/categories/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        for (k, v) in await authHeaders() { request.setValue(v, forHTTPHeaderField: k) }
        let (_, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
        if let http = response as? HTTPURLResponse, http.statusCode != 200 && http.statusCode != 204 {
            throw APIError.server(http.statusCode)
        }
    }
}

enum APIError: Error {
    case unauthorized
    case server(Int)
}
