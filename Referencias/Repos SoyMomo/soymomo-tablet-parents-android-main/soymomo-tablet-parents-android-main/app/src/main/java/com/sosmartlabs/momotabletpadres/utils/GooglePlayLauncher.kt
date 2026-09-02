package com.sosmartlabs.momotabletpadres.utils

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Helper class for launching Google Play store
 */
object GooglePlayLauncher {
    /**
     * Google Play app package name
     */
    private const val STORE_PACKAGE_NAME: String = "com.android.vending"

    /**
     * Google PLay Store app listing page Url
     */
    private const val STORE_LISTING_LINK_BASE: String = "http://play.google.com/store/apps/details"

    /**
     * Launches the Google Play app in the listing page for the given package name
     * @param context Context for launching Google Play
     * @param packageName Package name for the app to view on Google Play
     */
    fun launchGooglePlayListingPage(context: Context, packageName: String) {
        val uriBuilder = Uri.parse(STORE_LISTING_LINK_BASE)
            .buildUpon()
            .appendQueryParameter("id", packageName)

        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = uriBuilder.build()
            setPackage(STORE_PACKAGE_NAME)
        }

        context.startActivity(intent)
    }
}