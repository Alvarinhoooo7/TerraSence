package com.sosmartlabs.momotabletpadres.tabletsettings.pin

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.activityViewModels
import com.google.android.material.button.MaterialButton
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.ui.SettingsSafetyFragmentBase
import com.sosmartlabs.momotabletpadres.databinding.TabletSafetyFragmentBinding
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import com.sosmartlabs.momotabletpadres.utils.WindowInsetsUtils
import com.sosmartlabs.momotabletpadres.tablet.TabletViewModel
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class TabletSafetyFragment : SettingsSafetyFragmentBase() {

    override val tabletViewModel: TabletViewModel by activityViewModels()
    override lateinit var binding: TabletSafetyFragmentBinding
    private lateinit var currentTablet: Tablet

    init {
        Timber.d("TabletSafetyFragment: Fragment initialized")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("TabletSafetyFragment: onCreateView - inflating layout")
        binding = TabletSafetyFragmentBinding.inflate(inflater, container, false)
        setupToolbar()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("TabletSafetyFragment: onViewCreated - view created, setting up bindings")
        super.onViewCreated(view, savedInstanceState)

        WindowInsetsUtils.applyEdgeToEdgeInsets(
            root = binding.root,
            topView = binding.appBarLayout,
            bottomView = binding.contentScrollView,
            includeImeBottom = true,
        )

        setupViewModel()

        binding.forgotPin.setOnClickListener {
            Timber.d("TabletSafetyFragment: Forgot PIN button clicked")
            showForgotPinDialog()
        }
    }

    private fun setupToolbar() {
        Timber.d("TabletSafetyFragment: setupToolbar - configuring toolbar")
        (activity as? AppCompatActivity)?.apply {
            setSupportActionBar(binding.toolbar)
            supportActionBar?.apply {
                setDisplayShowTitleEnabled(false)
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        } ?: run {
            Timber.e("TabletSafetyFragment: setupToolbar - Activity is not AppCompatActivity")
            CrashlyticsLog.recordNonFatalError(
                IllegalStateException("Activity is not AppCompatActivity"),
                "TabletSafetyFragment: setupToolbar failed"
            )
        }
        setHasOptionsMenu(true)
    }

    override fun setupViewModel() {
        Timber.d("TabletSafetyFragment: setupViewModel - observing currentTablet LiveData")
        tabletViewModel.currentTablet.observe(viewLifecycleOwner) { tablet ->
            Timber.d("TabletSafetyFragment: setupViewModel - Received tablet update: ${tablet.id}")
            setupViewsRequireTablet(tablet)
            currentTablet = tablet
        }
    }

    override fun setupViewsRequireTablet(tablet: Tablet) {
        Timber.d("TabletSafetyFragment: setupViewsRequireTablet - Setting up views for tablet ${tablet.id}")
        binding.buttonChangePin.setOnClickListener {
            Timber.d("TabletSafetyFragment: Change PIN button clicked")
            if (!NewNetworkStateChecker.isThereInternetConnection(requireContext())) {
                Timber.w("TabletSafetyFragment: No internet connection available for PIN change")
                CrashlyticsLog.log("TabletSafetyFragment: No internet connection available for PIN change on tablet ${tablet.id}")
                Toast.makeText(
                    this.activity,
                    getString(R.string.internet_connection_disabled),
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }

            val actualPin = binding.actualEtPin.text.toString()
            val newPin = binding.newEtPin.text.toString()

            Timber.d("TabletSafetyFragment: User entered actualPin: $actualPin, newPin: $newPin")

            if (actualPin != tablet.pin) {
                Timber.d("TabletSafetyFragment: Wrong current PIN entered (expected: ${tablet.pin}, got: $actualPin)")
                CrashlyticsLog.log("TabletSafetyFragment: Wrong current PIN entered for tablet ${tablet.id}")
                binding.actualPin.error = getString(R.string.error_wrong_pin)
                return@setOnClickListener
            }

            binding.actualPin.error = null

            if (newPin.length != 4) {
                Timber.d("TabletSafetyFragment: Invalid new PIN length: ${newPin.length}")
                CrashlyticsLog.log("TabletSafetyFragment: Invalid new PIN length (${newPin.length}) for tablet ${tablet.id}")
                binding.newPin.error = getString(R.string.new_pin_error_length)
                return@setOnClickListener
            }

            Timber.d("TabletSafetyFragment: Saving new PIN for tablet ${tablet.id}")
            tabletViewModel.savePin(currentTablet, tablet.pin!!, newPin)
            tabletViewModel.savePin(currentTablet, actualPin, newPin)
            Timber.i("TabletSafetyFragment: PIN changed successfully for tablet ${tablet.id}")
            clearPinInputs()
            Toast.makeText(
                this.activity,
                getString(R.string.toast_pin_changed_successfully),
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun clearPinInputs() {
        Timber.d("TabletSafetyFragment: clearPinInputs - Clearing PIN input fields")
        binding.apply {
            newPin.error = null
            actualEtPin.text = null
            actualEtPin.clearFocus()
            newEtPin.text = null
            newEtPin.clearFocus()
        }
    }

    private fun showForgotPinDialog() {
        Timber.d("TabletSafetyFragment: showForgotPinDialog - Showing forgot PIN dialog")
        val dialog = Dialog(requireContext())
        dialog.setContentView(R.layout.dialog_recover_pin)
        dialog.setCancelable(true)
        val descriptionText = dialog.findViewById<TextView>(R.id.description)
        val recoverButton = dialog.findViewById<MaterialButton>(R.id.recover)

        if (currentTablet.recoveryEmail == null) {
            Timber.w("TabletSafetyFragment: No recovery email set for tablet ${currentTablet.id}")
            CrashlyticsLog.log("TabletSafetyFragment: No recovery email set for tablet ${currentTablet.id}")
            dialog.dismiss()
            Toast.makeText(
                requireContext(),
                getString(R.string.toast_no_recovery_email),
                Toast.LENGTH_LONG
            ).show()
            showErrorForgotPinDialog()
            return
        }

        val recoveryMail = currentTablet.recoveryEmail!!
        descriptionText.text = getString(R.string.dialog_recovery_pin_description, recoveryMail)

        recoverButton.setOnClickListener {
            Timber.d("TabletSafetyFragment: Recover PIN button clicked for email: $recoveryMail")
            if (!NewNetworkStateChecker.isThereInternetConnection(requireContext())) {
                Timber.w("TabletSafetyFragment: No internet connection for PIN recovery")
                CrashlyticsLog.log("TabletSafetyFragment: No internet connection for PIN recovery for tablet ${currentTablet.id}")
                dialog.dismiss()
                Toast.makeText(
                    requireContext(),
                    getString(R.string.internet_connection_disabled),
                    Toast.LENGTH_LONG
                ).show()
                return@setOnClickListener
            }

            Timber.d("TabletSafetyFragment: Initiating PIN recovery for email: $recoveryMail, tablet: ${currentTablet.id}")
            tabletViewModel.recoverPin(currentTablet, recoveryMail) { error ->
                if (error != null) {
                    Timber.e("TabletSafetyFragment: PIN recovery failed for tablet ${currentTablet.id}: $error")
                    CrashlyticsLog.recordNonFatalError(
                        Throwable(error),
                        "TabletSafetyFragment: PIN recovery failed for tablet ${currentTablet.id}"
                    )
                    showErrorForgotPinDialog()
                    dialog.dismiss()
                }
            }
            Toast.makeText(
                requireContext(),
                getString(R.string.toast_check_email),
                Toast.LENGTH_LONG
            ).show()
            dialog.dismiss()
        }

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.show()
    }

    private fun showErrorForgotPinDialog() {
        Timber.d("TabletSafetyFragment: showErrorForgotPinDialog - Showing PIN error dialog")
        val dialog = Dialog(requireContext())
        dialog.setContentView(R.layout.dialog_pin_error_contact)
        dialog.setCancelable(true)

        val tabletIdText = dialog.findViewById<TextView>(R.id.tablet_id)
        tabletIdText.text = getString(R.string.recovery_pin_tablet_hid, currentTablet.hid)

        val understoodButton = dialog.findViewById<MaterialButton>(R.id.understood)
        understoodButton.setOnClickListener {
            Timber.d("TabletSafetyFragment: User acknowledged PIN error dialog for tablet ${currentTablet.id}")
            dialog.dismiss()
        }
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.show()
    }
}