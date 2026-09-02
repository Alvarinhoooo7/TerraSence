package com.sosmartlabs.momotabletpadres.security

import com.parse.ParseUser
import com.parse.coroutines.callCloudFunction
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import com.sosmartlabs.momotabletpadres.utils.firebase.CrashlyticsLog
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for managing device encryption keys.
 * Handles cloud function calls to grant access and fetch keys.
 */
@Singleton
class DeviceKeyRepository @Inject constructor(
    private val deviceKeyStore: DeviceKeyStore,
    private val tabletRepository: TabletRepository
) {

    /**
     * Grant device key access for the current user to a tablet.
     * This creates a DeviceKeyShare entry on the server.
     * 
     * @param tabletId The tablet's objectId
     * @return true if access was granted successfully
     */
    suspend fun grantDeviceKeyAccess(tabletId: String): Boolean {
        Timber.d("DeviceKeyRepository: Granting device key access for tablet=$tabletId")
        CrashlyticsLog.log("DeviceKeyRepository: Granting device key access for tablet=$tabletId")

        return try {
            val result = callCloudFunction<Map<String, Any>>(
                "grantDeviceKeyAccess",
                hashMapOf("tabletId" to tabletId)
            )
            
            val ok = result["ok"] as? Boolean == true
            if (ok) {
                Timber.i("DeviceKeyRepository: Successfully granted device key access for tablet=$tabletId")
            } else {
                Timber.w("DeviceKeyRepository: Failed to grant device key access for tablet=$tabletId, result=$result")
            }
            ok
        } catch (e: Exception) {
            Timber.e(e, "DeviceKeyRepository: Exception granting device key access for tablet=$tabletId")
            CrashlyticsLog.recordNonFatalError(e, "DeviceKeyRepository: Exception granting device key access")
            false
        }
    }

    /**
     * Get the device key for the current user for a specific tablet.
     * 
     * @param tabletId The tablet's objectId
     * @return DeviceKeyResult or null if the key couldn't be fetched
     */
    suspend fun getDeviceKeyForUser(tabletId: String): DeviceKeyResult? {
        Timber.d("DeviceKeyRepository: Fetching device key for tablet=$tabletId")
        CrashlyticsLog.log("DeviceKeyRepository: Fetching device key for tablet=$tabletId")

        return try {
            val result = callCloudFunction<Map<String, Any>>(
                "getDeviceKeyForUser",
                hashMapOf(
                    "tabletId" to tabletId,
                    "format" to "plain"
                )
            )
            
            val ok = result["ok"] as? Boolean == true
            if (!ok) {
                Timber.w("DeviceKeyRepository: Server returned ok=false for tablet=$tabletId")
                return null
            }
            
            val deviceKey = result["deviceKey"] as? String
            val keyVersion = when (val version = result["keyVersion"]) {
                is Number -> version.toInt()
                is String -> version.toIntOrNull()
                else -> null
            }
            val keyAlg = result["keyAlg"] as? String
            val deviceObjectId = result["deviceObjectId"] as? String ?: tabletId
            
            if (deviceKey.isNullOrBlank() || keyVersion == null || keyAlg.isNullOrBlank()) {
                Timber.e("DeviceKeyRepository: Missing required fields in response for tablet=$tabletId")
                return null
            }
            
            Timber.i("DeviceKeyRepository: Successfully fetched device key for tablet=$tabletId (version=$keyVersion)")
            DeviceKeyResult(
                deviceKey = deviceKey,
                keyVersion = keyVersion,
                keyAlg = keyAlg,
                deviceObjectId = deviceObjectId
            )
        } catch (e: Exception) {
            Timber.e(e, "DeviceKeyRepository: Exception fetching device key for tablet=$tabletId")
            CrashlyticsLog.recordNonFatalError(e, "DeviceKeyRepository: Exception fetching device key")
            null
        }
    }

    /**
     * Fetch and store the device key for a tablet.
     * This combines grantDeviceKeyAccess and getDeviceKeyForUser,
     * then stores the key securely.
     * 
     * @param tabletId The tablet's objectId
     * @return true if the key was successfully fetched and stored
     */
    suspend fun fetchAndStoreKey(tabletId: String): Boolean {
        Timber.d("DeviceKeyRepository: fetchAndStoreKey for tablet=$tabletId")
        
        // First, grant access (creates DeviceKeyShare if not exists)
        val accessGranted = grantDeviceKeyAccess(tabletId)
        if (!accessGranted) {
            Timber.w("DeviceKeyRepository: Could not grant access for tablet=$tabletId, will try to fetch anyway")
            // Continue anyway - the share might already exist
        }
        
        // Fetch the key
        val keyResult = getDeviceKeyForUser(tabletId) ?: return false
        
        // Store it securely
        deviceKeyStore.saveKey(
            tabletId = keyResult.deviceObjectId,
            keyBase64 = keyResult.deviceKey,
            keyVersion = keyResult.keyVersion,
            keyAlg = keyResult.keyAlg
        )
        
        Timber.i("DeviceKeyRepository: Successfully fetched and stored key for tablet=$tabletId")
        return true
    }

    /**
     * Sync keys for all linked tablets.
     * Called at app startup to ensure keys are available for all tablets.
     */
    suspend fun syncKeysForLinkedTablets() {
        val user = ParseUser.getCurrentUser() ?: run {
            Timber.d("DeviceKeyRepository: No current user, skipping key sync")
            return
        }
        
        Timber.d("DeviceKeyRepository: Syncing keys for linked tablets (user=${user.objectId})")
        
        try {
            val linkedTablets = tabletRepository.getTabletListByUser(user)
            Timber.d("DeviceKeyRepository: Found ${linkedTablets.size} linked tablets")
            
            linkedTablets.forEach { tablet ->
                val tabletId = tablet.objectId ?: return@forEach
                if (!deviceKeyStore.hasKey(tabletId)) {
                    Timber.d("DeviceKeyRepository: Syncing missing key for tablet=$tabletId")
                    try {
                        fetchAndStoreKey(tabletId)
                    } catch (e: Exception) {
                        Timber.w(e, "DeviceKeyRepository: Failed to sync key for tablet=$tabletId, will retry later")
                    }
                } else {
                    Timber.v("DeviceKeyRepository: Key already exists for tablet=$tabletId")
                }
            }
            
            Timber.i("DeviceKeyRepository: Key sync completed")
        } catch (e: Exception) {
            Timber.e(e, "DeviceKeyRepository: Exception during key sync")
            CrashlyticsLog.recordNonFatalError(e, "DeviceKeyRepository: Exception during key sync")
        }
    }

    /**
     * Check if a key exists for the given tablet.
     */
    fun hasKey(tabletId: String): Boolean = deviceKeyStore.hasKey(tabletId)

    /**
     * Get the key bytes for the given tablet.
     */
    fun getKeyBytes(tabletId: String): ByteArray? = deviceKeyStore.getKeyBytes(tabletId)

    /**
     * Clear the key for the given tablet (e.g., on unlink).
     */
    fun clearKey(tabletId: String) = deviceKeyStore.clearKey(tabletId)

    /**
     * Clear all stored keys (e.g., on logout).
     */
    fun clearAllKeys() {
        Timber.d("DeviceKeyRepository: Clearing all device keys")
        deviceKeyStore.clearAllKeys()
    }
}
