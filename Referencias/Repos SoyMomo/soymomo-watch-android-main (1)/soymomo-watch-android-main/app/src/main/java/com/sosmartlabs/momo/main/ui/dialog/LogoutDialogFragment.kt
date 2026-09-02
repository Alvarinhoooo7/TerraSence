package com.sosmartlabs.momo.main.ui.dialog

import android.app.Dialog
import android.content.DialogInterface
import android.content.res.ColorStateList
import android.os.Bundle
import androidx.core.content.ContextCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R

class LogoutDialogFragment(private val onLogoutListener: () -> Unit) : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.settings_app_log_out_title))
            .setMessage(getString(R.string.alert_log_out_text))
            .setPositiveButton(R.string.button_cancel, null)
            .setNegativeButton(R.string.button_log_out) { _: DialogInterface?, _: Int -> 
                onLogoutListener() 
            }
            .create()
            
        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_NEGATIVE)
                .setTextColor(ColorStateList.valueOf(ContextCompat.getColor(
                    requireContext(),
                    R.color.colorAccent
                )))
        }
        
        return dialog
    }
}