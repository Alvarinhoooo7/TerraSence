package com.sosmartlabs.momo.heymomohistory.data.model


sealed class HeyMomoHistoryItem {
    data class HeyMomoResponseItem(
        val deviceId: String,
        val question: String,
        val response: String,
        val createdAt: String
    ) : HeyMomoHistoryItem()

    data class DateHeader(val date: String) : HeyMomoHistoryItem()
}