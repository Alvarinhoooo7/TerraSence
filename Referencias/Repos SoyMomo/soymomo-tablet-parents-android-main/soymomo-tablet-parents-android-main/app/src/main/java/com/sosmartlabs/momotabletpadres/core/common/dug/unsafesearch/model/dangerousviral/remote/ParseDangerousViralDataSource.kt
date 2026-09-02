package com.sosmartlabs.momotabletpadres.core.common.dug.unsafesearch.model.dangerousviral.remote

import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.parse.ktx.whereContainedIn
import javax.inject.Inject

class ParseDangerousViralDataSource @Inject constructor(){
    /**
     * Obtains the viral data given by their referenceIds.
     * @param referenceIds Reference ids for the virals to be obtained from Parse
     * @return List with the viral data required
     */
    suspend fun findDangerousViralByReferenceIds(referenceIds: List<String>) =
        if (referenceIds.isNotEmpty())
            ParseQuery.getQuery(ParseDangerousViral::class.java)
                .whereContainedIn(ParseDangerousViral::referenceId, referenceIds)
                .suspendFind()
        else emptyList()
}