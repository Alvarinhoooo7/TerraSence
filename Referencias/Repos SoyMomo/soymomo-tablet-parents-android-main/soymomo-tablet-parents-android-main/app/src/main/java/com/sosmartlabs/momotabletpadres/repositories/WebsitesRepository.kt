package com.sosmartlabs.momotabletpadres.repositories

import android.content.Context
import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.tablet.model.Tablet
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.tabletsettings.blocks.web.model.Website
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebsitesRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {

    fun getWebsites(tablet: Tablet): List<Website> {
        Timber.d("WebsitesRepository: getWebsites - Start fetching websites for tabletId=${tablet.objectId}")
        CrashlyticsLog.log("WebsitesRepository: getWebsites - Start fetching websites for tabletId=${tablet.objectId}")
        val websites = getWebsitesFromNetwork(tablet)
        Timber.d("WebsitesRepository: getWebsites - Finished fetching websites, found ${websites.size} websites for tabletId=${tablet.objectId}")
        return websites
    }

    private fun getWebsitesFromNetwork(tablet: Tablet): List<Website> {
        Timber.d("WebsitesRepository: getWebsitesFromNetwork - Querying websites for tabletId=${tablet.objectId}")
        CrashlyticsLog.log("WebsitesRepository: getWebsitesFromNetwork - Querying websites for tabletId=${tablet.objectId}")
        val parseTablet = ParseTablet.createWithoutData(tablet.objectId!!)
        val query = ParseQuery.getQuery<Website>(Website().className)
            .whereEqualTo("tablet", parseTablet)
        val websites = query.find()
        Timber.d("WebsitesRepository: getWebsitesFromNetwork - Query successful, found ${websites.size} websites for tabletId=${tablet.objectId}")
        return websites
    }

    fun createBlockedWebsite(tablet: Tablet, url: String) = Website().apply {
        Timber.d("WebsitesRepository: createBlockedWebsite - Creating blocked website for tabletId=${tablet.objectId}, url=$url")
        CrashlyticsLog.log("WebsitesRepository: createBlockedWebsite - Creating blocked website for tabletId=${tablet.objectId}, url=$url")
        this.url = formatUrl(url)
        allowed = true
        this.tablet = ParseTablet.createWithoutData(tablet.objectId!!)
        save()
        Timber.d("WebsitesRepository: createBlockedWebsite - Blocked website created and saved for tabletId=${tablet.objectId}, formattedUrl=${this.url}")
    }

    private fun formatUrl(site: String): String {
        Timber.d("WebsitesRepository: formatUrl - Formatting url: $site")
        var formattedUrl = site
            .replace("www.", "")
            .replace("https://www", "")
            .replace("http://www", "")

        val lastPointIndex = formattedUrl.lastIndexOf(".")
        if (lastPointIndex != -1) {
            Timber.d("WebsitesRepository: formatUrl - Removing TLD from url at index $lastPointIndex")
            formattedUrl = formattedUrl.removeRange(lastPointIndex, formattedUrl.length)
        }

        Timber.d("WebsitesRepository: formatUrl - Resulting formatted url: $formattedUrl")
        return formattedUrl
    }
}