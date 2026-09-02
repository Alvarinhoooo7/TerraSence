package com.sosmartlabs.momo.sim.ui.adapter

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.sim.model.Subscription
import timber.log.Timber

class SubscriptionListDiffCallback : DiffUtil.ItemCallback<Subscription>() {
    
    override fun areItemsTheSame(oldItem: Subscription, newItem: Subscription): Boolean {
        // Compare by objectId since it's the unique identifier for ParseObjects
        val areItemsSame = oldItem.objectId == newItem.objectId
        Timber.v("SubscriptionListDiffCallback: Comparing items: $areItemsSame")
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
                oldItem.watch.objectId == newItem.watch.objectId &&
                oldItem.watch.image?.url == newItem.watch.image?.url &&
                oldItem.watch.name() == newItem.watch.name() &&
                oldItem.watch.imei() == newItem.watch.imei() &&
                oldItem.watch.phone == newItem.watch.phone &&
                oldItem.plan.objectId == newItem.plan.objectId &&
                oldItem.plan.logo?.url == newItem.plan.logo?.url &&
                oldItem.plan.backgroundImageColors == newItem.plan.backgroundImageColors

        Timber.v("SubscriptionListDiffCallback: Comparing contents: $areContentsSame")
        return areContentsSame
    }
}
