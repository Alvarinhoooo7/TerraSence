package com.sosmartlabs.momotabletpadres.core.settings.new_designs.repository

import com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.InstalledApp
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.utils.DateUtil
import com.sosmartlabs.momotabletpadres.core.settings.new_designs.model.AppStats
import java.util.*
import javax.inject.Singleton

/**
 * Statistics about app usage!
 */
@Singleton
abstract class AppStatsRepositoryBase (
) {

    private fun intervalInterface(interval: Int = 0): Date {
        return when (interval) {
            0 -> DateUtil.getStartOfDay()
            1 -> DateUtil.getStartOfCurrentWeek()
            12 -> DateUtil.getTwoDaysAgo()
            13 -> DateUtil.getThreeDaysAgo()
            14 -> DateUtil.getFourDaysAgo()
            15 -> DateUtil.getFiveDaysAgo()
            16 -> DateUtil.getSixDaysAgo()
            17 -> DateUtil.getSevenDaysAgo()
            27 -> DateUtil.getTwoWeeksAgo()
            else -> DateUtil.getStartOfDay()
        }
    }

    abstract suspend fun getGranularUsageStats(
        interval: Int = 0, tablet: Tablet, customDate: Date? = null): List<AppStats>

    abstract suspend fun getUsageStats(interval: Int = 0, tablet: Tablet, customDate: Date? = null, installedAppsList: List<InstalledApp>? = null): List<AppStats>

    abstract suspend fun getUsageStatsSpecificDay(interval: Int, tablet: Tablet, customDate: Date? = null, installedAppsList: List<InstalledApp>? = null): List<AppStats>
    /**
     * Refactor getDailyAppUsageTime
     * Obtains the current usage time in seconds for the app given for the provided package name
     * @param packageName Package name for the app to query
     * @return Daily usage time in seconds for the app
     */
    abstract fun getDailyAppUsageTime(packageName: String): Int

    /**
     * Refactor getAccumulatedUseTimeSeconds
     */
    abstract suspend fun getAccumulatedUseTimeSeconds(tablet: Tablet): Int

    abstract fun getForegroundApp(): String?

    abstract fun getTimePerDayLastWeek(dayOfWeek: Int): MutableList<Long>

    abstract fun getTimeWeekBefore() : Long

    abstract fun getAppUsageToday(packageName: String) : Long


}