package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode

import com.parse.ParseObject
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeSettings
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeSettingsRepositoryBase
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.remote.ParseSchoolModeSettings
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SchoolModeMapper
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model.SelectableApp
import com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.api.SchoolModeSettingsParseAPI
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import java.time.LocalTime
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SchoolModeSettingsRepository @Inject constructor(
    private val parseAPI: SchoolModeSettingsParseAPI
) : SchoolModeSettingsRepositoryBase() {

    override suspend fun getSchoolModeSettings(tablet: Tablet): SchoolModeSettings {
        Timber.d("SchoolModeSettingsRepository: getSchoolModeSettings - Start for tabletId=${tablet.objectId}")
        val result = parseAPI.getByTabletId(tablet.objectId!!)
        if (result.isEmpty()) {
            Timber.e("SchoolModeSettingsRepository: getSchoolModeSettings - No SchoolModeSettings found for tabletId=${tablet.objectId}")
            CrashlyticsLog.log("SchoolModeSettingsRepository: No SchoolModeSettings found for tabletId=${tablet.objectId}")
        } else {
            Timber.d("SchoolModeSettingsRepository: getSchoolModeSettings - Found ${result.size} SchoolModeSettings, returning last")
        }
        return result.last()
    }

    override suspend fun removeAllowedApp(tablet: Tablet, app: SelectableApp) {
        Timber.d("SchoolModeSettingsRepository: removeAllowedApp - Start for tabletId=${tablet.objectId}, app=${app}")
        val settings = getSchoolModeSettings(tablet)
        Timber.d("SchoolModeSettingsRepository: removeAllowedApp - Current allowedApps: ${settings.allowedApps}")
        val allowedApps = settings.allowedApps.toMutableList().apply { 
            val removed = remove(app)
            if (!removed) {
                Timber.w("SchoolModeSettingsRepository: removeAllowedApp - App $app not found in allowedApps for tabletId=${tablet.objectId}")
            } else {
                Timber.d("SchoolModeSettingsRepository: removeAllowedApp - App $app removed from allowedApps for tabletId=${tablet.objectId}")
            }
        }
        settings.allowedApps = allowedApps
        Timber.d("SchoolModeSettingsRepository: removeAllowedApp - Updating SchoolModeSettings in Parse")
        parseAPI.update(settings.toParseSchoolModeSettings())
        Timber.d("SchoolModeSettingsRepository: removeAllowedApp - Update complete for tabletId=${tablet.objectId}")
    }

    override suspend fun setAllowedApps(tablet: Tablet, list: List<SelectableApp>) {
        Timber.d("SchoolModeSettingsRepository: setAllowedApps - Start for tabletId=${tablet.objectId}, newAllowedApps=$list")
        val settings = getSchoolModeSettings(tablet)
        settings.allowedApps = list
        Timber.d("SchoolModeSettingsRepository: setAllowedApps - Updating SchoolModeSettings in Parse")
        parseAPI.update(settings.toParseSchoolModeSettings())
        Timber.d("SchoolModeSettingsRepository: setAllowedApps - Update complete for tabletId=${tablet.objectId}")
    }

    override suspend fun setFlagEnabled(tablet: Tablet, value: Boolean) {
        Timber.d("SchoolModeSettingsRepository: setFlagEnabled - Start for tabletId=${tablet.objectId}, enabled=$value")
        val settings = getSchoolModeSettings(tablet)
        settings.enabled = value
        Timber.d("SchoolModeSettingsRepository: setFlagEnabled - Updating SchoolModeSettings in Parse")
        parseAPI.update(settings.toParseSchoolModeSettings())
        Timber.d("SchoolModeSettingsRepository: setFlagEnabled - Update complete for tabletId=${tablet.objectId}")
    }

    override suspend fun setTime(tablet: Tablet, from: LocalTime, to: LocalTime) {
        Timber.d("SchoolModeSettingsRepository: setTime - Start for tabletId=${tablet.objectId}, from=$from, to=$to")
        val settings = getSchoolModeSettings(tablet)
        settings.from = from
        settings.to = to
        Timber.d("SchoolModeSettingsRepository: setTime - Updating SchoolModeSettings in Parse")
        parseAPI.update(settings.toParseSchoolModeSettings())
        Timber.d("SchoolModeSettingsRepository: setTime - Update complete for tabletId=${tablet.objectId}")
    }

    private fun SchoolModeSettings.toParseSchoolModeSettings() =
        ParseObject.createWithoutData(ParseSchoolModeSettings::class.java, objectId).apply {
            Timber.d("SchoolModeSettingsRepository: toParseSchoolModeSettings - Serializing SchoolModeSettings for objectId=$objectId")
            this.allowedApps = SchoolModeMapper.serializeAllowedApps(this@toParseSchoolModeSettings.allowedApps)
            this.from = SchoolModeMapper.localTimeToString(this@toParseSchoolModeSettings.from)
            this.to = SchoolModeMapper.localTimeToString(this@toParseSchoolModeSettings.to)
            this.tablet = ParseTablet.createWithoutData(this@toParseSchoolModeSettings.tabletObjectId!!)
            this.enabled = this@toParseSchoolModeSettings.enabled
            this.localId = this@toParseSchoolModeSettings.id
            Timber.d("SchoolModeSettingsRepository: toParseSchoolModeSettings - Serialization complete for objectId=$objectId")
        }
}