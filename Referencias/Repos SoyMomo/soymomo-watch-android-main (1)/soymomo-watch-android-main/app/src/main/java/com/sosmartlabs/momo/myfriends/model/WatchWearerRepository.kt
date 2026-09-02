package com.sosmartlabs.momo.myfriends.model

import com.parse.ParseQuery
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import javax.inject.Inject

/**
 * Repository for interact with [WatchWearer]s in the database
 */
class WatchWearerRepository @Inject constructor() {
    /**
     * Gets a list of WatchWearer object with the given Watch
     * @param watch Watch for query
     * @return Lists of WatchWearer that contains the given watch
     */
    fun getWatchWearers(watch: Wearer): List<WatchWearer> {
        CrashlyticsLog.log("Querying getWatchWearers by wearer with list watch wearer")
        val query1 = ParseQuery.getQuery<WatchWearer>("WatchWearer")
            .whereEqualTo("watch1", watch)

        val query2 = ParseQuery.getQuery<WatchWearer>("WatchWearer")
            .whereEqualTo("watch2", watch)

        val queries = listOf(query1, query2)

        return ParseQuery.or(queries)
            .include("watch1")
            .include("watch2")
            .find()
    }

    /**
     * Accepts a WatchWearer request
     * @param watchWearer WatchWearer request to accept
     * @param which For which wearer the request is been accepted
     */
    fun acceptWatchWearerRequest(watchWearer: WatchWearer, which: WhichWatch) {
        if (which == WhichWatch.WATCH1) watchWearer.isWatch1Approved = true
        else watchWearer.isWatch2Approved = true
        watchWearer.save()
    }

    /**
     * Delete a WatchWearer from the database
     * @param watchWearer WatchWearer to remove
     */
    fun deleteWatchWearerRequest(watchWearer: WatchWearer) {
        watchWearer.delete()
    }

    /**
     * Revert from WatchWearer the unsaved changes
     * @param watchWearer WatchWearer to revert changes
     */
    fun revertChanges(watchWearer: WatchWearer) {
        watchWearer.revert()
    }
}