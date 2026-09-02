package com.sosmartlabs.momo.linkwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.addfirstwatch.repository.MobileNetworkOperatorRepository
import com.sosmartlabs.momo.databinding.FragmentOtherCompaniesBinding
import com.sosmartlabs.momo.linkwatch.ui.LinkWatchViewModel
import com.sosmartlabs.momo.linkwatch.ui.adapters.MobileOperatorsAdapter
import com.sosmartlabs.momo.utils.collapsingtoolbar.CollapsingToolbarUtils
import com.sosmartlabs.momo.utils.ui.activityindicator.ActivityIndicatorDialogFragment
import com.sosmartlabs.momo.utils.NonScrollableGridLayoutManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class OtherCompaniesFragment : Fragment() {

    companion object {
        const val MOVISTAR_PROVIDER = "movistar"
        private const val ARG_MOBILE_NETWORK_OPERATOR = "mobileNetworkOperator"
        private const val ARG_FROM_MOMO_SIM = "fromMomoSIM"
    }

    @Inject lateinit var mobileNetworkOperatorRepository: MobileNetworkOperatorRepository
    private val linkWatchViewModel: LinkWatchViewModel by activityViewModels()

    private lateinit var binding: FragmentOtherCompaniesBinding
    private lateinit var adapter: MobileOperatorsAdapter
    private var operators: MutableLiveData<List<MobileNetworkOperator>> = MutableLiveData()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentOtherCompaniesBinding.inflate(inflater, container, false)
        val title = getString(R.string.add_watch_choose_mobile_network_operator_title)
        CollapsingToolbarUtils.setupToolbar(this, binding.toolbar, title)
        setMenuAdapter()
        searchOperators()
        setButtons()
        return binding.root
    }

    private fun setMenuAdapter() {
        val numberOfColumns = 2

        adapter = MobileOperatorsAdapter { operator ->
            saveOperator(operator)
            if (operator.hasExtraActivationSteps && operator.name.lowercase(Locale.ROOT) == MOVISTAR_PROVIDER) {
                navigateById(
                    R.id.action_otherCompaniesFragment_to_simExtraStepsFragment,
                    bundleOf(ARG_MOBILE_NETWORK_OPERATOR to operator)
                )
            } else {
                navigateById(R.id.action_otherCompaniesFragment_to_mainViewFragment)
            }
        }

        binding.mobileOperatorsRecyclerview.adapter = adapter
        binding.mobileOperatorsRecyclerview.layoutManager =
            NonScrollableGridLayoutManager(requireContext(), numberOfColumns)
    }

    private fun searchOperators() {

        operators.observe(viewLifecycleOwner) {
            adapter.submitList(it)
        }

        ActivityIndicatorDialogFragment.showNonCancellable(parentFragmentManager)
        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            val country = Locale.getDefault().country
            runCatching {
                mobileNetworkOperatorRepository.getMobileNetworkOperatorByCountry(country)
            }
            .onSuccess {
                operators.postValue(it)
                ActivityIndicatorDialogFragment.hide()
            }
            .onFailure {
                ActivityIndicatorDialogFragment.hide()
            }
        }
    }

    private fun setButtons() {
        binding.buttonOtherCompany.setOnClickListener {
            saveOperator()
            navigateById(
                R.id.action_otherCompaniesFragment_to_mainViewFragment,
                bundleOf(ARG_FROM_MOMO_SIM to true)
            )
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

    private fun saveOperator(operator: MobileNetworkOperator? = null) {
        linkWatchViewModel.setWatchMobileNetworkOperator(operator, operator == null)
        linkWatchViewModel.setLocalMobileNetworkOperator(operator)
        linkWatchViewModel.incrementCompletedSteps("sim")
    }
}