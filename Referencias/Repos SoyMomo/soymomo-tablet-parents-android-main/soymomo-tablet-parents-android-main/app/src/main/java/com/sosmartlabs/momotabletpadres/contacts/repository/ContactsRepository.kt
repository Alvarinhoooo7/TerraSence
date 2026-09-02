package com.sosmartlabs.momotabletpadres.contacts.repository

import android.content.Context
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.contacts.model.remote.ParsePhoneContact
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContactsRepository @Inject constructor(
    @ApplicationContext context: Context
) {

    suspend fun fetchAll(tabletId: String, page: Int, pageSize: Int): List<ParsePhoneContact> = withContext(Dispatchers.IO) {
        Timber.d("ContactsRepository: Starting fetchAll for tabletId=$tabletId, page=$page, pageSize=$pageSize")

        // Step 1: Create ParseTablet reference
        Timber.d("ContactsRepository: Creating ParseTablet reference for id=$tabletId")
        val parseTablet = ParseTablet.createWithoutData(tabletId)

        // Step 2: Build ParseQuery for ParsePhoneContact
        Timber.d("ContactsRepository: Building ParseQuery for ParsePhoneContact")
        val query: ParseQuery<ParsePhoneContact> = ParseQuery.getQuery(ParsePhoneContact::class.java).apply {
            whereEqualTo("device", parseTablet)
            orderByAscending("firstName")
            limit = pageSize
            skip = page * pageSize
        }

        // Step 3: Execute query
        Timber.d("ContactsRepository: Executing query to fetch contacts (skip=${query.skip}, limit=${query.limit})")
        try {
            val contacts = query.find()
            Timber.d("ContactsRepository: Query successful, fetched ${contacts.size} contacts for tabletId=$tabletId, page=$page")
            contacts
        } catch (e: Exception) {
            Timber.e("ContactsRepository: Error fetching contacts for tabletId=$tabletId, page=$page, pageSize=$pageSize - ${e.message}")
            CrashlyticsLog.recordException(e, "ContactsRepository: Exception in fetchAll(tabletId=$tabletId, page=$page, pageSize=$pageSize)")
            throw e
        }
    }
}