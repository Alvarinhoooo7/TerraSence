package com.sosmartlabs.momotabletpadres.models.mapper

import com.google.gson.Gson
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeSettings
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.remote.ParseSchoolModeSettings
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeMapper.Companion.deserializeAllowedApps
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeMapper.Companion.stringToLocalTime
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SchoolModeSettingsToEntityMapper @Inject constructor() {

    /**
     * Serialization
     */
    private val gson = Gson()


    fun transform(schoolModeSettings: ParseSchoolModeSettings): SchoolModeSettings {
        Timber.d("transform: map from $schoolModeSettings to entity")
        return SchoolModeSettings(
                id = schoolModeSettings.localId!!,
                objectId = schoolModeSettings.objectId,
                tabletObjectId = schoolModeSettings.tablet!!.objectId,
                enabled = schoolModeSettings.enabled!!,
                from = stringToLocalTime(schoolModeSettings.from!!),
                to = stringToLocalTime(schoolModeSettings.to!!),
                allowedApps = deserializeAllowedApps(schoolModeSettings.allowedApps!!),
                days = schoolModeSettings.days,
        )
    }
}