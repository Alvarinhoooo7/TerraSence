package com.sosmartlabs.momo.sim.ui.fragments

import android.annotation.SuppressLint
import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.format.DateFormat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionDetailFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.sim.model.PaymentStatus
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.model.SubscriptionStatus
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.sim.ui.TransferSubscriptionViewModel
import com.sosmartlabs.momo.sim.util.SubscriptionPortalLauncher
import com.sosmartlabs.momo.utils.Resource
import com.sosmartlabs.momo.utils.support.WhatsappSupportLauncher
import com.sosmartlabs.momo.utils.support.ZendeskSupportLauncher
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency
import java.util.Date
import java.util.Locale

@SuppressLint("SetTextI18n")
class SubscriptionDetailFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionDetailFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.add_watch_button_soymomo_sim)

    /**
     * ViewModel
     */
    private val simViewModel: SimViewModel by activityViewModels()
    private val transferSubscriptionViewModel: TransferSubscriptionViewModel by activityViewModels()
    private var lastUpgradeAvailabilityKey: String? = null

    /** Deep-link entry from the upgrade popup: scroll to the upgrade card once visible. */
    private var didScrollToUpgrade: Boolean = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionDetailFragment: onCreateView")
        binding = SubscriptionDetailFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionDetailFragment: onViewCreated - Setting up fragment")
        setupToolbar()
        observeViewModel()
        setupListeners()
        hideDefaultActions()
        Timber.d("SubscriptionDetailFragment: onViewCreated - Fragment setup complete")
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionDetailFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
        Timber.d("SubscriptionDetailFragment: Toolbar setup complete")
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionDetailFragment: Setting up view model observers")
        simViewModel.currentSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("SubscriptionDetailFragment: Updating subscription views")
            try {
                setSubscriptionPlanView(subscription)
                setSubscriptionWatchView(subscription)
                setSubscriptionView(subscription)
                setUserManagerView(subscription)
                setAlertView(subscription)
                hideManagerActions(subscription)
                updateUpgradePlanCard(subscription)
                transferSubscriptionViewModel.setCurrentSubscription(subscription)
                Timber.d("SubscriptionDetailFragment: Successfully updated all subscription views")
            } catch (e: Exception) {
                Timber.e("SubscriptionDetailFragment: Error updating subscription views")
                CrashlyticsLog.recordNonFatalError(e, "Error updating subscription views")
            }
        }

        simViewModel.hasAvailableUpgradePlans.observe(viewLifecycleOwner) { hasUpgradePlans ->
            val subscription = simViewModel.currentSubscription.value ?: return@observe
            val shouldShow = hasUpgradePlans && simViewModel.isSubscriptionOwner(subscription)
            binding.upgradePlanCard.visibility = if (shouldShow) View.VISIBLE else View.GONE
            if (shouldShow) {
                scrollToUpgradeIfNeeded()
            }
        }

        simViewModel.deepLinkScrollToUpgrade.observe(viewLifecycleOwner) {
            // No-op observer: ensures `scrollToUpgradeIfNeeded` re-checks when the flag flips on
            // even if the availability observer fired first.
            scrollToUpgradeIfNeeded()
        }

        simViewModel.subscriptionManagementPortalSession.observe(viewLifecycleOwner) { resource ->
            Timber.d("SubscriptionDetailFragment: Subscription management portal session update: ${resource.status}")
            when (resource.status) {
                Resource.Status.LOADING -> {
                    binding.manageSubscriptionCardArrow.visibility = View.INVISIBLE
                    binding.manageSubscriptionCardProgress.visibility = View.VISIBLE
                }
                Resource.Status.LOAD_SUCCESS -> {
                    binding.manageSubscriptionCardArrow.visibility = View.VISIBLE
                    binding.manageSubscriptionCardProgress.visibility = View.INVISIBLE
                    resource.data?.let { url ->
                        Timber.d("SubscriptionDetailFragment: Portal session URL received, launching browser")
                        val launched = SubscriptionPortalLauncher.launchPortalUrl(requireContext(), url)
                        if (!launched) {
                            simViewModel.trackPortalLaunchFailed()
                            Toast.makeText(requireContext(), R.string.toast_error_opening_url, Toast.LENGTH_SHORT).show()
                        }
                    }
                    simViewModel.setSubscriptionManagementPortalSessionDefault()
                }
                Resource.Status.LOAD_ERROR -> {
                    binding.manageSubscriptionCardArrow.visibility = View.VISIBLE
                    binding.manageSubscriptionCardProgress.visibility = View.INVISIBLE
                    resource.data?.let { errorMessage ->
                        Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show()
                        Timber.e("SubscriptionDetailFragment: Portal session error - $errorMessage")
                        CrashlyticsLog.log("Subscription portal session error: $errorMessage")
                    }
                    simViewModel.setSubscriptionManagementPortalSessionDefault()
                }
                else -> {
                    // DEFAULT is already the reset state — calling setDefault() here
                    // re-posts DEFAULT, which re-fires this observer in a loop.
                    binding.manageSubscriptionCardArrow.visibility = View.VISIBLE
                    binding.manageSubscriptionCardProgress.visibility = View.INVISIBLE
                }
            }
        }

        simViewModel.pendingPaymentUrl.observe(viewLifecycleOwner) { resource ->
            Timber.d("SubscriptionDetailFragment: Pending payment URL update: ${resource.status}")
            when (resource.status) {
                Resource.Status.LOADING -> {
                    Timber.d("SubscriptionDetailFragment: Pending payment URL loading...")
                }
                Resource.Status.LOAD_SUCCESS -> {
                    resource.data?.let { url ->
                        Timber.d("SubscriptionDetailFragment: Pending payment URL received, launching browser")
                        val launched = SubscriptionPortalLauncher.launchPortalUrl(requireContext(), url)
                        if (!launched) {
                            simViewModel.trackPendingPaymentLaunchFailed()
                            Toast.makeText(requireContext(), R.string.toast_error_opening_url, Toast.LENGTH_SHORT).show()
                        }
                    }
                    simViewModel.setPendingPaymentUrlDefault()
                }
                Resource.Status.LOAD_ERROR -> {
                    resource.data?.let { errorMessage ->
                        Toast.makeText(requireContext(), errorMessage, Toast.LENGTH_SHORT).show()
                        Timber.e("SubscriptionDetailFragment: Pending payment URL error - $errorMessage")
                        CrashlyticsLog.log("SubscriptionDetailFragment: Pending payment URL error: $errorMessage")
                    }
                    simViewModel.setPendingPaymentUrlDefault()
                }
                else -> {
                    // DEFAULT is already the reset state — no setDefault() here (loop).
                }
            }
        }
    }

    private fun setupListeners() {
        Timber.d("SubscriptionDetailFragment: Setting up click listeners")

        binding.faqCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: FAQ card clicked - launching Zendesk support")
            ZendeskSupportLauncher.launchZendeskSupportLauncher(requireContext())
        }

        binding.contactUsCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Contact us card clicked - launching WhatsApp support")
            simViewModel.trackManageActionSelected("contact_support")
            val whatsappPresetText = simViewModel.currentSubscription.value?.let {
                val subscriptionIccId = it.iccId
                val watchModelName = it.watch.modelName()
                val watchId = it.watch.imei()
                requireContext().getString(R.string.subscription_list_whatsapp_preset_text, subscriptionIccId, watchModelName, watchId)
            }
            WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext(), whatsappPresetText)
        }

        binding.manageSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Manage subscription card clicked")
            simViewModel.currentSubscription.value?.let { subscription ->
                if (subscription.plan.paymentProvider.name == "Apio") {
                    Timber.d("SubscriptionDetailFragment: Apio payment provider - redirecting to support")
                    simViewModel.trackManageActionSelected("portal_support", subscription)
                    binding.contactUsCard.performClick()
                } else {
                    Timber.d("SubscriptionDetailFragment: Getting subscription management portal session")
                    simViewModel.trackManageActionSelected("portal", subscription)
                    simViewModel.getSubscriptionManagementPortalSession(subscription)
                }
            }
        }

        binding.transferSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Transfer subscription card clicked - navigating to transfer list")
            simViewModel.trackManageActionSelected("transfer")
            navigateById(R.id.action_subscriptionDetailFragment_to_subscriptionDetailTransferListFragment)
        }

        binding.upgradePlanCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Upgrade plan card clicked")
            navigateById(R.id.action_subscriptionDetailFragment_to_planUpgradeFragment)
        }

        binding.cancelSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Cancel subscription card clicked - launching WhatsApp support")
            simViewModel.trackManageActionSelected("cancel_support")
            val whatsappPresetText = simViewModel.currentSubscription.value?.let {
                val subscriptionIccId = it.iccId
                val watchModelName = it.watch.modelName()
                val watchId = it.watch.imei()
                requireContext().getString(R.string.subscription_list_whatsapp_preset_text, subscriptionIccId, watchModelName, watchId)
            }
            WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext(), whatsappPresetText)
        }
    }

    private fun setSubscriptionPlanView(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Setting subscription plan view for plan ${subscription.plan.title}")
        with(subscription) {
            with(plan) {
                logo?.let {
                    binding.headerPlanInfo.planLogo.loadImage(it.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: binding.headerPlanInfo.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
            }
            binding.headerPlanInfo.planTitle.text = plan.title
            binding.headerPlanInfo.planPrice.text = formatPrice(plan.price, plan.currencyCode, plan.currency)
            val gradient = GradientBackground.createGradient(
                plan.backgroundImageColors,
                GradientDrawable.Orientation.BOTTOM_TOP
            )
            binding.headerPlanInfo.planCard.background = gradient
        }
    }

    private fun setSubscriptionWatchView(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Setting subscription watch view")
        with(subscription) {
            watch.image?.let {
                binding.watchProfilePicture.loadImage(it.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            } ?: run {
                binding.watchProfilePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
            }
            binding.watchName.text = watch.name()
            binding.watchModel.text = getString(R.string.subscription_watch_card_model, watch.modelName())
            binding.watchImei.text = getString(R.string.subscription_watch_card_imei, watch.imei())
            binding.watchPhone.text = getString(R.string.subscription_watch_card_phone, watch.phone)
        }
    }

    private fun setSubscriptionView(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Setting subscription details view")
        with(subscription) {
            binding.subscriptionsDescriptionIccIdContent.text = getString(R.string.subscription_list_subscription_label_icc_id, iccId)
            binding.subscriptionsDescriptionDataContent.text = getString(R.string.subscription_list_subscription_label_data, plan.data)
            binding.subscriptionsDescriptionVoiceContent.text = getString(R.string.subscription_list_subscription_label_voice, plan.calls)
            binding.subscriptionsDescriptionWarrantyContent.text = getString(R.string.subscription_list_subscription_label_warranty, plan.warranty)
            binding.subscriptionsDescriptionPricingContent.text = getString(R.string.subscription_list_subscription_label_price, formatPrice(plan.price, plan.currencyCode, plan.currency))
            binding.subscriptionsDescriptionBillingPeriodContent.text = getString(R.string.subscription_list_subscription_label_billing_period, plan.billingPeriod)
            binding.subscriptionsDescriptionCoverageContent.text =  getString(R.string.subscription_list_subscription_label_coverage, Locale("", plan.mnoProvider.country).displayCountry)
        }
    }

    private fun setUserManagerView(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Setting user manager view")
        val subscriber = subscription.subscriber

        try {
            // Name/email come from SubscriptionsUserInfo (always readable),
            // not the subscriber.user pointer, which is ACL-restricted for co-parents.
            binding.managedByName.text = "${subscriber.name.orEmpty()} ${subscriber.lastname.orEmpty()}".trim()
            binding.managedByEmail.text = subscriber.email.orEmpty()

            // Profile image still comes from the user pointer (matches iOS); for
            // co-parents this falls back to the placeholder.
            binding.managedByPicture.loadImage(
                subscriber.getParseUser("user")?.getParseFile("image")?.url,
                fallback = DefaultIcons.PROFILE_PLACEHOLDER
            )
        } catch (e: Exception) {
            Timber.e("SubscriptionDetailFragment: Error setting user manager view")
            CrashlyticsLog.recordNonFatalError(e, "Error setting user manager view for subscription ${subscription.iccId}")
        }
    }

    // -------------------------------------------------------------------------
    // Alert View
    // -------------------------------------------------------------------------

    private fun setAlertView(subscription: Subscription) {
        val subscriptionStatus = subscription.getSubscriptionStatus()
        val paymentStatus = subscription.getPaymentStatus()
        Timber.d("SubscriptionDetailFragment: Setting alert view subscription status: $subscriptionStatus and payment status: $paymentStatus")
        CrashlyticsLog.log("SubscriptionDetailFragment: Subscription status: $subscriptionStatus, payment status: $paymentStatus")

        when (subscriptionStatus) {
            SubscriptionStatus.ACTIVE -> bindActiveSubscriptionAlert(subscription, paymentStatus)
            SubscriptionStatus.PREACTIVATED, SubscriptionStatus.PAUSED -> hideAlertCards()
            SubscriptionStatus.SUSPENDED -> bindSuspendedAlert(subscription)
            SubscriptionStatus.TERMINATED -> bindTerminatedAlert(subscription)
        }
    }

    /**
     * SUSPENDED = service already cut over a pending payment; paying restores it.
     * Shown unconditionally (not gated on paymentStatus): the service is down
     * regardless of what the payment credentials derive.
     */
    private fun bindSuspendedAlert(subscription: Subscription) {
        showAlertCard(
            subscription = subscription,
            style = AlertStyle.ERROR,
            titleRes = R.string.subscription_alert_subscription_status_suspended_title,
            subtitleRes = R.string.subscription_alert_subscription_status_suspended_subtitle,
            buttonMessageRes = R.string.subscription_alert_payment_button_pay_now
        )
    }

    private fun bindActiveSubscriptionAlert(subscription: Subscription, paymentStatus: PaymentStatus) {
        when (paymentStatus) {
            PaymentStatus.ACTIVE, PaymentStatus.UNKNOWN -> hideAlertCards()

            PaymentStatus.ACTIVATION_PERIOD -> {
                binding.subscriptionAlertCard.visibility = View.GONE
                binding.paymentActivationAlertCard.visibility = View.VISIBLE
            }

            PaymentStatus.CANCELED -> showAlertCard(
                subscription = subscription,
                style = AlertStyle.ERROR,
                titleRes = R.string.subscription_alert_payment_status_canceled_title,
                subtitleRes = R.string.subscription_alert_payment_status_canceled_subtitle,
                buttonMessageRes = R.string.subscription_alert_payment_button_restore
            )

            PaymentStatus.PENDING -> showAlertCard(
                subscription = subscription,
                style = AlertStyle.WARNING,
                titleRes = R.string.subscription_alert_payment_status_failed_title,
                subtitleRes = R.string.subscription_alert_payment_status_failed_subtitle,
                buttonMessageRes = R.string.subscription_alert_payment_button_pay_now
            )

            PaymentStatus.MISSING_INFORMATION -> showAlertCard(
                subscription = subscription,
                style = AlertStyle.ERROR,
                titleRes = R.string.subscription_alert_payment_status_missing_payment_information_title,
                subtitleRes = R.string.subscription_alert_payment_status_missing_payment_information_subtitle,
                buttonMessageRes = R.string.subscription_alert_payment_button_fix
            )
        }
    }

    private fun bindTerminatedAlert(subscription: Subscription) {
        val hasActiveSubscriptionWithSameIccId = simViewModel.subscriptionList.value?.any { otherSubscription ->
            otherSubscription.iccId == subscription.iccId &&
                    otherSubscription.getSubscriptionStatus() != SubscriptionStatus.TERMINATED
        } ?: false

        val terminationDate = subscription.terminatedAt?.let {
            DateFormat.getDateFormat(binding.root.context).format(it)
        } ?: DateFormat.getDateFormat(binding.root.context).format(Date())

        showAlertCard(
            subscription = subscription,
            style = AlertStyle.TERMINATED,
            titleRes = R.string.subscription_alert_subscription_status_terminated_title,
            subtitleRes = R.string.subscription_alert_subscription_status_terminated_subtitle,
            buttonMessageRes = R.string.subscription_alert_payment_button_reactivate,
            extraSubtitleArgument = terminationDate
        )

        // Override button visibility if there's already an active subscription with the same iccId
        if (hasActiveSubscriptionWithSameIccId) {
            binding.subscriptionAlertCardButton.visibility = View.INVISIBLE
            binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_status_terminated_iccid_used_subtitle)
        }
    }

    // -------------------------------------------------------------------------
    // Alert Card Helpers
    // -------------------------------------------------------------------------

    private fun showAlertCard(
        subscription: Subscription,
        style: AlertStyle,
        @StringRes titleRes: Int,
        @StringRes subtitleRes: Int,
        @StringRes buttonMessageRes: Int,
        extraSubtitleArgument: String? = null
    ) {
        binding.paymentActivationAlertCard.visibility = View.GONE
        binding.subscriptionAlertCard.visibility = View.VISIBLE
        binding.subscriptionAlertCardButton.visibility = View.VISIBLE

        // Card
        binding.subscriptionAlertCard.setCardBackgroundColor(getColor(style.backgroundColorRes))

        // Title
        binding.subscriptionAlertCardTitle.text = getString(titleRes)
        binding.subscriptionAlertCardTitle.setTextColor(getColor(style.textColorRes))

        // Subtitle
        if (extraSubtitleArgument != null) {
            binding.subscriptionAlertCardSubtitle.text = getString(subtitleRes, extraSubtitleArgument)
        } else {
            binding.subscriptionAlertCardSubtitle.text = getString(subtitleRes)
        }
        binding.subscriptionAlertCardSubtitle.setTextColor(getColor(style.textColorRes))

        // Icon
        binding.subscriptionAlertCardImage.imageTintList = ColorStateList.valueOf(getColor(style.iconTintRes))
        binding.subscriptionAlertCardImage.setImageResource(style.iconRes)

        // Button
        binding.subscriptionAlertCardButton.setBackgroundColor(getColor(style.buttonColorRes))
        binding.subscriptionAlertCardButton.text = getString(buttonMessageRes)

        setupAlertButtonClickListener(subscription)
    }

    private fun setupAlertButtonClickListener(subscription: Subscription) {
        val subscriptionStatus = subscription.getSubscriptionStatus()
        val paymentStatus = subscription.getPaymentStatus()

        binding.subscriptionAlertCardButton.setOnClickListener {
            when (subscriptionStatus) {
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PREACTIVATED,
                SubscriptionStatus.PAUSED -> {
                    when (paymentStatus) {
                        PaymentStatus.ACTIVE -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for ACTIVE status")
                        }
                        PaymentStatus.PENDING -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for PENDING status")
                            simViewModel.trackManageActionSelected("pending_payment", subscription)
                            simViewModel.getPendingPaymentUrl(subscription)
                        }
                        PaymentStatus.CANCELED -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for CANCELED status")
                            simViewModel.trackManageActionSelected("portal_restore", subscription)
                            simViewModel.getSubscriptionManagementPortalSession(subscription)
                        }
                        PaymentStatus.MISSING_INFORMATION -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for MISSING_INFORMATION status")
                            simViewModel.trackManageActionSelected("portal_fix_payment", subscription)
                            simViewModel.getSubscriptionManagementPortalSession(subscription)
                        }
                        PaymentStatus.ACTIVATION_PERIOD -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for ACTIVATION_PERIOD status")
                        }
                        PaymentStatus.UNKNOWN -> {
                            Timber.d("SubscriptionDetailFragment: Alert button clicked for UNKNOWN status")
                        }
                    }
                }
                SubscriptionStatus.SUSPENDED -> {
                    // Dedicated branch: the ACTIVE/PAUSED branch no-ops on
                    // ACTIVE/UNKNOWN payment statuses, which would leave a visible
                    // Pay Now button doing nothing if credentials are inconsistent.
                    if (paymentStatus == PaymentStatus.PENDING) {
                        Timber.d("SubscriptionDetailFragment: Alert button clicked for SUSPENDED status (pending payment)")
                        simViewModel.trackManageActionSelected("pending_payment", subscription)
                        simViewModel.getPendingPaymentUrl(subscription)
                    } else {
                        Timber.d("SubscriptionDetailFragment: Alert button clicked for SUSPENDED status (portal fallback)")
                        simViewModel.trackManageActionSelected("portal", subscription)
                        simViewModel.getSubscriptionManagementPortalSession(subscription)
                    }
                }
                SubscriptionStatus.TERMINATED -> {
                    Timber.d("SubscriptionDetailFragment: Alert button clicked for TERMINATED status - navigating to restore")
                    simViewModel.trackManageActionSelected("restore", subscription)
                    navigateById(R.id.action_subscriptionDetailFragment_to_subscriptionRestoreFragment)
                }
            }
        }
    }

    private fun hideAlertCards() {
        binding.subscriptionAlertCard.visibility = View.GONE
        binding.paymentActivationAlertCard.visibility = View.GONE
    }

    private fun getColor(@ColorRes colorRes: Int): Int {
        return ContextCompat.getColor(requireContext(), colorRes)
    }

    // -------------------------------------------------------------------------
    // Alert Styling
    // -------------------------------------------------------------------------

    /**
     * Defines the visual style for alert cards based on severity.
     * Mirrors [com.sosmartlabs.momo.sim.ui.adapter.SubscriptionListAdapter.SubscriptionViewHolder.AlertStyle].
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

    private fun hideManagerActions(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Checking if manager actions should be hidden")
        simViewModel.currentUser.value?.let { currentUser ->
            // `subscriber.user` is null for co-parents (owner's _User row is ACL-restricted).
            // Read the pointer null-safely; a null/unknown owner is treated as "not the
            // current user", so owner-only actions are correctly hidden rather than crashing.
            val ownerId = subscription.subscriber.getParseUser("user")?.objectId
            if (currentUser.objectId != ownerId) {
                Timber.d("SubscriptionDetailFragment: Hiding manager actions - current user is not subscription owner")
                binding.upgradePlanCard.visibility = View.GONE
                binding.manageSubscriptionCard.visibility = View.GONE
                binding.transferSubscriptionCard.visibility = View.GONE
                binding.cancelSubscriptionCard.visibility = View.GONE
            }
        }
    }

    private fun hideDefaultActions() {
        Timber.d("SubscriptionDetailFragment: Checking if default actions should be hidden")
        binding.upgradePlanCard.visibility = View.GONE
        binding.transferSubscriptionCard.visibility = View.GONE
        binding.cancelSubscriptionCard.visibility = View.GONE
    }

    private fun updateUpgradePlanCard(subscription: Subscription) {
        if (!simViewModel.isSubscriptionOwner(subscription)) {
            lastUpgradeAvailabilityKey = null
            binding.upgradePlanCard.visibility = View.GONE
            simViewModel.resetUpgradePlanAvailability()
            return
        }

        val availabilityKey = listOf(
            subscription.objectId.orEmpty(),
            subscription.plan.objectId.orEmpty(),
            subscription.paymentProvider.objectId.orEmpty(),
            subscription.sim.mnoProvider.objectId.orEmpty()
        ).joinToString("|")

        if (availabilityKey == lastUpgradeAvailabilityKey) {
            return
        }

        lastUpgradeAvailabilityKey = availabilityKey
        simViewModel.resetUpgradePlanAvailability()
        simViewModel.checkUpgradePlansAvailable(subscription)
    }

    private fun formatPrice(price: Float, currencyCode: String, currencySymbol: String): String {
        return try {
            val currency = Currency.getInstance(currencyCode)
            val numberFormat = NumberFormat.getCurrencyInstance().apply {
                this.currency = currency
                maximumFractionDigits = currency.defaultFractionDigits
            }
            numberFormat.format(price)
        } catch (e: Exception) {
            Timber.e("SubscriptionDetailFragment: Error formatting price - falling back to basic format")
            CrashlyticsLog.recordNonFatalError(e, "Error formatting price with currency code $currencyCode")
            "$price $currencySymbol"
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionDetailFragment: Navigating to destination $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    /**
     * When the user reached this screen via the upgrade-popup deep-link, scroll the
     * NestedScrollView once so the `upgrade_plan_card` is centered on screen.
     * The card itself is conditionally `VISIBLE` only after `hasAvailableUpgradePlans`
     * resolves to true, so we wait for both signals before scrolling.
     *
     * `card.top` only gives position relative to its immediate parent (the card is
     * nested inside multiple ConstraintLayouts), not relative to the NestedScrollView's
     * content. We use `getLocationOnScreen` to compute the card's offset from the
     * scroll container, then translate that into a target scrollY.
     */
    private fun scrollToUpgradeIfNeeded() {
        val scrollFlag = simViewModel.deepLinkScrollToUpgrade.value == true
        val cardVisible = binding.upgradePlanCard.visibility == View.VISIBLE
        if (!scrollFlag || !cardVisible || didScrollToUpgrade) return
        didScrollToUpgrade = true
        binding.subscriptionDetailScrollView.post {
            val card = binding.upgradePlanCard
            val scrollContainer = binding.subscriptionDetailScrollView

            val cardLoc = IntArray(2)
            val containerLoc = IntArray(2)
            card.getLocationOnScreen(cardLoc)
            scrollContainer.getLocationOnScreen(containerLoc)
            val cardYInViewport = cardLoc[1] - containerLoc[1]
            val centerOffset = ((scrollContainer.height - card.height) / 2).coerceAtLeast(0)
            val targetY = (scrollContainer.scrollY + cardYInViewport - centerOffset)
                .coerceAtLeast(0)

            scrollContainer.smoothScrollTo(0, targetY)
            simViewModel.consumeDeepLinkScrollToUpgrade()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("SubscriptionDetailFragment: onDestroyView")
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionDetailFragment: Disposing resources")
    }
}
