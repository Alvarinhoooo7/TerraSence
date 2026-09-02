package com.sosmartlabs.momotabletpadres.tabletsettings.times.schoolmode.model

import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import java.time.LocalTime

abstract class SchoolModeSettingsRepositoryBase {

    abstract suspend fun getSchoolModeSettings(tablet: Tablet): SchoolModeSettings

    abstract suspend fun setTime(tablet: Tablet, from: LocalTime, to: LocalTime)

    abstract suspend fun setFlagEnabled(tablet: Tablet, value: Boolean)

    abstract suspend fun setAllowedApps(tablet: Tablet, list: List<SelectableApp>)

    abstract suspend fun removeAllowedApp(tablet: Tablet, app: SelectableApp)

}