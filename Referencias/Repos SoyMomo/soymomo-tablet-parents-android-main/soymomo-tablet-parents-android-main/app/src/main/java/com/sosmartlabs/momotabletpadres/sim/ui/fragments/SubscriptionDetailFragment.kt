package com.sosmartlabs.momotabletpadres.sim.ui.fragments

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.text.format.DateFormat
import android.util.Patterns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionDetailFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.model.PaymentStatus
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionStatus
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import com.sosmartlabs.momotabletpadres.utils.support.WhatsappSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.support.ZendeskSupportLauncher
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
import com.sosmartlabs.momotabletpadres.sim.ui.TransferSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency
import java.util.Date
import java.util.Locale

class SubscriptionDetailFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionDetailFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.add_device_button_soymomo_sim)

    /**
     * ViewModel
     */
    private val simViewModel: SimViewModel by activityViewModels()
    private val transferSubscriptionViewModel: TransferSubscriptionViewModel by activityViewModels()

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
        binding.cancelSubscriptionCard.visibility = View.GONE

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
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
        }
        Timber.d("SubscriptionDetailFragment: Toolbar setup complete")
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionDetailFragment: Setting up view model observers")
        simViewModel.currentSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("SubscriptionDetailFragment: Updating subscription views for subscription ${subscription.iccId}")
            try {
                setSubscriptionPlanView(subscription)
                setSubscriptionWatchView(subscription)
                setSubscriptionView(subscription)
                setUserManagerView(subscription)
                setAlertView(subscription)
                hideManagerActions(subscription)
                transferSubscriptionViewModel.setCurrentSubscription(subscription)
                Timber.d("SubscriptionDetailFragment: Successfully updated all subscription views")
            } catch (e: Exception) {
                Timber.e("SubscriptionDetailFragment: Error updating subscription views")
                CrashlyticsLog.recordNonFatalError(e, "Error updating subscription views for subscription ${subscription.iccId}")
            }
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
                        if (Patterns.WEB_URL.matcher(url).matches()) {
                            try {
                                val intent = Intent(Intent.ACTION_VIEW)
                                intent.data = Uri.parse(url)
                                startActivity(intent)
                                Timber.d("SubscriptionDetailFragment: Successfully launched portal URL")
                            } catch (e: Exception) {
                                Timber.e("SubscriptionDetailFragment: Error launching portal URL")
                                CrashlyticsLog.recordNonFatalError(e, "Error launching subscription portal URL: $url")
                            }
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
                    binding.manageSubscriptionCardArrow.visibility = View.VISIBLE
                    binding.manageSubscriptionCardProgress.visibility = View.INVISIBLE
                    simViewModel.setSubscriptionManagementPortalSessionDefault()
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
            val imei = simViewModel.currentSubscription.value?.imei ?: ""
            val tablet = simViewModel.tabletFullList.value?.find { it.imei == imei }
            val tabletModelName = tablet?.model?.name ?: "Unknown Model"
            val whatsappPresetText = simViewModel.currentSubscription.value?.let {
                val subscriptionIccId = it.iccId
                requireContext().getString(R.string.subscription_list_whatsapp_preset_text, subscriptionIccId, tabletModelName, imei)
            }
            WhatsappSupportLauncher.launchWhatsappSupportContact(requireContext(), whatsappPresetText)
        }

        binding.manageSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Manage subscription card clicked")
            simViewModel.currentSubscription.value?.let { subscription ->
                if (subscription.plan.paymentProvider.name == "Apio") {
                    Timber.d("SubscriptionDetailFragment: Apio payment provider - redirecting to support")
                    binding.contactUsCard.performClick()
                } else {
                    Timber.d("SubscriptionDetailFragment: Getting subscription management portal session")
                    simViewModel.getSubscriptionManagementPortalSession(subscription)
                }
            }
        }

        binding.transferSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Transfer subscription card clicked - navigating to transfer list")
        }

        binding.cancelSubscriptionCard.setOnClickListener {
            Timber.d("SubscriptionDetailFragment: Cancel subscription card clicked - launching WhatsApp support")
            val imei = simViewModel.currentSubscription.value?.imei ?: ""
            val tablet = simViewModel.tabletFullList.value?.find { it.imei == imei }
            val tabletModelName = tablet?.model?.name ?: "Unknown Model"
            val whatsappPresetText = simViewModel.currentSubscription.value?.let {
                val subscriptionIccId = it.iccId
                requireContext().getString(R.string.subscription_list_whatsapp_preset_text, subscriptionIccId, tabletModelName, imei)
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
        Timber.d("SubscriptionDetailFragment: Setting subscription watch view for tablet with IMEI ${subscription.imei}")
        val tablet = simViewModel.tabletFullList.value?.find { it.imei == subscription.imei }
        binding.watchName.text = tablet?.profileName ?: ""
        binding.watchModel.text = getTabletModelName(tablet)
        binding.watchImei.text = tablet?.imei ?: ""
        binding.watchPhone.text = tablet?.phone ?: ""
        tablet?.profilePicture?.let {
            binding.watchProfilePicture.loadImage(it.url, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        } ?: run {
            binding.watchProfilePicture.loadImage(DefaultIcons.PROFILE_MOMO_SPACE, fallback = DefaultIcons.PROFILE_MOMO_SPACE)
        }
    }

    private fun getTabletModelName(tablet: Tablet?): String {
        return when (tablet?.model) {
            TabletModel.LITE -> requireContext().getString(R.string.lite_model_name)
            TabletModel.LITE_2 -> requireContext().getString(R.string.lite_2_model_name)
            TabletModel.LITE_3 -> requireContext().getString(R.string.lite_3_model_name)
            TabletModel.PRO-> requireContext().getString(R.string.pro_model_name)
            TabletModel.PRO_EU -> requireContext().getString(R.string.pro_model_name)
            TabletModel.PRO_2 -> requireContext().getString(R.string.pro_2_model_name)
            TabletModel.UNO -> requireContext().getString(R.string.uno_model_name)
            TabletModel.PHONE_1 -> requireContext().getString(R.string.momophone_1_model_name)
            null -> requireContext().getString(R.string.unknown_model_name)
            else -> requireContext().getString(R.string.unknown_model_name)
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
        val user = subscription.subscriber.user
        if (user == null) {
            Timber.w("SubscriptionDetailFragment: User in subscription is null. Can't display manager view")
            CrashlyticsLog.log("Null user in subscription ${subscription.iccId}")
            binding.managedByPicture.loadImage(null, fallback = DefaultIcons.PROFILE_PLACEHOLDER)
            binding.managedByName.text = ""
            binding.managedByEmail.text = ""
            return
        }

        try {
            // Load profile picture
            binding.managedByPicture.loadImage(
                user.getParseFile("image")?.url,
                fallback = DefaultIcons.PROFILE_PLACEHOLDER
            )

            // Set name and email
            val firstName = user.getString("firstName") ?: ""
            val lastName = user.getString("lastName") ?: ""
            binding.managedByName.text = "$firstName $lastName"
            binding.managedByEmail.text = user.email ?: ""
        } catch (e: Exception) {
            Timber.e("SubscriptionDetailFragment: Error setting user manager view")
            CrashlyticsLog.recordNonFatalError(e, "Error setting user manager view for subscription ${subscription.iccId}")
        }
    }

    private fun setAlertView(subscription: Subscription) {
        val subscriptionStatus = subscription.getSubscriptionStatus()
        val paymentStatus = subscription.getPaymentStatus()
        Timber.d("SubscriptionDetailFragment: Setting alert view subscription status: $subscriptionStatus and payment status: $paymentStatus for subscription ${subscription.objectId}")
        CrashlyticsLog.log("SubscriptionDetailFragment: Subscription ${subscription.objectId} subscription status: $subscriptionStatus, payment status: $paymentStatus")

        when (subscriptionStatus) {
            SubscriptionStatus.ACTIVE -> {
                when (paymentStatus) {
                    PaymentStatus.ACTIVE, PaymentStatus.UNKNOWN -> {
                        binding.subscriptionAlertCard.visibility = View.GONE
                        binding.subscriptionAlertCardButton.visibility = View.GONE
                        binding.subscriptionAlertCard.setOnClickListener(null)
                        binding.paymentActivationAlertCard.visibility = View.GONE
                    }
                    PaymentStatus.CANCELED -> {
                        binding.subscriptionAlertCard.visibility = View.VISIBLE
                        binding.subscriptionAlertCardButton.visibility = View.GONE
                        binding.subscriptionAlertCard.setOnClickListener(null)
                        binding.subscriptionAlertCardImage.setImageResource(R.drawable.ic_sim_subscription_status_canceled)
                        binding.subscriptionAlertCardTitle.text = getString(R.string.subscription_details_status_terminated_title)
                        binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_status_terminated_subtitle)
                        binding.paymentActivationAlertCard.visibility = View.GONE
                    }
                    PaymentStatus.PENDING -> {
                        binding.subscriptionAlertCard.visibility = View.VISIBLE
                        binding.subscriptionAlertCardButton.visibility = View.GONE
                        binding.subscriptionAlertCard.setOnClickListener {
                            simViewModel.getSubscriptionManagementPortalSession(subscription)
                        }
                        binding.subscriptionAlertCardImage.setImageResource(R.drawable.ic_sim_subscription_status_pending_payment)
                        binding.subscriptionAlertCardTitle.text = getString(R.string.subscription_details_payment_status_missing_payment_title)
                        binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_payment_status_missing_payment_subtitle)
                        binding.paymentActivationAlertCard.visibility = View.GONE
                    }
                    PaymentStatus.MISSING_INFORMATION -> {
                        binding.subscriptionAlertCard.visibility = View.VISIBLE
                        binding.subscriptionAlertCardButton.visibility = View.GONE
                        binding.subscriptionAlertCard.setOnClickListener {
                            simViewModel.getSubscriptionManagementPortalSession(subscription)
                        }
                        binding.subscriptionAlertCardImage.setImageResource(R.drawable.ic_sim_subscription_status_payment_missing_info)
                        binding.subscriptionAlertCardTitle.text = getString(R.string.subscription_details_payment_status_missing_payment_information_title)
                        binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_payment_status_missing_payment_information_subtitle)
                        binding.paymentActivationAlertCard.visibility = View.GONE
                    }

                    PaymentStatus.ACTIVATION_PERIOD -> {
                        binding.subscriptionAlertCard.visibility = View.GONE
                        binding.paymentActivationAlertCard.visibility = View.VISIBLE
                    }
                }
            }
            SubscriptionStatus.PREACTIVATED, SubscriptionStatus.PAUSED -> {
                binding.subscriptionAlertCard.visibility = View.GONE
                binding.subscriptionAlertCardButton.visibility = View.GONE
                binding.subscriptionAlertCard.setOnClickListener(null)
                binding.paymentActivationAlertCard.visibility = View.GONE
            }
            SubscriptionStatus.TERMINATED -> {
                // Check if there are other active subscriptions with the same iccId
                val hasActiveSubscriptionWithSameIccId = simViewModel.subscriptionList.value?.any { otherSubscription ->
                    otherSubscription.iccId == subscription.iccId && 
                    otherSubscription.getSubscriptionStatus() != SubscriptionStatus.TERMINATED
                } ?: false

                binding.subscriptionAlertCard.visibility = View.VISIBLE
                binding.subscriptionAlertCard.setOnClickListener(null)
                binding.subscriptionAlertCardImage.setImageResource(R.drawable.ic_sim_subscription_status_canceled)
                val terminationDate = subscription.terminatedAt?.let {
                    DateFormat.getDateFormat(binding.root.context).format(it)
                } ?: DateFormat.getDateFormat(binding.root.context).format(Date())
                binding.subscriptionAlertCardTitle.text = binding.root.context.getString(
                    R.string.subscription_details_status_terminated_title,
                    terminationDate
                )

                binding.subscriptionAlertCardArrow.visibility = View.GONE

                if (hasActiveSubscriptionWithSameIccId) {
                    binding.subscriptionAlertCardButton.visibility = View.GONE
                    binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_status_terminated_iccid_used_subtitle)
                } else {
                    binding.subscriptionAlertCardButton.visibility = View.VISIBLE
                    binding.subscriptionAlertCardButton.setOnClickListener {
                        navigateById(R.id.action_subscriptionDetailFragment_to_subscriptionRestoreFragment)
                    }
                    binding.subscriptionAlertCardSubtitle.text = getString(R.string.subscription_details_status_terminated_subtitle)
                }

                binding.paymentActivationAlertCard.visibility = View.GONE
            }
        }
    }

    private fun hideManagerActions(subscription: Subscription) {
        Timber.d("SubscriptionDetailFragment: Checking if manager actions should be hidden")
        simViewModel.currentUser.value?.let { currentUser ->
            with(subscription.subscriber) {
                if (currentUser.objectId != user.objectId) {
                    Timber.d("SubscriptionDetailFragment: Hiding manager actions - current user is not subscription owner")
                    binding.manageSubscriptionCard.visibility = View.GONE
                    binding.transferSubscriptionCard.visibility = View.GONE
                    binding.cancelSubscriptionCard.visibility = View.GONE
                }
            }
        }
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
        findNavController().navigate(navId, bundle)
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