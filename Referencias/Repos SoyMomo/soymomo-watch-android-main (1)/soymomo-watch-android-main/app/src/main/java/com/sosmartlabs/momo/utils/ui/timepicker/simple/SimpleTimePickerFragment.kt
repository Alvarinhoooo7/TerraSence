package com.sosmartlabs.momo.utils.ui.timepicker.simple

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TimePicker
import androidx.fragment.app.Fragment
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.CustomLocalTime
import timber.log.Timber

class SimpleTimePickerFragment : Fragment() {

    companion object{
        const val TIME_HOUR = "TIME_HOUR"
        const val TIME_MINUTE = "TIME_MINUTE"
        const val STATE = "STATE"
        const val FROM_STATE = "FROM_STATE"
        const val TO_STATE = "TO_STATE"

        fun newInstance(time: CustomLocalTime, state: String): SimpleTimePickerFragment {
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

    lateinit var time: CustomLocalTime
    lateinit var state: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Timber.d("onCreate: ")
        val timeHour = requireArguments().getInt(TIME_HOUR)
        val timeMinute = requireArguments().getInt(TIME_MINUTE)
        this.state = requireArguments().getString(STATE)!!
        this.time = CustomLocalTime.of(timeHour, timeMinute)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_time_picker, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated: ")
        val tp_fragment_time_picker = view.findViewById<TimePicker>(R.id.tp_fragment_time_picker)
        tp_fragment_time_picker.currentHour = time.hour
        tp_fragment_time_picker.currentMinute = time.minute
        tp_fragment_time_picker.setIs24HourView(true)

        val listener = requireParentFragment() as SimpleTimePickerListener
        tp_fragment_time_picker.setOnTimeChangedListener { view, hourOfDay, minute ->
            Timber.d("onViewCreated: hour $hourOfDay $minute")
            val currentLocalTime = CustomLocalTime.of(hourOfDay, minute)
            listener.onTimeChanged(currentLocalTime, state)
        }
    }
}