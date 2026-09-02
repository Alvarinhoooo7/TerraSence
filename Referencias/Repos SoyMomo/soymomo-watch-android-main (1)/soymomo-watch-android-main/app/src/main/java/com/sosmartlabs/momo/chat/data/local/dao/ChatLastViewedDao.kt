package com.sosmartlabs.momo.chat.data.local.dao

import androidx.room.*
import com.sosmartlabs.momo.chat.data.local.entity.ChatLastViewedEntity

@Dao
interface ChatLastViewedDao {
    @Query("SELECT * FROM ChatLastViewed WHERE chat_id = :chatId")
    suspend fun getLastViewed(chatId: String): ChatLastViewedEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(lastViewed: ChatLastViewedEntity)
    
    @Query("UPDATE ChatLastViewed SET last_viewed_at = :timestamp WHERE chat_id = :chatId")
    suspend fun updateLastViewed(chatId: String, timestamp: Long)
}

