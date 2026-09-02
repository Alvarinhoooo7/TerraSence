package com.sosmartlabs.momotabletpadres.appinfo.model.remote

import android.content.Context
import com.parse.ParseQuery
import com.parse.ParseRelation
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.first
import com.parse.coroutines.suspendFind
import com.parse.ktx.include
import com.parse.ktx.selectKeys
import com.parse.ktx.whereContainedIn
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import com.sosmartlabs.momotabletpadres.utils.NewNetworkStateChecker
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlin.reflect.KProperty

/**
 * Data source for app info obtained from AppInfo collection on Parse database
 */
open class ParseAppInfoDataSource @Inject constructor(@ApplicationContext private val context: Context) {

    /**
     * App safer alternatives relations, mapped by app package names
     */
    private val saferAppAlternativesRelations = mutableMapOf<String, ParseRelation<ParseAppInfo>>()

    /**
     * Obtains the app information for the apps with the given package names
     * @param packageNames List of package names for the apps required
     * @param fieldsToInclude Fields to include in the response from the database
     * @return List of [ParseAppInfo] for the required package names
     */
    suspend fun getParseAppInfoByPackageNames(packageNames: List<String>, vararg fieldsToInclude: KProperty<Any?>): List<ParseAppInfo> {
        if (!NewNetworkStateChecker.isThereInternetConnection(context)) return emptyList()
        return ParseQuery.getQuery(ParseAppInfo::class.java)
            .whereContainedIn(ParseAppInfo::packageName, packageNames).apply {
                if (fieldsToInclude.isNotEmpty()) selectKeys(fieldsToInclude.toList())
            }.suspendFind().apply {
                if (fieldsToInclude.contains(ParseAppInfo::saferAppAlternative))
                    this.forEach {
                        saferAppAlternativesRelations[it.objectId] = it.saferAppAlternative
                    }
            }
    }

    /**
     * Obtains the [ParseRelation] with the safer app alternatives for the given app
     * @param parseAppId ObjectId for the [ParseAppInfo] to find alternatives
     * @return [ParseRelation] with the safer alternatives for the given app
     */
    private suspend fun getSaferAppAlternativesRelation(parseAppId: String): ParseRelation<ParseAppInfo> {
        if (!NewNetworkStateChecker.isThereInternetConnection(context)) throw Exception("No internet connection")
        return if (saferAppAlternativesRelations.containsKey(parseAppId)) saferAppAlternativesRelations[parseAppId]!!
        else ParseQuery.getQuery(ParseAppInfo::class.java)
            .whereEqualTo("objectId", parseAppId)
            .include(ParseAppInfo::saferAppAlternative)
            .selectKeys(listOf(ParseAppInfo::saferAppAlternative))
            .first()
            .saferAppAlternative.apply {
                saferAppAlternativesRelations[parseAppId] = this
            }
    }

    /**
     * Obtains safer alternatives to the given app
     * @param parseAppId ObjectId of the [ParseAppInfo] to find alternatives
     * @return List of [ParseAppInfo] with the safer alternatives for the given app.
     */
    suspend fun getAppSaferAlternatives(parseAppId: String): List<ParseAppInfo> =
        getSaferAppAlternativesRelation(parseAppId).query.suspendFind()

    /**
     * Requests a DUG analysis for the given app
     * @param packageName Package name of the app to request the analysis for
     * @return List of [ParseAppInfo] with the packages to whom the request was made
     * switching their dugAnalysis field to dugAnalysisRequested
     */
    suspend fun requestDugAnalysis(packageName: String): List<ParseAppInfo> {
        CrashlyticsLog.log("Calling cloud function requestDugAnalysis with package name")
        return callCloudFunction("requestDugAnalysis", mapOf("packageName" to packageName))
    }
}