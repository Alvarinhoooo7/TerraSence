package com.sosmartlabs.momo.lingo.domain

import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import com.sosmartlabs.momo.R

enum class LingoMilestoneKind(
    @DrawableRes val iconRes: Int,
    @ColorRes val colorRes: Int,
    @StringRes val labelRes: Int,
) {
    COMPLETED(
        R.drawable.ic_lingo_milestone_completed,
        R.color.lingoGreen,
        R.string.s_lingo_progress_milestone_completed,
    ),
    REVIEW(
        R.drawable.ic_lingo_milestone_review,
        R.color.lingoPurple,
        R.string.s_lingo_progress_milestone_review,
    ),
    CHALLENGE(
        R.drawable.ic_lingo_milestone_challenge,
        R.color.lingoYellow,
        R.string.s_lingo_progress_milestone_challenge,
    ),
}
