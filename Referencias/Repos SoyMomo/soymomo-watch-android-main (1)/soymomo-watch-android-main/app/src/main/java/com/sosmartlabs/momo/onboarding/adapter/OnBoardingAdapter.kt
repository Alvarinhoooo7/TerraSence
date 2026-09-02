package com.sosmartlabs.momo.onboarding.adapter

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.sosmartlabs.momo.onboarding.model.OnBoardingPage
import com.sosmartlabs.momo.onboarding.ui.OnBoardingFragment

/**
 * Adapter for the onboarding ViewPager2.
 * Uses FragmentStateAdapter for efficient fragment management.
 */
class OnBoardingAdapter(
    fragmentActivity: FragmentActivity,
    private val pages: List<OnBoardingPage>
) : FragmentStateAdapter(fragmentActivity) {

    override fun getItemCount(): Int = pages.size

    override fun createFragment(position: Int): Fragment {
        return OnBoardingFragment.newInstance(pages[position])
    }
}
