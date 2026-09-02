package com.sosmartlabs.momotabletpadres.sim.ui.adapter

import android.graphics.drawable.GradientDrawable
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemSubscriptionDevicePlanBinding
import com.sosmartlabs.momotabletpadres.sim.model.PaymentStatus
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionStatus
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
import timber.log.Timber
import java.util.Date

class SubscriptionListAdapter: ListAdapter<Subscription, SubscriptionListAdapter.SubscriptionViewHolder>(
    SubscriptionListDiffCallback()
) {

    interface Listener {
        fun onSubscriptionClicked(subscription: Subscription)
    }

    lateinit var listener: Listener

    override fun submitList(list: List<Subscription>?) {
        Timber.d("SubscriptionListAdapter: Submitting new list with ${list?.size ?: 0} items")
        CrashlyticsLog.log("SubscriptionListAdapter: Updating subscription list with ${list?.size ?: 0} items")
        super.submitList(list?.let { ArrayList(it) })
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SubscriptionViewHolder {
        Timber.d("SubscriptionListAdapter: Creating new ViewHolder")
        val binding = ItemSubscriptionDevicePlanBinding.inflate(
            LayoutInflater.from(parent.context), parent, false)
        return SubscriptionViewHolder(binding, listener)
    }

    override fun onBindViewHolder(holder: SubscriptionViewHolder, position: Int) {
        val subscription = getItem(position)
        Timber.d("SubscriptionListAdapter: Binding subscription at position $position with id: ${subscription.objectId}")
        CrashlyticsLog.log("SubscriptionListAdapter: Binding subscription ${subscription.objectId} at position $position")
        holder.bind(subscription)
    }

    override fun onBindViewHolder(
        holder: SubscriptionViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        if (payloads.isEmpty()) {
            super.onBindViewHolder(holder, position, payloads)
        } else {
            val subscription = getItem(position)
            Timber.d("SubscriptionListAdapter: Partial update for subscription ${subscription.objectId} at position $position")
            holder.updateSubscriptionStatus(subscription)
        }
    }

    class SubscriptionViewHolder(private val binding: ItemSubscriptionDevicePlanBinding, private val listener: Listener) : RecyclerView.ViewHolder(binding.root) {

        private val deviceCard get() = binding.deviceCard
        private val devicePicture get() = binding.deviceProfilePicture
        private val deviceName get() = binding.deviceName
        private val deviceImei get() = binding.deviceImei
        private val devicePhone get() = binding.devicePhone

        private val planCard get() = binding.subscriptionPlanInfo.planCard
        private val planLayout get() = binding.subscriptionPlanInfo.planLayout
        private val planLogo get() = binding.subscriptionPlanInfo.planLogo

        private val alertCard get() = binding.subscriptionAlertCard
        private val alertText get() = binding.subscriptionAlertCardTitle
        private val alertImage get() = binding.subscriptionAlertCardImage

        private val paymentActivationAlertCard get() = binding.paymentActivationAlertCard
        private val paymentActivationAlertText get() = binding.paymentActivationAlertCardTitle
        private val paymentActivationAlertProgress get() = binding.paymentActivationAlertCardProgress

        fun bind(subscription: Subscription) {
            Timber.d("SubscriptionViewHolder: Starting to bind subscription ${subscription.objectId} for tablet ${subscription.tablet?.objectId}")
            CrashlyticsLog.log("SubscriptionViewHolder: Binding subscription ${subscription.objectId} for tablet ${subscription.tablet?.objectId}")
            setOnClickListener(subscription)
            setTabletData(subscription)
            setSubscriptionPlanData(subscription.plan)
            setSubscriptionPaymentStatus(subscription)

            Timber.d("SubscriptionViewHolder: Successfully bound subscription ${subscription.objectId}")
        }

        private fun setOnClickListener(subscription: Subscription) {
            deviceCard.setOnClickListener {
                Timber.d("SubscriptionViewHolder: User clicked subscription ${subscription.objectId}")
                CrashlyticsLog.log("SubscriptionViewHolder: User selected subscription ${subscription.objectId}")
                listener.onSubscriptionClicked(subscription)
            }
        }

        private fun setTabletData(subscription: Subscription) {
            val tablet = subscription.tablet

            // Defensive guard: check if tablet is null or data is not available
            if (tablet == null || !tablet.isDataAvailable) {
                if (tablet == null) {
                    Timber.w("SubscriptionViewHolder: No tablet for subscription ${subscription.objectId}, showing fallback UI")
                } else {
                    Timber.w("SubscriptionViewHolder: Tablet ${tablet.objectId} has no data available (isDataAvailable=false) for subscription ${subscription.objectId}, showing fallback UI")
                    CrashlyticsLog.log("SubscriptionViewHolder: Tablet data not available for subscription ${subscription.objectId}")
                }
                // Show fallback UI using default image and subscription-level data
                devicePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                deviceName.text = null
                deviceImei.text = binding.root.context.getString(R.string.subscription_device_card_imei, subscription.imei ?: "")
                devicePhone.text = binding.root.context.getString(R.string.subscription_device_card_phone, subscription.msisdn ?: "")
                return
            }

            Timber.d("SubscriptionViewHolder: Setting data for device ${tablet.objectId}")
            with(tablet) {
                profilePicture?.let { img ->
                    Timber.d("SubscriptionViewHolder: Loading tablet image from URL: ${img.url}")
                    devicePicture.loadImage(img.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                } ?: run {
                    Timber.d("SubscriptionViewHolder: No tablet image available for ${tablet.objectId}, using default")
                    devicePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
                }
                deviceName.text = profileName
                deviceImei.text = binding.root.context.getString(R.string.subscription_device_card_imei, imei)
                devicePhone.text = binding.root.context.getString(R.string.subscription_device_card_phone, phone)
            }
            Timber.d("SubscriptionViewHolder: Successfully set tablet data for ${tablet.objectId}")
        }

        private fun setSubscriptionPlanData(plan: SubscriptionPlan) {
            Timber.d("SubscriptionViewHolder: Setting plan data for ${plan.objectId}")
            with(plan) {
                logo?.let { logo ->
                    Timber.d("SubscriptionViewHolder: Loading plan logo from URL: ${logo.url}")
                    planLogo.loadImage(logo.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: run {
                    Timber.d("SubscriptionViewHolder: No plan logo available for ${plan.objectId}, using default")
                    planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                }
                val gradient = GradientBackground.createGradient(
                    backgroundImageColors,
                    GradientDrawable.Orientation.RIGHT_LEFT
                )
                planLayout.background = gradient
            }
            Timber.d("SubscriptionViewHolder: Successfully set plan data for ${plan.objectId}")
        }

        private fun setSubscriptionPaymentStatus(subscription: Subscription) {
            val subscriptionStatus = subscription.getSubscriptionStatus()
            val paymentStatus = subscription.getPaymentStatus()
            Timber.d("SubscriptionViewHolder: Setting status for subscription ${subscription.objectId} - subscription: $subscriptionStatus, payment: $paymentStatus")
            CrashlyticsLog.log("SubscriptionViewHolder: Subscription ${subscription.objectId} status update - subscription: $subscriptionStatus, payment: $paymentStatus")

            when (subscriptionStatus) {
                SubscriptionStatus.ACTIVE -> handleActiveSubscription(paymentStatus)
                SubscriptionStatus.PREACTIVATED, SubscriptionStatus.PAUSED -> handlePreactivatedOrPausedSubscription()
                SubscriptionStatus.TERMINATED -> handleTerminatedSubscription(subscription)
            }
            Timber.d("SubscriptionViewHolder: Successfully updated status for subscription ${subscription.objectId}")
        }

        private fun handleActiveSubscription(paymentStatus: PaymentStatus) {
            when (paymentStatus) {
                PaymentStatus.ACTIVE, PaymentStatus.UNKNOWN -> {
                    alertCard.visibility = View.GONE
                    paymentActivationAlertCard.visibility = View.GONE
                }
                PaymentStatus.CANCELED -> {
                    alertCard.visibility = View.VISIBLE
                    alertText.text = binding.root.context.getString(R.string.subscription_list_payment_status_canceled)
                    alertImage.setImageResource(R.drawable.ic_subscription_payment_error)
                    paymentActivationAlertCard.visibility = View.GONE
                }
                PaymentStatus.PENDING -> {
                    alertCard.visibility = View.VISIBLE
                    alertText.text = binding.root.context.getString(R.string.subscription_list_payment_status_pending)
                    alertImage.setImageResource(R.drawable.ic_subscription_payment_error)
                    paymentActivationAlertCard.visibility = View.GONE
                }
                PaymentStatus.MISSING_INFORMATION -> {
                    alertCard.visibility = View.VISIBLE
                    alertText.text = binding.root.context.getString(R.string.subscription_list_payment_status_missing_payment_information)
                    alertImage.setImageResource(R.drawable.ic_subscription_payment_error)
                    paymentActivationAlertCard.visibility = View.GONE
                }
                PaymentStatus.ACTIVATION_PERIOD -> {
                    alertCard.visibility = View.GONE
                    paymentActivationAlertCard.visibility = View.VISIBLE
                }
            }
        }

        private fun handlePreactivatedOrPausedSubscription() {
            alertCard.visibility = View.GONE
            paymentActivationAlertCard.visibility = View.GONE
        }

        private fun handleTerminatedSubscription(subscription: Subscription) {
            alertCard.visibility = View.VISIBLE
            alertImage.setImageResource(R.drawable.ic_alert)
            val dateFormatter = DateFormat.getDateFormat(binding.root.context)
            val terminationDate = subscription.terminatedAt?.let { dateFormatter.format(it) }
                ?: dateFormatter.format(Date())
            alertText.text = binding.root.context.getString(
                R.string.subscription_list_subscription_status_terminated,
                terminationDate
            )
            paymentActivationAlertCard.visibility = View.GONE
        }

        fun updateSubscriptionStatus(subscription: Subscription) {
            Timber.d("SubscriptionViewHolder: Performing partial update for subscription ${subscription.objectId}")
            setSubscriptionPaymentStatus(subscription)
        }
    }
}