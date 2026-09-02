package com.sosmartlabs.momotabletpadres.appicon.cache

import android.content.Context
import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppIconDiskCacheDataSource @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val iconDir: File by lazy {
        val dir = File(context.cacheDir, "app_icons")
        if (!dir.exists()) {
            val created = dir.mkdirs()
            if (created) {
                Timber.d("AppIconDiskCacheDataSource: Created icon cache directory at ${dir.absolutePath}")
            } else {
                Timber.w("AppIconDiskCacheDataSource: Failed to create icon cache directory at ${dir.absolutePath}")
            }
        }
        dir
    }

    private fun getFileForPackage(packageName: String): File {
        // Use a safe filename
        val file = File(iconDir, "$packageName.png")
        Timber.v("AppIconDiskCacheDataSource: getFileForPackage - File for $packageName is ${file.absolutePath}")
        return file
    }

    /**
     * Gets multiple icons from the disk cache.
     * @param packageNames The list of package names to find icons for.
     * @return A map of package names to the found [Drawable] icons.
     */
    fun getIcons(packageNames: List<String>): Map<String, Drawable> {
        Timber.d("AppIconDiskCacheDataSource: getIcons - Attempting to get ${packageNames.size} icons from disk cache.")
        val result = mutableMapOf<String, Drawable>()
        for (packageName in packageNames) {
            val icon = getIcon(packageName)
            if (icon != null) {
                Timber.v("AppIconDiskCacheDataSource: getIcons - Found icon for $packageName in disk cache.")
                result[packageName] = icon
            } else {
                Timber.v("AppIconDiskCacheDataSource: getIcons - No icon found for $packageName in disk cache.")
            }
        }
        Timber.d("AppIconDiskCacheDataSource: getIcons - Found ${result.size} icons in disk cache out of ${packageNames.size} requested.")
        return result
    }

    /**
     * Gets a single icon from the disk cache.
     * @param packageName The package name of the icon to retrieve.
     * @return The [Drawable] if found, otherwise null.
     */
    fun getIcon(packageName: String): Drawable? {
        val iconFile = getFileForPackage(packageName)
        if (!iconFile.exists()) {
            Timber.v("AppIconDiskCacheDataSource: getIcon - Icon file does not exist for $packageName at ${iconFile.absolutePath}")
            return null
        }
        Timber.d("AppIconDiskCacheDataSource: getIcon - Attempting to read icon for $packageName from ${iconFile.absolutePath}")
        return try {
            FileInputStream(iconFile).use { stream ->
                val drawable = Drawable.createFromStream(stream, packageName)
                if (drawable == null) {
                    Timber.e("AppIconDiskCacheDataSource: getIcon - Drawable.createFromStream returned null for $packageName")
                } else {
                    Timber.v("AppIconDiskCacheDataSource: getIcon - Successfully loaded icon for $packageName from disk cache.")
                }
                drawable
            }
        } catch (e: Exception) {
            Timber.e(e, "AppIconDiskCacheDataSource: getIcon - Error reading icon from disk cache for $packageName")
            CrashlyticsLog.recordNonFatalError(e, "AppIconDiskCacheDataSource: Exception reading icon for $packageName from ${iconFile.absolutePath}")
            null
        }
    }

    /**
     * Saves an icon from an InputStream to the disk cache and returns it as a Drawable.
     * The InputStream is consumed and closed by this function.
     * @param packageName The package name to associate with the icon.
     * @param inputStream The [InputStream] of the icon data.
     * @return The [Drawable] from the newly cached file, or null on failure.
     */
    fun saveAndGetIcon(packageName: String, inputStream: InputStream): Drawable? {
        val iconFile = getFileForPackage(packageName)
        Timber.d("AppIconDiskCacheDataSource: saveAndGetIcon - Saving icon for $packageName to ${iconFile.absolutePath}")
        try {
            FileOutputStream(iconFile).use { outputStream ->
                inputStream.use { it.copyTo(outputStream) }
            }
            Timber.d("AppIconDiskCacheDataSource: saveAndGetIcon - Successfully saved icon for $packageName to disk.")
        } catch (e: Exception) {
            Timber.e(e, "AppIconDiskCacheDataSource: saveAndGetIcon - Error saving icon to disk cache for $packageName")
            CrashlyticsLog.recordNonFatalError(e, "AppIconDiskCacheDataSource: Exception saving icon for $packageName to ${iconFile.absolutePath}")
            // Clean up partially written file on error
            if (iconFile.exists()) {
                val deleted = iconFile.delete()
                if (deleted) {
                    Timber.w("AppIconDiskCacheDataSource: saveAndGetIcon - Deleted partially written file for $packageName at ${iconFile.absolutePath}")
                } else {
                    Timber.w("AppIconDiskCacheDataSource: saveAndGetIcon - Failed to delete partially written file for $packageName at ${iconFile.absolutePath}")
                }
            }
            return null
        }
        // Now that it's saved, read it back as a Drawable
        val drawable = getIcon(packageName)
        if (drawable == null) {
            Timber.e("AppIconDiskCacheDataSource: saveAndGetIcon - Failed to load icon for $packageName after saving to disk.")
            CrashlyticsLog.log("AppIconDiskCacheDataSource: Failed to load icon for $packageName after saving to disk at ${iconFile.absolutePath}")
        } else {
            Timber.d("AppIconDiskCacheDataSource: saveAndGetIcon - Successfully loaded icon for $packageName after saving to disk.")
        }
        return drawable
    }
}