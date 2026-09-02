package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import com.google.android.material.tabs.TabLayoutMediator
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.DialogTimePickerToFromBinding
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.SimpleTimePickerFragment.Companion.FROM_STATE
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.SimpleTimePickerFragment.Companion.TO_STATE
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.SimpleTimePickerListener
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.TimePickerViewPagerAdapter
import timber.log.Timber
import java.time.LocalTime

/**
 * Select FROM and TO time date. Fragment or Activity holder must implement [TwoStatesTimePickerListener]
 */
class TwoStatesTimePickerDialog : DialogFragment(), SimpleTimePickerListener {

    private lateinit var currentFromLocalTime: LocalTime
    private lateinit var currentToLocalTime: LocalTime

    private lateinit var binding: DialogTimePickerToFromBinding

    companion object{
        const val FROM_HOUR = "FROM_HOUR"
        const val FROM_MINUTE = "FROM_MINUTE"

        const val TO_HOUR = "TO_HOUR"
        const val TO_MINUTE = "TO_MINUTE"

        fun newInstance(currentFromLocalTime: LocalTime, currentToLocalTime: LocalTime): TwoStatesTimePickerDialog {
            Timber.d("newInstance: ")
            val fragment = TwoStatesTimePickerDialog()
            val bundle = Bundle()
            bundle.putInt(FROM_HOUR, currentFromLocalTime.hour)
            bundle.putInt(FROM_MINUTE, currentFromLocalTime.minute)

            bundle.putInt(TO_HOUR, currentToLocalTime.hour)
            bundle.putInt(TO_MINUTE, currentToLocalTime.minute)
            fragment.arguments = bundle
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("onCreate")
        val fromHour = requireArguments().getInt(FROM_HOUR)
        val fromMinute = requireArguments().getInt(FROM_MINUTE)
        val toHour = requireArguments().getInt(TO_HOUR)
        val toMinute = requireArguments().getInt(TO_MINUTE)

        currentFromLocalTime = LocalTime.of(fromHour, fromMinute)
        currentToLocalTime = LocalTime.of(toHour, toMinute)
        Timber.d("onCreate: $currentFromLocalTime - $currentToLocalTime")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        Timber.d("onCreateView: ")
        binding = DialogTimePickerToFromBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated: ")

        // Setup current data
        val fromTitle = requireContext().getText(R.string.from)
        val toTitle = requireContext().getText(R.string.to)

        val timePickersData = listOf(
            Pair(fromTitle, currentFromLocalTime),
            Pair(toTitle, currentToLocalTime),
        )

        with(binding) {
            // setup Time Picker and adapter
            val viewPagerAdapter = TimePickerViewPagerAdapter(this@TwoStatesTimePickerDialog, timePickersData)
            with(vpDialogTimePickerToFromContainer) {
                adapter = viewPagerAdapter
                isUserInputEnabled = false
            }

            val tabLayoutMediator = TabLayoutMediator(tyDialogTimePickerToFromSelector,
                vpDialogTimePickerToFromContainer) { tab, position ->
                Timber.d("onConfigureTab")
                tab.text = timePickersData[position].first
            }
            tabLayoutMediator.attach()

            // setup buttons
            btDialogTimePickerToFromCancel.setOnClickListener {
                dismiss()
            }

            btDialogTimePickerToFromOk.setOnClickListener {
                Timber.d("onViewCreated: ")
                val from = currentFromLocalTime
                val to = currentToLocalTime
                Timber.d("onViewCreated: $from - $to")
                if(from < to){
                    val listener = requireParentFragment() as TwoStatesTimePickerListener
                    listener.onNewTimeStatesSelected(from, to)
                    dismiss()
                }else{
                    Toast.makeText(requireContext(), R.string.to_from_incorrect, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onTimeChanged(time: LocalTime, state: String) {
        Timber.d("onTimeChanged: $time - $state")
        when(state){
            FROM_STATE -> {currentFromLocalTime = time}
            TO_STATE -> {currentToLocalTime = time}
            else ->{
                Timber.e( "onTimeChanged: This state does not exits!")}
        }
    }
}