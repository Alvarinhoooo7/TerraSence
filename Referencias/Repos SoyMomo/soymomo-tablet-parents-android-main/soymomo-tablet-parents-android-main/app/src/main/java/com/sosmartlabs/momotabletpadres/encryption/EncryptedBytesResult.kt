package com.sosmartlabs.momotabletpadres.encryption

/**
 * Result of encrypting bytes.
 * Contains the encrypted data and the metadata needed for decryption.
 */
data class EncryptedBytesResult(
    val encryptedBytes: ByteArray,
    val meta: EncryptedMetadata
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as EncryptedBytesResult
        if (!encryptedBytes.contentEquals(other.encryptedBytes)) return false
        if (meta != other.meta) return false
        return true
    }

    override fun hashCode(): Int {
        var result = encryptedBytes.contentHashCode()
        result = 31 * result + meta.hashCode()
        return result
    }
}
