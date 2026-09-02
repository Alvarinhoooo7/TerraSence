package com.sosmartlabs.momotabletpadres.appicon.packagemanager

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject

/**
 * Data source for obtaining icons from package manager.
 * It provides scaled and uniform icons.
 * @param context Context for accessing package manager.
 */
class PackageManagerAppIconDataSource @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        /**
         * The desired width and height, in dp, of the scaled icon.
         */
        private const val ICON_SIZE_DP = 48f
    }

    /**
     * Obtains the app icons for the apps with the given package names.
     * Icons are resized to a standard dimension.
     * @param packageNames Package names for the app icons to find.
     * @return A map of package names to [Drawable] icons found in Package Manager.
     */
    fun getAppIcons(packageNames: List<String>): Map<String, Drawable> {
        Timber.d("PackageManagerAppIconDataSource: getAppIcons for ${packageNames.size} packages.")
        if (packageNames.isEmpty()) {
            return emptyMap()
        }
        return packageNames.mapNotNull { packageName ->
            loadAndResizeIcon(packageName)?.let { icon ->
                Timber.v("PackageManagerAppIconDataSource: Icon found for $packageName")
                packageName to icon
            }
        }.toMap()
    }

    /**
     * Loads an application icon and resizes it to a standard size.
     * This method handles different drawable types and ensures a consistent output.
     * @param packageName The package name of the application.
     * @return A [BitmapDrawable] of the resized icon, or null on failure.
     */
    private fun loadAndResizeIcon(packageName: String): Drawable? {
        return try {
            val resources = context.resources
            val icon = context.packageManager.getApplicationIcon(packageName)
            val targetSizePx = (ICON_SIZE_DP * resources.displayMetrics.density).toInt()

            if (icon is BitmapDrawable && icon.bitmap.width == targetSizePx && icon.bitmap.height == targetSizePx) {
                return icon // Already correct size
            }

            val bitmap = Bitmap.createBitmap(targetSizePx, targetSizePx, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            icon.setBounds(0, 0, canvas.width, canvas.height)
            icon.draw(canvas)

            BitmapDrawable(resources, bitmap)
        } catch (e: PackageManager.NameNotFoundException) {
            Timber.w("PackageManagerAppIconDataSource: Icon not found for $packageName")
            null
        } catch (e: Exception) {
            Timber.e(e, "PackageManagerAppIconDataSource: Error loading icon for $packageName")
            CrashlyticsLog.recordNonFatalError(e, "PackageManagerAppIconDataSource: Error loading icon for $packageName")
            null
        }
    }
}