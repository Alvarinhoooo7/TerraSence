package com.sosmartlabs.momo.steps.repository

import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Space3
import com.sosmartlabs.momo.models.Space4
import com.sosmartlabs.momo.steps.model.PedometerData
import com.sosmartlabs.momo.steps.model.remote.Pedometer
import com.sosmartlabs.momo.steps.model.remote.PedometerSteps
import com.sosmartlabs.momo.utils.DateUtil
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

class PedometerRepository @Inject constructor() {
    
    private suspend fun findPedometerData(watch: Wearer, from: Date, limit: Int): List<Pedometer> {
        Timber.d("PedometerRepository: Finding Pedometer data for wearer ${watch.objectId} from ${from.time} with limit $limit")
        CrashlyticsLog.log("Querying Pedometer data for wearer ${watch.objectId} from ${from.time}")
        
        try {
            val result = ParseQuery.getQuery(Pedometer::class.java)
                .whereEqualTo("wearer", watch)
                .whereGreaterThan("date", from)
                .addDescendingOrder("date")
                .setLimit(limit)
                .suspendFind()
            
            Timber.d("PedometerRepository: Found ${result.size} Pedometer records")
            for (record in result) {
                Timber.d("PedometerRepository: Record: date: ${record.date} - updatedAt: ${record.updatedAt} - steps: ${record.steps} - finalSteps: ${record.finalSteps} - stepZero: ${record.stepZero}")
            }
            return result
        } catch (e: Exception) {
            Timber.e("PedometerRepository: Error fetching Pedometer data: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Failed to fetch Pedometer data for wearer ${watch.objectId}")
            throw e
        }
    }

    private suspend fun findPedometerStepsData(watch: Wearer, dateKeys: List<String>): List<PedometerSteps> {
        Timber.d("PedometerRepository: Finding PedometerSteps for wearer ${watch.objectId}, dateKeys=$dateKeys")
        CrashlyticsLog.log("Querying PedometerSteps data for wearer ${watch.objectId}, dateKeys=$dateKeys")

        try {
            val result = ParseQuery.getQuery(PedometerSteps::class.java)
                .whereEqualTo("wearer", watch)
                .whereContainedIn("dateKey", dateKeys)
                .suspendFind()

            Timber.d("PedometerRepository: Found ${result.size} PedometerSteps records")
            for (record in result) {
                Timber.d("PedometerRepository: Record: dateKey=${record.dateKey} - steps=${record.steps} - updatedAt=${record.updatedAt}")
            }
            return result
        } catch (e: Exception) {
            Timber.e("PedometerRepository: Error fetching PedometerSteps data: ${e.message}")
            CrashlyticsLog.recordNonFatalError(e, "Failed to fetch PedometerSteps data for wearer ${watch.objectId}")
            throw e
        }
    }
    
    /**
     * Fetches pedometer data based on the watch model and maps it to PedometerData.
     * Uses PedometerSteps for Space 3.0/4.0 models and Pedometer for all other models.
     */
    suspend fun fetchUnifiedPedometerData(
        watch: Wearer,
        from: Date,
        limit: Int,
        watchTimeZone: String? = null
    ): List<PedometerData> {
        Timber.d("PedometerRepository: Fetching unified pedometer data for watch model ${watch.modelName()}")

        return if (watch.model == Space3 || watch.model == Space4) {
            Timber.d("PedometerRepository: Using PedometerSteps for Space 3.0/4.0 watch")

            // Generate dateKey strings for the last 7 days in the watch's timezone
            val tz = TimeZone.getTimeZone(DateUtil.formatWatchTimeZone(watchTimeZone))
            val cal = Calendar.getInstance(tz)
            val dateKeyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply {
                timeZone = tz
            }

            val dateKeys = (0 downTo -(limit - 1)).map { offset ->
                val day = cal.clone() as Calendar
                day.add(Calendar.DAY_OF_YEAR, offset)
                dateKeyFormat.format(day.time)
            }

            val stepsData = findPedometerStepsData(watch, dateKeys)

            // Deduplicate: keep only the record with the most steps per dateKey
            val deduplicated = stepsData
                .groupBy { it.dateKey }
                .mapValues { (_, records) -> records.maxByOrNull { it.steps ?: 0f } }
                .values
                .filterNotNull()

            Timber.d("PedometerRepository: Deduplicated to ${deduplicated.size} records (from ${stepsData.size})")

            // Map PedometerSteps to PedometerData, deriving date from dateKey
            val dateParser = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply {
                timeZone = tz
            }

            deduplicated.map { steps ->
                val date = try {
                    steps.dateKey?.let { dateParser.parse(it) } ?: steps.date ?: steps.createdAt
                } catch (e: Exception) {
                    steps.date ?: steps.createdAt
                }
                PedometerData(
                    date = date,
                    steps = steps.steps ?: 0f,
                    source = PedometerData.DataSource.NEWER_PEDOMETER_STEPS
                )
            }
        } else {
            Timber.d("PedometerRepository: Using legacy Pedometer for watch model ${watch.modelInt}")
            // For all other models, use Pedometer
            val pedometerData = findPedometerData(watch, from, limit)

            // Map Pedometer to PedometerData
            pedometerData.map { pedometer ->
                PedometerData(
                    date = pedometer.date ?: pedometer.createdAt,
                    steps = pedometer.finalSteps?.toFloat() ?: 0f,
                    source = PedometerData.DataSource.LEGACY_PEDOMETER
                )
            }
        }.sortedByDescending { it.date }
    }
}