package com.sosmartlabs.momotabletpadres.models.entity

import android.graphics.drawable.Drawable
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class BlockedAdsHistoryEntity(
    val id: String,
    val tabletId: String,
    var summary: String,
) {
    private val gson = Gson()
    var icons: Map<String, Drawable> = mapOf()
    private var _parseSummary: List<AdsBlockedByPackageNameEntity>? = null
    val parseSummary: List<AdsBlockedByPackageNameEntity>
        get() {
            if (_parseSummary == null) {
                val tmpType = object : TypeToken<List<AdsBlockedByPackageNameEntity>>() {}.type
                _parseSummary = gson.fromJson(summary, tmpType)
            }
            return _parseSummary ?: listOf()
        }
}