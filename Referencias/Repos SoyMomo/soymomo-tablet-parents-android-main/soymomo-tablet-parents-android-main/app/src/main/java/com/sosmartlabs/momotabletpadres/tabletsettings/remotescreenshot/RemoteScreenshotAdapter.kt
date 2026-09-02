package com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot

import android.content.Context
import android.graphics.drawable.Drawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.load.engine.GlideException
import com.bumptech.glide.request.RequestListener
import com.bumptech.glide.request.RequestOptions
import com.bumptech.glide.request.target.Target
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.databinding.ItemRemoteScreenshotBinding
import com.sosmartlabs.momotabletpadres.glide.loadEncrypted
import com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model.RemoteScreenshot
import timber.log.Timber
import java.util.concurrent.TimeUnit

class RemoteScreenshotAdapter(
    private val context: Context?,
    private val showDialog: (Int) -> Unit
) : ListAdapter<RemoteScreenshot, RemoteScreenshotAdapter.RemoteScreenshotViewHolder>(ScreenshotDiffCallback()) {

    // Glide request options configured for better network handling
    private val glideOptions = RequestOptions()
        .diskCacheStrategy(DiskCacheStrategy.ALL)
        .timeout(TimeUnit.SECONDS.toMillis(30).toInt())
        .error(R.drawable.ic_action_app_hover)
        .centerCrop()
        .override(250, 250) // Reasonable size for grid view

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RemoteScreenshotViewHolder {
        Timber.d("RemoteScreenshotAdapter: onCreateViewHolder - inflating item_remote_screenshot layout")
        val binding = ItemRemoteScreenshotBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return RemoteScreenshotViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RemoteScreenshotViewHolder, position: Int) {
        val screenshot = getItem(position)
        Timber.v("RemoteScreenshotAdapter: onBindViewHolder - binding screenshot with objectId=${screenshot.objectId} at position $position")
        if (context != null) {
            holder.bind(screenshot, context, showDialog, glideOptions)
        } else {
            Timber.e("RemoteScreenshotAdapter: onBindViewHolder - context is null, cannot bind view holder")
        }
    }

    override fun onViewRecycled(holder: RemoteScreenshotViewHolder) {
        super.onViewRecycled(holder)
        holder.clearImage()
    }

    class RemoteScreenshotViewHolder(
        private val binding: ItemRemoteScreenshotBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(
            remoteScreenshot: RemoteScreenshot,
            context: Context,
            showDialog: (Int) -> Unit,
            glideOptions: RequestOptions
        ) {
            val isEncrypted = remoteScreenshot.isEncrypted()
            val url = remoteScreenshot.screenshot?.url

            Timber.d(
                "RemoteScreenshotViewHolder: bind - Start binding at adapter position $bindingAdapterPosition | " +
                        "RemoteScreenshot: objectId=${remoteScreenshot.objectId}, hasReachedTablet=${remoteScreenshot.hasReachedTablet}, " +
                        "isEncrypted=$isEncrypted, screenshotFileUrl=$url"
            )

            // Always clear previous image and click listener
            Glide.with(context).clear(binding.imageView)
            binding.imageView.setOnClickListener(null)
            binding.progressIndicator.visibility = View.VISIBLE

            // Use Glide extension to load encrypted or unencrypted screenshot
            val requestBuilder = Glide.with(context)
                .loadEncrypted(remoteScreenshot, remoteScreenshot.objectId ?: "unknown")
                .apply(glideOptions)
                .listener(object : RequestListener<Drawable> {
                    override fun onLoadFailed(
                        e: GlideException?,
                        model: Any?,
                        target: Target<Drawable>,
                        isFirstResource: Boolean
                    ): Boolean {
                        binding.progressIndicator.visibility = View.GONE
                        Timber.e(e, "RemoteScreenshotViewHolder: Glide load failed for objectId=${remoteScreenshot.objectId}")
                        return false // Let Glide handle error placeholder
                    }

                    override fun onResourceReady(
                        resource: Drawable,
                        model: Any,
                        target: Target<Drawable>?,
                        dataSource: DataSource,
                        isFirstResource: Boolean
                    ): Boolean {
                        binding.progressIndicator.visibility = View.GONE
                        return false // Let Glide handle setting the image
                    }
                })

            // Add thumbnail for unencrypted images (encrypted images don't support this)
            if (!isEncrypted && url != null) {
                val thumbnailRequest = Glide.with(context)
                    .load(url)
                    .apply(glideOptions.clone().sizeMultiplier(0.1f))
                requestBuilder.thumbnail(thumbnailRequest)
            }

            requestBuilder.into(binding.imageView)

            binding.imageView.setOnClickListener {
                Timber.d("RemoteScreenshotViewHolder: image clicked at adapter position $bindingAdapterPosition")
                showDialog(bindingAdapterPosition)
            }
        }

        fun clearImage() {
            // Glide automatically cancels requests when view is recycled
            // This method is kept for explicit cleanup if needed
        }
    }

    class ScreenshotDiffCallback : DiffUtil.ItemCallback<RemoteScreenshot>() {
        override fun areItemsTheSame(oldItem: RemoteScreenshot, newItem: RemoteScreenshot): Boolean {
            return oldItem.objectId == newItem.objectId
        }

        override fun areContentsTheSame(oldItem: RemoteScreenshot, newItem: RemoteScreenshot): Boolean {
            // Compare relevant fields for content changes, including encrypted fields
            return oldItem.screenshot?.url == newItem.screenshot?.url &&
                    oldItem.hasReachedTablet == newItem.hasReachedTablet &&
                    oldItem.encryptedScreenshot?.url == newItem.encryptedScreenshot?.url
        }
    }
}
