package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.dug.detectedconversation.model.DetectedConversationScreenshot
import com.sosmartlabs.momotabletpadres.core.settings.dug.detectedconversation.model.DetectionScreenshots
import com.sosmartlabs.momotabletpadres.databinding.ItemCaptureBinding
import com.sosmartlabs.momotabletpadres.glide.EncryptedParseFile
import com.sosmartlabs.momotabletpadres.glide.loadEncrypted
import com.stfalcon.imageviewer.StfalconImageViewer
import timber.log.Timber

class ScreenshotsAdapter(
    private val mContext: Context
) : RecyclerView.Adapter<ScreenshotsAdapter.ScreenshotViewHolderBase>() {

    private val screenshots = ArrayList<DetectedConversationScreenshot>()

    fun addData(newData: DetectionScreenshots) {
        Timber.d("ScreenshotsAdapter: Adding new screenshots data: prev=${newData.previousScreenshot != null} main=${newData.mainScreenshot != null} next=${newData.nextScreenshot != null}")
        this.screenshots.clear()
        if (newData.previousScreenshot != null) {
            Timber.d("ScreenshotsAdapter: Adding previousScreenshot")
            screenshots.add(newData.previousScreenshot)
        }
        if (newData.mainScreenshot != null) {
            Timber.d("ScreenshotsAdapter: Adding mainScreenshot")
            screenshots.add(newData.mainScreenshot)
        }
        if (newData.nextScreenshot != null) {
            Timber.d("ScreenshotsAdapter: Adding nextScreenshot")
            screenshots.add(newData.nextScreenshot)
        }
        Timber.d("ScreenshotsAdapter: Total items after addData: ${screenshots.size}")
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int {
        return R.layout.item_capture
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ScreenshotViewHolderBase {
        Timber.v("ScreenshotsAdapter: Creating ViewHolder for viewType=$viewType")
        return ScreenshotViewHolder(ItemCaptureBinding.inflate(LayoutInflater.from(parent.context), parent, false))
    }

    override fun getItemCount(): Int {
        return screenshots.size
    }

    override fun onBindViewHolder(holder: ScreenshotViewHolderBase, position: Int) {
        val screenshot = screenshots[position]

        Timber.v("ScreenshotsAdapter: onBindViewHolder position=$position isEncrypted=${screenshot.isEncrypted}")

        // Clear any previous image
        Glide.with(mContext).clear(holder.image)

        // Use Glide extension to load encrypted or unencrypted screenshot
        Glide.with(mContext)
            .loadEncrypted(screenshot, "conversation_${screenshot.timestamp}_$position")
            .error(R.drawable.ic_action_app_hover)
            .placeholder(R.drawable.ic_action_app_hover)
            .into(holder.image)

        holder.image.setOnClickListener {
            Timber.d("ScreenshotsAdapter: Image at position $position clicked, showing full screen image")
            showFullScreenImage(position)
        }
    }

    private fun showFullScreenImage(position: Int) {
        val screenshot = screenshots[position]
        Timber.d("ScreenshotsAdapter: showFullScreenImage at position=$position, isEncrypted=${screenshot.isEncrypted}")

        if (screenshot.isEncrypted && screenshot.encryptedScreenshotFile != null && screenshot.encryptedMetadata != null) {
            // For encrypted images, create EncryptedParseFile model for Glide
            val encryptedModel = EncryptedParseFile(
                parseFile = screenshot.encryptedScreenshotFile!!,
                metadata = screenshot.encryptedMetadata!!,
                cacheKey = "fullscreen_conversation_${screenshot.timestamp}_$position"
            )
            Timber.d("ScreenshotsAdapter: Showing full screen for encrypted image at position=$position")
            StfalconImageViewer.Builder(mContext, listOf(encryptedModel)) { view, model ->
                Glide.with(mContext.applicationContext)
                    .load(model)
                    .error(R.drawable.ic_action_app_hover)
                    .into(view)
            }
                .withHiddenStatusBar(true)
                .show()
        } else {
            Timber.d("ScreenshotsAdapter: Showing full screen for URL image at position=$position url=${screenshot.screenshot}")
            StfalconImageViewer.Builder(mContext, arrayOf(screenshot.screenshot)) { view, url ->
                Glide.with(mContext.applicationContext)
                    .load(url)
                    .error(R.drawable.ic_action_app_hover)
                    .into(view)
            }
                .withHiddenStatusBar(true)
                .show()
        }
    }

    override fun onViewRecycled(holder: ScreenshotViewHolderBase) {
        super.onViewRecycled(holder)
        // Glide automatically cancels requests when view is recycled
        Glide.with(mContext).clear(holder.image)
    }

    abstract class ScreenshotViewHolderBase(rootView: View, var image: ImageView)
        : RecyclerView.ViewHolder(rootView)

    class ScreenshotViewHolder(binding: ItemCaptureBinding)
        : ScreenshotViewHolderBase(binding.root, binding.image) {
        var detectionIcon = binding.image
    }
}
