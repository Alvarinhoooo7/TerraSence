package com.sosmartlabs.momotabletpadres.encryption

import android.os.Parcelable
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

/**
 * Metadata for encrypted content, matching the tablet's encryption format.
 * This is used to decrypt data that was encrypted on the tablet.
 */
@Parcelize
data class EncryptedMetadata(
    @SerializedName("v")
    val v: Int,
    
    @SerializedName("alg")
    val alg: String,
    
    @SerializedName("kid")
    val kid: String,
    
    @SerializedName("kv")
    val kv: Int,
    
    @SerializedName("iv")
    val iv: String
) : Parcelable {
    companion object {
        const val CURRENT_VERSION = 1
        const val ALGORITHM_A256GCM = "A256GCM"
        
        private val gson = Gson()
        
        /**
         * Parse encryption metadata from JSON string.
         * @param json JSON string containing encryption metadata
         * @return EncryptedMetadata or null if parsing fails
         */
        fun fromJson(json: String): EncryptedMetadata? {
            return try {
                gson.fromJson(json, EncryptedMetadata::class.java)
            } catch (e: Exception) {
                null
            }
        }
        
        /**
         * Parse encryption metadata from a Map (as returned by Parse).
         * @param map Map containing encryption metadata fields
         * @return EncryptedMetadata or null if parsing fails
         */
        fun fromMap(map: Map<String, Any?>?): EncryptedMetadata? {
            if (map == null) return null
            
            return try {
                val v = when (val vValue = map["v"]) {
                    is Number -> vValue.toInt()
                    is String -> vValue.toIntOrNull()
                    else -> null
                } ?: return null
                
                val alg = map["alg"] as? String ?: return null
                val kid = map["kid"] as? String ?: return null
                
                val kv = when (val kvValue = map["kv"]) {
                    is Number -> kvValue.toInt()
                    is String -> kvValue.toIntOrNull()
                    else -> null
                } ?: return null
                
                val iv = map["iv"] as? String ?: return null
                
                EncryptedMetadata(v = v, alg = alg, kid = kid, kv = kv, iv = iv)
            } catch (e: Exception) {
                null
            }
        }
    }
    
    /**
     * Serialize this metadata to JSON string.
     */
    fun toJson(): String = gson.toJson(this)
    
    /**
     * Convert to a Map suitable for storing in Parse.
     */
    fun toParseMap(): Map<String, Any?> = mapOf(
        "v" to v,
        "alg" to alg,
        "kid" to kid,
        "kv" to kv,
        "iv" to iv
    )
}
