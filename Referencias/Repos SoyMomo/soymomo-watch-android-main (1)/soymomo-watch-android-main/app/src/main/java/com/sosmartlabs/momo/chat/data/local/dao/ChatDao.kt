package com.sosmartlabs.momo.chat.data.local.dao

import android.database.Cursor
import androidx.room.*
import com.sosmartlabs.momo.chat.data.local.entity.*
import kotlinx.coroutines.flow.Flow

/**
 * The Data Access Object for the Avatar class.
 */
@Dao
interface ChatDao {

    @Query("SELECT * FROM ChatEntity")
    fun fetch(): Cursor

    /**
     * Get chat messages ordered by timestamp with consistent ordering
     * Using ID as secondary sort to handle cases where timestamps are identical
     */
    @Query("SELECT * FROM ChatEntity WHERE chat_id = :id ORDER BY created_at DESC, id ASC")
    fun getChatList(id: String): Flow<List<ChatEntity>>

    @Query("SELECT id FROM ChatEntity WHERE chat_id = :chatId AND sender = '${ChatEntity.SENDER_APP}' AND status NOT IN ('${ChatEntity.STATUS_RECEIVED}', '${ChatEntity.STATUS_ERROR}')")
    suspend fun getSentChatsMessageIdsForUpdate(chatId: String): List<String>

    @Insert(onConflict = OnConflictStrategy.REPLACE, entity = ChatEntity::class)
    suspend fun insertChatMessage(chat: ChatWebUpdate)

    @Update(entity = ChatEntity::class)
    suspend fun updateChatMessage(chat: ChatWebUpdate)

    @Update(entity = ChatEntity::class)
    suspend fun updateChatAudioDurations(chats: Iterable<ChatAudioDurationUpdate>)

    @Update(entity = ChatEntity::class)
    suspend fun updateChatAudioWaveforms(updates: Iterable<ChatAudioWaveformUpdate>)

    @Delete
    suspend fun deleteChatMessage(chat: ChatEntity)

    @Query("SELECT count(*)!=0 FROM ChatEntity WHERE id = :id ")
    fun exists(id: String): Boolean

    // Add an additional function to detect any timestamp issues
    @Query("SELECT COUNT(*) FROM ChatEntity c1 INNER JOIN ChatEntity c2 ON c1.id != c2.id AND c1.created_at = c2.created_at WHERE c1.chat_id = :chatId AND c1.type != '${ChatEntity.TYPE_SEPARATOR}' AND c2.type != '${ChatEntity.TYPE_SEPARATOR}'")
    suspend fun countDuplicateTimestamps(chatId: String): Int
    
    // Add a function to find all messages in a specific time window to help debug ordering issues
    @Query("SELECT * FROM ChatEntity WHERE chat_id = :chatId AND created_at BETWEEN :startTime AND :endTime ORDER BY created_at DESC")
    suspend fun getMessagesInTimeWindow(chatId: String, startTime: Long, endTime: Long): List<ChatEntity>

    @Query("""
        SELECT COUNT(*) FROM ChatEntity 
        WHERE chat_id = :chatId 
        AND sender = '${ChatEntity.SENDER_WATCH}' 
        AND created_at > :lastViewedAt
        AND type != '${ChatEntity.TYPE_SEPARATOR}'
    """)
    suspend fun getUnreadCount(chatId: String, lastViewedAt: Long): Int

    @Query("SELECT COUNT(*) FROM ChatEntity WHERE chat_id = :chatId")
    suspend fun getMessageCountByChatId(chatId: String): Int

}
