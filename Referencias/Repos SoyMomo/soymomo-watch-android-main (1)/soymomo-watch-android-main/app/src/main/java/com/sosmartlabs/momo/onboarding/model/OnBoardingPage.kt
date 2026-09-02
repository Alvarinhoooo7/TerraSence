package com.sosmartlabs.momo.onboarding.model

import androidx.annotation.RawRes
import androidx.annotation.StringRes
import com.sosmartlabs.momo.R

/**
 * Represents a single page in the onboarding flow.
 *
 * @property animation The Lottie animation resource to display
 * @property titleRes String resource ID for the page title
 * @property textRes String resource ID for the page text
 * @property isLastPage Whether this is the final page in the flow
 */
data class OnBoardingPage(
    @RawRes val animation: Int,
    @StringRes val titleRes: Int,
    @StringRes val textRes: Int,
    val isLastPage: Boolean = false
) {
    companion object {
        /**
         * Returns the list of all onboarding pages in order.
         */
        fun getPages(): List<OnBoardingPage> = listOf(
            OnBoardingPage(
                animation = R.raw.onboarding_1,
                titleRes = R.string.tutorial_title_1,
                textRes = R.string.tutorial_text_1
            ),
            OnBoardingPage(
                animation = R.raw.onboarding_2,
                titleRes = R.string.tutorial_title_2,
                textRes = R.string.tutorial_text_2
            ),
            OnBoardingPage(
                animation = R.raw.onboarding_3,
                titleRes = R.string.tutorial_title_3,
                textRes = R.string.tutorial_text_3
            ),
            OnBoardingPage(
                animation = R.raw.onboarding_4,
                titleRes = R.string.tutorial_title_4,
                textRes = R.string.tutorial_text_4
            ),
            OnBoardingPage(
                animation = R.raw.onboarding_5,
                titleRes = R.string.tutorial_title_5,
                textRes = R.string.tutorial_text_5
            ),
            OnBoardingPage(
                animation = R.raw.onboarding_6,
                titleRes = R.string.tutorial_title_6,
                textRes = R.string.tutorial_text_6,
                isLastPage = true
            )
        )
    }
}
