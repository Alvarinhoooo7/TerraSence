package com.sosmartlabs.momo.main.ui.dialog

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.databinding.DialogAddedSuccessNumberBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class AddedSuccessNumberDialogFragment(private val wearer: Wearer) : DialogFragment() {

    private lateinit var binding: DialogAddedSuccessNumberBinding

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("AddedSuccessNumberDialogFragment: onCreateDialog()")
        CrashlyticsLog.log("AddedSuccessNumberDialogFragment: Creating dialog for wearer ${wearer.objectId}")

        return try {
            initializeBinding()
            loadContactImage()
            
            createDialog().apply {
                setOnShowListener {
                    Timber.d("AddedSuccessNumberDialogFragment: Dialog shown")
                    setupAcceptButton()
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "AddedSuccessNumberDialogFragment: Error creating dialog")
            CrashlyticsLog.recordNonFatalError(e, "AddedSuccessNumberDialogFragment: Error creating dialog")
            throw e
        }
    }

    private fun initializeBinding() {
        Timber.d("AddedSuccessNumberDialogFragment: Initializing binding")
        binding = DialogAddedSuccessNumberBinding.inflate(layoutInflater)
    }

    private fun loadContactImage() {
        Timber.d("AddedSuccessNumberDialogFragment: Loading contact image")
        try {
            binding.contactImage.loadImage(
                wearer.image?.url,
                DefaultIcons.getWatchModelDefaultProfileIcon(wearer.model)
            )
        } catch (e: Exception) {
            Timber.e(e, "AddedSuccessNumberDialogFragment: Error loading contact image")
            CrashlyticsLog.recordNonFatalError(e, "AddedSuccessNumberDialogFragment: Error loading contact image")
        }
    }

    private fun createDialog(): Dialog {
        Timber.d("AddedSuccessNumberDialogFragment: Creating dialog")
        return try {
            MaterialAlertDialogBuilder(requireContext())
                .setView(binding.root)
                .create()
        } catch (e: Exception) {
            Timber.e(e, "AddedSuccessNumberDialogFragment: Error creating dialog")
            CrashlyticsLog.recordNonFatalError(e, "AddedSuccessNumberDialogFragment: Error creating dialog")
            throw e
        }
    }

    private fun setupAcceptButton() {
        Timber.d("AddedSuccessNumberDialogFragment: Setting up accept button")
        try {
            binding.buttonAcept.setOnClickListener {
                Timber.d("AddedSuccessNumberDialogFragment: Accept button clicked")
                dismiss()
            }
        } catch (e: Exception) {
            Timber.e(e, "AddedSuccessNumberDialogFragment: Error setting up accept button")
            CrashlyticsLog.recordNonFatalError(e, "AddedSuccessNumberDialogFragment: Error setting up accept button")
        }
    }
}