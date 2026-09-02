package com.sosmartlabs.momo.review

import com.sosmartlabs.momo.sharedprefs.SharedPrefs
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReviewPromptRepository @Inject constructor(
    private val sharedPrefs: SharedPrefs
) {

    companion object {
        private const val FEEDBACK_KEY_RUN_COUNT = "FEEDBACK_KEY_RUN_COUNT" // How many times the app has been opened. It restarts after dismissed review.
        private const val FEEDBACK_KEY_USER_ACTIONS = "FEEDBACK_KEY_USER_ACTIONS" // How many positive actions the user has performed
        private const val FEEDBACK_KEY_HAS_REVIEWED = "FEEDBACK_KEY_HAS_REVIEWED" // User reviewed the app with the dialog
        private const val FEEDBACK_KEY_POSITIVE_REVIEW = "FEEDBACK_KEY_POSITIVE_REVIEW" // User has positive review of app
        private const val FEEDBACK_KEY_VIDEOCALL_GREAT = "FEEDBACK_KEY_VIDEOCALL_GREAT" // User has had a great videocall experience
        private const val FEEDBACK_KEY_NPS_PROMOTER = "FEEDBACK_KEY_NPS_PROMOTER" // User rated 9 or 10 on the NPS survey (one-shot, consumed on next Play Review launch)
    }

    fun incrementRunCount() {
        val previousRunCount = sharedPrefs.getInt(FEEDBACK_KEY_RUN_COUNT)
        val updatedRunCount = previousRunCount + 1
        sharedPrefs.putInt(FEEDBACK_KEY_RUN_COUNT, updatedRunCount)
        Timber.d(
            "ReviewPromptRepository: incrementRunCount previous=%d updated=%d",
            previousRunCount,
            updatedRunCount
        )
    }

    fun recordPositiveUserAction() {
        val previousUserActions = sharedPrefs.getInt(FEEDBACK_KEY_USER_ACTIONS)
        val updatedUserActions = previousUserActions + 1
        sharedPrefs.putInt(FEEDBACK_KEY_USER_ACTIONS, updatedUserActions)
        Timber.d(
            "ReviewPromptRepository: recordPositiveUserAction previous=%d updated=%d",
            previousUserActions,
            updatedUserActions
        )
    }

    fun setHasReviewed(flag: Boolean) {
        sharedPrefs.putBoolean(FEEDBACK_KEY_HAS_REVIEWED, flag)
        Timber.d("ReviewPromptRepository: setHasReviewed value=%s", flag)
    }

    fun setPositiveReview(flag: Boolean) {
        sharedPrefs.putBoolean(FEEDBACK_KEY_POSITIVE_REVIEW, flag)
        Timber.d("ReviewPromptRepository: setPositiveReview value=%s", flag)
    }

    fun setVideocallGreatFeedback(flag: Boolean) {
        sharedPrefs.putBoolean(FEEDBACK_KEY_VIDEOCALL_GREAT, flag)
        Timber.d("ReviewPromptRepository: setVideocallGreatFeedback value=%s", flag)
    }

    fun setNpsPromoterFeedback(flag: Boolean) {
        sharedPrefs.putBoolean(FEEDBACK_KEY_NPS_PROMOTER, flag)
        Timber.d("ReviewPromptRepository: setNpsPromoterFeedback value=%s", flag)
    }

    fun getPromptState(): ReviewPromptState {
        return ReviewPromptState(
            runCount = sharedPrefs.getInt(FEEDBACK_KEY_RUN_COUNT),
            userActions = sharedPrefs.getInt(FEEDBACK_KEY_USER_ACTIONS),
            hasReviewed = sharedPrefs.getBoolean(FEEDBACK_KEY_HAS_REVIEWED),
            positiveReview = sharedPrefs.getBoolean(FEEDBACK_KEY_POSITIVE_REVIEW),
            videocallGreatFeedback = sharedPrefs.getBoolean(FEEDBACK_KEY_VIDEOCALL_GREAT),
            npsPromoterFeedback = sharedPrefs.getBoolean(FEEDBACK_KEY_NPS_PROMOTER),
        )
    }
}
