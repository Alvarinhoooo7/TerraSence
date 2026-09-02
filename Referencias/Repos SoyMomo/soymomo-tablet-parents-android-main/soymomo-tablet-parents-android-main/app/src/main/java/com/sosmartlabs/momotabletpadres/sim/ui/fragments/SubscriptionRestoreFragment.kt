package com.sosmartlabs.momotabletpadres.sim.ui.fragments

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
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.TabletModel
import com.sosmartlabs.momotabletpadres.databinding.SubscriptionRestoreFragmentBinding
import com.sosmartlabs.momotabletpadres.sim.ui.NewSubscriptionViewModel
import com.sosmartlabs.momotabletpadres.sim.ui.SimViewModel
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import timber.log.Timber

class SubscriptionRestoreFragment : Fragment() {

    private lateinit var binding: SubscriptionRestoreFragmentBinding

    val toolbar: Toolbar get() = binding.toolbar
    private val toolbarTitle: String get() = getString(R.string.subscription_restore_title)

    private val simViewModel: SimViewModel by activityViewModels()
    private val newSubscriptionViewModel: NewSubscriptionViewModel by activityViewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("SubscriptionRestoreFragment: onCreate")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("SubscriptionRestoreFragment: onCreateView")
        binding = SubscriptionRestoreFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("SubscriptionRestoreFragment: onViewCreated")
        setupToolbar()
        setupListeners()
        observeViewModel()

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.subscriptionRestoreButtonRestore,
            bottomAsMargin = true
        )
    }

    private fun setupToolbar() {
        Timber.d("SubscriptionRestoreFragment: Setting up toolbar")
        with(activity as AppCompatActivity) {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = toolbarTitle
                setDisplayShowTitleEnabled(true)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        }
        Timber.d("SubscriptionRestoreFragment: Toolbar setup complete")
    }

    private fun setupListeners() {
        Timber.d("SubscriptionRestoreFragment: Setting up listeners")
        binding.subscriptionRestoreButtonRestore.setOnClickListener {
            Timber.d("SubscriptionRestoreFragment: Restore button clicked")
            simViewModel.currentSubscription.value?.let { subscription ->
                Timber.d("SubscriptionRestoreFragment: Navigating with prefilled iccId: ${subscription.iccId}")
                val bundle = bundleOf("prefilledIccId" to subscription.iccId)
                newSubscriptionViewModel.setCurrentTabletByImei(subscription.imei)
                navigateById(R.id.action_subscriptionRestoreFragment_to_nav_add_sim, bundle)
            } ?: run {
                Timber.w("SubscriptionRestoreFragment: No subscription available, navigating without iccId")
                navigateById(R.id.action_subscriptionRestoreFragment_to_nav_add_sim)
            }
        }
    }

    private fun observeViewModel() {
        Timber.d("SubscriptionRestoreFragment: Setting up viewModel observers")
        simViewModel.currentSubscription.observe(viewLifecycleOwner) { subscription ->
            Timber.d("SubscriptionRestoreFragment: Updating subscription views for subscription ${subscription.iccId}")
            newSubscriptionViewModel.setCurrentTabletByImei(subscription.imei)
            val tablet = newSubscriptionViewModel.currentTablet.value
            val deviceModel = getTabletModelName(tablet)
            val iccId = subscription.iccId
            binding.subscriptionRestorePoint1Content.text = getString(R.string.subscription_restore_point_1, deviceModel, iccId)
        }
    }

    private fun getTabletModelName(tablet: Tablet?): String {
        return when (tablet?.model) {
            TabletModel.LITE -> binding.root.context.getString(R.string.lite_model_name)
            TabletModel.LITE_2 -> binding.root.context.getString(R.string.lite_2_model_name)
            TabletModel.LITE_3 -> binding.root.context.getString(R.string.lite_3_model_name)
            TabletModel.PRO-> binding.root.context.getString(R.string.pro_model_name)
            TabletModel.PRO_EU -> binding.root.context.getString(R.string.pro_model_name)
            TabletModel.PRO_2 -> binding.root.context.getString(R.string.pro_2_model_name)
            TabletModel.UNO -> binding.root.context.getString(R.string.uno_model_name)
            TabletModel.PHONE_1 -> binding.root.context.getString(R.string.momophone_1_model_name)
            null -> binding.root.context.getString(R.string.unknown_model_name)
            else -> binding.root.context.getString(R.string.unknown_model_name)
        }
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("SubscriptionRestoreFragment: Navigating to $navId")
        findNavController().navigate(navId, bundle)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        Timber.d("SubscriptionRestoreFragment: onDestroyView")
        dispose()
    }

    private fun dispose() {
        Timber.d("SubscriptionRestoreFragment: Disposing resources")
    }

}