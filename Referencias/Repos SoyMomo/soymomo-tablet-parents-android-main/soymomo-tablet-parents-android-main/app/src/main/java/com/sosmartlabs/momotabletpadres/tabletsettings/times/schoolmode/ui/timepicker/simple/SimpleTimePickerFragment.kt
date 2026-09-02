package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.sosmartlabs.momotabletpadres.databinding.FragmentTimePickerBinding
import timber.log.Timber
import java.time.LocalTime

class SimpleTimePickerFragment : Fragment() {

    companion object{
        const val TIME_HOUR = "TIME_HOUR"
        const val TIME_MINUTE = "TIME_MINUTE"
        const val STATE = "STATE"
        const val FROM_STATE = "FROM_STATE"
        const val TO_STATE = "TO_STATE"

        fun newInstance(time: LocalTime, state: String): SimpleTimePickerFragment {
            Timber.d("newInstance: ")
            val fragment = SimpleTimePickerFragment()
            val bundle = Bundle()
            bundle.putInt(TIME_HOUR, time.hour)
            bundle.putInt(TIME_MINUTE, time.minute)
            bundle.putString(STATE, state)
            fragment.arguments = bundle
            return fragment
        }
    }

    lateinit var time: LocalTime
    lateinit var state: String

    lateinit var binding: FragmentTimePickerBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("onCreate: ")
        val timeHour = requireArguments().getInt(TIME_HOUR)
        val timeMinute = requireArguments().getInt(TIME_MINUTE)
        this.state = requireArguments().getString(STATE)!!
        this.time = LocalTime.of(timeHour, timeMinute)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        binding = FragmentTimePickerBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated: ")
        with(binding.tpFragmentTimePicker) {
            hour = time.hour
            minute = time.minute
            setIs24HourView(true)

            val listener = requireParentFragment() as SimpleTimePickerListener
            setOnTimeChangedListener { _, hourOfDay, minute ->
                Timber.d("onViewCreated: hour $hourOfDay $minute")
                val currentLocalTime = LocalTime.of(hourOfDay, minute)
                listener.onTimeChanged(currentLocalTime, state)
            }
        }
    }
}