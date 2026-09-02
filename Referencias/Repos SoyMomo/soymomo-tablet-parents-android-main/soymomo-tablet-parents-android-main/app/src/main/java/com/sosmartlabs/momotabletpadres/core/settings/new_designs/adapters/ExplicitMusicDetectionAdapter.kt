package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.ItemMusicDetectionBinding
import com.sosmartlabs.momotabletpadres.core.settings.dug.explicitmusic.model.DisplayedExplicitMusicDetection


class ExplicitMusicDetectionAdapter(private val itemClickListener: (selected: DisplayedExplicitMusicDetection) -> Unit):
    ListAdapter<DisplayedExplicitMusicDetection, ExplicitMusicDetectionAdapter.ExplicitMusicDetectionViewHolder>(
        ExplicitMusicDetectionItemCallback()
    ) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ExplicitMusicDetectionViewHolder {
        var item = ExplicitMusicDetectionViewHolder(
            ItemMusicDetectionBinding.inflate(LayoutInflater.from(parent.context), parent, false))
            .apply {
                itemView.setOnClickListener {
                    itemClickListener(detection)
                }
            }
        return item
    }

    override fun onBindViewHolder(holder: ExplicitMusicDetectionViewHolder, position: Int) {
        holder.detection = getItem(position)
    }

    class ExplicitMusicDetectionViewHolder(private val binding: ItemMusicDetectionBinding): RecyclerView.ViewHolder(binding.root) {
        private lateinit var _detection: DisplayedExplicitMusicDetection
        var detection: DisplayedExplicitMusicDetection
            get() {
                return _detection
            }
            set(value) {
                _detection = value
                with(binding) {
                    detectionIcon.setImageDrawable(value.appIcon)
                    this.detectionTitle.text = "${value.songTitle} - ${value.detectedArtist}"
                    this.detectionDescription.text = DateUtil.getFormattedDateTime(value.detectionDate)
                }
            }
    }

    class ExplicitMusicDetectionItemCallback:
        DiffUtil.ItemCallback<DisplayedExplicitMusicDetection>() {
        override fun areItemsTheSame(oldItem: DisplayedExplicitMusicDetection,
            newItem: DisplayedExplicitMusicDetection): Boolean {
            return oldItem.objectId == newItem.objectId
        }

        @SuppressLint("DiffUtilEquals")
        override fun areContentsTheSame(oldItem: DisplayedExplicitMusicDetection,
            newItem: DisplayedExplicitMusicDetection): Boolean {
            return oldItem.detectionDate == newItem.detectionDate
                    && oldItem.appIcon?.equals(newItem.appIcon) ?: (newItem.appIcon == null)
                    && oldItem.detectedArtist == newItem.detectedArtist
                    && oldItem.songTitle == newItem.songTitle
        }

    }
}