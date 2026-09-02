package com.sosmartlabs.momo.addfirstwatch.ui.fragments

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.addfirstwatch.analytics.AddWatchAnalytics
import com.sosmartlabs.momo.addfirstwatch.ui.AddFirstMomoViewModel
import com.sosmartlabs.momo.bluetooth.BluetoothCentralHelper
import com.sosmartlabs.momo.databinding.AddWatchEnableBluetoothFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class EnableBluetoothFragment : Fragment() {

    private lateinit var binding: AddWatchEnableBluetoothFragmentBinding

    @Inject
    lateinit var bluetoothService: BluetoothManager

    @Inject
    lateinit var bluetoothCentralHelper: BluetoothCentralHelper

    private val addFirstMomoViewModel: AddFirstMomoViewModel by activityViewModels()
    private var hasCompletedBluetoothSync = false

    private val enableBluetoothLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        Timber.d("EnableBluetoothFragment: Bluetooth enable request completed with result code: ${result.resultCode}")
        CrashlyticsLog.log("Bluetooth enable request completed with result code: ${result.resultCode}")
        
        // Check if Bluetooth is enabled now
        val bluetoothAdapter = bluetoothService.adapter
        if (bluetoothAdapter.isEnabled) {
            Timber.i("EnableBluetoothFragment: Bluetooth was successfully enabled")
            CrashlyticsLog.log("Bluetooth was successfully enabled")
            startWatchSync()
        } else {
            Timber.w("EnableBluetoothFragment: User declined to enable Bluetooth")
            CrashlyticsLog.log("User declined to enable Bluetooth")
            addFirstMomoViewModel.trackBluetoothSyncResult(
                AddWatchAnalytics.Result.CANCELLED,
                "bluetooth_enable_declined"
            )
            Toast.makeText(requireContext(), getString(R.string.bluetooth_must_be_enabled), Toast.LENGTH_SHORT).show()
        }
    }

    private val bluetoothPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        Timber.d("EnableBluetoothFragment: Bluetooth permissions request completed. All granted: $allGranted")
        CrashlyticsLog.log("Bluetooth permissions request completed. All granted: $allGranted")
        
        if (allGranted) {
            Timber.i("EnableBluetoothFragment: All Bluetooth permissions granted")
            CrashlyticsLog.log("All Bluetooth permissions granted")
            // Permissions are granted, now we can safely try to enable Bluetooth if it's off.
            val bluetoothAdapter = bluetoothService.adapter
            if (!bluetoothAdapter.isEnabled) {
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                enableBluetoothLauncher.launch(enableBtIntent)
            } else {
                startWatchSync()
            }
        } else {
            Timber.w("EnableBluetoothFragment: Some Bluetooth permissions were denied: $permissions")
            CrashlyticsLog.log("Some Bluetooth permissions were denied: $permissions")
            addFirstMomoViewModel.trackBluetoothSyncResult(
                AddWatchAnalytics.Result.ERROR,
                "bluetooth_permission_denied"
            )
            Toast.makeText(requireContext(), R.string.bluetooth_permissions_required, Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        Timber.d("EnableBluetoothFragment: onCreateView")
        CrashlyticsLog.log("EnableBluetoothFragment: onCreateView")
        binding = AddWatchEnableBluetoothFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("EnableBluetoothFragment: onViewCreated")
        CrashlyticsLog.log("EnableBluetoothFragment: onViewCreated")

        if (bluetoothService.adapter == null) {
            Timber.e("EnableBluetoothFragment: Device does not support Bluetooth. Disabling sync functionality.")
            CrashlyticsLog.log("Device does not support Bluetooth. Disabling sync functionality.")
            addFirstMomoViewModel.trackBluetoothSyncResult(
                AddWatchAnalytics.Result.UNAVAILABLE,
                "bluetooth_not_supported"
            )
            binding.enableBluetoothTitle.text = getString(R.string.add_watch_enable_bluetooth_not_supported_title)
            binding.enableBluetoothDescription.text = getString(R.string.add_watch_enable_bluetooth_not_supported_description)
            binding.buttonSyncBluetooth.isEnabled = false
            binding.buttonSyncBluetooth.visibility = View.GONE
            binding.buttonNext.visibility = View.VISIBLE
            binding.buttonNext.isEnabled = true
        }

        binding.buttonSyncBluetooth.setOnClickListener {
            Timber.d("EnableBluetoothFragment: Sync bluetooth button clicked")
            CrashlyticsLog.log("Sync button clicked to enable Bluetooth")
            requestBluetoothPermissionsIfNeeded()
        }

        binding.buttonNext.setOnClickListener {
            Timber.d("EnableBluetoothFragment: Next button clicked")
            CrashlyticsLog.log("Next button clicked")
            if (!hasCompletedBluetoothSync) {
                addFirstMomoViewModel.trackBluetoothSyncResult(AddWatchAnalytics.Result.SKIPPED)
            }
            navigateById(R.id.action_enableBluetoothFragment_to_firstContactFragment)
        }
    }

    override fun onDestroyView() {
        Timber.d("EnableBluetoothFragment: onDestroyView")
        CrashlyticsLog.log("EnableBluetoothFragment: onDestroyView")
        binding.progressIndicator.visibility = View.INVISIBLE
        super.onDestroyView()
    }

    private fun requestBluetoothPermissionsIfNeeded() {
        Timber.d("EnableBluetoothFragment: Checking if Bluetooth permissions are needed")
        CrashlyticsLog.log("Checking if Bluetooth permissions are needed")
        
        val bluetoothAdapter = bluetoothService.adapter
        if (bluetoothAdapter == null) {
            Timber.e("EnableBluetoothFragment: Device does not support Bluetooth")
            CrashlyticsLog.log("Device does not support Bluetooth")
            addFirstMomoViewModel.trackBluetoothSyncResult(
                AddWatchAnalytics.Result.UNAVAILABLE,
                "bluetooth_not_supported"
            )
            Toast.makeText(requireContext(), getString(R.string.bluetooth_not_supported), Toast.LENGTH_SHORT).show()
            binding.enableBluetoothTitle.text = getString(R.string.add_watch_enable_bluetooth_not_supported_title)
            binding.enableBluetoothDescription.text = getString(R.string.add_watch_enable_bluetooth_not_supported_description)
            binding.buttonSyncBluetooth.isEnabled = false
            binding.buttonSyncBluetooth.visibility = View.GONE
            binding.buttonNext.visibility = View.VISIBLE
            binding.buttonNext.isEnabled = true
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Timber.d("EnableBluetoothFragment: Android 12+ detected, checking permissions.")
            CrashlyticsLog.log("Android 12+ detected, checking permissions.")
            
            val requiredPermissions = arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE
            )
            
            val allPermissionsGranted = requiredPermissions.all {
                ContextCompat.checkSelfPermission(requireContext(), it) == PackageManager.PERMISSION_GRANTED
            }

            if (allPermissionsGranted) {
                Timber.i("EnableBluetoothFragment: All required Bluetooth permissions already granted.")
                CrashlyticsLog.log("All required Bluetooth permissions already granted.")
                if (!bluetoothAdapter.isEnabled) {
                    val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                    enableBluetoothLauncher.launch(enableBtIntent)
                } else {
                    startWatchSync()
                }
            } else {
                Timber.d("EnableBluetoothFragment: Requesting Bluetooth permissions.")
                CrashlyticsLog.log("Requesting Bluetooth permissions.")
                bluetoothPermissionsLauncher.launch(requiredPermissions)
            }
        } else {
            Timber.d("EnableBluetoothFragment: Running on Android 11 or lower.")
            CrashlyticsLog.log("Running on Android 11 or lower.")
            if (!bluetoothAdapter.isEnabled) {
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                enableBluetoothLauncher.launch(enableBtIntent)
            } else {
                startWatchSync()
            }
        }
    }

    private fun startWatchSync() {
        Timber.d("EnableBluetoothFragment: Starting watch sync process")
        CrashlyticsLog.log("Starting watch sync process")
        addFirstMomoViewModel.trackBluetoothSyncStarted()
        
        // Update UI to show syncing state.
        binding.enableBluetoothTitle.text = getString(R.string.add_watch_enable_bluetooth_syncing_title)
        binding.enableBluetoothDescription.text = getString(R.string.add_watch_enable_bluetooth_syncing_description)
        binding.progressIndicator.visibility = View.VISIBLE
        binding.buttonSyncBluetooth.visibility = View.INVISIBLE
        binding.buttonSyncBluetooth.isEnabled = false
        binding.buttonNext.visibility = View.INVISIBLE
        binding.buttonNext.isEnabled = false

        // Get deviceId for syncing
        val deviceId = addFirstMomoViewModel.currentWearer.value?.deviceId
        if (deviceId == null) {
            Timber.e("EnableBluetoothFragment: Cannot sync watch - deviceId is null")
            CrashlyticsLog.log("Cannot sync watch - deviceId is null")
            addFirstMomoViewModel.trackBluetoothSyncResult(
                AddWatchAnalytics.Result.ERROR,
                "missing_watch"
            )
            binding.enableBluetoothTitle.text = getString(R.string.add_watch_enable_bluetooth_synced_title)
            binding.enableBluetoothDescription.text = getString(R.string.add_watch_enable_bluetooth_synced_description)
            binding.progressIndicator.visibility = View.INVISIBLE
            binding.buttonSyncBluetooth.visibility = View.INVISIBLE
            binding.buttonSyncBluetooth.isEnabled = false
            binding.buttonNext.visibility = View.VISIBLE
            binding.buttonNext.isEnabled = true
            return
        }
        
        Timber.i("EnableBluetoothFragment: Starting sync for watch")
        CrashlyticsLog.log("Starting sync for watch")

        // Set callback for when the watch is synced successfully.
        bluetoothCentralHelper.onSyncSuccess = {
            Timber.i("EnableBluetoothFragment: Watch sync completed successfully")
            CrashlyticsLog.log("Watch sync completed successfully")
            hasCompletedBluetoothSync = true
            addFirstMomoViewModel.trackBluetoothSyncResult(AddWatchAnalytics.Result.SUCCESS)
            
            requireActivity().runOnUiThread {
                binding.enableBluetoothTitle.text = getString(R.string.add_watch_enable_bluetooth_synced_title)
                binding.enableBluetoothDescription.text = getString(R.string.add_watch_enable_bluetooth_synced_description)
                binding.progressIndicator.visibility = View.INVISIBLE
                binding.buttonSyncBluetooth.visibility = View.INVISIBLE
                binding.buttonSyncBluetooth.isEnabled = false
                binding.buttonNext.visibility = View.VISIBLE
                binding.buttonNext.isEnabled = true
                binding.buttonNext.text = getString(R.string.add_watch_enable_bluetooth_synced_button)
            }
        }

        // Start scanning and sync the watch.
        bluetoothCentralHelper.startScan(deviceId)
    }

    private fun navigateById(navId: Int, bundle: Bundle = bundleOf()) {
        Timber.d("EnableBluetoothFragment: Navigating to destination ID: $navId")
        CrashlyticsLog.log("Navigating to destination ID: $navId")
        val navController = findNavController()
        if (navController.currentDestination?.getAction(navId) != null) {
            navController.navigate(navId, bundle)
        } else {
            Timber.w("Skipping stale navigation to $navId from ${navController.currentDestination?.label}")
        }
    }
}
