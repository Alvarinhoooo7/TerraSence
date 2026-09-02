package com.sosmartlabs.momo.main.ui.dialog

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogInvalidWatchNumberBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.utils.PhoneNumberUtils
import com.sosmartlabs.momo.utils.ui.DefaultIcons
import com.sosmartlabs.momo.utils.ui.loadImage
import timber.log.Timber

class InvalidWatchNumberDialogFragment : DialogFragment() {

    private lateinit var binding: DialogInvalidWatchNumberBinding
    private lateinit var wearer: Wearer

    companion object {
        private const val ARG_WEARER = "wearer"

        fun newInstance(wearer: Wearer): InvalidWatchNumberDialogFragment {
            Timber.d("InvalidWatchNumberDialogFragment: Creating new instance")
            CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Creating new instance")
            return InvalidWatchNumberDialogFragment().apply {
                arguments = Bundle().apply {
                    putParcelable(ARG_WEARER, wearer)
                }
            }
        }
    }

    interface InvalidWatchNumberDialogListener {
        /**
         * Triggered when the user has confirmed that the contact must be saved
         */
        fun onNumberEnter(phone: String)

        /**
         * Triggered when the user has canceled add phone contact to smartwatch
         */
        fun onCancel()
    }

    /**
     * Listener for handling this dialog result
     */
    private var listener: InvalidWatchNumberDialogListener? = null

    fun setListener(listener: InvalidWatchNumberDialogListener) {
        Timber.d("InvalidWatchNumberDialogFragment: Setting dialog listener")
        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Setting dialog listener")
        this.listener = listener
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        if (listener == null) {
            listener = when {
                parentFragment is InvalidWatchNumberDialogListener ->
                    parentFragment as InvalidWatchNumberDialogListener
                context is InvalidWatchNumberDialogListener ->
                    context
                else -> null
            }
            if (listener == null) {
                val error = IllegalStateException("InvalidWatchNumberDialogListener not set")
                Timber.e(error, "InvalidWatchNumberDialogFragment: Missing listener")
                CrashlyticsLog.recordNonFatalError(error, "InvalidWatchNumberDialogFragment: Missing listener")
            }
        }
    }

    override fun onDetach() {
        listener = null
        super.onDetach()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("InvalidWatchNumberDialogFragment: onCreate()")
        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: onCreate()")
        wearer = arguments?.getParcelable(ARG_WEARER) ?: run {
            val error = IllegalStateException("Wearer argument is required")
            Timber.e(error, "InvalidWatchNumberDialogFragment: Missing wearer argument")
            CrashlyticsLog.recordNonFatalError(error, "InvalidWatchNumberDialogFragment: Missing wearer argument")
            throw error
        }
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("InvalidWatchNumberDialogFragment: Creating dialog")
        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Creating dialog")
        
        val dialogBuilder = MaterialAlertDialogBuilder(requireContext())
        binding = DialogInvalidWatchNumberBinding.inflate(layoutInflater)
        
        with(binding) {
            ccp.registerCarrierNumberEditText(contactPhone)
            loadImage()

            val watchModel = when (wearer.modelInt) {
                0 -> R.string.watch_model_original
                in 1..4 -> R.string.watch_model_h2o
                5 -> R.string.watch_model_space
                6 -> R.string.watch_model_space_2
                7 -> R.string.watch_model_space_lite
                8 -> R.string.watch_model_space_3
                else -> R.string.watch_model_original
            }
            
            typeWatch.text = getString(R.string.the_soy_momo_not_have_number, getString(watchModel))
            dialogBuilder.setView(root)
        }
        
        return dialogBuilder.create().apply {
            setOnShowListener {
                Timber.d("InvalidWatchNumberDialogFragment: Dialog shown")
                CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Dialog shown")
                
                with(binding) {
                    buttonAdd.setOnClickListener {
                        Timber.d("InvalidWatchNumberDialogFragment: Add button clicked")
                        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Add button clicked")
                        
                        val isPhoneValid = PhoneNumberUtils.isValidPhoneNumber(ccp)
                        if (isPhoneValid) {
                            Timber.d("InvalidWatchNumberDialogFragment: Valid phone number entered")
                            CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Valid phone number entered")
                            val currentListener = listener
                            if (currentListener != null) {
                                currentListener.onNumberEnter(ccp.fullNumberWithPlus)
                            } else {
                                Timber.e("InvalidWatchNumberDialogFragment: Listener missing on add click")
                                CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Listener missing on add click")
                            }
                            dismiss()
                        } else {
                            Timber.d("InvalidWatchNumberDialogFragment: Invalid phone number entered")
                            CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Invalid phone number entered")
                            contactPhoneInputLayout.error = getString(R.string.edittext_error_invalid_phone)
                        }
                    }

                    buttonLater.setOnClickListener {
                        Timber.d("InvalidWatchNumberDialogFragment: Later button clicked")
                        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Later button clicked")
                        val currentListener = listener
                        if (currentListener != null) {
                            currentListener.onCancel()
                        } else {
                            Timber.e("InvalidWatchNumberDialogFragment: Listener missing on cancel click")
                            CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Listener missing on cancel click")
                        }
                        dismiss()
                    }
                }
            }
        }
    }

    private fun loadImage() {
        Timber.d("InvalidWatchNumberDialogFragment: Loading wearer image")
        CrashlyticsLog.log("InvalidWatchNumberDialogFragment: Loading wearer image")
        binding.contactImage.loadImage(
            wearer.image?.url,
            DefaultIcons.getWatchModelDefaultProfileIcon(wearer.model)
        )
    }
}