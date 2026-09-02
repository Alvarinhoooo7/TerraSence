package com.sosmartlabs.momo.phonebook.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.content.DialogInterface
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact

/**
 * Class for confirming a PhoneContact delete
 * @param phoneContact PhoneContact to confirm deletion
 */
class ConfirmDeleteContactDialogFragment(private val phoneContact: PhoneContact): DialogFragment() {

    /**
     * Interface for handling the response of this dialog in the host
     */
    interface ConfirmDeleteContactDialogListener {
        /**
         * Triggered when the user has confirmed the user deletion
         */
        fun onConfirmDeleteContact(phoneContact: PhoneContact)
    }

    /**
     * Listener for handling this dialog result
     */
    private lateinit var listener: ConfirmDeleteContactDialogListener

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val context = requireContext()

        val dialog = MaterialAlertDialogBuilder(context)
            .setMessage(R.string.alert_dialog_cofirm_delete_contact)
            .setPositiveButton(R.string.button_delete, null)
            .setNegativeButton(R.string.button_cancel, null)
            .setCancelable(false)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                listener.onConfirmDeleteContact(phoneContact)
                dismiss()
            }
        }

        return dialog
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try {
            // Instantiate the ConfirmDeleteContactDialogListener so we can send events to the host
            listener = context as ConfirmDeleteContactDialogListener
        } catch (e: ClassCastException) {
            // The activity doesn't implement the interface, throw exception
            throw ClassCastException((context.toString() +
                    " must implement ConfirmDeleteContactDialogListener"))
        }
    }
}