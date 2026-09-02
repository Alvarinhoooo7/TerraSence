package com.sosmartlabs.momotabletpadres.sim.repository

import com.parse.ParseQuery
import com.sosmartlabs.momotabletpadres.sim.model.Sim
import com.sosmartlabs.momotabletpadres.sim.model.Subscription
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject

class SimRepository @Inject constructor() {

    /**
     * Retrieves a SIM card by its ICCID.
     *
     * @param iccId The ICCID of the SIM card to retrieve.
     * @return The SIM object if found, or null otherwise.
     */
    suspend fun getSim(iccId: String): Sim? {
        Timber.d("SimRepository: Attempting to retrieve SIM with iccId: $iccId")
        return try {
            val sim = ParseQuery.getQuery<Sim?>("Sim")
                .whereEqualTo("iccId", iccId)
                .include("mnoProvider")
                .include("networkOperator")
                .include("paymentProvider")
                .first

            if (sim != null) {
                Timber.d("SimRepository: SIM with iccId: $iccId successfully retrieved")
            } else {
                Timber.w("SimRepository: No SIM found with iccId: $iccId")
            }
            sim
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Error retrieving SIM with iccId: $iccId")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving SIM with iccId: $iccId")
            null
        }
    }

    /**
     * Retrieves the SIM card associated with the given IMEI.
     *
     * @param imei The device IMEI for which to find the associated SIM card.
     * @return The associated SIM object if found, or null otherwise.
     */
    suspend fun getSimByImei(imei: String): Sim? {
        Timber.d("SimRepository: Attempting to retrieve SIM for imei: $imei")
        return try {
            val sim = ParseQuery.getQuery<Sim?>("Sim")
                .whereEqualTo("imei", imei)
                .include("mnoProvider")
                .include("networkOperator")
                .include("paymentProvider")
                .first

            if (sim != null) {
                Timber.d("SimRepository: SIM for imei: $imei successfully retrieved")
            } else {
                Timber.w("SimRepository: No SIM found imei: $imei")
            }
            sim
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Error retrieving SIM for imei: $imei")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving SIM for imei: $imei")
            null
        }
    }

    /**
     * Determines if the given SIM card is currently in use by checking for active or pending subscriptions.
     *
     * @param sim The SIM card to check.
     * @return True if the SIM has an active or pending subscription, false otherwise.
     */
    suspend fun isSimInUse(sim: Sim): Boolean {
        Timber.d("SimRepository: Checking usage status for SIM ${sim.objectId}")
        return try {
            val activeStatuses = listOf("ACTIVATED", "ACTIVATION_PENDING")
            val query = ParseQuery.getQuery<Subscription?>("Subscription")
                .whereEqualTo("sim", sim)
                .whereContainedIn("status", activeStatuses)

            val isInUse = query.first != null
            Timber.d("SimRepository: SIM ${sim.objectId} is in use: $isInUse")
            isInUse
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Failed to check usage status for SIM ${sim.objectId}")
            CrashlyticsLog.recordNonFatalError(e, "Error checking if SIM ${sim.objectId} is in use")
            false
        }
    }
}