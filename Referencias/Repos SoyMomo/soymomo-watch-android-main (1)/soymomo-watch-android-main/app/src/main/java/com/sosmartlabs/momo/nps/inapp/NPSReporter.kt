package com.sosmartlabs.momo.nps.inapp

import android.content.Context
import com.parse.ParseCloud
import com.sosmartlabs.momo.models.NPSScheduler
import com.sosmartlabs.momo.utils.CountryProvider
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import java.util.Locale

object NPSReporter {

    fun sendNPSReport(context: Context, npsScheduler: NPSScheduler, score: Int, comment: String?) {
        Timber.d("NPSReporter: Preparing to send NPS report for schedulerId=${npsScheduler.objectId}, score=$score")
        CrashlyticsLog.log("NPSReporter: Preparing to send NPS report for schedulerId=${npsScheduler.objectId}, score=$score")

        val country = try {
            CountryProvider.getCountry(context)
        } catch (e: Exception) {
            Timber.e(e, "NPSReporter: Error getting country for NPS report")
            CrashlyticsLog.recordNonFatalError(e, "NPSReporter: Error getting country for NPS report")
            "unknown"
        }

        val locale = Locale.getDefault()
        val language = locale.language
        val localeString = "${language}_${country}"
        Timber.d("NPSReporter: Using country=$country, localeString=$localeString")
        CrashlyticsLog.log("NPSReporter: Using country=$country, localeString=$localeString")

        val params = mapOf(
            "npsSchedulerId" to npsScheduler.objectId,
            "score" to score,
            "comment" to comment,
            "channel" to "app",
            "platform" to "Android",
            "country" to country,
            "language" to localeString,
        )

        Timber.d("NPSReporter: Calling ParseCloud function 'createNPSFeedback' with params: $params")
        CrashlyticsLog.log("NPSReporter: Calling ParseCloud function 'createNPSFeedback'")

        ParseCloud.callFunctionInBackground<Any>("createNPSFeedback", params) { result, error ->
            if (error != null) {
                Timber.e(error, "NPSReporter: Failed to send NPS report for schedulerId=${npsScheduler.objectId}")
                CrashlyticsLog.recordNonFatalError(error, "NPSReporter: Failed to send NPS report for schedulerId=${npsScheduler.objectId}")
            } else {
                Timber.d("NPSReporter: Successfully sent NPS report for schedulerId=${npsScheduler.objectId}")
                CrashlyticsLog.log("NPSReporter: Successfully sent NPS report for schedulerId=${npsScheduler.objectId}")
            }
        }
    }

    fun sendRejectedNPSReport(npsScheduler: NPSScheduler) {
        Timber.d("NPSReporter: Preparing to send rejected NPS report for schedulerId=${npsScheduler.objectId}")
        CrashlyticsLog.log("NPSReporter: Preparing to send rejected NPS report for schedulerId=${npsScheduler.objectId}")

        val params = mapOf(
            "npsSchedulerId" to npsScheduler.objectId
        )

        Timber.d("NPSReporter: Calling ParseCloud function 'rejectedNPSFeedback' with params: $params")
        CrashlyticsLog.log("NPSReporter: Calling ParseCloud function 'rejectedNPSFeedback'")

        ParseCloud.callFunctionInBackground<Any>("rejectedNPSFeedback", params) { result, error ->
            if (error != null) {
                Timber.e(error, "NPSReporter: Failed to send rejected NPS report for schedulerId=${npsScheduler.objectId}")
                CrashlyticsLog.recordNonFatalError(error, "NPSReporter: Failed to send rejected NPS report for schedulerId=${npsScheduler.objectId}")
            } else {
                Timber.d("NPSReporter: Successfully sent rejected NPS report for schedulerId=${npsScheduler.objectId}")
                CrashlyticsLog.log("NPSReporter: Successfully sent rejected NPS report for schedulerId=${npsScheduler.objectId}")
            }
        }
    }
}