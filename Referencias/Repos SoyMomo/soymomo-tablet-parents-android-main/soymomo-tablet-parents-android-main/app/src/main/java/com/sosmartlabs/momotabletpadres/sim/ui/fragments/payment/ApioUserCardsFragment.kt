package com.sosmartlabs.momotabletpadres.sim.ui.fragments.payment

import android.annotation.SuppressLint
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionApioUserCardsFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.PaymentUserCard
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.adapter.ApioCardsAdapter
import com.sosmartlabs.momotabletpadres.utils.Resource
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.ui.DefaultIcons
import com.sosmartlabs.momotabletpadres.utils.ui.GradientBackground
import com.sosmartlabs.momotabletpadres.glide.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency

class ApioUserCardsFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionApioUserCardsFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_payment_apio_user_cards_title)

    /**
     * ApioCards List Adapter
     */
    private lateinit var apioCardsAdapter: ApioCardsAdapter

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("ApioUserCardsFragment: onCreate called")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("ApioUserCardsFragment: onCreateView called")
        binding = SubscriptionApioUserCardsFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("ApioUserCardsFragment: onViewCreated called")
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupListeners()
        observeViewModel()
        setupRecyclerView()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView
        )
    }

    private fun setupToolbar() {
        Timber.d("ApioUserCardsFragment: Setting up toolbar")
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

    private fun setupListeners() {
        Timber.d("ApioUserCardsFragment: Setting up listeners")
        binding.newApioCardSmall.setOnClickListener {
            Timber.d("ApioUserCardsFragment: newApioCardSmall clicked")
            when (activity) {
                is SimActivity -> {
                    Timber.d("ApioUserCardsFragment: Navigating to ApioWebViewFragment from SimActivity")
                    navigateById(R.id.action_add_sim_apioUserCardsFragment_to_apioWebViewFragment)
                }
                else -> {
                    Timber.e("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                    CrashlyticsLog.log("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                }
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("ApioUserCardsFragment: Setting up ViewModel observers")

        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) { subscriptionPlan ->
            Timber.d("ApioUserCardsFragment: Received currentSubscriptionPlan update")
            setSubscriptionPlanDataView(subscriptionPlan)
        }

        newSubscriptionViewModel.currentSubscriptionUserInfo.observe(viewLifecycleOwner) { subscriberUserInfo ->
            Timber.d("ApioUserCardsFragment: Received currentSubscriptionUserInfo update")
            newSubscriptionViewModel.createApioAuthBypass(subscriberUserInfo)
            newSubscriptionViewModel.getApioUserCards(subscriberUserInfo)
        }

        newSubscriptionViewModel.apioUserCards.observe(viewLifecycleOwner) {
            Timber.d("ApioUserCardsFragment: apioUserCards status: ${it.status}")
            when (it.status) {
                Resource.Status.LOADING -> {
                    Timber.d("ApioUserCardsFragment: Loading user cards")
                    binding.subscriptionPaymentApioUserCardsViewFlipper.displayedChild = 0
                }
                Resource.Status.LOAD_SUCCESS -> {
                    Timber.d("ApioUserCardsFragment: User cards loaded successfully")
                    binding.subscriptionPaymentApioUserCardsViewFlipper.displayedChild = 1
                    val apioCards = it.data
                    if (apioCards.isNullOrEmpty()) {
                        Timber.d("ApioUserCardsFragment: No user cards found, navigating to ApioWebViewFragment")
                        when (activity) {
                            is SimActivity -> {
                                navigateById(R.id.action_add_sim_apioUserCardsFragment_to_apioWebViewFragment)
                            }
                            else -> {
                                Timber.e("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                                CrashlyticsLog.log("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                            }
                        }
                    } else {
                        Timber.d("ApioUserCardsFragment: Submitting user cards list to adapter")
                        apioCardsAdapter.submitList(apioCards)
                    }
                }
                Resource.Status.LOAD_ERROR -> {
                    Timber.e("ApioUserCardsFragment: Error loading user cards, navigating to ApioWebViewFragment")
                    CrashlyticsLog.log("ApioUserCardsFragment: Error loading user cards, navigating to ApioWebViewFragment")
                    when (activity) {
                        is SimActivity -> {
                            navigateById(R.id.action_add_sim_apioUserCardsFragment_to_apioWebViewFragment)
                        }
                        else -> {
                            Timber.e("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                            CrashlyticsLog.log("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                        }
                    }
                }
                else -> {
                    Timber.d("ApioUserCardsFragment: apioUserCards status is not handled: ${it.status}")
                }
            }
        }
    }

    private fun setupRecyclerView() {
        Timber.d("ApioUserCardsFragment: Setting up RecyclerView and adapter")
        apioCardsAdapter = ApioCardsAdapter()
        apioCardsAdapter.listener = object : ApioCardsAdapter.Listener {
            override fun onApioCardClicked(apioCard: PaymentUserCard) {
                Timber.d("ApioUserCardsFragment: Apio card clicked: ${apioCard.objectId}")
                newSubscriptionViewModel.setCurrentApioCard(apioCard)
                when (activity) {
                    is SimActivity -> {
                        Timber.d("ApioUserCardsFragment: Navigating to ApioConfirmSubscriptionFragment from SimActivity")
                        navigateById(R.id.action_add_sim_apioUserCardsFragment_to_apioConfirmSubscriptionFragment)
                    }
                    else -> {
                        Timber.e("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                        CrashlyticsLog.log("ApioUserCardsFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                    }
                }
            }
        }
        with(binding.subscriptionPaymentApioUserCardsRecyclerView) {
            adapter = apioCardsAdapter
            layoutManager = LinearLayoutManager(requireContext())
        }
    }

    @SuppressLint("SetTextI18n")
    private fun setSubscriptionPlanDataView(subscriptionPlan: SubscriptionPlan) {
        Timber.d("ApioUserCardsFragment: Setting subscription plan data view for plan: ${subscriptionPlan.objectId}")
        with(subscriptionPlan) {
            binding.planInfo.let { planInfo ->
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

    private fun formatPrice(price: Float, currencyCode: String, currencySymbol: String): String {
        return try {
            val currency = Currency.getInstance(currencyCode)
            val numberFormat = NumberFormat.getCurrencyInstance().apply {
                this.currency = currency
                maximumFractionDigits = currency.defaultFractionDigits
            }
            numberFormat.format(price)
        } catch (e: Exception) {
            Timber.e(e, "ApioUserCardsFragment: Error formatting price")
            CrashlyticsLog.recordNonFatalError(e, "ApioUserCardsFragment: Error formatting price")
            "$price $currencySymbol"
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("ApioUserCardsFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("ApioUserCardsFragment: Navigating to destination ID: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("ApioUserCardsFragment: onDestroyView called")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("ApioUserCardsFragment: Disposing resources")
    }
}