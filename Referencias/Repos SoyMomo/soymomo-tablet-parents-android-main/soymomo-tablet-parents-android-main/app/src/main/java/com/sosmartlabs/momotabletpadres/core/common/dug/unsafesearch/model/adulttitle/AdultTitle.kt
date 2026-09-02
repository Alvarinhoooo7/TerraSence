package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.SearchDetectionDetail

data class AdultTitle(
    val objectId: String?,
    override val referenceId: String?, override val region: String?, override val language: String?,
    val longName: String?
) : SearchDetectionDetail
