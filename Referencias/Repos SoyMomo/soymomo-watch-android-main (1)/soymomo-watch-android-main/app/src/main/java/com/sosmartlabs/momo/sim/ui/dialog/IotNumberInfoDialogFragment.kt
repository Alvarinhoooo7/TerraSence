package com.sosmartlabs.momo.sim.ui.dialog

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogIotNumberInfoBinding
import timber.log.Timber

/**
 * Reassurance dialog shown from the subscription payment-success screen to ES/SE parents,
 * explaining why their watch's SIM has an unusually long IoT/M2M phone number. Dismisses on the
 * Close button or on a tap outside (cancelable by default).
 */
class IotNumberInfoDialogFragment : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("IotNumberInfoDialogFragment: onCreateDialog()")
        val binding = DialogIotNumberInfoBinding.inflate(layoutInflater)
        return MaterialAlertDialogBuilder(requireContext())
            .setView(binding.root)
            .setPositiveButton(R.string.button_close, null)
            .create()
    }

    companion object {
        const val TAG = "IotNumberInfoDialogFragment"
    }
}
