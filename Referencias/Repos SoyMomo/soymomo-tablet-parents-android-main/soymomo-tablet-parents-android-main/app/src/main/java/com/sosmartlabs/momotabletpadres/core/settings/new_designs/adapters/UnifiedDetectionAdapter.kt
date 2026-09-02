package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.google.android.material.chip.Chip
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.DugListItem
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.SeverityLevel
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.model.UnifiedDetectionItem
import com.sosmartlabs.momotabletpadres.core.settings.dug.common.util.DetectionSeverityUtil
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDateHeaderBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDetectionImageBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDetectionMessageBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDetectionMoodBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDetectionMusicBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemDugDetectionSearchBinding
import com.sosmartlabs.momotabletpadres.glide.loadAppIcon
import com.sosmartlabs.momotabletpadres.utils.DateUtil

class UnifiedDetectionAdapter(
    private val onItemClick: (UnifiedDetectionItem) -> Unit
) : ListAdapter<DugListItem, RecyclerView.ViewHolder>(DugListItemDiffCallback()) {

    companion object {
        private const val TYPE_DATE_HEADER = 0
        private const val TYPE_MESSAGE = 1
        private const val TYPE_IMAGE = 2
        private const val TYPE_SEARCH = 3
        private const val TYPE_MOOD = 4
        private const val TYPE_MUSIC = 5
    }

    override fun getItemViewType(position: Int): Int = when (val item = getItem(position)) {
        is DugListItem.DateHeader -> TYPE_DATE_HEADER
        is DugListItem.Detection -> when (item.item) {
            is UnifiedDetectionItem.MessageDetection -> TYPE_MESSAGE
            is UnifiedDetectionItem.ImageDetection -> TYPE_IMAGE
            is UnifiedDetectionItem.SearchDetection -> TYPE_SEARCH
            is UnifiedDetectionItem.MoodItem -> TYPE_MOOD
            is UnifiedDetectionItem.MusicItem -> TYPE_MUSIC
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            TYPE_DATE_HEADER -> DateHeaderViewHolder(
                ItemDugDateHeaderBinding.inflate(inflater, parent, false)
            )
            TYPE_MESSAGE -> MessageViewHolder(
                ItemDugDetectionMessageBinding.inflate(inflater, parent, false)
            )
            TYPE_IMAGE -> ImageViewHolder(
                ItemDugDetectionImageBinding.inflate(inflater, parent, false)
            )
            TYPE_SEARCH -> SearchViewHolder(
                ItemDugDetectionSearchBinding.inflate(inflater, parent, false)
            )
            TYPE_MOOD -> MoodViewHolder(
                ItemDugDetectionMoodBinding.inflate(inflater, parent, false)
            )
            TYPE_MUSIC -> MusicViewHolder(
                ItemDugDetectionMusicBinding.inflate(inflater, parent, false)
            )
            else -> throw IllegalArgumentException("Unknown view type: $viewType")
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val item = getItem(position)) {
            is DugListItem.DateHeader -> (holder as DateHeaderViewHolder).bind(item.label)
            is DugListItem.Detection -> when (val detection = item.item) {
                is UnifiedDetectionItem.MessageDetection -> (holder as MessageViewHolder).bind(detection)
                is UnifiedDetectionItem.ImageDetection -> (holder as ImageViewHolder).bind(detection)
                is UnifiedDetectionItem.SearchDetection -> (holder as SearchViewHolder).bind(detection)
                is UnifiedDetectionItem.MoodItem -> (holder as MoodViewHolder).bind(detection)
                is UnifiedDetectionItem.MusicItem -> (holder as MusicViewHolder).bind(detection)
            }
        }
    }

    // -- DateHeader --

    class DateHeaderViewHolder(
        private val binding: ItemDugDateHeaderBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(label: String) {
            binding.dateHeaderText.text = label
        }
    }

    // -- Message Detection --

    inner class MessageViewHolder(
        private val binding: ItemDugDetectionMessageBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UnifiedDetectionItem.MessageDetection) {
            val context = binding.root.context

            binding.appIcon.loadAppIcon(item.appIconUrl, item.appName)
            binding.appName.text = item.appName ?: ""
            binding.timestamp.text = DateUtil.getFormattedDateTime(item.timestamp)

            // Sender name
            val senderName = item.conversation.detectedConversation.senderName
            binding.senderName.isVisible = !senderName.isNullOrBlank()
            binding.senderName.text = senderName ?: ""

            // Content preview (quoted message)
            val preview = item.contentPreview
            binding.contentPreview.text = if (preview.isNotBlank()) "\"$preview\"" else ""
            binding.contentPreview.isVisible = preview.isNotBlank()

            // Severity chip
            if (item.severity != SeverityLevel.NONE) {
                binding.severityChip.isVisible = true
                binding.severityChip.setText(DetectionSeverityUtil.getSeverityChipStringRes(item.severity))
                binding.severityChip.setChipBackgroundColorResource(
                    DetectionSeverityUtil.getSeverityChipColorRes(item.severity)
                )
            } else {
                binding.severityChip.isVisible = false
            }

            // Cyberbullying / Grooming chips
            binding.cyberbullyingChip.isVisible = item.hasCyberbullying
            binding.groomingChip.isVisible = item.hasGrooming

            // Show chip group if any chips are visible
            binding.chipGroup.isVisible =
                binding.severityChip.isVisible || item.hasCyberbullying || item.hasGrooming

            binding.detectionCard.setOnClickListener { onItemClick(item) }
        }
    }

    // -- Image Detection --

    inner class ImageViewHolder(
        private val binding: ItemDugDetectionImageBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UnifiedDetectionItem.ImageDetection) {
            binding.appIcon.loadAppIcon(item.appIconUrl, item.appName)
            binding.appName.text = item.appName ?: ""
            binding.timestamp.text = DateUtil.getFormattedDateTime(item.timestamp)
            binding.groupCount.text = binding.root.context.getString(
                R.string.dug_image_group_count_v2, item.groupCount
            )

            binding.detectionCard.setOnClickListener { onItemClick(item) }
        }
    }

    // -- Search Detection --

    inner class SearchViewHolder(
        private val binding: ItemDugDetectionSearchBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UnifiedDetectionItem.SearchDetection) {
            binding.appIcon.loadAppIcon(item.appIconUrl, item.appName)
            binding.appName.text = item.appName ?: ""
            binding.timestamp.text = DateUtil.getFormattedDateTime(item.timestamp)
            val searchPreview = item.contentPreview
            binding.searchText.text = if (searchPreview.isNotBlank()) "\"$searchPreview\"" else ""
            binding.searchText.isVisible = searchPreview.isNotBlank()

            // Category chip
            val category = item.searchCategory
            if (category != null) {
                val (colorRes, labelRes) = DetectionSeverityUtil.getUnsafeSearchCategoryChip(category)
                binding.chipGroup.isVisible = true
                binding.categoryChip.isVisible = true
                binding.categoryChip.setText(labelRes)
                binding.categoryChip.setChipBackgroundColorResource(colorRes)
            } else {
                binding.chipGroup.isVisible = false
            }

            binding.detectionCard.setOnClickListener { onItemClick(item) }
        }
    }

    // -- Mood Detection --

    inner class MoodViewHolder(
        private val binding: ItemDugDetectionMoodBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UnifiedDetectionItem.MoodItem) {
            val context = binding.root.context

            binding.appIcon.loadAppIcon(item.appIconUrl, item.appName)
            binding.appName.text = item.appName ?: ""
            binding.timestamp.text = DateUtil.getFormattedDateTime(item.timestamp)
            binding.contentPreview.text = item.contentPreview

            // Risk factor chips — dynamically add to FlexboxLayout
            binding.riskFactorChips.removeAllViews()
            val density = context.resources.displayMetrics.density
            for (riskFactor in item.riskChips) {
                val chip = Chip(context).apply {
                    setChipBackgroundColorResource(
                        DetectionSeverityUtil.getRiskFactorChipColorRes(riskFactor)
                    )
                    setText(DetectionSeverityUtil.getRiskFactorChipStringRes(riskFactor))
                    setTextColor(ContextCompat.getColor(context, R.color.white))
                    textSize = 11f
                    typeface = ResourcesCompat.getFont(context, R.font.poppins_semibold)
                    chipMinHeight = resources.getDimension(R.dimen.vertical_margin_medium)
                    isCheckable = false
                    isClickable = false
                    chipStartPadding = 8f * density
                    chipEndPadding = 8f * density
                    chipCornerRadius = resources.getDimension(R.dimen.horizontal_margin_small)

                    if (DetectionSeverityUtil.isHighRiskFactor(riskFactor)) {
                        setChipIconResource(R.drawable.ic_warning_primary)
                        isChipIconVisible = true
                        chipIconSize = resources.getDimension(R.dimen.dug_card_category_icon_size)
                        chipIconTint = ContextCompat.getColorStateList(context, R.color.white)
                    }
                }
                val lp = ViewGroup.MarginLayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginEnd = (4f * density).toInt()
                    bottomMargin = (4f * density).toInt()
                }
                binding.riskFactorChips.addView(chip, lp)
            }
            binding.riskFactorChips.isVisible = item.riskChips.isNotEmpty()

            binding.detectionCard.setOnClickListener { onItemClick(item) }
        }
    }

    // -- Music Detection --

    inner class MusicViewHolder(
        private val binding: ItemDugDetectionMusicBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: UnifiedDetectionItem.MusicItem) {
            val context = binding.root.context
            val music = item.musicDetection

            binding.timestamp.text = DateUtil.getFormattedDateTime(item.timestamp)

            // Song artwork
            Glide.with(context)
                .load(music.songImage)
                .placeholder(R.drawable.ic_dug_detection_music)
                .error(R.drawable.ic_dug_detection_music)
                .centerCrop()
                .into(binding.songArtwork)

            // Song info
            binding.songTitle.text = music.songTitle
            binding.artistName.text = music.detectedArtist

            // Small app icon + name
            binding.appIcon.loadAppIcon(item.appIconUrl, item.appName)
            binding.appName.text = item.appName ?: ""

            binding.detectionCard.setOnClickListener { onItemClick(item) }
        }
    }
}

class DugListItemDiffCallback : DiffUtil.ItemCallback<DugListItem>() {
    override fun areItemsTheSame(oldItem: DugListItem, newItem: DugListItem): Boolean {
        return when {
            oldItem is DugListItem.Detection && newItem is DugListItem.Detection ->
                oldItem.item.id == newItem.item.id && oldItem.item.category == newItem.item.category
            oldItem is DugListItem.DateHeader && newItem is DugListItem.DateHeader ->
                oldItem.label == newItem.label
            else -> false
        }
    }

    override fun areContentsTheSame(oldItem: DugListItem, newItem: DugListItem): Boolean {
        return oldItem == newItem
    }
}
