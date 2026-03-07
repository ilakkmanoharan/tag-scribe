package app.tagscribe.api

import app.tagscribe.models.Category
import app.tagscribe.models.Item
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Tag Scribe API. See private/specifications/mobile-apps/API-CONTRACT.md
 * Auth header is added by OkHttp interceptor.
 */
interface ApiService {

    @GET("api/items")
    suspend fun getItems(
        @Query("archived") archived: Boolean? = null,
        @Query("categoryId") categoryId: String? = null,
        @Query("tag") tag: String? = null,
    ): List<Item>

    @GET("api/categories")
    suspend fun getCategories(): List<Category>

    @GET("api/tags")
    suspend fun getTags(): List<String>
}
