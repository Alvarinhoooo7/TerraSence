package com.sosmartlabs.momotabletpadres.core.settings.new_designs.adapters.helpers

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.util.DisplayMetrics
import androidx.core.content.ContextCompat
import com.google.firebase.Firebase
import com.google.firebase.crashlytics.crashlytics
import com.sosmartlabs.momotabletpadres.R
import timber.log.Timber


@Deprecated("AppIconRepository should be used instead")
class AndroidIconHelper {

    companion object{

        fun getAppIconFromPackageManager(context: Context, packageName: String): Drawable {
            Timber.d("getAppIconFromPackageManager: $packageName")
            var icon:Drawable? = null
            icon = try {
                val applicationInfo: ApplicationInfo = context.packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
                val res = context.packageManager.getResourcesForApplication(applicationInfo)
                res.getDrawableForDensity(applicationInfo.icon, DisplayMetrics.DENSITY_XHIGH, null)
            } catch (e: java.lang.Exception){
                with(Firebase.crashlytics) {
                    log("Cannot find icon for $packageName")
                    recordException(e)
                }
                Timber.d( "Icon not found $packageName")
                ContextCompat.getDrawable(context, R.drawable.ic_action_app_hover)
            }
            return icon!!
        }

        fun getAppIconsFromPackageManager(context: Context, packageNames: List<String>): Map<String, Drawable?> {
            return packageNames.associateBy({it}, {
                getAppIconFromPackageManager(context, it)
            })
        }
    }

}