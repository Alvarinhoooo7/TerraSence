package com.sosmartlabs.momotabletpadres.security

import android.content.Context
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * Initializer that syncs device keys for all linked tablets at app startup.
 * This ensures that keys are available for decrypting encrypted content
 * from tablets that were linked before this encryption feature was deployed.
 */
object DeviceKeySyncInitializer {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface DeviceKeySyncEntryPoint {
        fun deviceKeyRepository(): DeviceKeyRepository
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var isInitialized = false

    /**
     * Initialize the key sync. Should be called from Application.onCreate()
     * after Hilt and Parse are initialized.
     */
    fun initialize(context: Context) {
        if (isInitialized) {
            Timber.d("DeviceKeySyncInitializer: Already initialized, skipping")
            return
        }
        isInitialized = true

        Timber.d("DeviceKeySyncInitializer: Starting background key sync")
        
        scope.launch {
            try {
                val entryPoint = EntryPointAccessors.fromApplication(
                    context.applicationContext,
                    DeviceKeySyncEntryPoint::class.java
                )
                val deviceKeyRepository = entryPoint.deviceKeyRepository()
                
                // Small delay to ensure Parse user session is restored
                kotlinx.coroutines.delay(1000)
                
                deviceKeyRepository.syncKeysForLinkedTablets()
                Timber.i("DeviceKeySyncInitializer: Key sync completed")
            } catch (e: Exception) {
                Timber.e(e, "DeviceKeySyncInitializer: Failed to sync keys")
            }
        }
    }
}
