package com.sosmartlabs.momo.chat.data.remote.datasource

import android.content.Context
import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.parse.livequery.ParseLiveQueryClient
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMember
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@OptIn(ExperimentalCoroutinesApi::class)
class GroupMemberNetworkDataSource @Inject constructor(
    @ApplicationContext context: Context,
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) {
    private val appContext = context.applicationContext

    private var parseLiveQueryClient: ParseLiveQueryClient? = null

    suspend fun getGroupMembers(group: ChatGroup): List<GroupMember> {
        Timber.d("GroupMemberNetworkDataSource: getGroupMembers for group=${group.objectId}")
        return withContext(ioContext) {
            try {
                val query = ParseQuery.getQuery(GroupMember::class.java)
                    .whereEqualTo("group", group)
                    .whereEqualTo("status", "active")
                    .include("user")
                    .include("wearer")

                query.suspendFind()
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error in getGroupMembers")
                CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in getGroupMembers")
                emptyList()
            }
        }
    }

    suspend fun addMembers(
        group: ChatGroup,
        members: List<Pair<String, Boolean>> // Pair of (objectId, isWearer)
    ): Boolean {
        Timber.d("GroupMemberNetworkDataSource: addMembers to group=${group.objectId}, count=${members.size}")
        return withContext(ioContext) {
            try {
                members.forEach { (memberId, isWearer) ->
                    try {
                        val member = GroupMember().apply {
                            this.group = group
                            this.isWearer = isWearer
                            this.status = "active"
                            this.role = "member"
                            this.joinedAt = Date()
                            
                            if (isWearer) {
                                val wearerQuery = ParseQuery.getQuery(Wearer::class.java)
                                val wearer = wearerQuery.get(memberId)
                                this.wearer = wearer
                                this.name = wearer.name()
                            } else {
                                val userQuery = ParseQuery.getQuery(ParseUser::class.java)
                                val user = userQuery.get(memberId)
                                this.user = user
                                this.name = user.getString("name")
                                    ?.takeIf { it.isNotBlank() }
                                    ?: appContext.getString(R.string.chat_fallback_user)
                            }
                        }
                        
                        member.suspendSave()
                        Timber.d("GroupMemberNetworkDataSource: Member added: $memberId")
                    } catch (e: ParseException) {
                        // Check if this is error code 137 (DUPLICATE_VALUE)
                        if (e.code == ParseException.DUPLICATE_VALUE) {
                            Timber.i("GroupMemberNetworkDataSource: Member was reactivated from removed status")
                        } else {
                            Timber.e(e, "GroupMemberNetworkDataSource: Error adding member $memberId")
                            CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error adding member")
                            throw e
                        }
                    }
                }
                true
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error in addMembers")
                CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in addMembers")
                false
            }
        }
    }

    suspend fun removeMember(member: GroupMember): Boolean {
        Timber.d("GroupMemberNetworkDataSource: removeMember ${member.objectId}")
        return withContext(ioContext) {
            try {
                // Cloud `beforeSaveGroupMember` enforces the min-members / min-parents /
                // min-wearers invariants and throws Parse error codes 4001 / 4002 / 4003.
                // Callers surface those to the user via ChatGroupError.stringResForCode.
                member.status = "removed"
                member.suspendSave()

                Timber.d("GroupMemberNetworkDataSource: Member removed successfully")
                true
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error in removeMember")
                CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in removeMember")
                throw e
            }
        }
    }

    suspend fun makeAdmin(member: GroupMember): Boolean {
        Timber.d("GroupMemberNetworkDataSource: makeAdmin ${member.objectId}")
        return withContext(ioContext) {
            try {
                member.role = "admin"
                member.suspendSave()
                Timber.d("GroupMemberNetworkDataSource: Member promoted to admin")
                true
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error in makeAdmin")
                CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in makeAdmin")
                false
            }
        }
    }

    suspend fun removeAdmin(member: GroupMember): Boolean {
        Timber.d("GroupMemberNetworkDataSource: removeAdmin ${member.objectId}")
        return withContext(ioContext) {
            try {
                member.role = "member"
                member.suspendSave()
                Timber.d("GroupMemberNetworkDataSource: Admin demoted to member")
                true
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error in removeAdmin")
                CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in removeAdmin")
                false
            }
        }
    }

    fun listenLiveQuery(group: ChatGroup): Flow<GroupMember> = callbackFlow {
        Timber.d("GroupMemberNetworkDataSource: Setting up LiveQuery for group members")
        
        var query: ParseQuery<GroupMember>? = null
        
        try {
            setupLiveQueryClient()
            
            query = ParseQuery.getQuery(GroupMember::class.java)
                .whereEqualTo("group", group)
            
            val client = parseLiveQueryClient
            if (client == null) {
                Timber.e("GroupMemberNetworkDataSource: Client is null after setup")
                return@callbackFlow
            }
            val subscription = client.subscribe(query)
            
            subscription.handleEvent(com.parse.livequery.SubscriptionHandling.Event.CREATE) { _, member ->
                Timber.d("GroupMemberNetworkDataSource: New member via LiveQuery")
                externalScope.launch {
                    send(member as GroupMember)
                }
            }
            
            subscription.handleEvent(com.parse.livequery.SubscriptionHandling.Event.UPDATE) { _, member ->
                Timber.d("GroupMemberNetworkDataSource: Member updated via LiveQuery")
                externalScope.launch {
                    send(member as GroupMember)
                }
            }
            
        } catch (e: Exception) {
            Timber.e(e, "GroupMemberNetworkDataSource: Error in listenLiveQuery")
            CrashlyticsLog.recordNonFatalError(e, "GroupMemberNetworkDataSource: Error in listenLiveQuery")
        }
        
        awaitClose {
            Timber.d("GroupMemberNetworkDataSource: Closing LiveQuery subscription")
            try {
                query?.let {
                    parseLiveQueryClient?.unsubscribe(it)
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: Error during unsubscribe")
            }
        }
    }

    /**
     * Setup the LiveQuery client used for this class
     */
    private fun setupLiveQueryClient() {
        if (parseLiveQueryClient != null) {
            Timber.d("GroupMemberNetworkDataSource: setupLiveQueryClient() - Client already initialized")
            return
        }
        
        Timber.i("GroupMemberNetworkDataSource: setupLiveQueryClient() - Initializing LiveQuery client")
        parseLiveQueryClient = ParseLiveQueryClient.Factory.getClient().apply {
            registerListener(object : com.parse.livequery.ParseLiveQueryClientCallbacks {
                override fun onLiveQueryClientConnected(client: ParseLiveQueryClient?) {
                    Timber.i("GroupMemberNetworkDataSource: LiveQuery client connected")
                }

                override fun onLiveQueryClientDisconnected(client: ParseLiveQueryClient?, userInitiated: Boolean) {
                    Timber.w("GroupMemberNetworkDataSource: LiveQuery client disconnected (userInitiated=$userInitiated)")
                    if (!userInitiated) {
                        Timber.w("GroupMemberNetworkDataSource: Invalidating client due to disconnection")
                        invalidateClient()
                    }
                }

                override fun onLiveQueryError(client: ParseLiveQueryClient?, reason: com.parse.livequery.LiveQueryException?) {
                    Timber.e("GroupMemberNetworkDataSource: LiveQuery error: ${reason?.message}")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "GroupMemberNetworkDataSource: LiveQuery error")
                    }
                    invalidateClient()
                }

                override fun onSocketError(client: ParseLiveQueryClient?, reason: Throwable?) {
                    Timber.e(reason, "GroupMemberNetworkDataSource: LiveQuery socket error")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "GroupMemberNetworkDataSource: LiveQuery socket error")
                    }
                    // Invalidate client on ALL socket errors, including UnknownHostException
                    Timber.w("GroupMemberNetworkDataSource: Invalidating client due to socket error")
                    invalidateClient()
                }
            })
        }
    }

    /**
     * Invalidates the LiveQuery client, forcing a fresh client on next use
     */
    @Synchronized
    private fun invalidateClient() {
        parseLiveQueryClient?.let { client ->
            try {
                Timber.i("GroupMemberNetworkDataSource: invalidateClient() - Disconnecting client")
                client.disconnect()
            } catch (e: Exception) {
                Timber.e(e, "GroupMemberNetworkDataSource: invalidateClient() - Error disconnecting client")
            }
        }
        parseLiveQueryClient = null
        Timber.i("GroupMemberNetworkDataSource: invalidateClient() - Client invalidated")
    }
}
