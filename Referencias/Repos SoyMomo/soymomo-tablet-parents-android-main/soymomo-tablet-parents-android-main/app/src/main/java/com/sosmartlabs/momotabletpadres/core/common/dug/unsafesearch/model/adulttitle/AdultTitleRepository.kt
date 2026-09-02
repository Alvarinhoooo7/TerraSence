package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle

import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote.ParseAdultTitle
import com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote.ParseAdultTitleDataSource
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdultTitleRepository @Inject constructor(
    private val parseAdultTitleDataSource: ParseAdultTitleDataSource
) {
    suspend fun findAdultTitlesByReferenceIds(referenceIds: List<String>): List<AdultTitle> =
        parseAdultTitleDataSource.findAdultTitlesByReferenceIds(referenceIds)
            .map { it.toAdultTitle() }

    private fun ParseAdultTitle.toAdultTitle(): AdultTitle = AdultTitle(
        objectId = objectId,
        referenceId = referenceId,
        region = region,
        language = language,
        longName = longName
    )
}