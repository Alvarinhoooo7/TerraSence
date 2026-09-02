package com.sosmartlabs.momotabletpadres.repositories.adblocker

import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.appicon.AppIconRepository
import com.sosmartlabs.momotabletpadres.appinfo.model.AppInfo
import com.sosmartlabs.momotabletpadres.utils.exception.ObjectDoesNotExistException
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.models.entity.BlockedAdsHistoryEntity
import com.sosmartlabs.momotabletpadres.repositories.adblocker.api.BlockedAdsHistoryParseAPI
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
open class BlockedAdsHistoryRepository @Inject constructor(
    private val blockedAdsHistoryParseAPI: BlockedAdsHistoryParseAPI,
    private val appIconRepository: AppIconRepository,
) {

    /**
     * get AdBlocker settings dor Tablet Parse Object
     */
    suspend fun getBlockedAdsHistoryByTabletId(tabletId: String): BlockedAdsHistoryEntity {
        Timber.d("getBlockedAdsHistoryByTabletId: $tabletId ")
        // Query
        val blockedAdsHistoryEntityList = blockedAdsHistoryParseAPI.getByTabletId(tabletId)
        // output
        if (blockedAdsHistoryEntityList.isEmpty()) {
            throw Exception(ObjectDoesNotExistException())
        }
        val lastBlockedAdsHistoryEntity = blockedAdsHistoryEntityList.first()
        val packageNames = lastBlockedAdsHistoryEntity.parseSummary.mapNotNull { it.packageName }
        val appIcons = getAppIcons(packageNames)
        lastBlockedAdsHistoryEntity.icons = appIcons
        Timber.i("getBlockedAdsHistoryByTabletId: $lastBlockedAdsHistoryEntity")
        return lastBlockedAdsHistoryEntity
    }

    /**
     * Obtain the icons for the given apps
     * @param appPackageNames Package names for the apps for query icons
     * @param appsInfo List of [AppInfo] for been used as icon data source
     * @return [Drawable] icons mapped by app package name
     */
    private suspend fun getAppIcons(
        appPackageNames: List<String>,
        appsInfo: List<AppInfo>? = null
    ): Map<String, Drawable> {
        runCatching {
            appIconRepository.getAppIcons(appPackageNames)
        }.onSuccess {
            Timber.d("getAppIcons: $it")
            return it
        }.onFailure {
            Timber.e(it, "Error obtaining app icons from AppIconRepository")
            CrashlyticsLog.recordNonFatalError(
                it,
                "Error obtaining app icons from AppIconRepository"
            )
        }
        return mapOf()
    }
}