package com.sosmartlabs.momo.addfirstwatch.repository

import com.parse.ParseQuery
import com.parse.coroutines.first
import com.parse.ktx.findAll
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MobileNetworkOperatorRepository @Inject constructor() {

    suspend fun getMomoMobileOperator(): MobileNetworkOperator {
        Timber.d("MobileNetworkOperatorRepository: Starting getMomoMobileOperator")
        CrashlyticsLog.log("MobileNetworkOperatorRepository: Starting SoyMomo operator retrieval")
        
        return try {
            Timber.d("MobileNetworkOperatorRepository: Creating query for SoyMomo operator")
            val query = ParseQuery.getQuery<MobileNetworkOperator>("MobileNetworkOperator")
                .whereEqualTo("isSoyMomo", true)
            
            CrashlyticsLog.log("MobileNetworkOperatorRepository: Executing query for SoyMomo operator")
            val mobileNetworkOperator = query.first()
            
            Timber.i("MobileNetworkOperatorRepository: Successfully retrieved SoyMomo operator: ${mobileNetworkOperator.objectId}")
            CrashlyticsLog.log("MobileNetworkOperatorRepository: Successfully retrieved SoyMomo operator: ${mobileNetworkOperator.objectId}")

            mobileNetworkOperator
        } catch (e: Exception) {
            Timber.e(e, "MobileNetworkOperatorRepository: Error retrieving SoyMomo mobile operator")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving SoyMomo mobile operator")
            throw e
        }
    }

    /**
     * Retrieves mobile network operators for a specific country
     * @param country The country code to filter operators by
     * @return List of mobile network operators for the specified country
     */
    suspend fun getMobileNetworkOperatorByCountry(country: String): List<MobileNetworkOperator> {
        Timber.d("MobileNetworkOperatorRepository: Starting getMobileNetworkOperatorByCountry for country: $country")
        CrashlyticsLog.log("MobileNetworkOperatorRepository: Starting operator retrieval for country: $country")
        
        return try {
            Timber.d("MobileNetworkOperatorRepository: Creating query for country: $country")
            val query = ParseQuery.getQuery<MobileNetworkOperator>("MobileNetworkOperator")
                .whereEqualTo("country", country)
            
            CrashlyticsLog.log("MobileNetworkOperatorRepository: Executing query for country: $country")
            val mobileNetworkOperators = query.findAll()
            
            Timber.i("MobileNetworkOperatorRepository: Found ${mobileNetworkOperators.size} operators for country: $country")
            CrashlyticsLog.log("MobileNetworkOperatorRepository: Found ${mobileNetworkOperators.size} operators for country: $country")

            mobileNetworkOperators
        } catch (e: Exception) {
            Timber.e(e, "MobileNetworkOperatorRepository: Error retrieving mobile operators for country: $country")
            CrashlyticsLog.recordNonFatalError(e, "Error retrieving mobile operators for country: $country")
            throw e
        }
    }
}