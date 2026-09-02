package com.sosmartlabs.momo.review

data class ReviewPromptState(
    val runCount: Int,
    val userActions: Int,
    val hasReviewed: Boolean,
    val positiveReview: Boolean,
    val videocallGreatFeedback: Boolean,
    val npsPromoterFeedback: Boolean,
) {
    fun asLogContext(): String {
        return "runCount=$runCount userActions=$userActions hasReviewed=$hasReviewed " +
            "positiveReview=$positiveReview videocallGreatFeedback=$videocallGreatFeedback " +
            "npsPromoterFeedback=$npsPromoterFeedback"
    }
}
