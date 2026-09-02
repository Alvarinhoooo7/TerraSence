package com.sosmartlabs.momo.pushnotifications.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "NotificationMessage")
data class NotificationMessage(@ColumnInfo(name = "text") val text: String,
                               @ColumnInfo(name = "sender") val sender: String,
                               @ColumnInfo(name = "timestamp") val timestamp: Long,
                               @ColumnInfo(name = "type") val type: Int) {
    @PrimaryKey(autoGenerate = true)
    var id: Int = 0

    companion object {
        const val TYPE_MOMO = 1
        const val TYPE_USER = 2
        const val TYPE_REQUEST = 3
    }
}