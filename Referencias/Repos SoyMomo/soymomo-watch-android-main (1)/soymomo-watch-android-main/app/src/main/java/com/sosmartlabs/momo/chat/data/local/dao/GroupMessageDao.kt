package com.sosmartlabs.momo.chat.data.local.dao

import androidx.room.*
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioDurationUpdate
import com.sosmartlabs.momo.chat.data.local.entity.ChatAudioWaveformUpdate
import com.sosmartlabs.momo.chat.data.local.entity.GroupMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GroupMessageDao {

    @Query("SELECT * FROM GroupMessageEntity WHERE group_id = :groupId ORDER BY created_at DESC, ulid DESC")
    fun getGroupMessages(groupId: String): Flow<List<GroupMessageEntity>>

    @Query("SELECT * FROM GroupMessageEntity WHERE group_id = :groupId AND created_at BETWEEN :startTime AND :endTime ORDER BY created_at DESC")
    suspend fun getMessagesInTimeWindow(groupId: String, startTime: Long, endTime: Long): List<GroupMessageEntity>

    @Query("SELECT ulid FROM GroupMessageEntity WHERE group_id = :groupId AND ulid IS NOT NULL AND remote_id IS NOT NULL ORDER BY ulid DESC LIMIT 1")
    suspend fun getLatestSyncedUlid(groupId: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessage(message: GroupMessageEntity)

    @Query("SELECT * FROM GroupMessageEntity WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): GroupMessageEntity?

    @Query("SELECT * FROM GroupMessageEntity WHERE ulid = :ulid LIMIT 1")
    suspend fun getByUlid(ulid: String): GroupMessageEntity?

    @Query("SELECT * FROM GroupMessageEntity WHERE remote_id = :remoteId LIMIT 1")
    suspend fun getByRemoteId(remoteId: String): GroupMessageEntity?

    @Query(
        """
        SELECT * FROM GroupMessageEntity
        WHERE group_id = :groupId
        AND sender = '${GroupMessageEntity.SENDER_USER}'
        AND status = '${GroupMessageEntity.STATUS_SENDING}'
        AND remote_id IS NULL
        AND created_at <= :createdBeforeMs
        ORDER BY created_at ASC
        """
    )
    suspend fun getStalePendingOutgoingMessages(groupId: String, createdBeforeMs: Long): List<GroupMessageEntity>

    @Query("DELETE FROM GroupMessageEntity WHERE id = :id")
    suspend fun deleteById(id: String)

    @Update(entity = GroupMessageEntity::class)
    suspend fun updateGroupAudioDurations(updates: Iterable<ChatAudioDurationUpdate>)

    @Update(entity = GroupMessageEntity::class)
    suspend fun updateGroupAudioWaveforms(updates: Iterable<ChatAudioWaveformUpdate>)

    @Query("DELETE FROM GroupMessageEntity WHERE group_id = :groupId")
    suspend fun deleteAllMessagesForGroup(groupId: String)

    @Query("""
        SELECT COUNT(*) FROM GroupMessageEntity 
        WHERE group_id = :groupId 
        AND sender_id != :currentUserId 
        AND created_at > :lastViewedAt
        AND type != '${GroupMessageEntity.TYPE_SEPARATOR}'
    """)
    suspend fun getUnreadCount(groupId: String, currentUserId: String, lastViewedAt: Long): Int
}
