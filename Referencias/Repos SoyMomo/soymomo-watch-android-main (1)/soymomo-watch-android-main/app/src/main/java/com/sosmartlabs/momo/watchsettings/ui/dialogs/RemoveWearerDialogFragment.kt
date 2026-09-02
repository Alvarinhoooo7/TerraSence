package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.models.Wearer

class RemoveWearerDialogFragment : DialogFragment() {

    interface RemoveWearerDialogListener {
        fun onRemoveWearer(wearer: Wearer)
        fun onCancelRemoveWearer()
    }

    private lateinit var listener: RemoveWearerDialogListener
    private lateinit var wearer: Wearer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        wearer = requireNotNull(
            BundleCompat.getParcelable(requireArguments(), ARG_WEARER, Wearer::class.java)
        ) { "RemoveWearerDialogFragment requires a Wearer in arguments." }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.settings_remove_title)
            .setMessage(R.string.alert_remove_momo_text)
            .setNegativeButton(R.string.button_cancel) { _, _ -> listener.onCancelRemoveWearer() }
            .setPositiveButton(R.string.button_accept) { _, _ -> listener.onRemoveWearer(wearer) }
            .create()
    }

    override fun onStart() {
        super.onStart()
        (dialog as? AlertDialog)?.getButton(AlertDialog.BUTTON_POSITIVE)
            ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.colorAccent))
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        listener = context as? RemoveWearerDialogListener
            ?: throw ClassCastException("$context must implement RemoveWearerDialogListener")
    }

    companion object {
        private const val ARG_WEARER = "arg_wearer"

        fun newInstance(wearer: Wearer) = RemoveWearerDialogFragment().apply {
            arguments = Bundle().apply { putParcelable(ARG_WEARER, wearer) }
        }
    }
}
