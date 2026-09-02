package com.sosmartlabs.momo.utils.ui

import android.app.Dialog
import android.os.Bundle
import android.widget.TextView
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import timber.log.Timber

class ProgressDialogFragment : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val view = layoutInflater.inflate(R.layout.dialog_fragment_progress, null)
        val message = arguments?.getString(ARG_MESSAGE)
        view.findViewById<TextView>(R.id.progress_message).text = message
        return MaterialAlertDialogBuilder(requireContext())
            .setView(view)
            .create()
    }

    fun updateMessage(message: String) {
        (dialog?.findViewById<TextView>(R.id.progress_message))?.text = message
    }

    companion object {
        private const val TAG = "ProgressDialogFragment"
        private const val ARG_MESSAGE = "arg_message"

        fun show(fragmentManager: FragmentManager, message: String): ProgressDialogFragment {
            dismiss(fragmentManager)
            val fragment = ProgressDialogFragment().apply {
                isCancelable = false
                arguments = Bundle().apply { putString(ARG_MESSAGE, message) }
            }
            try {
                fragment.show(fragmentManager, TAG)
            } catch (e: IllegalStateException) {
                Timber.e(e, "ProgressDialogFragment - Cannot show dialog")
            }
            return fragment
        }

        fun dismiss(fragmentManager: FragmentManager) {
            try {
                val existing = fragmentManager.findFragmentByTag(TAG) as? ProgressDialogFragment
                existing?.dismissAllowingStateLoss()
            } catch (e: Exception) {
                Timber.e(e, "ProgressDialogFragment - Error dismissing dialog")
            }
        }
    }
}
