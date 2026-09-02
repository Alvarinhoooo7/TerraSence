package com.sosmartlabs.momotabletpadres.contacts.repository

import android.content.Context
import com.parse.ParseObject
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.contacts.model.remote.ParseAllowedNumber
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AllowedNumbersRepository @Inject constructor(
    @ApplicationContext context: Context
) {

    suspend fun fetchAll(tabletId: String): List<ParseAllowedNumber> = withContext(Dispatchers.IO) {
        Timber.d("AllowedNumbersRepository: [fetchAll] Step 1: Start fetching allowed numbers for deviceId=$tabletId")
        val parseTablet = ParseTablet.createWithoutData(tabletId)
        Timber.d("AllowedNumbersRepository: [fetchAll] Step 2: Created ParseTablet reference for id=$tabletId")

        val query: ParseQuery<ParseAllowedNumber> = ParseQuery.getQuery(ParseAllowedNumber::class.java).apply {
            whereEqualTo("device", parseTablet)
            limit = 1000
        }
        Timber.d("AllowedNumbersRepository: [fetchAll] Step 3: Built ParseQuery for allowed numbers (limit=1000)")

        try {
            Timber.d("AllowedNumbersRepository: [fetchAll] Step 4: Executing query to fetch allowed numbers")
            val allowedNumbers = query.find()
            Timber.d("AllowedNumbersRepository: [fetchAll] Step 5: Successfully fetched ${allowedNumbers.size} allowed numbers for deviceId=$tabletId")
            allowedNumbers
        } catch (e: Exception) {
            Timber.e(e, "AllowedNumbersRepository: [fetchAll] Error fetching allowed numbers for deviceId=$tabletId: ${e.message}")
            CrashlyticsLog.recordException(e, "AllowedNumbersRepository: Exception in fetchAll(tabletId=$tabletId)")
            throw e
        }
    }

    suspend fun addAllowedNumber(phone: String, tabletId: String) = withContext(Dispatchers.IO) {
        Timber.d("AllowedNumbersRepository: [addAllowedNumber] Step 1: Start adding allowed number '$phone' for deviceId=$tabletId")
        val parseTablet = ParseTablet.createWithoutData(tabletId)
        Timber.d("AllowedNumbersRepository: [addAllowedNumber] Step 2: Created ParseTablet reference for id=$tabletId")

        val allowedNumber = ParseAllowedNumber().apply {
            this.phone = phone
            this.device = parseTablet
        }
        Timber.d("AllowedNumbersRepository: [addAllowedNumber] Step 3: Created ParseAllowedNumber object for phone=$phone")

        try {
            Timber.d("AllowedNumbersRepository: [addAllowedNumber] Step 4: Saving allowed number to backend")
            allowedNumber.save()
            Timber.d("AllowedNumbersRepository: [addAllowedNumber] Step 5: Successfully added allowed number '$phone' for deviceId=$tabletId")
        } catch (e: Exception) {
            Timber.e(e, "AllowedNumbersRepository: [addAllowedNumber] Error adding allowed number '$phone' for deviceId=$tabletId: ${e.message}")
            CrashlyticsLog.recordException(e, "AllowedNumbersRepository: Exception in addAllowedNumber(phone=$phone, tabletId=$tabletId)")
            throw e
        }
    }

    suspend fun removeAllowedNumber(phone: String, tabletId: String) = withContext(Dispatchers.IO) {
        Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 1: Start removing allowed number '$phone' for deviceId=$tabletId")
        val parseTablet = ParseTablet.createWithoutData(tabletId)
        Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 2: Created ParseTablet reference for id=$tabletId")

        val query: ParseQuery<ParseAllowedNumber> = ParseQuery.getQuery(ParseAllowedNumber::class.java).apply {
            whereEqualTo("phone", phone)
            whereEqualTo("device", parseTablet)
        }
        Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 3: Built ParseQuery to find allowed number '$phone' for deviceId=$tabletId")

        try {
            Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 4: Executing query to find allowed number(s) to delete")
            val objectsToDelete = query.find()
            Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 5: Found ${objectsToDelete.size} allowed number(s) to delete for phone=$phone, deviceId=$tabletId")
            ParseObject.deleteAll(objectsToDelete)
            Timber.d("AllowedNumbersRepository: [removeAllowedNumber] Step 6: Successfully removed allowed number '$phone' for deviceId=$tabletId")
        } catch (e: Exception) {
            Timber.e(e, "AllowedNumbersRepository: [removeAllowedNumber] Error removing allowed number '$phone' for deviceId=$tabletId: ${e.message}")
            CrashlyticsLog.recordException(e, "AllowedNumbersRepository: Exception in removeAllowedNumber(phone=$phone, tabletId=$tabletId)")
            throw e
        }
    }
}