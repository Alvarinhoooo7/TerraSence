package com.sosmartlabs.momo.videocall.model

import com.parse.ParseException
import com.parse.ParseQuery
import com.parse.ParseUser
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.*
import javax.inject.Inject

/**
 * Class for interacting with videocall feedback in the Parse database
 */
class VideocallFeedbackRepository @Inject constructor() {

    /**
     * Creates a new Videocall feedback
     * @param user User associated with the videocall
     * @param watch Wearer for the videocall
     * @param caller Who made the call
     * @param room Room for the call
     * @param uuid UUID for the call
     * @param success Whether the videocall was successful or not
     */
    fun createFeedback(
        user: ParseUser,
        watch: Wearer,
        caller: String,
        room: String,
        uuid: UUID,
        success: Boolean
    ): VideocallFeedback {
        Timber.d("VideocallFeedbackRepository: Creating feedback for user=${user.objectId}, watch=${watch.objectId}, caller=$caller, room=$room, uuid=$uuid, success=$success")
        CrashlyticsLog.log("VideocallFeedbackRepository: Creating feedback for user=${user.objectId}, watch=${watch.objectId}, caller=$caller, room=$room, uuid=$uuid, success=$success")
        return VideocallFeedback().apply {
            try {
                this.user = user
                this.watch = watch
                this.caller = caller
                this.room = room
                this.os = "android"
                this.uuid = uuid.toString()
                this.sucess = success
                this.duration = 0
                save()
                Timber.d("VideocallFeedbackRepository: Feedback created and saved successfully for uuid=$uuid")
                CrashlyticsLog.log("VideocallFeedbackRepository: Feedback created and saved successfully for uuid=$uuid")
            } catch (e: Exception) {
                Timber.e(e, "VideocallFeedbackRepository: Error creating feedback for uuid=$uuid")
                CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error creating feedback for uuid=$uuid")
                throw e
            }
        }
    }

    /**
     * Gets a Videocall feedback with the given UUID
     * @param uuid UUID for the videocall
     * @return VideocallFeedback with the given UUID
     */
    fun getFeedback(uuid: UUID): VideocallFeedback? {
        Timber.d("VideocallFeedbackRepository: Querying feedback for uuid=$uuid")
        CrashlyticsLog.log("VideocallFeedbackRepository: Querying feedback for uuid=$uuid")
        return try {
            val feedback = ParseQuery.getQuery(VideocallFeedback::class.java)
                .whereEqualTo("uuid", uuid.toString())
                .first
            if (feedback != null) {
                Timber.d("VideocallFeedbackRepository: Feedback found for uuid=$uuid")
                CrashlyticsLog.log("VideocallFeedbackRepository: Feedback found for uuid=$uuid")
            } else {
                Timber.w("VideocallFeedbackRepository: No feedback found for uuid=$uuid")
                CrashlyticsLog.log("VideocallFeedbackRepository: No feedback found for uuid=$uuid")
            }
            feedback
        } catch (e: ParseException) {
            Timber.e(e, "VideocallFeedbackRepository: Error querying feedback for uuid=$uuid")
            CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error querying feedback for uuid=$uuid")
            null
        }
    }

    /**
     * Indicates that the videocall for VideocallFeedback was successful
     * @param feedback VideocallFeedback to indicate success
     */
    fun markSuccessVideocall(feedback: VideocallFeedback) {
        Timber.d("VideocallFeedbackRepository: Marking feedback as success for uuid=${feedback.uuid}")
        CrashlyticsLog.log("VideocallFeedbackRepository: Marking feedback as success for uuid=${feedback.uuid}")
        try {
            feedback.sucess = true
            feedback.save()
            Timber.d("VideocallFeedbackRepository: Feedback marked as success and saved for uuid=${feedback.uuid}")
            CrashlyticsLog.log("VideocallFeedbackRepository: Feedback marked as success and saved for uuid=${feedback.uuid}")
        } catch (e: Exception) {
            Timber.e(e, "VideocallFeedbackRepository: Error marking feedback as success for uuid=${feedback.uuid}")
            CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error marking feedback as success for uuid=${feedback.uuid}")
        }
    }

    /**
     * Adds a duration to a VideocallFeedback
     * @param feedback VideocallFeedback to rate
     * @param duration Duration of the videocall
     */
    fun addDurationToFeedback(feedback: VideocallFeedback, duration: Int) {
        Timber.d("VideocallFeedbackRepository: Adding duration=$duration to feedback uuid=${feedback.uuid}")
        CrashlyticsLog.log("VideocallFeedbackRepository: Adding duration=$duration to feedback uuid=${feedback.uuid}")
        synchronized(feedback) {
            try {
                feedback.duration = duration
                feedback.save()
                Timber.d("VideocallFeedbackRepository: Duration added and feedback saved for uuid=${feedback.uuid}")
                CrashlyticsLog.log("VideocallFeedbackRepository: Duration added and feedback saved for uuid=${feedback.uuid}")
            } catch (e: Exception) {
                Timber.e(e, "VideocallFeedbackRepository: Error adding duration to feedback uuid=${feedback.uuid}")
                CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error adding duration to feedback uuid=${feedback.uuid}")
            }
        }
    }

    /**
     * Adds a rating to a VideocallFeedback
     * @param feedback VideocallFeedback to rate
     * @param rating Rating for the call
     */
    fun addRatingToFeedback(feedback: VideocallFeedback, rating: Int) {
        Timber.d("VideocallFeedbackRepository: Adding rating=$rating to feedback uuid=${feedback.uuid}")
        CrashlyticsLog.log("VideocallFeedbackRepository: Adding rating=$rating to feedback uuid=${feedback.uuid}")
        synchronized(feedback) {
            try {
                feedback.feedback = rating
                feedback.save()
                Timber.d("VideocallFeedbackRepository: Rating added and feedback saved for uuid=${feedback.uuid}")
                CrashlyticsLog.log("VideocallFeedbackRepository: Rating added and feedback saved for uuid=${feedback.uuid}")
            } catch (e: Exception) {
                Timber.e(e, "VideocallFeedbackRepository: Error adding rating to feedback uuid=${feedback.uuid}")
                CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error adding rating to feedback uuid=${feedback.uuid}")
            }
        }
    }

    /**
     * Obtains the videocall feedback for a given user
     * @param user User from obtaining feedback
     * @param since Oldest date that will be considered for fetching videocalls
     * @return Feedback obtained for the user
     */
    fun getUserFeedback(user: ParseUser, since: Date): List<VideocallFeedback> {
        Timber.d("VideocallFeedbackRepository: Querying user feedback for user=${user.objectId} since=$since")
        CrashlyticsLog.log("VideocallFeedbackRepository: Querying user feedback for user=${user.objectId} since=$since")
        return try {
            val feedbackList = ParseQuery.getQuery(VideocallFeedback::class.java)
                .whereEqualTo("user", user)
                .whereGreaterThanOrEqualTo("createdAt", since)
                .orderByDescending("createdAt")
                .find()
            Timber.d("VideocallFeedbackRepository: Found ${feedbackList.size} feedback(s) for user=${user.objectId} since=$since")
            CrashlyticsLog.log("VideocallFeedbackRepository: Found ${feedbackList.size} feedback(s) for user=${user.objectId} since=$since")
            feedbackList
        } catch (e: Exception) {
            Timber.e(e, "VideocallFeedbackRepository: Error querying user feedback for user=${user.objectId} since=$since")
            CrashlyticsLog.recordNonFatalError(e, "VideocallFeedbackRepository: Error querying user feedback for user=${user.objectId} since=$since")
            emptyList()
        }
    }
}
