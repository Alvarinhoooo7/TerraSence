package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.remote.ParseDangerousInfluencer
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousinfluencer.remote.ParseDangerousInfluencerDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DangerousInfluencerRepository @Inject constructor(
    private val parseDangerousInfluencerDataSource: ParseDangerousInfluencerDataSource
) {
    suspend fun findDangerousInfluencersByReferenceIds(referenceIds: List<String>): List<DangerousInfluencer> =
        parseDangerousInfluencerDataSource.findDangerousInfluencersByReferenceIds(referenceIds)
            .map { it.toDangerousInfluencer() }

    private fun ParseDangerousInfluencer.toDangerousInfluencer(): DangerousInfluencer = DangerousInfluencer(
        objectId = objectId,
        referenceId = referenceId,
        region = region,
        language = language,
        userName = username
    )
}