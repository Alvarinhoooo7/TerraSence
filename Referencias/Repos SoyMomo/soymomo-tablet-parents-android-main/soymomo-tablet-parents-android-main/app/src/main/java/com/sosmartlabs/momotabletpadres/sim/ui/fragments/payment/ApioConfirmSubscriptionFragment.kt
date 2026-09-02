package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

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
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionApioConfirmSubscriptionFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
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

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.buttonConfirmSubscription,
            bottomAsMargin = true
        )
    }

    private fun setupListeners() {
        binding.buttonConfirmSubscription.setOnClickListener {
            when (activity) {
                is SimActivity -> {
                    navigateById(R.id.action_add_sim_apioConfirmSubscriptionFragment_to_newSubscriptionPaymentSuccess)
                }
            }
        }
    }

    private fun observeViewModel() {
        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) {
            Timber.d("currentSubscriptionPlan $it")
            setSubscriptionPlanDataView(it)
        }

        newSubscriptionViewModel.currentApioCard.observe(viewLifecycleOwner) {
            Timber.d("currentApioCard $it")
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
                planInfo.planPrice.text = formatPrice(price, currencyCode, currency)
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
        } catch (e: Exception) {
            "$price $currencySymbol"
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {

    }
}