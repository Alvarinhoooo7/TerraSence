package com.sosmartlabs.momotabletpadres.utils

import com.sosmartlabs.momotabletpadres.R


object Constants {
    // SharedPreference
    const val SP_SHAREDPREFERENCES_NAME = "MomoTabletPreferences"
    const val SP_FIRST_START = "firstStart"
    const val EXTRA_NEW_USER = "newUser"
    const val SP_THEME_COLOR = "theme_color"
    const val SP_SELECTED_BACKGROUND = "selected_background"
    const val SP_CURRENT_FRAGMENT = "currentFragment"
    const val SP_SETTINGS_OPEN_FIRST_TIME = "first_settings_open"
    const val SP_SETTINGS_OPEN = "settings_open"
    const val FIRST_TIME_OPEN = "first_open"
    const val PROFANITY_FILTER = "profanity_filter"
    const val APP_STATS_FILTLER = "app_stats_filter"
    const val UNSAFE_SEARCH_FILTER = "unsafe_search_filter"
    const val EXTRA_IMAGE_URI = "imageUri"

    const val TUTORIAL_PREFS = "momoTutorialPref"
    const val EXTRA_TUTORIAL_PAGE = "tutorialPage"
    const val EXTRA_ORIGIN_INTENT = "originIntent"

    // Notifications
    const val notificationInstalledApp = 3
    const val notificationSmartDetection = 6
    const val notificationProfanityDetection = 7
    const val notificationUnsafeSearchDetection = 11
    const val notificationMoodDetection = 23
    const val notificationExplicitMusicDetection = 17
    const val notificationRequestTime = 12
    const val notificationRequestTimeApp = 14
    const val notificationPhoneContact = 20

    // Content Types for Firebase Analytics
    const val contentTypeRedirection = "redirection"
    const val idRedirectTabletLanding = "redirect_to_tablet_landing"

    const val REQUEST_PICTURE_PERMISSION = 99

    // Tablet Colors
    val lite1Colors = arrayOf("Pink", "Blue")
    val lite2Colors = arrayOf("Pink", "Blue")
    val lite3Colors = arrayOf("Pink", "Blue")
    val pro1Colors = arrayOf("Pink", "Blue", "Black")
    val pro2Colors = arrayOf("Pink", "Blue", "MidnightBlue", "Lilium")
    const val TABLET_COLOR_PINK = "Pink"
    const val TABLET_COLOR_GREEN = "Green"
    const val TABLET_COLOR_LIGHTBLUE = "LightBlue"
    const val TABLET_COLOR_BLUE = "Blue"

    // TabletQuickAccess
    const val FRAGMENT_QUICK_ACCESS = "FragmentQuickAccess"

    const val TABLET_KID_PROFILE_EDIT = "KidProfileEditFragment"
    const val TABLET_SAFETY = "TabletSafetyFragment"
    const val TABLET_DUG_SMART_DETECTION = "TabletFragmentDugSmartDetection"
    const val TABLET_DUG_MESSAGES_DETECTION = "TabletFragmentDugMessagesDetection"
    const val TABLET_DUG_SEARCH_DETECTION = "TabletFragmentDugSearchDetection"
    const val TABLET_DUG_MOOD_DETECTION = "TabletFragmentDugMoodDetection"
    const val TABLET_DUG_MUSIC_DETECTION = "TabletFragmentDugExplicitMusicDetection"
    const val TABLET_SETTINGS_APP_MAIN = "SettingsAppMainFragment"
    const val SETTINGS_TABLET_LINK = "SettingsTabletLinkFragment"
    const val SETTINGS_TABLET_NOTIFICATIONS = "NotificationFragment"
    const val TABLET_REQUEST_TIME = "SettingsRequestTimeFragment"
    const val TABLET_REQUEST_TIME_APP = "SettingsRequestTimeAppFragment"

    // Shared Preferences
    const val SP_DUG_SMART_DETECTION_LAST_CHECK = "dug_smart_detection_last_check"
    const val SP_DUG_MESSAGES_DETECTION_LAST_CHECK = "dug_messages_detection_last_check"
    const val SP_DUG_SEARCH_DETECTION_LAST_CHECK = "dug_search_detection_last_check"
    const val SP_DUG_MOOD_DETECTION_LAST_CHECK = "dug_mood_detection_last_check"
    const val SP_DUG_MUSIC_DETECTION_LAST_CHECK = "dug_music_detection_last_check"
    const val SP_DUG_BLOCKS_DETECTION_LAST_CHECK = "dug_blocks_detection_last_check"

    // `@JvmField` because R.drawable.* is no longer final under AGP 9. Without it,
    // Kotlin emits the property as a static-final int field but consumers still
    // expect a getter, and the call site crashes with `NoSuchMethodError:
    // getPROFILE_PLACEHOLDER()`. `@JvmField` makes both sides agree on a plain
    // field with no getter.
    @JvmField val PROFILE_PLACEHOLDER = R.drawable.default_parent_profile_pic
}