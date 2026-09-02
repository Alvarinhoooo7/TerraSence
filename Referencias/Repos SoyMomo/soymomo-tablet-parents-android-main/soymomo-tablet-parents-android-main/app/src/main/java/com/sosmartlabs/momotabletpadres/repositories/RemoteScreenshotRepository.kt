package com.sosmartlabs.momotabletpadres.repositories

import android.content.Context
import com.parse.ParseQuery
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tabletsettings.remotescreenshot.model.RemoteScreenshot
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RemoteScreenshotRepository @Inject constructor(@ApplicationContext context: Context) {

    fun getScreenshots(currentTablet: Tablet): List<RemoteScreenshot>? {
        Timber.d("RemoteScreenshotRepository: getScreenshots - Start fetching screenshots for tabletId=${currentTablet.objectId}")
        val tablet = ParseTablet.createWithoutData(currentTablet.objectId!!)
        val user = ParseUser.getCurrentUser()

        if (tablet.objectId == null) {
            Timber.e("RemoteScreenshotRepository: getScreenshots - Tablet objectId is null, cannot query screenshots")
            CrashlyticsLog.log("RemoteScreenshotRepository: getScreenshots - Tablet objectId is null, cannot query screenshots")
            return null
        }
        if (user == null) {
            Timber.e("RemoteScreenshotRepository: getScreenshots - Current user is null, cannot query screenshots")
            CrashlyticsLog.log("RemoteScreenshotRepository: getScreenshots - Current user is null, cannot query screenshots")
            return null
        }

        CrashlyticsLog.log("RemoteScreenshotRepository: getScreenshots - Querying screenshots for userId=${user.objectId}, tabletId=${tablet.objectId}")
        return try {
            val query = ParseQuery.getQuery<RemoteScreenshot>(RemoteScreenshot().className)
                .whereEqualTo("user", user)
                .whereEqualTo("tablet", tablet)
                .orderByDescending("createdAt")

            Timber.d("RemoteScreenshotRepository: getScreenshots - Executing query for screenshots")
            val result = query.find()
            Timber.d("RemoteScreenshotRepository: getScreenshots - Query successful, found ${result.size} screenshots")
            result
        } catch (e: Exception) {
            Timber.e(e, "RemoteScreenshotRepository: getScreenshots - Exception while querying screenshots for tabletId=${tablet.objectId}, userId=${user.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "RemoteScreenshotRepository: getScreenshots - Exception while querying screenshots for tabletId=${tablet.objectId}, userId=${user.objectId}")
            null
        }
    }
}