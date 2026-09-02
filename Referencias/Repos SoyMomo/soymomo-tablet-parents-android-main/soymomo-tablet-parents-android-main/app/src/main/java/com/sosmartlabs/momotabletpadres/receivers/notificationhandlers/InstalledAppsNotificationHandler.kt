package com.sosmartlabs.momotabletpadres.receivers.notificationhandlers

import android.content.Context
import android.os.Bundle
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import com.sosmartlabs.momotabletpadres.GlobalConstants
import com.sosmartlabs.momotabletpadres.GlobalConstants.Companion.INSTALLED_APP_PACKAGE_NAME_ARG
import com.sosmartlabs.momotabletpadres.R
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.repositories.user.UserRepository
import com.sosmartlabs.momotabletpadres.utils.Constants
import com.sosmartlabs.momotabletpadres.workers.DownloadAppDataWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

/**
 * Notification handler for installed apps
 * @param context Context for launching notification
 * @param userRepository Repository for users
 * @param tabletRepository Repository for tablets
 */
class InstalledAppsNotificationHandler @Inject constructor(@ApplicationContext context: Context,
                                                           userRepository: UserRepository,
                                                           tabletRepository: TabletRepository
):
    TabletActivityNotificationHandler(context, userRepository, tabletRepository) {
    override val notificationId: Int = Constants.notificationInstalledApp
    override val notificationDestinationId: Int = R.id.tabletFragmentAppsDetail
    override val notificationLargeIconId: Int = R.mipmap.ic_launcher
    override var notificationContentTitleId: Int = R.string.notification_installed_app_title
    override var notificationContextTextId: Int = R.string.notification_installed_app_text
    override val notificationErrorText: String =
        "Error on creating notification for Installed app received instruction"

    override fun getNotificationContentParams(jsonData: JSONObject): Array<String> =
        arrayOf(
            jsonData.optString("tabletName", ""),
            jsonData.optString("installedAppName", "")
        )

    override fun getNotificationsArgsBundle(jsonData: JSONObject): Bundle {
        return super.getNotificationsArgsBundle(jsonData).apply {
            putString("installedAppName", jsonData.optString("installedAppName", ""))
            putString(INSTALLED_APP_PACKAGE_NAME_ARG, jsonData.optString("installedAppPackage", ""))
        }
    }

    override fun onNotificationLaunch(jsonData: JSONObject) {
        startDownloadAppDataWorker(jsonData.optString("installedAppPackage", ""))
    }

    /**
     * Worker for Downloading Tablet Data
     */
    private fun startDownloadAppDataWorker(packageName: String){
        Timber.d("startDownloadTabletDataWorker: ")
        val constraints: Constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val inputData = Data.Builder().putString(GlobalConstants.PACKAGE_NAME_EXTRA, packageName).build()

        val workRequest: OneTimeWorkRequest = OneTimeWorkRequest
            .Builder(DownloadAppDataWorker::class.java)
            .setConstraints(constraints)
            .setInputData(inputData)
            .build()

        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                GlobalConstants.DOWNLOAD_TABLET_DATA_WORKER_TAG,
                ExistingWorkPolicy.REPLACE,
                workRequest)
    }
}