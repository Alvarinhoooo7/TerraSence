package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.airbnb.lottie.LottieDrawable
import com.bumptech.glide.Glide
import com.google.android.material.imageview.ShapeableImageView
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.analytics.AddWatchAnalytics
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchConfigureSimCardFragmentBinding
import com.sosmartlabs.momo.sim.util.SimCountries
import com.sosmartlabs.momo.utils.CountryProvider
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ConfigureSimFragment: Fragment() {

    /**
     * Binding
     */
    private lateinit var binding: AddWatchConfigureSimCardFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchConfigureSimCardFragmentBinding.inflate(inflater, container, false)
        setAnimation()
        addFirstMomoViewModel.setProgressStep(3)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setAnimation() {
        with(binding.configureSimAnimation) {
            setAnimation(R.raw.configure_sim)
            repeatCount = LottieDrawable.INFINITE
            playAnimation()
        }
    }

    private fun isSoyMomoSimCountryAvailable(): Boolean {
        return SimCountries.isSupported(CountryProvider.getCountry(requireContext()))
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    private fun setupListeners() {
        binding.soymomoSimCard.setOnClickListener {
            if (isSoyMomoSimCountryAvailable()) {
                addFirstMomoViewModel.trackSimChoiceSelected(AddFirstMomoViewModel.SIM_PATH_SOYMOMO)
                navigateById(R.id.action_configureSimFragment_to_newSubscriptionLinkSimFragment)
            } else {
                addFirstMomoViewModel.trackSimChoiceSelected(
                    AddFirstMomoViewModel.SIM_PATH_SOYMOMO,
                    AddWatchAnalytics.Result.UNAVAILABLE
                )
                Toast.makeText(requireContext(), getString(R.string.subscription_unavailable_title), Toast.LENGTH_LONG).show()
            }
        }

        binding.otherCompanyCard.setOnClickListener {
            addFirstMomoViewModel.trackSimChoiceSelected(AddFirstMomoViewModel.SIM_PATH_OTHER)
            navigateById(R.id.action_configureSimFragment_to_chooseMobileNetworkOperatorFragment)
        }
    }

    private fun observeViewModel() {
        addFirstMomoViewModel.currentCountry.observe(viewLifecycleOwner) { country ->
            Timber.d("currentCountry $country")
            if (!isSoyMomoSimCountryAvailable()) {
                binding.soymomoSimCard.visibility = View.GONE
            }
        }

        addFirstMomoViewModel.mobileNetworkOperatorList.observe(viewLifecycleOwner) { list ->
            Timber.d("mobileNetworkOperatorList size=${list.size}")
            when (list.size) {
                0 -> {
                    binding.mnoLogo1.visibility = View.GONE
                    binding.mnoLogo2.visibility = View.GONE
                    binding.mnoLogo3.visibility = View.GONE
                }
                1 -> {
                    binding.mnoLogo2.visibility = View.GONE
                    binding.mnoLogo3.visibility = View.GONE
                    loadLogoIntoView(list[0].logo.url, binding.mnoLogo1)
                }
                2 -> {
                    binding.mnoLogo3.visibility = View.GONE
                    loadLogoIntoView(list[0].logo.url, binding.mnoLogo1)
                    loadLogoIntoView(list[1].logo.url, binding.mnoLogo2)
                }
                else -> {
                    loadLogoIntoView(list[0].logo.url, binding.mnoLogo1)
                    loadLogoIntoView(list[1].logo.url, binding.mnoLogo2)
                    loadLogoIntoView(list[2].logo.url, binding.mnoLogo3)
                }
            }
        }
    }

    private fun loadLogoIntoView(url: String, view: ShapeableImageView) {
        Glide.with(view.context)
            .load(url)
            .fitCenter()
            .into(view)
    }
}
