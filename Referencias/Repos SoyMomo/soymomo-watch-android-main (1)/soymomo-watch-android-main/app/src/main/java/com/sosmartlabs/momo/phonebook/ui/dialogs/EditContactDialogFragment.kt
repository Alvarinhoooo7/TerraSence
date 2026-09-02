package com.sosmartlabs.momo.phonebook.ui.dialogs

import android.app.Dialog
import android.content.Context
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import androidx.appcompat.widget.PopupMenu
import androidx.fragment.app.DialogFragment
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.RoundedCorners
import com.bumptech.glide.request.RequestOptions
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.PhoneContactEditDialogBinding
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.stfalcon.imageviewer.StfalconImageViewer

/**
 * DialogFragment for adding a new contact or editing an existing one
 * @param name name of contact
 * @param phone phone number of contact
 * @param image URI for a contact image (optional, can be null)
 */
class EditContactDialogFragment(private val name: String?,
                                private val phone: String?,
                                private var image: String?): DialogFragment() {

    /**
     * Constructor for EditContactDialogFragment
     * @param phoneContact PhoneContact to edit.
     */
    constructor(phoneContact: PhoneContact): this(phoneContact.name, phoneContact.phone, phoneContact.image?.url) {
        this.phoneContact = phoneContact
    }

    /**
     * Constructor for empty EditContactDialogFragment
     */
    constructor(): this(null, null, null)

    /**
     * Interface for handling the response of this dialog in the host
     */
    interface EditContactDialogListener {
        /**
         * Triggered when the user has confirmed that the contact must be saved
         */
        fun onSaveContact(name: String, phone: String, image: String?, phoneContact: PhoneContact?)

        /**
         * Triggered when the user has canceled the contact creation/edition
         */
        fun onCancel()

        /**
         * Triggered when the user indicates to take a photo with the device camera for the contact
         */
        fun onTakePhoto()

        /**
         * Triggered when the user indicates to get a photo from device gallery for the contact
         */
        fun onSelectFromGallery()
    }

    /**
     * Listener for handling this dialog result
     */
    private lateinit var listener: EditContactDialogListener

    /**
     * Binding for dialog's view
     */
    private lateinit var binding: PhoneContactEditDialogBinding

    /**
     * Phone contact for this dialog
     */
    private var phoneContact: PhoneContact? = null

    /**
     * Sets the current contact new image path for been displayed in dialog
     */
    var imagePath: String?
        get() = image
        set(value) {
            image = value
            if (isAdded) loadImage()
        }

    /**
     * Listener for selection in contact photo context menu
     */
    private val onPhotoMenuClickListener = PopupMenu.OnMenuItemClickListener { item ->
        return@OnMenuItemClickListener when (item.itemId) {
            R.id.take_photo -> {
                listener.onTakePhoto()
                true
            }
            R.id.select_from_gallery -> {
                listener.onSelectFromGallery()
                true
            }

            else -> false
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        // Create and initialize ViewBinding for this dialog
        binding = PhoneContactEditDialogBinding.inflate(LayoutInflater.from(requireContext()))
        prepareDialogView()

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setView(binding.root)
            .setPositiveButton(R.string.button_accept,null)
            .setNegativeButton(R.string.button_cancel){ _, _ ->
                listener.onCancel()
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                val isContactNameEmpty = binding.contactName.text.isNullOrBlank()
                val isPhoneValid = PhoneNumberUtils.isValidPhoneNumber(binding.ccp)

                if (isPhoneValid && !isContactNameEmpty) {
                    listener.onSaveContact(
                        binding.contactName.text.toString(),
                        binding.ccp.fullNumberWithPlus,
                        returnImage(),
                        phoneContact)
                    dismiss()
                }
                else {
                    if (!isPhoneValid) {
                        binding.contactPhoneInputLayout.error =
                            getString(R.string.edittext_error_invalid_phone)
                    }
                    if (isContactNameEmpty) {
                        binding.contactNameInputLayout.error =
                            getString(R.string.edittext_error_enter_contact_name)
                    }
                }
            }
        }

        return dialog
    }

    /**
     * Decides whether an image path must be returned or not.
     * @return If the image was modified in the dialog, returned the new image path.
     * If not, return null
     */
    private fun returnImage(): String? {
        return if (image != null && phoneContact?.image?.url != image) {
            image
        } else null
    }

    /**
     * Prepares the dialog view for interacting with it
     */
    private fun prepareDialogView() {
        with(binding) {
            ccp.registerCarrierNumberEditText(contactPhone)

            val title = if (phoneContact == null) R.string.alert_add_contact_title else R.string.alert_contact_edit
            editDialogTitle.setText(title)

            if (name != null) contactName.setText(name)
            if (phone != null) showPhoneNumber()
            if (image != null) loadImage()

            contactImage.setOnClickListener {
                if (image == null) return@setOnClickListener

                val context = requireContext()
                StfalconImageViewer.Builder(context, arrayOf(image)) { view, url ->
                    Glide.with(context).load(url).into(view) }
                    .withTransitionFrom(contactImage)
                    .withHiddenStatusBar(true)
                    .show()
            }

            newPhotoButton.setOnClickListener {
                PopupMenu(requireContext(), newPhotoButton).apply {
                    setOnMenuItemClickListener(onPhotoMenuClickListener)
                    inflate(R.menu.select_contact_image_menu)
                    show()
                }
            }
        }
    }

    /**
     * Configures the dialog vew for showing an existing phone number
     */
    private fun showPhoneNumber() {
        if(phone != null && phone.contains("+")) {
            binding.ccp.fullNumber = phone
        }

        else {
            binding.contactPhone.setText(phone)
        }
    }

    /**
     * Loads an image into the image view using Glide library
     */
    private fun loadImage() {
        with(binding) {
            Glide.with(root.context)
                .load(image)
                .apply(RequestOptions.bitmapTransform( RoundedCorners(8)))
                .into(contactImage)
        }
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        try {
            // Instantiate the EditContactDialogListener so we can send events to the host
            listener = context as EditContactDialogListener
        } catch (e: ClassCastException) {
            // The activity doesn't implement the interface, throw exception
            throw ClassCastException((context.toString() +
                    " must implement EditContactDialogListener"))
        }
    }
}