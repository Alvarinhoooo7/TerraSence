package com.sosmartlabs.momotabletpadres.nps

import android.app.Application
import android.content.Context
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.parse.ParseCloud
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog.recordNonFatalError
import com.sosmartlabs.momotabletpadres.models.entity.NPSScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.util.Calendar
import javax.inject.Inject

class FeedbackNPSController @Inject constructor() {

    @Inject lateinit var application: Application

    fun searchForNSP(activity: AppCompatActivity) {
        val prefs = application.applicationContext
            .getSharedPreferences("MyPrefs", Context.MODE_PRIVATE)
        val lastExecutionTime = prefs.getLong("lastExecutionTime", 0)
        val currentTime = Calendar.getInstance().timeInMillis

        if (currentTime - lastExecutionTime < 24 * 60 * 60 * 1000) return

        // No signed-in user means there is no one to survey — and getCurrentUser()
        // can be null at this point, so dereferencing it for objectId would NPE.
        val userId = ParseUser.getCurrentUser()?.objectId
        if (userId == null) {
            Timber.d("searchForNSP - no current user, skipping NPS lookup")
            return
        }

        // Scope to the Activity lifecycle so the Parse round-trip is cancelled on
        // destroy and never resolves against a finished Activity / dead
        // FragmentManager. The blocking Parse call runs off the main thread; the
        // result is handled back on the main thread (lifecycleScope default).
        activity.lifecycleScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val params = mapOf("userId" to userId)
                    ParseCloud.callFunction<NPSScheduler?>("findNPSScheduler", params)
                }
            }.onFailure {
                Timber.e(it)
                recordNonFatalError(it, "Error on searching for NPS")
            }.onSuccess { scheduler ->
                prefs.edit().putLong("lastExecutionTime", currentTime).apply()
                if (scheduler != null && !activity.isFinishing && !activity.isDestroyed) {
                    showNPS(scheduler, activity)
                }
            }
        }
    }

    private fun showNPS(nps: NPSScheduler, activity: AppCompatActivity) {
        val dialog = NPSDialog.newInstance(nps)
        dialog.show(activity.supportFragmentManager, "NPSDialog")
    }
}
