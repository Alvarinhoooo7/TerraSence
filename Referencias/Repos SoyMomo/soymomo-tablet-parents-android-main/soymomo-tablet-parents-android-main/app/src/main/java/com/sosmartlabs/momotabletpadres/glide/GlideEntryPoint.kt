package com.sosmartlabs.momotabletpadres.glide

import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt EntryPoint for accessing dependencies from non-Hilt-managed components.
 * Used by SoyMomoGlideModule to get EncryptionHelper during Glide registration.
 */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface GlideEntryPoint {
    fun encryptionHelper(): EncryptionHelper
}
