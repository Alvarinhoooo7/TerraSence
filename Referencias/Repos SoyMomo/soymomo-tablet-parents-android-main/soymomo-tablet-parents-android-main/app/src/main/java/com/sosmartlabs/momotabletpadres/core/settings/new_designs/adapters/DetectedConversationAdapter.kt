package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.content.Context
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DisplayedDetectedConversation
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers.ConversationDetectionItemHelper
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding

/**
 * Adapter for handling Profanity Detection items.
 */
class DetectedConversationAdapter(val context: Context,
                                  private val listener: (DisplayedDetectedConversation) -> Unit)
    : ListAdapter<DisplayedDetectedConversation, DetectedConversationAdapter.CustomViewHolder>(
    DetectedConversationItemCallback()
) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CustomViewHolder {
        return CustomViewHolder(
            ItemOnappDetectionBinding.inflate(
            LayoutInflater.from(parent.context), parent, false))
    }

    override fun onBindViewHolder(holder: CustomViewHolder, position: Int) {

        val conversation = getItem(position)
        ConversationDetectionItemHelper.setItemDetectedConversationCardBinding(context, conversation,
            holder.cardContent)

        holder.layout.setOnClickListener {
            listener(conversation)
        }
    }

    class CustomViewHolder(binding: ItemOnappDetectionBinding): RecyclerView.ViewHolder(binding.root) {
        val layout = binding.appCard
        val cardContent = binding
    }

    /**
     * Callback for detecting when two conversations are the same conversation.
     */
    class DetectedConversationItemCallback: DiffUtil.ItemCallback<DisplayedDetectedConversation>() {
        override fun areItemsTheSame(oldItem: DisplayedDetectedConversation,
                                     newItem: DisplayedDetectedConversation
        ): Boolean {
            return oldItem.detectedConversation.objectId == newItem.detectedConversation.objectId
        }

        override fun areContentsTheSame(oldItem: DisplayedDetectedConversation,
                                        newItem: DisplayedDetectedConversation
        ): Boolean {
            // Detections should not change across time, so we can assume that contents are always
            // the same if they are the same item.
            return areItemsTheSame(oldItem, newItem)
        }
    }
}