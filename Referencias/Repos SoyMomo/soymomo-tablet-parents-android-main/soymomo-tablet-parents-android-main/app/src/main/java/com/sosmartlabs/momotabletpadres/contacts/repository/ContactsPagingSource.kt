package com.sosmartlabs.momotabletpadres.contacts.repository

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.sosmartlabs.momotabletpadres.contacts.model.ContactDetail
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class ContactsPagingSource @Inject constructor(
    private val contactsRepository: ContactsRepository,
    private val allowedNumbersRepository: AllowedNumbersRepository,
    private val tabletId: String
) : PagingSource<Int, ContactDetail>() {

    private var allowedNumbersSet: Set<String>? = null

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, ContactDetail> {
        val page = params.key ?: 0
        Timber.d("ContactsPagingSource: Starting load() for page=$page, loadSize=${params.loadSize}, tabletId=$tabletId")

        try {
            // Step 1: Fetch allowed numbers only once (on first page load)
            if (allowedNumbersSet == null) {
                Timber.d("ContactsPagingSource: Fetching allowed numbers for tabletId=$tabletId")
                try {
                    val allowedNumbers = allowedNumbersRepository.fetchAll(tabletId)
                    allowedNumbersSet = allowedNumbers.mapNotNull { it.phone }.toSet()
                    Timber.d("ContactsPagingSource: Loaded ${allowedNumbersSet?.size ?: 0} allowed numbers for tabletId=$tabletId")
                } catch (e: Exception) {
                    Timber.e(e, "ContactsPagingSource: Error fetching allowed numbers for tabletId=$tabletId")
                    CrashlyticsLog.recordException(e, "ContactsPagingSource: Exception while fetching allowed numbers for tabletId=$tabletId")
                    return LoadResult.Error(e)
                }
            } else {
                Timber.d("ContactsPagingSource: Using cached allowed numbers set (size=${allowedNumbersSet?.size ?: 0}) for tabletId=$tabletId")
            }

            // Step 2: Fetch contacts for this page
            Timber.d("ContactsPagingSource: Fetching contacts for page=$page, pageSize=${params.loadSize}, tabletId=$tabletId")
            val phoneContacts = try {
                contactsRepository.fetchAll(tabletId, page, params.loadSize)
            } catch (e: Exception) {
                Timber.e(e, "ContactsPagingSource: Error fetching contacts for page=$page, tabletId=$tabletId")
                CrashlyticsLog.recordException(e, "ContactsPagingSource: Exception while fetching contacts for page=$page, tabletId=$tabletId")
                return LoadResult.Error(e)
            }
            Timber.d("ContactsPagingSource: Fetched ${phoneContacts.size} phone contacts for page=$page, tabletId=$tabletId")

            // Step 3: Transform to ContactDetail
            Timber.d("ContactsPagingSource: Transforming phone contacts to ContactDetail for page=$page")
            val contactDetails = phoneContacts.flatMap { contact ->
                contact.phones?.map { phone ->
                    ContactDetail(
                        phoneContactObjectId = contact.objectId,
                        phone = phone ?: "",
                        fullName = "${contact.firstName ?: ""} ${contact.lastName ?: ""}".trim(),
                        isAllowed = allowedNumbersSet?.contains(phone) ?: false
                    )
                } ?: emptyList()
            }
            Timber.d("ContactsPagingSource: Transformed to ${contactDetails.size} contact details for page=$page")

            // Step 4: Build LoadResult.Page
            val prevKey = if (page == 0) null else page - 1
            val nextKey = if (phoneContacts.size < params.loadSize) null else page + 1
            Timber.d("ContactsPagingSource: Returning LoadResult.Page for page=$page, prevKey=$prevKey, nextKey=$nextKey, dataSize=${contactDetails.size}")

            return LoadResult.Page(
                data = contactDetails,
                prevKey = prevKey,
                nextKey = nextKey
            )
        } catch (e: Exception) {
            Timber.e(e, "ContactsPagingSource: Unexpected error in load() for page=$page, tabletId=$tabletId")
            CrashlyticsLog.recordException(e, "ContactsPagingSource: Unexpected exception in load() for page=$page, tabletId=$tabletId")
            return LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, ContactDetail>): Int? {
        Timber.d("ContactsPagingSource: getRefreshKey() called")
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            val refreshKey = anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
            Timber.d("ContactsPagingSource: getRefreshKey() returning $refreshKey")
            refreshKey
        }
    }
}