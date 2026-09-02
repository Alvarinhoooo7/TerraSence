package com.sosmartlabs.momo.pushnotifications.ui.handlers

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.chat.data.repository.ChatGroupRepository
import com.sosmartlabs.momo.chat.presentation.activity.ChatListActivity
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.pushnotifications.model.NotificationChannelCategory
import com.sosmartlabs.momo.pushnotifications.ui.chat.ChatMessagingNotificationBuilder
import com.sosmartlabs.momo.utils.Constants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import kotlin.coroutines.CoroutineContext

class GroupMembershipNotificationHandler @Inject constructor() {

    companion object {
        /**
         * Text resource IDs for every membership event we publish. Kept in sync with
         * [GroupMembershipNotificationCopy.resolve] and used to enumerate the stable
         * notification IDs a single group may have outstanding.
         */
        private val MEMBERSHIP_TEXT_RES_IDS = listOf(
            R.string.push_group_member_added_text,
            R.string.push_group_member_removed_text,
            R.string.push_group_member_left_text,
            R.string.push_group_role_changed_text,
            R.string.push_group_owner_changed_text,
            R.string.push_group_deleted_text,
        )

        /** Stable notification ID for a given group + event pair. */
        internal fun notificationIdFor(groupId: String, textResId: Int): Int {
            return ("group_membership:$groupId:$textResId").hashCode()
        }

        /**
         * Cancels every membership notification we may have shown for the given group.
         * Safe to call from the UI thread; no-op when `groupId` is blank.
         */
        fun cancelAllFor(context: Context, groupId: String) {
            if (groupId.isBlank()) return
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            MEMBERSHIP_TEXT_RES_IDS.forEach { textResId ->
                notificationManager.cancel(notificationIdFor(groupId, textResId))
            }
        }
    }

    @Inject
    lateinit var ioContext: CoroutineContext

    @Inject
    lateinit var externalScope: CoroutineScope

    @Inject
    lateinit var chatGroupRepository: ChatGroupRepository

    @Inject
    lateinit var chatMessagingNotificationBuilder: ChatMessagingNotificationBuilder

    fun handleMemberAddedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "added")
    }

    fun handleMemberRemovedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "removed")
    }

    fun handleMemberLeftNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "left")
    }

    fun handleRoleChangedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "role_changed")
    }

    fun handleOwnerChangedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "owner_changed")
    }

    fun handleGroupDeletedNotification(context: Context, currentUser: ParseUser, jsonData: JSONObject) {
        handleMembershipEvent(context, currentUser, jsonData, event = "group_deleted")
    }

    private fun handleMembershipEvent(
        context: Context,
        currentUser: ParseUser,
        jsonData: JSONObject,
        event: String,
    ) {
        Timber.i("GroupMembershipNotificationHandler: handle event=$event")
        CrashlyticsLog.log("GroupMembershipNotificationHandler: Received membership event=$event")

        val payloadEvent = jsonData.optString("event", event)
        val actorName = jsonData.optString("actorName", "")
        val targetName = jsonData.optString("targetName", "")
        val groupName = jsonData.optString("groupName", "")
        val groupId = jsonData.optString("groupId", "")
        val newRole = jsonData.optString("newRole", "").takeIf { it.isNotBlank() }

        val copy = GroupMembershipNotificationCopy.resolve(
            event = payloadEvent,
            actorName = actorName,
            targetName = targetName,
            groupName = groupName,
            newRole = newRole,
        )
        if (copy == null) {
            Timber.w("GroupMembershipNotificationHandler: Unknown membership event=$payloadEvent, skipping")
            return
        }

        showNotification(context, copy, groupId, groupName)

        if (payloadEvent == "group_deleted" && groupId.isNotBlank()) {
            // Group is provably gone — skip a network refresh, wipe local state,
            // and clear any outstanding message/membership notifications for it.
            // The event bus emitted inside purgeLocalGroup will also pop any
            // UnifiedChatFragment still showing this group.
            chatMessagingNotificationBuilder.cancelNotificationForGroup(context, groupId)
            cancelAllFor(context, groupId)
            externalScope.launch(ioContext) {
                runCatching { chatGroupRepository.purgeLocalGroup(groupId) }
                    .onFailure { throwable ->
                        Timber.e(throwable, "GroupMembershipNotificationHandler: Failed to purge group locally")
                        CrashlyticsLog.recordNonFatalError(
                            throwable,
                            "GroupMembershipNotificationHandler: Failed to purge group locally"
                        )
                    }
            }
        } else {
            refreshGroups(currentUser)
        }
    }

    private fun showNotification(
        context: Context,
        copy: GroupMembershipNotificationCopy.Copy,
        groupId: String,
        groupName: String,
    ) {
        val title = context.getString(copy.titleResId, *copy.args)
        val text = context.getString(copy.textResId, *copy.args)

        val intent = Intent(context, ChatListActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            if (groupId.isNotBlank()) {
                putExtra(Constants.EXTRA_GROUP_ID, groupId)
            }
            if (groupName.isNotBlank()) {
                putExtra(Constants.EXTRA_GROUP_NAME, groupName)
            }
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context,
            (groupId.takeIf { it.isNotBlank() } ?: title).hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(context, NotificationChannelCategory.GROUP_MEMBERSHIP.id)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setColor(ContextCompat.getColor(context, R.color.colorPrimary))
            .setSmallIcon(R.drawable.ic_soymomo_silohuette)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setDefaults(Notification.DEFAULT_LIGHTS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = if (groupId.isNotBlank()) {
            notificationIdFor(groupId, copy.textResId)
        } else {
            (title + text).hashCode()
        }
        notificationManager.notify(notificationId, notification)
    }

    private fun refreshGroups(currentUser: ParseUser) {
        externalScope.launch(ioContext) {
            runCatching { chatGroupRepository.getUserGroupsFromNetwork(currentUser) }
                .onFailure { throwable ->
                    Timber.e(throwable, "GroupMembershipNotificationHandler: Failed to refresh groups")
                    CrashlyticsLog.recordNonFatalError(
                        throwable,
                        "GroupMembershipNotificationHandler: Failed to refresh groups"
                    )
                }
        }
    }
}
