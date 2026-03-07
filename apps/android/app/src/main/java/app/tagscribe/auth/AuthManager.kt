package app.tagscribe.auth

/**
 * Provides Firebase ID token for API requests.
 * TODO: Integrate Firebase Auth Android SDK and return currentUser.getIdToken().
 */
object AuthManager {

    var isSignedIn: Boolean = false
        private set

    /**
     * Returns the Bearer token for Authorization header, or null if not signed in.
     */
    suspend fun getIdToken(): String? {
        // Placeholder: no Firebase yet. Add Firebase Auth and:
        // return Firebase.auth.currentUser?.getIdToken(false)?.result?.token
        return null
    }

    fun signOut() {
        isSignedIn = false
    }
}
