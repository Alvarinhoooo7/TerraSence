package com.sosmartlabs.momo.sim.repository

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.first
import com.parse.ktx.findAll
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.sim.model.PaymentUserCard
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionsUserInfo
import timber.log.Timber
import javax.inject.Inject

class SubscriptionRepository @Inject constructor() {

    /**
     * Retrieves all subscriptions associated with the given list of Wearers.
     *
     * @param wearerList List of Wearer objects whose subscriptions are to be fetched.
     * @return MutableList of Subscription objects, or an empty list if none found or on error.
     */
    suspend fun getSubscriptions(wearerList: List<Wearer>): MutableList<Subscription> {
        Timber.d("SubscriptionRepository: Getting subscriptions for ${wearerList.size} wearers")

        val currentUser = ParseUser.getCurrentUser()
        if (currentUser == null) {
            Timber.w("SubscriptionRepository: No current user, returning empty list")
            return mutableListOf()
        }

        if (wearerList.isEmpty()) {
            Timber.w("SubscriptionRepository: wearerList is empty, returning empty list")
            return mutableListOf()
        }

        val wearerObjectIds = wearerList.mapNotNull { it.objectId }
        if (wearerObjectIds.isEmpty()) {
            Timber.w("SubscriptionRepository: No valid objectIds in wearerList, returning empty list")
            return mutableListOf()
        }

        return try {
            // 1) Fetch WatchUser rows for the provided watches.
            val watchUsers = ParseQuery.getQuery(WatchUser::class.java)
                .whereContainedIn("watch", wearerList)
                .findAll()

            Timber.d("SubscriptionRepository: Found ${watchUsers.size} WatchUser(s)")
            if (watchUsers.isEmpty()) {
                Timber.d("SubscriptionRepository: No WatchUser found for provided watches, returning empty list")
                return mutableListOf()
            }

            // 2) Collect the user pointers to build the subscriber subquery.
            // getParseObject keeps the raw pointer (objectId) even when the
            // _User payload is unreadable; whereContainedIn matches on objectId.
            val users = watchUsers.mapNotNull { it.getParseObject("user") }
            Timber.d("SubscriptionRepository: Found ${users.size} User(s)")
            if (users.isEmpty()) {
                Timber.d("SubscriptionRepository: No users associated to WatchUser, returning empty list")
                return mutableListOf()
            }

            // 3) Subquery for SubscriptionsUserInfo where user in collected users
            val subscriberSubQuery = ParseQuery.getQuery(SubscriptionsUserInfo::class.java)
                .whereContainedIn("user", users)

            // 4) Fetch Subscriptions filtered by watch and subscriber subquery
            val subscriptions = ParseQuery.getQuery(Subscription::class.java)
                .whereContainedIn("watch", wearerList)
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
                .include("watch")
                .findAll()
                .toMutableList()

            Timber.d("SubscriptionRepository: Successfully retrieved ${subscriptions.size} subscriptions")
            subscriptions
        } catch (e: Exception) {
            // This function THROWS on failure — every caller MUST wrap it in runCatching
            // or try/catch. We rethrow instead of returning an empty list because an
            // indistinguishable "successful empty" made the subscription list blank out
            // on any network blip during polling. An unwrapped caller crashed the app on
            // transient DNS failures (Crashlytics issues 3861f82b…, a11f0a04…).
            Timber.e(e, "SubscriptionRepository: Failed to get subscriptions for wearers")
            CrashlyticsLog.recordNonFatalError(e, "Failed to get subscriptions for ${wearerList.size} wearers")
            throw e
        }
    }

    /**
     * Fetches a Subscription by its objectId.
     *
     * @param subscriptionId The objectId of the Subscription to fetch.
     * @return The [Subscription] if found, or null otherwise.
     */
    suspend fun fetchSubscription(subscriptionId: String): Subscription? {
        Timber.d("SubscriptionRepository: Fetching subscription")

        return try {
            val subscription = ParseQuery.getQuery(Subscription::class.java)
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
                .include("watch")
                .first()

            when (subscription) {
                null -> {
                    Timber.w("SubscriptionRepository: No subscription found")
                }
                else -> {
                    Timber.d("SubscriptionRepository: Successfully fetched subscription")
                }
            }
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to fetch subscription")
            CrashlyticsLog.recordNonFatalError(e, "Failed to fetch subscription")
            null
        }
    }

    /**
     * Activates a subscription for the given watch and SIM card.
     *
     * @param watch The [Wearer] object representing the watch.
     * @param iccId The ICCID of the SoyMomo SIM.
     * @param planId The objectId of the [com.sosmartlabs.momo.sim.model.SubscriptionPlan].
     * @param subscriberId The objectId of the [SubscriptionsUserInfo].
     * @return The activated [Subscription] object.
     * @throws Exception if activation fails.
     */
    suspend fun activateSubscription(
        watch: Wearer,
        iccId: String,
        planId: String,
        subscriberId: String
    ): Subscription {
        requireCurrentUserIsActiveOnWatch(watch)

        val parameters = hashMapOf(
            "watchId" to watch.objectId,
            "imei" to watch.imei(),
            "deviceName" to watch.modelName(),
            "iccId" to iccId,
            "planId" to planId,
            "subscriberId" to subscriberId
        )

        Timber.d("SubscriptionRepository: Activating subscription")

        return try {
            val subscription = callCloudFunction<Subscription>("activateSimCard", parameters)
            Timber.d("SubscriptionRepository: Successfully activated subscription")
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to activate subscription")
            CrashlyticsLog.recordNonFatalError(e, "Failed to activate subscription")
            throw e
        }
    }

    private suspend fun requireCurrentUserIsActiveOnWatch(watch: Wearer) {
        val currentUser = ParseUser.getCurrentUser()
            ?: throw WatchUserNotActiveException("No current user when activating subscription")

        val watchUser = ParseQuery.getQuery(WatchUser::class.java)
            .whereEqualTo("user", currentUser)
            .whereEqualTo("watch", watch)
            .first

        if (watchUser?.active != true) {
            throw WatchUserNotActiveException(
                "Current user is not an active member of watch ${watch.objectId}"
            )
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
        Timber.d("SubscriptionRepository: Initiating transfer to new SIM")

        val parameters = hashMapOf(
            "currentIccId" to currentIccId,
            "newIccId" to newIccId
        )

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>("transferToNewSim", parameters)
            Timber.d("SubscriptionRepository: Transfer to new SIM successful")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Error transferring subscription")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to transfer subscription"
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
        Timber.d("SubscriptionRepository: Getting management portal")

        val parameters = hashMapOf(
            "subscriptionId" to subscriptionId
        )

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>(
                "getSubscriptionManagementPortal",
                parameters
            )
            Timber.d("SubscriptionRepository: Successfully retrieved management portal")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get management portal")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to get management portal"
            )
            null
        }
    }

    /**
     * Retrieves the pending payment URL for a given subscription.
     * Calls the "getPendingPaymentUrl" cloud function which returns a hosted invoice URL
     * (Stripe) or a payment link (Apio) so the user can pay a pending/failed invoice.
     *
     * @param subscription The [Subscription] object whose pending payment URL is to be retrieved.
     * @return A [HashMap] containing the pending payment URL data, or null if retrieval fails.
     */
    suspend fun getPendingPaymentUrl(
        subscription: Subscription
    ): HashMap<Any, Any>? {
        val subscriptionId = subscription.objectId
        Timber.d("SubscriptionRepository: Getting pending payment URL")

        val parameters = hashMapOf(
            "subscriptionId" to subscriptionId
        )

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>(
                "getPendingPaymentUrl",
                parameters
            )
            Timber.d("SubscriptionRepository: Successfully retrieved pending payment URL")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get pending payment URL")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to get pending payment URL"
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
        Timber.d("SubscriptionRepository: Creating APIO auth bypass")

        val parameters = hashMapOf("subscriberId" to subscriberId)

        return try {
            val result = callCloudFunction<HashMap<Any, Any>>("createApioAuthBypass", parameters)
            Timber.d("SubscriptionRepository: Successfully created APIO auth bypass")
            result
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to create APIO auth bypass")
            CrashlyticsLog.recordNonFatalError(
                e,
                "Failed to create APIO auth bypass"
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
        Timber.d("SubscriptionRepository: Getting APIO cards")

        val parameters = hashMapOf(
            "subscriberId" to subscriberId
        )

        return try {
            val cards = callCloudFunction<MutableList<PaymentUserCard>>("getApioUserCards", parameters)
            Timber.d("SubscriptionRepository: Successfully retrieved ${cards.size} payment cards")
            cards
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to get APIO user cards")
            CrashlyticsLog.recordNonFatalError(e, "Failed to get APIO cards")
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

        Timber.d("SubscriptionRepository: Creating APIO subscription")

        return try {
            val subscription = callCloudFunction<Subscription>("createApioSubscription", parameters)
            Timber.d("SubscriptionRepository: Successfully created APIO subscription")
            subscription
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionRepository: Failed to create APIO subscription")
            CrashlyticsLog.recordNonFatalError(e, "Failed to create APIO subscription")
            null
        }
    }
}
