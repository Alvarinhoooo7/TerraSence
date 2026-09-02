package com.sosmartlabs.momo.geofences.repository

import com.parse.ParseUser
import com.parse.coroutines.suspendFind
import com.sosmartlabs.momo.geofences.model.Geofence
import timber.log.Timber
import javax.inject.Inject

/**
 * Repository for handling Geofence related data
 * TODO: Migrate Parse related logic in [com.sosmartlabs.momo.geofences.ui.GeofenceViewModel] here and add repository dependency to that class.
 */
class GeofenceRepository @Inject constructor() {

    /**
     * Get a list of geofence related to a user
     * @param user User for finding geofence
     * @return List of geofence associated to the given user
     */
    suspend fun getGeofenceByUser(user: ParseUser): List<Geofence> {
        Timber.d("getGeofenceByUser with user ${user.objectId}")
        return user.getRelation<Geofence>("geoFences").query.suspendFind()
    }
}