package com.sosmartlabs.momo.sim.ui.fragments.transfer

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
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.SubscriptionTransferListBinding
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.sim.ui.TransferSubscriptionViewModel
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.GradientBackground
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber
import java.text.NumberFormat
import java.util.Currency

class SubscriptionTransferListFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionTransferListBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_detail_transfer_title)

    /**
     * ViewModel
     */
    private val simViewModel: SimViewModel by activityViewModels()
    private val transferSubscriptionViewModel: TransferSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = SubscriptionTransferListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        observeViewModel()
        setupListeners()
        binding.transferToNewWatchCard.visibility = View.GONE
    }

    private fun setupToolbar() {
        Timber.d("setupToolbar")
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
    }

    private fun observeViewModel() {
        simViewModel.currentSubscription.observe(viewLifecycleOwner) {
            setSubscriptionPlanView(it)
        }
    }

    private fun setupListeners() {
        binding.transferToNewSimCard.setOnClickListener {
            simViewModel.trackManageActionSelected("transfer_to_sim")
            transferSubscriptionViewModel.startTransferAnalytics()
            navigateById(R.id.action_subscriptionDetailTransferListFragment_to_subscriptionTransferNewSimFragment)
        }

        binding.transferToNewWatchCard.setOnClickListener {
        }
    }

    private fun setSubscriptionPlanView(subscription: Subscription) {
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
