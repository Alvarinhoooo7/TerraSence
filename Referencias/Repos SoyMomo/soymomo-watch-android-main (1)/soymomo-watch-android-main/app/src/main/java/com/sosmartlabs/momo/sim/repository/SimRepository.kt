package com.sosmartlabs.momo.sim.repository

import com.parse.ParseQuery
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.sim.model.Sim
import com.sosmartlabs.momo.sim.model.Subscription
import com.sosmartlabs.momo.testlab.TestLab
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
        Timber.d("SimRepository: Attempting to retrieve SIM")
        TestLab.mockSim(iccId)?.let { return it }
        return try {
            val sim = ParseQuery.getQuery<Sim?>("Sim")
                .whereEqualTo("iccId", iccId)
                .include("mnoProvider")
                .include("networkOperator")
                .include("paymentProvider")
                .first

            if (sim != null) {
                Timber.d("SimRepository: SIM successfully retrieved")
            } else {
                Timber.w("SimRepository: No SIM found")
            }
            sim
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Error retrieving SIM")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving SIM")
            null
        }
    }

    /**
     * Retrieves the SIM card associated with the given watch.
     *
     * @param watch The Wearer (watch) for which to find the associated SIM card.
     * @return The associated SIM object if found, or null otherwise.
     */
    suspend fun getSimByWatch(watch: Wearer): Sim? {
        Timber.d("SimRepository: Attempting to retrieve SIM for watch")
        return try {
            val sim = ParseQuery.getQuery<Sim?>("Sim")
                .whereEqualTo("watch", watch)
                .include("mnoProvider")
                .include("networkOperator")
                .include("paymentProvider")
                .first

            if (sim != null) {
                Timber.d("SimRepository: SIM for watch successfully retrieved")
            } else {
                Timber.w("SimRepository: No SIM found for watch")
            }
            sim
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Error retrieving SIM for watch")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving SIM for watch")
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
        Timber.d("SimRepository: Checking usage status for SIM")
        TestLab.mockIsSimInUse(sim)?.let { return it }
        return try {
            val activeStatuses = listOf("ACTIVATED", "ACTIVATION_PENDING")
            val query = ParseQuery.getQuery<Subscription?>("Subscription")
                .whereEqualTo("sim", sim)
                .whereContainedIn("status", activeStatuses)

            val isInUse = query.first != null
            Timber.d("SimRepository: SIM is in use: $isInUse")
            isInUse
        } catch (e: Exception) {
            Timber.e(e, "SimRepository: Failed to check usage status for SIM")
            CrashlyticsLog.recordNonFatalError(e, "Error checking if SIM is in use")
            false
        }
    }

    /**
     * SIMs retired by the MNO (e.g. Entel) stay in inventory with isRetired = true
     * and cannot be activated or transferred onto.
     *
     * `has()`-guarded on purpose: `ParseDelegate<T>` hands back null for a column that
     * isn't present, and the column only exists on the rows the retirement script has
     * touched. An absent field means the SIM was never retired.
     */
    fun isSimRetired(sim: Sim): Boolean {
        val retired = sim.has("isRetired") && sim.getBoolean("isRetired")
        Timber.d("SimRepository: SIM is retired: $retired")
        return retired
    }
}
