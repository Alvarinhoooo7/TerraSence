package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.ui

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import com.sosmartlabs.momotabletpadres.databinding.DialogTimelimitBinding
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class TimeLimitPickerDialogFragment(private val initialLimit: Int): DialogFragment() {

    interface Listener {
        fun onLimitTimeSet(limit: Int)
    }

    var listener: Listener? = null

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Timber.d("TimeLimitPickerDialogFragment: Creating time limit picker dialog")
        return AlertDialog.Builder(requireContext()).apply {
            setView(getViewBinding().root)
            setCancelable(true)
        }.create()
    }

    private fun getViewBinding(): DialogTimelimitBinding {
        Timber.d("TimeLimitPickerDialogFragment: Setting up time limit picker view")
        return DialogTimelimitBinding.inflate(LayoutInflater.from(requireContext())).apply {
            val hours = TimeUnit.SECONDS.toHours(initialLimit.toLong()).toInt()
            val minutes = TimeUnit.SECONDS.toMinutes(
                initialLimit - TimeUnit.HOURS.toSeconds(hours.toLong())).toInt()
            
            Timber.d("TimeLimitPickerDialogFragment: Initializing with $hours hours and $minutes minutes")
            
            with(npHour) {
                minValue = 0
                maxValue = 23
                value = hours
            }

            with(npMinute) {
                minValue = 0
                maxValue = 3
                displayedValues = arrayOf("00", "15", "30", "45")
                wrapSelectorWheel = true
                value = minutes / 15
            }

            acceptPickers.setOnClickListener {
                val limit = TimeUnit.HOURS.toSeconds(npHour.value.toLong()) +
                        TimeUnit.MINUTES.toSeconds((npMinute.value * 15).toLong())
                Timber.d("TimeLimitPickerDialogFragment: User selected time limit of $limit seconds")
                if (limit != 0L) {
                    listener?.onLimitTimeSet(limit.toInt())
                    Timber.d("TimeLimitPickerDialogFragment: Time limit set and listener notified")
                } else {
                    Timber.d("TimeLimitPickerDialogFragment: Ignoring zero time limit")
                }
                dismiss()
            }
        }
    }
}