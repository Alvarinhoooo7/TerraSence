package com.sosmartlabs.momo.pushnotifications.model


enum class NotificationChannelCategory(val id: String) {
    OTHER("com.sosmartlabs.momo.MomoPush"),
    GEOFENCE("com.sosmartlabs.momo.MomoPush.geofences"),
    WATCH("com.sosmartlabs.momo.MomoPush.watch"),
    OWNERSHIP("com.sosmartlabs.momo.MomoPush.ownership"),
    MESSAGES("com.sosmartlabs.momo.MomoPush.oldMessages"),
    GROUP_MEMBERSHIP("com.sosmartlabs.momo.MomoPush.groupMembership"),
    VIDEOCALL("com.sosmartlabs.momo.MomoPush.videocall"),
    SUBSCRIPTION("com.sosmartlabs.momo.MomoPush.subscription"),
    MARKETING("com.sosmartlabs.momo.MomoPush.marketing"),
    LINGO("com.sosmartlabs.momo.MomoPush.lingo"),
}