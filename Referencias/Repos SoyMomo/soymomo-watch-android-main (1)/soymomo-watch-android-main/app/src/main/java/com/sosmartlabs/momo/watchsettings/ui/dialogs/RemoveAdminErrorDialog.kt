package com.sosmartlabs.momo.watchsettings.ui.dialogs

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R

class RemoveAdminErrorDialog : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return MaterialAlertDialogBuilder(requireContext())
            .setMessage(R.string.alert_remove_momo_admin)
            .setPositiveButton(R.string.button_i_understand, null)
            .create()
    }
}
