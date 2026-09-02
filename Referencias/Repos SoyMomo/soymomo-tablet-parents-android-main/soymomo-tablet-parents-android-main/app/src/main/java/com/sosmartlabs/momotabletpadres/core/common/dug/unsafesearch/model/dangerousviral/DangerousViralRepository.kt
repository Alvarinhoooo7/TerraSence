package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote.ParseDangerousViral
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote.ParseDangerousViralDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DangerousViralRepository @Inject constructor(
    private val parseDangerousViralDataSource: ParseDangerousViralDataSource
) {
    suspend fun findDangerousViralByReferenceIds(referenceIds: List<String>): List<DangerousViral> =
        parseDangerousViralDataSource.findDangerousViralByReferenceIds(referenceIds)
            .map { it.toDangerousViral() }

    private fun ParseDangerousViral.toDangerousViral(): DangerousViral = DangerousViral(
        objectId = objectId,
        referenceId = referenceId,
        region = region,
        language = language,
        longName = longName,
        description = description
    )
}