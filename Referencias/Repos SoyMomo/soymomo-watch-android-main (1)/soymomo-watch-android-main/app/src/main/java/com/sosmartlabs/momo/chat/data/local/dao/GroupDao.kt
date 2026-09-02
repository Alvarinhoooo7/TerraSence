package com.sosmartlabs.momo.chat.data.local.dao

import androidx.room.*
import com.sosmartlabs.momo.chat.data.local.entity.GroupEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GroupDao {

    @Query("SELECT * FROM GroupEntity ORDER BY last_message_time DESC")
    fun getAllGroups(): Flow<List<GroupEntity>>

    @Query("SELECT * FROM GroupEntity WHERE id = :groupId")
    suspend fun getGroupById(groupId: String): GroupEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGroup(group: GroupEntity)

    @Update
    suspend fun updateGroup(group: GroupEntity)

    @Delete
    suspend fun deleteGroup(group: GroupEntity)

    @Query("SELECT count(*)!=0 FROM GroupEntity WHERE id = :groupId")
    suspend fun exists(groupId: String): Boolean

    @Query("UPDATE GroupEntity SET unread_count = :count WHERE id = :groupId")
    suspend fun updateUnreadCount(groupId: String, count: Int)

    @Query("SELECT id FROM GroupEntity")
    suspend fun getAllGroupIds(): List<String>

    @Query("DELETE FROM GroupEntity WHERE id IN (:ids)")
    suspend fun deleteGroupsByIds(ids: List<String>)
}

