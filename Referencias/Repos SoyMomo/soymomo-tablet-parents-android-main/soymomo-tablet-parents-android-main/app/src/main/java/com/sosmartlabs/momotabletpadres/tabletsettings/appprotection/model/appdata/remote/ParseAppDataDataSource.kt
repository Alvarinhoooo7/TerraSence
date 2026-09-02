package com.sosmartlabs.momotabletpadres.tabletsettings.appprotection.model.appdata.remote

import com.parse.ParseQuery
import com.parse.coroutines.first
import com.parse.coroutines.suspendFind
import com.parse.ktx.whereContainedIn
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Data source for installed apps obtained from InstalledApp collection on Parse database
 */
@Singleton
class ParseAppDataDataSource @Inject constructor(){

    /**
     * Obtains the app data for each app in the given list of package names
     * @param packageNames List of package names to include
     * @return List of [ParseAppData] for the given params
     */
    suspend fun getAppData(packageNames: List<String>): List<ParseAppData> {
        return ParseQuery(ParseAppData::class.java)
            .whereContainedIn(ParseAppData::packageName, packageNames)
            .suspendFind()
    }

    /**
     * Obtains the app data for each app in the given list of package names
     * @param packageName package names of app
     * @return List of [ParseAppData] for the given params
     */
    suspend fun getAppData(packageName: String): ParseAppData {
        return ParseQuery(ParseAppData::class.java)
            .whereEqualTo("packageName", packageName)
            .first()
    }
}