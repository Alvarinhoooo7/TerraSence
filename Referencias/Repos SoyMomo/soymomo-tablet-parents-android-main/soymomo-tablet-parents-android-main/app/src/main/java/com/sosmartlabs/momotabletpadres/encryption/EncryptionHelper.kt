package com.sosmartlabs.momotabletpadres.encryption

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import com.sosmartlabs.momotabletpadres.security.DeviceKeyStore
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * Sealed class representing the result of a decryption operation.
 * Provides detailed information about why decryption might have failed,
 * allowing callers to take appropriate action (e.g., refresh keys on version mismatch).
 */
sealed class DecryptionResult {
    /**
     * Decryption succeeded.
     * @param data The decrypted data
     */
    data class Success(val data: ByteArray) : DecryptionResult() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as Success
            return data.contentEquals(other.data)
        }
        override fun hashCode(): Int = data.contentHashCode()
    }
    
    /**
     * Key version mismatch - the stored key version doesn't match the required version.
     * Caller should refresh the key from the server and retry.
     * 
     * @param storedVersion The key version currently stored locally
     * @param requiredVersion The key version required by the encrypted data (meta.kv)
     * @param kid The key identifier (tablet ID)
     */
    data class KeyVersionMismatch(
        val storedVersion: Int,
        val requiredVersion: Int,
        val kid: String
    ) : DecryptionResult()
    
    /**
     * No key found for the specified tablet.
     * @param kid The key identifier (tablet ID) that was not found
     */
    data class KeyNotFound(val kid: String) : DecryptionResult()
    
    /**
     * Decryption failed due to a cryptographic error (wrong key, corrupted data, etc.)
     * @param message Optional error message
     */
    data class DecryptionFailed(val message: String? = null) : DecryptionResult()
    
    /**
     * Invalid metadata (unsupported version, algorithm, missing fields, etc.)
     * @param message Error message describing the validation failure
     */
    data class InvalidMetadata(val message: String) : DecryptionResult()
}

/**
 * Helper class for encrypting and decrypting content.
 * Uses AES-256-GCM algorithm matching the tablet's encryption format.
 * 
 * For the parent app, all operations require a tabletId since the parent
 * can have multiple tablets linked, each with its own device key.
 */
@Singleton
class EncryptionHelper @Inject constructor(
    private val deviceKeyStore: DeviceKeyStore,
    private val deviceKeyRepositoryProvider: Provider<DeviceKeyRepository>
) {
    
    /**
     * Decrypt bytes using the key for the specified tablet.
     * 
     * @param encryptedBytes The encrypted data
     * @param meta The encryption metadata containing IV and key identifier
     * @return Decrypted bytes or null if decryption fails
     */
    fun decryptBytes(encryptedBytes: ByteArray, meta: EncryptedMetadata): ByteArray? {
        val keyBytes = deviceKeyStore.getKeyBytes(meta.kid)
        if (keyBytes == null) {
            Timber.w("EncryptionHelper: No key available for kid=${meta.kid}")
            return null
        }
        return decryptBytes(encryptedBytes, meta, keyBytes)
    }

    /**
     * Decrypt bytes using the provided key.
     * 
     * @param encryptedBytes The encrypted data
     * @param meta The encryption metadata containing IV
     * @param keyBytes The 32-byte AES key
     * @return Decrypted bytes or null if decryption fails
     */
    fun decryptBytes(encryptedBytes: ByteArray, meta: EncryptedMetadata, keyBytes: ByteArray): ByteArray? {
        return try {
            validateMetaOrThrow(meta)
            
            if (keyBytes.size != KEY_SIZE_BYTES) {
                Timber.e("EncryptionHelper: Invalid key size: ${keyBytes.size}, expected $KEY_SIZE_BYTES")
                return null
            }
            
            val iv = Base64.decode(meta.iv, Base64.NO_WRAP)
            if (iv.size != IV_SIZE_BYTES) {
                Timber.e("EncryptionHelper: Invalid IV size: ${iv.size}, expected $IV_SIZE_BYTES")
                return null
            }
            
            if (encryptedBytes.size < 1 + (TAG_SIZE_BITS / 8)) {
                Timber.e("EncryptionHelper: Encrypted payload too short: ${encryptedBytes.size}")
                return null
            }
            
            decryptInternal(keyBytes, iv, encryptedBytes)
        } catch (e: GeneralSecurityException) {
            Timber.e(e, "EncryptionHelper: decryptBytes failed")
            null
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "EncryptionHelper: Invalid Base64 input")
            null
        }
    }

    /**
     * Decrypt a Base64-encoded string using the key for the specified tablet.
     * 
     * @param encryptedB64 The encrypted data as Base64
     * @param meta The encryption metadata
     * @return Decrypted string or null if decryption fails
     */
    fun decryptString(encryptedB64: String, meta: EncryptedMetadata): String? {
        val keyBytes = deviceKeyStore.getKeyBytes(meta.kid)
        if (keyBytes == null) {
            Timber.w("EncryptionHelper: No key available for kid=${meta.kid}")
            return null
        }
        return decryptString(encryptedB64, meta, keyBytes)
    }

    /**
     * Decrypt a Base64-encoded string using the provided key.
     * 
     * @param encryptedB64 The encrypted data as Base64
     * @param meta The encryption metadata
     * @param keyBytes The 32-byte AES key
     * @return Decrypted string or null if decryption fails
     */
    fun decryptString(encryptedB64: String, meta: EncryptedMetadata, keyBytes: ByteArray): String? {
        return try {
            val encryptedBytes = Base64.decode(encryptedB64, Base64.NO_WRAP)
            val decryptedBytes = decryptBytes(encryptedBytes, meta, keyBytes) ?: return null
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "EncryptionHelper: Invalid Base64 input")
            null
        }
    }

    /**
     * Decrypt encrypted bytes to a Bitmap.
     * 
     * @param encryptedBytes The encrypted image data
     * @param meta The encryption metadata
     * @return Bitmap or null if decryption or decoding fails
     */
    fun decryptToBitmap(encryptedBytes: ByteArray, meta: EncryptedMetadata): Bitmap? {
        val decrypted = decryptBytes(encryptedBytes, meta)
        if (decrypted == null) {
            Timber.e("EncryptionHelper: decryptToBitmap - Decryption failed")
            return null
        }
        return try {
            BitmapFactory.decodeByteArray(decrypted, 0, decrypted.size)
        } catch (e: Exception) {
            Timber.e(e, "EncryptionHelper: decryptToBitmap - Failed to decode bitmap")
            null
        }
    }

    /**
     * Decrypt encrypted bytes to a Bitmap using the provided key.
     * 
     * @param encryptedBytes The encrypted image data
     * @param meta The encryption metadata
     * @param keyBytes The 32-byte AES key
     * @return Bitmap or null if decryption or decoding fails
     */
    fun decryptToBitmap(encryptedBytes: ByteArray, meta: EncryptedMetadata, keyBytes: ByteArray): Bitmap? {
        val decrypted = decryptBytes(encryptedBytes, meta, keyBytes)
        if (decrypted == null) {
            Timber.e("EncryptionHelper: decryptToBitmap - Decryption failed")
            return null
        }
        return try {
            BitmapFactory.decodeByteArray(decrypted, 0, decrypted.size)
        } catch (e: Exception) {
            Timber.e(e, "EncryptionHelper: decryptToBitmap - Failed to decode bitmap")
            null
        }
    }

    // ==================== DECRYPTION WITH RESULT ====================
    
    /**
     * Decrypt bytes with detailed result information.
     * Unlike [decryptBytes], this method returns a [DecryptionResult] that provides
     * specific information about why decryption might have failed, enabling
     * callers to take appropriate action (e.g., refresh keys on version mismatch).
     * 
     * @param encryptedBytes The encrypted data
     * @param meta The encryption metadata containing IV and key identifier
     * @return DecryptionResult indicating success or the specific failure reason
     */
    fun decryptBytesWithResult(encryptedBytes: ByteArray, meta: EncryptedMetadata): DecryptionResult {
        // Validate metadata first
        try {
            validateMetaOrThrow(meta)
        } catch (e: GeneralSecurityException) {
            Timber.e(e, "EncryptionHelper: decryptBytesWithResult - Invalid metadata")
            return DecryptionResult.InvalidMetadata(e.message ?: "Invalid metadata")
        }
        
        // Check if key exists
        val keyBytes = deviceKeyStore.getKeyBytes(meta.kid)
        if (keyBytes == null) {
            Timber.w("EncryptionHelper: decryptBytesWithResult - No key for kid=${meta.kid}")
            return DecryptionResult.KeyNotFound(meta.kid)
        }
        
        // Check key version match
        val storedVersion = deviceKeyStore.getKeyVersion(meta.kid)
        if (storedVersion != meta.kv) {
            Timber.w("EncryptionHelper: decryptBytesWithResult - Key version mismatch: stored=$storedVersion, required=${meta.kv}, kid=${meta.kid}")
            return DecryptionResult.KeyVersionMismatch(
                storedVersion = storedVersion,
                requiredVersion = meta.kv,
                kid = meta.kid
            )
        }
        
        // Validate key size
        if (keyBytes.size != KEY_SIZE_BYTES) {
            Timber.e("EncryptionHelper: decryptBytesWithResult - Invalid key size: ${keyBytes.size}")
            return DecryptionResult.DecryptionFailed("Invalid key size: ${keyBytes.size}, expected $KEY_SIZE_BYTES")
        }
        
        // Decode and validate IV
        val iv: ByteArray
        try {
            iv = Base64.decode(meta.iv, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "EncryptionHelper: decryptBytesWithResult - Invalid IV Base64")
            return DecryptionResult.InvalidMetadata("Invalid IV encoding")
        }
        
        if (iv.size != IV_SIZE_BYTES) {
            Timber.e("EncryptionHelper: decryptBytesWithResult - Invalid IV size: ${iv.size}")
            return DecryptionResult.InvalidMetadata("Invalid IV size: ${iv.size}, expected $IV_SIZE_BYTES")
        }
        
        // Validate encrypted payload size
        if (encryptedBytes.size < 1 + (TAG_SIZE_BITS / 8)) {
            Timber.e("EncryptionHelper: decryptBytesWithResult - Encrypted payload too short: ${encryptedBytes.size}")
            return DecryptionResult.DecryptionFailed("Encrypted payload too short")
        }
        
        // Attempt decryption
        return try {
            val decrypted = decryptInternal(keyBytes, iv, encryptedBytes)
            DecryptionResult.Success(decrypted)
        } catch (e: GeneralSecurityException) {
            Timber.e(e, "EncryptionHelper: decryptBytesWithResult - Decryption failed")
            DecryptionResult.DecryptionFailed(e.message)
        }
    }
    
    /**
     * Decrypt a Base64-encoded string with detailed result information.
     * Unlike [decryptString], this method returns a [DecryptionResult] that provides
     * specific information about why decryption might have failed.
     * 
     * @param encryptedB64 The encrypted data as Base64
     * @param meta The encryption metadata
     * @return DecryptionResult indicating success (with String data) or the specific failure reason
     */
    fun decryptStringWithResult(encryptedB64: String, meta: EncryptedMetadata): DecryptionResult {
        val encryptedBytes: ByteArray
        try {
            encryptedBytes = Base64.decode(encryptedB64, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "EncryptionHelper: decryptStringWithResult - Invalid Base64 input")
            return DecryptionResult.DecryptionFailed("Invalid Base64 input")
        }
        
        return decryptBytesWithResult(encryptedBytes, meta)
    }

    /**
     * Decrypt bytes with automatic key refresh on version mismatch or missing key.
     * 
     * @param encryptedBytes The encrypted data
     * @param meta The encryption metadata
     * @return The decrypted bytes, or null if decryption failed even after refresh
     */
    suspend fun decryptBytesWithAutoRefresh(encryptedBytes: ByteArray, meta: EncryptedMetadata): ByteArray? {
        // First attempt
        val result = decryptBytesWithResult(encryptedBytes, meta)
        
        return when (result) {
            is DecryptionResult.Success -> result.data
            
            is DecryptionResult.KeyVersionMismatch -> {
                Timber.i("EncryptionHelper: Key version mismatch (stored=${result.storedVersion}, required=${result.requiredVersion}), attempting refresh...")
                tryRefreshAndDecrypt(encryptedBytes, meta)
            }
            
            is DecryptionResult.KeyNotFound -> {
                Timber.i("EncryptionHelper: Key not found for kid=${result.kid}, attempting fetch...")
                tryRefreshAndDecrypt(encryptedBytes, meta)
            }
            
            else -> {
                Timber.w("EncryptionHelper: Decryption failed: $result")
                null
            }
        }
    }

    /**
     * Decrypt string with automatic key refresh on version mismatch or missing key.
     * 
     * @param encryptedB64 The encrypted data as Base64
     * @param meta The encryption metadata
     * @return The decrypted string, or null if decryption failed even after refresh
     */
    suspend fun decryptStringWithAutoRefresh(encryptedB64: String, meta: EncryptedMetadata): String? {
        val encryptedBytes: ByteArray
        try {
            encryptedBytes = Base64.decode(encryptedB64, Base64.NO_WRAP)
        } catch (e: IllegalArgumentException) {
            Timber.e(e, "EncryptionHelper: decryptStringWithAutoRefresh - Invalid Base64 input")
            return null
        }
        
        val decryptedBytes = decryptBytesWithAutoRefresh(encryptedBytes, meta) ?: return null
        return String(decryptedBytes, Charsets.UTF_8)
    }

    /**
     * Decrypt bytes to Bitmap with automatic key refresh on version mismatch or missing key.
     * 
     * @param encryptedBytes The encrypted data
     * @param meta The encryption metadata
     * @return The decrypted Bitmap, or null if decryption failed even after refresh
     */
    suspend fun decryptToBitmapWithAutoRefresh(encryptedBytes: ByteArray, meta: EncryptedMetadata): Bitmap? {
        val decryptedBytes = decryptBytesWithAutoRefresh(encryptedBytes, meta) ?: return null
        return try {
            BitmapFactory.decodeByteArray(decryptedBytes, 0, decryptedBytes.size)
        } catch (e: Exception) {
            Timber.e(e, "EncryptionHelper: decryptToBitmapWithAutoRefresh - Failed to decode bitmap")
            null
        }
    }
    
    private suspend fun tryRefreshAndDecrypt(encryptedBytes: ByteArray, meta: EncryptedMetadata): ByteArray? {
        return try {
            val repository = deviceKeyRepositoryProvider.get()
            if (repository.fetchAndStoreKey(meta.kid)) {
                // Retry decryption with new key
                val retryResult = decryptBytesWithResult(encryptedBytes, meta)
                if (retryResult is DecryptionResult.Success) {
                    Timber.i("EncryptionHelper: Successfully decrypted after key refresh")
                    retryResult.data
                } else {
                    Timber.e("EncryptionHelper: Decryption failed even after key refresh: $retryResult")
                    null
                }
            } else {
                Timber.e("EncryptionHelper: Failed to refresh key for kid=${meta.kid}")
                null
            }
        } catch (e: Exception) {
            Timber.e(e, "EncryptionHelper: Exception during key refresh")
            null
        }
    }
    
    // ==================== ENCRYPTION METHODS ====================

    /**
     * Encrypt bytes using the key for the specified tablet.
     * 
     * @param data The data to encrypt
     * @param tabletId The tablet's objectId (used as kid in metadata)
     * @return EncryptedBytesResult or null if encryption fails
     */
    fun encryptBytes(data: ByteArray, tabletId: String): EncryptedBytesResult? {
        val keyBytes = deviceKeyStore.getKeyBytes(tabletId)
        if (keyBytes == null) {
            Timber.w("EncryptionHelper: No key available for tabletId=$tabletId")
            return null
        }
        if (keyBytes.size != KEY_SIZE_BYTES) {
            Timber.e("EncryptionHelper: Invalid key size: ${keyBytes.size}, expected $KEY_SIZE_BYTES")
            return null
        }
        
        val kv = deviceKeyStore.getKeyVersion(tabletId)
        
        return try {
            val (iv, encryptedBytes) = encryptInternal(keyBytes, data)
            EncryptedBytesResult(
                encryptedBytes = encryptedBytes,
                meta = EncryptedMetadata(
                    v = EncryptedMetadata.CURRENT_VERSION,
                    alg = EncryptedMetadata.ALGORITHM_A256GCM,
                    kid = tabletId,
                    kv = kv,
                    iv = Base64.encodeToString(iv, Base64.NO_WRAP)
                )
            )
        } catch (e: GeneralSecurityException) {
            Timber.e(e, "EncryptionHelper: encryptBytes failed")
            null
        }
    }

    /**
     * Encrypt a string using the key for the specified tablet.
     * 
     * @param plaintext The string to encrypt
     * @param tabletId The tablet's objectId (used as kid in metadata)
     * @return EncryptedStringResult or null if encryption fails
     */
    fun encryptString(plaintext: String, tabletId: String): EncryptedStringResult? {
        val keyBytes = deviceKeyStore.getKeyBytes(tabletId)
        if (keyBytes == null) {
            Timber.w("EncryptionHelper: No key available for tabletId=$tabletId")
            return null
        }
        if (keyBytes.size != KEY_SIZE_BYTES) {
            Timber.e("EncryptionHelper: Invalid key size: ${keyBytes.size}, expected $KEY_SIZE_BYTES")
            return null
        }
        
        val kv = deviceKeyStore.getKeyVersion(tabletId)
        
        return try {
            val (iv, encryptedBytes) = encryptInternal(keyBytes, plaintext.toByteArray(Charsets.UTF_8))
            EncryptedStringResult(
                encrypted = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP),
                meta = EncryptedMetadata(
                    v = EncryptedMetadata.CURRENT_VERSION,
                    alg = EncryptedMetadata.ALGORITHM_A256GCM,
                    kid = tabletId,
                    kv = kv,
                    iv = Base64.encodeToString(iv, Base64.NO_WRAP)
                )
            )
        } catch (e: GeneralSecurityException) {
            Timber.e(e, "EncryptionHelper: encryptString failed")
            null
        }
    }

    /**
     * Encrypt a Bitmap using the key for the specified tablet.
     * 
     * @param bitmap The bitmap to encrypt
     * @param tabletId The tablet's objectId (used as kid in metadata)
     * @param format The compression format (default PNG)
     * @param quality The compression quality 0-100 (default 100)
     * @return EncryptedBytesResult or null if encryption fails
     */
    fun encryptBitmap(
        bitmap: Bitmap,
        tabletId: String,
        format: Bitmap.CompressFormat = Bitmap.CompressFormat.PNG,
        quality: Int = 100
    ): EncryptedBytesResult? {
        val stream = ByteArrayOutputStream()
        val success = bitmap.compress(format, quality, stream)
        if (!success) {
            Timber.e("EncryptionHelper: encryptBitmap - Failed to compress bitmap")
            return null
        }
        return encryptBytes(stream.toByteArray(), tabletId)
    }

    // ==================== AVAILABILITY CHECKS ====================

    /**
     * Check if encryption is available for a specific tablet.
     * Encryption requires a valid 32-byte key.
     */
    fun isEncryptionAvailable(tabletId: String): Boolean {
        val key = deviceKeyStore.getKeyBytes(tabletId)
        return key != null && key.size == KEY_SIZE_BYTES
    }

    /**
     * Get the key version for a specific tablet.
     */
    fun getKeyVersion(tabletId: String): Int = deviceKeyStore.getKeyVersion(tabletId)

    // ==================== INTERNAL METHODS ====================

    private fun encryptInternal(keyBytes: ByteArray, plaintextBytes: ByteArray): Pair<ByteArray, ByteArray> {
        val iv = ByteArray(IV_SIZE_BYTES)
        SecureRandom().nextBytes(iv)
        
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val keySpec = SecretKeySpec(keyBytes, KEY_ALG)
        val gcmSpec = GCMParameterSpec(TAG_SIZE_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec)
        
        val encrypted = cipher.doFinal(plaintextBytes)
        return Pair(iv, encrypted)
    }

    private fun decryptInternal(keyBytes: ByteArray, ivBytes: ByteArray, encryptedBytes: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val keySpec = SecretKeySpec(keyBytes, KEY_ALG)
        val gcmSpec = GCMParameterSpec(TAG_SIZE_BITS, ivBytes)
        cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec)
        return cipher.doFinal(encryptedBytes)
    }

    private fun validateMetaOrThrow(meta: EncryptedMetadata) {
        if (meta.v != EncryptedMetadata.CURRENT_VERSION) {
            throw GeneralSecurityException("Unsupported encryption meta version: ${meta.v}")
        }
        if (meta.alg != EncryptedMetadata.ALGORITHM_A256GCM) {
            throw GeneralSecurityException("Unsupported algorithm: ${meta.alg}")
        }
        if (meta.kid.isBlank()) {
            throw GeneralSecurityException("Missing key identifier")
        }
        if (meta.iv.isBlank()) {
            throw GeneralSecurityException("Missing IV")
        }
    }

    companion object {
        private const val KEY_SIZE_BYTES = 32
        private const val IV_SIZE_BYTES = 12
        private const val TAG_SIZE_BITS = 128
        private const val KEY_ALG = "AES"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
