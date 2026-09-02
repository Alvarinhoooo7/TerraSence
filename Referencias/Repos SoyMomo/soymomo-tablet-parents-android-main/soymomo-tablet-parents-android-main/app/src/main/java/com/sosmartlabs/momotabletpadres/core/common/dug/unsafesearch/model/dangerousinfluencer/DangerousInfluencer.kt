package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.SearchDetectionDetail

data class DangerousInfluencer(
    val objectId: String?,
    override val referenceId: String?,
    override val region: String?,
    override val language: String?,
    val userName: String?
): SearchDetectionDetail
