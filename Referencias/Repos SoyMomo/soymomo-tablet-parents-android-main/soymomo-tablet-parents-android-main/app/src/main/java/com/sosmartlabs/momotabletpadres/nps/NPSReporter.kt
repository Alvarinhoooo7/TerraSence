package com.sosmartlabs.momotabletpadres.nps

import android.content.Context
import com.parse.ParseCloud
import com.sosmartlabs.momotabletpadres.models.entity.NPSScheduler
import com.sosmartlabs.momotabletpadres.utils.CountryProvider
import java.util.Locale

object NPSReporter {
    fun sendNPSReport(context: Context, npsScheduler: NPSScheduler, score: Int, comment: String?) {
        val params = mapOf(
            "npsSchedulerId" to npsScheduler.objectId,
            "score" to score,
            "comment" to comment,
            "channel" to "app",
            "platform" to "Android",
            "country" to CountryProvider.getCountry(context),
            "language" to Locale.getDefault().toString(),
        )
        ParseCloud.callFunctionInBackground<Any>("createNPSFeedback", params)
    }

    fun sendRejectedNPSReport(npsScheduler: NPSScheduler) {
        val params = mapOf(
            "npsSchedulerId" to npsScheduler.objectId
        )
        ParseCloud.callFunctionInBackground<Any>("rejectedNPSFeedback", params)
    }
}