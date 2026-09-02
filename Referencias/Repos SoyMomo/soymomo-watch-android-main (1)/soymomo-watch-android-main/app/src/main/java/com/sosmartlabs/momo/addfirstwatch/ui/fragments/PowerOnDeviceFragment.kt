package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import timber.log.Timber
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.AddWatchPowerOnFragmentBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class PowerOnDeviceFragment : Fragment() {

    private lateinit var binding: AddWatchPowerOnFragmentBinding

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = AddWatchPowerOnFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.watchPowerCheckbox.setOnCheckedChangeListener { _, isChecked ->
            binding.buttonNext.isEnabled = isChecked
        }

        // Set up the button to enable Bluetooth and request permissions.
        binding.buttonNext.setOnClickListener {
            navigateById(R.id.action_powerOnDeviceFragment_to_enableBluetoothFragment)
        }
    }
}