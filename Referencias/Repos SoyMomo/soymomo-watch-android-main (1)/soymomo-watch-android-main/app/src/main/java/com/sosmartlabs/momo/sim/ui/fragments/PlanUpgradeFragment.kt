package com.sosmartlabs.momo.sim.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.FragmentPlanUpgradeBinding
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.sim.ui.PlanUpgradeViewModel
import com.sosmartlabs.momo.sim.ui.SimViewModel
import com.sosmartlabs.momo.sim.ui.adapter.PlanUpgradeAdapter
import com.sosmartlabs.momo.sim.ui.dialogs.PlanUpgradeConfirmationDialogFragment
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class PlanUpgradeFragment : Fragment() {

    private lateinit var binding: FragmentPlanUpgradeBinding

    private val simViewModel: SimViewModel by activityViewModels()
    private val planUpgradeViewModel: PlanUpgradeViewModel by viewModels()

    private val planUpgradeAdapter by lazy {
        PlanUpgradeAdapter(
            listener = object : PlanUpgradeAdapter.Listener {
                override fun onPlanClicked(plan: com.sosmartlabs.momo.sim.model.SubscriptionPlan) {
                    planUpgradeViewModel.presentConfirmation(plan)
                }
            }
        )
    }

    private var currentSubscriptionId: String? = null

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.subscription_plan_upgrade_title)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentPlanUpgradeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        setupRecyclerView()
        setupListeners()
        observeViewModels()
    }

    private fun setupToolbar() {
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
            toolbar.setNavigationOnClickListener {
                findNavController().navigateUp()
            }
        }
    }

    private fun setupRecyclerView() {
        binding.planUpgradeRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = planUpgradeAdapter
            isNestedScrollingEnabled = false
        }
    }

    private fun setupListeners() {
        binding.buttonRetry.setOnClickListener {
            planUpgradeViewModel.fetchUpgradePlans()
        }

        childFragmentManager.setFragmentResultListener(
            PlanUpgradeConfirmationDialogFragment.REQUEST_KEY,
            viewLifecycleOwner
        ) { _, bundle ->
            when (bundle.getString(PlanUpgradeConfirmationDialogFragment.KEY_ACTION)) {
                PlanUpgradeConfirmationDialogFragment.ACTION_CONFIRM -> {
                    planUpgradeViewModel.confirmUpgrade()
                }

                else -> {
                    planUpgradeViewModel.dismissConfirmation()
                }
            }
        }
    }

    private fun observeViewModels() {
        simViewModel.currentSubscription.observe(viewLifecycleOwner) { subscription ->
            bindSubscription(subscription)
        }

        planUpgradeViewModel.isLoading.observe(viewLifecycleOwner) {
            renderUiState()
        }

        planUpgradeViewModel.errorMessage.observe(viewLifecycleOwner) {
            renderUiState()
        }

        planUpgradeViewModel.confirmErrorMessage.observe(viewLifecycleOwner) { msg ->
            if (msg.isNullOrBlank()) return@observe
            Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
            planUpgradeViewModel.consumeConfirmError()
        }

        planUpgradeViewModel.upgradeSuccessMessage.observe(viewLifecycleOwner) { message ->
            if (message.isNullOrBlank()) return@observe
            val dialogTag = PlanUpgradeConfirmationDialogFragment::class.java.simpleName
            (childFragmentManager.findFragmentByTag(dialogTag) as? PlanUpgradeConfirmationDialogFragment)
                ?.dismissAllowingStateLoss()
            Toast.makeText(
                requireContext(),
                getString(R.string.subscription_plan_upgrade_success_message),
                Toast.LENGTH_LONG
            ).show()
            planUpgradeViewModel.consumeUpgradeSuccess()
            simViewModel.refreshSubscriptions()
            findNavController().navigateUp()
        }

        planUpgradeViewModel.upgradePlans.observe(viewLifecycleOwner) { plans ->
            planUpgradeAdapter.submitList(plans)
            renderUiState()
        }

        planUpgradeViewModel.selectedPlanForConfirmation.observe(viewLifecycleOwner) { plan ->
            if (plan == null) {
                return@observe
            }

            val dialogTag = PlanUpgradeConfirmationDialogFragment::class.java.simpleName
            if (childFragmentManager.findFragmentByTag(dialogTag) != null) {
                return@observe
            }

            PlanUpgradeConfirmationDialogFragment.newInstance(
                title = plan.title,
                price = plan.price,
                currencyCode = plan.currencyCode,
                currencySymbol = plan.currency,
                logoUrl = plan.logo?.url,
                backgroundImageColors = plan.backgroundImageColors
            ).show(childFragmentManager, dialogTag)
        }
    }

    private fun bindSubscription(subscription: Subscription) {
        if (currentSubscriptionId == subscription.objectId) {
            return
        }

        currentSubscriptionId = subscription.objectId
        planUpgradeViewModel.setSubscription(subscription)
        planUpgradeViewModel.dismissConfirmation()
        planUpgradeViewModel.fetchUpgradePlans()
    }

    private fun renderUiState() {
        val isLoading = planUpgradeViewModel.isLoading.value == true
        val errorMessage = planUpgradeViewModel.errorMessage.value
        val hasError = !errorMessage.isNullOrBlank()
        val plans = planUpgradeViewModel.upgradePlans.value.orEmpty()
        val hasContent = plans.isNotEmpty()
        val showEmpty = !isLoading && !hasError && !hasContent

        binding.loadingIndicator.visibility = if (isLoading) View.VISIBLE else View.GONE
        binding.errorState.visibility = if (hasError && !isLoading) View.VISIBLE else View.GONE
        binding.emptyState.visibility = if (showEmpty) View.VISIBLE else View.GONE
        binding.planUpgradeRecyclerView.visibility =
            if (hasContent && !hasError && !isLoading) View.VISIBLE else View.GONE
        binding.errorMessage.text = errorMessage.orEmpty()
    }
}
