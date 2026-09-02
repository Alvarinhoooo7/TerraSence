package com.sosmartlabs.momo.videocallhistory.ui

import androidx.recyclerview.widget.DiffUtil
import com.sosmartlabs.momo.videocall.model.VideocallFeedback

/**
 * Callback for detecting if the VideocallFeedback are the same or must be redrawn
 */
class VideocallFeedbackDiffCallback: DiffUtil.ItemCallback<VideocallFeedback>() {
    override fun areItemsTheSame(oldItem: VideocallFeedback, newItem: VideocallFeedback): Boolean {
        return oldItem.objectId == newItem.objectId
    }

    override fun areContentsTheSame(oldItem: VideocallFeedback,
                                    newItem: VideocallFeedback): Boolean {
        return oldItem.watch.name() == newItem.watch.name()
                && oldItem.createdAt == newItem.createdAt
                && oldItem.duration == newItem.duration
                && oldItem.sucess == newItem.sucess
                && oldItem.caller == newItem.caller
    }
}