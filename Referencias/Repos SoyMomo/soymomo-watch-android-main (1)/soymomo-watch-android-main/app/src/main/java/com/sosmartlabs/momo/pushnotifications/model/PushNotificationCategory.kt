package com.sosmartlabs.momo.pushnotifications.model

enum class PushNotificationCategory(val code: Int) {
    // Geofences
    EXIT_GEOFENCE(0),
    ENTER_GEOFENCE(1),

    // Watch Actions
    SOS(2),
    TAKE_OFF(3),
    LOW_BATTERY(4),
    BATTERY_SAVING(14),
    POWER_ON(344),
    POWER_OFF(345),
    VALIDATED_REMINDER(15),
    FIRST_INTERACTION(16),

    // Watch Ownership
    OWNER(6),
    ADD_NEW_REQ(5),
    ADD_REQ_ACCEPTED(7),
    ADD_REQ_REJECTED(8),
    USER_REMOVED(9),
    NEW_FRIEND(30),

    // Messages
    CHAT(20),
    MESSAGE_AUDIO(10),
    MESSAGE_IMAGE(11),

    // Group membership
    GROUP_MEMBER_ADDED(40),
    GROUP_MEMBER_REMOVED(41),
    GROUP_MEMBER_LEFT(42),
    GROUP_ROLE_CHANGED(43),
    GROUP_OWNER_CHANGED(44),
    GROUP_DELETED(45),

    // Videocall
    VIDEOCALL(12),
    VIDEOCALL_HANGUP(13),

    // Subscription
    SUBSCRIPTION_ACTIVATED(193), // Subscription activation complete
    SUBSCRIPTION_PAYMENT_ISSUE(194), // Subscription payment issue (Apio failed* / Stripe past_due)
    SUBSCRIPTION_TERMINATED(195), // Subscription terminated/canceled

    // Marketing
    MARKETING(234),

    // Lingo
    LINGO_STARTED(31),
    LINGO_CHALLENGE_COMPLETE(32)
}