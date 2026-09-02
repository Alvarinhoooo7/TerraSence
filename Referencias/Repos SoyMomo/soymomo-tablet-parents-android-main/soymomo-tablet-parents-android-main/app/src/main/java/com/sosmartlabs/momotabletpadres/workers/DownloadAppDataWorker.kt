package com.sosmartlabs.momotabletpadres.workers

import android.content.Context
import androidx.core.graphics.drawable.toBitmap
import androidx.hilt.work.HiltWorker
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.model.remote.ParseAppIcon
import com.sosmartlabs.momotabletpadres.utils.ParseFileDownloader
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.GlobalConstants.Companion.PACKAGE_NAME_EXTRA
import com.sosmartlabs.momotabletpadres.GlobalConstants.Companion.USERS_DATA_DIR
import com.sosmartlabs.momotabletpadres.R
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlin.system.measureTimeMillis

@HiltWorker
class DownloadAppDataWorker @AssistedInject constructor(
    @Assisted private val appContext: Context,
    @Assisted workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        Timber.d("doWork")
        try {
            val tmpTime = measureTimeMillis {
                // SAVING PROCESS
                val imagesDir = appContext.getDir(USERS_DATA_DIR, Context.MODE_PRIVATE)
                val defaultIconDrawable = appContext.getDrawable(R.drawable.ic_action_app_hover)!!
                val defaultIconBitmap = defaultIconDrawable.toBitmap()

                val defaultUserPictureDrawable = appContext.getDrawable(R.drawable.ic_momo_profile)!!
                val defaultUserPictureBitmap = defaultUserPictureDrawable.toBitmap()

                val appPN = inputData.getString(PACKAGE_NAME_EXTRA)!!

                // Get From Cloud Icons of Installed Apps
                Timber.d("doWork: Downloading icon for $appPN")
                CrashlyticsLog.log("Querying to download icon for appPN with ParseAppIcon")
                val query = ParseQuery
                    .getQuery<ParseAppIcon>("AppIcon")
                    .whereEqualTo("packageName", appPN)
                val appsWithIconInCloud = query.find()

                // Saving Apps with icon
                appsWithIconInCloud.forEach {
                    try {
                        Timber.d("cacheIcons: Saving icon data ${it.packageName}")

                        val iconPath = "${it.packageName}.png"
                        val tmpFile = File(imagesDir, iconPath)

                        // Download by URL off Bolts BACKGROUND_EXECUTOR — NOT the blocking
                        // icon.data (ParseFile.getData()), which pins the CPU+1-sized Bolts
                        // pool that delivers every Parse query result. See [ParseFileDownloader].
                        val iconUrl = it.icon?.url
                        val dataToSave = if (iconUrl.isNullOrEmpty()) null else ParseFileDownloader.download(iconUrl)
                        if (dataToSave != null) {
                            writeToFile(dataToSave, tmpFile)
                        }
                    } catch (e: Exception) {
                        Timber.e(e, "cacheIcons: Error on downloading icon data")
                    }
                }
            }
            Timber.d("cacheIcons: elapsed time $tmpTime ms")
            return Result.success()
        } catch (e: Exception) {
            Timber.e(e, "doWork: error on worker")
            return Result.failure()
        }
    }

    @Throws(IOException::class)
    private fun writeToFile(data: ByteArray, file: File) {
        val out = FileOutputStream(file)
        out.write(data)
        out.close()
    }
}