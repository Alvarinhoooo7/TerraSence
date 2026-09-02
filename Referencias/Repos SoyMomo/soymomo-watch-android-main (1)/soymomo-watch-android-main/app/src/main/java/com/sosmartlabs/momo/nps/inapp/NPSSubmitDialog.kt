package com.sosmartlabs.momo.nps.inapp

import android.content.DialogInterface
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.sosmartlabs.momo.databinding.NpsSubmitDialogFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.review.ReviewViewModel
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class NPSSubmitDialog : DialogFragment() {
    private lateinit var binding: NpsSubmitDialogFragmentBinding
    private val reviewViewModel: ReviewViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("NPSSubmitDialog: onCreateView - inflating layout")
        CrashlyticsLog.log("NPSSubmitDialog: onCreateView - inflating layout")
        binding = NpsSubmitDialogFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        Timber.d("NPSSubmitDialog: onViewCreated - view created, setting up dialog appearance and listeners")
        CrashlyticsLog.log("NPSSubmitDialog: onViewCreated - view created, setting up dialog appearance and listeners")
        super.onViewCreated(view, savedInstanceState)
        setupDialogAppearance()
        setupClickListeners()
    }

    private fun setupDialogAppearance() {
        Timber.d("NPSSubmitDialog: setupDialogAppearance - setting transparent background")
        CrashlyticsLog.log("NPSSubmitDialog: setupDialogAppearance - setting transparent background")
        try {
            dialog?.window?.apply {
                setLayout(MATCH_PARENT, WRAP_CONTENT)
                setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
                setDimAmount(DIM_AMOUNT)
            }
            Timber.d("NPSSubmitDialog: setupDialogAppearance - background set successfully")
            CrashlyticsLog.log("NPSSubmitDialog: setupDialogAppearance - background set successfully")
        } catch (e: Exception) {
            Timber.e(e, "NPSSubmitDialog: setupDialogAppearance - error setting background")
            CrashlyticsLog.recordNonFatalError(e, "NPSSubmitDialog: setupDialogAppearance - error setting background")
        }
    }

    private fun setupClickListeners() {
        Timber.d("NPSSubmitDialog: setupClickListeners - setting up submit button listener")
        CrashlyticsLog.log("NPSSubmitDialog: setupClickListeners - setting up submit button listener")
        binding.submit.setOnClickListener {
            Timber.d("NPSSubmitDialog: Submit button clicked, dismissing dialog")
            CrashlyticsLog.log("NPSSubmitDialog: Submit button clicked, dismissing dialog")
            try {
                dialog?.dismiss()
                Timber.d("NPSSubmitDialog: Dialog dismissed successfully")
                CrashlyticsLog.log("NPSSubmitDialog: Dialog dismissed successfully")
            } catch (e: Exception) {
                Timber.e(e, "NPSSubmitDialog: Error dismissing dialog")
                CrashlyticsLog.recordNonFatalError(e, "NPSSubmitDialog: Error dismissing dialog")
            }
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        activity?.let { reviewViewModel.consumeNpsPromoterFlag(it) }
    }

    companion object {
        private const val DIM_AMOUNT = 0.6f
    }
}
