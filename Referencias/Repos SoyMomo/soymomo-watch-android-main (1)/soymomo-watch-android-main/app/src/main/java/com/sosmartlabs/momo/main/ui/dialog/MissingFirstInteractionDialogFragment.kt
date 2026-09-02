package com.sosmartlabs.momo.main.ui.dialog

import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R

class MissingFirstInteractionDialogFragment: DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?) = MaterialAlertDialogBuilder(requireContext())
        .setTitle(getString(R.string.dialog_missing_first_interaction_title))
        .setMessage(getString(R.string.dialog_missing_first_interaction_message))
        .setPositiveButton(R.string.button_i_understand, null)
        .create()

}