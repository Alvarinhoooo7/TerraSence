package com.sosmartlabs.momo.myfriends.ui.dialogs

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.databinding.DialogAddFriendTutorialBinding

/**
 * Dialog for showing add friends tutorial
 */
class AddFriendTutorialDialogFragment: DialogFragment() {
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val context = requireContext()
        val binding = DialogAddFriendTutorialBinding.inflate(LayoutInflater.from(context))
        return MaterialAlertDialogBuilder(context)
            .setView(binding.root)
            .create()
    }
}