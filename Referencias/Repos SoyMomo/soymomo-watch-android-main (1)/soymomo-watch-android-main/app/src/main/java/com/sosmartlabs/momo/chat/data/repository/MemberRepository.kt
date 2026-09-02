package com.sosmartlabs.momo.chat.data.repository

import android.content.Context
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.presentation.model.MemberItem
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

/**
 * Repository for fetching and managing members (wearers and associated users)
 * for group chat functionality
 */
@Singleton
class MemberRepository @Inject constructor(
    @ApplicationContext val context: Context,
    private val ioContext: CoroutineContext
) {
    private val appContext = context.applicationContext

    /**
     * Fetches associated users for a list of wearers
     * @param wearers List of wearers to fetch associated users for
     * @return List of MemberItems representing associated users (excluding current user)
     */
    suspend fun fetchAssociatedUsers(wearers: List<Wearer>): List<MemberItem> {
        if (wearers.isEmpty()) return emptyList()

        return withContext(ioContext) {
            try {
                val currentUser = ParseUser.getCurrentUser()
                
                // Query WatchUser where watch is in our list of wearers
                // and user is NOT the current user
                val query = ParseQuery.getQuery(WatchUser::class.java)
                    .whereContainedIn("watch", wearers)
                    .whereNotEqualTo("user", currentUser)
                    .include("user")
                
                // Execute query
                val results = query.suspendFind()
                
                Timber.d("MemberRepository: Found ${results.size} associated users for ${wearers.size} wearers")
                
                // Map to MemberItem, filtering out duplicates (same user linked to multiple watches)
                results.mapNotNull { watchUser ->
                    val user = watchUser.user
                    if (user != null) {
                        val userId = user.objectId
                        // Use full name if available, or username/email
                        val firstName = user.getString("firstName") ?: ""
                        val lastName = user.getString("lastName") ?: ""
                        val fullName = if (firstName.isNotEmpty() || lastName.isNotEmpty()) {
                            "$firstName $lastName".trim()
                        } else {
                            user.username ?: appContext.getString(R.string.chat_fallback_unknown_user)
                        }
                        
                        MemberItem(
                            id = userId,
                            name = fullName,
                            avatarUrl = user.getParseFile("image")?.url,
                            isWearer = false, // It's a user
                            wearerModelName = null,
                            isSelected = false
                        )
                    } else {
                        null
                    }
                }.distinctBy { it.id } // Ensure unique users
                
            } catch (e: Exception) {
                Timber.e(e, "MemberRepository: Failed to fetch associated users")
                CrashlyticsLog.recordNonFatalError(e, "MemberRepository: Failed to fetch associated users")
                emptyList()
            }
        }
    }

    /**
     * Converts a list of WatchUser objects to MemberItems
     * @param watchUsers List of WatchUser objects from current user
     * @return List of MemberItems representing wearers
     */
    fun mapWearersToMemberItems(watchUsers: List<WatchUser>): List<MemberItem> {
        return watchUsers.mapNotNull { watchUser ->
            watchUser.watch?.let { wearer ->
                MemberItem(
                    id = wearer.objectId,
                    name = wearer.name(),
                    avatarUrl = wearer.image?.url,
                    isWearer = true,
                    wearerModelName = wearer.modelName(),
                    isSelected = false
                )
            }
        }
    }

    /**
     * Filters WatchUsers to only include those with wearers that support chat groups (Space4+)
     * @param watchUsers List of WatchUser objects from current user
     * @return Filtered list of WatchUsers with group-chat-compatible wearers
     */
    fun filterWatchUsersForGroupChat(watchUsers: List<WatchUser>): List<WatchUser> {
        return watchUsers.filter { watchUser ->
            watchUser.watch?.model?.hasChatGroups() == true
        }
    }

    /**
     * Converts a list of WatchUser objects to MemberItems, filtering for group-chat-compatible wearers only
     * @param watchUsers List of WatchUser objects from current user
     * @return List of MemberItems representing only wearers that support chat groups (Space4+)
     */
    fun mapWearersToMemberItemsForGroupChat(watchUsers: List<WatchUser>): List<MemberItem> {
        return filterWatchUsersForGroupChat(watchUsers).mapNotNull { watchUser ->
            watchUser.watch?.let { wearer ->
                MemberItem(
                    id = wearer.objectId,
                    name = wearer.name(),
                    avatarUrl = wearer.image?.url,
                    isWearer = true,
                    wearerModelName = wearer.modelName(),
                    isSelected = false
                )
            }
        }
    }

    /**
     * Fetches member details for a list of member IDs
     * @param memberIds Array of member IDs
     * @param isWearerFlags Array indicating if each member is a wearer
     * @return List of MemberItems with complete details
     */
    suspend fun fetchMemberDetails(
        memberIds: Array<String>,
        isWearerFlags: BooleanArray
    ): List<MemberItem> {
        if (memberIds.isEmpty()) return emptyList()

        return withContext(ioContext) {
            try {
                memberIds.mapIndexed { index, id ->
                    val isWearer = isWearerFlags[index]
                    if (isWearer) {
                        // Fetch wearer details
                        fetchWearerById(id)
                    } else {
                        // Fetch user details
                        fetchUserById(id)
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "MemberRepository: Failed to fetch member details")
                CrashlyticsLog.recordNonFatalError(e, "MemberRepository: Failed to fetch member details")
                emptyList()
            }
        }
    }

    /**
     * Fetches a wearer by ID and converts to MemberItem
     */
    private suspend fun fetchWearerById(wearerId: String): MemberItem {
        return try {
            val wearerQuery = ParseQuery.getQuery(Wearer::class.java)
            val wearer = wearerQuery.get(wearerId)
            
            MemberItem(
                id = wearerId,
                name = wearer.name(),
                avatarUrl = wearer.image?.url,
                isWearer = true,
                wearerModelName = wearer.modelName(),
                isSelected = false
            )
        } catch (e: Exception) {
            Timber.e(e, "MemberRepository: Failed to fetch wearer $wearerId")
            // Return placeholder on error
            MemberItem(
                id = wearerId,
                name = appContext.getString(R.string.chat_fallback_wearer),
                avatarUrl = null,
                isWearer = true,
                wearerModelName = null,
                isSelected = false
            )
        }
    }

    /**
     * Fetches a user by ID and converts to MemberItem
     */
    private suspend fun fetchUserById(userId: String): MemberItem {
        return try {
            val userQuery = ParseQuery.getQuery(ParseUser::class.java)
            val user = userQuery.get(userId)
            
            // Use full name if available, or username/email
            val firstName = user.getString("firstName") ?: ""
            val lastName = user.getString("lastName") ?: ""
            val fullName = if (firstName.isNotEmpty() || lastName.isNotEmpty()) {
                "$firstName $lastName".trim()
            } else {
                user.username ?: user.email ?: appContext.getString(R.string.chat_fallback_unknown_user)
            }
            
            MemberItem(
                id = userId,
                name = fullName,
                avatarUrl = user.getParseFile("image")?.url,
                isWearer = false,
                wearerModelName = null,
                isSelected = false
            )
        } catch (e: Exception) {
            Timber.e(e, "MemberRepository: Failed to fetch user $userId")
            // Return placeholder on error
            MemberItem(
                id = userId,
                name = appContext.getString(R.string.chat_fallback_user),
                avatarUrl = null,
                isWearer = false,
                wearerModelName = null,
                isSelected = false
            )
        }
    }
}
