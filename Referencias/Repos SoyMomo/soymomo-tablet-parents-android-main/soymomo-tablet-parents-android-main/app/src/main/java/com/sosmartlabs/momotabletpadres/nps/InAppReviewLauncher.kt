package com.sosmartlabs.momotabletpadres.nps

import android.app.Activity
import androidx.core.os.bundleOf
import com.google.android.play.core.review.ReviewManagerFactory
import com.google.firebase.Firebase
import com.google.firebase.analytics.analytics
import timber.log.Timber

/**
 * Launches the Google Play In-App Review flow.
 *
 * Used for NPS promoters (score 9–10) so our happiest, most-validated users are
 * funneled to a public Play rating, while passives/detractors stay in the
 * private NPS feedback channel (their score + comment go to the backend, never
 * to the store).
 *
 * The Play API self-limits by quota, so calling this does not guarantee a card
 * is shown — that is expected and by design.
 */
object InAppReviewLauncher {

    fun launch(activity: Activity) {
        val manager = ReviewManagerFactory.create(activity)
        manager.requestReviewFlow().addOnCompleteListener { request ->
            if (!request.isSuccessful) {
                Timber.e(request.exception, "InAppReview requestReviewFlow failed")
                return@addOnCompleteListener
            }
            // requestReviewFlow resolves asynchronously, so the user may have left
            // by now. launchReviewFlow needs a live, foreground Activity — bail if
            // it's finishing or destroyed rather than acting on a dead Activity.
            if (activity.isFinishing || activity.isDestroyed) {
                Timber.d("InAppReview skipped — activity no longer valid")
                return@addOnCompleteListener
            }
            val flow = manager.launchReviewFlow(activity, request.result)
            flow.addOnCompleteListener { result ->
                Timber.d("InAppReview flow successful=${result.isSuccessful} complete=${result.isComplete}")
                Firebase.analytics.logEvent(
                    "review_manager_android",
                    bundleOf(
                        "is_successful" to result.isSuccessful,
                        "is_complete" to result.isComplete
                    )
                )
            }
        }
    }
}
