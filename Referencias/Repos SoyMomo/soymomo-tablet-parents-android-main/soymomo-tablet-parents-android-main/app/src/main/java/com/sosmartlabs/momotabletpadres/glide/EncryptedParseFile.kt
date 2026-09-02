package com.sosmartlabs.momotabletpadres.glide

import com.parse.ParseFile
import com.sosmartlabs.momotabletpadres.encryption.EncryptedMetadata

/**
 * Model class that bundles an encrypted ParseFile with its decryption metadata.
 * Used as input for Glide's custom ModelLoader to transparently handle encrypted images.
 *
 * @param parseFile The encrypted file from Parse
 * @param metadata The encryption metadata (IV, key ID, key version, etc.)
 * @param cacheKey A unique key for Glide's disk cache (e.g., "tabletId_objectId")
 */
data class EncryptedParseFile(
    val parseFile: ParseFile,
    val metadata: EncryptedMetadata,
    val cacheKey: String
) {
    companion object {
        /**
         * Create an EncryptedParseFile from common data sources.
         * Returns null if any required data is missing.
         */
        fun create(
            parseFile: ParseFile?,
            metadata: EncryptedMetadata?,
            cacheKey: String
        ): EncryptedParseFile? {
            if (parseFile == null || metadata == null) return null
            return EncryptedParseFile(parseFile, metadata, cacheKey)
        }

        /**
         * Create an EncryptedParseFile from a metadata map (as stored in Parse).
         * Returns null if any required data is missing.
         */
        fun create(
            parseFile: ParseFile?,
            metadataMap: Map<String, Any?>?,
            cacheKey: String
        ): EncryptedParseFile? {
            if (parseFile == null) return null
            val metadata = EncryptedMetadata.fromMap(metadataMap) ?: return null
            return EncryptedParseFile(parseFile, metadata, cacheKey)
        }
    }
}
