package com.sosmartlabs.momotabletpadres.sim.ui.fragments.newsubscription

import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.CompositePageTransformer
import androidx.viewpager2.widget.MarginPageTransformer
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionNewChoosePlanFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.SimActivity
import com.sosmartlabs.momotabletpadres.sim.model.BillingPeriod
import com.sosmartlabs.momotabletpadres.sim.model.SubscriptionPlan
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.adapter.ChoosePlanAdapter
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.firebase.FirebaseRemoteConfigRepository
import timber.log.Timber
import kotlin.math.abs

class NewSubscriptionChoosePlanFragment : Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: SubscriptionNewChoosePlanFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar

    private val toolbarTitle: String get() = getString(R.string.subscription_new_choose_plan_title)

    /**
     * ChooseWearer Adapter
     */
    private lateinit var choosePlanAdapter: ChoosePlanAdapter

    /**
     * ViewModel
     */
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("NewSubscriptionChoosePlanFragment: onCreateView")
        CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: onCreateView")
        binding = SubscriptionNewChoosePlanFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("NewSubscriptionChoosePlanFragment: onViewCreated")
        super.onViewCreated(view, savedInstanceState)
        setupToolbar()
        observeFirebaseRemoteConfig()
        setupRecyclerView()
        configureViewPager()
        observeViewModel()
        setupListeners()
        setupSecretGestures()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.hintLayout,
            bottomAsMargin = true
        )
    }

    private fun setupToolbar() {
        Timber.d("NewSubscriptionChoosePlanFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                if (activity is SimActivity) {
                    Timber.d("NewSubscriptionChoosePlanFragment: Configuring toolbar for SimActivity")
                    setDisplayShowTitleEnabled(true)
                    setDisplayHomeAsUpEnabled(true)
                    setDisplayShowHomeEnabled(true)
                }
            }
        }
    }

    private fun setupListeners() {
        Timber.d("NewSubscriptionChoosePlanFragment: Setting up listeners")
        
        binding.choosePlanViewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                Timber.d("NewSubscriptionChoosePlanFragment: ViewPager page selected: $position")
                newSubscriptionViewModel.setCurrentSubscriptionPlan(position)
                when (position) {
                    0 -> {
                        Timber.d("NewSubscriptionChoosePlanFragment: First page selected, hiding backward arrow")
                        binding.arrowViewPagerBackward.visibility = View.GONE
                        binding.arrowViewPagerForward.visibility = View.VISIBLE
                    }
                    choosePlanAdapter.itemCount - 1 -> {
                        Timber.d("NewSubscriptionChoosePlanFragment: Last page selected, hiding forward arrow")
                        binding.arrowViewPagerBackward.visibility = View.VISIBLE
                        binding.arrowViewPagerForward.visibility = View.GONE
                    }
                    else -> {
                        Timber.d("NewSubscriptionChoosePlanFragment: Middle page selected, showing both arrows")
                        binding.arrowViewPagerBackward.visibility = View.VISIBLE
                        binding.arrowViewPagerForward.visibility = View.VISIBLE
                    }
                }
                super.onPageSelected(position)
            }
        })

        binding.arrowViewPagerBackward.setOnClickListener {
            Timber.d("NewSubscriptionChoosePlanFragment: Backward arrow clicked")
            binding.choosePlanViewPager.currentItem -= 1
        }

        binding.arrowViewPagerForward.setOnClickListener {
            Timber.d("NewSubscriptionChoosePlanFragment: Forward arrow clicked")
            binding.choosePlanViewPager.currentItem += 1
        }

        binding.choosePlanButtonNext.setOnClickListener {
            Timber.d("NewSubscriptionChoosePlanFragment: Next button clicked")
            CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Next button clicked")
            
            val currentPlan = newSubscriptionViewModel.currentSubscriptionPlan.value
            if (currentPlan != null) {
                Timber.d("NewSubscriptionChoosePlanFragment: Navigating with plan: ${currentPlan.title}")
                CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Navigating with plan: ${currentPlan.title}")
                
                when (activity) {
                    is SimActivity -> {
                        Timber.d("NewSubscriptionChoosePlanFragment: Navigating from SimActivity")
                        navigateById(R.id.action_add_sim_newSubscriptionChoosePlanFragment_to_newSubscriptionForm)
                    }
                    else -> {
                        Timber.e("NewSubscriptionChoosePlanFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                        CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Unknown activity type: ${activity?.javaClass?.simpleName}")
                    }
                }
            } else {
                Timber.e("NewSubscriptionChoosePlanFragment: Current subscription plan is null")
                CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Current subscription plan is null")
            }
        }

        binding.billingPeriodToggle.addOnButtonCheckedListener { _, checkedId, isChecked ->
            when (checkedId) {
                binding.billingPeriodMonthButton.id -> {
                    if (isChecked) {
                        Timber.d("NewSubscriptionChoosePlanFragment: Monthly billing period selected")
                        CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Monthly billing period selected")
                        newSubscriptionViewModel.setCurrentBillingPeriod(BillingPeriod.MONTHLY)
                    }
                }
                binding.billingPeriodYearButton.id -> {
                    if (isChecked) {
                        Timber.d("NewSubscriptionChoosePlanFragment: Yearly billing period selected")
                        CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Yearly billing period selected")
                        newSubscriptionViewModel.setCurrentBillingPeriod(BillingPeriod.YEARLY)
                    }
                }
            }
        }
    }

    private fun configureViewPager() {
        Timber.d("NewSubscriptionChoosePlanFragment: Configuring ViewPager")
        val compositePageTransformer = CompositePageTransformer()
        compositePageTransformer.addTransformer(MarginPageTransformer(80))
        compositePageTransformer.addTransformer { page, position ->
            page.scaleY = 0.85f + (0.15f * (1 - abs(position)))
        }
        with(binding.choosePlanViewPager) {
            clipToPadding = false
            clipChildren = false
            offscreenPageLimit = 3
            getChildAt(0).overScrollMode = RecyclerView.OVER_SCROLL_NEVER
            setPageTransformer(compositePageTransformer)
        }
    }

    private fun setupRecyclerView() {
        Timber.d("NewSubscriptionChoosePlanFragment: Setting up RecyclerView")
        choosePlanAdapter = ChoosePlanAdapter()
        choosePlanAdapter.listener = object : ChoosePlanAdapter.Listener {
            override fun onSubscriptionClicked(subscription: SubscriptionPlan) {
                Timber.d("NewSubscriptionChoosePlanFragment: Subscription clicked: ${subscription.title}")
                CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Subscription clicked: ${subscription.title}")
            }
        }
        with(binding.choosePlanViewPager) {
            adapter = choosePlanAdapter
        }
    }

    private fun observeViewModel() {
        Timber.d("NewSubscriptionChoosePlanFragment: Setting up ViewModel observers")
        
        newSubscriptionViewModel.subscriptionPlanMnoProviderList.observe(viewLifecycleOwner) { plans ->
            Timber.d("NewSubscriptionChoosePlanFragment: Received subscription plans list with ${plans?.size ?: 0} items")
            val currentBillingPeriod = newSubscriptionViewModel.currentBillingPeriodSelected.value ?: BillingPeriod.MONTHLY
            Timber.d("NewSubscriptionChoosePlanFragment: Current billing period: $currentBillingPeriod")
            
            val subscriptionPlans = when(currentBillingPeriod) {
                BillingPeriod.MONTHLY -> newSubscriptionViewModel.subscriptionPlanMnoProviderListByMonth.value
                BillingPeriod.YEARLY -> newSubscriptionViewModel.subscriptionPlanMnoProviderListByYear.value
            }
            Timber.d("NewSubscriptionChoosePlanFragment: Filtered subscription plans: ${subscriptionPlans?.size ?: 0} items")
            choosePlanAdapter.submitList(subscriptionPlans)
        }

        newSubscriptionViewModel.currentBillingPeriodSelected.observe(viewLifecycleOwner) { billingPeriod ->
            Timber.d("NewSubscriptionChoosePlanFragment: Current billing period changed to $billingPeriod")
            
            val subscriptionPlans = when(billingPeriod) {
                BillingPeriod.MONTHLY -> newSubscriptionViewModel.subscriptionPlanMnoProviderListByMonth.value
                BillingPeriod.YEARLY -> newSubscriptionViewModel.subscriptionPlanMnoProviderListByYear.value
                else -> newSubscriptionViewModel.subscriptionPlanMnoProviderListByMonth.value // Defaults to monthly
            }
            Timber.d("NewSubscriptionChoosePlanFragment: Updating subscription plans list with ${subscriptionPlans?.size ?: 0} items")
            choosePlanAdapter.submitList(subscriptionPlans)
            
            val previousViewPagerPosition = binding.choosePlanViewPager.currentItem
            Timber.d("NewSubscriptionChoosePlanFragment: Maintaining ViewPager position at $previousViewPagerPosition")
            binding.choosePlanViewPager.currentItem = previousViewPagerPosition
            newSubscriptionViewModel.setCurrentSubscriptionPlan(previousViewPagerPosition)
        }

        newSubscriptionViewModel.currentSubscriptionPlan.observe(viewLifecycleOwner) { plan ->
            Timber.d("NewSubscriptionChoosePlanFragment: Current subscription plan updated: ${plan.title}")
            binding.choosePlanButtonNext.text = getString(R.string.subscription_new_choose_plan_button_choose, plan.title, plan.billingPeriod)
        }

        newSubscriptionViewModel.qaModeEnabled.observe(viewLifecycleOwner) { isQaEnabled ->
            Timber.d("NewSubscriptionChoosePlanFragment: QA mode enabled: $isQaEnabled")
        }
    }

    private fun observeFirebaseRemoteConfig() {
        Timber.d("NewSubscriptionChoosePlanFragment: Observing Firebase Remote Config")
        val simDiscountLabel = FirebaseRemoteConfigRepository.simDiscountLabel.toInt()
        Timber.d("NewSubscriptionChoosePlanFragment: SIM discount label value: $simDiscountLabel")
        
        if (simDiscountLabel == 0) {
            Timber.d("NewSubscriptionChoosePlanFragment: No discount to display")
            binding.billingDiscountLabel.text = String()
        } else {
            Timber.d("NewSubscriptionChoosePlanFragment: Setting discount label: $simDiscountLabel%")
            binding.billingDiscountLabel.text = getString(R.string.subscription_new_choose_plan_discount_placeholder, simDiscountLabel.toString())
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("NewSubscriptionChoosePlanFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("NewSubscriptionChoosePlanFragment: Navigating to destination ID: $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        Timber.d("NewSubscriptionChoosePlanFragment: onDestroyView")
        super.onDestroyView()
        dispose()
    }

    private fun dispose() {
        Timber.d("NewSubscriptionChoosePlanFragment: Disposing resources")
        newSubscriptionViewModel.setCurrentBillingPeriod(BillingPeriod.MONTHLY)
    }

    /**
     * Sets up secret gestures to enable QA mode
     */
    private fun setupSecretGestures() {
        Timber.d("NewSubscriptionChoosePlanFragment: Setting up secret gestures")
        
        binding.headerImage.setOnLongClickListener {
            Timber.d("NewSubscriptionChoosePlanFragment: Toolbar long press detected")
            CrashlyticsLog.log("QA mode secret gesture detected")
            showQaPinDialog()
            true // consume the event
        }
    }

    /**
     * Shows a dialog to enter the QA mode PIN
     */
    private fun showQaPinDialog() {
        Timber.d("NewSubscriptionChoosePlanFragment: Showing QA PIN dialog")
        
        val input = EditText(requireContext()).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            filters = arrayOf(InputFilter.LengthFilter(4))
        }
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Enter the code")
            .setView(input)
            .setPositiveButton("OK") { dialog, _ ->
                val enteredPin = input.text.toString()
                val expectedPin = newSubscriptionViewModel.getQaAccessPin()
                
                Timber.d("NewSubscriptionChoosePlanFragment: PIN entered: $enteredPin, expected: $expectedPin")
                
                if (enteredPin == expectedPin) {
                    Timber.d("NewSubscriptionChoosePlanFragment: Correct PIN entered, enabling QA mode")
                    CrashlyticsLog.log("QA mode PIN validated successfully")
                    newSubscriptionViewModel.enableQaModeAndReload()
                } else {
                    Timber.d("NewSubscriptionChoosePlanFragment: Incorrect PIN entered")
                    CrashlyticsLog.log("QA mode PIN validation failed")
                    newSubscriptionViewModel.disableQaModeAndReload()
                }
                
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ -> 
                dialog.dismiss() 
            }
            .show()
    }
}