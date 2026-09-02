package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.api

import com.parse.ParseQuery
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeSettings
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.remote.ParseSchoolModeSettings
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.exception.DebugExceptionHandler
import com.sosmartlabs.momotabletpadres.models.mapper.SchoolModeSettingsToEntityMapper
import com.sosmartlabs.momotabletpadres.tablet.api.TabletParseAPI
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class SchoolModeSettingsParseAPI @Inject constructor(
    val tabletParseAPI: TabletParseAPI,
    val mapper: SchoolModeSettingsToEntityMapper,
    val deh: DebugExceptionHandler
) {

    fun getByTabletId(tabletId: String): List<SchoolModeSettings> {
        Timber.d("SchoolModeSettingsParseAPI: getByTabletId - Start, tabletId=$tabletId")
        CrashlyticsLog.log("SchoolModeSettingsParseAPI: Querying to get SchoolModeSettings by tabletId=$tabletId")
        val tablet = ParseTablet.createWithoutData(tabletId)
        Timber.v("SchoolModeSettingsParseAPI: getByTabletId - Created ParseTablet for id=$tabletId")

        val query = ParseQuery.getQuery(ParseSchoolModeSettings::class.java)
        query.whereEqualTo("tablet", tablet)
        query.orderByAscending("updatedAt")
        Timber.d("SchoolModeSettingsParseAPI: getByTabletId - Executing query for SchoolModeSettings with tablet=$tabletId")
        val result = query.find()
        Timber.d("SchoolModeSettingsParseAPI: getByTabletId - Query returned ${result.size} results")
        val mapped = result.map {
            try {
                mapper.transform(it)
            } catch (e: Exception) {
                Timber.e(e, "SchoolModeSettingsParseAPI: getByTabletId - Error mapping ParseSchoolModeSettings to SchoolModeSettings for objectId=${it.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "SchoolModeSettingsParseAPI: Error mapping ParseSchoolModeSettings to SchoolModeSettings for objectId=${it.objectId}")
                throw e
            }
        }
        Timber.d("SchoolModeSettingsParseAPI: getByTabletId - Mapped ${mapped.size} SchoolModeSettings")
        return mapped
    }

    fun getById(id: String): List<SchoolModeSettings> {
        Timber.d("SchoolModeSettingsParseAPI: getById - Start, id=$id")
        val parseObjects = getParseObjectById(id)
        Timber.d("SchoolModeSettingsParseAPI: getById - Found ${parseObjects.size} ParseSchoolModeSettings for id=$id")
        val mapped = parseObjects.map {
            try {
                mapper.transform(it)
            } catch (e: Exception) {
                Timber.e(e, "SchoolModeSettingsParseAPI: getById - Error mapping ParseSchoolModeSettings to SchoolModeSettings for objectId=${it.objectId}")
                CrashlyticsLog.recordNonFatalError(e, "SchoolModeSettingsParseAPI: Error mapping ParseSchoolModeSettings to SchoolModeSettings for objectId=${it.objectId}")
                throw e
            }
        }
        Timber.d("SchoolModeSettingsParseAPI: getById - Mapped ${mapped.size} SchoolModeSettings for id=$id")
        return mapped
    }

    /**
     * Get objects that match objectId from local data store
     */
    private fun getParseObjectById(id: String): List<ParseSchoolModeSettings> {
        Timber.d("SchoolModeSettingsParseAPI: getParseObjectById - Start, id=$id")
        CrashlyticsLog.log("SchoolModeSettingsParseAPI: Querying to get SchoolModeSettings by parse objectId=$id")
        val query = ParseQuery.getQuery(ParseSchoolModeSettings::class.java)
        query.whereEqualTo("localId", id)
        Timber.d("SchoolModeSettingsParseAPI: getParseObjectById - Executing query for localId=$id")
        val result = query.find()
        Timber.d("SchoolModeSettingsParseAPI: getParseObjectById - Query returned ${result.size} results for localId=$id")
        return result
    }

    /**
     * Update object - local and cloud, throws exception in Debug
     */
    suspend fun update(objectToUpdate: ParseSchoolModeSettings) {
        Timber.d("SchoolModeSettingsParseAPI: update - Start, objectToUpdate.objectId=${objectToUpdate.objectId}")
        CrashlyticsLog.log("SchoolModeSettingsParseAPI: Updating SchoolModeSettings object with objectId=${objectToUpdate.objectId}")
        objectToUpdate.suspendSave()
        Timber.d("SchoolModeSettingsParseAPI: update - Successfully updated objectId=${objectToUpdate.objectId}")
    }
}