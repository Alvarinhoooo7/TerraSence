package com.sosmartlabs.momo.utils.ui.timepicker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.button.MaterialButton
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.utils.CustomLocalTime
import com.sosmartlabs.momo.utils.ui.timepicker.simple.SimpleTimePickerFragment.Companion.FROM_STATE
import com.sosmartlabs.momo.utils.ui.timepicker.simple.SimpleTimePickerFragment.Companion.TO_STATE
import com.sosmartlabs.momo.utils.ui.timepicker.simple.SimpleTimePickerListener
import com.sosmartlabs.momo.utils.ui.timepicker.simple.TimePickerViewPagerAdapter
import timber.log.Timber

/**
 * Select FROM and TO time date. Fragment or Activity holder must implement [TwoStatesTimePickerListener]
 */
class TwoStatesTimePickerDialog : DialogFragment(), SimpleTimePickerListener {

    private lateinit var currentFromLocalTime: CustomLocalTime
    private lateinit var currentToLocalTime: CustomLocalTime

    companion object{
        const val FROM_HOUR = "FROM_HOUR"
        const val FROM_MINUTE = "FROM_MINUTE"

        const val TO_HOUR = "TO_HOUR"
        const val TO_MINUTE = "TO_MINUTE"

        fun newInstance(currentFromLocalTime: CustomLocalTime, currentToLocalTime: CustomLocalTime): TwoStatesTimePickerDialog {
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

        currentFromLocalTime = CustomLocalTime.of(fromHour, fromMinute)
        currentToLocalTime = CustomLocalTime.of(toHour, toMinute)
        Timber.d("onCreate: $currentFromLocalTime - $currentToLocalTime")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        Timber.d("onCreateView: ")
        return inflater.inflate(R.layout.dialog_time_picker_to_from, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated: ")

        // Setup current data
        val fromTitle = requireContext().getText(R.string.from) as String
        val toTitle = requireContext().getText(R.string.to) as String

        val timePickersData = listOf<Pair<String, CustomLocalTime>>(
            Pair(fromTitle, currentFromLocalTime),
            Pair(toTitle, currentToLocalTime)
        )

        val vp_dialog_time_picker_to_from_container = view.findViewById<ViewPager2>(R.id.vp_dialog_time_picker_to_from_container)
        val ty_dialog_time_picker_to_from_selector = view.findViewById<TabLayout>(R.id.ty_dialog_time_picker_to_from_selector)
        val bt_dialog_time_picker_to_from_cancel = view.findViewById<MaterialButton>(R.id.bt_dialog_time_picker_to_from_cancel)
        val bt_dialog_time_picker_to_from_ok = view.findViewById<MaterialButton>(R.id.bt_dialog_time_picker_to_from_ok)

        // setup Time Picker and adapter
        val viewPagerAdapter = TimePickerViewPagerAdapter(this, timePickersData)
        vp_dialog_time_picker_to_from_container.adapter = viewPagerAdapter
        vp_dialog_time_picker_to_from_container.isUserInputEnabled = false

        val tabLayoutMediator = TabLayoutMediator(ty_dialog_time_picker_to_from_selector,
                vp_dialog_time_picker_to_from_container) { tab, position ->
            Timber.d("onConfigureTab")
            tab.text = timePickersData[position].first
        }
        tabLayoutMediator.attach()

        // setup buttons
        bt_dialog_time_picker_to_from_cancel.setOnClickListener {
            dismiss()
        }

        bt_dialog_time_picker_to_from_ok.setOnClickListener {
            Timber.d("onViewCreated: ")
            val from = currentFromLocalTime
            val to = currentToLocalTime
            Timber.d("onViewCreated: $from - $to")
            if(from.isBefore(to)){
                val listener = requireParentFragment() as TwoStatesTimePickerListener
                listener.onNewTimeStatesSelected(from, to)
                dismiss()
            }else{
                Toast.makeText(requireContext(), R.string.to_from_incorrect, Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onTimeChanged(time: CustomLocalTime, state: String) {
        Timber.d("onTimeChanged: $time - $state")
        when(state){
            FROM_STATE -> {currentFromLocalTime = time}
            TO_STATE -> {currentToLocalTime = time}
            else ->{
                Timber.e( "onTimeChanged: This state does not exits!")}
        }
    }
}