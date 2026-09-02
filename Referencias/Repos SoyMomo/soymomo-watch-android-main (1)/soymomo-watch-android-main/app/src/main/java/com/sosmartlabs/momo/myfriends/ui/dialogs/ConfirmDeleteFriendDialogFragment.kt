package com.sosmartlabs.momo.myfriends.ui.dialogs

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogConfirmDeleteGenericBinding

/**
 * Dialog for delete confirmation for friends
 * @param friendName Nem of friend to delete for showing in dialog
 * @param listener listener for dialog result
 */
class ConfirmDeleteFriendDialogFragment(private val friendName: String,
                                        private val listener: ConfirmDeleteDialogListener)
    : DialogFragment() {

    /**
     * Listener for results in this dialog
     */
    interface ConfirmDeleteDialogListener {

        /**
         * Confirms that the Delete button was pressed
         */
        fun onDelete()
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val context = requireContext()
        val binding = DialogConfirmDeleteGenericBinding.inflate(LayoutInflater.from(context))

        binding.deleteDialogTitle.setText(R.string.my_friends_confirm_delete_friend)

        binding.deleteFriendButton.setOnClickListener {
            listener.onDelete()
            dismiss()
        }

        binding.cancelButton.setOnClickListener {
            dismiss()
        }

        return MaterialAlertDialogBuilder(context)
            .setView(binding.root)
            .create()
    }
}