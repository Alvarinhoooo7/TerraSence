package com.sosmartlabs.momo.pushnotifications.model

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query


/**
 * @author mrg
 * @date 11/13/17
 */
@Dao
interface NotificationMessageDao {
    @Query("SELECT * FROM NotificationMessage WHERE type=:type")
    fun getAll(type: Int): List<NotificationMessage>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun addMessage(notificationMessage: NotificationMessage)

    @Query("DELETE FROM NotificationMessage WHERE type=:type")
    fun deleteAll(type: Int)
}