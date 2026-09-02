package com.sosmartlabs.momotabletpadres.glide

import android.content.Context
import com.bumptech.glide.Glide
import com.bumptech.glide.Registry
import com.bumptech.glide.annotation.GlideModule
import com.bumptech.glide.module.AppGlideModule
import dagger.hilt.android.EntryPointAccessors
import timber.log.Timber
import java.io.InputStream

/**
 * Custom Glide module that registers the encrypted ParseFile loader.
 * 
 * This allows transparent loading of encrypted images using:
 * Glide.with(context).load(encryptedParseFile).into(imageView)
 */
@GlideModule
class SoyMomoGlideModule : AppGlideModule() {

    override fun registerComponents(context: Context, glide: Glide, registry: Registry) {
        try {
            // Get EncryptionHelper from Hilt using EntryPoint
            val entryPoint = EntryPointAccessors.fromApplication(
                context.applicationContext,
                GlideEntryPoint::class.java
            )
            val encryptionHelper = entryPoint.encryptionHelper()

            // Register custom loader for encrypted ParseFiles
            registry.prepend(
                EncryptedParseFile::class.java,
                InputStream::class.java,
                EncryptedParseFileModelLoader.Factory(encryptionHelper)
            )
            
            Timber.d("SoyMomoGlideModule: Registered EncryptedParseFile loader")
        } catch (e: Exception) {
            Timber.e(e, "SoyMomoGlideModule: Failed to register encrypted file loader")
        }
    }

    override fun isManifestParsingEnabled(): Boolean = false
}
