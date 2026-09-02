package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import timber.log.Timber

class SubscriptionListDiffCallback : DiffUtil.ItemCallback<Subscription>() {
    
    override fun areItemsTheSame(oldItem: Subscription, newItem: Subscription): Boolean {
        // Compare by objectId since it's the unique identifier for ParseObjects
        val areItemsSame = oldItem.objectId == newItem.objectId
        Timber.v("SubscriptionListDiffCallback: Comparing items: ${oldItem.objectId} vs ${newItem.objectId} = $areItemsSame")
        return areItemsSame
    }

    override fun areContentsTheSame(oldItem: Subscription, newItem: Subscription): Boolean {
        // Compare only the fields that affect the UI
        val areContentsSame = oldItem.iccId == newItem.iccId &&
                oldItem.status == newItem.status &&
                oldItem.activatedAt == newItem.activatedAt &&
                oldItem.terminatedAt == newItem.terminatedAt &&
                oldItem.stripeCredentials?.subscriptionStatus == newItem.stripeCredentials?.subscriptionStatus &&
                oldItem.apioCredentials?.apioSubscriptionStatus == newItem.apioCredentials?.apioSubscriptionStatus &&
                oldItem.imei == newItem.imei &&
                oldItem.plan.objectId == newItem.plan.objectId &&
                oldItem.plan.logo?.url == newItem.plan.logo?.url &&
                oldItem.plan.backgroundImageColors == newItem.plan.backgroundImageColors

        Timber.v("SubscriptionListDiffCallback: Comparing contents for ${oldItem.objectId}: $areContentsSame")
        return areContentsSame
    }
}