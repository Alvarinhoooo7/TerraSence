package com.sosmartlabs.momo.sim.ui.fragments.payment

import android.annotation.SuppressLint
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.AddFirstMomoActivity
import com.sosmartlabs.momo.databinding.SubscriptionApioConfirmSubscriptionFragmentBinding
import com.sosmartlabs.momo.linkwatch.LinkWatchActivity
import com.sosmartlabs.momo.sim.SimActivity
import com.sosmartlabs.momo.sim.analytics.SimAnalytics
import com.sosmartlabs.momo.sim.model.PaymentUserCard
import com.sosmartlabs.momo.sim.model.SubscriptionPlan
import com.sosmartlabs.momo.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency

class ApioConfirmSubscriptionFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionApioConfirmSubscriptionFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_payment_apio_confirm_title)

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionApioConfirmSubscriptionFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.buttonConfirmSubscription.setOnClickListener {
            newSubscriptionViewModel.trackSimPaymentResult(
                result = SimAnalytics.Result.SUCCESS,
                paymentPath = SimAnalytics.PaymentPath.APIO_SAVED_CARD,
            )
            when (activity) {
                is SimActivity -> {
                    navigateById(R.id.action_add_sim_apioConfirmSubscriptionFragment_to_newSubscriptionPaymentSuccess)
                }

                is AddFirstMomoActivity -> {
                    navigateById(R.id.action_add_momo_apioConfirmSubscriptionFragment_to_newSubscriptionPaymentSuccess)
                }

                is LinkWatchActivity -> {
                    navigateById(R.id.action_add_sim_apioConfirmSubscriptionFragment_to_newSubscriptionPaymentSuccess)
                }
            }
        }
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) {
            Timber.d("currentSubscriptionPlan updated")
            setSubscriptionPlanDataView(it)
        }

        newSubscriptionViewModel.currentApioCard.observe(viewLifecycleOwner) {
            Timber.d("currentApioCard updated")
            setApioCardDataView(it)
        }
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                if (activity is SimActivity) {
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
            window.statusBarColor = ContextCompat.getColor(requireContext(), R.color.background_sim_step_card_title)
            window.navigationBarColor = ContextCompat.getColor(requireContext(), R.color.white)
        }
    }

    @SuppressLint("SetTextI18n")
    private fun setSubscriptionPlanDataView(subscriptionPlan: SubscriptionPlan) {
        with(subscriptionPlan) {
            binding.planInfo.let {planInfo ->
                logo?.let {
                    planInfo.planLogo.loadImage(it.url, fallback = DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                } ?: planInfo.planLogo.setImageResource(DefaultIcons.SIM_SUBSCRIPTION_PLAN)
                planInfo.planTitle.text = title
                val displayPrice = if (newSubscriptionViewModel.hasSimDiscount.value == true) {
                    newSubscriptionViewModel.discountedPrice(price)
                } else {
                    price
                }
                planInfo.planPrice.text = formatPrice(displayPrice, currencyCode, currency)
                planInfo.planBillingPeriod.text = "/${billingPeriod}"
                val gradient = GradientBackground.createGradient(
                    backgroundImageColors,
                    GradientDrawable.Orientation.RIGHT_LEFT
                )
                planInfo.planCard.background = gradient
            }
        }
    }

    private fun setApioCardDataView(apioCard: PaymentUserCard) {
        with(apioCard) {
            binding.apioCardInfo.let {apioCardInfo ->
                apioCardInfo.apioCardDigits.text = digits
                apioCardInfo.apioCardUsername.text = username
                apioCardInfo.apioCardType.text = type
                when(brand.lowercase()) {
                    "amex" -> {
                        val color = ContextCompat.getColor(requireContext(), R.color.bank_card_bg_amex)
                        apioCardInfo.apioCard.setCardBackgroundColor(color)
                        Glide.with(requireContext())
                            .load(R.drawable.bank_card_amex)
                            .fitCenter()
                            .into(apioCardInfo.apioCardLogo)
                    }
                    "visa" -> {
                        val color = ContextCompat.getColor(requireContext(), R.color.bank_card_bg_visa)
                        apioCardInfo.apioCard.setCardBackgroundColor(color)
                        Glide.with(requireContext())
                            .load(R.drawable.bank_card_visa)
                            .fitCenter()
                            .into(apioCardInfo.apioCardLogo)
                    }
                    "mastercard" -> {
                        val color = ContextCompat.getColor(requireContext(), R.color.bank_card_bg_mastercard)
                        apioCardInfo.apioCard.setCardBackgroundColor(color)
                        Glide.with(requireContext())
                            .load(R.drawable.bank_card_mastercard)
                            .fitCenter()
                            .into(apioCardInfo.apioCardLogo)
                    }
                    "redcompra", "prepaid" -> {
                        val color = ContextCompat.getColor(requireContext(), R.color.bank_card_bg_redcompra)
                        apioCardInfo.apioCard.setCardBackgroundColor(color)
                        Glide.with(requireContext())
                            .load(R.drawable.bank_card_redcompra)
                            .fitCenter()
                            .into(apioCardInfo.apioCardLogo)
                    }
                    else -> {
                        val color = ContextCompat.getColor(requireContext(), R.color.bank_card_bg_visa)
                        apioCardInfo.apioCard.setCardBackgroundColor(color)
                        Glide.with(requireContext())
                            .load(R.drawable.bank_card_visa)
                            .fitCenter()
                            .into(apioCardInfo.apioCardLogo)
                    }
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
        } catch (_: Exception) {
            "$price $currencySymbol"
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}
