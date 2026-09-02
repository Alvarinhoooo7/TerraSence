package com.sosmartlabs.momotabletpadres.geofences.repository

import com.parse.ParseQuery
import com.parse.ParseUser
import com.sosmartlabs.momotabletpadres.geofences.model.Geofence
import timber.log.Timber
import javax.inject.Inject

class GeofenceRepository @Inject constructor() {

    /**
     * Get a list of geofence related to a user
     * @param user User for finding geofence
     * @return List of geofence associated to the given user
     */
    fun getGeofenceByUser(user: ParseUser): List<Geofence> {
        Timber.d("GeofenceRepository: Fetching geofences for user ${user.objectId}")
        val geofences = ParseQuery.getQuery(Geofence::class.java)
            .whereEqualTo("user", user)
            .find()
        Timber.d("GeofenceRepository: Found ${geofences.size} geofences for user ${user.objectId}")
        return geofences
    }
}