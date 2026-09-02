package com.sosmartlabs.momo.chat.data.repository

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.models.WatchUser
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

@Singleton
class ChatWatchUserRepository @Inject constructor(
    private val ioContext: CoroutineContext
) {

    suspend fun fetchActiveWatchUsers(user: ParseUser): List<WatchUser> = withContext(ioContext) {
        ParseQuery.getQuery(WatchUser::class.java)
            .whereEqualTo("user", user)
            .whereExists("watch")
            .whereEqualTo("active", true)
            .include("watch")
            .include("userPermission")
            .suspendFind()
    }
}
