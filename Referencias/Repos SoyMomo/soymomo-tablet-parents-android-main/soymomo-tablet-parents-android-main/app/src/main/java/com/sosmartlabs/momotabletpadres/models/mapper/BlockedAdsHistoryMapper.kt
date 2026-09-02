package com.sosmartlabs.momotabletpadres.models.mapper

import com.sosmartlabs.momotabletpadres.models.AdBlockerSettings
import com.sosmartlabs.momotabletpadres.models.BlockedAdsHistory
import com.sosmartlabs.momotabletpadres.models.entity.AdBlockerSettingsEntity
import com.sosmartlabs.momotabletpadres.models.entity.BlockedAdsHistoryEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BlockedAdsHistoryMapper @Inject constructor() {

    /**
     * [AdBlockerSettings] to [AdBlockerSettingsEntity]
     */
    fun transform(blockedAdsHistory: BlockedAdsHistory): BlockedAdsHistoryEntity {
        return BlockedAdsHistoryEntity(
            summary = blockedAdsHistory.summary,
            id = blockedAdsHistory.objectId,
            tabletId = blockedAdsHistory.tablet.objectId
        )
    }
}