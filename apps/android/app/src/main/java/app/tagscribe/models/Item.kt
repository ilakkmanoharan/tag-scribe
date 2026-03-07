package app.tagscribe.models

/**
 * Mirrors API type (camelCase). See private/specifications/mobile-apps/API-CONTRACT.md
 */
data class Item(
    val id: String,
    val type: String,
    val content: String,
    val title: String? = null,
    val highlight: String? = null,
    val caption: String? = null,
    val tags: List<String> = emptyList(),
    val categoryId: String? = null,
    val source: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val archivedAt: String? = null,
)
