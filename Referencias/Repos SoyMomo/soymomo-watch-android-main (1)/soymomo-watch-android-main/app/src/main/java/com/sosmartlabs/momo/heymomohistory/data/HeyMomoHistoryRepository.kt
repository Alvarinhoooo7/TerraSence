package com.sosmartlabs.momo.heymomohistory.data

import android.content.Context
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momo.heymomohistory.data.model.Fact
import com.sosmartlabs.momo.heymomohistory.data.model.HeyMomoHistoryItem
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.CoroutineContext

@Singleton
class HeyMomoHistoryRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ioContext: CoroutineContext
) {

    // Accumulated raw history pages per device. Because the repository is @Singleton this
    // also acts as an in-memory cache that survives fragment/ViewModel recreation, so a
    // re-opened History screen can render instantly while it refreshes in the background.
    private val historyPages = ConcurrentHashMap<String, List<HeyMomoHistoryItem.HeyMomoResponseItem>>()
    private val historyExhausted = ConcurrentHashMap<String, Boolean>()

    // Serializes the read-modify-write of the cache so a refresh and a load-more (both on the
    // IO pool) can't interleave — which would drop the appended page or leave stale rows cached.
    private val historyMutex = Mutex()

    /** Cached, display-ready history for [deviceId], or null if nothing has been loaded yet. */
    fun cachedHeyMomoHistory(deviceId: String): List<HeyMomoHistoryItem>? =
        historyPages[deviceId]?.takeIf { it.isNotEmpty() }?.let { groupByDate(it) }

    /** False once the backend has returned the final page (or stopped yielding new rows). */
    fun hasMoreHeyMomoHistory(deviceId: String): Boolean = historyExhausted[deviceId] != true

    /** Reload from the newest page, replacing any accumulated/cached pages. */
    suspend fun refreshHeyMomoHistory(deviceId: String): List<HeyMomoHistoryItem> = withContext(ioContext) {
        historyMutex.withLock {
            val page = fetchHistoryPage(deviceId, limit = PAGE_SIZE, skip = 0)
            val existing = historyPages[deviceId]
            if (page.isEmpty() && !existing.isNullOrEmpty()) {
                // Transient/empty backend response — keep the populated cache rather than wiping
                // a good screen (history is effectively append-only).
                return@withLock groupByDate(existing)
            }
            historyPages[deviceId] = page
            historyExhausted[deviceId] = page.size < PAGE_SIZE
            groupByDate(page)
        }
    }

    /** Append the next (older) page. Safe — and a no-op — if the backend does not paginate. */
    suspend fun loadMoreHeyMomoHistory(deviceId: String): List<HeyMomoHistoryItem> = withContext(ioContext) {
        historyMutex.withLock {
            val current = historyPages[deviceId].orEmpty()
            if (historyExhausted[deviceId] == true) return@withLock groupByDate(current)

            val page = fetchHistoryPage(deviceId, limit = PAGE_SIZE, skip = current.size)
            val seen = current.mapTo(HashSet()) { it.dedupeKey() }
            val fresh = page.filter { it.dedupeKey() !in seen }
            val combined = current + fresh
            historyPages[deviceId] = combined
            // Stop when the backend returns a short page, or yields nothing new (e.g. it ignores
            // `skip` and keeps returning the same rows) — prevents an infinite load-more loop.
            historyExhausted[deviceId] = page.size < PAGE_SIZE || fresh.isEmpty()
            groupByDate(combined)
        }
    }

    private suspend fun fetchHistoryPage(
        deviceId: String,
        limit: Int,
        skip: Int
    ): List<HeyMomoHistoryItem.HeyMomoResponseItem> {
        val parameters = hashMapOf<String, Any>(
            "deviceId" to deviceId,
            // Bounds the server query and payload so a large history can't blow past the
            // network timeout. Requires the `fetchHeyMomoHistory` cloud function to honor
            // `limit`/`skip`; harmlessly ignored otherwise (the dedupe guard above keeps
            // load-more safe even then).
            "limit" to limit,
            "skip" to skip
        )
        Timber.d("fetchHeyMomoHistory parameters: $parameters")

        val result = callCloudFunction<List<Map<String, Any>>>("fetchHeyMomoHistory", parameters)

        return result.mapNotNull { item ->
            val question = item["question"] as? String
            val answer = item["answer"] as? String
            val createdAt = item["createdAt"] as? String
            if (question == null || answer == null || createdAt == null) {
                Timber.w("Skipping malformed HeyMomo history item: $item")
                null
            } else {
                HeyMomoHistoryItem.HeyMomoResponseItem(
                    deviceId = deviceId,
                    question = question,
                    response = answer,
                    createdAt = createdAt
                )
            }
        }
    }

    private fun groupByDate(
        items: List<HeyMomoHistoryItem.HeyMomoResponseItem>
    ): List<HeyMomoHistoryItem> {
        // SimpleDateFormat is not thread-safe; use a local instance per call.
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val sortedList = items.sortedByDescending { it.createdAt }

        val finalList = mutableListOf<HeyMomoHistoryItem>()
        var currentHeader: String? = null
        for (item in sortedList) {
            val date = try {
                dateFormat.format(dateFormat.parse(item.createdAt)!!)
            } catch (e: Exception) {
                item.createdAt
            }
            if (date != currentHeader) {
                currentHeader = date
                finalList.add(HeyMomoHistoryItem.DateHeader(date = currentHeader))
            }
            finalList.add(item)
        }
        return finalList
    }

    private fun HeyMomoHistoryItem.HeyMomoResponseItem.dedupeKey(): String =
        "$createdAt|$question|$response"

    // Facts CRUD operations
    suspend fun getFactsList(deviceId: String, deviceType: String): List<Fact> {
        val parameters = hashMapOf(
            "deviceId" to deviceId,
            "deviceType" to deviceType
        )
        Timber.d("getFactsList parameters: $parameters")

        val result = callCloudFunction<Map<String, Any>>("listHeyMomoMemories", parameters)
        Timber.d("getFactsList result: $result")

        val factsData = result["facts"] as? List<Map<String, Any>> ?: emptyList()
        return factsData.map { Fact.fromMap(it, context) }
    }

    suspend fun addFact(deviceId: String, deviceType: String, fact: Fact): Fact {
        val parameters = hashMapOf(
            "deviceId" to deviceId,
            "deviceType" to deviceType,
            "fact" to fact.toMap(context)
        )
        Timber.d("addFact parameters: $parameters")

        val result = callCloudFunction<Map<String, Any>>("addHeyMomoFact", parameters)
        Timber.d("addFact result: $result")

        return Fact.fromMap(result, context)
    }

    suspend fun updateFact(deviceId: String, deviceType: String, fact: Fact): Fact {
        if (fact.id == null) {
            throw IllegalArgumentException("Cannot update fact without an ID")
        }

        val parameters = hashMapOf(
            "deviceId" to deviceId,
            "deviceType" to deviceType,
            "fact" to fact.toMap(context)
        )
        Timber.d("updateFact parameters: $parameters")

        val result = callCloudFunction<Map<String, Any>>("updateHeyMomoFact", parameters)
        Timber.d("updateFact result: $result")

        return Fact.fromMap(result, context)
    }

    suspend fun deleteFact(factId: String, deviceId: String): Boolean {
        val parameters = hashMapOf(
            "memoryId" to factId,
            "type" to "fact",
            "deviceId" to deviceId
        )
        Timber.d("deleteFact parameters: $parameters")

        val result = callCloudFunction<Map<String, Any>>("deleteHeyMomoMemory", parameters)
        Timber.d("deleteFact result: $result")

        return result["deleted_at"] != null
    }

    companion object {
        // Most-recent page size requested per fetch. Keep in sync with the
        // `fetchHeyMomoHistory` cloud function's expectations once it honors `limit`.
        private const val PAGE_SIZE = 50
    }
}