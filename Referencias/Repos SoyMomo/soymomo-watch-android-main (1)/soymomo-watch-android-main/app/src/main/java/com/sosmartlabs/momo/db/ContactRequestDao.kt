package com.sosmartlabs.momo.db

import androidx.room.*


/**
 * @author mrg
 * @date 11/13/17
 */
@Dao
interface ContactRequestDao {
    @Query("SELECT * FROM ContactRequest LIMIT 1")
    fun getFirst(): ContactRequest

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun addContactRequest(request: ContactRequest)

    @Delete
    fun deleteContactRequest(request: ContactRequest)

    @Query("DELETE FROM ContactRequest")
    fun deleteAll()
}