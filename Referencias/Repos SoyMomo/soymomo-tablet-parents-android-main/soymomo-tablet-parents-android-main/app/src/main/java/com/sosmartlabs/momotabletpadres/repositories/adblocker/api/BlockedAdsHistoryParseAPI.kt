package com.sosmartlabs.momotabletpadres.repositories.adblocker.api

import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import com.sosmartlabs.momotabletpadres.models.BlockedAdsHistory
import com.sosmartlabs.momotabletpadres.models.entity.BlockedAdsHistoryEntity
import com.sosmartlabs.momotabletpadres.models.mapper.BlockedAdsHistoryMapper
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton


@Singleton
open class BlockedAdsHistoryParseAPI @Inject constructor(val mapper: BlockedAdsHistoryMapper,
                                                         val deh: DebugExceptionHandler
) {

    /**
     * get objects that match tablet Id object
     */
    fun getByTabletId(tabletId: String): List<BlockedAdsHistoryEntity>{
        Timber.d("getByTabletId: $tabletId")
        val tablet = ParseTablet.createWithoutData(tabletId)

        CrashlyticsLog.log("Querying to get adBlockerSettings by tabletId")
        val query = ParseQuery.getQuery(BlockedAdsHistory::class.java)
        query.whereEqualTo("tablet", tablet)
        query.orderByDescending("updatedAt")
        return query.find().map(mapper::transform)
    }

}