package com.sosmartlabs.momo.addfirstwatch.repository

import android.graphics.Bitmap
import android.location.Location
import com.parse.ParseFile
import com.parse.ParseGeoPoint
import com.parse.ParseQuery
import com.parse.ParseException
import com.parse.coroutines.callCloudFunction
import com.parse.coroutines.suspendFind
import com.parse.coroutines.suspendSave
import com.sosmartlabs.momo.addfirstwatch.model.WatchAdminInfo
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityResult
import com.sosmartlabs.momo.addfirstwatch.model.WatchAvailabilityStatus
import com.sosmartlabs.momo.addfirstwatch.model.WearerStatus
import com.sosmartlabs.momo.addfirstwatch.model.remote.MobileNetworkOperator
import com.sosmartlabs.momo.models.Wearer
import com.sosmartlabs.momo.firebase.CrashlyticsLog
import com.sosmartlabs.momo.testlab.TestLab
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

@Singleton
class WearerRepository @Inject constructor() {

    suspend fun getWearer(deviceId: String): Wearer? {
        Timber.d("WearerRepository: Getting wearer")
        CrashlyticsLog.log("WearerRepository: Starting getWearer")
        return try {
            val wearer = ParseQuery.getQuery(Wearer::class.java)
                .whereEqualTo("deviceId", deviceId)
                .suspendFind()
                .firstOrNull()
            CrashlyticsLog.log("WearerRepository: Successfully retrieved wearer")
            wearer
        } catch (e: ParseException) {
            if (e.code == ParseException.OBJECT_NOT_FOUND) {
                Timber.w("WearerRepository: Wearer not found")
                CrashlyticsLog.log("WearerRepository: Wearer not found. ParseException code: ${e.code}")
            } else {
                Timber.e(e, "WearerRepository: ParseException while getting wearer")
                CrashlyticsLog.recordNonFatalError(e, "WearerRepository: ParseException getting wearer")
            }
            null
        } catch (e: Exception) {
            Timber.e(e, "WearerRepository: Unexpected error getting wearer")
            CrashlyticsLog.recordNonFatalError(e, "WearerRepository: Unexpected error getting wearer")
            null
        }
    }

    suspend fun addWatch(deviceId: String): Int {
        Timber.d("WearerRepository: Starting addWatch")
        CrashlyticsLog.log("WearerRepository: Starting addWatch process")
        TestLab.mockAddWatchResult(deviceId)?.let { return it }
        val parameters = hashMapOf("deviceId" to deviceId)
        CrashlyticsLog.log("WearerRepository: Calling addWatch cloud function")
        val result: Int = callCloudFunction("addWatch", parameters)
        Timber.d("WearerRepository: addWatch cloud function returned result code: $result")
        CrashlyticsLog.log("WearerRepository: addWatch completed with result: $result")
        return result
    }

    suspend fun editWearer(wearer: Wearer, params: Map<String,Any?>) {
        Timber.d("WearerRepository: Starting editWearer")
        CrashlyticsLog.log("WearerRepository: Starting wearer edit with fields: ${params.keys}")
        
        var imageFile: ParseFile? = null
        if (params.containsKey("image")) {
            Timber.d("WearerRepository: Processing new image for wearer")
            CrashlyticsLog.log("WearerRepository: Starting image processing for wearer")
            try {
                val bitmap = params["image"] as Bitmap
                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.PNG, 80, stream)
                val data = stream.toByteArray()
                imageFile = ParseFile(data)
                imageFile.save()
                Timber.d("WearerRepository: Image saved successfully for wearer")
                CrashlyticsLog.log("WearerRepository: Image processed successfully for wearer")
            } catch (e: Exception) {
                Timber.e(e, "WearerRepository: Failed to process image for wearer")
                CrashlyticsLog.recordNonFatalError(e, "Failed to process wearer image")
            }
        }

        wearer.apply {
            if (params.containsKey("name")) {
                Timber.d("WearerRepository: Updating name for wearer")
                firstName = params["name"] as String
            }
            if (params.containsKey("lastName")) {
                Timber.d("WearerRepository: Updating lastName for wearer")
                lastName = params["lastName"] as String
            }
            if (params.containsKey("phone")) {
                Timber.d("WearerRepository: Updating phone for wearer")
                phone = params["phone"] as String
            }
            if (params.containsKey("birthday")) {
                Timber.d("WearerRepository: Updating birthday for wearer")
                birthday = params["birthday"] as Date
            }
            if (imageFile != null) {
                Timber.d("WearerRepository: Setting new image for wearer")
                this.image = imageFile
            }
            suspendSave()
            Timber.i("WearerRepository: Successfully updated wearer")
            CrashlyticsLog.log("WearerRepository: Completed wearer update")
        }
    }

    suspend fun saveWearerColor(wearer: Wearer, color: String) {
        Timber.d("WearerRepository: Starting saveWearerColor with color: $color")
        CrashlyticsLog.log("WearerRepository: Starting color save")
        wearer.apply {
            this.watchColor = color
            suspendSave()
            Timber.i("WearerRepository: Successfully saved color")
            CrashlyticsLog.log("WearerRepository: Completed color save")
        }
    }

    suspend fun setInitialWatchLocation(deviceId: String, location: Location) {
        Timber.d("WearerRepository: Starting setInitialWatchLocation")
        CrashlyticsLog.log("WearerRepository: Starting location setup")
        val parseLocation = ParseGeoPoint(location.latitude, location.longitude)
        val accuracy = location.accuracy.roundToInt()
        val parameters = hashMapOf("deviceId" to deviceId, "location" to parseLocation, "accuracy" to accuracy)
        CrashlyticsLog.log("WearerRepository: Calling setInitialWatchLocation")
        callCloudFunction<Any>("setInitialWatchLocation", parameters)
        Timber.i("WearerRepository: Successfully set initial location")
        CrashlyticsLog.log("WearerRepository: Completed location setup")
    }

    suspend fun setWatchMobileNetworkOperator(deviceId: String, mobileNetworkOperator: MobileNetworkOperator?, isOther: Boolean, isSoyMomo: Boolean) {
        Timber.d("WearerRepository: Starting setWatchMobileNetworkOperator")
        CrashlyticsLog.log("WearerRepository: Starting network operator setup")
        val parameters = hashMapOf(
            "deviceId" to deviceId,
            "mobileNetworkOperatorId" to (mobileNetworkOperator?.objectId ?: false),
            "isOther" to isOther,
            "isSoyMomo" to isSoyMomo
        )
        CrashlyticsLog.log("WearerRepository: Calling setWatchMobileNetworkOperator")
        callCloudFunction<Any>("setWatchMobileNetworkOperator", parameters)
        Timber.i("WearerRepository: Successfully set mobile network operator")
        CrashlyticsLog.log("WearerRepository: Completed network operator setup")
    }

    suspend fun validateWatchAvailability(deviceId: String): WatchAvailabilityResult {
        Timber.d("WearerRepository: Starting validateWatchAvailability")
        CrashlyticsLog.log("WearerRepository: Starting watch availability validation")
        
        val validatedDeviceId = try {
            if (deviceId.isEmpty()) {
                Timber.w("WearerRepository: Empty deviceId provided")
                CrashlyticsLog.log("WearerRepository: Empty deviceId provided")
                throw IllegalArgumentException("deviceId not provided")
            }
            
            if (deviceId.length == 15) {
                val extractedId = deviceId.substring(4, 14)
                Timber.d("WearerRepository: Extracted 10-digit deviceId from 15-digit IMEI")
                extractedId
            } else {
                Timber.d("WearerRepository: Using provided deviceId as is")
                deviceId
            }
        } catch (e: Exception) {
            Timber.e(e, "WearerRepository: Failed to validate deviceId format")
            CrashlyticsLog.recordNonFatalError(e, "Failed validating deviceId format")
            return WatchAvailabilityResult(WatchAvailabilityStatus.IMEI_INVALID)
        }

        if (!validatedDeviceId.matches(Regex("^\\d{10}$"))) {
            Timber.w("WearerRepository: Invalid deviceId format")
            CrashlyticsLog.log("WearerRepository: Invalid deviceId format")
            return WatchAvailabilityResult(WatchAvailabilityStatus.IMEI_INVALID)
        }

        TestLab.mockWatchAvailability(validatedDeviceId)?.let { return it }

        val parameters = hashMapOf("deviceId" to validatedDeviceId)
        Timber.d("WearerRepository: Calling validateWatchAvailability")
        CrashlyticsLog.log("WearerRepository: Calling watch availability cloud function")
        
        return try {
            val result: Map<String, Any> = callCloudFunction("validateWatchAvailability", parameters)
            Timber.d("WearerRepository: Cloud function returned status: ${result["status"]}")
            CrashlyticsLog.log("WearerRepository: Cloud function returned status: ${result["status"]}")
            
            val status = result["status"] as? String
            val extra = result["extra"] as? Map<*, *>
            
            when (status) {
                "SUCCESS" -> {
                    Timber.i("WearerRepository: Validation successful")
                    WatchAvailabilityResult(WatchAvailabilityStatus.SUCCESS)
                }
                "SUCCESS_WITH_SIM_PREINSERTED", "SUCCESS_WITH_SIM_PRE_INSERTED" -> {
                    Timber.i("WearerRepository: Validation successful with pre-inserted SIM")
                    WatchAvailabilityResult(WatchAvailabilityStatus.SUCCESS_WITH_SIM_PRE_INSERTED)
                }
                "SUCCESS_WATCH_BELONGS_TO_OTHER_USER" -> {
                    Timber.w("WearerRepository: Watch belongs to other user")
                    val adminInfo = extra?.let {
                        WatchAdminInfo(
                            email = (it["email"] as? String)?.takeIf { s -> s.isNotBlank() },
                            fullName = (it["fullName"] as? String)?.takeIf { s -> s.isNotBlank() },
                            phone = (it["phone"] as? String)?.takeIf { s -> s.isNotBlank() },
                            imageUrl = (it["imageUrl"] as? String)?.takeIf { s -> s.isNotBlank() }
                        )
                    }
                    WatchAvailabilityResult(WatchAvailabilityStatus.SUCCESS_WATCH_BELONGS_TO_OTHER_USER, adminInfo)
                }
                "WATCH_ALREADY_LINKED" -> {
                    Timber.w("WearerRepository: Watch already linked")
                    if (extra == null) {
                        return WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_ALREADY_LINKED)
                    }

                    val hasPreInsertedSim = extra["hasPreInsertedSim"] as? Boolean ?: false
                    val hasActiveSubscription = extra["hasActiveSubscription"] as? Boolean ?: false
                    val isWatchUserActive = extra["isWatchUserActive"] as? Boolean ?: false
                    
                    Timber.d("WearerRepository: WATCH_ALREADY_LINKED extra details - " +
                        "hasPreInsertedSim: $hasPreInsertedSim, " +
                        "hasActiveSubscription: $hasActiveSubscription, " +
                        "isWatchUserActive: $isWatchUserActive")
                    CrashlyticsLog.log("WearerRepository: WATCH_ALREADY_LINKED extra details - " +
                        "hasPreInsertedSim: $hasPreInsertedSim, " +
                        "hasActiveSubscription: $hasActiveSubscription, " +
                        "isWatchUserActive: $isWatchUserActive")

                    if (hasPreInsertedSim && !hasActiveSubscription) {
                        return WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_ALREADY_LINKED_MISSING_PRE_INSERTED_SIM_ACTIVATION)
                    }

                    WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_ALREADY_LINKED)
                }
                "ERROR_INVALID_WATCH" -> {
                    Timber.w("WearerRepository: Invalid watch")
                    WatchAvailabilityResult(WatchAvailabilityStatus.WATCH_NOT_FOUND)
                }
                "ERROR_GENERIC" -> {
                    Timber.e("WearerRepository: Generic watch availability error")
                    WatchAvailabilityResult(WatchAvailabilityStatus.SEARCH_ERROR)
                }
                null -> {
                    Timber.e("WearerRepository: Missing status in result")
                    WatchAvailabilityResult(WatchAvailabilityStatus.INTERNAL_ERROR)
                }
                else -> {
                    Timber.e("WearerRepository: Unexpected status: $status")
                    WatchAvailabilityResult(WatchAvailabilityStatus.INTERNAL_ERROR)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "WearerRepository: Exception validating watch availability")
            CrashlyticsLog.recordNonFatalError(e, "Error validating watch availability")
            WatchAvailabilityResult(WatchAvailabilityStatus.SEARCH_ERROR)
        }
    }

    suspend fun verifyImeiState(deviceId: String): WearerStatus {
        Timber.d("WearerRepository: Starting verifyImeiState")
        CrashlyticsLog.log("WearerRepository: Starting IMEI verification")
        val parameters = hashMapOf("deviceId" to deviceId)
        CrashlyticsLog.log("WearerRepository: Calling verifySyncWatchStatus")
        val result: Int = callCloudFunction("verifySyncWatchStatus", parameters)
        Timber.d("WearerRepository: verifySyncWatchStatus returned result: $result")
        CrashlyticsLog.log("WearerRepository: verifySyncWatchStatus result: $result")
        
        return when (result) {
            -2 -> {
                Timber.w("WearerRepository: Unknown IMEI")
                WearerStatus.IMEI_UNKNOWN
            }
            -1 -> {
                Timber.w("WearerRepository: Wearer already linked")
                WearerStatus.WEARER_ALREADY_LINKED
            }
            0 -> {
                Timber.w("WearerRepository: Wearer belongs to other user")
                WearerStatus.WEARER_BELONGS_TO_OTHER_USER
            }
            1 -> {
                Timber.i("WearerRepository: Wearer not linked")
                WearerStatus.WEARER_NOT_LINKED
            }
            else -> {
                Timber.e("WearerRepository: Unexpected result: $result")
                CrashlyticsLog.log("WearerRepository: Unexpected verification result: $result")
                WearerStatus.SEARCH_ERROR
            }
        }
    }
}
