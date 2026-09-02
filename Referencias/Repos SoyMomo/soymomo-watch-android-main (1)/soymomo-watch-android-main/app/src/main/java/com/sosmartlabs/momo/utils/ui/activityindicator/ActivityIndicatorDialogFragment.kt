package com.sosmartlabs.momo.utils.ui.activityindicator

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentManager
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.databinding.DialogFragmentActivityIndicatorBinding
import timber.log.Timber

class ActivityIndicatorDialogFragment : DialogFragment(R.layout.dialog_fragment_activity_indicator) {

    private lateinit var binding: DialogFragmentActivityIndicatorBinding

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Timber.d("ActivityIndicatorDialogFragment - onCreateView")
        binding = DialogFragmentActivityIndicatorBinding.inflate(inflater)
        dialog?.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        return binding.root
    }

    companion object {
        private var instance: ActivityIndicatorDialogFragment? = null
        private const val INDICATOR_DIALOG_TAG = "ActivityIndicatorDialogFragment"

        fun show(supportFragmentManager: FragmentManager) {
            if (supportFragmentManager.isDestroyed || supportFragmentManager.isStateSaved) {
                Timber.d("ActivityIndicatorDialogFragment - Cannot show dialog (FragmentManager unavailable)")
                return
            }

            hide()
            instance = ActivityIndicatorDialogFragment().apply {
                show(supportFragmentManager, INDICATOR_DIALOG_TAG)
                isCancelable = true
            }
            Timber.d("ActivityIndicatorDialogFragment - Showing as cancellable")
        }

        fun showNonCancellable(supportFragmentManager: FragmentManager) {
            if (supportFragmentManager.isDestroyed || supportFragmentManager.isStateSaved) {
                Timber.d("ActivityIndicatorDialogFragment - Cannot show dialog (FragmentManager unavailable)")
                return
            }

            hide()
            instance = ActivityIndicatorDialogFragment().apply {
                show(supportFragmentManager, INDICATOR_DIALOG_TAG)
                isCancelable = false
            }
            Timber.d("ActivityIndicatorDialogFragment - Showing as non-cancellable")
        }

        fun hide() {
            try {
                if (instance?.isAdded == true && instance?.fragmentManager != null) {
                    instance?.dismissAllowingStateLoss()
                    Timber.d("ActivityIndicatorDialogFragment - Dialog dismissed")
                }
            } catch (e: Exception) {
                Timber.e(e, "ActivityIndicatorDialogFragment - Error dismissing dialog")
            } finally {
                instance = null
            }
        }

        fun isShown(): Boolean {
            val isCurrentlyShown = instance?.isAdded == true
            Timber.d("ActivityIndicatorDialogFragment - Dialog currently shown: $isCurrentlyShown")
            return isCurrentlyShown
        }
    }
}