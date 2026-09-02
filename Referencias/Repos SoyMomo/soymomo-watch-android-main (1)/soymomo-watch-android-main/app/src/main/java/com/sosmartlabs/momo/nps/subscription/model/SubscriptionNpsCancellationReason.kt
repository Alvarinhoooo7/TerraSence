package com.sosmartlabs.momo.nps.subscription.model

enum class SubscriptionNpsCancellationReason(val key: String) {
    TOO_EXPENSIVE("too_expensive"),
    COVERAGE_ISSUES("coverage_issues"),
    APP_ISSUES("app_issues"),
    NO_LONGER_NEEDED("no_longer_needed"),
    WATCH_LOST_OR_BROKEN("watch_lost_or_broken"),
    OTHER("other"),
}
