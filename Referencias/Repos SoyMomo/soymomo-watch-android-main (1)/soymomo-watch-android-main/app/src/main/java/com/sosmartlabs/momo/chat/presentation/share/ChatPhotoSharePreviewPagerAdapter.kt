package com.sosmartlabs.momo.chat.presentation.share

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momo.databinding.ItemChatPhotoSharePreviewBinding

class ChatPhotoSharePreviewPagerAdapter :
    RecyclerView.Adapter<ChatPhotoSharePreviewPagerAdapter.ChatPhotoSharePreviewViewHolder>() {

    private val templates = ShareTemplate.all
    private var previews: Map<ShareTemplate, SharePreviewState> = templates.associateWith {
        SharePreviewState.Loading
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatPhotoSharePreviewViewHolder {
        val binding = ItemChatPhotoSharePreviewBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ChatPhotoSharePreviewViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ChatPhotoSharePreviewViewHolder, position: Int) {
        val template = templates[position]
        holder.bind(previews[template])
    }

    override fun getItemCount(): Int = templates.size

    fun updatePreviews(newPreviews: Map<ShareTemplate, SharePreviewState>) {
        val previousPreviews = previews
        previews = newPreviews
        templates.forEachIndexed { index, template ->
            if (previousPreviews[template] !== newPreviews[template]) {
                notifyItemChanged(index)
            }
        }
    }

    class ChatPhotoSharePreviewViewHolder(
        private val binding: ItemChatPhotoSharePreviewBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(state: SharePreviewState?) {
            when (state) {
                is SharePreviewState.Ready -> {
                    binding.previewProgress.isVisible = false
                    binding.previewFailedState.isVisible = false
                    binding.previewImage.isVisible = true
                    binding.previewImage.setImageBitmap(state.bitmap)
                }

                SharePreviewState.Failed -> {
                    binding.previewProgress.isVisible = false
                    binding.previewImage.isVisible = false
                    binding.previewImage.setImageBitmap(null)
                    binding.previewFailedState.isVisible = true
                }

                else -> {
                    binding.previewImage.isVisible = false
                    binding.previewImage.setImageBitmap(null)
                    binding.previewFailedState.isVisible = false
                    binding.previewProgress.isVisible = true
                }
            }
        }
    }
}
