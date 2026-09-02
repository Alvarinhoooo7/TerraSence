package com.sosmartlabs.momo.pushnotifications.ui

import android.content.Context
import android.content.Intent
import com.parse.ParsePushBroadcastReceiver
import com.parse.ParseUser
import com.sosmartlabs.momo.pushnotifications.model.PushNotificationCategory
import com.sosmartlabs.momo.pushnotifications.ui.handlers.*
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class PushNotificationReceiver: ParsePushBroadcastReceiver() {

    @Inject lateinit var geofenceNotificationHandler: GeofenceNotificationHandler
    @Inject lateinit var watchActionsNotificationHandler: WatchActionsNotificationHandler
    @Inject lateinit var watchOwnershipNotificationHandler: WatchOwnershipNotificationHandler
    @Inject lateinit var messageNotificationHandler: MessagesNotificationHandler
    @Inject lateinit var groupMembershipNotificationHandler: GroupMembershipNotificationHandler
    @Inject lateinit var videocallNotificationHandler: VideocallNotificationHandler
    @Inject lateinit var subscriptionNotificationHandler: SubscriptionNotificationHandler
    @Inject lateinit var marketingNotificationHandler: MarketingNotificationHandler
    @Inject lateinit var lingoNotificationHandler: LingoNotificationHandler

    override fun onPushReceive(context: Context, intent: Intent) {
        Timber.d("PushNotificationReceiver: Push notification received")
        CrashlyticsLog.log("PushNotificationReceiver: Receiving push notification")

        val pushData = intent.getStringExtra(KEY_PUSH_DATA) ?: run {
            Timber.e("PushNotificationReceiver: Received push with no data")
            CrashlyticsLog.recordNonFatalError(Exception("PushNotificationReceiver: Received push with no data"), "No push data")
            return
        }

        val currentUser = ParseUser.getCurrentUser() ?: run {
            Timber.e("PushNotificationReceiver: Current user is null")
            CrashlyticsLog.recordNonFatalError(Exception("PushNotificationReceiver: Current user is null"), "No current user")
            return
        }

        try {
            val jsonData = JSONObject(pushData)
            val pushCode = jsonData.optInt("code", jsonData.optInt("pushCode", -1))
            val pushNotificationCategory = PushNotificationCategory.entries.find { it.code == pushCode }

            Timber.d("PushNotificationReceiver: Received push notification - $jsonData")
            CrashlyticsLog.log("PushNotificationReceiver: Received push notification - $jsonData")

            handlePushNotification(context, intent, currentUser, jsonData, pushNotificationCategory)
        } catch (e: Exception) {
            Timber.e(e, "PushNotificationReceiver: Error parsing push notification")
            CrashlyticsLog.recordNonFatalError(e, "PushNotificationReceiver: Error parsing push notification")
        }
    }

    private fun handlePushNotification(context: Context, intent: Intent, currentUser: ParseUser, jsonData: JSONObject, pushNotificationCategory: PushNotificationCategory?) {
        when(pushNotificationCategory) {
            PushNotificationCategory.ENTER_GEOFENCE -> {
                Timber.d("PushNotificationReceiver: Handling Enter Geofence notification")
                geofenceNotificationHandler.handleEnterGeofenceNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.EXIT_GEOFENCE -> {
                Timber.d("PushNotificationReceiver: Handling Exit Geofence notification")
                geofenceNotificationHandler.handleExitGeofenceNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.SOS -> {
                Timber.d("PushNotificationReceiver: Handling SOS notification")
                watchActionsNotificationHandler.handleSOSNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.TAKE_OFF -> {
                Timber.d("PushNotificationReceiver: Handling Take Off notification")
                watchActionsNotificationHandler.handleTakeOffNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.LOW_BATTERY -> {
                Timber.d("PushNotificationReceiver: Handling Low Battery notification")
                watchActionsNotificationHandler.handleLowBatteryNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.BATTERY_SAVING -> {
                Timber.d("PushNotificationReceiver: Handling Battery Saving notification")
                watchActionsNotificationHandler.handleBatterySavingNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.OWNER -> {
                Timber.d("PushNotificationReceiver: Handling Ownership Transfer notification")
                watchOwnershipNotificationHandler.handleOwnershipTransferNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.USER_REMOVED -> {
                Timber.d("PushNotificationReceiver: Handling User Removed notification")
                watchOwnershipNotificationHandler.handleUserRemovedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.ADD_NEW_REQ -> {
                Timber.d("PushNotificationReceiver: Handling Add Request notification")
                watchOwnershipNotificationHandler.handleAddRequestNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.ADD_REQ_ACCEPTED -> {
                Timber.d("PushNotificationReceiver: Handling Add Request Accepted notification")
                watchOwnershipNotificationHandler.handleAddAcceptRequestNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.ADD_REQ_REJECTED -> {
                Timber.d("PushNotificationReceiver: Handling Add Request Rejected notification")
                watchOwnershipNotificationHandler.handleAddRejectRequestNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.NEW_FRIEND -> {
                Timber.d("PushNotificationReceiver: Handling New Friend notification")
                watchOwnershipNotificationHandler.handleNewFriendNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.MESSAGE_AUDIO -> {
                Timber.d("PushNotificationReceiver: Handling Audio Message notification")
                messageNotificationHandler.handleMessageAudioNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.MESSAGE_IMAGE -> {
                Timber.d("PushNotificationReceiver: Handling Image Message notification")
                messageNotificationHandler.handleMessageImageNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.CHAT -> {
                Timber.d("PushNotificationReceiver: Handling Chat notification")
                messageNotificationHandler.handleChatNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_MEMBER_ADDED -> {
                Timber.d("PushNotificationReceiver: Handling Group Member Added notification")
                groupMembershipNotificationHandler.handleMemberAddedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_MEMBER_REMOVED -> {
                Timber.d("PushNotificationReceiver: Handling Group Member Removed notification")
                groupMembershipNotificationHandler.handleMemberRemovedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_MEMBER_LEFT -> {
                Timber.d("PushNotificationReceiver: Handling Group Member Left notification")
                groupMembershipNotificationHandler.handleMemberLeftNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_ROLE_CHANGED -> {
                Timber.d("PushNotificationReceiver: Handling Group Role Changed notification")
                groupMembershipNotificationHandler.handleRoleChangedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_OWNER_CHANGED -> {
                Timber.d("PushNotificationReceiver: Handling Group Owner Changed notification")
                groupMembershipNotificationHandler.handleOwnerChangedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.GROUP_DELETED -> {
                Timber.d("PushNotificationReceiver: Handling Group Deleted notification")
                groupMembershipNotificationHandler.handleGroupDeletedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.VIDEOCALL -> {
                Timber.d("PushNotificationReceiver: Handling Incoming Videocall notification")
                videocallNotificationHandler.handleVideocallIncomingNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.VIDEOCALL_HANGUP -> {
                Timber.d("PushNotificationReceiver: Handling Videocall Hangup notification")
                videocallNotificationHandler.handleVideocallHangupNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.SUBSCRIPTION_ACTIVATED -> {
                Timber.d("PushNotificationReceiver: Handling Subscription Activated notification")
                subscriptionNotificationHandler.handleGigsPhoneNumberNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.SUBSCRIPTION_PAYMENT_ISSUE -> {
                Timber.d("PushNotificationReceiver: Handling Subscription Payment Issue notification")
                subscriptionNotificationHandler.handleSubscriptionPaymentIssueNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.SUBSCRIPTION_TERMINATED -> {
                Timber.d("PushNotificationReceiver: Handling Subscription Terminated notification")
                subscriptionNotificationHandler.handleSubscriptionTerminatedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.MARKETING -> {
                Timber.d("PushNotificationReceiver: Handling Marketing notification")
                marketingNotificationHandler.handleMarketingNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.POWER_ON -> {
                Timber.d("PushNotificationReceiver: Handling Power On notification")
                watchActionsNotificationHandler.handlePowerOnNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.POWER_OFF -> {
                Timber.d("PushNotificationReceiver: Handling Power Off notification")
                watchActionsNotificationHandler.handlePowerOffNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.VALIDATED_REMINDER -> {
                Timber.d("PushNotificationReceiver: Handling Validated Reminder notification")
                watchActionsNotificationHandler.handleValidatedReminderNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.FIRST_INTERACTION -> {
                Timber.d("PushNotificationReceiver: Handling First Interaction notification")
                watchActionsNotificationHandler.handleFirstInteractionNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.LINGO_STARTED -> {
                Timber.d("PushNotificationReceiver: Handling Lingo Started notification")
                lingoNotificationHandler.handleLingoStartedNotification(context, currentUser, jsonData)
            }
            PushNotificationCategory.LINGO_CHALLENGE_COMPLETE -> {
                Timber.d("PushNotificationReceiver: Handling Lingo Challenge Complete notification")
                lingoNotificationHandler.handleLingoChallengeCompleteNotification(context, currentUser, jsonData)
            }
            else -> {
                Timber.d("PushNotificationReceiver: Unhandled notification type, delegating to super")
                super.onPushReceive(context, intent)
            }
        }
    }
}
