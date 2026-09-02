package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.installedapp.remote

import com.parse.ParseQuery
import com.parse.coroutines.suspendFind
import com.parse.ktx.selectKeys
import com.parse.ktx.whereContainedIn
import com.parse.ktx.whereEqualTo
import com.sosmartlabs.momotabletpadres.tablet.model.remote.ParseTablet
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import kotlin.reflect.KProperty

/**
 * Data source for installed apps obtained from InstalledApp collection on Parse database
 */
open class ParseInstalledAppDataSource @Inject constructor() {

    /**
     * Obtains the installed apps for a tablet with package names on a list
     * @param tabletId Tablet ObjectId
     * @param packageNames List of package names to include
     * @param fieldsToInclude Fields to include in the query response. Can be null
     * @return List of [ParseInstalledApp] for the given params
     */
    suspend fun getTabletInstalledAppsByPackageNames(
        tabletId: String,
        packageNames: Set<String?>,
        vararg fieldsToInclude: KProperty<Any?>
    ): List<ParseInstalledApp> {
        Timber.d("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Start (tabletId=$tabletId, packageNames=$packageNames, fieldsToInclude=${fieldsToInclude.map { it.name }})")
        if (tabletId.isBlank()) {
            val msg = "ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Error: tabletId is blank"
            Timber.e(msg)
            CrashlyticsLog.log(msg)
            return emptyList()
        }
        if (packageNames.isEmpty()) {
            Timber.w("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Warning: packageNames is empty for tabletId=$tabletId")
            return emptyList()
        }

        val tablet = ParseTablet.createWithoutData(tabletId)
        Timber.v("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Created ParseTablet reference for tabletId=$tabletId")

        try {
            Timber.d("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Building ParseQuery for ${packageNames.size} package names")
            val query = ParseQuery(ParseInstalledApp::class.java)
                .whereEqualTo(ParseInstalledApp::tablet, tablet)
                .whereContainedIn(ParseInstalledApp::packageName, packageNames)
                .apply {
                    if (fieldsToInclude.isNotEmpty()) {
                        Timber.v("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Selecting fields: ${fieldsToInclude.map { it.name }}")
                        selectKeys(fieldsToInclude.toList())
                    }
                }

            Timber.d("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Executing query")
            val result = query.suspendFind()
            Timber.i("ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Query returned ${result.size} apps for tabletId=$tabletId")
            return result
        } catch (e: Exception) {
            val errorMsg = "ParseInstalledAppDataSource: getTabletInstalledAppsByPackageNames - Exception while querying installed apps for tabletId=$tabletId, packageNames=$packageNames"
            Timber.e(e, errorMsg)
            CrashlyticsLog.recordNonFatalError(e, errorMsg)
            return emptyList()
        }
    }
}