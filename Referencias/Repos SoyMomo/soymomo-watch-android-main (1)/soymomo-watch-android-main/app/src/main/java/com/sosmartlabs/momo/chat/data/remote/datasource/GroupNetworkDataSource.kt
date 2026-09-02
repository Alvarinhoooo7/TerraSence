package com.sosmartlabs.momo.chat.data.remote.datasource

import com.parse.ParseCloud
import com.parse.ParseFile
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.first
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendGet
import com.parse.coroutines.suspendSave
import com.parse.livequery.ParseLiveQueryClient
import com.parse.livequery.SubscriptionHandling
import com.sosmartlabs.momo.chat.data.remote.model.ChatGroup
import com.sosmartlabs.momo.chat.data.remote.model.GroupMember
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

@OptIn(ExperimentalCoroutinesApi::class)
class GroupNetworkDataSource @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) {

    private var parseLiveQueryClient: ParseLiveQueryClient? = null

    suspend fun getUserGroups(user: ParseUser): List<ChatGroup> {
        Timber.d("GroupNetworkDataSource: getUserGroups for user=${user.objectId}")
        return withContext(ioContext) {
            try {
                // Query GroupMember where user = current user
                val memberQuery = ParseQuery.getQuery(GroupMember::class.java)
                    .whereEqualTo("user", user)
                    .whereEqualTo("status", "active")
                    .include("group")
                    .include("group.avatar")

                val members = memberQuery.suspendFind()
                Timber.d("GroupNetworkDataSource: Found ${members.size} group memberships")

                // Extract unique groups
                members.mapNotNull { it.group }.distinctBy { it.objectId }
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: Error in getUserGroups")
                CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error in getUserGroups")
                emptyList()
            }
        }
    }

    suspend fun getGroupById(groupId: String): ChatGroup? {
        Timber.d("GroupNetworkDataSource: getGroupById groupId=$groupId")
        return withContext(ioContext) {
            try {
                return@withContext ParseQuery.getQuery(ChatGroup::class.java)
                    .whereEqualTo("objectId", groupId)
                    .include("avatar").first()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: Error in getGroupById")
                CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error in getGroupById")
                null
            }
        }
    }

    suspend fun createGroup(
        name: String,
        description: String?,
        avatarData: ByteArray?,
        owner: ParseUser,
        members: List<Pair<String, Boolean>> // Pair of (objectId, isWearer)
    ): ChatGroup? {
        Timber.d("GroupNetworkDataSource: createGroup name=$name, members count=${members.size}")
        return withContext(ioContext) {
            try {
                val group = ChatGroup().apply {
                    this.name = name
                    this.groupDescription = description
                    this.owner = owner
                    
                    if (avatarData != null) {
                        val avatarFile = ParseFile("group_avatar.jpg", avatarData)
                        avatarFile.save()
                        this.avatar = avatarFile
                    }
                }
                
                group.suspendSave()
                Timber.d("GroupNetworkDataSource: Group created with objectId=${group.objectId}")
                
                // Create group members
                members.forEach { (memberId, isWearer) ->
                    try {
                        val member = GroupMember().apply {
                            this.group = group
                            this.isWearer = isWearer
                            this.status = "active"
                            this.role = if (memberId == owner.objectId) "admin" else "member"
                            this.joinedAt = java.util.Date()
                            
                            if (isWearer) {
                                // Fetch the wearer object
                                val wearerQuery = ParseQuery.getQuery(Wearer::class.java)
                                val wearer = wearerQuery.get(memberId)
                                this.wearer = wearer
                                this.name = wearer.name()
                            } else {
                                val userQuery = ParseQuery.getQuery(ParseUser::class.java)
                                val memberUser = userQuery.get(memberId)
                                this.user = memberUser
                                this.name = "${memberUser.getString("firstName")} ${memberUser.getString("lastName")}"
                            }
                        }
                        member.suspendSave()
                    } catch (e: Exception) {
                        Timber.e(e, "GroupNetworkDataSource: Error creating member $memberId")
                        CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error creating member")
                    }
                }
                
                group
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: Error in createGroup")
                CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error in createGroup")
                null
            }
        }
    }

    suspend fun updateGroup(
        group: ChatGroup,
        name: String?,
        description: String?,
        avatarData: ByteArray?
    ): Boolean {
        Timber.d("GroupNetworkDataSource: updateGroup groupId=${group.objectId}")
        return withContext(ioContext) {
            try {
                if (name != null) group.name = name
                if (description != null) group.groupDescription = description
                
                if (avatarData != null) {
                    val avatarFile = ParseFile("group_avatar.jpg", avatarData)
                    avatarFile.save()
                    group.avatar = avatarFile
                }
                
                group.suspendSave()
                Timber.d("GroupNetworkDataSource: Group updated successfully")
                true
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: Error in updateGroup")
                CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error in updateGroup")
                false
            }
        }
    }

    fun listenLiveQuery(user: ParseUser): Flow<ChatGroup> = callbackFlow {
        Timber.d("GroupNetworkDataSource: Setting up LiveQuery for groups")

        var query: ParseQuery<ChatGroup>? = null

        try {
            setupLiveQueryClient()

            query = ParseQuery.getQuery(ChatGroup::class.java)
            val client = parseLiveQueryClient
            if (client == null) {
                Timber.e("GroupNetworkDataSource: Client is null after setup")
                return@callbackFlow
            }
            val subscription = client.subscribe(query)

            subscription.handleEvent(SubscriptionHandling.Event.UPDATE) { _, group ->
                Timber.d("GroupNetworkDataSource: Group updated via LiveQuery: ${group.objectId}")
                externalScope.launch {
                    send(group as ChatGroup)
                }
            }

        } catch (e: Exception) {
            Timber.e(e, "GroupNetworkDataSource: Error in listenLiveQuery")
            CrashlyticsLog.recordNonFatalError(e, "GroupNetworkDataSource: Error in listenLiveQuery")
        }

        awaitClose {
            Timber.d("GroupNetworkDataSource: Closing LiveQuery subscription")
            try {
                query?.let {
                    parseLiveQueryClient?.unsubscribe(it)
                }
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: Error during unsubscribe")
            }
        }
    }

    /**
     * Setup the LiveQuery client used for this class
     */
    private fun setupLiveQueryClient() {
        if (parseLiveQueryClient != null) {
            Timber.d("GroupNetworkDataSource: setupLiveQueryClient() - Client already initialized")
            return
        }
        
        Timber.i("GroupNetworkDataSource: setupLiveQueryClient() - Initializing LiveQuery client")
        parseLiveQueryClient = ParseLiveQueryClient.Factory.getClient().apply {
            registerListener(object : com.parse.livequery.ParseLiveQueryClientCallbacks {
                override fun onLiveQueryClientConnected(client: ParseLiveQueryClient?) {
                    Timber.i("GroupNetworkDataSource: LiveQuery client connected")
                }

                override fun onLiveQueryClientDisconnected(client: ParseLiveQueryClient?, userInitiated: Boolean) {
                    Timber.w("GroupNetworkDataSource: LiveQuery client disconnected (userInitiated=$userInitiated)")
                    if (!userInitiated) {
                        Timber.w("GroupNetworkDataSource: Invalidating client due to disconnection")
                        invalidateClient()
                    }
                }

                override fun onLiveQueryError(client: ParseLiveQueryClient?, reason: com.parse.livequery.LiveQueryException?) {
                    Timber.e("GroupNetworkDataSource: LiveQuery error: ${reason?.message}")
                    reason?.let {
                        CrashlyticsLog.recordNonFatalError(it.fillInStackTrace(), "GroupNetworkDataSource: LiveQuery error")
                    }
                    invalidateClient()
                }

                override fun onSocketError(client: ParseLiveQueryClient?, reason: Throwable?) {
                    // Breadcrumb only: "Software caused connection abort" is the OS closing
                    // the websocket when we background — the normal end of a LiveQuery, not a
                    // defect. Never fillInStackTrace() here: it overwrites the throwable's own
                    // stack with this callback's, which is why these were blamed on app code.
                    Timber.e(reason, "GroupNetworkDataSource: LiveQuery socket error")
                    CrashlyticsLog.log("GroupNetworkDataSource: LiveQuery socket error: ${reason?.javaClass?.simpleName}: ${reason?.message}")
                    // Invalidate client on ALL socket errors, including UnknownHostException
                    Timber.w("GroupNetworkDataSource: Invalidating client due to socket error")
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
                Timber.i("GroupNetworkDataSource: invalidateClient() - Disconnecting client")
                client.disconnect()
            } catch (e: Exception) {
                Timber.e(e, "GroupNetworkDataSource: invalidateClient() - Error disconnecting client")
            }
        }
        parseLiveQueryClient = null
        Timber.i("GroupNetworkDataSource: invalidateClient() - Client invalidated")
    }
}
