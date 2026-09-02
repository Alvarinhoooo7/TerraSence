package com.sosmartlabs.momotabletpadres.di.module

import android.content.Context
import com.sosmartlabs.momotabletpadres.encryption.EncryptionHelper
import com.sosmartlabs.momotabletpadres.security.DeviceKeyRepository
import com.sosmartlabs.momotabletpadres.security.DeviceKeyStore
import com.sosmartlabs.momotabletpadres.tablet.TabletRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Provider
import javax.inject.Singleton

/**
 * Hilt module for security and encryption related dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
object SecurityModule {

    @Provides
    @Singleton
    fun provideDeviceKeyStore(
        @ApplicationContext context: Context
    ): DeviceKeyStore {
        return DeviceKeyStore(context)
    }

    @Provides
    @Singleton
    fun provideDeviceKeyRepository(
        deviceKeyStore: DeviceKeyStore,
        tabletRepository: TabletRepository
    ): DeviceKeyRepository {
        return DeviceKeyRepository(deviceKeyStore, tabletRepository)
    }

    @Provides
    @Singleton
    fun provideEncryptionHelper(
        deviceKeyStore: DeviceKeyStore,
        deviceKeyRepositoryProvider: Provider<DeviceKeyRepository>
    ): EncryptionHelper {
        return EncryptionHelper(deviceKeyStore, deviceKeyRepositoryProvider)
    }
}
