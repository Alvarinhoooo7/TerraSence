package com.sosmartlabs.momotabletpadres.repositories.safewalking.api

import com.parse.ParseQuery
import com.parse.coroutines.first
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.SafeWalkingSettings
import com.sosmartlabs.momotabletpadres.core.common.safewalking.model.remote.ParseSafeWalkingSettings
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.models.mapper.safewalking.SafeWalkingSettingsMapper
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SafeWalkingSettingsParseDataSource @Inject constructor(
    val mapper: SafeWalkingSettingsMapper
) {

    suspend fun getSafeWalkingSettings(tablet: Tablet): SafeWalkingSettings {
        Timber.d("getSafeWalkingSettingsEntity")
        val parseTablet = ParseTablet.createWithoutData(tablet.objectId!!)
        val query = ParseQuery.getQuery(ParseSafeWalkingSettings::class.java)
        query.whereEqualTo("tablet", parseTablet)
        return query.first().let(mapper::transform)
    }

    suspend fun updateSafeWalkingSettings(parseSafeWalkingSettings: ParseSafeWalkingSettings) {
        parseSafeWalkingSettings.suspendSave()
    }
}