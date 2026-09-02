package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R

class PowerOffDialogFragment : DialogFragment() {

    interface PowerOffDialogListener {
        fun onPowerOffConfirmed()
        fun onPowerOffCanceled()
    }

    private lateinit var listener: PowerOffDialogListener

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.turn_off_watch_title)
            .setMessage(R.string.turn_off_watch_text)
            .setNegativeButton(R.string.button_cancel) { _, _ ->
                listener.onPowerOffCanceled()
                dismiss()
            }
            .setPositiveButton(R.string.settings_turn_off_title) { _, _ ->
                listener.onPowerOffConfirmed()
                dismiss()
            }
            .create()
    }

    override fun onStart() {
        super.onStart()
        (dialog as? AlertDialog)?.getButton(AlertDialog.BUTTON_POSITIVE)
            ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.colorAccent))
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        listener = context as? PowerOffDialogListener
            ?: throw ClassCastException("$context must implement PowerOffDialogListener")
    }

    companion object {
        private const val TAG = "PowerOffDialogFragment"

        fun showNonCancellable(supportFragmentManager: FragmentManager) {
            val fragment = PowerOffDialogFragment()
            fragment.isCancelable = false
            fragment.show(supportFragmentManager, TAG)
        }
    }
}
