package com.sosmartlabs.momotabletpadres.core.settings.dug.common.model

/**
 * Items displayed in the DUG unified detection list.
 * Either a detection card or a date separator header.
 */
sealed class DugListItem {
    data class Detection(val item: UnifiedDetectionItem) : DugListItem()
    data class DateHeader(val label: String) : DugListItem()
}
