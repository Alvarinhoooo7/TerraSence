package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers

import android.content.Context
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch.Companion.CATEGORY_CONTENT_CREATOR
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch.Companion.CATEGORY_MOVIE
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch.Companion.CATEGORY_VIRAL
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.databinding.ItemDetectedSearchBinding
import com.sosmartlabs.momotabletpadres.databinding.ItemOnappDetectionBinding
import com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model.DisplayedDetectedUnsafeSearch

/**
 * Helper for write [DisplayedDetectedUnsafeSearch] into a [ItemDetectedSearchBinding]
 */
object UnsafeSearchItemHelper {

    /**
     * Display the information contained in a [DisplayedDetectedUnsafeSearch] item in a
     * [ItemDetectedSearchBinding].
     * @param context Activity context
     * @param item Item to display
     * @param binding Binding for show information
     * @param shouldShowInfoImage Whether if info image should be shown or not
     */
    fun setItemUnsafeSearchBinding(
        context: Context, item: DisplayedDetectedUnsafeSearch,
        binding: ItemOnappDetectionBinding, shouldShowInfoImage: Boolean
    ) {
        with(binding) {
            detectionIcon.setImageDrawable(item.icon)
            with(detectionChip) {
                val (color, label) = when (item.detectedSearch.category) {
                    CATEGORY_VIRAL ->
                        Pair(R.color.colorChipViral, R.string.unsafe_search_viral_label)
                    CATEGORY_MOVIE ->
                        Pair(R.color.colorChipMoviesSeries, R.string.unsafe_search_movie_label)
                    CATEGORY_CONTENT_CREATOR ->
                        Pair(
                            R.color.colorChipSocialMedia,
                            R.string.unsafe_search_social_network_label
                        )
                    else -> Pair(
                        R.color.colorChipViral,
                        R.string.unsafe_search_viral_label
                    )
                }
                setChipBackgroundColorResource(color)
                setText(label)
            }
            detectionTitle.text = item.appName
            detectionDescription.text = item.name
            detectionDate.text = context.getString(
                R.string.search_detected_at,
                DateUtil.getFormattedDateTime(item.detectedSearch.date!!)
            )
        }
    }
}