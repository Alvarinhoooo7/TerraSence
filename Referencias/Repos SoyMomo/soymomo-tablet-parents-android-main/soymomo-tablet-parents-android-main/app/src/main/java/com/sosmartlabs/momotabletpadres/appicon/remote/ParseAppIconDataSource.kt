package com.sosmartlabs.momotabletpadres.appicon.remote

import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momotabletpadres.model.remote.ParseAppIcon
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

/**
 * Data source for app icons obtained from AppIcon collection on Parse database
 */
class ParseAppIconDataSource @Inject constructor() {

    /**
     * Find the [ParseAppIcon] for the given package names
     * @param packageNames List of app package name for finding icons
     * @return List of [ParseAppIcon] found in database
     */
    suspend fun getParseAppIconsByPackageNames(packageNames: List<String>): List<ParseAppIcon> {
        Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Start, packageNames: $packageNames")
        if (packageNames.isEmpty()) {
            Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Empty packageNames, returning empty list")
            return emptyList()
        }

        try {
            val allIcons = mutableListOf<ParseAppIcon>()
            packageNames.chunked(100).forEach { chunk ->
                Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Building ParseQuery for a chunk of ${chunk.size} package names")
                val query = ParseQuery(ParseAppIcon::class.java)
                    .whereContainedIn("packageName", chunk)
                query.limit = 1000

                Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Executing suspendFind() for chunk")
                val foundIcons = query.suspendFind()
                Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Found ${foundIcons.size} icons from Parse for chunk")
                allIcons.addAll(foundIcons)
            }

            val distinctIcons = allIcons.distinctBy { it.packageName }
            Timber.d("ParseAppIconDataSource: getParseAppIconsByPackageNames - Total distinct icons by packageName: ${distinctIcons.map { it.packageName }}")

            return distinctIcons
        } catch (e: Exception) {
            Timber.e(e, "ParseAppIconDataSource: getParseAppIconsByPackageNames - Error fetching icons for $packageNames")
            CrashlyticsLog.recordNonFatalError(e, "ParseAppIconDataSource: Exception in getParseAppIconsByPackageNames for $packageNames")
            return emptyList()
        }
    }
}