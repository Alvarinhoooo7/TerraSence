package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.SearchDetectionDetail

data class DangerousViral(
    val objectId:String?,
    override val referenceId: String?,
    override val region: String?,
    override val language: String?,
    val longName: String?,
    val description: String?
) : SearchDetectionDetail
