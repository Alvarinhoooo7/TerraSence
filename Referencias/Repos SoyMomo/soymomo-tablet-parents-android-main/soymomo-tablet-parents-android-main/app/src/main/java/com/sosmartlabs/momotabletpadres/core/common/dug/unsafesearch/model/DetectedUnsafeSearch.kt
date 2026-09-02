package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import java.util.*

data class DetectedUnsafeSearch(
    var objectId: String?,
    var tablet: Tablet?,
    var searchText: String?,
    var detection: String?,
    var packageName: String?,
    var date: Date?,
    var category: String?,
    var referenceId: String?,
    var hasFeedback: Boolean
){
    companion object {
        const val CATEGORY_VIRAL = "viral"
        const val CATEGORY_MOVIE = "title"
        const val CATEGORY_CONTENT_CREATOR = "content_creator"
    }
}
