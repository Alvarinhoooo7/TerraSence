package com.sosmartlabs.momotabletpadres.glide

import com.bumptech.glide.load.Options
import com.bumptech.glide.load.model.ModelLoader
import com.bumptech.glide.load.model.ModelLoaderFactory
import com.bumptech.glide.load.model.MultiModelLoaderFactory
import com.bumptech.glide.signature.ObjectKey
import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import java.io.InputStream

/**
 * Glide ModelLoader for EncryptedParseFile.
 * 
 * Responsible for:
 * - Creating DataFetchers to load encrypted files
 * - Defining cache key strategy for encrypted images
 */
class EncryptedParseFileModelLoader(
    private val encryptionHelper: EncryptionHelper
) : ModelLoader<EncryptedParseFile, InputStream> {

    override fun handles(model: EncryptedParseFile): Boolean = true

    override fun buildLoadData(
        model: EncryptedParseFile,
        width: Int,
        height: Int,
        options: Options
    ): ModelLoader.LoadData<InputStream> {
        // Cache key combines the user-provided cacheKey with metadata hash
        // This ensures cache invalidation when the encrypted content changes
        val diskCacheKey = ObjectKey("${model.cacheKey}_${model.metadata.hashCode()}")
        
        return ModelLoader.LoadData(
            diskCacheKey,
            EncryptedParseFileDataFetcher(model, encryptionHelper)
        )
    }

    /**
     * Factory class for creating EncryptedParseFileModelLoader instances.
     * Used by Glide's registry to create loaders with dependencies.
     */
    class Factory(
        private val encryptionHelper: EncryptionHelper
    ) : ModelLoaderFactory<EncryptedParseFile, InputStream> {

        override fun build(
            multiFactory: MultiModelLoaderFactory
        ): ModelLoader<EncryptedParseFile, InputStream> {
            return EncryptedParseFileModelLoader(encryptionHelper)
        }

        override fun teardown() {
            // No resources to release
        }
    }
}
