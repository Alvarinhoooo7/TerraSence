package com.sosmartlabs.momotabletpadres.receivers

import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.*
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.dug.*
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.geofences.GeofenceEnteredNotificationHandler
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.geofences.GeofenceExitedNotificationHandler
import com.sosmartlabs.momotabletpadres.receivers.notificationhandlers.phonecontacts.PhoneContactsNotificationHandler
import timber.log.Timber
import javax.inject.Inject

class NotificationHandlerProvider @Inject constructor(
    private val appTimeRequestedNotificationHandler: AppTimeRequestedNotificationHandler,
    private val detectedConversationsNotificationHandler: DetectedConversationsNotificationHandler,
    private val enableSpotifyMusicDetectionNotificationHandler: EnableSpotifyMusicDetectionNotificationHandler,
    private val explicitMusicNotificationHandler: ExplicitMusicNotificationHandler,
    private val geofenceEnteredNotificationHandler: GeofenceEnteredNotificationHandler,
    private val geofenceExitedNotificationHandler: GeofenceExitedNotificationHandler,
    private val installedAppsNotificationHandler: InstalledAppsNotificationHandler,
    private val moodDetectionNotificationHandler: MoodDetectionNotificationHandler,
    private val smartDetectionNotificationHandler: SmartDetectionNotificationHandler,
    private val timeRequestedNotificationHandler: TimeRequestedNotificationHandler,
    private val unsafeSearchNotificationHandler: UnsafeSearchNotificationHandler,
    private val phoneContactNotificationHandler: PhoneContactsNotificationHandler,
    private val marketingNotificationHandler: MarketingNotificationHandler
) {

    /**
     * Types of notifications the app can receive
     * @param code Notification code
     */
    enum class Instruction(val code: Int) {
        APP_TIME_REQUESTED(14),
        DETECTED_CONVERSATION(7),
        ENABLE_SPOTIFY_MUSIC_DETECTION(18),
        ENTERED_GEOFENCE(24),
        EXITED_GEOFENCE(25),
        EXPLICIT_MUSIC_DETECTION(17),
        INSTALLED_APPS(3),
        MOOD_DETECTION(23),
        SMART_DETECTION(6),
        TIME_REQUESTED(12),
        UNSAFE_SEARCH(11),
        PHONE_CONTACT(20),
        MARKETING(234)
    }

    /**
     * Obtains the handler for handling the notification with the given Id
     * @param notificationId Id for notification
     * @return [NotificationHandler] for the given notification id
     */
    fun getNotificationHandler(notificationId: Int): NotificationHandler? {
        Timber.d("NotificationHandlerProvider: Getting handler for notification ID: $notificationId")

        val handler = when (notificationId) {
            Instruction.APP_TIME_REQUESTED.code -> appTimeRequestedNotificationHandler
            Instruction.DETECTED_CONVERSATION.code -> detectedConversationsNotificationHandler
            Instruction.ENABLE_SPOTIFY_MUSIC_DETECTION.code -> enableSpotifyMusicDetectionNotificationHandler
            Instruction.ENTERED_GEOFENCE.code -> geofenceEnteredNotificationHandler
            Instruction.EXITED_GEOFENCE.code -> geofenceExitedNotificationHandler
            Instruction.EXPLICIT_MUSIC_DETECTION.code -> explicitMusicNotificationHandler
            Instruction.INSTALLED_APPS.code -> installedAppsNotificationHandler
            Instruction.MOOD_DETECTION.code -> moodDetectionNotificationHandler
            Instruction.SMART_DETECTION.code -> smartDetectionNotificationHandler
            Instruction.TIME_REQUESTED.code -> timeRequestedNotificationHandler
            Instruction.UNSAFE_SEARCH.code -> unsafeSearchNotificationHandler
            Instruction.PHONE_CONTACT.code -> phoneContactNotificationHandler
            Instruction.MARKETING.code -> marketingNotificationHandler
            else -> null
        }

        if (handler == null) {
            Timber.w("NotificationHandlerProvider: No handler found for notification ID: $notificationId")
        } else {
            Timber.d("NotificationHandlerProvider: Found handler of type: ${handler.javaClass.simpleName}")
        }

        return handler
    }
}
