package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple

import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.SimpleTimePickerFragment.Companion.FROM_STATE
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.ui.timepicker.simple.SimpleTimePickerFragment.Companion.TO_STATE
import timber.log.Timber
import java.time.LocalTime

/**
 * Adapter to handle FROM and TO Fragments
 */
class TimePickerViewPagerAdapter(fragment: Fragment, private val initialData: List<Pair<CharSequence, LocalTime>>):
        FragmentStateAdapter(fragment) {

    private var fromLocalTime: LocalTime = initialData[0].second
    private var toLocalTime: LocalTime =  initialData[1].second

    private val fromFragment = SimpleTimePickerFragment.newInstance(fromLocalTime, FROM_STATE)
    private val toFragment = SimpleTimePickerFragment.newInstance(toLocalTime, TO_STATE)

    override fun getItemCount(): Int {
        return initialData.size
    }

    override fun createFragment(position: Int): Fragment {
        Timber.d("createFragment")
        return when(position){
            0 -> {fromFragment}
            1 -> {toFragment}
            else -> {
                Timber.e("createFragment: Error, there is no this case")
                throw Exception("createFragment: Error, there is no this case $position, just two positions!")
            }
        }
    }
}