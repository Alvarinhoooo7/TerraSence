package com.sosmartlabs.momotabletpadres.encryption

/**
 * Result of encrypting a string.
 * Contains the Base64-encoded encrypted data and the metadata needed for decryption.
 */
data class EncryptedStringResult(
    val encrypted: String,
    val meta: EncryptedMetadata
)
