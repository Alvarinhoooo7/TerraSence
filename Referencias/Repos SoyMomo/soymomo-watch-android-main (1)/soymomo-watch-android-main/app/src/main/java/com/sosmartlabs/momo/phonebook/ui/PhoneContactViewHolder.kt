package com.sosmartlabs.momo.phonebook.ui

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.PhoneContactBinding
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.WatchModel
import com.sosmartlabs.momo.phonebook.model.phonecontact.PhoneContact
import com.stfalcon.imageviewer.StfalconImageViewer
import timber.log.Timber

/**
 * ViewHolder for PhoneContact in RecyclerView
 * @param binding ViewBinding for PhoneContact
 * @param onContactButtonPressedCallbacks Callbacks for interacting with this ViewHolder's view
 */
class PhoneContactViewHolder(private val binding: PhoneContactBinding,
                             onContactButtonPressedCallbacks: OnContactButtonPressedCallbacks, private val watchModel: WatchModel
)
    : RecyclerView.ViewHolder(binding.root) {
    /**
     * Initializes the interactions with the ViewHolder's view
     */
    init {

        // Shows in fullscreen the contact image, if any
        binding.contactImage.setOnClickListener {
            if (phoneContact?.image?.url == null) return@setOnClickListener

            val context = binding.root.context
            StfalconImageViewer.Builder(context, arrayOf(phoneContact?.image?.url)) { view, url ->
                Glide.with(context).load(url).into(view) }
                .withTransitionFrom(binding.contactImage)
                .withHiddenStatusBar(true)
                .show()
        }

        // Reacts when the "Edit" button is pressed
        binding.buttonEditContact.setOnClickListener {
            onContactButtonPressedCallbacks.onEditButtonPressed(binding.phoneContact!!)
        }

        // Reacts when the "Delete" button is pressed
        binding.buttonDeleteContact.setOnClickListener {
            onContactButtonPressedCallbacks.onDeleteButtonPressed(binding.phoneContact!!)
        }

        // Reacts when the "SOS" switch is switched
        binding.watchSosSwitch.setOnCheckedChangeListener { _, isChecked ->
            binding.sosLabel.isEnabled = isChecked
            onContactButtonPressedCallbacks.onSosSwitchPressed(binding.phoneContact!!, isChecked)
        }

        binding.bookmarkIcon.setOnClickListener {
            onContactButtonPressedCallbacks.onBookmarkIconPressed(binding.phoneContact!!)
        }
    }

    fun setBookmarkVisibility() {
        when (watchModel) {
            Space3 -> {
                binding.bookmarkIcon.visibility = View.VISIBLE
            }
            else -> {
                binding.bookmarkIcon.visibility = View.GONE
            }
        }
    }

    fun setBookmark() {
        Timber.d("setBookmark: ")
        if (watchModel is Space3) {
            phoneContact?.let {
                val isFamily = it.isFamily ?: false
                if (isFamily) {
                    Timber.d("Setting bookmark for ${it.name}")
                    binding.bookmarkIcon.setImageResource(R.drawable.ic_family_type_red)
                } else {
                    Timber.d("Removing bookmark for ${it.name}")
                    binding.bookmarkIcon.setImageResource(R.drawable.ic_family_type)
                }
            }
        }
    }

    /**
     * Gets or sets the PhoneContact for showing in the view
     */
    var phoneContact: PhoneContact?
        set(value) {
            with(binding) {
                phoneContact = value

                // In case the image is null, we need to tell the image view that shows
                // the default image
                if (value != null && value.image == null) {
                    contactImage.setImageResource(R.drawable.ic_default_avatar)
                }
            }

        }
        get() = binding.phoneContact
}