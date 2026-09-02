package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.adulttitle.remote

import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.parse.ktx.whereContainedIn
import javax.inject.Inject

class ParseAdultTitleDataSource @Inject constructor() {
    /**
     * Obtains the adult titles data given by their referenceIds.
     * @param referenceIds Reference ids for the adult titles to be obtained from Parse
     * @return List with the adult titles data required
     */
    suspend fun findAdultTitlesByReferenceIds(referenceIds: List<String>): List<ParseAdultTitle> =
        if (referenceIds.isNotEmpty())
            ParseQuery.getQuery(ParseAdultTitle::class.java)
                .whereContainedIn(ParseAdultTitle::referenceId, referenceIds)
                .suspendFind()
        else emptyList()
}