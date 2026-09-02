package com.sosmartlabs.momo.nps.subscription.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class SubscriptionNpsScheduler(
    val schedulerId: String,
    val subscriptionId: String? = null,
) : Parcelable
