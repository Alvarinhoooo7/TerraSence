package com.sosmartlabs.momo.heymomohistory.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemDateHeaderBinding
import com.sosmartlabs.momo.databinding.ItemResponseBinding
import com.sosmartlabs.momo.heymomohistory.data.model.HeyMomoHistoryItem

class HeyMomoHistoryResponsesAdapter : ListAdapter<HeyMomoHistoryItem, RecyclerView.ViewHolder>(HeyMomoHistoryResponsesDiffCallback()) {


    // View types for conversation entries and date headers
    companion object {
        private const val TYPE_DATE_HEADER = 0
        private const val TYPE_CONVERSATION_ENTRY = 1
    }

    // Set to track expanded items
    private val expandedPositions = mutableSetOf<Int>()

    override fun getItemViewType(position: Int): Int {
        return when (getItem(position)) {
            is HeyMomoHistoryItem.DateHeader -> TYPE_DATE_HEADER
            is HeyMomoHistoryItem.HeyMomoResponseItem -> TYPE_CONVERSATION_ENTRY
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TYPE_DATE_HEADER) {
            val binding = ItemDateHeaderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            DateHeaderViewHolder(binding)
        } else {
            val binding = ItemResponseBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            ResponseViewHolder(binding)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (holder) {
            is DateHeaderViewHolder -> holder.bind(getItem(position) as HeyMomoHistoryItem.DateHeader)
            is ResponseViewHolder -> {
                holder.bind(getItem(position) as HeyMomoHistoryItem.HeyMomoResponseItem, expandedPositions.contains(position))
                // Handle the item click to toggle expansion
                holder.itemView.setOnClickListener {
                    if (expandedPositions.contains(position)) {
                        expandedPositions.remove(position)
                    } else {
                        expandedPositions.add(position)
                    }
                    notifyItemChanged(position) // Notify the adapter to refresh the item
                }
            }
        }
    }

    // ViewHolder for date headers
    class DateHeaderViewHolder(private val binding: ItemDateHeaderBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(header: HeyMomoHistoryItem.DateHeader) {
            binding.dateTextView.text = header.date
        }
    }

    // ViewHolder to bind data
    class ResponseViewHolder(private val binding: ItemResponseBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(response: HeyMomoHistoryItem.HeyMomoResponseItem, isExpanded: Boolean) {
            binding.questionTextView.text = response.question
            binding.responseTextView.text = response.response

            // Expand or collapse the text based on the item's expanded state
            if (isExpanded) {
                binding.questionTextView.maxLines = Int.MAX_VALUE // Show full question
                binding.responseTextView.maxLines = Int.MAX_VALUE // Show full response
                binding.expandIcon.rotation = 180f // Rotate icon to indicate expansion
                binding.expandIcon.visibility = View.VISIBLE // Keep the expand icon visible when expanded
            } else {
                binding.questionTextView.maxLines = 1 // Collapse the question
                binding.responseTextView.maxLines = 1 // Collapse the response
                binding.expandIcon.rotation = 0f // Reset icon rotation

                // Check if the text is truncated
                binding.questionTextView.post {
                    val isQuestionTruncated = binding.questionTextView.layout != null && binding.questionTextView.layout.textWidthExceedsViewWidth()
                    val isResponseTruncated = binding.responseTextView.layout != null && binding.responseTextView.layout.textWidthExceedsViewWidth()

                    binding.expandIcon.visibility = if (isQuestionTruncated || isResponseTruncated) View.VISIBLE else View.GONE
                }
            }
        }

        // Extension function to check if the TextView's text exceeds its available width
        private fun android.text.Layout.textWidthExceedsViewWidth(): Boolean {
            return this.getEllipsisCount(lineCount - 1) > 0
        }
    }
}