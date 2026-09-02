package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.phonecontacts

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.contacts.ContactsActivity
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.TabletActivityNotificationHandler
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

/**
 * Notification handler for contacts
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class PhoneContactsNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                           userRepository: UserRepository,
                                                           tabletRepository: TabletRepository
):
    TabletActivityNotificationHandler(context, userRepository, tabletRepository) {
    override val notificationId: Int = Constants.notificationPhoneContact
    override val notificationDestinationId: Int = R.id.tabletInitialMenuFragment
    override val notificationLargeIconId: Int = R.mipmap.ic_launcher
    override var notificationContentTitleId: Int = R.string.notification_phone_contact_new_title
    override var notificationContextTextId: Int = R.string.notification_phone_contact_new_text
    override val notificationErrorText: String =
        "Error on creating notification for PhoneContacts received instruction"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf(
            jsonData.optString("contactName", "")
        )

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        val args = super.getNotificationsArgsBundle(jsonData)
        val event = jsonData.optString("event", "create")

        // Assign the notification text and title dynamically based on the event
        when (event.lowercase()) {
            "delete" -> {
                notificationContentTitleId = R.string.notification_phone_contact_deleted_title
                notificationContextTextId = R.string.notification_phone_contact_deleted_text
            }
            "update" -> {
                notificationContentTitleId = R.string.notification_phone_contact_updated_title
                notificationContextTextId = R.string.notification_phone_contact_updated_text
            }
            "create" -> {
                notificationContentTitleId = R.string.notification_phone_contact_new_title
                notificationContextTextId = R.string.notification_phone_contact_new_text
            }
            else -> {
                notificationContentTitleId = R.string.notification_phone_contact_new_title
                notificationContextTextId = R.string.notification_phone_contact_new_text
            }
        }

        args.putString("event", event)
        return args
    }

    override fun onNotificationLaunch(jsonData: JSONObject) {
    }

    override fun getNotificationPendingIntent(args: Bundle): PendingIntent {
        val intent = Intent(context, ContactsActivity::class.java).apply {
            putExtras(args)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        return PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}