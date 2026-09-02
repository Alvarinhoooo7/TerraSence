package com.sosmartlabs.momo.nps.subscription.ui

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import com.sosmartlabs.momo.databinding.SubscriptionNpsSubmitDialogFragmentBinding
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import androidx.core.graphics.drawable.toDrawable

@AndroidEntryPoint
class SubscriptionNpsSubmitDialog : DialogFragment() {

    private lateinit var binding: SubscriptionNpsSubmitDialogFragmentBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        Timber.d("SubscriptionNpsSubmitDialog: onCreateView")
        CrashlyticsLog.log("SubscriptionNpsSubmitDialog: onCreateView")
        binding = SubscriptionNpsSubmitDialogFragmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupDialogAppearance()
        setupClickListeners()
    }

    override fun show(manager: FragmentManager, tag: String?) {
        try {
            val ft: FragmentTransaction = manager.beginTransaction()
            ft.add(this, tag)
            ft.commit()
        } catch (e: IllegalStateException) {
            Timber.e(e, "SubscriptionNpsSubmitDialog: failed to show dialog")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsSubmitDialog: failed to show")
        }
    }

    private fun setupDialogAppearance() {
        try {
            dialog?.window?.apply {
                setLayout(MATCH_PARENT, WRAP_CONTENT)
                setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
                setDimAmount(DIM_AMOUNT)
            }
        } catch (e: Exception) {
            Timber.e(e, "SubscriptionNpsSubmitDialog: error setting appearance")
            CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsSubmitDialog: setupDialogAppearance failed")
        }
    }

    private fun setupClickListeners() {
        binding.submit.setOnClickListener {
            Timber.d("SubscriptionNpsSubmitDialog: close clicked")
            CrashlyticsLog.log("SubscriptionNpsSubmitDialog: close clicked")
            try {
                dialog?.dismiss()
            } catch (e: Exception) {
                Timber.e(e, "SubscriptionNpsSubmitDialog: error dismissing")
                CrashlyticsLog.recordNonFatalError(e, "SubscriptionNpsSubmitDialog: dismiss failed")
            }
        }
    }

    companion object {
        private const val DIM_AMOUNT = 0.6f
    }
}
