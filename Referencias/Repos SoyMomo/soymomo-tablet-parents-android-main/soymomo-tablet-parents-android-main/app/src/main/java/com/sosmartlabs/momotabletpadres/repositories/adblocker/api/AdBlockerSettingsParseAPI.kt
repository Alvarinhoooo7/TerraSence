package com.sosmartlabs.momotabletpadres.repositories.adblocker.api

import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import com.sosmartlabs.momotabletpadres.models.AdBlockerSettings
import com.sosmartlabs.momotabletpadres.models.entity.AdBlockerSettingsEntity
import com.sosmartlabs.momotabletpadres.models.mapper.AdBlockerSettingsToEntityMapper
import com.sosmartlabs.momotabletpadres.tablet.api.TabletParseAPI
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Get AdBlockerSettings object!
 *
 * Parse uses a static method for requesting objects
 * so this class encapsulates the Parse static logic for a better testing.
 * Keep so simple as you can
 */
@Singleton
open class AdBlockerSettingsParseAPI @Inject constructor(val tabletParseAPI: TabletParseAPI, val mapper: AdBlockerSettingsToEntityMapper,
                                                         val deh: DebugExceptionHandler
) {

    /**
     * get objects that match tablet Id object
     */
    fun getByTabletId(tabletId: String): List<AdBlockerSettingsEntity>{
        Timber.d("getByTabletId: $tabletId")
        val tablet = ParseTablet.createWithoutData(tabletId)

        CrashlyticsLog.log("Querying to get adBlockerSettings by tabletId")
        val query = ParseQuery.getQuery(AdBlockerSettings::class.java)
        query.whereEqualTo("tablet", tablet)
        query.orderByDescending("updatedAt")
//        query.fromLocalDatastore()
        return query.find().map(mapper::transform)
    }

    /**
     * get objects that match objectId
     */
    fun getById(id:String): List<AdBlockerSettingsEntity>{
        Timber.d("getById: $id")
        return getParseObjectById(id).map(mapper::transform)
    }

    /**
     * get objects that match objectId from local data store
     */
    private fun getParseObjectById(id:String): List<AdBlockerSettings>{
        Timber.d("getParseObjectById: $id")
        CrashlyticsLog.log("Querying to get AdBlockerSettings by parse objectId")
        val query = ParseQuery.getQuery(AdBlockerSettings::class.java)
        query.whereEqualTo("objectId", id)
//        query.fromLocalDatastore()
        return query.find()
    }
}