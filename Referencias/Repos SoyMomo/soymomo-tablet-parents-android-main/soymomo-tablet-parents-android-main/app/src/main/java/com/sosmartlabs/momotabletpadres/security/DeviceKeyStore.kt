package com.sosmartlabs.momotabletpadres.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure storage for device encryption keys.
 * Uses EncryptedSharedPreferences to store keys per tablet.
 * Each tablet has its own key, identified by tabletId.
 * 
 * Note: EncryptedSharedPreferences is deprecated in favor of DataStore + Tink,
 * but remains functional. Migration can be considered in a future update.
 */
@Singleton
class DeviceKeyStore @Inject constructor(
    private val context: Context
) {
    @Suppress("DEPRECATION")
    private val sharedPreferences: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Timber.e(e, "DeviceKeyStore: Failed to create EncryptedSharedPreferences, falling back to regular prefs")
            context.getSharedPreferences(PREFS_NAME_FALLBACK, Context.MODE_PRIVATE)
        }
    }

    /**
     * Check if a key exists for the given tablet.
     */
    fun hasKey(tabletId: String): Boolean {
        return sharedPreferences.contains(keyForTablet(KEY_DEVICE_KEY, tabletId))
    }

    /**
     * Get the raw key bytes for the given tablet.
     * @return 32-byte key or null if not found/invalid
     */
    fun getKeyBytes(tabletId: String): ByteArray? {
        val base64Key = sharedPreferences.getString(keyForTablet(KEY_DEVICE_KEY, tabletId), null)
            ?: return null
        return try {
            Base64.decode(base64Key, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "DeviceKeyStore: Failed to decode key for tablet $tabletId")
            null
        }
    }

    /**
     * Get the key version for the given tablet.
     */
    fun getKeyVersion(tabletId: String): Int {
        return sharedPreferences.getInt(keyForTablet(KEY_VERSION, tabletId), 0)
    }

    /**
     * Save a device key for the given tablet.
     * @param tabletId The tablet's objectId
     * @param keyBase64 The key encoded as base64
     * @param keyVersion The version of the key
     * @param keyAlg The algorithm used (e.g., "aes-256-gcm")
     */
    fun saveKey(tabletId: String, keyBase64: String, keyVersion: Int, keyAlg: String) {
        sharedPreferences.edit {
            putString(keyForTablet(KEY_DEVICE_KEY, tabletId), keyBase64)
            putInt(keyForTablet(KEY_VERSION, tabletId), keyVersion)
            putString(keyForTablet(KEY_ALG, tabletId), keyAlg)
        }
        Timber.i("DeviceKeyStore: Saved device key for tablet=$tabletId (version=$keyVersion, alg=$keyAlg)")
    }

    /**
     * Clear the key for the given tablet.
     */
    fun clearKey(tabletId: String) {
        sharedPreferences.edit {
            remove(keyForTablet(KEY_DEVICE_KEY, tabletId))
            remove(keyForTablet(KEY_VERSION, tabletId))
            remove(keyForTablet(KEY_ALG, tabletId))
        }
        Timber.i("DeviceKeyStore: Cleared device key for tablet=$tabletId")
    }

    /**
     * Clear all stored keys.
     */
    fun clearAllKeys() {
        sharedPreferences.edit { clear() }
        Timber.i("DeviceKeyStore: Cleared all device keys")
    }

    private fun keyForTablet(baseKey: String, tabletId: String): String {
        return "${baseKey}_$tabletId"
    }

    companion object {
        private const val PREFS_NAME = "device_key_store"
        private const val PREFS_NAME_FALLBACK = "device_key_store_fallback"
        private const val KEY_DEVICE_KEY = "device_key"
        private const val KEY_VERSION = "key_version"
        private const val KEY_ALG = "key_alg"
    }
}
