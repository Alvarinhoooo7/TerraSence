package com.sosmartlabs.momo.sim.ui.adapter

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.ItemSubscriptionWatchPlanBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.model.PaymentStatus
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import java.util.Date

/**
 * Adapter for displaying a list of subscriptions with their associated watch and plan information.
 * Supports partial updates for subscription status changes via payloads.
 */
class SubscriptionListAdapter : ListAdapter<Subscription, SubscriptionListAdapter.SubscriptionViewHolder>(
    SubscriptionListDiffCallback()
) {

    // =============================================================================
    // LISTENER INTERFACE
    // =============================================================================

    interface Listener {
        fun onSubscriptionClicked(subscription: Subscription)
        fun onRestoreSubscriptionAlertClicked(subscription: Subscription)
        fun onPendingPaymentAlertClicked(subscription: Subscription)
    }

    lateinit var listener: Listener

    // =============================================================================
    // ADAPTER OVERRIDES
    // =============================================================================

    override fun submitList(list: List<Subscription>?) {
        Timber.d("SubscriptionListAdapter: Submitting new list with ${list?.size ?: 0} items")
        CrashlyticsLog.log("SubscriptionListAdapter: Updating subscription list with ${list?.size ?: 0} items")
        super.submitList(list?.let { ArrayList(it) })
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SubscriptionViewHolder {
        Timber.d("SubscriptionListAdapter: Creating new ViewHolder")
        val binding = ItemSubscriptionWatchPlanBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return SubscriptionViewHolder(binding, listener)
    }

    override fun onBindViewHolder(holder: SubscriptionViewHolder, position: Int) {
        val subscription = getItem(position)
        Timber.d("SubscriptionListAdapter: Binding subscription at position $position")
        CrashlyticsLog.log("SubscriptionListAdapter: Binding subscription at position $position")
        holder.bind(subscription)
    }

    override fun onBindViewHolder(holder: SubscriptionViewHolder, position: Int, payloads: MutableList<Any>) {
        if (payloads.isEmpty()) {
            super.onBindViewHolder(holder, position, payloads)
        } else {
            val subscription = getItem(position)
            Timber.d("SubscriptionListAdapter: Partial update for subscription at position $position")
            holder.updateSubscriptionStatus(subscription)
        }
    }

    // =============================================================================
    // VIEW HOLDER
    // =============================================================================

    class SubscriptionViewHolder(
        private val binding: ItemSubscriptionWatchPlanBinding,
        private val listener: Listener
    ) : RecyclerView.ViewHolder(binding.root) {

        private val context: Context get() = binding.root.context

        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------

        fun bind(subscription: Subscription) {
            Timber.d("SubscriptionViewHolder: Starting to bind subscription")
            CrashlyticsLog.log("SubscriptionViewHolder: Binding subscription")

            setupClickListener(subscription)
            bindWatchData(subscription.watch)
            bindPlanData(subscription.plan)
            bindPaymentStatus(subscription)

            Timber.d("SubscriptionViewHolder: Successfully bound subscription")
        }

        fun updateSubscriptionStatus(subscription: Subscription) {
            Timber.d("SubscriptionViewHolder: Performing partial update for subscription")
            bindPaymentStatus(subscription)
        }

        // -------------------------------------------------------------------------
        // Click Listener
        // -------------------------------------------------------------------------

        private fun setupClickListener(subscription: Subscription) {
            binding.watchCard.setOnClickListener {
                Timber.d("SubscriptionViewHolder: User clicked subscription")
                CrashlyticsLog.log("SubscriptionViewHolder: User selected subscription")
                listener.onSubscriptionClicked(subscription)
            }
        }

        // -------------------------------------------------------------------------
        // Watch Data Binding
        // -------------------------------------------------------------------------

        private fun bindWatchData(watch: Wearer) {
            Timber.d("SubscriptionViewHolder: Setting watch data")

            val imageUrl = watch.image?.url
            if (imageUrl != null) {
                Timber.d("SubscriptionViewHolder: Loading watch image")
                binding.watchProfilePicture.loadImage(imageUrl, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            } else {
                Timber.d("SubscriptionViewHolder: No watch image available, using default")
                binding.watchProfilePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            }

            binding.watchName.text = watch.name()
            binding.watchImei.text = context.getString(R.string.subscription_watch_card_imei, watch.imei())
            binding.watchPhone.text = context.getString(R.string.subscription_watch_card_phone, watch.phone)

            Timber.d("SubscriptionViewHolder: Successfully set watch data")
        }

        // -------------------------------------------------------------------------
        // Plan Data Binding
        // -------------------------------------------------------------------------

        private fun bindPlanData(plan: SubscriptionPlan) {
            Timber.d("SubscriptionViewHolder: Setting plan data")

            val logoUrl = plan.logo?.url
            if (logoUrl != null) {
                Timber.d("SubscriptionViewHolder: Loading plan logo")
                binding.subscriptionPlanInfo.planLogo.loadImage(logoUrl, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
            } else {
                Timber.d("SubscriptionViewHolder: No plan logo available, using default")
                binding.subscriptionPlanInfo.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
            }

            val gradient = GradientBackground.createGradient(
                plan.backgroundImageColors,
                GradientDrawable.Orientation.RIGHT_LEFT
            )
            binding.subscriptionPlanInfo.planLayout.background = gradient

            Timber.d("SubscriptionViewHolder: Successfully set plan data")
        }

        // -------------------------------------------------------------------------
        // Payment Status Binding
        // -------------------------------------------------------------------------

        private fun bindPaymentStatus(subscription: Subscription) {
            val subscriptionStatus = subscription.getSubscriptionStatus()
            val paymentStatus = subscription.getPaymentStatus()

            Timber.d("SubscriptionViewHolder: Setting status - subscription: $subscriptionStatus, payment: $paymentStatus")
            CrashlyticsLog.log("SubscriptionViewHolder: Subscription status update - subscription: $subscriptionStatus, payment: $paymentStatus")

            when (subscriptionStatus) {
                SubscriptionStatus.ACTIVE -> bindActiveSubscriptionStatus(subscription, paymentStatus)
                SubscriptionStatus.PREACTIVATED,
                SubscriptionStatus.PAUSED -> hideAllStatusCards()
                SubscriptionStatus.SUSPENDED -> bindSuspendedStatus(subscription)
                SubscriptionStatus.TERMINATED -> bindTerminatedStatus(subscription)
            }

            Timber.d("SubscriptionViewHolder: Successfully updated status")
        }

        /**
         * SUSPENDED = service already cut over a pending payment; paying restores
         * it. The alert shows UNCONDITIONALLY (not gated on paymentStatus): the
         * service is down regardless of what the payment credentials derive.
         */
        private fun bindSuspendedStatus(subscription: Subscription) {
            showAlertCard(
                subscription = subscription,
                style = AlertStyle.ERROR,
                titleMessageRes = R.string.subscription_alert_subscription_status_suspended_title,
                subtitleMessageRes = R.string.subscription_alert_subscription_status_suspended_subtitle,
                buttonMessageRes = R.string.subscription_alert_payment_button_pay_now
            )
        }

        private fun bindActiveSubscriptionStatus(subscription: Subscription, paymentStatus: PaymentStatus) {
            when (paymentStatus) {
                PaymentStatus.ACTIVE,
                PaymentStatus.UNKNOWN -> hideAllStatusCards()

                PaymentStatus.ACTIVATION_PERIOD -> {
                    binding.subscriptionAlertCard.visibility = View.GONE
                    binding.paymentSyncingCard.visibility = View.VISIBLE
                }

                PaymentStatus.CANCELED -> showAlertCard(
                    subscription = subscription,
                    style = AlertStyle.ERROR,
                    titleMessageRes = R.string.subscription_alert_payment_status_canceled_title,
                    subtitleMessageRes = R.string.subscription_alert_payment_status_canceled_subtitle,
                    buttonMessageRes = R.string.subscription_alert_payment_button_restore
                )

                PaymentStatus.PENDING -> showAlertCard(
                    subscription = subscription,
                    style = AlertStyle.WARNING,
                    titleMessageRes = R.string.subscription_alert_payment_status_failed_title,
                    subtitleMessageRes = R.string.subscription_alert_payment_status_failed_subtitle,
                    buttonMessageRes = R.string.subscription_alert_payment_button_pay_now
                )

                PaymentStatus.MISSING_INFORMATION -> showAlertCard(
                    subscription = subscription,
                    style = AlertStyle.ERROR,
                    titleMessageRes = R.string.subscription_alert_payment_status_missing_payment_information_title,
                    subtitleMessageRes = R.string.subscription_alert_payment_status_missing_payment_information_subtitle,
                    buttonMessageRes = R.string.subscription_alert_payment_button_fix
                )
            }
        }

        private fun bindTerminatedStatus(subscription: Subscription) {
            binding.paymentSyncingCard.visibility = View.GONE
            binding.subscriptionAlertCard.visibility = View.VISIBLE

            val dateFormatter = DateFormat.getDateFormat(context)
            val terminationDate = subscription.terminatedAt?.let { dateFormatter.format(it) }
                ?: dateFormatter.format(Date())

            showAlertCard(
                subscription = subscription,
                style = AlertStyle.TERMINATED,
                titleMessageRes = R.string.subscription_alert_subscription_status_terminated_title,
                subtitleMessageRes = R.string.subscription_alert_subscription_status_terminated_subtitle,
                buttonMessageRes = R.string.subscription_alert_payment_button_reactivate,
                extraSubtitleArgument = terminationDate
            )
            setupAlertButtonClickListener(subscription)
        }

        // -------------------------------------------------------------------------
        // Alert Card Helpers
        // -------------------------------------------------------------------------

        private fun hideAllStatusCards() {
            binding.subscriptionAlertCard.visibility = View.GONE
            binding.paymentSyncingCard.visibility = View.GONE
        }

        private fun showAlertCard(
            subscription: Subscription,
            style: AlertStyle,
            @StringRes titleMessageRes: Int,
            @StringRes subtitleMessageRes: Int,
            @StringRes buttonMessageRes: Int,
            extraSubtitleArgument: String? = null,
        ) {
            binding.paymentSyncingCard.visibility = View.GONE
            binding.subscriptionAlertCard.visibility = View.VISIBLE

            // Card
            binding.subscriptionAlertCard.setCardBackgroundColor(getColor(style.backgroundColorRes))

            // Title
            binding.subscriptionAlertCardTitle.text = context.getString(titleMessageRes)
            binding.subscriptionAlertCardTitle.setTextColor(getColor(style.textColorRes))

            // Subtitle
            if (extraSubtitleArgument != null) {
                binding.subscriptionAlertCardSubtitle.text = context.getString(
                    R.string.subscription_alert_subscription_status_terminated_subtitle,
                    extraSubtitleArgument
                )
            } else {
                binding.subscriptionAlertCardSubtitle.text = context.getString(subtitleMessageRes)
            }
            binding.subscriptionAlertCardSubtitle.setTextColor(getColor(style.textColorRes))

            // Icon
            binding.subscriptionAlertCardImage.imageTintList = ColorStateList.valueOf(getColor(style.iconTintRes))
            binding.subscriptionAlertCardImage.setImageResource(style.iconRes)

            // Button
            binding.subscriptionAlertCardButton.setBackgroundColor(getColor(style.buttonColorRes))
            binding.subscriptionAlertCardButton.text = context.getString(buttonMessageRes)

            setupAlertButtonClickListener(subscription)
        }

        private fun setupAlertButtonClickListener(subscription: Subscription) {
            val subscriptionStatus = subscription.getSubscriptionStatus()
            val paymentStatus = subscription.getPaymentStatus()

            binding.subscriptionAlertCardButton.setOnClickListener {
                when(subscriptionStatus) {
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PREACTIVATED,
                    SubscriptionStatus.PAUSED -> {
                        when (paymentStatus) {
                            PaymentStatus.ACTIVE -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for ACTIVE status")
                                // No-Op
                            }
                            PaymentStatus.PENDING -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for PENDING status")
                                listener.onPendingPaymentAlertClicked(subscription)
                            }
                            PaymentStatus.CANCELED -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for CANCELED status")
                                listener.onPendingPaymentAlertClicked(subscription)
                            }
                            PaymentStatus.MISSING_INFORMATION -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for MISSING_INFORMATION status")
                                listener.onPendingPaymentAlertClicked(subscription)
                            }
                            PaymentStatus.ACTIVATION_PERIOD -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for ACTIVATION_PERIOD status")
                                // No-Op
                            }
                            PaymentStatus.UNKNOWN -> {
                                Timber.d("SubscriptionViewHolder: Alert button clicked for UNKNOWN status")
                                // No-Op
                            }
                        }
                    }
                    SubscriptionStatus.SUSPENDED -> {
                        // Unconditional: the fragment routes PENDING to the pay-now
                        // URL and anything else to the management portal session,
                        // which is the right fallback if credentials are inconsistent.
                        Timber.d("SubscriptionViewHolder: Alert button clicked for SUSPENDED status")
                        listener.onPendingPaymentAlertClicked(subscription)
                    }
                    SubscriptionStatus.TERMINATED -> {
                        listener.onRestoreSubscriptionAlertClicked(subscription)
                    }
                }
            }
        }

        private fun getColor(@ColorRes colorRes: Int): Int {
            return ContextCompat.getColor(context, colorRes)
        }

        // -------------------------------------------------------------------------
        // Alert Styling
        // -------------------------------------------------------------------------

        /**
         * Defines the visual style for alert cards based on severity.
         */
        private enum class AlertStyle(
            @param:ColorRes val textColorRes: Int,
            @param:ColorRes val iconTintRes: Int,
            @param:ColorRes val backgroundColorRes: Int,
            @param:ColorRes val buttonColorRes: Int,
            @param:DrawableRes val iconRes: Int
        ) {
            TERMINATED(
                textColorRes = R.color.sim_payment_error,
                iconTintRes = R.color.sim_payment_error,
                backgroundColorRes = R.color.sim_payment_error_light,
                buttonColorRes = R.color.sim_payment_error,
                iconRes = R.drawable.ic_alert
            ),
            ERROR(
                textColorRes = R.color.sim_payment_error,
                iconTintRes = R.color.sim_payment_error,
                backgroundColorRes = R.color.sim_payment_error_light,
                buttonColorRes = R.color.sim_payment_error,
                iconRes = R.drawable.ic_subscription_payment_error
            ),
            WARNING(
                textColorRes = R.color.sim_payment_pending_dark,
                iconTintRes = R.color.sim_payment_pending,
                backgroundColorRes = R.color.sim_payment_pending_light,
                buttonColorRes = R.color.sim_payment_pending,
                iconRes = R.drawable.ic_subscription_payment_error
            )
        }
    }
}
