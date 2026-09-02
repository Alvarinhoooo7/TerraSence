package com.sosmartlabs.momo.review

import android.app.Activity
import android.content.DialogInterface
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.animation.AnimationUtils
import android.widget.EditText
import android.widget.ImageView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.google.android.play.core.review.ReviewManagerFactory
import com.google.firebase.analytics.analytics
import com.google.firebase.analytics.logEvent
import com.google.firebase.Firebase
import com.parse.ParseObject
import com.parse.ParseUser
import com.sosmartlabs.momo.R
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.firebase.FirebaseRemoteConfigRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import kotlin.math.max

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val reviewPromptRepository: ReviewPromptRepository
) : ViewModel() {

    private var activeReviewDialogs = 0
    private var isPlayReviewFlowActive = false

    private val _reviewDialogVisible = MutableLiveData(false)
    val reviewDialogVisible: LiveData<Boolean> = _reviewDialogVisible

    private fun updateReviewDialogVisible() {
        _reviewDialogVisible.postValue(activeReviewDialogs > 0 || isPlayReviewFlowActive)
    }

    private val feedbackMinimumRunCount: Int
        get() = FirebaseRemoteConfigRepository.feedbackMinimumRunCount

    private val feedbackMinimumUserActions: Int
        get() = FirebaseRemoteConfigRepository.feedbackMinimumUserActions

    fun showIfNeeded(activity: Activity) {
        val state = reviewPromptRepository.getPromptState()
        Timber.d("ReviewViewModel: showIfNeeded state=%s", buildLogContext(state))

        when {
            state.positiveReview || state.videocallGreatFeedback || state.npsPromoterFeedback -> {
                val trigger = when {
                    state.npsPromoterFeedback -> TRIGGER_NPS_PROMOTER
                    state.positiveReview -> TRIGGER_POSITIVE_REVIEW
                    else -> TRIGGER_VIDEOCALL_GREAT_FEEDBACK
                }
                Timber.i(
                    "ReviewViewModel: launching Play Review flow trigger=%s state=%s",
                    trigger,
                    buildLogContext(state)
                )
                startReviewManagerFlow(activity, trigger, state)
            }
            matchesRequirements(state) -> {
                Timber.i("ReviewViewModel: showing review feeling dialog state=%s", buildLogContext(state))
                showReviewFeelingDialog(activity)
            }
            else -> {
                Timber.d(
                    "ReviewViewModel: skipping review prompt reason=%s state=%s",
                    getSkipReason(state),
                    buildLogContext(state)
                )
            }
        }
    }

    fun consumeNpsPromoterFlag(activity: Activity) {
        val state = reviewPromptRepository.getPromptState()
        if (!state.npsPromoterFeedback) {
            Timber.d("ReviewViewModel: consumeNpsPromoterFlag no flag set")
            return
        }
        Timber.i(
            "ReviewViewModel: launching Play Review from NPS promoter state=%s",
            buildLogContext(state)
        )
        startReviewManagerFlow(activity, TRIGGER_NPS_PROMOTER, state)
    }

    private fun buildLogContext(state: ReviewPromptState): String {
        return "${state.asLogContext()} minimumRunCount=$feedbackMinimumRunCount " +
            "minimumUserActions=$feedbackMinimumUserActions"
    }

    private fun matchesRequirements(state: ReviewPromptState): Boolean {
        if (state.hasReviewed) {
            return false
        }
        return state.runCount >= feedbackMinimumRunCount &&
            state.userActions >= feedbackMinimumUserActions
    }

    private fun getSkipReason(state: ReviewPromptState): String {
        return when {
            state.hasReviewed -> "already_reviewed"
            state.runCount < feedbackMinimumRunCount -> "insufficient_run_count"
            state.userActions < feedbackMinimumUserActions -> "insufficient_user_actions"
            else -> "unknown"
        }
    }

    /**
     * Guards a review dialog against a host that can no longer own a window.
     *
     * The prompt is triggered from `MainActivity.onResume`, which the platform runs *inside*
     * `ActivityThread.performResumeActivity`. A `BadTokenException` thrown there does not
     * surface as a dialog failure — it escapes as a fatal `RuntimeException: Unable to resume
     * activity`. A rapid pause/resume storm is enough to leave the token stale (see the
     * `CallActivity` permission loop this crash was reported alongside). Losing a review
     * prompt is harmless; taking the app down for it is not.
     */
    private fun AlertDialog.Builder.showOrNull(activity: Activity): AlertDialog? {
        if (activity.isFinishing || activity.isDestroyed) {
            Timber.w("ReviewViewModel: skipping review dialog, activity finishing/destroyed")
            return null
        }
        return try {
            show()
        } catch (e: WindowManager.BadTokenException) {
            Timber.w(e, "ReviewViewModel: skipping review dialog, window token invalid")
            CrashlyticsLog.log("ReviewViewModel: skipped review dialog, invalid window token")
            null
        } catch (e: WindowManager.InvalidDisplayException) {
            // Same synchronous addView() path as BadTokenException, seen on DeX / external
            // displays being torn down. A review prompt is never worth a crash.
            Timber.w(e, "ReviewViewModel: skipping review dialog, display invalid")
            CrashlyticsLog.log("ReviewViewModel: skipped review dialog, invalid display")
            null
        }
    }

    private fun showReviewFeelingDialog(activity: Activity) {
        val alert = AlertDialog.Builder(activity)
        alert.setCancelable(false)
        val inflater = LayoutInflater.from(activity)
        val dialogView: View = inflater.inflate(R.layout.dialog_review_feeling, null, false)
        alert.setView(dialogView)
        val dialog = alert.showOrNull(activity) ?: return
        dialog.setCanceledOnTouchOutside(false)
        trackReviewDialog(dialog)
        val buttonBad = dialogView.findViewById<ImageView>(R.id.button_bad)
        val buttonNeutral = dialogView.findViewById<ImageView>(R.id.button_neutral)
        val buttonGood = dialogView.findViewById<ImageView>(R.id.button_good)

        Timber.d("ReviewViewModel: review feeling dialog shown")

        buttonBad.setOnClickListener {
            Timber.i("ReviewViewModel: review feeling selected=bad")
            dialog.cancel()
            reviewPromptRepository.setHasReviewed(true)
            showFeedbackDialog(activity)
        }
        buttonNeutral.setOnClickListener {
            Timber.i("ReviewViewModel: review feeling selected=neutral")
            dialog.cancel()
            reviewPromptRepository.setHasReviewed(true)
            showFeedbackDialog(activity)
        }
        buttonGood.setOnClickListener {
            Timber.i("ReviewViewModel: review feeling selected=good")
            dialog.cancel()
            reviewPromptRepository.setHasReviewed(true)
            reviewPromptRepository.setPositiveReview(true)
            startReviewManagerFlow(
                activity = activity,
                trigger = "good_dialog_selection",
                state = reviewPromptRepository.getPromptState()
            )
        }
    }

    private fun showFeedbackDialog(activity: Activity) {
        val alert = AlertDialog.Builder(activity)
        val inflater = LayoutInflater.from(activity)
        val dialogView: View = inflater.inflate(R.layout.dialog_rate_feedback, null)
        alert.setView(dialogView)
        val editText = dialogView.findViewById<EditText>(R.id.dialog_rating_feedback)
        alert.setPositiveButton(R.string.button_send, null)
        alert.setNegativeButton(R.string.button_cancel) { _, _ ->
            Timber.d("ReviewViewModel: feedback dialog cancelled")
        }
        val dialog = alert.showOrNull(activity) ?: return
        trackReviewDialog(dialog)

        Timber.d("ReviewViewModel: feedback dialog shown")

        dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
            val feedback = editText.text.toString().trim()
            if (feedback.isEmpty()) {
                Timber.w("ReviewViewModel: feedback submission blocked because text is empty")
                val shake = AnimationUtils.loadAnimation(activity, R.anim.shake)
                editText.startAnimation(shake)
            } else {
                saveFeedback(feedback)
                dialog.dismiss()
                CoroutineScope(Dispatchers.Main).launch {
                    Toast.makeText(activity, R.string.dialog_feedback_thanks, Toast.LENGTH_SHORT).show()
                }
                Timber.i(
                    "ReviewViewModel: feedback submission accepted length=%d",
                    feedback.length
                )
            }
        }
        dialog.getButton(DialogInterface.BUTTON_NEGATIVE)
            .setTextColor(ContextCompat.getColor(activity, R.color.grey_600))
    }

    private fun saveFeedback(feedback: String) {
        val feed = ParseObject("Feedback")
        feed.put("feedback", feedback)
        val currentUser = ParseUser.getCurrentUser()
        currentUser?.let {
            feed.put("user", it)
        }
        feed.put("deviceType", "Android")

        Timber.d(
            "ReviewViewModel: saving feedback length=%d hasUser=%s",
            feedback.length,
            currentUser != null
        )

        feed.saveEventually {
            if (it != null) {
                Timber.e(it, "ReviewViewModel: failed to save feedback")
                CrashlyticsLog.recordNonFatalError(it, "ReviewViewModel: failed to save feedback")
            } else {
                Timber.i("ReviewViewModel: feedback saved successfully")
            }
        }
    }

    private fun startReviewManagerFlow(activity: Activity, trigger: String, state: ReviewPromptState) {
        isPlayReviewFlowActive = true
        updateReviewDialogVisible()
        val manager = ReviewManagerFactory.create(activity.applicationContext)
        Timber.d(
            "ReviewViewModel: requesting Play Review flow trigger=%s state=%s",
            trigger,
            buildLogContext(state)
        )
        val request = manager.requestReviewFlow()
        request.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                isPlayReviewFlowActive = false
                updateReviewDialogVisible()
                Timber.e(task.exception, "ReviewViewModel: Play Review request failed trigger=%s", trigger)
                task.exception?.let {
                    CrashlyticsLog.recordNonFatalError(it, "ReviewViewModel: Play Review request failed")
                }
                return@addOnCompleteListener
            }
            val reviewInfo = task.result
            Timber.d("ReviewViewModel: Play Review request succeeded trigger=%s", trigger)
            val flow = manager.launchReviewFlow(activity, reviewInfo)
            if (trigger == TRIGGER_NPS_PROMOTER && state.npsPromoterFeedback) {
                reviewPromptRepository.setNpsPromoterFeedback(false)
            }
            flow.addOnCompleteListener { flowTask ->
                isPlayReviewFlowActive = false
                updateReviewDialogVisible()
                Timber.i(
                    "ReviewViewModel: Play Review flow finished trigger=%s isSuccessful=%s isComplete=%s",
                    trigger,
                    flowTask.isSuccessful,
                    flowTask.isComplete
                )
                Firebase.analytics.logEvent("review_manager_android") {
                    param("trigger", trigger)
                    param("is_successful", flowTask.isSuccessful.toString())
                    param("is_complete", flowTask.isComplete.toString())
                }
            }
        }
    }

    private fun trackReviewDialog(dialog: AlertDialog) {
        activeReviewDialogs++
        updateReviewDialogVisible()
        dialog.setOnDismissListener {
            activeReviewDialogs = max(0, activeReviewDialogs - 1)
            updateReviewDialogVisible()
        }
    }

    private companion object {
        const val TRIGGER_POSITIVE_REVIEW = "positive_review"
        const val TRIGGER_VIDEOCALL_GREAT_FEEDBACK = "videocall_great_feedback"
        const val TRIGGER_NPS_PROMOTER = "nps_promoter"
    }
}
