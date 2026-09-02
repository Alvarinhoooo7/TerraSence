package com.sosmartlabs.momotabletpadres.models.entity

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * Entity for handling B4A AdBlocker states and summary of blocks.
 */
data class AdBlockerSettingsEntity(
    val id: String,
    val tabletId: String,
    var enabled: Boolean,
    var summary: String
) {
    private val gson = Gson()
    private var _parseSummary: List<AdBlockerAppSummaryEntity>? = null
    val parseSummary: List<AdBlockerAppSummaryEntity>
        get() {
            if (_parseSummary == null) {
                val tmpType = object : TypeToken<List<AdBlockerAppSummaryEntity>>() {}.type
                _parseSummary = gson.fromJson(summary, tmpType)
            }
            return _parseSummary ?: listOf()
        }
}
