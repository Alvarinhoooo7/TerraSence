package com.sosmartlabs.momo.videocallhistory.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import com.sosmartlabs.momo.databinding.ItemVideoCallInfoBinding
import com.sosmartlabs.momo.videocall.model.VideocallFeedback

/**
 * Adapter for showing a VideocallFeedback list in a RecyclerView
 */
class VideocallFeedbackAdapter:
    ListAdapter<VideocallFeedback, VideocallFeedbackViewHolder>(VideocallFeedbackDiffCallback()) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VideocallFeedbackViewHolder {
        val context = parent.context
        return VideocallFeedbackViewHolder(
            ItemVideoCallInfoBinding.inflate(LayoutInflater.from(context), parent, false))
    }

    override fun onBindViewHolder(holder: VideocallFeedbackViewHolder, position: Int) {
        holder.feedback = getItem(position)
    }
}