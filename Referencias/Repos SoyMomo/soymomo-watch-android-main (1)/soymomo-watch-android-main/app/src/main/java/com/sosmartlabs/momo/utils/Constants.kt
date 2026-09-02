package com.sosmartlabs.momo.utils

import com.google.android.gms.maps.model.LatLng

/**
 * @author mrgcl
 */
object Constants {

    const val EXTRA_WEARER_ID = "objectId"
    const val EXTRA_WEARER_NAME = "wearerName"
    const val EXTRA_NEW_USER = "newUser"
    const val EXTRA_TUTORIAL_PAGE = "tutorialPage"
    const val EXTRA_FIRST_TIME = "firstTime"
    const val EXTRA_DEVICE_ID = "deviceId"
    const val EXTRA_IMAGE_URI = "imageUri"
    const val EXTRA_WATCH = "watch"
    const val EXTRA_ORIGIN_INTENT = "originIntent"
    const val EXTRA_GROUP_ID = "groupId"
    const val EXTRA_GROUP_NAME = "groupName"
    const val EXTRA_ACTIVE_WATCH_USERS = "activeWatchUsers"
    const val EXTRA_SELECTED_MEMBERS = "selectedMembers"
    const val EXTRA_CHAT_SOURCE = "chatSource"
    const val EXTRA_NOTIFICATION_SOURCE = "notificationSource"
    const val EXTRA_OPEN_LINGO_PROGRESS = "openLingoProgress"

    /**
     * Packages available exclusively on SoyMomo Space 4.0. They only exist on
     * Space 4.0 (and newer) watches, so they are shown in the installed-apps and
     * watch-info lists only for those models and filtered out for any older watch.
     */
    val SPACE4_EXCLUSIVE_PACKAGES = setOf(
        "com.sosmartlabs.watchweather",
        "com.sosmartlabs.watchgotchi"
    )

    // Notification Sources
    const val NOTIFICATION_SOURCE_GEOFENCE = "geofence"
    const val NOTIFICATION_SOURCE_SOS = "sos"

    const val PERMISSION_LOCATION = 0
    const val PERMISSION_PHONE = 1
    const val PERMISSION_CONTACTS = 2
    const val PERMISSION_AUDIO = 3
    const val PERMISSION_STORAGE_CAMERA = 4
    const val PERMISSION_STORAGE_GALLERY = 5
    const val REQUEST_LOCATION_PERMISSION = 0
    const val REQUEST_PHONE_PERMISSION = 1
    const val REQUEST_CONTACTS_PERMISSION = 2
    const val REQUEST_RECORD_AUDIO_PERMISSION = 3
    const val REQUEST_STORAGE_PERMISSION_CAMERA = 4
    const val REQUEST_STORAGE_PERMISSION_GALLERY = 5
    const val REQUEST_READ_CONTACTS = 0

    const val MAX_CONTACTS = 10
    val PLAZA_ITALIA = LatLng(-33.437, -70.634411)

    const val TUTORIAL_PREFS = "momoTutorialPref"
    const val MOMO_PREFS = "momoPrefs"
    const val FIRST_TIME_OPEN = "momoFirstTimeOpen"

    // Deep-link extras passed to SimActivity from the upgrade popup
    const val EXTRA_DEEP_LINK_SUBSCRIPTION_ID = "deepLinkSubscriptionId"
    const val EXTRA_DEEP_LINK_SCROLL_TO_UPGRADE = "deepLinkScrollToUpgrade"

    // Room DBs
    const val CHAT_DB_NAME = "ROOM_CHAT"

    // Notifications
    const val NOTIFICATION_VIDEOCALL = 8080
    const val NOTIFICATION_MESSAGE = 8181
    const val NOTIFICATION_TAG_GEOFENCE = "geofence_notification"

    // Workers
    const val USER_LOCATION_WORKER_TAG = "USER_LOCATION_WORKER_TAG"

    // Receivers
    const val ACTION_FIRST_INTERACTION = "com.sosmartlabs.momo.FIRST_INTERACTION"

}
