package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.dug

import android.content.Context
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import javax.inject.Inject

/**
 * Notification handler for detected conversations
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class DetectedConversationsNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                                   userRepository: UserRepository,
                                                                   tabletRepository: TabletRepository
):
    DugNotificationHandler(context, userRepository, tabletRepository) {
    override val notificationId: Int = Constants.notificationProfanityDetection
    override val notificationDestinationId: Int = R.id.tabletFragmentDugUnified
    override var notificationContentTitleId: Int = R.string.notification_detected_conversation_title
    override var notificationContextTextId: Int = R.string.notification_detected_conversation_text
    override val notificationErrorText: String = "Error on creating notification for profanity detection received instruction"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> {
        val tabletName = jsonData.optString("tabletName", "")
        val detectionCount = jsonData.optInt("detectionCount", 0)
        return if (detectionCount == 1) {
            arrayOf(tabletName)
        } else {
            arrayOf(tabletName, detectionCount.toString())
        }
    }

    override suspend fun handleNotification(jsonData: JSONObject) {
        // Determine which string resource to use based on detection count
        val detectionCount = jsonData.optInt("detectionCount", 0)
        notificationContextTextId = if (detectionCount == 1) {
            R.string.notification_detected_conversation_text
        } else {
            R.string.notification_detected_conversations_text
        }
        super.handleNotification(jsonData)
    }
}