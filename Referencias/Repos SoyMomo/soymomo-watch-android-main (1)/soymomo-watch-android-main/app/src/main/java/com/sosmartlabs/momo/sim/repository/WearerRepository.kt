package com.sosmartlabs.momo.sim.repository

import com.parse.ParseQuery
import com.parse.ParseUser
import com.parse.ktx.findAll
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.WatchUser
import com.sosmartlabs.momo.models.Wearer
import timber.log.Timber
import javax.inject.Inject

class WearerRepository @Inject constructor() {

    suspend fun getWearers(user: ParseUser): List<Wearer> {
        Timber.d("WearerRepository: Getting wearers for user")

        return try {
            val watchUsers = ParseQuery.getQuery<WatchUser>("WatchUser")
                .whereEqualTo("user", user)
                .whereEqualTo("active", true)
                .include("watch")
                .findAll()
                .sortedBy { it.createdAt }

            Timber.d("WearerRepository: Found ${watchUsers.size} watch users")

            val wearers = watchUsers.mapNotNull { watchUser ->
                watchUser.watch?.also { wearer ->
                    Timber.d("WearerRepository: Processing wearer")
                }
            }

            Timber.d("WearerRepository: Returning ${wearers.size} wearers")
            wearers
        } catch (e: Exception) {
            Timber.e(e, "WearerRepository: Failed to get wearers")
            CrashlyticsLog.recordNonFatalError(e, "Failed to get wearers")
            emptyList()
        }
    }

}
