package com.sosmartlabs.momotabletpadres.sim.repository

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.first
import com.parse.ktx.findAll
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionsUserInfo
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.models.TabletUser
import timber.log.Timber
import javax.inject.Inject

class SubscriptionRepository @Inject constructor() {

    /**
     * Retrieves all subscriptions associated with the given list of IMEIs.
     *
     * @param imeiList List of IMEIs whose subscriptions are to be fetched.
     * @return MutableList of Subscription objects, or an empty list if none found or on error.
     */
    suspend fun getSubscriptions(tablets: List<Tablet>): MutableList<Subscription> {
        Timber.d("SubscriptionRepository: Getting subscriptions for ${tablets.size} tablets")

        if (tablets.isEmpty()) {
            Timber.w("SubscriptionRepository: tablets list is empty, returning empty list")
            return mutableListOf()
        }

        // Extract valid IMEIs and ParseTablet pointers from provided tablets
        val validImeis = tablets.mapNotNull { it.imei?.takeIf { imei -> imei.isNotBlank() } }
        if (validImeis.isEmpty()) {
            Timber.w("SubscriptionRepository: No valid IMEIs found in tablets, returning empty list")
            return mutableListOf()
        }

        val parseTablets = tablets.mapNotNull { tablet ->
            val objectId = tablet.objectId
            if (!objectId.isNullOrBlank()) ParseTablet.createWithoutData(objectId) else null
        }

        return try {
            // 1) Fetch TabletUser objects where tablet is in provided tablets
            Timber.d("SubscriptionRepository: Querying TabletUser for ${parseTablets.size} tablets")
            val tabletUsers = if (parseTablets.isNotEmpty()) {
                ParseQuery.getQuery<TabletUser>("TabletUser")
                    .whereContainedIn("tablet", parseTablets)
                    .include("user")
                    .include("tablet")
                    .findAll()
            } else {
                emptyList()
            }

            // 2) Build unique users list from TabletUser
            val users = tabletUsers.mapNotNull { it.user }.distinctBy { it.objectId }
            if (users.isEmpty()) {
                Timber.w("SubscriptionRepository: No users found for provided tablets, returning empty list")
                return mutableListOf()
            }

            // 3) Build SubscriptionsUserInfo subquery where user in users
            val subscriberSubQuery = ParseQuery.getQuery<SubscriptionsUserInfo>("SubscriptionsUserInfo")
                .whereContainedIn("user", users)

            // 4) Query Subscriptions where imei in validImeis AND subscriber matches subquery
            Timber.d("SubscriptionRepository: Querying Subscription with ${validImeis.size} IMEIs and ${users.size} users")
            val subscriptions = ParseQuery.getQuery<Subscription>("Subscription")
                .whereContainedIn("imei", validImeis)
                .whereMatchesQuery("subscriber", subscriberSubQuery)
                .addDescendingOrder("createdAt")
                .include("plan")
                .include("plan.mnoProvider")
                .include("plan.paymentProvider")
                .include("sim")
                .include("sim.mnoProvider")
                .include("paymentProvider")
                .include("apioCredentials")
                .include("stripeCredentials")
                .include("subscriber")
                .include("subscriber.user")
                .findAll()
                .toMutableList()

            // 5) Attach hydrated tablet to subscriptions based on IMEI
            // Use the already-fetched tablets from tabletUsers query (which used .include("tablet"))
            // This ensures we have fully-hydrated ParseTablet instances, not just pointers
            val imeiToHydratedTablet = tabletUsers
                .mapNotNull { tabletUser ->
                    val tablet = tabletUser.tablet
                    val imei = tablet?.imei?.takeIf { it.isNotBlank() }
                    if (tablet != null && imei != null && tablet.isDataAvailable) {
                        Timber.d("SubscriptionRepository: Mapping hydrated tablet ${tablet.objectId} for IMEI: $imei")
                        imei to tablet
                    } else {
                        null
                    }
                }
                .toMap()

            for (subscription in subscriptions) {
                val hydratedTablet = subscription.imei?.let { imeiToHydratedTablet[it] }
                subscription.tablet = hydratedTablet
                if (hydratedTablet != null) {
                    Timber.d("SubscriptionRepository: Attached hydrated tablet ${hydratedTablet.objectId} to subscription ${subscription.objectId}")
                } else {
                    Timber.w("SubscriptionRepository: No hydrated tablet found for subscription ${subscription.objectId} with IMEI ${subscription.imei}")
                }
            }

            Timber.d("SubscriptionRepository: Successfully retrieved ${subscriptions.size} subscriptions")
            subscriptions
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get subscriptions for tablets")
            CrashlyticsLog.recordNonFatalError(e, "Failed to get subscriptions for ${tablets.size} tablets")
            mutableListOf()
        }
    }

    /**
     * Fetches a Subscription by its objectId.
     *
     * @param subscriptionId The objectId of the Subscription to fetch.
     * @return The [Subscription] if found, or null otherwise.
     */
    suspend fun fetchSubscription(subscriptionId: String): Subscription? {
        Timber.d("SubscriptionRepository: Fetching subscription with ID: $subscriptionId")

        return try {
            val subscription = ParseQuery.getQuery<Subscription>("Subscription")
                .whereEqualTo("objectId", subscriptionId)
                .include("plan")
                .include("plan.mnoProvider")
                .include("plan.paymentProvider")
                .include("sim")
                .include("sim.mnoProvider")
                .include("paymentProvider")
                .include("apioCredentials")
                .include("stripeCredentials")
                .include("subscriber")
                .include("subscriber.user")
                .first()

            subscription?.let { sub ->
                sub.imei?.let { imei ->
                    try {
                        val user = ParseUser.getCurrentUser()
                        val tabletQuery = ParseQuery.getQuery<ParseTablet>("Tablet")
                            .whereEqualTo("imei", imei)
                        val tabletUserQuery = ParseQuery.getQuery<TabletUser>("TabletUser")
                            .whereEqualTo("user", user)
                            .whereMatchesQuery("tablet", tabletQuery)
                            .orderByDescending("createdAt")
                            .include("tablet")
                        Timber.d("SubscriptionRepository: Executing TabletUser query for user: ${user.objectId}, IMEI: $imei")
                        val tabletUser = tabletUserQuery.first()
                        if (tabletUser.tablet != null) {
                            Timber.d("SubscriptionRepository: Found tablet for IMEI: $imei, associating with subscription")
                        } else {
                            Timber.w("SubscriptionRepository: TabletUser found but tablet is null for IMEI: $imei")
                        }
                        subscription.tablet = tabletUser.tablet
                    } catch (e: ParseException) {
                        Timber.e(e, "SubscriptionRepository: Failed to get TabletUser for IMEI: $imei")
                        subscription.tablet = null
                    }
                }
                Timber.d("SubscriptionRepository: Successfully fetched subscription with ID: ${sub.objectId}")
            } ?: Timber.w("SubscriptionRepository: No subscription found with ID: $subscriptionId")
            
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to fetch subscription with ID: $subscriptionId")
            CrashlyticsLog.recordNonFatalError(e, "Failed to fetch subscription: $subscriptionId")
            null
        }
    }

    /**
     * Activates a subscription for the given watch and SIM card.
     *
     * @param imei The IMEI of the device.
     * @param deviceName The name if the device.
     * @param iccId The ICCID of the SoyMomo SIM.
     * @param planId The objectId of the [SubscriptionPlan].
     * @param subscriberId The objectId of the [SubscriptionsUserInfo].
     * @return The activated [Subscription] object.
     * @throws Exception if activation fails.
     */
    suspend fun activateSubscription(
        imei: String,
        deviceName: String,
        iccId: String,
        planId: String,
        subscriberId: String
    ): Subscription {
        val parameters = hashMapOf(
            "imei" to imei,
            "deviceName" to deviceName,
            "iccId" to iccId,
            "planId" to planId,
            "subscriberId" to subscriberId
        )

        Timber.d("SubscriptionRepository: Activating subscription for IMEI $imei with SIM $iccId")

        return try {
            val subscription = callCloudFunction<Subscription>("activateSimCard", parameters)
            Timber.d("SubscriptionRepository: Successfully activated subscription for IMEI $imei")
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to activate subscription for IMEI $imei")
            CrashlyticsLog.recordNonFatalError(e, "Failed to activate subscription for IMEI $imei")
            throw e
        }
    }

    /**
     * Transfers a subscription from the current SoyMomo SIM to a new SoyMomo SIM.
     *
     * @param currentIccId The ICCID of the current Subscription's SoyMomo SIM.
     * @param newIccId The ICCID of the new SoyMomo SIM to activate.
     * @return A [HashMap] containing the result of the operation, or null if it fails.
     */
    suspend fun transferSubscriptionToNewSim(
        currentIccId: String,
        newIccId: String
    ): HashMap<Any, Any>? {
        Timber.d("SubscriptionRepository: Initiating transfer from SIM $currentIccId to $newIccId")

        val parameters = hashMapOf(
            "currentIccId" to currentIccId,
            "newIccId" to newIccId
        )

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>("transferToNewSim", parameters)
            Timber.d("SubscriptionRepository: Transfer to new SIM successful")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Error transferring subscription from $currentIccId to $newIccId")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to transfer subscription from $currentIccId to $newIccId"
            )
            null
        }
    }

    /**
     * Retrieves the management portal information for a given subscription.
     *
     * @param subscription The [Subscription] object whose management portal is to be retrieved.
     * @return A [HashMap] containing the management portal data, or null if retrieval fails.
     */
    suspend fun getSubscriptionManagementPortal(
        subscription: Subscription
    ): HashMap<Any, Any>? {
        val subscriptionId = subscription.objectId
        Timber.d("SubscriptionRepository: Getting management portal for subscription $subscriptionId")

        val parameters = hashMapOf(
            "subscriptionId" to subscriptionId
        )

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>(
                "getSubscriptionManagementPortal",
                parameters
            )
            Timber.d("SubscriptionRepository: Successfully retrieved management portal for subscription $subscriptionId")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get management portal for subscription $subscriptionId")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to get management portal for subscription $subscriptionId"
            )
            null
        }
    }

    /**
     * Creates an APIO authentication bypass for the given subscriber.
     *
     * @param subscriberId The objectId of the [SubscriptionsUserInfo].
     * @return A [HashMap] containing the result of the operation, or null if it fails.
     */
    suspend fun createApioAuthBypass(subscriberId: String): HashMap<Any, Any>? {
        Timber.d("SubscriptionRepository: Creating APIO auth bypass for subscriber $subscriberId")

        val parameters = hashMapOf("subscriberId" to subscriberId)

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>("createApioAuthBypass", parameters)
            Timber.d("SubscriptionRepository: Successfully created APIO auth bypass")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to create APIO auth bypass")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to create APIO auth bypass for subscriber $subscriberId"
            )
            null
        }
    }

    /**
     * Retrieves the list of APIO payment cards for a given user and their subscription info.
     *
     * @param user The ParseUser whose cards are being fetched.
     * @param subscriptionsUserInfo The SubscriptionsUserInfo object associated with the user.
     * @return A mutable list of PaymentUserCard objects. Returns an empty list if retrieval fails.
     */
    suspend fun getApioUserCards(
        user: ParseUser,
        subscriptionsUserInfo: SubscriptionsUserInfo
    ): MutableList<PaymentUserCard> {
        val subscriberId = subscriptionsUserInfo.objectId
        val userId = user.objectId
        Timber.d("SubscriptionRepository: Getting APIO cards for subscriberId $subscriberId and user $userId")

        val parameters = hashMapOf(
            "subscriberId" to subscriberId
        )

        return try {
            val cards = callCloudFunction<MutableList<PaymentUserCard>>("getApioUserCards", parameters)
            Timber.d("SubscriptionRepository: Successfully retrieved ${cards.size} payment cards")
            cards
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get APIO user cards")
            CrashlyticsLog.recordNonFatalError(e, "Failed to get APIO cards for user $userId")
            mutableListOf()
        }
    }

    /**
     * Creates an APIO subscription using the provided subscription and payment card IDs.
     *
     * @param subscriptionId The objectId of the [Subscription].
     * @param paymentUserCardId The objectId of the [PaymentUserCard].
     * @return The created [Subscription] object, or null if creation failed.
     */
    suspend fun createApioSubscription(
        subscriptionId: String,
        paymentUserCardId: String
    ): Subscription? {
        val parameters = hashMapOf(
            "subscriptionId" to subscriptionId,
            "paymentUserCardId" to paymentUserCardId
        )

        Timber.d("SubscriptionRepository: Creating APIO subscription for subscriptionId=$subscriptionId, paymentUserCardId=$paymentUserCardId")

        return try {
            val subscription = callCloudFunction<Subscription>("createApioSubscription", parameters)
            Timber.d("SubscriptionRepository: Successfully created APIO subscription for subscriptionId=$subscriptionId")
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to create APIO subscription for subscriptionId=$subscriptionId")
            CrashlyticsLog.recordNonFatalError(e, "Failed to create APIO subscription for $subscriptionId")
            null
        }
    }
}