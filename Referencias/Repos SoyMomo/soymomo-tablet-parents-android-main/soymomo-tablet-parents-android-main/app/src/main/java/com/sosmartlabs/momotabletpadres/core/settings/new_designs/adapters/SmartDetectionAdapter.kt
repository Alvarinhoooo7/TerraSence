package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.model.DisplayedSmartDetection
import com.sosmartlabs.momotabletpadres.core.settings.dug.smartdetection.ui.SmartDetectionViewModelBase
import com.sosmartlabs.momotabletpadres.databinding.ItemImageDetectionBinding
import com.sosmartlabs.momotabletpadres.databinding.SettingsCardDugDetectionImagesDetailBinding
import com.sosmartlabs.momotabletpadres.glide.loadEncrypted
import timber.log.Timber

class SmartDetectionAdapter(
    private val viewModel: SmartDetectionViewModelBase,
    private val lifecycle: LifecycleOwner,
    private val onItemClick: (List<DisplayedSmartDetection>) -> Unit = {}
): ListAdapter<List<DisplayedSmartDetection>, SmartDetectionAdapter.SmartDetectionViewHolder>(SmartDetectionItemCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SmartDetectionViewHolder {
        return SmartDetectionViewHolder(ItemImageDetectionBinding.inflate(
            LayoutInflater.from(parent.context), parent, false), viewModel, lifecycle)
    }

    override fun onBindViewHolder(holder: SmartDetectionViewHolder, position: Int) {
        holder.smartDetection = getItem(position)
    }

    override fun onViewRecycled(holder: SmartDetectionViewHolder) {
        super.onViewRecycled(holder)
        holder.clearImages()
    }

    inner class SmartDetectionViewHolder(
        private val binding: ItemImageDetectionBinding,
        private val viewModel: SmartDetectionViewModelBase,
        private val lifecycle: LifecycleOwner
    ): RecyclerView.ViewHolder(binding.root) {
        private lateinit var _smartDetection: List<DisplayedSmartDetection>
        
        fun clearImages() {
            // Glide automatically cancels requests when view is recycled
            val context = itemView.context
            Glide.with(context).clear(binding.detectionIcon)
            Glide.with(context).clear(binding.detectionIconMultiple)
        }
        
        var smartDetection: List<DisplayedSmartDetection>
            get() = _smartDetection
            set(value) {
                _smartDetection = value
                val context = itemView.context
                
                // Clear previous images
                clearImages()

                with(binding) {
                    // Load first detection screenshot using Glide extension
                    loadScreenshot(value.first(), detectionIcon)
                    
                    with(appIcon) {
                        if (value.first().appIcon != null) setImageDrawable(value.first().appIcon)
                        else setImageResource(R.drawable.ic_action_app_hover)
                    }
                    detectionTitle.text = value.first().appName
                    detectionDate.text = DateUtil.getFormattedDateTime(value.first().createdAt)

                    if (value.size > 1) {
                        detectionIconMultiple.visibility = View.VISIBLE
                        loadScreenshot(value.last(), detectionIconMultiple)
                    } else {
                        detectionIconMultiple.visibility = View.GONE
                    }
                    // Click to open viewer (show screenshots)
                    itemView.setOnClickListener {
                        try {
                            Timber.i("SmartDetectionAdapter: item clicked id=${_smartDetection.first().objectId}")
                            onItemClick(_smartDetection)
                        } catch (e: Exception) {
                            Timber.w(e, "SmartDetectionAdapter: error on item click")
                        }
                    }
                }
            }
        
        private fun loadScreenshot(detection: DisplayedSmartDetection, imageView: ImageView) {
            val context = itemView.context
            
            // Use Glide extension to load encrypted or unencrypted screenshot
            Glide.with(context)
                .loadEncrypted(detection)
                .error(R.drawable.ic_action_app_hover)
                .placeholder(R.drawable.ic_action_app_hover)
                .into(imageView)
        }

        private fun getDetectionFeedback(binding: SettingsCardDugDetectionImagesDetailBinding, viewModel: SmartDetectionViewModelBase, smartDetection: DisplayedSmartDetection, lifecycle: LifecycleOwner) {
            viewModel.hasDetectionFeedback(smartDetection).observe(lifecycle) {
                if (it == null) {
                    Timber.i("There is no feedback")
                    binding.correctDetection.card.visibility = View.VISIBLE
                    setFeedback(binding, viewModel, smartDetection)
                } else {
                    Timber.i("There is a feedback: $it")
                    if (it) {
                        binding.correctDetection.card.visibility = View.GONE
                    } else {
                        binding.correctDetection.card.visibility = View.VISIBLE
                        setFeedback(binding, viewModel, smartDetection)
                    }
                }
            }
        }

        private fun setFeedback(binding: SettingsCardDugDetectionImagesDetailBinding, viewModel: SmartDetectionViewModelBase, smartDetection: DisplayedSmartDetection) {
            with(binding) {
                correctDetection.buttonCorrect.setOnClickListener {
                    runCatching {
                        correctDetection.card.visibility = View.GONE
                        viewModel.sendDetectionFeedback(true, smartDetection)
                        Timber.i("Feedback sent good")
                    }.onSuccess { list ->
                        if (list == null) {
                            Timber.i("There is no feedback $list")
                        } else {
                            Timber.i("There is a feedback $list")
                            Toast.makeText(binding.root.context, R.string.dug_feedback_thanks, Toast.LENGTH_SHORT).show()
                        }
                    }.onFailure {
                        Timber.e("Error sending feedback")
                    }
                }

                correctDetection.buttonWrong.setOnClickListener {
                    runCatching {
                        correctDetection.card.visibility = View.GONE
                        viewModel.sendDetectionFeedback(false, smartDetection)
                        Timber.i("Feedback sent bad")
                    }.onSuccess { list ->
                        if (list == null) {
                            Timber.i("There is no feedback $list")
                        } else {
                            Timber.i("There is a feedback $list")
                            Toast.makeText(binding.root.context, R.string.dug_feedback_thanks, Toast.LENGTH_SHORT).show()
                        }
                    }.onFailure {
                        Timber.e("Error asking Dug analysis")
                    }
                }
            }
        }
    }
}

class SmartDetectionItemCallback: DiffUtil.ItemCallback<List<DisplayedSmartDetection>>() {
    override fun areItemsTheSame(oldItem: List<DisplayedSmartDetection>, newItem: List<DisplayedSmartDetection>): Boolean {
        return oldItem.first().objectId == newItem.first().objectId
    }

    override fun areContentsTheSame(oldItem: List<DisplayedSmartDetection>, newItem: List<DisplayedSmartDetection>): Boolean {
        return oldItem.first().appName == newItem.first().appName
                && oldItem.first().screenshot == newItem.first().screenshot
                && oldItem.first().createdAt == newItem.first().createdAt
                && oldItem.first().isEncrypted == newItem.first().isEncrypted
    }
}
