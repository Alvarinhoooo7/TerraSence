package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.bumptech.glide.Glide
import com.google.firebase.crashlytics.crashlytics
import com.google.firebase.Firebase
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.databinding.AddWatchConfigureOtherSimFragmentBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class ConfigureOtherSimFragment: Fragment() {
    /**
     * Binding
     */
    private lateinit var binding: AddWatchConfigureOtherSimFragmentBinding

    /**
     * ViewModel
     */
    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = AddWatchConfigureOtherSimFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.buttonNext.setOnClickListener {
            navigateById(R.id.action_configureOtherSimFragment_to_insertSimFragment)
        }

        binding.buttonHowActivate.setOnClickListener {
            context?.let { context ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW)
                    intent.data = Uri.parse("https://soymomo.zendesk.com/hc/articles/360010341434")
                    context.startActivity(intent)
                } catch (e: ActivityNotFoundException){
                    Toast.makeText(context, R.string.toast_error_opening_url, Toast.LENGTH_LONG).show()
                    with(Firebase.crashlytics){
                        log("Could not open SoyMomo support webpage")
                        recordException(e)
                    }
                }
            }
        }
    }

    private fun observeViewModel() {
        addFirstMomoViewModel.selectedMobileNetworkOperator.observe(viewLifecycleOwner) {
            Timber.d("selectedMobileNetworkOperator $it")
            if (it == null) {
                Glide.with(binding.configureOtherSimLogo.context)
                    .load(R.drawable.configure_sim)
                    .fitCenter()
                    .into(binding.configureOtherSimLogo)
            } else {
                Glide.with(binding.configureOtherSimLogo.context)
                    .load(it.logo.url)
                    .fitCenter()
                    .into(binding.configureOtherSimLogo)
            }
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
}