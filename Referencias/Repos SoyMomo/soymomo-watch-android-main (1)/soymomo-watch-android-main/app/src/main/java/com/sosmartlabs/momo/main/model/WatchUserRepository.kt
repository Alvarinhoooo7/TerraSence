package com.sosmartlabs.momo.main.model

import com.parse.ParseException
import com.parse.ParseFile
import com.parse.ParseObject
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFetch
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.parse.ktx.include
import com.parse.ktx.whereEqualTo
import com.parse.ktx.whereExists
import com.parse.ktx.whereNotEqualTo
import com.parse.livequery.LiveQueryException
import com.parse.livequery.ParseLiveQueryClient
import com.parse.livequery.ParseLiveQueryClientCallbacks
import com.parse.livequery.SubscriptionHandling
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.watchrequests.model.UserPermission
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

/**
 * Class for retrieve WatchUser information from Parse
 */
@Singleton
class WatchUserRepository @Inject constructor(
    private val externalScope: CoroutineScope,
    private val ioContext: CoroutineContext
) {
    /**
     * Client for Parse LiveQuery
     */
    private var _parseLiveQueryClient: ParseLiveQueryClient? = null

    /**
     * Property for access Parse LiveQuery client
     */
    private var parseLiveQueryClient: ParseLiveQueryClient?
        get() {
            _parseLiveQueryClient =
                _parseLiveQueryClient ?: ParseLiveQueryClient.Factory.getClient().apply {
                    registerListener(object : ParseLiveQueryClientCallbacks {
                        override fun onLiveQueryClientConnected(client: ParseLiveQueryClient?) {
                            // Do nothing
                        }

                        override fun onLiveQueryClientDisconnected(
                            client: ParseLiveQueryClient?,
                            userInitiated: Boolean
                        ) {
                            // DO nothing
                        }

                        override fun onLiveQueryError(
                            client: ParseLiveQueryClient?,
                            reason: LiveQueryException?
                        ) {
                            externalScope.launch(ioContext) {
                                liveQueryMutex.withLock {
                                    reconnect()
                                }
                            }
                        }

                        override fun onSocketError(
                            client: ParseLiveQueryClient?,
                            reason: Throwable?
                        ) {
                            externalScope.launch(ioContext) {
                                liveQueryMutex.withLock {
                                    reconnect()
                                }
                            }
                        }
                    })
                }
            return _parseLiveQueryClient
        }
        set(value) {
            _parseLiveQueryClient = value
        }

    /**
     * Current user.
     * Used for no reload all the data if is asked the data for the current user
     */
    private var currentUser: ParseUser? = null

    /**
     * Query for updating watches data
     */
    @Volatile
    private var watchesQuery: ParseQuery<Wearer>? = null

    /**
     * Query for updating watchUsers data
     */
    @Volatile
    private var watchUsersQuery: ParseQuery<WatchUser>? = null

    /**
     * List of currently loaded watch users
     */
    @Volatile
    private lateinit var watchUsers: List<WatchUser>

    /**
     * Current user Wearer list.
     */
    @Volatile
    private lateinit var userWatches: List<Wearer>

    /**
     * Mutex for live queries subscribe/unsubscribe operations
     */
    private val liveQueryMutex = Mutex()

    private var watchUserPermission: ParseQuery<UserPermission>? = null

    /**
     * Ids for watches currently observed by live query
     */
    private lateinit var liveQueryWatchIds: List<String>

    /**
     * Returns if there is a Live Query that is listening for the watches for this user
     * @param user Current user
     * @return True if there is a live query listening watches for this user, false otherwise
     */
    fun isLoadingWatchesForUser(user: ParseUser) =
        currentUser?.objectId == user.objectId && watchUsersQuery != null

    /**
     * Obtains the base [ParseQuery] for WatchUser associated to a given user
     * @param user User for query
     * @return Base query of [WatchUser] for the given user
     */
    private fun getWatchUsersBaseQuery(user: ParseUser) =
        ParseQuery.getQuery(WatchUser::class.java)
            .whereEqualTo(WatchUser::user, user)
            .whereExists(WatchUser::watch)
            .include(WatchUser::watch)
            .include(WatchUser::user)
            .include(WatchUser::userPermission)
            .orderByDescending("createdAt")

    /**
     * Loads the WatchUsers associated with the current user
     * @param user User for loading watches
     */
    @ExperimentalCoroutinesApi
    fun loadWatchesForUser(user: ParseUser) = callbackFlow {
        Timber.d("loadWatchesForUser with user ${user.objectId}")
        var liveQueryHandler: SubscriptionHandling<WatchUser>? = null

        runCatching {
            val baseQuery = getWatchUsersBaseQuery(user)

            if (currentUser?.objectId != user.objectId) {
                Timber.d("loadWatchesForUser: setting user and sending LOADING")
                trySend(Resource(Resource.Status.LOADING))
                currentUser = user
            }
            // Deliberately NO cached LOAD_SUCCESS re-emission for a same-user
            // resume. Wearer.isConnected() is time-based (lastTKQ within the
            // threshold of NOW), so after a long background the cached list
            // re-evaluates as disconnected and re-emitting it repainted the main
            // screen red until the fresh query below corrected it. The UI keeps
            // its previous state meanwhile: the screen already renders the last
            // list, and the ViewModel only shows a loading state when it has no
            // cache at all.

            liveQueryMutex.withLock {
                watchUsersQuery = baseQuery

                parseLiveQueryClient!!.connectIfNeeded()
                liveQueryHandler = parseLiveQueryClient!!.subscribe(watchUsersQuery)
            }

            Timber.d("loadWatchesForUser performing next query: $baseQuery")
            watchUsers = baseQuery.suspendFind()
            Timber.d("loadWatchesForUser found ${watchUsers.size} watchUsers after suspendFind")
            userWatches = fetchWatchesInParallel(watchUsers)

        }.onSuccess {
            Timber.d("loadWatchesForUser onSuccess with ${watchUsers.size} watchUsers")
            trySend(Resource(Resource.Status.LOAD_SUCCESS, watchUsers))
            liveQueryMutex.withLock {
                liveQueryHandler!!.handleEvents { _, event, watchUser ->
                    Timber.d("loadWatchesForUser liveQueryHandler event $event")
                    when (event) {
                        SubscriptionHandling.Event.CREATE -> trySend(watchUserCreated(watchUser))
                        SubscriptionHandling.Event.UPDATE -> if (watchUserHasChanges(watchUser)) trySend(watchUserUpdated(watchUser))
                        SubscriptionHandling.Event.DELETE -> trySend(watchUserDeleted(watchUser))
                        else -> {}
                    }
                }.handleError { _, exception ->
                    close(exception)
                }
            }
        }.onFailure {
            when (it) {
                is ParseException -> {
                    trySend(Resource(Resource.Status.LOAD_ERROR, null, it))
                    close()
                }
                is CancellationException -> {
                    unsubscribeWatchUsersQuery()
                }
                else -> close(it)
            }
        }
        awaitClose {
            runBlocking {
                unsubscribeWatchUsersQuery()
            }
        }
    }

    private suspend fun fetchWatchesInParallel(watchUsers: List<WatchUser>): List<Wearer> {
        return coroutineScope {
            watchUsers.map { watchUser ->
                async(ioContext) {
                    val watch = watchUser.watch
                    if (watch == null) {
                        throw IllegalStateException("WatchUser ${watchUser.objectId} has null watch")
                    }
                    Timber.d("loadWatchesForUser fetching ${watch.objectId} because is needed")
                    if (!watch.isDataAvailable) {
                        runCatching { watch.suspendFetch<Wearer>() }
                            .onFailure { e ->
                                when (e) {
                                    is ParseException -> {
                                        Timber.e(e, "Error fetching watch ${watch.objectId}")
                                        CrashlyticsLog.recordNonFatalError(
                                            e,
                                            "Error fetching watch in parallel"
                                        )
                                    }
                                    is CancellationException -> throw e
                                    else -> {
                                        Timber.e(e, "Error fetching watch ${watch.objectId}")
                                        CrashlyticsLog.recordNonFatalError(
                                            e,
                                            "Error fetching watch in parallel"
                                        )
                                    }
                                }
                            }
                    }
                    watch
                }
            }.awaitAll()
        }
    }

    private suspend fun unsubscribeWatchUsersQuery() {
        Timber.d("unsubscribeWatchUsersQuery")
        liveQueryMutex.withLock {
            parseLiveQueryClient?.unsubscribe(watchUsersQuery)
            watchUsersQuery = null
            disconnectLiveQueryClientIfNeeded()
        }
    }

    /**
     * Returns if there is a live query listening for all the watches in the given list
     * @param watches list of watches to query
     * @return False if there is a live query listening for all the watches in the list, true otherwise
     */
    suspend fun shouldUpdateWatchUpdatesQuery(watches: List<Wearer>): Boolean {
        liveQueryMutex.withLock {
            return !::liveQueryWatchIds.isInitialized || liveQueryWatchIds != watches.map { it.objectId }
        }
    }

    /**
     * Subscribes to Flow updates for the watches in the list
     */
    @ExperimentalCoroutinesApi
    fun subscribeWatchesUpdates(watches: List<Wearer>) = callbackFlow {
        liveQueryMutex.withLock {
            if (watchesQuery != null) parseLiveQueryClient!!.unsubscribe(watchesQuery)

            liveQueryWatchIds = watches.map { watch -> watch.objectId }

            watchesQuery = ParseQuery.getQuery(Wearer::class.java)
                .whereContainedIn("objectId", liveQueryWatchIds)

            with(parseLiveQueryClient!!) {
                connectIfNeeded()
                with(subscribe(watchesQuery)) {
                    handleEvent(SubscriptionHandling.Event.UPDATE) { _, watch ->
                        with(watchUsers.first { it.watch!!.objectId == watch.objectId }) {
                            this.watch = watch.fetchIfNeeded()
                        }
                        userWatches = watchUsers.map { it.watch!! }
                        trySend(watch)
                    }
                    handleError { _, exception ->
                        when (exception.cause) {
                            is ParseException -> {
                                runBlocking(coroutineContext) {
                                    unsubscribeWatchUsersQuery()
                                }
                                close(exception.cause)
                            }
                            is CancellationException -> {
                                runBlocking(coroutineContext) {
                                    unsubscribeWatchUsersQuery()
                                }
                                close()
                            }
                            else -> close(exception.cause)
                        }
                    }
                }
            }
        }

        awaitClose {
            runBlocking {
                liveQueryMutex.withLock {
                    parseLiveQueryClient?.unsubscribe(watchesQuery)
                    watchesQuery = null
                    disconnectLiveQueryClientIfNeeded()
                    liveQueryWatchIds = listOf()
                }
            }
        }
    }

    @ExperimentalCoroutinesApi
    fun subscribeWatchUserPermissionUpdate(userPermissions: List<UserPermission>) = callbackFlow {
        liveQueryMutex.withLock {
            if (watchUserPermission != null) parseLiveQueryClient!!.unsubscribe(watchUserPermission)
            watchUserPermission = ParseQuery.getQuery(UserPermission::class.java)
                .whereContainedIn("objectId",userPermissions.map { it.objectId })

            with(parseLiveQueryClient!!){
                connectIfNeeded()
                with(subscribe(watchUserPermission)){
                    handleEvent(SubscriptionHandling.Event.UPDATE){ _, userPermission ->
                        with(watchUsers.first {it.userPermission.objectId == userPermission.objectId}){
                            this.userPermission = userPermission
                        }
                        trySend(userPermission)
                    }
                    handleError{ _, exception ->
                        when (exception.cause) {
                            is ParseException -> {
                                runBlocking(coroutineContext) {
                                    unsubscribeWatchUserPermissions()
                                }
                                close(exception.cause)
                            }
                            is CancellationException -> {
                                runBlocking(coroutineContext) {
                                    unsubscribeWatchUserPermissions()
                                }
                                close()
                            }
                            else -> close(exception.cause)
                        }
                    }
                }

            }
        }

        awaitClose {
            runBlocking {
                unsubscribeWatchUserPermissions()
            }
        }

    }

    private suspend fun unsubscribeWatchUserPermissions() {
        liveQueryMutex.withLock {
            parseLiveQueryClient?.unsubscribe(watchUserPermission)
            watchUserPermission = null
            disconnectLiveQueryClientIfNeeded()
        }
    }

    private fun disconnectLiveQueryClientIfNeeded() {
        if (watchesQuery == null && watchUsersQuery == null) {
            parseLiveQueryClient!!.disconnect()
            parseLiveQueryClient = null
        }
    }

    /**
     * Reacts when a new WatchUser is created
     * @param watchUser New WatchUser
     */
    private fun watchUserCreated(watchUser: WatchUser) =
        updateWatchUsersList { watchUsersList -> watchUsersList.add(0, watchUser) }

    /**
     * Determines if the [WatchUser] object has a significant change.
     * Sometimes the Live Query for [WatchUser] triggers an update operation that does not implies
     * a meaningful change for the app (i.e, active param does not change), so we check of this
     * param changed before trigger the update from the live query flow consumer.
     * @param watchUser [WatchUser] to check
     * @return True if the given object has a significant change, false otherwise
     */
    private fun watchUserHasChanges(watchUser: WatchUser): Boolean {
        val oldWatchUser = watchUsers.find { it.objectId == watchUser.objectId }
        return oldWatchUser?.active != watchUser.active
    }

    /**
     * Reacts when a new WatchUser is updated
     * @param watchUser Updated WatchUser
     */
    private fun watchUserUpdated(watchUser: WatchUser) =
        updateWatchUsersList { watchUsersList ->
            run {
                watchUsersList[watchUsersList.indexOf(watchUser)] = watchUser.apply {
                    watch = findWatchById(watchUser.watch!!.objectId)
                    userPermission = watchUsersList.find { watchUser.objectId == it.objectId }?.userPermission!!
                }
            }
        }

    /**
     * Reacts when a WatchUser is deleted
     * @param watchUser Deleted WatchUser
     */
    private fun watchUserDeleted(watchUser: WatchUser) =
        updateWatchUsersList { watchUserList -> watchUserList.remove(watchUser) }

    /**
     * Updates the LiveData for WatchUser and Wearer objects
     * @param watchUserListOperations Function with the actual changes to do on the WatchUser List
     */
    private fun updateWatchUsersList(watchUserListOperations: (MutableList<WatchUser>) -> Unit): Resource<List<WatchUser>, ParseException> {
        val watchUsersList = watchUsers.toMutableList()
        watchUserListOperations(watchUsersList)
        watchUsers = watchUsersList.toList()
        userWatches = watchUsersList.map { watchUser -> watchUser.watch!! }
        return Resource(Resource.Status.LOAD_SUCCESS, watchUsersList)
    }

    /**
     * Obtains the watch with the given objectId
     * @param objectId ObjectId for the watch required
     * @return Watch with the given objectId
     */
    fun findWatchById(objectId: String): Wearer =
        if (::userWatches.isInitialized) userWatches.firstOrNull { it.objectId == objectId }
        else {
            CrashlyticsLog.log("Querying wearer in Parse by objectId")
            null
        } ?: ParseQuery(Wearer::class.java).whereEqualTo("objectId", objectId).first.fetchIfNeeded()

    /**
     * Obtains the watch with the given device Id
     * @param deviceId Device Id for the watch
     * @return Watch with the given device Id
     */
    fun findWatchByDeviceId(deviceId: String): Wearer =
        if (::userWatches.isInitialized) userWatches.firstOrNull { it.deviceId == deviceId }
        else {
            CrashlyticsLog.log("Querying wearer in Parse by deviceId")
            null
        } ?: ParseQuery(Wearer::class.java).whereEqualTo(Wearer::deviceId, deviceId).first.fetchIfNeeded()

    /**
     * Returns whether the current user holds the `videocall` permission for the
     * given watch, read from the cached watch-user list (kept fresh by the
     * permission live query). Defaults to true when the watch-user isn't cached
     * (e.g. chat opened before the list loaded) so a cache miss never hides the
     * feature from a legitimate user.
     * @param wearer Watch to check the permission for
     * @return True if video calls are permitted (or the permission is unknown)
     */
    fun hasVideocallPermission(wearer: Wearer): Boolean {
        if (!::watchUsers.isInitialized) return true
        val watchUser = watchUsers.firstOrNull { it.watch?.objectId == wearer.objectId } ?: return true
        return watchUser.userPermission?.videocall ?: true
    }

    /**
     * Location permission for a wearer, or null when we genuinely don't know.
     *
     * Cache-only and non-blocking. Three deliberate differences from [hasVideocallPermission],
     * each of which matters:
     *
     * 1. It reads through `has()` + `getBoolean()` rather than `userPermission.location`.
     *    `UserPermission.location` is `ParseDelegate<Boolean>` declared NON-null, so an
     *    absent column returns null and NPEs on unboxing.
     * 2. It returns null for "unknown" instead of defaulting to true. Failing open is right
     *    for call and messages — a cache miss must not hide a feature from a legitimate
     *    user — and wrong for a child's location, where the caller should show nothing
     *    rather than either reveal a position or accuse the account of lacking access.
     * 3. It matches on the wearer id directly, so callers that only hold an id (a screen
     *    launched from an Intent extra) don't have to resolve a Wearer first.
     *
     * Do not "simplify" any of the three.
     */
    /**
     * Whether this user may call the wearer. Cache-only and non-blocking.
     *
     * Fails OPEN — unknown returns true — deliberately, and unlike
     * [locationPermissionOrNull]. A cache miss must not hide a feature from a legitimate
     * parent; that is the same call [hasVideocallPermission] makes. Location is the
     * exception because revealing a child's position to someone without access is worse
     * than withholding it.
     *
     * Read through has()+getBoolean(): UserPermission.call is a non-null-declared
     * ParseDelegate<Boolean> and NPEs on unboxing when the column is absent.
     */
    fun canCallWearer(wearerId: String): Boolean {
        if (!::watchUsers.isInitialized) return true
        val permission = watchUsers
            .firstOrNull { it.watch?.objectId == wearerId }
            ?.userPermission
            ?: return true
        return if (permission.has("call")) permission.getBoolean("call") else true
    }

    fun locationPermissionOrNull(wearerId: String): Boolean? {
        if (!::watchUsers.isInitialized) return null
        val permission = watchUsers
            .firstOrNull { it.watch?.objectId == wearerId }
            ?.userPermission
            ?: return null
        return if (permission.has("location")) permission.getBoolean("location") else null
    }

    suspend fun fetchWatch(watch: Wearer) {
        watch.suspendFetch<Wearer>()
    }

    suspend fun updateWatch(wearer: Wearer) {
        if (wearer.isDirty) {
            wearer.suspendSave()
            wearer.profileModified = true
        }
    }

    suspend fun setProfileImage(wearer: Wearer, uri: String) {
        val parseFile = ParseFile(File(uri)).apply { save() }
        wearer.image = parseFile
        wearer.suspendSave()
        wearer.profileModified = true
    }

    suspend fun setWearerPhone(wearer: Wearer, phone: String) {
        wearer.phone = phone
        wearer.suspendSave()
    }

    suspend fun removeProfileImage(wearer: Wearer) {
        wearer.remove("image")
        wearer.suspendSave()
        wearer.profileModified = true
    }

    fun revertWatch(wearer: Wearer) {
        if (wearer.isDirty)
            wearer.revert()
    }

    suspend fun loadRequestForId(watchId: String): List<WatchUser> {
        val watch = findWatchById(watchId)
        CrashlyticsLog.log("Queries to load request for id ")
        return ParseQuery.getQuery(WatchUser::class.java)
            .whereNotEqualTo(WatchUser::user, ParseUser.getCurrentUser())
            .whereEqualTo(WatchUser::watch, watch)
            .include(WatchUser::user)
            .include(WatchUser::userPermission)
            .suspendFind().onEach { watchUser -> watchUser.watch = watch }
    }

    fun findWatchUserByWatchId(watchId: String, user: ParseUser): WatchUser {
        if(::watchUsers.isInitialized) {
            val watchUser = watchUsers.firstOrNull { it.watch!!.objectId == watchId }
            if (watchUser != null) {
                return watchUser
            }
        }
        return getWatchUsersBaseQuery(user)
            .whereEqualTo(WatchUser::watch, ParseObject.createWithoutData(Wearer::class.java, watchId))
            .first
    }


    fun findLocalWatchByWatchId(watchId: String): Wearer? {
        if(::watchUsers.isInitialized) {
            val watch = watchUsers.first {
                it.watch?.objectId == watchId
            }.watch
            return watch
        }
        return null
    }

    suspend fun handlePendingRequest(params: HashMap<String, Any>): Int {
        CrashlyticsLog.log("Calling cloud functions handleRequests")
        return callCloudFunction("handleRequest", params)
    }

    suspend fun removeRequest(params: HashMap<String, Any>): Int {
        CrashlyticsLog.log("Calling cloud function removeUser")
        return callCloudFunction("removeUser", params)
    }

    fun getWatchUsers(user: ParseUser): MutableList<WatchUser> {
        return getWatchUsersBaseQuery(user)
            .include("watch")
            .find()
    }
}