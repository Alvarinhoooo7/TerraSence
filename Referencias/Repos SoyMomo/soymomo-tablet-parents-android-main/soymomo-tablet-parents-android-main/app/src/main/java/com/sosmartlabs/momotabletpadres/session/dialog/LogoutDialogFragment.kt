package com.sosmartlabs.momotabletpadres.session.dialog

import android.app.AlertDialog
import android.app.Dialog
import android.content.DialogInterface
import android.content.res.ColorStateList
import android.os.Bundle
import androidx.core.content.ContextCompat
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momotabletpadres.R
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class LogoutDialogFragment : DialogFragment() {
    private var onLogoutListener: (() -> Unit)? = null

    fun setOnLogoutListener(listener: () -> Unit) {
        onLogoutListener = listener
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = AlertDialog.Builder(requireContext())
            .setMessage(R.string.alert_log_out_text)
            .setPositiveButton(R.string.button_cancel, null)
            .setNegativeButton(R.string.button_log_out) { _: DialogInterface?, _: Int -> 
                onLogoutListener?.invoke() 
            }
            .show()

        dialog.getButton(DialogInterface.BUTTON_NEGATIVE)
            .setTextColor(ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), R.color.colorAccent)
            ))

        return dialog
    }

    companion object {
        fun newInstance(): LogoutDialogFragment = LogoutDialogFragment()
    }
}