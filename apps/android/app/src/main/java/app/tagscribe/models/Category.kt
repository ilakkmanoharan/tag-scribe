package app.tagscribe.models

/**
 * Mirrors API type (camelCase). See private/specifications/mobile-apps/API-CONTRACT.md
 */
data class Category(
    val id: String,
    val name: String,
    val description: String? = null,
    val order: Int,
    val createdAt: String,
    val updatedAt: String,
)
