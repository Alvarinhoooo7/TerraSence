package com.sosmartlabs.momo.main.ui.dialog

import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R

class DisabledUserPermissionDialogFragment: DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?) = MaterialAlertDialogBuilder(requireContext())
        .setTitle(getString(R.string.title_dialog_option_disable))
        .setMessage(getString(R.string.message_dialog_option_disabled))
        .setPositiveButton(R.string.button_accept, null)
        .create()

}