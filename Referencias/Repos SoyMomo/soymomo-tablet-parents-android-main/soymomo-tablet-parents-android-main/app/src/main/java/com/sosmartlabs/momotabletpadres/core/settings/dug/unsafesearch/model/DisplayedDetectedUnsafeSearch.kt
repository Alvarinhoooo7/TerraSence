package com.sosmartlabs.momotabletpadres.core.settings.dug.unsafesearch.model

import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.DetectedUnsafeSearch

data class DisplayedDetectedUnsafeSearch(val appName: String?, val icon: Drawable?, val name: String,
                                         val description: String?, val detectedSearch: DetectedUnsafeSearch
)