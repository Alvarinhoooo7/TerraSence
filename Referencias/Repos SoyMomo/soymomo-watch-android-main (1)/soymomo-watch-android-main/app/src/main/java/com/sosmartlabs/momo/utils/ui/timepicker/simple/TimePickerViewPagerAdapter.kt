package com.sosmartlabs.momo.utils.ui.timepicker.simple

import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.sosmartlabs.momo.utils.CustomLocalTime
import com.sosmartlabs.momo.utils.ui.timepicker.simple.SimpleTimePickerFragment.Companion.FROM_STATE
import com.sosmartlabs.momo.utils.ui.timepicker.simple.SimpleTimePickerFragment.Companion.TO_STATE
import timber.log.Timber

/**
 * Adapter to handle FROM and TO Fragments
 */
class TimePickerViewPagerAdapter(fragment: Fragment, private val initialData: List<Pair<String, CustomLocalTime>>):
        FragmentStateAdapter(fragment) {

    private var fromLocalTime: CustomLocalTime = initialData[0].second
    private var toLocalTime: CustomLocalTime =  initialData[1].second

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